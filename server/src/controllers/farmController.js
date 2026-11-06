import Farm from '../models/Farm.js';
import { validateFarmInput } from '../utils/farmValidators.js';

/**
 * Register a new farm
 * POST /api/farms
 */
export const createFarm = async (req, res, next) => {
  try {
    const { isValid, errors } = validateFarmInput(req.body, false);
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError,
        errors,
      });
    }

    const {
      name,
      location,
      state,
      district,
      village,
      pincode,
      coordinates,
      acreage,
      soilType,
      irrigationType,
      mainCrops,
      description,
      status,
    } = req.body;

    // Normalize mainCrops array if passed as comma-separated string or array
    let cropsArray = [];
    if (Array.isArray(mainCrops)) {
      cropsArray = mainCrops.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof mainCrops === 'string' && mainCrops.trim().length > 0) {
      cropsArray = mainCrops.split(',').map((c) => c.trim()).filter(Boolean);
    }

    const farm = await Farm.create({
      owner: req.user._id,
      name: name.trim(),
      location: location.trim(),
      state: (state || '').trim(),
      district: (district || '').trim(),
      village: (village || '').trim(),
      pincode: (pincode || '').trim(),
      coordinates: {
        latitude: coordinates?.latitude ? Number(coordinates.latitude) : null,
        longitude: coordinates?.longitude ? Number(coordinates.longitude) : null,
      },
      acreage: Number(acreage),
      soilType: soilType || 'Loamy',
      irrigationType: irrigationType || 'Drip',
      mainCrops: cropsArray,
      description: (description || '').trim(),
      status: status || 'Active',
    });

    return res.status(201).json({
      success: true,
      message: 'Farm created successfully.',
      farm,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all farms for the authenticated user with search, filtering, and summary metrics
 * GET /api/farms
 */
export const getFarms = async (req, res, next) => {
  try {
    const {
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
      all = 'false',
    } = req.query;

    // Filter by user owner (Admins can view all with all=true)
    const query = {};
    if (req.user.role === 'admin' && all === 'true') {
      // Admin global view
    } else {
      query.owner = req.user._id;
    }

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search filter across name, location, district, state, village, crops
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { location: searchRegex },
        { district: searchRegex },
        { state: searchRegex },
        { village: searchRegex },
        { mainCrops: { $in: [searchRegex] } },
      ];
    }

    // Sort setup
    const allowedSortFields = ['name', 'acreage', 'createdAt', 'status'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = String(sortOrder).toLowerCase() === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortDirection };

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Query farms
    const [farms, totalCount] = await Promise.all([
      Farm.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate('owner', 'name email role'),
      Farm.countDocuments(query),
    ]);

    // Calculate user-level summary stats (independent of search filter for consistent KPI banners)
    const userSummaryMatch = { owner: req.user._id };
    const allUserFarms = await Farm.find(userSummaryMatch).select('acreage status');

    const totalFarms = allUserFarms.length;
    const activeFarms = allUserFarms.filter((f) => f.status === 'Active').length;
    const rawTotalAcreage = allUserFarms
      .filter((f) => f.status !== 'Archived')
      .reduce((sum, f) => sum + (Number(f.acreage) || 0), 0);
    const totalAcreage = Math.round(rawTotalAcreage * 10) / 10;

    return res.status(200).json({
      success: true,
      farms,
      summary: {
        totalFarms,
        activeFarms,
        inactiveFarms: allUserFarms.filter((f) => f.status === 'Inactive').length,
        archivedFarms: allUserFarms.filter((f) => f.status === 'Archived').length,
        totalAcreage,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed farm information by ID with IDOR protection
 * GET /api/farms/:id
 */
export const getFarmById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const farm = await Farm.findById(id).populate('owner', 'name email role');
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    // IDOR protection: Farmer can only access their own farm
    const isOwner = farm.owner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this farm.',
      });
    }

    return res.status(200).json({
      success: true,
      farm,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing farm
 * PUT /api/farms/:id
 */
export const updateFarm = async (req, res, next) => {
  try {
    const { id } = req.params;

    const farm = await Farm.findById(id);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    // IDOR protection: Farmer can only update their own farm
    const isOwner = farm.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to edit this farm.',
      });
    }

    // Validate update inputs
    const { isValid, errors } = validateFarmInput(req.body, true);
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      return res.status(400).json({
        success: false,
        message: firstError,
        errors,
      });
    }

    const {
      name,
      location,
      state,
      district,
      village,
      pincode,
      coordinates,
      acreage,
      soilType,
      irrigationType,
      mainCrops,
      description,
      status,
    } = req.body;

    if (name !== undefined) farm.name = name.trim();
    if (location !== undefined) farm.location = location.trim();
    if (state !== undefined) farm.state = state.trim();
    if (district !== undefined) farm.district = district.trim();
    if (village !== undefined) farm.village = village.trim();
    if (pincode !== undefined) farm.pincode = pincode.trim();
    if (acreage !== undefined) farm.acreage = Number(acreage);
    if (soilType !== undefined) farm.soilType = soilType;
    if (irrigationType !== undefined) farm.irrigationType = irrigationType;
    if (description !== undefined) farm.description = description.trim();
    if (status !== undefined) farm.status = status;

    if (coordinates && typeof coordinates === 'object') {
      farm.coordinates = {
        latitude:
          coordinates.latitude !== undefined && coordinates.latitude !== null && coordinates.latitude !== ''
            ? Number(coordinates.latitude)
            : farm.coordinates?.latitude || null,
        longitude:
          coordinates.longitude !== undefined && coordinates.longitude !== null && coordinates.longitude !== ''
            ? Number(coordinates.longitude)
            : farm.coordinates?.longitude || null,
      };
    }

    if (mainCrops !== undefined) {
      if (Array.isArray(mainCrops)) {
        farm.mainCrops = mainCrops.map((c) => String(c).trim()).filter(Boolean);
      } else if (typeof mainCrops === 'string') {
        farm.mainCrops = mainCrops.split(',').map((c) => c.trim()).filter(Boolean);
      }
    }

    await farm.save();

    return res.status(200).json({
      success: true,
      message: 'Farm updated successfully.',
      farm,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive or restore a farm (soft delete)
 * PATCH /api/farms/:id/archive
 */
export const archiveFarm = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { restore } = req.body || {};

    const farm = await Farm.findById(id);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'Farm not found.',
      });
    }

    // IDOR protection
    const isOwner = farm.owner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to archive this farm.',
      });
    }

    if (restore || farm.status === 'Archived') {
      farm.status = 'Active';
      await farm.save();
      return res.status(200).json({
        success: true,
        message: 'Farm restored successfully to Active status.',
        farm,
      });
    }

    farm.status = 'Archived';
    await farm.save();

    return res.status(200).json({
      success: true,
      message: 'Farm archived successfully.',
      farm,
    });
  } catch (error) {
    next(error);
  }
};

