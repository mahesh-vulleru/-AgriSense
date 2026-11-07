import fs from 'fs';
import path from 'path';
import SoilAnalysis, {
  SOIL_TYPES,
  TEST_METHODS,
  PH_RATINGS,
  NUTRIENT_RATINGS,
  OC_RATINGS,
  EC_RATINGS,
} from '../models/SoilAnalysis.js';
import Farm from '../models/Farm.js';
import Crop from '../models/Crop.js';
import {
  generateComprehensiveSoilHealth,
  generateFertilizerRecommendations,
  evaluatePH,
  evaluateNitrogen,
  evaluatePhosphorus,
  evaluatePotassium,
  evaluateOrganicCarbon,
  evaluateElectricalConductivity,
} from '../services/soilAgronomyService.js';
import { logger } from '../utils/logger.js';

export const soilController = {
  /**
   * GET /api/soil-analysis/dashboard
   * Aggregated metrics for farmer's soil health overview
   */
  async getDashboard(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;

      // Fetch all farmer-owned active farms
      const farms = await Farm.find({ owner: farmerId, status: { $ne: 'Archived' } })
        .sort({ name: 1 })
        .select('_id name location acreage soilType irrigationType mainCrops status');

      // Fetch all soil analyses for this farmer
      const analyses = await SoilAnalysis.find({ farmer: farmerId })
        .sort({ sampleDate: -1 })
        .populate('farm', '_id name location acreage soilType');

      const totalFarms = farms.length;
      const farmIdsWithSoilRecords = new Set(analyses.map((a) => a.farm?._id?.toString()).filter(Boolean));
      const totalFarmsWithRecords = farmIdsWithSoilRecords.size;

      // Latest soil test
      const latestSoilAnalysis = analyses.length > 0 ? analyses[0] : null;

      // Health status distribution
      const healthDistribution = {
        Optimal: 0,
        'Moderately Healthy': 0,
        'Needs Improvement': 0,
        'Degraded / Critical': 0,
        'Insufficient Data': 0,
      };

      // Farm-wise latest analysis map
      const farmLatestMap = {};
      analyses.forEach((rec) => {
        const fId = rec.farm?._id?.toString();
        if (fId && !farmLatestMap[fId]) {
          farmLatestMap[fId] = rec;
          if (healthDistribution[rec.overallHealthStatus] !== undefined) {
            healthDistribution[rec.overallHealthStatus]++;
          }
        }
      });

      // Farm summaries combining farm info with their latest soil record
      const farmSoilSummaries = farms.map((f) => {
        const latestTest = farmLatestMap[f._id.toString()] || null;
        return {
          farmId: f._id,
          farmName: f.name,
          location: f.location,
          acreage: f.acreage,
          defaultSoilType: f.soilType,
          mainCrops: f.mainCrops || [],
          hasSoilRecord: !!latestTest,
          latestTest: latestTest
            ? {
                id: latestTest._id,
                sampleId: latestTest.sampleId,
                sampleDate: latestTest.sampleDate,
                testMethod: latestTest.testMethod,
                pH: latestTest.pH?.value,
                nitrogen: latestTest.nitrogen?.value,
                phosphorus: latestTest.phosphorus?.value,
                potassium: latestTest.potassium?.value,
                organicCarbon: latestTest.organicCarbon?.value,
                electricalConductivity: latestTest.electricalConductivity?.value,
                overallHealthStatus: latestTest.overallHealthStatus,
                hasLabReport: !!latestTest.labReport?.url,
              }
            : null,
        };
      });

      // Compute aggregated latest parameters across all farms with tests
      let avgPH = null;
      let avgN = null;
      let avgP = null;
      let avgK = null;
      let avgOC = null;
      let avgEC = null;

      const latestRecordsList = Object.values(farmLatestMap);
      if (latestRecordsList.length > 0) {
        const validPH = latestRecordsList.map((r) => r.pH?.value).filter((v) => v !== null && v !== undefined && !isNaN(v));
        const validN = latestRecordsList.map((r) => r.nitrogen?.value).filter((v) => v !== null && v !== undefined && !isNaN(v));
        const validP = latestRecordsList.map((r) => r.phosphorus?.value).filter((v) => v !== null && v !== undefined && !isNaN(v));
        const validK = latestRecordsList.map((r) => r.potassium?.value).filter((v) => v !== null && v !== undefined && !isNaN(v));
        const validOC = latestRecordsList.map((r) => r.organicCarbon?.value).filter((v) => v !== null && v !== undefined && !isNaN(v));
        const validEC = latestRecordsList.map((r) => r.electricalConductivity?.value).filter((v) => v !== null && v !== undefined && !isNaN(v));

        if (validPH.length > 0) avgPH = Math.round((validPH.reduce((a, b) => a + b, 0) / validPH.length) * 10) / 10;
        if (validN.length > 0) avgN = Math.round(validN.reduce((a, b) => a + b, 0) / validN.length);
        if (validP.length > 0) avgP = Math.round(validP.reduce((a, b) => a + b, 0) / validP.length);
        if (validK.length > 0) avgK = Math.round(validK.reduce((a, b) => a + b, 0) / validK.length);
        if (validOC.length > 0) avgOC = Math.round((validOC.reduce((a, b) => a + b, 0) / validOC.length) * 100) / 100;
        if (validEC.length > 0) avgEC = Math.round((validEC.reduce((a, b) => a + b, 0) / validEC.length) * 100) / 100;
      }

      // Detailed assessment for the latest overall test if available
      const latestAssessment = latestSoilAnalysis ? generateComprehensiveSoilHealth(latestSoilAnalysis) : null;

      res.status(200).json({
        success: true,
        summary: {
          totalFarms,
          totalFarmsWithRecords,
          totalAnalysesRecorded: analyses.length,
          latestAnalysisDate: latestSoilAnalysis?.sampleDate || null,
          healthDistribution,
          averages: {
            pH: avgPH,
            nitrogen: avgN,
            phosphorus: avgP,
            potassium: avgK,
            organicCarbon: avgOC,
            electricalConductivity: avgEC,
          },
        },
        latestSoilAnalysis: latestSoilAnalysis
          ? {
              ...latestSoilAnalysis.toObject(),
              detailedAssessment: latestAssessment,
            }
          : null,
        farmSoilSummaries,
      });
    } catch (err) {
      logger.error('Soil Dashboard Fetch Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve soil analysis dashboard statistics',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/soil-analysis
   * List all soil analysis records with optional filtering
   */
  async getSoilAnalyses(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, soilType, healthStatus, limit = 50, page = 1 } = req.query;

      const query = { farmer: farmerId };

      if (farmId) {
        // IDOR ownership check
        const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
        if (!farm) {
          return res.status(404).json({
            success: false,
            message: 'Specified farm parcel not found or unauthorized access',
          });
        }
        query.farm = farmId;
      }

      if (soilType) query.soilType = soilType;
      if (healthStatus) query.overallHealthStatus = healthStatus;

      const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit)));
      const take = Math.min(100, Math.max(1, Number(limit)));

      const [records, total] = await Promise.all([
        SoilAnalysis.find(query)
          .sort({ sampleDate: -1 })
          .skip(skip)
          .limit(take)
          .populate('farm', '_id name location acreage soilType mainCrops'),
        SoilAnalysis.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        count: records.length,
        total,
        page: Number(page),
        records,
      });
    } catch (err) {
      logger.error('List Soil Analyses Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve soil analyses list',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/soil-analysis/:id
   * Get single soil analysis record with comprehensive scientific assessment & default fertilizer guidance
   */
  async getSoilAnalysisById(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const record = await SoilAnalysis.findOne({ _id: id, farmer: farmerId }).populate(
        'farm',
        '_id name location acreage soilType irrigationType mainCrops'
      );

      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Soil analysis record not found or unauthorized access',
        });
      }

      const detailedAssessment = generateComprehensiveSoilHealth(record);

      // Default crop for recommendations: First crop registered in farm or 'General'
      const defaultCropName = record.farm?.mainCrops?.[0] || 'General';
      const defaultGuidance = generateFertilizerRecommendations({
        soilAnalysis: record,
        cropName: defaultCropName,
        cropStage: 'Sowing / Planting',
        acreage: record.farm?.acreage || 1,
      });

      res.status(200).json({
        success: true,
        record,
        detailedAssessment,
        fertilizerGuidance: defaultGuidance,
      });
    } catch (err) {
      logger.error('Get Soil Analysis Detail Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve soil analysis record details',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/soil-analysis
   * Register a new laboratory or field soil analysis record
   */
  async createSoilAnalysis(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const {
        farmId,
        sampleId,
        sampleDate,
        labName,
        testMethod,
        soilType,
        pH,
        nitrogen,
        phosphorus,
        potassium,
        organicCarbon,
        electricalConductivity,
        soilMoisture,
        soilTemperature,
        notes,
        labReport,
      } = req.body;

      if (!farmId) {
        return res.status(400).json({
          success: false,
          message: 'Farm parcel selection is required for registering soil analysis',
        });
      }

      // Verify farm ownership (IDOR prevention)
      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        return res.status(404).json({
          success: false,
          message: 'Target farm parcel was not found or is unauthorized for this account',
        });
      }

      // Validate pH
      const pHVal = pH?.value !== undefined ? Number(pH.value) : Number(pH);
      if (pHVal === undefined || pHVal === null || isNaN(pHVal) || pHVal < 0 || pHVal > 14) {
        return res.status(400).json({
          success: false,
          message: 'A valid soil pH value between 0.0 and 14.0 is required',
        });
      }

      // Validate NPK, OC, EC ranges if provided
      const parseField = (val, min, max, name) => {
        if (val === null || val === undefined || val === '') return null;
        const num = Number(val);
        if (isNaN(num) || num < min || num > max) {
          throw new Error(`${name} must be a valid number between ${min} and ${max}`);
        }
        return num;
      };

      let nVal = null;
      let pVal = null;
      let kVal = null;
      let ocVal = null;
      let ecVal = null;
      let moistureVal = null;
      let tempVal = null;

      try {
        nVal = parseField(nitrogen?.value !== undefined ? nitrogen.value : nitrogen, 0, 2000, 'Nitrogen');
        pVal = parseField(phosphorus?.value !== undefined ? phosphorus.value : phosphorus, 0, 500, 'Phosphorus');
        kVal = parseField(potassium?.value !== undefined ? potassium.value : potassium, 0, 2000, 'Potassium');
        ocVal = parseField(organicCarbon?.value !== undefined ? organicCarbon.value : organicCarbon, 0, 100, 'Organic Carbon');
        ecVal = parseField(electricalConductivity?.value !== undefined ? electricalConductivity.value : electricalConductivity, 0, 50, 'Electrical Conductivity');
        moistureVal = parseField(soilMoisture?.value !== undefined ? soilMoisture.value : soilMoisture, 0, 100, 'Soil Moisture');
        tempVal = parseField(soilTemperature?.value !== undefined ? soilTemperature.value : soilTemperature, -20, 80, 'Soil Temperature');
      } catch (valErr) {
        return res.status(400).json({
          success: false,
          message: valErr.message,
        });
      }

      // Generate sample ID if omitted
      const finalSampleId =
        (sampleId && sampleId.trim()) ||
        `SMP-${farm.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;

      // Perform scientific assessment
      const assessmentData = {
        pH: pHVal,
        nitrogen: nVal,
        phosphorus: pVal,
        potassium: kVal,
        organicCarbon: ocVal,
        electricalConductivity: ecVal,
        soilMoisture: moistureVal,
        soilTemperature: tempVal,
      };

      const healthEval = generateComprehensiveSoilHealth(assessmentData);

      const newRecord = new SoilAnalysis({
        farmer: farmerId,
        farm: farm._id,
        sampleId: finalSampleId,
        sampleDate: sampleDate ? new Date(sampleDate) : new Date(),
        labName: labName?.trim() || 'Agricultural Soil Testing Center',
        testMethod: TEST_METHODS.includes(testMethod) ? testMethod : 'Certified Laboratory',
        soilType: SOIL_TYPES.includes(soilType) ? soilType : farm.soilType || 'Loamy',
        pH: {
          value: pHVal,
          isEstimated: Boolean(pH?.isEstimated),
          rating: healthEval.parameters.pH.rating,
        },
        nitrogen: {
          value: nVal,
          unit: 'kg/ha',
          isEstimated: Boolean(nitrogen?.isEstimated),
          rating: healthEval.parameters.nitrogen.rating,
        },
        phosphorus: {
          value: pVal,
          unit: 'kg/ha',
          isEstimated: Boolean(phosphorus?.isEstimated),
          rating: healthEval.parameters.phosphorus.rating,
        },
        potassium: {
          value: kVal,
          unit: 'kg/ha',
          isEstimated: Boolean(potassium?.isEstimated),
          rating: healthEval.parameters.potassium.rating,
        },
        organicCarbon: {
          value: ocVal,
          unit: '%',
          isEstimated: Boolean(organicCarbon?.isEstimated),
          rating: healthEval.parameters.organicCarbon.rating,
        },
        electricalConductivity: {
          value: ecVal,
          unit: 'dS/m',
          isEstimated: Boolean(electricalConductivity?.isEstimated),
          rating: healthEval.parameters.electricalConductivity.rating,
        },
        soilMoisture: {
          value: moistureVal,
          unit: '%',
          measured: moistureVal !== null,
        },
        soilTemperature: {
          value: tempVal,
          unit: '°C',
          measured: tempVal !== null,
        },
        notes: notes?.trim() || '',
        labReport: {
          url: labReport?.url || '',
          originalName: labReport?.originalName || '',
          mimeType: labReport?.mimeType || '',
          sizeBytes: Number(labReport?.sizeBytes) || 0,
          uploadedAt: labReport?.url ? new Date() : null,
        },
        overallHealthStatus: healthEval.overallHealthStatus,
        assessmentSummary: healthEval.assessmentSummary,
      });

      await newRecord.save();
      await newRecord.populate('farm', '_id name location acreage soilType mainCrops');

      logger.info(`Soil analysis recorded: ${newRecord.sampleId} for farm: ${farm.name}`);

      res.status(201).json({
        success: true,
        message: 'Soil analysis test successfully registered',
        record: newRecord,
        detailedAssessment: healthEval,
      });
    } catch (err) {
      logger.error('Create Soil Analysis Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to record soil analysis test',
        error: err.message,
      });
    }
  },

  /**
   * PUT /api/soil-analysis/:id
   * Update an existing soil analysis record
   */
  async updateSoilAnalysis(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const record = await SoilAnalysis.findOne({ _id: id, farmer: farmerId });
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Soil analysis record not found or unauthorized access',
        });
      }

      const {
        farmId,
        sampleId,
        sampleDate,
        labName,
        testMethod,
        soilType,
        pH,
        nitrogen,
        phosphorus,
        potassium,
        organicCarbon,
        electricalConductivity,
        soilMoisture,
        soilTemperature,
        notes,
        labReport,
      } = req.body;

      if (farmId && farmId.toString() !== record.farm.toString()) {
        const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
        if (!farm) {
          return res.status(404).json({
            success: false,
            message: 'Target farm parcel was not found or is unauthorized',
          });
        }
        record.farm = farm._id;
      }

      if (sampleId) record.sampleId = sampleId.trim();
      if (sampleDate) record.sampleDate = new Date(sampleDate);
      if (labName !== undefined) record.labName = labName.trim();
      if (testMethod && TEST_METHODS.includes(testMethod)) record.testMethod = testMethod;
      if (soilType && SOIL_TYPES.includes(soilType)) record.soilType = soilType;
      if (notes !== undefined) record.notes = notes.trim();

      // Parse and update parameters
      let pHVal = record.pH?.value;
      if (pH !== undefined) {
        pHVal = pH?.value !== undefined ? Number(pH.value) : Number(pH);
        if (isNaN(pHVal) || pHVal < 0 || pHVal > 14) {
          return res.status(400).json({
            success: false,
            message: 'pH must be a valid number between 0 and 14',
          });
        }
        record.pH.value = pHVal;
        record.pH.isEstimated = Boolean(pH?.isEstimated);
      }

      const updateNumericField = (fieldObj, incoming, min, max, name) => {
        if (incoming === undefined) return fieldObj?.value;
        const rawVal = incoming?.value !== undefined ? incoming.value : incoming;
        if (rawVal === null || rawVal === '' || rawVal === undefined) {
          fieldObj.value = null;
          fieldObj.rating = 'Not Measured';
          return null;
        }
        const num = Number(rawVal);
        if (isNaN(num) || num < min || num > max) {
          throw new Error(`${name} must be between ${min} and ${max}`);
        }
        fieldObj.value = num;
        if (incoming?.isEstimated !== undefined) fieldObj.isEstimated = Boolean(incoming.isEstimated);
        return num;
      };

      let nVal = record.nitrogen?.value;
      let pVal = record.phosphorus?.value;
      let kVal = record.potassium?.value;
      let ocVal = record.organicCarbon?.value;
      let ecVal = record.electricalConductivity?.value;
      let moistureVal = record.soilMoisture?.value;
      let tempVal = record.soilTemperature?.value;

      try {
        if (nitrogen !== undefined) nVal = updateNumericField(record.nitrogen, nitrogen, 0, 2000, 'Nitrogen');
        if (phosphorus !== undefined) pVal = updateNumericField(record.phosphorus, phosphorus, 0, 500, 'Phosphorus');
        if (potassium !== undefined) kVal = updateNumericField(record.potassium, potassium, 0, 2000, 'Potassium');
        if (organicCarbon !== undefined) ocVal = updateNumericField(record.organicCarbon, organicCarbon, 0, 100, 'Organic Carbon');
        if (electricalConductivity !== undefined) ecVal = updateNumericField(record.electricalConductivity, electricalConductivity, 0, 50, 'Electrical Conductivity');
        if (soilMoisture !== undefined) {
          const rawM = soilMoisture?.value !== undefined ? soilMoisture.value : soilMoisture;
          if (rawM === null || rawM === '' || rawM === undefined) {
            record.soilMoisture.value = null;
            record.soilMoisture.measured = false;
            moistureVal = null;
          } else {
            const numM = Number(rawM);
            if (isNaN(numM) || numM < 0 || numM > 100) throw new Error('Soil moisture must be between 0 and 100%');
            record.soilMoisture.value = numM;
            record.soilMoisture.measured = true;
            moistureVal = numM;
          }
        }
        if (soilTemperature !== undefined) {
          const rawT = soilTemperature?.value !== undefined ? soilTemperature.value : soilTemperature;
          if (rawT === null || rawT === '' || rawT === undefined) {
            record.soilTemperature.value = null;
            record.soilTemperature.measured = false;
            tempVal = null;
          } else {
            const numT = Number(rawT);
            if (isNaN(numT) || numT < -20 || numT > 80) throw new Error('Soil temperature must be between -20 and 80°C');
            record.soilTemperature.value = numT;
            record.soilTemperature.measured = true;
            tempVal = numT;
          }
        }
      } catch (valErr) {
        return res.status(400).json({
          success: false,
          message: valErr.message,
        });
      }

      if (labReport !== undefined) {
        record.labReport = {
          url: labReport?.url || '',
          originalName: labReport?.originalName || '',
          mimeType: labReport?.mimeType || '',
          sizeBytes: Number(labReport?.sizeBytes) || 0,
          uploadedAt: labReport?.url ? new Date() : null,
        };
      }

      // Re-run health assessment
      const healthEval = generateComprehensiveSoilHealth({
        pH: pHVal,
        nitrogen: nVal,
        phosphorus: pVal,
        potassium: kVal,
        organicCarbon: ocVal,
        electricalConductivity: ecVal,
        soilMoisture: moistureVal,
        soilTemperature: tempVal,
      });

      record.pH.rating = healthEval.parameters.pH.rating;
      record.nitrogen.rating = healthEval.parameters.nitrogen.rating;
      record.phosphorus.rating = healthEval.parameters.phosphorus.rating;
      record.potassium.rating = healthEval.parameters.potassium.rating;
      record.organicCarbon.rating = healthEval.parameters.organicCarbon.rating;
      record.electricalConductivity.rating = healthEval.parameters.electricalConductivity.rating;
      record.overallHealthStatus = healthEval.overallHealthStatus;
      record.assessmentSummary = healthEval.assessmentSummary;

      await record.save();
      await record.populate('farm', '_id name location acreage soilType mainCrops');

      res.status(200).json({
        success: true,
        message: 'Soil analysis record updated successfully',
        record,
        detailedAssessment: healthEval,
      });
    } catch (err) {
      logger.error('Update Soil Analysis Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to update soil analysis record',
        error: err.message,
      });
    }
  },

  /**
   * DELETE /api/soil-analysis/:id
   * Remove a soil test record (with ownership verification)
   */
  async deleteSoilAnalysis(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const record = await SoilAnalysis.findOneAndDelete({ _id: id, farmer: farmerId });
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Soil analysis record not found or unauthorized access',
        });
      }

      logger.info(`Soil analysis deleted: ${id} by farmer ${farmerId}`);

      res.status(200).json({
        success: true,
        message: 'Soil analysis record successfully deleted',
        deletedId: id,
      });
    } catch (err) {
      logger.error('Delete Soil Analysis Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to delete soil analysis record',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/soil-analysis/history/:farmId
   * Retrieve chronological soil test history & trends for a specific farm
   */
  async getFarmSoilHistory(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId } = req.params;

      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        return res.status(404).json({
          success: false,
          message: 'Farm parcel not found or unauthorized access',
        });
      }

      const history = await SoilAnalysis.find({ farm: farmId, farmer: farmerId }).sort({ sampleDate: 1 });

      // Calculate longitudinal trends if 2 or more tests exist
      let trends = null;
      if (history.length >= 2) {
        const oldest = history[0];
        const latest = history[history.length - 1];

        const calcDelta = (latestVal, oldestVal) => {
          if (latestVal === null || oldestVal === null || latestVal === undefined || oldestVal === undefined) return null;
          return Math.round((Number(latestVal) - Number(oldestVal)) * 100) / 100;
        };

        trends = {
          testsCount: history.length,
          firstTestDate: oldest.sampleDate,
          latestTestDate: latest.sampleDate,
          pHDelta: calcDelta(latest.pH?.value, oldest.pH?.value),
          nitrogenDelta: calcDelta(latest.nitrogen?.value, oldest.nitrogen?.value),
          phosphorusDelta: calcDelta(latest.phosphorus?.value, oldest.phosphorus?.value),
          potassiumDelta: calcDelta(latest.potassium?.value, oldest.potassium?.value),
          organicCarbonDelta: calcDelta(latest.organicCarbon?.value, oldest.organicCarbon?.value),
          electricalConductivityDelta: calcDelta(latest.electricalConductivity?.value, oldest.electricalConductivity?.value),
          overallStatusProgression: {
            from: oldest.overallHealthStatus,
            to: latest.overallHealthStatus,
          },
        };
      }

      // Format comparison data points for Recharts visualization
      const chartPoints = history.map((h) => ({
        id: h._id,
        sampleId: h.sampleId,
        date: new Date(h.sampleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        rawDate: h.sampleDate,
        pH: h.pH?.value ?? null,
        nitrogen: h.nitrogen?.value ?? null,
        phosphorus: h.phosphorus?.value ?? null,
        potassium: h.potassium?.value ?? null,
        organicCarbon: h.organicCarbon?.value ?? null,
        electricalConductivity: h.electricalConductivity?.value ?? null,
        healthStatus: h.overallHealthStatus,
      }));

      res.status(200).json({
        success: true,
        farm: {
          id: farm._id,
          name: farm.name,
          location: farm.location,
          acreage: farm.acreage,
          soilType: farm.soilType,
        },
        testsCount: history.length,
        hasSufficientHistory: history.length >= 2,
        history,
        chartPoints,
        trends,
      });
    } catch (err) {
      logger.error('Soil History Fetch Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve farm soil analysis history',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/soil-analysis/upload-report
   * Upload laboratory report document (PDF, PNG, JPEG, WEBP; max 5MB)
   */
  async uploadReport(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { fileBase64, filename = 'soil_report', mimeType: customMime } = req.body;

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Valid base64 encoded document/image is required',
        });
      }

      // Check format (PDF or image)
      const isPdf = fileBase64.startsWith('data:application/pdf;base64,') || (customMime && customMime === 'application/pdf');
      const isImg = fileBase64.match(/^data:image\/(jpeg|png|webp|jpg);base64,/i);

      if (!isPdf && !isImg) {
        return res.status(400).json({
          success: false,
          message: 'Unsupported document format. Allowed formats: PDF, JPEG, PNG, WEBP.',
        });
      }

      const mimeType = isPdf ? 'application/pdf' : isImg[1].toLowerCase();
      const ext = isPdf ? 'pdf' : (mimeType === 'jpeg' ? 'jpg' : mimeType);

      const base64Clean = fileBase64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Clean, 'base64');

      // Max size: 5MB
      const MAX_SIZE_BYTES = 5 * 1024 * 1024;
      if (buffer.length > MAX_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: 'Laboratory report exceeds maximum permitted size of 5MB',
        });
      }

      const uploadDir = path.join(process.cwd(), 'uploads', 'soil_reports');
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const uniqueFileName = `soil_lab_${farmerId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      await fs.promises.writeFile(filePath, buffer);

      const publicUrl = `/uploads/soil_reports/${uniqueFileName}`;

      res.status(200).json({
        success: true,
        message: 'Laboratory soil report uploaded successfully',
        url: publicUrl,
        originalName: filename,
        mimeType: isPdf ? 'application/pdf' : `image/${mimeType}`,
        sizeBytes: buffer.length,
      });
    } catch (err) {
      logger.error('Soil Report Upload Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to process laboratory report upload',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/soil-analysis/recommendations
   * Calculate tailored fertilizer & amendment recommendations
   */
  async getFertilizerGuidance(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { soilAnalysisId, cropName = 'General', cropStage = 'Sowing / Planting', acreage = 1 } = req.body;

      if (!soilAnalysisId) {
        return res.status(400).json({
          success: false,
          message: 'Soil analysis record ID is required to calculate recommendations',
        });
      }

      const record = await SoilAnalysis.findOne({ _id: soilAnalysisId, farmer: farmerId }).populate('farm');
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Soil analysis record not found or unauthorized access',
        });
      }

      const effectiveAcreage = Number(acreage) > 0 ? Number(acreage) : (record.farm?.acreage || 1);

      const guidance = generateFertilizerRecommendations({
        soilAnalysis: record,
        cropName,
        cropStage,
        acreage: effectiveAcreage,
      });

      res.status(200).json({
        success: true,
        guidance,
      });
    } catch (err) {
      logger.error('Fertilizer Recommendation Calculation Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate fertilizer guidance',
        error: err.message,
      });
    }
  },
};
