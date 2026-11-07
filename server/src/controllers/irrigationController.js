import Farm from '../models/Farm.js';
import Crop from '../models/Crop.js';
import SoilAnalysis from '../models/SoilAnalysis.js';
import IrrigationPlan, { IRRIGATION_METHODS, WATER_SOURCES, IRRIGATION_FREQUENCIES, PLAN_STATUSES } from '../models/IrrigationPlan.js';
import IrrigationSchedule, { SCHEDULE_STATUSES, WATER_UNITS } from '../models/IrrigationSchedule.js';
import WaterUsage from '../models/WaterUsage.js';
import { getAgriculturalWeather } from '../services/weatherService.js';
import { generateIrrigationAdvisory } from '../services/irrigationAdvisoryService.js';
import { logger } from '../utils/logger.js';

/**
 * Helper to normalize any volumetric unit to Liters
 */
export function normalizeToLiters(volume, unit = 'Liters') {
  const vol = Number(volume);
  if (isNaN(vol) || vol <= 0) return 0;
  switch (unit) {
    case 'Cubic Meters':
      return Math.round(vol * 1000 * 100) / 100;
    case 'Gallons':
      return Math.round(vol * 3.78541 * 100) / 100;
    case 'Acre-Inches':
      return Math.round(vol * 102790 * 100) / 100;
    case 'Liters':
    default:
      return Math.round(vol * 100) / 100;
  }
}

