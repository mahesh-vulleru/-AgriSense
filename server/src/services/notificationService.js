import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import Farm from '../models/Farm.js';
import Crop from '../models/Crop.js';
import IrrigationSchedule from '../models/IrrigationSchedule.js';
import SoilAnalysis from '../models/SoilAnalysis.js';
import DiseaseScan from '../models/DiseaseScan.js';
import { getAgriculturalWeather } from './weatherService.js';
import { sendNotificationToFarmer, sendUnreadCountToFarmer } from '../socket/socket.js';
import { logger } from '../utils/logger.js';

/**
 * Get or initialize notification preferences for a farmer
 * @param {string} farmerId
 */
export const getPreferences = async (farmerId) => {
  let prefs = await NotificationPreference.findOne({ farmer: farmerId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ farmer: farmerId });
  }
  return prefs;
};

/**
 * Update notification preferences for a farmer
 * @param {string} farmerId
 * @param {object} updates
 */
export const updatePreferences = async (farmerId, updates) => {
  const allowedFields = [
    'weatherAlerts',
    'cropAlerts',
    'soilAlerts',
    'irrigationAlerts',
    'diseaseAlerts',
    'systemAlerts',
    'criticalOnly',
  ];

  const filteredUpdates = {};
  for (const field of allowedFields) {
    if (typeof updates[field] === 'boolean') {
      filteredUpdates[field] = updates[field];
    }
  }

  const prefs = await NotificationPreference.findOneAndUpdate(
    { farmer: farmerId },
    { $set: filteredUpdates },
    { new: true, upsert: true, runValidators: true }
  );

  return prefs;
};

/**
 * Check whether a notification should be delivered based on farmer preferences
 * @param {object} prefs
 * @param {string} category
 * @param {string} severity
 */
const shouldDeliverNotification = (prefs, category, severity) => {
  if (!prefs) return true;

  // Critical alerts always bypass preference suppression unless explicitly configured
  if (severity === 'critical') {
    return true;
  }

  // If user requested only critical alerts, suppress all non-critical
  if (prefs.criticalOnly && severity !== 'critical') {
    return false;
  }

  // Check category preferences
  switch (category) {
    case 'weather':
      return prefs.weatherAlerts !== false;
    case 'crop':
      return prefs.cropAlerts !== false;
    case 'soil':
      return prefs.soilAlerts !== false;
    case 'irrigation':
      return prefs.irrigationAlerts !== false;
    case 'disease':
      return prefs.diseaseAlerts !== false;
    case 'system':
      return prefs.systemAlerts !== false;
    default:
      return true;
  }
};

/**
 * Create a new notification with deduplication and real-time delivery
 * @param {object} params
 */
export const createNotification = async ({
  farmerId,
  title,
  message,
  category,
  severity = 'info',
  farm = null,
  crop = null,
  relatedId = null,
  relatedModel = null,
  actionUrl = '',
  actionLabel = '',
  dedupKey = null,
  metadata = {},
}) => {
  try {
    if (!farmerId || !title || !message || !category) {
      throw new Error('Missing required notification parameters (farmerId, title, message, category)');
    }

    // 1. Check Preferences
    const prefs = await getPreferences(farmerId);
    if (!shouldDeliverNotification(prefs, category, severity)) {
      logger.info(
        `[NOTIFICATIONS] Notification suppressed by farmer preferences: ${title} (${category}, ${severity})`
      );
      return null;
    }

    // 2. Check Deduplication Key (within 24 hours)
    if (dedupKey) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await Notification.findOne({
        farmer: farmerId,
        dedupKey,
        createdAt: { $gte: yesterday },
      });

      if (existing) {
        return existing;
      }
    }

    // 3. Persist Notification
    const notification = new Notification({
      farmer: farmerId,
      title,
      message,
      category,
      severity,
      farm: farm || null,
      crop: crop || null,
      relatedId: relatedId || null,
      relatedModel: relatedModel || null,
      actionUrl,
      actionLabel,
      dedupKey: dedupKey || null,
      metadata,
    });

    await notification.save();

    // 4. Populate references for real-time delivery
    const populated = await Notification.findById(notification._id)
      .populate('farm', 'name location boundaries')
      .populate('crop', 'cropName variety healthStatus growthStage');

    // 5. Emit real-time WebSocket events
    const unreadCount = await Notification.countDocuments({ farmer: farmerId, isRead: false });
    sendNotificationToFarmer(farmerId, populated.toJSON());
    sendUnreadCountToFarmer(farmerId, unreadCount);

    return populated;
  } catch (err) {
    logger.error(`[NOTIFICATIONS] Failed to create notification: ${err.message}`);
    throw err;
  }
};

