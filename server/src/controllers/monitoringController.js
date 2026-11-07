import fs from 'fs';
import path from 'path';
import Crop, { CANONICAL_GROWTH_STAGES, HEALTH_STATUSES } from '../models/Crop.js';
import Farm from '../models/Farm.js';
import CropAssessment, {
  LEAF_CONDITIONS,
  GROWTH_CONDITIONS,
  PEST_SEVERITIES,
  DISEASE_CATEGORIES,
  SOIL_MOISTURE_LEVELS,
  WATER_STRESS_LEVELS,
} from '../models/CropAssessment.js';
import { getAgriculturalWeather } from '../services/weatherService.js';
import { logger } from '../utils/logger.js';

/**
 * Evaluate weather-driven crop risks based on meteorological parameters
 */
export function evaluateWeatherRisks(weatherData, crop) {
  if (!weatherData || !weatherData.current) {
    return {
      available: false,
      summary: 'Real-time weather data unavailable for farm coordinates.',
      risks: [],
    };
  }

  const { temp, humidity, windSpeed, rainfall, condition } = weatherData.current;
  const risks = [];

  // 1. Fungal / Blight Risk
  if (humidity >= 75 && temp >= 20 && temp <= 32) {
    risks.push({
      type: 'Fungal / Mildew Disease Risk',
      severity: humidity >= 85 ? 'High' : 'Moderate',
      description: `Elevated relative humidity (${humidity}%) and warm canopy temperatures (${temp}°C) create optimal sporulation conditions for downy mildew, leaf spot, and fungal blast.`,
      recommendation: 'Scout lower canopy leaves for lesions. Avoid late-evening overhead sprinkler irrigation to allow foliage to dry before nightfall.',
    });
  }

  // 2. Heat Stress / Flower Dropping Risk
  if (temp >= 35) {
    risks.push({
      type: 'Excessive Heat & Desiccation Stress',
      severity: temp >= 38 ? 'High' : 'Moderate',
      description: `Ambient temperature of ${temp}°C exceeds optimal photosynthetic thresholds, increasing transpirational load and risk of flower abscission.`,
      recommendation: 'Ensure adequate root-zone hydration through early morning drip irrigation. Apply light mulching to buffer soil temperatures.',
    });
  }

  // 3. Drought / Water Stress
  if (temp >= 30 && (rainfall === 0 || rainfall === null) && humidity < 40) {
    risks.push({
      type: 'Soil Moisture Deficit & Evaporative Loss',
      severity: 'Moderate',
      description: `Low atmospheric humidity (${humidity}%) combined with zero recent precipitation increases soil moisture depletion rates.`,
      recommendation: 'Verify irrigation scheduling and check soil moisture at 15cm root depth.',
    });
  }

  // 4. Heavy Rain / Waterlogging Risk
  if (rainfall >= 25) {
    risks.push({
      type: 'Waterlogging & Root Hypoxia Risk',
      severity: rainfall >= 50 ? 'High' : 'Moderate',
      description: `Accumulated rainfall of ${rainfall}mm may saturate topsoil, creating temporary root-zone oxygen deprivation and collar rot vulnerability.`,
      recommendation: 'Clear field drainage furrows to prevent standing water accumulation around stems.',
    });
  }

  // 5. Wind / Physical Lodging Risk
  const windKmh = (windSpeed || 0) * 3.6; // convert m/s to km/h if needed
  if (windKmh >= 28 || (windSpeed && windSpeed >= 8)) {
    risks.push({
      type: 'Canopy Lodging & Mechanical Abrasion',
      severity: windKmh >= 40 ? 'High' : 'Moderate',
      description: `Sustained wind speeds (${Math.round(windKmh)} km/h) may cause lodging in tall cultivars or physical leaf scarring.`,
      recommendation: 'Postpone chemical spray applications until wind speeds subside below 15 km/h.',
    });
  }

  return {
    available: true,
    current: {
      temperature: temp,
      humidity,
      windSpeed,
      windKmh: Math.round(windKmh),
      rainfall: rainfall || 0,
      condition,
    },
    risks,
    overallRiskLevel: risks.some((r) => r.severity === 'High')
      ? 'High'
      : risks.length > 0
      ? 'Moderate'
      : 'Low',
  };
}