export const irrigationController = {
  /**
   * GET /api/irrigation/dashboard
   * Aggregated metrics for farmer's smart irrigation dashboard
   */
  async getDashboard(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;

      // 1. Fetch farmer's farms
      const farms = await Farm.find({ owner: farmerId, status: { $ne: 'Archived' } })
        .sort({ name: 1 })
        .select('_id name location acreage soilType irrigationType coordinates mainCrops');

      const totalFarms = farms.length;
      const farmIds = farms.map((f) => f._id);

      // 2. Fetch all irrigation plans
      const plans = await IrrigationPlan.find({ farmer: farmerId, status: { $ne: 'Archived' } })
        .populate('farm', '_id name location acreage soilType')
        .populate('crop', '_id name variety category growthStage cultivatedArea')
        .sort({ createdAt: -1 });

      const uniqueFarmsWithPlans = new Set(plans.map((p) => p.farm?._id?.toString()).filter(Boolean));
      const totalFarmsWithPlans = uniqueFarmsWithPlans.size;

      // 3. Fetch all irrigation activities / schedules
      const schedules = await IrrigationSchedule.find({ farmer: farmerId })
        .populate('farm', '_id name location')
        .populate('crop', '_id name variety growthStage')
        .sort({ scheduledDate: 1 });

      const now = new Date();
      const upcomingActivities = schedules.filter((s) => s.status === 'Scheduled' && new Date(s.scheduledDate) >= now);
      const completedActivities = schedules.filter((s) => s.status === 'Completed');
      const pendingActivities = schedules.filter((s) => s.status === 'Scheduled' && new Date(s.scheduledDate) < now);

      // 4. Fetch water usage aggregation
      const waterRecords = await WaterUsage.find({ farmer: farmerId }).sort({ date: -1 });
      const totalWaterLiters = waterRecords.reduce((sum, r) => sum + (r.volumeLiters || 0), 0);

      // 5. Crop-wise irrigation overview
      const cropOverviewMap = {};
      plans.forEach((p) => {
        const cId = p.crop?._id?.toString() || p.crop?.toString();
        if (cId && p.crop) {
          if (!cropOverviewMap[cId]) {
            cropOverviewMap[cId] = {
              cropId: p.crop._id,
              cropName: p.crop.name,
              variety: p.crop.variety,
              growthStage: p.crop.growthStage,
              farmName: p.farm?.name || '',
              cultivatedArea: p.cultivatedArea || p.crop.cultivatedArea,
              method: p.method,
              frequency: p.frequency,
              planStatus: p.status,
              totalSessionsPlanned: 0,
              totalSessionsCompleted: 0,
            };
          }
        }
      });

      schedules.forEach((s) => {
        const cId = s.crop?._id?.toString();
        if (cId && cropOverviewMap[cId]) {
          cropOverviewMap[cId].totalSessionsPlanned++;
          if (s.status === 'Completed') {
            cropOverviewMap[cId].totalSessionsCompleted++;
          }
        }
      });

      // 6. Generate weather & soil advisory for primary farm if available
      let primaryAdvisory = null;
      if (farms.length > 0) {
        const primaryFarm = farms[0];
        try {
          let weatherData = null;
          if (primaryFarm.coordinates?.latitude && primaryFarm.coordinates?.longitude) {
            weatherData = await getAgriculturalWeather(
              primaryFarm.coordinates.latitude,
              primaryFarm.coordinates.longitude,
              primaryFarm
            );
          }
          const latestSoil = await SoilAnalysis.findOne({ farm: primaryFarm._id, farmer: farmerId }).sort({ sampleDate: -1 });
          const activeCrop = await Crop.findOne({ farm: primaryFarm._id, owner: farmerId, status: 'Active' });

          primaryAdvisory = generateIrrigationAdvisory({
            farm: primaryFarm,
            crop: activeCrop,
            weatherData,
            soilRecord: latestSoil,
          });
        } catch (advErr) {
          logger.warn('Advisory generation warning in dashboard:', advErr.message);
        }
      }

      res.status(200).json({
        success: true,
        summary: {
          totalFarms,
          totalFarmsWithPlans,
          upcomingCount: upcomingActivities.length,
          completedCount: completedActivities.length,
          pendingCount: pendingActivities.length,
          totalWaterLiters: Math.round(totalWaterLiters),
          waterRecordsCount: waterRecords.length,
        },
        primaryAdvisory,
        upcomingActivities: upcomingActivities.slice(0, 10),
        recentCompleted: completedActivities.slice(-5).reverse(),
        activePlans: plans.filter((p) => p.status === 'Active'),
        cropOverview: Object.values(cropOverviewMap),
        farms,
      });
    } catch (err) {
      logger.error('Irrigation Dashboard Fetch Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve smart irrigation dashboard data',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/irrigation/plans
   * Create a new irrigation plan
   */
  async createPlan(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const {
        farmId,
        cropId,
        name,
        method = 'Drip',
        cultivatedArea,
        waterSource = 'Borewell / Tubewell',
        startDate,
        frequency = 'Alternate Days',
        plannedDurationMinutes = 60,
        waterVolumePerSessionLiters,
        notes = '',
      } = req.body;

      if (!farmId || !cropId) {
        return res.status(400).json({
          success: false,
          message: 'Both Farm parcel and Crop selection are required',
        });
      }

      // Verify farm ownership
      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        return res.status(404).json({
          success: false,
          message: 'Target farm parcel not found or unauthorized access',
        });
      }

      // Verify crop ownership and relationship with farm
      const crop = await Crop.findOne({ _id: cropId, owner: farmerId, farm: farmId });
      if (!crop) {
        return res.status(404).json({
          success: false,
          message: 'Selected crop does not belong to this farm parcel or user',
        });
      }

      const area = Number(cultivatedArea) || crop.cultivatedArea || farm.acreage || 1;
      const duration = Number(plannedDurationMinutes) || 60;
      if (duration < 1 || duration > 1440) {
        return res.status(400).json({
          success: false,
          message: 'Planned duration must be between 1 and 1440 minutes',
        });
      }

      const planName = (name && name.trim()) || `${crop.name} - ${method} Irrigation Plan`;

      const newPlan = new IrrigationPlan({
        farmer: farmerId,
        farm: farm._id,
        crop: crop._id,
        name: planName,
        method: IRRIGATION_METHODS.includes(method) ? method : 'Drip',
        cultivatedArea: area,
        waterSource: WATER_SOURCES.includes(waterSource) ? waterSource : 'Borewell / Tubewell',
        startDate: startDate ? new Date(startDate) : new Date(),
        frequency: IRRIGATION_FREQUENCIES.includes(frequency) ? frequency : 'Alternate Days',
        plannedDurationMinutes: duration,
        waterVolumePerSessionLiters: Number(waterVolumePerSessionLiters) || null,
        notes: notes?.trim() || '',
        status: 'Active',
      });

      await newPlan.save();
      await newPlan.populate('farm', '_id name location acreage soilType');
      await newPlan.populate('crop', '_id name variety growthStage category');

      logger.info(`Irrigation plan created: ${newPlan.name} for crop ${crop.name}`);

      res.status(201).json({
        success: true,
        message: 'Irrigation plan successfully registered',
        plan: newPlan,
      });
    } catch (err) {
      logger.error('Create Irrigation Plan Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to create irrigation plan',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/irrigation/plans
   * List irrigation plans with optional filters
   */
  async getPlans(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, status } = req.query;

      const query = { farmer: farmerId };
      if (farmId) query.farm = farmId;
      if (cropId) query.crop = cropId;
      if (status && PLAN_STATUSES.includes(status)) query.status = status;
      else query.status = { $ne: 'Archived' };

      const plans = await IrrigationPlan.find(query)
        .populate('farm', '_id name location acreage soilType')
        .populate('crop', '_id name variety growthStage category cultivatedArea')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: plans.length,
        plans,
      });
    } catch (err) {
      logger.error('List Irrigation Plans Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve irrigation plans',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/irrigation/plans/:id
   */
  async getPlanById(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const plan = await IrrigationPlan.findOne({ _id: id, farmer: farmerId })
        .populate('farm', '_id name location acreage soilType coordinates')
        .populate('crop', '_id name variety growthStage category cultivatedArea');

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Irrigation plan not found or unauthorized access',
        });
      }

      res.status(200).json({
        success: true,
        plan,
      });
    } catch (err) {
      logger.error('Get Plan Details Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve plan details',
        error: err.message,
      });
    }
  },

  /**
   * PUT /api/irrigation/plans/:id
   */
  async updatePlan(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const plan = await IrrigationPlan.findOne({ _id: id, farmer: farmerId });
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Irrigation plan not found or unauthorized access',
        });
      }

      const {
        name,
        method,
        cultivatedArea,
        waterSource,
        startDate,
        frequency,
        plannedDurationMinutes,
        waterVolumePerSessionLiters,
        status,
        notes,
      } = req.body;

      if (name) plan.name = name.trim();
      if (method && IRRIGATION_METHODS.includes(method)) plan.method = method;
      if (cultivatedArea) plan.cultivatedArea = Number(cultivatedArea);
      if (waterSource && WATER_SOURCES.includes(waterSource)) plan.waterSource = waterSource;
      if (startDate) plan.startDate = new Date(startDate);
      if (frequency && IRRIGATION_FREQUENCIES.includes(frequency)) plan.frequency = frequency;
      if (plannedDurationMinutes) {
        const dur = Number(plannedDurationMinutes);
        if (dur >= 1 && dur <= 1440) plan.plannedDurationMinutes = dur;
      }
      if (waterVolumePerSessionLiters !== undefined) {
        plan.waterVolumePerSessionLiters = Number(waterVolumePerSessionLiters) || null;
      }
      if (status && PLAN_STATUSES.includes(status)) plan.status = status;
      if (notes !== undefined) plan.notes = notes.trim();

      await plan.save();
      await plan.populate('farm', '_id name location acreage soilType');
      await plan.populate('crop', '_id name variety growthStage category');

      res.status(200).json({
        success: true,
        message: 'Irrigation plan successfully updated',
        plan,
      });
    } catch (err) {
      logger.error('Update Irrigation Plan Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to update irrigation plan',
        error: err.message,
      });
    }
  },

  /**
   * DELETE /api/irrigation/plans/:id
   */
  async deletePlan(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const plan = await IrrigationPlan.findOneAndDelete({ _id: id, farmer: farmerId });
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Irrigation plan not found or unauthorized access',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Irrigation plan successfully deleted',
        deletedId: id,
      });
    } catch (err) {
      logger.error('Delete Irrigation Plan Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to delete irrigation plan',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/irrigation/schedules
   * Create an individual scheduled irrigation session / activity
   */
  async createSchedule(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const {
        farmId,
        cropId,
        planId = null,
        title,
        scheduledDate,
        durationMinutes = 60,
        method = 'Drip',
        waterSource = 'Borewell / Tubewell',
        notes = '',
      } = req.body;

      if (!farmId || !cropId || !scheduledDate) {
        return res.status(400).json({
          success: false,
          message: 'Farm parcel, Crop, and Scheduled Date are required',
        });
      }

      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        return res.status(404).json({
          success: false,
          message: 'Target farm parcel not found or unauthorized',
        });
      }

      const crop = await Crop.findOne({ _id: cropId, owner: farmerId, farm: farmId });
      if (!crop) {
        return res.status(404).json({
          success: false,
          message: 'Target crop not found or does not belong to this farm',
        });
      }

      const dur = Number(durationMinutes) || 60;
      if (dur < 1 || dur > 1440) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled duration must be between 1 and 1440 minutes',
        });
      }

      // Capture weather snapshot if coordinates are available
      let weatherSnapshot = {
        rainForecastMm: 0,
        temp: null,
        humidity: null,
        condition: '',
        recommendationNotice: '',
      };

      if (farm.coordinates?.latitude && farm.coordinates?.longitude) {
        try {
          const w = await getAgriculturalWeather(farm.coordinates.latitude, farm.coordinates.longitude, farm);
          if (w && w.current) {
            weatherSnapshot = {
              rainForecastMm: w.rainfallSummary?.totalRainfallMm || 0,
              temp: w.current.temp,
              humidity: w.current.humidity,
              condition: w.current.condition || '',
              recommendationNotice:
                w.rainfallSummary?.totalRainfallMm >= 10
                  ? 'Rain forecast in area. Verify field before starting.'
                  : 'Favorable watering conditions.',
            };
          }
        } catch {
          // Weather snapshot is supplementary
        }
      }

      const scheduleTitle = (title && title.trim()) || `${crop.name} - ${method} Irrigation`;

      const schedule = new IrrigationSchedule({
        farmer: farmerId,
        farm: farm._id,
        crop: crop._id,
        plan: planId || null,
        title: scheduleTitle,
        scheduledDate: new Date(scheduledDate),
        durationMinutes: dur,
        method: IRRIGATION_METHODS.includes(method) ? method : 'Drip',
        waterSource: WATER_SOURCES.includes(waterSource) ? waterSource : 'Borewell / Tubewell',
        status: 'Scheduled',
        weatherSnapshot,
        notes: notes?.trim() || '',
      });

      await schedule.save();
      await schedule.populate('farm', '_id name location');
      await schedule.populate('crop', '_id name variety growthStage');

      logger.info(`Irrigation schedule created: ${schedule.title} for ${scheduledDate}`);

      res.status(201).json({
        success: true,
        message: 'Irrigation session successfully scheduled',
        schedule,
      });
    } catch (err) {
      logger.error('Create Irrigation Schedule Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to create irrigation schedule',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/irrigation/schedules
   * List scheduled activities with filters
   */
  async getSchedules(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, status, startDate, endDate } = req.query;

      const query = { farmer: farmerId };
      if (farmId) query.farm = farmId;
      if (cropId) query.crop = cropId;
      if (status && SCHEDULE_STATUSES.includes(status)) query.status = status;

      if (startDate || endDate) {
        query.scheduledDate = {};
        if (startDate) query.scheduledDate.$gte = new Date(startDate);
        if (endDate) query.scheduledDate.$lte = new Date(endDate);
      }

      const schedules = await IrrigationSchedule.find(query)
        .populate('farm', '_id name location')
        .populate('crop', '_id name variety growthStage')
        .populate('plan', '_id name method frequency')
        .sort({ scheduledDate: 1 });

      res.status(200).json({
        success: true,
        count: schedules.length,
        schedules,
      });
    } catch (err) {
      logger.error('List Schedules Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve irrigation schedules',
        error: err.message,
      });
    }
  },

  /**
   * PUT /api/irrigation/schedules/:id
   * Update an existing schedule's planned parameters
   */
  async updateSchedule(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const schedule = await IrrigationSchedule.findOne({ _id: id, farmer: farmerId });
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Irrigation schedule not found or unauthorized access',
        });
      }

      const { title, scheduledDate, durationMinutes, method, waterSource, notes } = req.body;

      if (title) schedule.title = title.trim();
      if (scheduledDate) schedule.scheduledDate = new Date(scheduledDate);
      if (durationMinutes) {
        const d = Number(durationMinutes);
        if (d >= 1 && d <= 1440) schedule.durationMinutes = d;
      }
      if (method && IRRIGATION_METHODS.includes(method)) schedule.method = method;
      if (waterSource && WATER_SOURCES.includes(waterSource)) schedule.waterSource = waterSource;
      if (notes !== undefined) schedule.notes = notes.trim();

      await schedule.save();
      await schedule.populate('farm', '_id name location');
      await schedule.populate('crop', '_id name variety growthStage');

      res.status(200).json({
        success: true,
        message: 'Irrigation activity updated successfully',
        schedule,
      });
    } catch (err) {
      logger.error('Update Schedule Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to update irrigation schedule',
        error: err.message,
      });
    }
  },

  /**
   * PATCH /api/irrigation/schedules/:id/status
   * Transition schedule status (e.g. Mark Completed, Cancel, Skip)
   * If marking Completed with water volume, creates/links WaterUsage record
   */
  async updateScheduleStatus(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;
      const { status, completedAt, waterUsedLiters, waterVolume, waterUnit = 'Liters', notes } = req.body;

      if (!status || !SCHEDULE_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${SCHEDULE_STATUSES.join(', ')}`,
        });
      }

      const schedule = await IrrigationSchedule.findOne({ _id: id, farmer: farmerId });
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Irrigation activity not found or unauthorized',
        });
      }

      schedule.status = status;

      if (status === 'Completed') {
        schedule.completedAt = completedAt ? new Date(completedAt) : new Date();

        const rawVol = Number(waterVolume !== undefined ? waterVolume : waterUsedLiters);
        if (!isNaN(rawVol) && rawVol > 0) {
          const unit = WATER_UNITS.includes(waterUnit) ? waterUnit : 'Liters';
          const liters = normalizeToLiters(rawVol, unit);

          schedule.waterVolume = rawVol;
          schedule.waterUnit = unit;
          schedule.waterUsedLiters = liters;

          // Automatically record WaterUsage record for tracking
          const usage = new WaterUsage({
            farmer: farmerId,
            farm: schedule.farm,
            crop: schedule.crop,
            schedule: schedule._id,
            volume: rawVol,
            unit,
            volumeLiters: liters,
            date: schedule.completedAt,
            durationMinutes: schedule.durationMinutes,
            waterSource: schedule.waterSource,
            notes: notes?.trim() || `Recorded from completed irrigation: ${schedule.title}`,
          });
          await usage.save();
        }
      }

      if (notes !== undefined) schedule.notes = notes.trim();

      await schedule.save();
      await schedule.populate('farm', '_id name location');
      await schedule.populate('crop', '_id name variety growthStage');

      logger.info(`Schedule ${schedule._id} status updated to: ${status}`);

      res.status(200).json({
        success: true,
        message: `Irrigation activity status updated to ${status}`,
        schedule,
      });
    } catch (err) {
      logger.error('Update Schedule Status Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to update schedule status',
        error: err.message,
      });
    }
  },

  /**
   * DELETE /api/irrigation/schedules/:id
   */
  async deleteSchedule(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { id } = req.params;

      const schedule = await IrrigationSchedule.findOneAndDelete({ _id: id, farmer: farmerId });
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Irrigation schedule not found or unauthorized',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Irrigation activity successfully deleted',
        deletedId: id,
      });
    } catch (err) {
      logger.error('Delete Schedule Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to delete irrigation schedule',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/irrigation/water-usage
   * List and aggregate water usage logs
   */
  async getWaterUsage(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId, cropId, startDate, endDate } = req.query;

      const query = { farmer: farmerId };
      if (farmId) query.farm = farmId;
      if (cropId) query.crop = cropId;

      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const records = await WaterUsage.find(query)
        .populate('farm', '_id name location')
        .populate('crop', '_id name variety')
        .sort({ date: -1 });

      const totalLiters = records.reduce((sum, r) => sum + (r.volumeLiters || 0), 0);

      // Group by date for Recharts visualization
      const dateMap = {};
      records.forEach((r) => {
        const dStr = new Date(r.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        if (!dateMap[dStr]) {
          dateMap[dStr] = {
            date: dStr,
            rawDate: r.date,
            liters: 0,
            durationMinutes: 0,
            sessionsCount: 0,
          };
        }
        dateMap[dStr].liters += Math.round(r.volumeLiters || 0);
        dateMap[dStr].durationMinutes += r.durationMinutes || 0;
        dateMap[dStr].sessionsCount++;
      });

      const chartPoints = Object.values(dateMap).sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

      res.status(200).json({
        success: true,
        totalLiters: Math.round(totalLiters),
        totalRecords: records.length,
        hasRecords: records.length > 0,
        chartPoints,
        records,
      });
    } catch (err) {
      logger.error('Get Water Usage Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve water usage logs',
        error: err.message,
      });
    }
  },

  /**
   * POST /api/irrigation/water-usage
   * Record a manual water usage log
   */
  async recordWaterUsage(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const {
        farmId,
        cropId = null,
        scheduleId = null,
        volume,
        unit = 'Liters',
        date,
        durationMinutes = 60,
        waterSource = 'Borewell / Tubewell',
        notes = '',
      } = req.body;

      if (!farmId || volume === undefined || volume === null) {
        return res.status(400).json({
          success: false,
          message: 'Farm parcel selection and water volume are required',
        });
      }

      const numVol = Number(volume);
      if (isNaN(numVol) || numVol <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Water volume must be a positive number greater than 0',
        });
      }

      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        return res.status(404).json({
          success: false,
          message: 'Target farm parcel not found or unauthorized access',
        });
      }

      if (cropId) {
        const crop = await Crop.findOne({ _id: cropId, owner: farmerId, farm: farmId });
        if (!crop) {
          return res.status(404).json({
            success: false,
            message: 'Target crop does not belong to this farm parcel',
          });
        }
      }

      const validUnit = WATER_UNITS.includes(unit) ? unit : 'Liters';
      const volumeLiters = normalizeToLiters(numVol, validUnit);

      const usage = new WaterUsage({
        farmer: farmerId,
        farm: farm._id,
        crop: cropId || null,
        schedule: scheduleId || null,
        volume: numVol,
        unit: validUnit,
        volumeLiters,
        date: date ? new Date(date) : new Date(),
        durationMinutes: Number(durationMinutes) || 60,
        waterSource: WATER_SOURCES.includes(waterSource) ? waterSource : 'Borewell / Tubewell',
        notes: notes?.trim() || '',
      });

      await usage.save();
      await usage.populate('farm', '_id name location');
      if (cropId) await usage.populate('crop', '_id name variety');

      logger.info(`Water usage recorded: ${numVol} ${validUnit} (${volumeLiters} L) for farm ${farm.name}`);

      res.status(201).json({
        success: true,
        message: 'Water usage successfully logged',
        record: usage,
      });
    } catch (err) {
      logger.error('Record Water Usage Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to record water usage log',
        error: err.message,
      });
    }
  },

  /**
   * GET /api/irrigation/advisory/:farmId
   * Retrieve live weather and soil-based irrigation advisory
   */
  async getAdvisory(req, res) {
    try {
      const farmerId = req.user._id || req.user.id;
      const { farmId } = req.params;
      const { cropId } = req.query;

      const farm = await Farm.findOne({ _id: farmId, owner: farmerId });
      if (!farm) {
        return res.status(404).json({
          success: false,
          message: 'Farm parcel not found or unauthorized access',
        });
      }

      let crop = null;
      if (cropId) {
        crop = await Crop.findOne({ _id: cropId, owner: farmerId, farm: farmId });
      } else {
        crop = await Crop.findOne({ farm: farmId, owner: farmerId, status: 'Active' });
      }

      let weatherData = null;
      if (farm.coordinates?.latitude && farm.coordinates?.longitude) {
        try {
          weatherData = await getAgriculturalWeather(farm.coordinates.latitude, farm.coordinates.longitude, farm);
        } catch (wErr) {
          logger.warn(`Weather fetch warning for farm ${farmId}:`, wErr.message);
        }
      }

      const soilRecord = await SoilAnalysis.findOne({ farm: farmId, farmer: farmerId }).sort({ sampleDate: -1 });

      const advisory = generateIrrigationAdvisory({
        farm,
        crop,
        weatherData,
        soilRecord,
      });

      res.status(200).json({
        success: true,
        farm: {
          id: farm._id,
          name: farm.name,
          location: farm.location,
          soilType: farm.soilType,
          coordinates: farm.coordinates,
        },
        advisory,
      });
    } catch (err) {
      logger.error('Get Advisory Error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to generate irrigation advisory',
        error: err.message,
      });
    }
  },
};