/**
 * Retrieve notifications with filters, pagination, and KPI summary
 * @param {string} farmerId
 * @param {object} query
 */
export const getNotifications = async (farmerId, query = {}) => {
  const {
    status = 'all',
    category,
    severity,
    farmId,
    cropId,
    search,
    page = 1,
    limit = 20,
  } = query;

  const filter = { farmer: farmerId };

  // Status Filter
  if (status === 'unread') {
    filter.isRead = false;
  } else if (status === 'read') {
    filter.isRead = true;
  } else if (status === 'critical') {
    filter.severity = 'critical';
  }

  // Category Filter
  if (category && category !== 'all') {
    filter.category = category;
  }

  // Severity Filter
  if (severity && severity !== 'all') {
    filter.severity = severity;
  }

  // Farm & Crop Filter
  if (farmId && farmId !== 'all') {
    filter.farm = farmId;
  }
  if (cropId && cropId !== 'all') {
    filter.crop = cropId;
  }

  // Text search
  if (search && search.trim()) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { message: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, totalFiltered, totalAll, unreadCount, readCount, criticalCount] =
    await Promise.all([
      Notification.find(filter)
        .populate('farm', 'name location boundaries')
        .populate('crop', 'cropName variety healthStatus growthStage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean({ virtuals: true }),
      Notification.countDocuments(filter),
      Notification.countDocuments({ farmer: farmerId }),
      Notification.countDocuments({ farmer: farmerId, isRead: false }),
      Notification.countDocuments({ farmer: farmerId, isRead: true }),
      Notification.countDocuments({ farmer: farmerId, severity: 'critical' }),
    ]);

  // Aggregate Category Distribution
  const categoryCounts = await Notification.aggregate([
    { $match: { farmer: Notification.base.Types.ObjectId.createFromHexString(String(farmerId)) } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);

  const byCategory = {
    weather: 0,
    crop: 0,
    soil: 0,
    irrigation: 0,
    disease: 0,
    system: 0,
  };

  categoryCounts.forEach((c) => {
    if (byCategory[c._id] !== undefined) {
      byCategory[c._id] = c.count;
    }
  });

  return {
    notifications,
    pagination: {
      total: totalFiltered,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalFiltered / limitNum) || 1,
    },
    summary: {
      total: totalAll,
      unread: unreadCount,
      read: readCount,
      critical: criticalCount,
      byCategory,
    },
  };
};

/**
 * Get total unread count for farmer badge
 * @param {string} farmerId
 */
export const getUnreadCount = async (farmerId) => {
  return await Notification.countDocuments({ farmer: farmerId, isRead: false });
};

/**
 * Mark a single notification as read
 * @param {string} notificationId
 * @param {string} farmerId
 */
export const markAsRead = async (notificationId, farmerId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, farmer: farmerId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  )
    .populate('farm', 'name location')
    .populate('crop', 'cropName variety');

  if (notification) {
    const unreadCount = await getUnreadCount(farmerId);
    sendUnreadCountToFarmer(farmerId, unreadCount);
  }

  return notification;
};

/**
 * Mark all notifications (or all in a category) as read
 * @param {string} farmerId
 * @param {string} category
 */
export const markAllAsRead = async (farmerId, category = null) => {
  const filter = { farmer: farmerId, isRead: false };
  if (category && category !== 'all') {
    filter.category = category;
  }

  const result = await Notification.updateMany(filter, {
    $set: { isRead: true, readAt: new Date() },
  });

  const unreadCount = await getUnreadCount(farmerId);
  sendUnreadCountToFarmer(farmerId, unreadCount);

  return { modifiedCount: result.modifiedCount, unreadCount };
};

/**
 * Delete a single notification
 * @param {string} notificationId
 * @param {string} farmerId
 */
export const deleteNotification = async (notificationId, farmerId) => {
  const deleted = await Notification.findOneAndDelete({
    _id: notificationId,
    farmer: farmerId,
  });

  if (deleted) {
    const unreadCount = await getUnreadCount(farmerId);
    sendUnreadCountToFarmer(farmerId, unreadCount);
  }

  return deleted;
};

/**
 * Clear all read notifications
 * @param {string} farmerId
 */
export const clearAllRead = async (farmerId) => {
  const result = await Notification.deleteMany({
    farmer: farmerId,
    isRead: true,
  });

  const unreadCount = await getUnreadCount(farmerId);
  sendUnreadCountToFarmer(farmerId, unreadCount);

  return { deletedCount: result.deletedCount };
};

/**
 * Scan actual database records for this farmer and trigger real-time notifications
 * Handles Smart Irrigation, Crop Health, Soil Health, AI Disease Scans, and Weather Advisories.
 * Uses deterministic deduplication keys so no duplicate notifications are generated.
 * @param {string} farmerId
 */
export const syncFarmerAlerts = async (farmerId) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const createdNotifications = [];

  // 1. SMART IRRIGATION ALERTS
  try {
    const schedules = await IrrigationSchedule.find({
      farmer: farmerId,
      status: { $in: ['Scheduled', 'In Progress'] },
    }).populate('farm', 'name').populate('crop', 'cropName variety');

    for (const sched of schedules) {
      const schedTime = new Date(sched.scheduledDate);
      const isOverdue = schedTime < now;
      const isUpcoming = !isOverdue && (schedTime.getTime() - now.getTime()) <= 24 * 60 * 60 * 1000;

      if (isOverdue) {
        const notif = await createNotification({
          farmerId,
          title: `Overdue Irrigation: ${sched.title}`,
          message: `The scheduled irrigation session for ${sched.crop?.cropName || sched.crop?.name || 'crop'} at ${sched.farm?.name || 'farm'} was scheduled for ${schedTime.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} and is currently overdue. Please execute or update the schedule.`,
          category: 'irrigation',
          severity: 'warning',
          farm: sched.farm?._id,
          crop: sched.crop?._id,
          relatedId: sched._id,
          relatedModel: 'IrrigationSchedule',
          actionUrl: '/dashboard/irrigation',
          actionLabel: 'View Irrigation Plan',
          dedupKey: `irrigation_overdue_${sched._id}_${todayStr}`,
        });
        if (notif) createdNotifications.push(notif);
      } else if (isUpcoming) {
        const notif = await createNotification({
          farmerId,
          title: `Upcoming Irrigation: ${sched.title}`,
          message: `Irrigation session scheduled for ${sched.crop?.cropName || sched.crop?.name || 'crop'} at ${sched.farm?.name || 'farm'} today at ${schedTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} (${sched.waterVolumeLiters || 1500} Liters planned).`,
          category: 'irrigation',
          severity: 'info',
          farm: sched.farm?._id,
          crop: sched.crop?._id,
          relatedId: sched._id,
          relatedModel: 'IrrigationSchedule',
          actionUrl: '/dashboard/irrigation',
          actionLabel: 'View Schedule',
          dedupKey: `irrigation_upcoming_${sched._id}_${todayStr}`,
        });
        if (notif) createdNotifications.push(notif);
      }
    }
  } catch (err) {
    logger.warn(`[SYNC] Irrigation alerts sync error: ${err.message}`);
  }

  // 2. CROP HEALTH & MONITORING ALERTS
  try {
    const crops = await Crop.find({
      $or: [{ farmer: farmerId }, { owner: farmerId }],
      status: 'Active',
      healthStatus: { $in: ['Critical', 'At Risk'] },
    }).populate('farm', 'name');

    for (const crop of crops) {
      const isCritical = crop.healthStatus === 'Critical';
      const cropTitle = crop.cropName || crop.name || 'Crop Parcel';
      const notif = await createNotification({
        farmerId,
        title: isCritical
          ? `CRITICAL ALERT: Severe Crop Stress on ${cropTitle}`
          : `Crop Health Warning: ${cropTitle} (${crop.variety || 'Variety'})`,
        message: isCritical
          ? `Crop parcel ${cropTitle} at ${crop.farm?.name || 'farm'} is marked as CRITICAL condition during recent telemetry assessments. Immediate agronomic inspection required.`
          : `Crop ${cropTitle} at ${crop.farm?.name || 'farm'} shows health status "${crop.healthStatus}". Check soil moisture, nutrient balance, and pest pressure.`,
        category: 'crop',
        severity: isCritical ? 'critical' : 'warning',
        farm: crop.farm?._id,
        crop: crop._id,
        relatedId: crop._id,
        relatedModel: 'Crop',
        actionUrl: `/dashboard/crops/${crop._id}`,
        actionLabel: 'Inspect Crop Health',
        dedupKey: `crop_health_${crop._id}_${crop.healthStatus}_${todayStr}`,
      });
      if (notif) createdNotifications.push(notif);
    }
  } catch (err) {
    logger.warn(`[SYNC] Crop health alerts sync error: ${err.message}`);
  }

  // 3. SOIL ANALYSIS HEALTH ADVISORIES
  try {
    const soilTests = await SoilAnalysis.find({ farmer: farmerId })
      .populate('farm', 'name')
      .sort({ sampleDate: -1 })
      .limit(10);

    for (const soil of soilTests) {
      const ph = soil.pH?.value;
      if (typeof ph === 'number') {
        if (ph < 5.8) {
          const notif = await createNotification({
            farmerId,
            title: `Soil Acidity Warning: ${soil.farm?.name || 'Farm Parcel'}`,
            message: `Recent soil analysis recorded an acidic pH of ${ph.toFixed(1)}. Agricultural lime or dolomite application is recommended to restore optimal root nutrient uptake.`,
            category: 'soil',
            severity: ph < 5.2 ? 'critical' : 'warning',
            farm: soil.farm?._id,
            relatedId: soil._id,
            relatedModel: 'SoilAnalysis',
            actionUrl: '/dashboard/soil-analysis',
            actionLabel: 'Review Soil Test',
            dedupKey: `soil_ph_low_${soil._id}`,
          });
          if (notif) createdNotifications.push(notif);
        } else if (ph > 8.0) {
          const notif = await createNotification({
            farmerId,
            title: `Alkaline Soil Warning: ${soil.farm?.name || 'Farm Parcel'}`,
            message: `Recent soil analysis recorded an alkaline pH of ${ph.toFixed(1)}. Gypsum application and organic matter incorporation recommended.`,
            category: 'soil',
            severity: 'warning',
            farm: soil.farm?._id,
            relatedId: soil._id,
            relatedModel: 'SoilAnalysis',
            actionUrl: '/dashboard/soil-analysis',
            actionLabel: 'Review Soil Test',
            dedupKey: `soil_ph_high_${soil._id}`,
          });
          if (notif) createdNotifications.push(notif);
        }
      }

      // Check Nitrogen Deficiency
      if (soil.nitrogen?.status === 'Deficient' || (typeof soil.nitrogen?.value === 'number' && soil.nitrogen.value < 200)) {
        const notif = await createNotification({
          farmerId,
          title: `Nitrogen Deficiency Alert: ${soil.farm?.name || 'Farm Parcel'}`,
          message: `Soil sample indicates deficient Nitrogen levels (${soil.nitrogen?.value || 0} kg/ha). Top dressing with urea or neem-coated nitrogen recommended.`,
          category: 'soil',
          severity: 'warning',
          farm: soil.farm?._id,
          relatedId: soil._id,
          relatedModel: 'SoilAnalysis',
          actionUrl: '/dashboard/soil-analysis',
          actionLabel: 'View Soil Recommendations',
          dedupKey: `soil_n_def_${soil._id}`,
        });
        if (notif) createdNotifications.push(notif);
      }
    }
  } catch (err) {
    logger.warn(`[SYNC] Soil health alerts sync error: ${err.message}`);
  }

  // 4. AI DISEASE DETECTION ALERTS
  try {
    const scans = await DiseaseScan.find({
      farmer: farmerId,
      status: { $in: ['Diseased', 'Pest Damage', 'Nutrient Deficiency'] },
    })
      .populate('farm', 'name')
      .populate('crop', 'cropName variety')
      .sort({ scanTimestamp: -1 })
      .limit(10);

    for (const scan of scans) {
      const isSevere = scan.status === 'Diseased';
      const diseaseName = scan.possibleDisease || scan.status;
      const cropName = scan.crop?.cropName || scan.crop?.name || 'Crop Parcel';
      const actionRecommendation = scan.suggestedActions?.[0] || 'Inspect crop foliage immediately.';
      const notif = await createNotification({
        farmerId,
        title: isSevere
          ? `Pathogen Alert: ${diseaseName} on ${cropName}`
          : `Crop Damage Detected: ${scan.status} on ${cropName}`,
        message: `Multimodal AI scan detected ${scan.status} (${diseaseName}) on ${cropName} at ${scan.farm?.name || 'farm'}. Recommended Action: ${actionRecommendation}`,
        category: 'disease',
        severity: isSevere ? 'critical' : 'warning',
        farm: scan.farm?._id,
        crop: scan.crop?._id,
        relatedId: scan._id,
        relatedModel: 'DiseaseScan',
        actionUrl: '/dashboard/disease-detection',
        actionLabel: 'Inspect Diagnosis',
        dedupKey: `disease_scan_${scan._id}`,
      });
      if (notif) createdNotifications.push(notif);
    }
  } catch (err) {
    logger.warn(`[SYNC] Disease scan alerts sync error: ${err.message}`);
  }

  // 5. WEATHER ADVISORIES (Check farm coordinates)
  try {
    const farms = await Farm.find({
      $or: [{ owner: farmerId }, { farmer: farmerId }],
      'coordinates.latitude': { $exists: true, $ne: null },
      'coordinates.longitude': { $exists: true, $ne: null },
    }).limit(5);

    for (const farm of farms) {
      try {
        const weather = await getAgriculturalWeather(
          farm.coordinates.latitude,
          farm.coordinates.longitude,
          farm
        );

        if (weather?.current) {
          const temp = weather.current.temp;
          const humidity = weather.current.humidity;

          // Extreme heat advisory
          if (temp >= 38) {
            const notif = await createNotification({
              farmerId,
              title: `Heatwave Advisory: ${temp.toFixed(1)}°C at ${farm.name}`,
              message: `High ambient temperature of ${temp.toFixed(1)}°C recorded for ${farm.name}. Evapotranspiration is elevated; schedule supplemental irrigation during early morning or evening hours.`,
              category: 'weather',
              severity: 'warning',
              farm: farm._id,
              actionUrl: '/dashboard/weather',
              actionLabel: 'View Weather Advisory',
              dedupKey: `weather_heat_${farm._id}_${todayStr}`,
            });
            if (notif) createdNotifications.push(notif);
          }

          // High fungal infection risk advisory
          if (humidity >= 85) {
            const notif = await createNotification({
              farmerId,
              title: `High Fungal Risk Advisory: ${humidity}% Humidity at ${farm.name}`,
              message: `Sustained relative humidity of ${humidity}% increases vulnerability to fungal blights and powdery mildew. Monitor foliage closely and delay foliar pesticide spray.`,
              category: 'weather',
              severity: 'warning',
              farm: farm._id,
              actionUrl: '/dashboard/weather',
              actionLabel: 'View Microclimate Advisory',
              dedupKey: `weather_humidity_${farm._id}_${todayStr}`,
            });
            if (notif) createdNotifications.push(notif);
          }
        }
      } catch (wErr) {
        // Weather API error should not fail the overall sync
        logger.warn(`[SYNC] Weather fetch error for farm ${farm.name}: ${wErr.message}`);
      }
    }
  } catch (err) {
    logger.warn(`[SYNC] Weather advisories sync error: ${err.message}`);
  }

  return {
    syncedAt: new Date(),
    createdCount: createdNotifications.length,
    notifications: createdNotifications,
  };
};

export default {
  getPreferences,
  updatePreferences,
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
  syncFarmerAlerts,
};