export const monitoringController = {
  /**
   * GET /api/monitoring/dashboard
   * Returns aggregated telemetry and health status across all farmer crops
   */
  async getDashboard(req, res) {
    try {
      const farmerId = req.user.id;

      // Retrieve all active and recent crops owned by this farmer
      const crops = await Crop.find({
        owner: farmerId,
        status: { $ne: 'Archived' },
      })
        .populate('farm', 'name location coordinates soilType irrigationType totalAcreage')
        .sort({ updatedAt: -1 });

      // KPI Aggregations
      const totalMonitored = crops.length;
      let healthyCount = 0;
      let normalCount = 0;
      let attentionCount = 0;
      let atRiskCount = 0;
      let criticalCount = 0;

      const growthStageCounts = {};
      CANONICAL_GROWTH_STAGES.forEach((stage) => {
        growthStageCounts[stage] = 0;
      });

      const farmMap = new Map();

      crops.forEach((crop) => {
        const status = crop.healthStatus || 'Healthy';
        if (status === 'Healthy') healthyCount++;
        else if (status === 'Normal') normalCount++;
        else if (status === 'Needs Attention') attentionCount++;
        else if (status === 'At Risk') atRiskCount++;
        else if (status === 'Critical') criticalCount++;

        // Growth stage mapping
        if (crop.growthStage) {
          growthStageCounts[crop.growthStage] =
            (growthStageCounts[crop.growthStage] || 0) + 1;
        }

        // Farm-wise breakdown
        const farmId = crop.farm?._id?.toString() || 'unassigned';
        const farmName = crop.farm?.name || 'Unassigned Farm';
        if (!farmMap.has(farmId)) {
          farmMap.set(farmId, {
            farmId,
            farmName,
            totalCrops: 0,
            healthy: 0,
            needsAttention: 0,
            critical: 0,
          });
        }
        const farmEntry = farmMap.get(farmId);
        farmEntry.totalCrops++;
        if (status === 'Healthy' || status === 'Normal') {
          farmEntry.healthy++;
        } else if (status === 'Needs Attention') {
          farmEntry.needsAttention++;
        } else {
          farmEntry.critical++;
        }
      });

      // Recent 8 assessments
      const recentAssessments = await CropAssessment.find({ farmer: farmerId })
        .populate('crop', 'name variety growthStage healthStatus')
        .populate('farm', 'name')
        .sort({ assessmentDate: -1 })
        .limit(8);

      // Critical alerts: crops requiring immediate agronomic intervention
      const alerts = crops
        .filter((c) => c.healthStatus === 'Needs Attention' || c.healthStatus === 'At Risk' || c.healthStatus === 'Critical')
        .map((c) => ({
          cropId: c._id,
          cropName: c.name,
          variety: c.variety,
          farmName: c.farm?.name || 'Farm',
          healthStatus: c.healthStatus,
          growthStage: c.growthStage,
          lastUpdated: c.updatedAt,
        }));

      res.status(200).json({
        success: true,
        summary: {
          totalMonitored,
          healthyCrops: healthyCount + normalCount,
          attentionCrops: attentionCount,
          criticalAlerts: atRiskCount + criticalCount,
          breakdown: {
            healthy: healthyCount,
            normal: normalCount,
            needsAttention: attentionCount,
            atRisk: atRiskCount,
            critical: criticalCount,
          },
          growthStages: growthStageCounts,
          farmsSummary: Array.from(farmMap.values()),
        },
        crops,
        recentAssessments,
        alerts,
      });
    } catch (err) {
      logger.error('Monitoring Dashboard Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to compile crop monitoring dashboard data',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/monitoring/crop/:cropId
   * Returns individual crop health history, telemetry, and weather risk analysis
   */
  async getCropMonitoring(req, res) {
    try {
      const { cropId } = req.params;
      const farmerId = req.user.id;

      const crop = await Crop.findOne({ _id: cropId, owner: farmerId }).populate(
        'farm',
        'name location coordinates soilType irrigationType totalAcreage'
      );

      if (!crop) {
        return res.status(404).json({
          success: false,
          message: 'Crop record not found or unauthorized access',
        });
      }

      // Query assessment history
      const assessments = await CropAssessment.find({
        crop: cropId,
        farmer: farmerId,
      }).sort({ assessmentDate: -1 });

      // Weather risks for crop's farm location
      let weatherRisks = { available: false, risks: [] };
      if (crop.farm?.coordinates?.latitude && crop.farm?.coordinates?.longitude) {
        try {
          const weather = await getAgriculturalWeather(
            crop.farm.coordinates.latitude,
            crop.farm.coordinates.longitude,
            crop.farm
          );
          weatherRisks = evaluateWeatherRisks(weather, crop);
        } catch (wErr) {
          logger.warn(`Weather advisory fetch warning for farm ${crop.farm._id}:`, wErr.message);
        }
      }

      res.status(200).json({
        success: true,
        crop,
        assessments,
        totalAssessments: assessments.length,
        latestAssessment: assessments[0] || null,
        weatherRisks,
      });
    } catch (err) {
      logger.error('Crop Monitoring Details Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop monitoring data',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/monitoring/assessment
   * Record a new manual or field health assessment
   */
  async recordAssessment(req, res) {
    try {
      const farmerId = req.user.id;
      const {
        cropId,
        healthStatus = 'Healthy',
        growthStage,
        growthCondition = 'Optimal',
        leafCondition = 'Normal / Deep Green',
        pestSeverity = 'None',
        pestDetails = '',
        diseaseSeverity = 'None',
        diseaseCategory = 'None',
        diseaseDetails = '',
        soilMoisture = 'Adequate',
        waterStress = 'None',
        notes = '',
        photos = [],
        weatherSnapshot = {},
      } = req.body;

      if (!cropId) {
        return res.status(400).json({
          success: false,
          message: 'Target crop ID is required',
        });
      }

      const crop = await Crop.findOne({ _id: cropId, owner: farmerId }).populate('farm');
      if (!crop) {
        return res.status(404).json({
          success: false,
          message: 'Crop record not found or unauthorized access',
        });
      }

      // Validate enums
      if (healthStatus && !HEALTH_STATUSES.includes(healthStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid health status: ${healthStatus}`,
        });
      }

      // If photos is provided, format properly
      const formattedPhotos = Array.isArray(photos)
        ? photos.map((p) => (typeof p === 'string' ? { url: p, caption: '' } : p))
        : [];

      // Create assessment
      const assessment = new CropAssessment({
        farmer: farmerId,
        crop: crop._id,
        farm: crop.farm._id,
        assessmentDate: new Date(),
        growthStage: growthStage || crop.growthStage || 'Vegetative Growth',
        healthStatus,
        growthCondition,
        leafCondition,
        pestObservations: {
          severity: pestSeverity,
          details: pestDetails,
        },
        diseaseSymptoms: {
          severity: diseaseSeverity,
          category: diseaseCategory,
          details: diseaseDetails,
        },
        soilMoisture,
        waterStress,
        weatherSnapshot,
        notes,
        photos: formattedPhotos,
        source: 'Manual Agronomic Observation',
        sensorDataAvailable: false,
      });

      await assessment.save();

      // Update crop current healthStatus and lastAssessmentDate
      crop.healthStatus = healthStatus;
      crop.lastAssessmentDate = assessment.assessmentDate;

      // If growth stage was updated
      if (growthStage && growthStage !== crop.growthStage) {
        crop.growthStage = growthStage;
        crop.stageHistory.push({
          stage: growthStage,
          transitionDate: assessment.assessmentDate,
          notes: notes ? `Updated during health inspection: ${notes}` : 'Updated during health inspection',
          recordedBy: farmerId,
        });
      }

      await crop.save();

      res.status(201).json({
        success: true,
        message: 'Crop health assessment logged successfully',
        assessment,
        crop,
      });
    } catch (err) {
      logger.error('Record Assessment Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to record crop health assessment',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/monitoring/upload-photo
   * Upload an image (base64 data URL) with format and size validation
   */
  async uploadPhoto(req, res) {
    try {
      const farmerId = req.user.id;
      const { imageBase64, filename, caption = '', cropId = null } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid base64 image data is required',
        });
      }

      // Check format
      const match = imageBase64.match(/^data:image\/(jpeg|png|webp|jpg);base64,/i);
      if (!match) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported image format. Allowed formats: JPEG, PNG, WEBP.',
        });
      }

      const mimeType = match[1].toLowerCase();
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Max size: 5MB
      const MAX_SIZE_BYTES = 5 * 1024 * 1024;
      if (buffer.length > MAX_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: 'Image size exceeds maximum limit of 5MB',
        });
      }

      // Ensure directory exists
      const uploadDir = path.join(process.cwd(), 'uploads', 'crops');
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const safeExt = mimeType === 'jpeg' ? 'jpg' : mimeType;
      const uniqueFileName = `crop_${cropId || farmerId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${safeExt}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      await fs.promises.writeFile(filePath, buffer);

      const publicUrl = `/uploads/crops/${uniqueFileName}`;

      res.status(200).json({
        success: true,
        message: 'Crop image uploaded successfully',
        url: publicUrl,
        caption,
        sizeBytes: buffer.length,
      });
    } catch (err) {
      logger.error('Crop Photo Upload Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to process crop photo upload',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/monitoring/weather-risks/:cropId
   * Return real-time weather-driven agronomic risks for a specific crop's farm
   */
  async getCropWeatherRisks(req, res) {
    try {
      const { cropId } = req.params;
      const farmerId = req.user.id;

      const crop = await Crop.findOne({ _id: cropId, owner: farmerId }).populate('farm');
      if (!crop) {
        return res.status(404).json({
          success: false,
          message: 'Crop record not found or unauthorized access',
        });
      }

      if (!crop.farm?.coordinates?.latitude || !crop.farm?.coordinates?.longitude) {
        return res.status(200).json({
          success: true,
          weatherRisks: {
            available: false,
            summary: 'Farm parcel coordinates are missing. Please update farm location to receive weather alerts.',
            risks: [],
          },
        });
      }

      let risksAnalysis = {
        available: false,
        summary: 'Weather advisory telemetry unavailable for coordinates.',
        risks: [],
      };

      try {
        const weather = await getAgriculturalWeather(
          crop.farm.coordinates.latitude,
          crop.farm.coordinates.longitude,
          crop.farm
        );
        risksAnalysis = evaluateWeatherRisks(weather, crop);
      } catch (wErr) {
        logger.warn(`Weather advisory fetch warning for crop ${crop._id}:`, wErr.message);
        risksAnalysis = {
          available: false,
          summary: 'Real-time weather data is temporarily unavailable or weather provider unconfigured.',
          risks: [],
        };
      }

      res.status(200).json({
        success: true,
        crop: {
          id: crop._id,
          name: crop.name,
          variety: crop.variety,
          growthStage: crop.growthStage,
          farmName: crop.farm.name,
        },
        weatherRisks: risksAnalysis,
      });
    } catch (err) {
      logger.error('Crop Weather Risks Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate crop weather risk advisory',
        error: err.message,
      });
    }
  },
};

export default monitoringController;
