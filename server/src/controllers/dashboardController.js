import mongoose from 'mongoose';
import Farm from '../models/Farm.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieve farmer dashboard aggregated metrics and recent activity
 * GET /api/dashboard/farmer
 */
export const getFarmerDashboardStats = async (req, res, next) => {
  try {
    const farmerId = req.user._id;
    logger.info(`Fetching dashboard statistics for farmer: ${req.user.email} (${farmerId})`);

    // Fetch all farms owned by this farmer
    const farms = await Farm.find({ owner: farmerId })
      .sort({ createdAt: -1 })
      .select('name location state district village acreage soilType irrigationType mainCrops status createdAt');

    // Aggregate statistics
    const totalFarms = farms.length;
    const activeFarms = farms.filter((f) => f.status === 'Active').length;
    const inactiveFarms = farms.filter((f) => f.status === 'Inactive').length;
    const archivedFarms = farms.filter((f) => f.status === 'Archived').length;

    // Calculate total cultivated acreage across active farms
    const rawTotalAcreage = farms
      .filter((f) => f.status === 'Active')
      .reduce((sum, f) => sum + (Number(f.acreage) || 0), 0);
    const totalCultivatedAcreage = Math.round(rawTotalAcreage * 10) / 10;

    // Extract unique active crops across the farmer's active holdings
    const activeCropsSet = new Set();
    farms
      .filter((f) => f.status === 'Active')
      .forEach((f) => {
        if (Array.isArray(f.mainCrops)) {
          f.mainCrops.forEach((c) => {
            if (c && typeof c === 'string' && c.trim()) {
              activeCropsSet.add(c.trim());
            }
          });
        }
      });
    const uniqueCrops = Array.from(activeCropsSet);
    const activeCropsCount = uniqueCrops.length;

    // Soil type distribution
    const soilBreakdown = {};
    farms
      .filter((f) => f.status === 'Active')
      .forEach((f) => {
        const soil = f.soilType || 'Other';
        soilBreakdown[soil] = (soilBreakdown[soil] || 0) + 1;
      });

    // Irrigation type distribution
    const irrigationBreakdown = {};
    farms
      .filter((f) => f.status === 'Active')
      .forEach((f) => {
        const irrigation = f.irrigationType || 'Other';
        irrigationBreakdown[irrigation] = (irrigationBreakdown[irrigation] || 0) + 1;
      });

    // Check dynamically if Notification model exists
    let pendingNotifications = 0;
    if (mongoose.models.Notification) {
      pendingNotifications = await mongoose.models.Notification.countDocuments({
        recipient: farmerId,
        read: false,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        farmer: {
          id: req.user._id,
          name: req.user.name,
          fullName: req.user.fullName || req.user.name,
          email: req.user.email,
          location: req.user.location || '',
          role: req.user.role,
        },
        statistics: {
          totalFarms,
          activeFarms,
          inactiveFarms,
          archivedFarms,
          totalCultivatedAcreage,
          activeCropsCount,
          uniqueCrops,
          pendingNotifications,
          soilBreakdown,
          irrigationBreakdown,
        },
        farms,
        recentFarms: farms.slice(0, 5),
        sensorStatus: {
          connected: false,
          message: 'Sensor data unavailable – connect a device to view live readings.',
        },
      },
    });
  } catch (error) {
    logger.error(`Error in getFarmerDashboardStats: ${error.message}`);
    next(error);
  }
};
