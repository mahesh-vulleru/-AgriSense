import mongoose from 'mongoose';
import Farm from '../models/Farm.js';
import { getAgriculturalWeather } from '../services/weatherService.js';
import { logger } from '../utils/logger.js';

/**
 * Get comprehensive agricultural weather advisory for a specific farm
 * GET /api/weather/farm/:farmId
 */
export const getFarmWeather = async (req, res, next) => {
  try {
    const { farmId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(farmId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Farm ID format provided.',
      });
    }

    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm parcel not found.',
      });
    }

    // IDOR Protection: Validate authenticated user owns the farm or is admin
    const isOwner = farm.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      logger.warn(
        `Unauthorized weather request for farm ${farmId} by user ${req.user._id} (${req.user.email})`
      );
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view weather for this farm.',
      });
    }

    // Verify whether valid coordinates exist on the farm document
    const lat = farm.coordinates?.latitude;
    const lon = farm.coordinates?.longitude;

    if (lat === null || lat === undefined || lon === null || lon === undefined || isNaN(lat) || isNaN(lon)) {
      return res.status(200).json({
        success: false,
        code: 'COORDINATES_MISSING',
        message: `Coordinates are missing for "${farm.name}". Please provide latitude and longitude to fetch localized meteorological advisory.`,
        farm: {
          id: farm._id,
          name: farm.name,
          location: farm.location,
          district: farm.district,
          state: farm.state,
          village: farm.village,
          pincode: farm.pincode,
          acreage: farm.acreage,
          soilType: farm.soilType,
          mainCrops: farm.mainCrops,
          coordinates: farm.coordinates || { latitude: null, longitude: null },
        },
      });
    }

    const weatherData = await getAgriculturalWeather(lat, lon, farm);

    return res.status(200).json({
      success: true,
      weather: weatherData,
    });
  } catch (error) {
    logger.error(`Error fetching farm weather: ${error.message}`);
    next(error);
  }
};

/**
 * Get weather advisory by direct coordinates (lat, lon)
 * GET /api/weather/coordinates?lat=...&lon=...
 */
export const getWeatherByCoordinates = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude (lat) and Longitude (lon) query parameters are required.',
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate values: latitude must be [-90, 90] and longitude [-180, 180].',
      });
    }

    const weatherData = await getAgriculturalWeather(latitude, longitude);

    return res.status(200).json({
      success: true,
      weather: weatherData,
    });
  } catch (error) {
    logger.error(`Error fetching coordinate weather: ${error.message}`);
    next(error);
  }
};

/**
 * Update a farm's coordinates directly from the weather advisory module
 * PATCH /api/weather/farm/:farmId/coordinates
 */
export const updateFarmCoordinates = async (req, res, next) => {
  try {
    const { farmId } = req.params;
    const { latitude, longitude } = req.body;

    if (!mongoose.Types.ObjectId.isValid(farmId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Farm ID format provided.',
      });
    }

    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm parcel not found.',
      });
    }

    // IDOR Protection: Must be farm owner or admin
    const isOwner = farm.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to update this farm.',
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates: latitude must be between -90 and 90, and longitude between -180 and 180.',
      });
    }

    farm.coordinates = {
      latitude: lat,
      longitude: lon,
    };

    await farm.save();

    logger.info(`Farm ${farm._id} coordinates updated to [${lat}, ${lon}] by user ${req.user._id}`);

    // Attempt to fetch live weather immediately with the updated coordinates
    let weatherData = null;
    let weatherError = null;
    try {
      weatherData = await getAgriculturalWeather(lat, lon, farm);
    } catch (err) {
      logger.warn(`Could not fetch live weather immediately after saving coordinates: ${err.message}`);
      weatherError = {
        code: err.code || 'WEATHER_FETCH_FAILED',
        message: err.message,
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Farm coordinates updated successfully.',
      farm: {
        id: farm._id,
        name: farm.name,
        location: farm.location,
        hasCoordinates: true,
        coordinates: farm.coordinates,
      },
      weather: weatherData,
      weatherError,
    });
  } catch (error) {
    logger.error('Error updating farm coordinates:', error);
    next(error);
  }
};

/**
 * Get summary of all farmer-owned farms with coordinate availability
 * GET /api/weather/farms-summary
 */
export const getFarmerFarmsWeatherSummary = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
    filter.status = { $ne: 'Archived' };

    const farms = await Farm.find(filter)
      .select('name location district state coordinates acreage status mainCrops')
      .sort({ createdAt: -1 });

    const formattedFarms = farms.map((f) => {
      const hasCoords =
        f.coordinates?.latitude !== null &&
        f.coordinates?.latitude !== undefined &&
        f.coordinates?.longitude !== null &&
        f.coordinates?.longitude !== undefined;

      return {
        id: f._id,
        name: f.name,
        location: f.location,
        district: f.district,
        state: f.state,
        acreage: f.acreage,
        hasCoordinates: hasCoords,
        coordinates: f.coordinates,
        mainCrops: f.mainCrops,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedFarms.length,
      farms: formattedFarms,
    });
  } catch (error) {
    logger.error('Error fetching farms weather summary:', error);
    next(error);
  }
};

export default {
  getFarmWeather,
  getWeatherByCoordinates,
  updateFarmCoordinates,
  getFarmerFarmsWeatherSummary,
};
