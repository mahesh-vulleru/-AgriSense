import PDFDocument from 'pdfkit';
import Farm from '../models/Farm.js';
import Crop from '../models/Crop.js';
import CropAssessment from '../models/CropAssessment.js';
import SoilAnalysis from '../models/SoilAnalysis.js';
import IrrigationPlan from '../models/IrrigationPlan.js';
import IrrigationSchedule from '../models/IrrigationSchedule.js';
import WaterUsage from '../models/WaterUsage.js';
import DiseaseScan from '../models/DiseaseScan.js';
import { getAgriculturalWeather } from './weatherService.js';
import { evaluateWeatherRisks } from '../controllers/monitoringController.js';
import { logger } from '../utils/logger.js';

/**
 * Build standard date filter range object for MongoDB queries
 */
function buildDateQuery(field, startDate, endDate) {
  const query = {};
  if (startDate || endDate) {
    query[field] = {};
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) query[field].$gte = d;
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) {
        // Include full end date till 23:59:59.999
        d.setHours(23, 59, 59, 999);
        query[field].$lte = d;
      }
    }
    if (Object.keys(query[field]).length === 0) {
      delete query[field];
    }
  }
  return query;
}

export const reportsService = {
  /**
   * 1. Overview Dashboard Metrics across all agricultural modules
   */
  async getOverviewMetrics(farmerId, { farmId, cropId, startDate, endDate } = {}) {
    // 1. Base filters
    const farmFilter = { owner: farmerId };
    if (farmId) farmFilter._id = farmId;

    const cropFilter = { owner: farmerId };
    if (farmId) cropFilter.farm = farmId;
    if (cropId) cropFilter._id = cropId;

    const soilFilter = { farmer: farmerId, ...buildDateQuery('sampleDate', startDate, endDate) };
    if (farmId) soilFilter.farm = farmId;

    const irrigationFilter = { farmer: farmerId, ...buildDateQuery('scheduledDate', startDate, endDate) };
    if (farmId) irrigationFilter.farm = farmId;
    if (cropId) irrigationFilter.crop = cropId;

    const waterFilter = { farmer: farmerId, ...buildDateQuery('date', startDate, endDate) };
    if (farmId) waterFilter.farm = farmId;
    if (cropId) waterFilter.crop = cropId;

    const diseaseFilter = { farmer: farmerId, ...buildDateQuery('scanTimestamp', startDate, endDate) };
    if (farmId) diseaseFilter.farm = farmId;
    if (cropId) diseaseFilter.crop = cropId;

    const assessmentFilter = { farmer: farmerId, ...buildDateQuery('assessmentDate', startDate, endDate) };
    if (farmId) assessmentFilter.farm = farmId;
    if (cropId) assessmentFilter.crop = cropId;

    // Parallel fetch from all collections
    const [farms, crops, soilRecords, schedules, waterLogs, diseaseScans, assessments] =
      await Promise.all([
        Farm.find(farmFilter).lean(),
        Crop.find(cropFilter).populate('farm', 'name location acreage').lean(),
        SoilAnalysis.find(soilFilter).populate('farm', 'name').lean(),
        IrrigationSchedule.find(irrigationFilter)
          .populate('farm', 'name')
          .populate('crop', 'name')
          .lean(),
        WaterUsage.find(waterFilter).lean(),
        DiseaseScan.find(diseaseFilter)
          .populate('farm', 'name')
          .populate('crop', 'name')
          .lean(),
        CropAssessment.find(assessmentFilter).lean(),
      ]);

    // A. Farm Metrics
    const totalFarms = farms.length;
    const totalFarmAcreage = farms.reduce((sum, f) => sum + (f.acreage || 0), 0);

    // B. Crop & Yield Metrics
    const totalCultivatedArea = crops.reduce((sum, c) => sum + (c.cultivatedArea || 0), 0);
    const activeCrops = crops.filter((c) => c.status === 'Active');
    const harvestedCrops = crops.filter((c) => c.status === 'Harvested');

    const estimatedYieldSum = crops.reduce(
      (sum, c) => sum + (c.estimatedTotalYield || 0),
      0
    );
    const actualHarvestedYieldSum = crops.reduce(
      (sum, c) => sum + (c.actualHarvest?.actualYield || 0),
      0
    );

    // Crop Health Status breakdown
    const healthCounts = {
      Healthy: 0,
      Normal: 0,
      'Needs Attention': 0,
      'At Risk': 0,
      Critical: 0,
    };
    crops.forEach((c) => {
      const h = c.healthStatus || 'Normal';
      healthCounts[h] = (healthCounts[h] || 0) + 1;
    });

    // Lifecycle Growth Stage distribution
    const stageCounts = {};
    crops.forEach((c) => {
      const s = c.growthStage || 'Vegetative Growth';
      stageCounts[s] = (stageCounts[s] || 0) + 1;
    });

    // C. Soil Health Metrics
    const totalSoilTests = soilRecords.length;
    let avgPh = null;
    let avgOc = null;
    let avgEc = null;

    if (totalSoilTests > 0) {
      const phSum = soilRecords.reduce((sum, s) => sum + (s.pH?.value || 0), 0);
      avgPh = Number((phSum / totalSoilTests).toFixed(2));

      const ocSum = soilRecords.reduce((sum, s) => sum + (s.organicCarbon?.value || 0), 0);
      avgOc = Number((ocSum / totalSoilTests).toFixed(2));

      const ecSum = soilRecords.reduce((sum, s) => sum + (s.electricalConductivity?.value || 0), 0);
      avgEc = Number((ecSum / totalSoilTests).toFixed(2));
    }

    const soilHealthCounts = {};
    soilRecords.forEach((s) => {
      const h = s.overallHealth || 'Optimal';
      soilHealthCounts[h] = (soilHealthCounts[h] || 0) + 1;
    });

    // D. Irrigation & Water Metrics
    const completedSchedules = schedules.filter((s) => s.status === 'Completed');
    const pendingSchedules = schedules.filter((s) => s.status === 'Scheduled');
    const inProgressSchedules = schedules.filter((s) => s.status === 'In Progress');

    const totalWaterVolumeLiters = waterLogs.reduce(
      (sum, w) => sum + (w.volumeLiters || 0),
      0
    );
    const totalWaterVolumeM3 = Number((totalWaterVolumeLiters / 1000).toFixed(2));

    // Water by method
    const waterByMethod = {};
    schedules.forEach((s) => {
      if (s.status === 'Completed') {
        const m = s.method || 'Drip';
        waterByMethod[m] = (waterByMethod[m] || 0) + (s.waterUsedLiters || 0);
      }
    });

    // E. AI Disease Scan Metrics
    const totalDiseaseScans = diseaseScans.length;
    const diseaseStatusCounts = {
      Healthy: 0,
      Diseased: 0,
      'Pest Damage': 0,
      'Nutrient Deficiency': 0,
      'Physiological Stress': 0,
      'Unable to Determine': 0,
    };
    let expertVerificationNeededCount = 0;

    diseaseScans.forEach((d) => {
      const st = d.status || 'Unable to Determine';
      diseaseStatusCounts[st] = (diseaseStatusCounts[st] || 0) + 1;
      if (d.expertVerificationNeeded) expertVerificationNeededCount++;
    });

    // F. Critical Alerts Synthesis
    const criticalAlerts = [];

    // Critical crops
    crops
      .filter((c) => c.healthStatus === 'Critical' || c.healthStatus === 'At Risk')
      .forEach((c) => {
        criticalAlerts.push({
          type: 'Crop Health Risk',
          severity: c.healthStatus === 'Critical' ? 'Critical' : 'High',
          target: c.name,
          farm: c.farm?.name || 'Assigned Farm',
          message: `Crop is flagged as ${c.healthStatus}. Immediate field scouting required.`,
        });
      });

    // Soil abnormalities
    soilRecords
      .filter((s) => s.pH?.value < 5.5 || s.pH?.value > 8.5)
      .forEach((s) => {
        criticalAlerts.push({
          type: 'Soil pH Imbalance',
          severity: 'Moderate',
          target: `Soil Sample ${s.sampleId}`,
          farm: s.farm?.name || 'Farm',
          message: `Soil pH (${s.pH?.value}) is severely ${s.pH?.value < 5.5 ? 'acidic' : 'alkaline'}. Gypsum or lime amendment recommended.`,
        });
      });

    // Active crop disease cases
    diseaseScans
      .filter((d) => d.status === 'Diseased' || d.status === 'Pest Damage')
      .slice(0, 3)
      .forEach((d) => {
        criticalAlerts.push({
          type: 'Pathology Alert',
          severity: 'High',
          target: d.crop?.name || 'Crop',
          farm: d.farm?.name || 'Farm',
          message: `Pathogen detected: ${d.possibleDisease}. Verify agronomic treatment protocol.`,
        });
      });

    return {
      overview: {
        totalFarms,
        totalFarmAcreage: Number(totalFarmAcreage.toFixed(1)),
        totalCultivatedArea: Number(totalCultivatedArea.toFixed(1)),
        totalCrops: crops.length,
        activeCropsCount: activeCrops.length,
        harvestedCropsCount: harvestedCrops.length,
        estimatedYieldSum: Number(estimatedYieldSum.toFixed(2)),
        actualHarvestedYieldSum: Number(actualHarvestedYieldSum.toFixed(2)),
        hasActualYieldData: actualHarvestedYieldSum > 0,
        totalSoilTests,
        avgPh,
        avgOc,
        avgEc,
        totalSchedules: schedules.length,
        completedSchedulesCount: completedSchedules.length,
        pendingSchedulesCount: pendingSchedules.length,
        totalWaterVolumeLiters: Math.round(totalWaterVolumeLiters),
        totalWaterVolumeM3,
        totalDiseaseScans,
        expertVerificationNeededCount,
      },
      distributions: {
        cropHealth: healthCounts,
        cropStages: stageCounts,
        soilHealth: soilHealthCounts,
        waterByMethod,
        diseaseStatus: diseaseStatusCounts,
      },
      criticalAlerts,
    };
  },

  /**
   * 2. Comprehensive Farm Audit Reports
   */
  async getFarmReportsData(farmerId, { farmId, startDate, endDate } = {}) {
    const farmFilter = { owner: farmerId };
    if (farmId) farmFilter._id = farmId;

    const farms = await Farm.find(farmFilter).lean();

    const farmReports = await Promise.all(
      farms.map(async (farm) => {
        const farmObjId = farm._id;

        const [crops, soilRecords, schedules, diseaseScans] = await Promise.all([
          Crop.find({ owner: farmerId, farm: farmObjId }).lean(),
          SoilAnalysis.find({
            farmer: farmerId,
            farm: farmObjId,
            ...buildDateQuery('sampleDate', startDate, endDate),
          }).lean(),
          IrrigationSchedule.find({
            farmer: farmerId,
            farm: farmObjId,
            ...buildDateQuery('scheduledDate', startDate, endDate),
          })
            .populate('crop', 'name')
            .lean(),
          DiseaseScan.find({
            farmer: farmerId,
            farm: farmObjId,
            ...buildDateQuery('scanTimestamp', startDate, endDate),
          })
            .populate('crop', 'name')
            .lean(),
        ]);

        const cultivatedArea = crops.reduce((sum, c) => sum + (c.cultivatedArea || 0), 0);
        const waterUsedLiters = schedules
          .filter((s) => s.status === 'Completed')
          .reduce((sum, s) => sum + (s.waterUsedLiters || 0), 0);

        // Weather snapshot for farm
        let weatherSummary = null;
        if (farm.coordinates?.latitude && farm.coordinates?.longitude) {
          try {
            const w = await getAgriculturalWeather(
              farm.coordinates.latitude,
              farm.coordinates.longitude
            );
            if (w?.current) {
              weatherSummary = {
                temp: w.current.temp,
                condition: w.current.condition,
                humidity: w.current.humidity,
                rainfall: w.current.rainfall,
                source: w.provider || 'openweather',
              };
            }
          } catch (err) {
            logger.warn(`Could not fetch weather for farm ${farm.name}: ${err.message}`);
          }
        }

        return {
          id: farm._id,
          name: farm.name,
          location: farm.location,
          state: farm.state,
          district: farm.district,
          acreage: farm.acreage,
          cultivatedArea: Number(cultivatedArea.toFixed(1)),
          unutilizedArea: Math.max(0, Number((farm.acreage - cultivatedArea).toFixed(1))),
          soilType: farm.soilType,
          irrigationType: farm.irrigationType,
          coordinates: farm.coordinates,
          status: farm.status,
          createdAt: farm.createdAt,
          cropsCount: crops.length,
          activeCropsCount: crops.filter((c) => c.status === 'Active').length,
          crops: crops.map((c) => ({
            id: c._id,
            name: c.name,
            variety: c.variety,
            growthStage: c.growthStage,
            healthStatus: c.healthStatus,
            cultivatedArea: c.cultivatedArea,
            status: c.status,
            sowingDate: c.sowingDate,
            expectedHarvestDate: c.expectedHarvestDate,
            actualHarvestDate: c.actualHarvest?.harvestDate || null,
            estimatedYield: c.estimatedTotalYield || null,
            actualYield: c.actualHarvest?.actualYield || null,
          })),
          soilTestsCount: soilRecords.length,
          latestSoilTest: soilRecords[0]
            ? {
                sampleId: soilRecords[0].sampleId,
                sampleDate: soilRecords[0].sampleDate,
                pH: soilRecords[0].pH?.value,
                overallHealth: soilRecords[0].overallHealth,
              }
            : null,
          irrigationSchedulesCount: schedules.length,
          completedIrrigationsCount: schedules.filter((s) => s.status === 'Completed').length,
          waterUsedLiters,
          waterUsedM3: Number((waterUsedLiters / 1000).toFixed(2)),
          diseaseScansCount: diseaseScans.length,
          weatherSummary,
        };
      })
    );

    return farmReports;
  },

  /**
   * 3. Crop Lifecycle & Performance Reports
   */
  async getCropReportsData(farmerId, { farmId, cropId, startDate, endDate } = {}) {
    const cropFilter = { owner: farmerId };
    if (farmId) cropFilter.farm = farmId;
    if (cropId) cropFilter._id = cropId;

    const crops = await Crop.find(cropFilter)
      .populate('farm', 'name location acreage')
      .lean();

    const cropReports = await Promise.all(
      crops.map(async (c) => {
        const [assessments, diseaseScans, schedules] = await Promise.all([
          CropAssessment.find({
            farmer: farmerId,
            crop: c._id,
            ...buildDateQuery('assessmentDate', startDate, endDate),
          })
            .sort({ assessmentDate: -1 })
            .lean(),
          DiseaseScan.find({
            farmer: farmerId,
            crop: c._id,
            ...buildDateQuery('scanTimestamp', startDate, endDate),
          })
            .sort({ scanTimestamp: -1 })
            .lean(),
          IrrigationSchedule.find({
            farmer: farmerId,
            crop: c._id,
            status: 'Completed',
            ...buildDateQuery('scheduledDate', startDate, endDate),
          }).lean(),
        ]);

        const totalWaterConsumedLiters = schedules.reduce(
          (sum, s) => sum + (s.waterUsedLiters || 0),
          0
        );

        return {
          id: c._id,
          name: c.name,
          variety: c.variety,
          category: c.category,
          season: c.season,
          farm: {
            id: c.farm?._id,
            name: c.farm?.name || 'Unassigned Farm',
            location: c.farm?.location || '',
          },
          cultivatedArea: c.cultivatedArea,
          sowingDate: c.sowingDate,
          expectedHarvestDate: c.expectedHarvestDate,
          actualHarvestDate: c.actualHarvest?.harvestDate || null,
          growthStage: c.growthStage,
          healthStatus: c.healthStatus,
          status: c.status,
          // Explicitly distinguish estimated vs actual yield
          yield: {
            estimatedYieldPerAcre: c.expectedYieldPerAcre,
            estimatedTotalYield: c.estimatedTotalYield,
            isEstimated: true,
            actualHarvestedYield: c.actualHarvest?.actualYield || null,
            yieldUnit: c.actualHarvest?.yieldUnit || 'kg',
            qualityGrade: c.actualHarvest?.qualityGrade || null,
            hasActualYield: c.actualHarvest?.actualYield !== null && c.actualHarvest?.actualYield !== undefined,
            yieldVariance:
              c.actualHarvest?.actualYield && c.estimatedTotalYield
                ? Number((c.actualHarvest.actualYield - c.estimatedTotalYield).toFixed(2))
                : null,
          },
          assessmentsCount: assessments.length,
          assessmentsHistory: assessments.map((a) => ({
            id: a._id,
            date: a.assessmentDate,
            stage: a.growthStage,
            healthStatus: a.healthStatus,
            leafCondition: a.leafCondition,
            growthCondition: a.growthCondition,
            pestSeverity: a.pestSeverity,
            waterStressLevel: a.waterStressLevel,
          })),
          diseaseScansCount: diseaseScans.length,
          diseaseHistory: diseaseScans.map((d) => ({
            id: d._id,
            date: d.scanTimestamp,
            status: d.status,
            possibleDisease: d.possibleDisease,
            confidenceNote: d.confidenceNote,
          })),
          totalWaterConsumedLiters,
          totalWaterConsumedM3: Number((totalWaterConsumedLiters / 1000).toFixed(2)),
        };
      })
    );

    return cropReports;
  },

  /**
   * 4. Soil Health & Nutrient Reports
   */
  async getSoilReportsData(farmerId, { farmId, startDate, endDate } = {}) {
    const soilFilter = { farmer: farmerId, ...buildDateQuery('sampleDate', startDate, endDate) };
    if (farmId) soilFilter.farm = farmId;

    const records = await SoilAnalysis.find(soilFilter)
      .populate('farm', 'name location acreage soilType')
      .sort({ sampleDate: -1 })
      .lean();

    const totalSamples = records.length;
    let avgPh = null;
    let avgOc = null;
    let avgEc = null;

    if (totalSamples > 0) {
      avgPh = Number(
        (records.reduce((sum, r) => sum + (r.pH?.value || 0), 0) / totalSamples).toFixed(2)
      );
      avgOc = Number(
        (records.reduce((sum, r) => sum + (r.organicCarbon?.value || 0), 0) / totalSamples).toFixed(2)
      );
      avgEc = Number(
        (records.reduce((sum, r) => sum + (r.electricalConductivity?.value || 0), 0) / totalSamples).toFixed(2)
      );
    }

    return {
      summary: {
        totalSamples,
        avgPh,
        avgOc,
        avgEc,
      },
      records: records.map((r) => ({
        id: r._id,
        sampleId: r.sampleId,
        farm: {
          id: r.farm?._id,
          name: r.farm?.name || 'Farm',
          location: r.farm?.location || '',
        },
        sampleDate: r.sampleDate,
        soilType: r.soilType,
        testMethod: r.testMethod,
        labName: r.labName,
        pH: {
          value: r.pH?.value,
          rating: r.pH?.rating,
          isEstimated: Boolean(r.pH?.isEstimated),
        },
        nitrogen: {
          value: r.nitrogen?.value,
          rating: r.nitrogen?.rating,
          unit: r.nitrogen?.unit || 'kg/ha',
        },
        phosphorus: {
          value: r.phosphorus?.value,
          rating: r.phosphorus?.rating,
          unit: r.phosphorus?.unit || 'kg/ha',
        },
        potassium: {
          value: r.potassium?.value,
          rating: r.potassium?.rating,
          unit: r.potassium?.unit || 'kg/ha',
        },
        organicCarbon: {
          value: r.organicCarbon?.value,
          rating: r.organicCarbon?.rating,
          unit: '%',
        },
        electricalConductivity: {
          value: r.electricalConductivity?.value,
          rating: r.electricalConductivity?.rating,
          unit: 'dS/m',
        },
        soilMoisture: r.soilMoisture?.value !== null && r.soilMoisture?.value !== undefined
          ? { value: r.soilMoisture.value, unit: r.soilMoisture.unit || '%' }
          : null,
        overallHealth: r.overallHealth,
        recommendations: r.recommendations || [],
      })),
    };
  },

  /**
   * 5. Irrigation & Water Usage Reports
   */
  async getIrrigationReportsData(farmerId, { farmId, cropId, startDate, endDate } = {}) {
    const schedFilter = { farmer: farmerId, ...buildDateQuery('scheduledDate', startDate, endDate) };
    if (farmId) schedFilter.farm = farmId;
    if (cropId) schedFilter.crop = cropId;

    const waterFilter = { farmer: farmerId, ...buildDateQuery('date', startDate, endDate) };
    if (farmId) waterFilter.farm = farmId;
    if (cropId) waterFilter.crop = cropId;

    const [schedules, waterLogs, plans] = await Promise.all([
      IrrigationSchedule.find(schedFilter)
        .populate('farm', 'name location')
        .populate('crop', 'name variety')
        .sort({ scheduledDate: -1 })
        .lean(),
      WaterUsage.find(waterFilter)
        .populate('farm', 'name')
        .populate('crop', 'name')
        .sort({ date: 1 })
        .lean(),
      IrrigationPlan.find({ farmer: farmerId, ...(farmId ? { farm: farmId } : {}) })
        .populate('farm', 'name')
        .lean(),
    ]);

    const totalWaterVolumeLiters = waterLogs.reduce(
      (sum, w) => sum + (w.volumeLiters || 0),
      0
    );
    const totalWaterVolumeM3 = Number((totalWaterVolumeLiters / 1000).toFixed(2));

    // Group water by date for Recharts
    const timelineMap = {};
    waterLogs.forEach((w) => {
      const d = new Date(w.date).toISOString().split('T')[0];
      timelineMap[d] = (timelineMap[d] || 0) + (w.volumeLiters || 0);
    });
    const waterTimeline = Object.entries(timelineMap).map(([date, liters]) => ({
      date,
      liters: Math.round(liters),
      m3: Number((liters / 1000).toFixed(2)),
    }));

    // Group water by method
    const methodVolume = {};
    schedules.forEach((s) => {
      if (s.status === 'Completed' && s.waterUsedLiters) {
        const m = s.method || 'Drip';
        methodVolume[m] = (methodVolume[m] || 0) + s.waterUsedLiters;
      }
    });

    return {
      summary: {
        totalPlans: plans.length,
        totalSchedules: schedules.length,
        completedSchedulesCount: schedules.filter((s) => s.status === 'Completed').length,
        pendingSchedulesCount: schedules.filter((s) => s.status === 'Scheduled').length,
        totalWaterVolumeLiters: Math.round(totalWaterVolumeLiters),
        totalWaterVolumeM3,
      },
      waterTimeline,
      methodBreakdown: methodVolume,
      schedules: schedules.map((s) => ({
        id: s._id,
        title: s.title,
        farm: { id: s.farm?._id, name: s.farm?.name || 'Farm' },
        crop: { id: s.crop?._id, name: s.crop?.name || 'Crop' },
        scheduledDate: s.scheduledDate,
        completedAt: s.completedAt,
        durationMinutes: s.durationMinutes,
        method: s.method,
        waterSource: s.waterSource,
        waterUsedLiters: s.waterUsedLiters,
        status: s.status,
      })),
    };
  },

  /**
   * 6. Agro-Meteorological Weather Reports
   */
  async getWeatherReportsData(farmerId, { farmId } = {}) {
    const farmFilter = { owner: farmerId };
    if (farmId) farmFilter._id = farmId;

    const farms = await Farm.find(farmFilter).lean();

    const reports = await Promise.all(
      farms.map(async (farm) => {
        if (!farm.coordinates?.latitude || !farm.coordinates?.longitude) {
          return {
            farm: { id: farm._id, name: farm.name, location: farm.location },
            available: false,
            message: 'Coordinates not configured for this farm parcel.',
          };
        }

        try {
          const w = await getAgriculturalWeather(
            farm.coordinates.latitude,
            farm.coordinates.longitude
          );

          // Weather risks
          const riskAssessment = evaluateWeatherRisks(w, null);

          return {
            farm: { id: farm._id, name: farm.name, location: farm.location },
            available: true,
            provider: w.provider || 'openweather',
            currentObservation: {
              isForecast: false,
              temp: w.current?.temp,
              feelsLike: w.current?.feelsLike,
              humidity: w.current?.humidity,
              windSpeed: w.current?.windSpeed,
              windDirection: w.current?.windDirection,
              rainfall: w.current?.rainfall,
              pressure: w.current?.pressure,
              condition: w.current?.condition,
              icon: w.current?.icon,
              timestamp: w.timestamp || new Date(),
            },
            forecastSummary: Array.isArray(w.forecast)
              ? w.forecast.slice(0, 5).map((f) => ({
                  isForecast: true,
                  date: f.date,
                  tempMin: f.tempMin,
                  tempMax: f.tempMax,
                  rainfallMm: f.precipitationMm || f.rainProbability || 0,
                  humidity: f.humidity,
                  condition: f.condition,
                }))
              : [],
            agronomicRisks: riskAssessment.risks || [],
          };
        } catch (err) {
          logger.warn(`Failed weather fetch for report on farm ${farm.name}: ${err.message}`);
          return {
            farm: { id: farm._id, name: farm.name, location: farm.location },
            available: false,
            message: 'OpenWeather communication error: ' + err.message,
          };
        }
      })
    );

    return reports;
  },

  /**
   * 7. AI Crop Disease Diagnostics Reports
   */
  async getDiseaseReportsData(farmerId, { farmId, cropId, startDate, endDate } = {}) {
    const diseaseFilter = { farmer: farmerId, ...buildDateQuery('scanTimestamp', startDate, endDate) };
    if (farmId) diseaseFilter.farm = farmId;
    if (cropId) diseaseFilter.crop = cropId;

    const scans = await DiseaseScan.find(diseaseFilter)
      .populate('farm', 'name location')
      .populate('crop', 'name variety growthStage')
      .sort({ scanTimestamp: -1 })
      .lean();

    const totalScans = scans.length;
    const statusCounts = {
      Healthy: 0,
      Diseased: 0,
      'Pest Damage': 0,
      'Nutrient Deficiency': 0,
      'Physiological Stress': 0,
      'Unable to Determine': 0,
    };
    const cropDistribution = {};
    let expertVerificationNeededCount = 0;

    scans.forEach((s) => {
      const st = s.status || 'Unable to Determine';
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      const cName = s.crop?.name || s.identifiedCrop || 'Unregistered Crop';
      cropDistribution[cName] = (cropDistribution[cName] || 0) + 1;

      if (s.expertVerificationNeeded) expertVerificationNeededCount++;
    });

    return {
      summary: {
        totalScans,
        statusCounts,
        cropDistribution,
        expertVerificationNeededCount,
        disclaimer:
          'AI-generated preliminary assessment. Confirm important disease and treatment decisions with a qualified agricultural expert or district KVK plant pathologist.',
      },
      scans: scans.map((s) => ({
        id: s._id,
        scanTimestamp: s.scanTimestamp,
        farm: { id: s.farm?._id, name: s.farm?.name || 'Farm' },
        crop: { id: s.crop?._id, name: s.crop?.name || s.identifiedCrop || 'Crop' },
        image: s.image?.url || '',
        status: s.status,
        possibleDisease: s.possibleDisease,
        visibleSymptoms: s.visibleSymptoms || [],
        alternativeCauses: s.alternativeCauses || [],
        suggestedActions: s.suggestedActions || [],
        expertVerificationNeeded: s.expertVerificationNeeded,
        confidenceNote: s.confidenceNote || 'Confidence not calibrated',
        aiProvider: s.aiProvider || 'gemini',
        aiModel: s.aiModel || 'gemini-2.5-flash-lite',
      })),
    };
  },

  /**
   * 8. RFC-4180 Compliant CSV Export
   */
  async generateCsvReport(category, data, metadata = {}) {
    const lines = [];

    // Header metadata block
    lines.push(`"AgriSense Intelligent Agriculture Platform - Export Report"`);
    lines.push(`"Category:","${category.toUpperCase()}"`);
    lines.push(`"Farmer:","${metadata.farmerName || 'Authenticated Farmer'}"`);
    lines.push(`"Email:","${metadata.farmerEmail || ''}"`);
    lines.push(`"Export Timestamp:","${new Date().toISOString()}"`);
    if (metadata.dateRange) {
      lines.push(`"Date Range:","${metadata.dateRange}"`);
    }
    lines.push(''); // Blank separator

    if (category === 'overview' && data.overview) {
      lines.push(`"METRIC","VALUE","UNIT / NOTE"`);
      lines.push(`"Total Registered Farms","${data.overview.totalFarms}","Parcels"`);
      lines.push(`"Total Cultivated Acreage","${data.overview.totalCultivatedArea}","Acres"`);
      lines.push(`"Total Active Crops","${data.overview.activeCropsCount}","Species"`);
      lines.push(`"Total Harvested Crops","${data.overview.harvestedCropsCount}","Species"`);
      lines.push(`"Estimated Yield","${data.overview.estimatedYieldSum}","Estimated Total (kg)"`);
      lines.push(`"Actual Harvested Yield","${data.overview.actualHarvestedYieldSum}","Verified Harvest (kg)"`);
      lines.push(`"Soil Tests Recorded","${data.overview.totalSoilTests}","Samples"`);
      lines.push(`"Average Soil pH","${data.overview.avgPh || 'N/A'}","pH Scale"`);
      lines.push(`"Total Water Consumption","${data.overview.totalWaterVolumeLiters}","Liters (${data.overview.totalWaterVolumeM3} m³)"`);
      lines.push(`"AI Crop Disease Scans","${data.overview.totalDiseaseScans}","Scans"`);
    } else if (category === 'farms' && Array.isArray(data)) {
      lines.push(`"Farm Name","Location","State","District","Total Acreage","Cultivated Area","Soil Type","Irrigation Type","Crops Count","Water Used (Liters)"`);
      data.forEach((f) => {
        lines.push(
          `"${f.name}","${f.location}","${f.state}","${f.district}","${f.acreage}","${f.cultivatedArea}","${f.soilType}","${f.irrigationType}","${f.cropsCount}","${f.waterUsedLiters}"`
        );
      });
    } else if (category === 'crops' && Array.isArray(data)) {
      lines.push(`"Crop Name","Variety","Farm","Category","Season","Cultivated Area (Acres)","Growth Stage","Health Status","Planting Date","Expected Harvest","Actual Harvest","Estimated Yield (kg)","Actual Harvest Yield (kg)","Quality Grade"`);
      data.forEach((c) => {
        lines.push(
          `"${c.name}","${c.variety || ''}","${c.farm?.name || ''}","${c.category || ''}","${c.season || ''}","${c.cultivatedArea}","${c.growthStage}","${c.healthStatus}","${c.sowingDate ? new Date(c.sowingDate).toISOString().split('T')[0] : ''}","${c.expectedHarvestDate ? new Date(c.expectedHarvestDate).toISOString().split('T')[0] : ''}","${c.actualHarvestDate ? new Date(c.actualHarvestDate).toISOString().split('T')[0] : 'Pending'}","${c.yield.estimatedTotalYield || 'N/A'}","${c.yield.actualHarvestedYield || 'N/A'}","${c.yield.qualityGrade || 'N/A'}"`
        );
      });
    } else if (category === 'soil' && data.records) {
      lines.push(`"Sample ID","Farm","Sample Date","Soil Type","Test Method","pH Value","pH Rating","Nitrogen (kg/ha)","Phosphorus (kg/ha)","Potassium (kg/ha)","Organic Carbon (%)","EC (dS/m)","Overall Health"`);
      data.records.forEach((s) => {
        lines.push(
          `"${s.sampleId}","${s.farm?.name}","${new Date(s.sampleDate).toISOString().split('T')[0]}","${s.soilType}","${s.testMethod}","${s.pH.value}","${s.pH.rating}","${s.nitrogen.value}","${s.phosphorus.value}","${s.potassium.value}","${s.organicCarbon.value}","${s.electricalConductivity.value}","${s.overallHealth}"`
        );
      });
    } else if (category === 'irrigation' && data.schedules) {
      lines.push(`"Session Title","Farm","Crop","Scheduled Date","Method","Water Source","Duration (Mins)","Water Used (Liters)","Status"`);
      data.schedules.forEach((i) => {
        lines.push(
          `"${i.title}","${i.farm?.name}","${i.crop?.name}","${new Date(i.scheduledDate).toISOString().split('T')[0]}","${i.method}","${i.waterSource}","${i.durationMinutes}","${i.waterUsedLiters || 0}","${i.status}"`
        );
      });
    } else if (category === 'disease' && data.scans) {
      lines.push(`"Scan Date","Farm","Crop","AI Status","Possible Pathogen","Symptoms","Actions Suggested","AI Model","Calibrated Confidence"`);
      data.scans.forEach((d) => {
        const symptoms = (d.visibleSymptoms || []).join('; ');
        const actions = (d.suggestedActions || []).join('; ');
        lines.push(
          `"${new Date(d.scanTimestamp).toISOString()}","${d.farm?.name}","${d.crop?.name}","${d.status}","${d.possibleDisease}","${symptoms}","${actions}","${d.aiModel}","${d.confidenceNote}"`
        );
      });
    }

    // Prepend UTF-8 BOM for Windows Excel compatibility
    return '\uFEFF' + lines.join('\r\n');
  },

  /**
   * 9. Professional PDF Export via PDFKit
   */
  async generatePdfReport(category, data, metadata = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 40,
          size: 'A4',
          info: {
            Title: `AgriSense ${category.toUpperCase()} Report`,
            Author: 'AgriSense Platform',
            Subject: 'Agricultural Analytics & Operations Summary',
          },
        });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Color constants
        const primaryColor = '#166534'; // Forest Green
        const secondaryColor = '#22C55E'; // Emerald
        const darkText = '#1E293B';
        const slateText = '#64748B';
        const lightBg = '#F8FAFC';

        // 1. Header Banner
        doc.rect(40, 40, doc.page.width - 80, 50).fill(primaryColor);
        doc
          .fillColor('#FFFFFF')
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('AGRISENSE INTELLIGENT AGRICULTURE', 55, 50);
        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Farm Analytics, Crop Health & Operational Intelligence', 55, 72);

        doc.moveDown(2);

        // 2. Report Details Box
        const startY = 105;
        doc.rect(40, startY, doc.page.width - 80, 55).fill(lightBg).stroke('#E2E8F0');
        doc.fillColor(darkText).fontSize(10).font('Helvetica-Bold');
        doc.text(`Report: ${category.toUpperCase()} COMPREHENSIVE AUDIT`, 50, startY + 10);
        doc.font('Helvetica').fontSize(9).fillColor(slateText);
        doc.text(`Farmer: ${metadata.farmerName || 'Farmer'} (${metadata.farmerEmail || 'N/A'})`, 50, startY + 25);
        doc.text(
          `Generated: ${new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })} · Reporting Period: ${metadata.dateRange || 'All Time'}`,
          50,
          startY + 38
        );

        doc.y = startY + 70;

        // 3. Category Sections
        if (category === 'overview' && data.overview) {
          doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Executive Operational KPI Summary');
          doc.moveDown(0.5);

          const o = data.overview;
          const kpis = [
            ['Total Registered Farms', `${o.totalFarms} Parcels`],
            ['Total Cultivated Area', `${o.totalCultivatedArea} Acres`],
            ['Active Crops', `${o.activeCropsCount} Species`],
            ['Harvested Crops', `${o.harvestedCropsCount} Species`],
            ['Estimated Yield', `${o.estimatedTotalYieldSum || o.estimatedYieldSum} kg (Estimated)`],
            ['Actual Harvested Yield', `${o.actualHarvestedYieldSum} kg ${o.hasActualYieldData ? '(Verified)' : '(None recorded)'}`],
            ['Soil Samples Tested', `${o.totalSoilTests} Tests (Avg pH: ${o.avgPh || 'N/A'})`],
            ['Water Consumed', `${o.totalWaterVolumeLiters.toLocaleString()} Liters (${o.totalWaterVolumeM3} m³)`],
            ['AI Disease Scans', `${o.totalDiseaseScans} Foliar Inspections`],
          ];

          kpis.forEach(([label, val]) => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(darkText).text(`• ${label}: `, { continued: true });
            doc.font('Helvetica').fillColor(primaryColor).text(val);
          });

          doc.moveDown(1);
          if (data.criticalAlerts && data.criticalAlerts.length > 0) {
            doc.fillColor('#DC2626').fontSize(11).font('Helvetica-Bold').text('Critical Farm & Crop Alerts');
            doc.moveDown(0.3);
            data.criticalAlerts.forEach((a) => {
              doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B91C1C').text(`[${a.severity}] ${a.type} - ${a.target} (${a.farm}): `, { continued: true });
              doc.font('Helvetica').fillColor(darkText).text(a.message);
            });
          }
        } else if (category === 'crops' && Array.isArray(data)) {
          doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Crop Lifecycle & Harvest Performance');
          doc.moveDown(0.5);

          data.forEach((c) => {
            doc.rect(40, doc.y, doc.page.width - 80, 52).fill('#F1F5F9');
            doc.fillColor(darkText).font('Helvetica-Bold').fontSize(10).text(`${c.name} (${c.variety || 'Standard'}) - ${c.farm?.name}`, 48, doc.y - 46);
            doc.font('Helvetica').fontSize(8.5).fillColor(slateText);
            doc.text(`Stage: ${c.growthStage} · Health: ${c.healthStatus} · Area: ${c.cultivatedArea} Acres`, 48, doc.y - 32);
            doc.text(
              `Estimated Yield: ${c.yield.estimatedTotalYield || 'N/A'} kg · Verified Harvest: ${c.yield.actualHarvestedYield || 'Pending'} ${c.yield.yieldUnit} ${c.yield.qualityGrade ? '(' + c.yield.qualityGrade + ')' : ''}`,
              48,
              doc.y - 18
            );
            doc.moveDown(0.7);
          });
        } else if (category === 'soil' && data.records) {
          doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Soil Chemistry & Fertility Analysis');
          doc.moveDown(0.5);

          data.records.forEach((s) => {
            doc.rect(40, doc.y, doc.page.width - 80, 50).fill('#F1F5F9');
            doc.fillColor(darkText).font('Helvetica-Bold').fontSize(9.5).text(`Sample: ${s.sampleId} · Farm: ${s.farm?.name} (${s.soilType})`, 48, doc.y - 44);
            doc.font('Helvetica').fontSize(8.5).fillColor(slateText);
            doc.text(`pH: ${s.pH.value} (${s.pH.rating}) · N: ${s.nitrogen.value} kg/ha · P: ${s.phosphorus.value} kg/ha · K: ${s.potassium.value} kg/ha`, 48, doc.y - 30);
            doc.text(`Organic Carbon: ${s.organicCarbon.value}% (${s.organicCarbon.rating}) · EC: ${s.electricalConductivity.value} dS/m · Status: ${s.overallHealth}`, 48, doc.y - 16);
            doc.moveDown(0.7);
          });
        } else if (category === 'irrigation' && data.schedules) {
          doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('Irrigation Scheduling & Water Consumption');
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(9).fillColor(darkText).text(`Total Water Usage: ${data.summary.totalWaterVolumeLiters.toLocaleString()} Liters (${data.summary.totalWaterVolumeM3} m³)`);
          doc.moveDown(0.5);

          data.schedules.slice(0, 8).forEach((s) => {
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkText).text(`• ${s.title}: `, { continued: true });
            doc.font('Helvetica').fillColor(slateText).text(`${s.farm?.name} · Method: ${s.method} · Duration: ${s.durationMinutes}m · Water: ${s.waterUsedLiters || 0}L · Status: ${s.status}`);
          });
        } else if (category === 'disease' && data.scans) {
          doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text('AI Foliar Disease Diagnostic Records');
          doc.moveDown(0.5);

          data.scans.slice(0, 6).forEach((d) => {
            doc.rect(40, doc.y, doc.page.width - 80, 48).fill('#F1F5F9');
            doc.fillColor(darkText).font('Helvetica-Bold').fontSize(9.5).text(`Diagnosis: ${d.possibleDisease} [${d.status}]`, 48, doc.y - 42);
            doc.font('Helvetica').fontSize(8.5).fillColor(slateText);
            doc.text(`Crop: ${d.crop?.name} · Farm: ${d.farm?.name} · Model: ${d.aiModel} (${d.confidenceNote})`, 48, doc.y - 28);
            doc.text(`Actions: ${(d.suggestedActions || []).slice(0, 1).join(', ') || 'Regular foliar monitoring'}`, 48, doc.y - 14);
            doc.moveDown(0.7);
          });
        }

        // 4. Footer & Legal Disclaimer
        const bottomY = doc.page.height - 55;
        doc.rect(40, bottomY, doc.page.width - 80, 0.5).fill('#CBD5E1');
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor(slateText)
          .text(
            'AGRISENSE AGRICULTURAL ADVISORY: All analytical projections and AI pathology findings are decision support estimates. Final agronomic, chemical, or irrigation actions should be verified with licensed plant pathologists and regional agricultural authorities.',
            40,
            bottomY + 6,
            { width: doc.page.width - 80, align: 'center' }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  },
};

export default reportsService;
