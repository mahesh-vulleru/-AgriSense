import mongoose from 'mongoose';
import Crop, { GROWTH_STAGES, CROP_STATUSES, CROP_CATEGORIES, CROP_SEASONS, IRRIGATION_METHODS } from '../models/Crop.js';
import Farm from '../models/Farm.js';

/**
 * Standard agronomic milestone generator based on planting date and harvest projection
 */
function generateDefaultMilestones(plantingDate, expectedHarvestDate, cropName) {
  if (!plantingDate) return [];

  const start = new Date(plantingDate);
  const end = expectedHarvestDate ? new Date(expectedHarvestDate) : null;
  const milestones = [];

  // 1. Sowing / Planting baseline milestone
  milestones.push({
    activity: `Planting & Initial Sowing - ${cropName}`,
    category: 'Stage',
    targetDate: start,
    completed: true,
    completedDate: start,
    notes: 'Crop planting registered in system',
  });

  // 2. First basal fertilization (approx 10-14 days after planting)
  const fertDate = new Date(start);
  fertDate.setDate(fertDate.getDate() + 12);
  milestones.push({
    activity: 'Basal Fertilizer Application & Nutrient Boost',
    category: 'Fertilization',
    targetDate: fertDate,
    completed: false,
    notes: 'Apply recommended NPK and organic soil enricher',
  });

  // 3. Early vegetative irrigation check (approx 20-25 days)
  const vegIrrigDate = new Date(start);
  vegIrrigDate.setDate(vegIrrigDate.getDate() + 22);
  milestones.push({
    activity: 'Vegetative Moisture & Soil Inspection',
    category: 'Irrigation',
    targetDate: vegIrrigDate,
    completed: false,
    notes: 'Inspect root moisture and calibrate irrigation lines',
  });

  if (end && end > start) {
    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

    // Mid-cycle pest management inspection (at 45% of cycle)
    const pestDate = new Date(start);
    pestDate.setDate(pestDate.getDate() + Math.round(totalDays * 0.45));
    milestones.push({
      activity: 'Integrated Pest Management (IPM) & Foliar Scan',
      category: 'Pest Management',
      targetDate: pestDate,
      completed: false,
      notes: 'Inspect leaves for early signs of blight, rust, or bollworm',
    });

    // Flowering / Grain Filling checkpoint (at 70% of cycle)
    const flowerDate = new Date(start);
    flowerDate.setDate(flowerDate.getDate() + Math.round(totalDays * 0.7));
    milestones.push({
      activity: 'Flowering & Grain Development Assessment',
      category: 'Stage',
      targetDate: flowerDate,
      completed: false,
      notes: 'Monitor bloom density and water availability during critical stage',
    });

    // Harvest readiness check (7 days before harvest)
    const preHarvestDate = new Date(end);
    preHarvestDate.setDate(preHarvestDate.getDate() - 7);
    if (preHarvestDate > start) {
      milestones.push({
        activity: 'Pre-Harvest Maturity & Moisture Inspection',
        category: 'Harvest',
        targetDate: preHarvestDate,
        completed: false,
        notes: 'Check seed hardness, husk color, and schedule equipment',
      });
    }

    // Target Harvest day
    milestones.push({
      activity: `Final Harvesting Window - ${cropName}`,
      category: 'Harvest',
      targetDate: end,
      completed: false,
      notes: 'Expected peak maturity for optimal grain/produce yield',
    });
  }

  return milestones;
}

/**
 * @desc    Get all crops owned by the authenticated farmer with filters and summary stats
 * @route   GET /api/crops
 * @access  Private (Farmer, Expert, Admin)
 */
export const getCrops = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      farmId,
      status,
      growthStage,
      category,
      season,
      search,
      sort = 'newest',
    } = req.query;

    const filter = { owner: userId };

    // Farm filter
    if (farmId && mongoose.Types.ObjectId.isValid(farmId)) {
      filter.farm = farmId;
    }

    // Status filter (default to non-archived unless explicitly specified)
    if (status && status !== 'all') {
      filter.status = status;
    } else if (!status) {
      filter.status = { $ne: 'Archived' };
    }

    // Growth stage filter
    if (growthStage && growthStage !== 'all') {
      filter.growthStage = growthStage;
    }

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Season filter
    if (season && season !== 'all') {
      filter.season = season;
    }

    // Search query on name, variety, notes
    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { variety: { $regex: q, $options: 'i' } },
        { notes: { $regex: q, $options: 'i' } },
      ];
    }

    // Sorting
    let sortQuery = { createdAt: -1 };
    if (sort === 'name-asc') {
      sortQuery = { name: 1 };
    } else if (sort === 'harvest-soonest') {
      sortQuery = { expectedHarvestDate: 1, createdAt: -1 };
    } else if (sort === 'area-desc') {
      sortQuery = { cultivatedArea: -1 };
    }

    const crops = await Crop.find(filter)
      .populate('farm', 'name location acreage totalAcreage soilType irrigationType status')
      .sort(sortQuery)
      .lean();

    // Calculate aggregated metrics for the authenticated farmer across non-archived crops
    const allFarmerCrops = await Crop.find({ owner: userId, status: { $ne: 'Archived' } })
      .populate('farm', 'name')
      .lean();

    const now = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(now.getDate() + 14);

    let activeCrops = 0;
    let harvestedCrops = 0;
    let nearingHarvest = 0;
    let totalCultivatedArea = 0;
    const varietiesSet = new Set();
    const farmMap = {};

    allFarmerCrops.forEach((c) => {
      if (c.status === 'Active') {
        activeCrops += 1;
        totalCultivatedArea += Number(c.cultivatedArea) || 0;

        if (c.expectedHarvestDate) {
          const hDate = new Date(c.expectedHarvestDate);
          if (hDate >= now && hDate <= twoWeeksFromNow) {
            nearingHarvest += 1;
          }
        }
      } else if (c.status === 'Harvested') {
        harvestedCrops += 1;
      }

      if (c.variety) {
        varietiesSet.add(c.variety);
      }

      const fName = c.farm?.name || 'Unassigned';
      farmMap[fName] = (farmMap[fName] || 0) + 1;
    });

    const cropsByFarm = Object.entries(farmMap).map(([farmName, count]) => ({
      farmName,
      count,
    }));

    return res.status(200).json({
      success: true,
      crops: crops.map((c) => ({
        ...c,
        id: c._id.toString(),
      })),
      summary: {
        totalCrops: allFarmerCrops.length,
        activeCrops,
        harvestedCrops,
        nearingHarvest,
        totalCultivatedArea: Number(totalCultivatedArea.toFixed(2)),
        cropVarietiesCount: varietiesSet.size,
        cropsByFarm,
      },
      meta: {
        totalResults: crops.length,
        filterApplied: {
          farmId: farmId || null,
          status: status || null,
          growthStage: growthStage || null,
          category: category || null,
          season: season || null,
        },
      },
    });
  } catch (error) {
    console.error('[CROP_GET_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve crops',
      error: error.message,
    });
  }
};

/**
 * @desc    Get single crop by ID with full details, stage timeline and calendar
 * @route   GET /api/crops/:id
 * @access  Private (Farmer, Expert, Admin)
 */
export const getCropById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID format',
      });
    }

    const crop = await Crop.findById(id)
      .populate('farm', 'name location acreage totalAcreage soilType irrigationType status')
      .populate('stageHistory.recordedBy', 'name email');

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // Strict IDOR Protection: Farmer can only access their own crop records
    if (crop.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this crop record',
      });
    }

    return res.status(200).json({
      success: true,
      crop: crop.toJSON(),
    });
  } catch (error) {
    console.error('[CROP_GET_BY_ID_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve crop details',
      error: error.message,
    });
  }
};

/**
 * @desc    Create and register a new crop record
 * @route   POST /api/crops
 * @access  Private (Farmer, Expert, Admin)
 */
export const createCrop = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      farm: farmId,
      variety = '',
      category = 'Cereal',
      season = 'Kharif',
      irrigationMethod = 'Drip',
      cultivatedArea,
      plantingDate = null,
      expectedHarvestDate = null,
      expectedYieldPerAcre = null,
      yieldUnit = 'kg',
      growthStage = 'Land Preparation',
      notes = '',
    } = req.body;

    // 1. Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Crop name is required',
      });
    }

    if (!farmId || !mongoose.Types.ObjectId.isValid(farmId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid associated farm ID is required',
      });
    }

    const areaNum = Number(cultivatedArea);
    if (isNaN(areaNum) || areaNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cultivated area must be a positive number greater than 0',
      });
    }

    // 2. Validate Farm ownership and active status (IDOR protection)
    const farm = await Farm.findById(farmId);
    if (!farm) {
      return res.status(404).json({
        success: false,
        message: 'The selected farm does not exist',
      });
    }

    if (farm.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot register crops on a farm you do not own',
      });
    }

    if (farm.status === 'Archived') {
      return res.status(400).json({
        success: false,
        message: 'Cannot plant crops on an archived farm parcel',
      });
    }

    // 3. Agronomic sanity check: cultivated area should not exceed farm acreage
    const farmAcreage = farm.acreage ?? farm.totalAcreage;
    if (farmAcreage && areaNum > farmAcreage) {
      return res.status(400).json({
        success: false,
        message: `Cultivated area (${areaNum} acres) cannot exceed total farm acreage (${farmAcreage} acres)`,
      });
    }

    // 4. Validate Growth Stage
    const initialStage = growthStage && GROWTH_STAGES.includes(growthStage)
      ? growthStage
      : 'Land Preparation';

    // 5. Generate initial milestone calendar if planting dates are provided
    const calendarMilestones = generateDefaultMilestones(
      plantingDate,
      expectedHarvestDate,
      name.trim()
    );

    // 6. Build Initial Stage History
    const stageHistory = [
      {
        stage: initialStage,
        transitionDate: plantingDate ? new Date(plantingDate) : new Date(),
        notes: notes ? `Initial planting: ${notes}` : 'Crop planting registered in system',
        recordedBy: userId,
      },
    ];

    const newCrop = new Crop({
      owner: userId,
      farm: farmId,
      name: name.trim(),
      variety: variety.trim(),
      category,
      season,
      irrigationMethod,
      cultivatedArea: areaNum,
      plantingDate: plantingDate ? new Date(plantingDate) : null,
      expectedHarvestDate: expectedHarvestDate ? new Date(expectedHarvestDate) : null,
      expectedYieldPerAcre: expectedYieldPerAcre ? Number(expectedYieldPerAcre) : null,
      yieldUnit: yieldUnit.trim() || 'kg',
      growthStage: initialStage,
      status: initialStage === 'Harvested' ? 'Harvested' : 'Active',
      notes: notes.trim(),
      stageHistory,
      calendar: calendarMilestones,
    });

    await newCrop.save();

    const populatedCrop = await Crop.findById(newCrop._id)
      .populate('farm', 'name location acreage totalAcreage soilType irrigationType');

    return res.status(201).json({
      success: true,
      message: 'Crop registered successfully',
      crop: populatedCrop.toJSON(),
    });
  } catch (error) {
    console.error('[CROP_CREATE_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register crop',
      error: error.message,
    });
  }
};

/**
 * @desc    Update crop general parameters
 * @route   PUT /api/crops/:id
 * @access  Private (Farmer, Expert, Admin)
 */
export const updateCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID format',
      });
    }

    const crop = await Crop.findById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // IDOR Protection
    if (crop.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot modify this crop record',
      });
    }

    const {
      name,
      farm: newFarmId,
      variety,
      category,
      season,
      irrigationMethod,
      cultivatedArea,
      plantingDate,
      expectedHarvestDate,
      expectedYieldPerAcre,
      yieldUnit,
      notes,
    } = req.body;

    // If changing farm, check new farm ownership
    if (newFarmId && newFarmId !== crop.farm.toString()) {
      if (!mongoose.Types.ObjectId.isValid(newFarmId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid farm ID specified',
        });
      }
      const newFarm = await Farm.findById(newFarmId);
      if (!newFarm || (newFarm.owner.toString() !== userId && req.user.role !== 'admin')) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot transfer crop to an unauthorized farm parcel',
        });
      }
      crop.farm = newFarmId;
    }

    if (name && name.trim()) crop.name = name.trim();
    if (variety !== undefined) crop.variety = variety.trim();
    if (category && CROP_CATEGORIES.includes(category)) crop.category = category;
    if (season && CROP_SEASONS.includes(season)) crop.season = season;
    if (irrigationMethod && IRRIGATION_METHODS.includes(irrigationMethod)) {
      crop.irrigationMethod = irrigationMethod;
    }
    if (cultivatedArea !== undefined) {
      const areaNum = Number(cultivatedArea);
      if (areaNum > 0) crop.cultivatedArea = areaNum;
    }
    if (plantingDate !== undefined) {
      crop.plantingDate = plantingDate ? new Date(plantingDate) : null;
    }
    if (expectedHarvestDate !== undefined) {
      crop.expectedHarvestDate = expectedHarvestDate ? new Date(expectedHarvestDate) : null;
    }
    if (expectedYieldPerAcre !== undefined) {
      crop.expectedYieldPerAcre = expectedYieldPerAcre ? Number(expectedYieldPerAcre) : null;
    }
    if (yieldUnit !== undefined) {
      crop.yieldUnit = yieldUnit.trim() || 'kg';
    }
    if (notes !== undefined) {
      crop.notes = notes.trim();
    }

    await crop.save();

    const updatedCrop = await Crop.findById(crop._id)
      .populate('farm', 'name location acreage totalAcreage soilType irrigationType');

    return res.status(200).json({
      success: true,
      message: 'Crop updated successfully',
      crop: updatedCrop.toJSON(),
    });
  } catch (error) {
    console.error('[CROP_UPDATE_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update crop',
      error: error.message,
    });
  }
};

/**
 * @desc    Update phenological growth stage and append to stage history
 * @route   PATCH /api/crops/:id/stage
 * @access  Private (Farmer, Expert, Admin)
 */
export const updateCropStage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { stage, transitionDate = new Date(), notes = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID format',
      });
    }

    if (!stage || !GROWTH_STAGES.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid growth stage. Must be one of: ${GROWTH_STAGES.join(', ')}`,
      });
    }

    const crop = await Crop.findById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // IDOR Protection
    if (crop.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot modify growth stages on this crop',
      });
    }

    // Update current growth stage
    crop.growthStage = stage;

    // If stage is transitioned to Harvested, mark status Harvested
    if (stage === 'Harvested') {
      crop.status = 'Harvested';
    }

    // Append history subdocument
    crop.stageHistory.push({
      stage,
      transitionDate: transitionDate ? new Date(transitionDate) : new Date(),
      notes: notes.trim(),
      recordedBy: userId,
    });

    await crop.save();

    const updatedCrop = await Crop.findById(crop._id)
      .populate('farm', 'name location acreage totalAcreage soilType irrigationType')
      .populate('stageHistory.recordedBy', 'name email');

    return res.status(200).json({
      success: true,
      message: `Crop transitioned to "${stage}" successfully`,
      crop: updatedCrop.toJSON(),
    });
  } catch (error) {
    console.error('[CROP_STAGE_UPDATE_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update growth stage',
      error: error.message,
    });
  }
};

/**
 * @desc    Record actual harvest yield and complete crop lifecycle
 * @route   POST /api/crops/:id/harvest
 * @access  Private (Farmer, Expert, Admin)
 */
export const recordHarvest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      harvestDate = new Date(),
      actualYield,
      yieldUnit = 'kg',
      qualityGrade = 'Standard',
      harvestNotes = '',
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID format',
      });
    }

    const yieldNum = Number(actualYield);
    if (actualYield === undefined || isNaN(yieldNum) || yieldNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid positive actual yield number is required',
      });
    }

    const crop = await Crop.findById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // IDOR Protection
    if (crop.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot record harvest for this crop',
      });
    }

    const harvestTime = harvestDate ? new Date(harvestDate) : new Date();

    // Set actual harvest subdocument
    crop.actualHarvest = {
      harvestDate: harvestTime,
      actualYield: yieldNum,
      yieldUnit: yieldUnit.trim() || crop.yieldUnit || 'kg',
      qualityGrade,
      harvestNotes: harvestNotes.trim(),
      recordedAt: new Date(),
    };

    // Transition stage and status
    crop.growthStage = 'Harvested';
    crop.status = 'Harvested';

    // Add harvest to stage history
    crop.stageHistory.push({
      stage: 'Harvested',
      transitionDate: harvestTime,
      notes: `Harvest completed. Actual Yield: ${yieldNum} ${crop.actualHarvest.yieldUnit}. Grade: ${qualityGrade}. Notes: ${harvestNotes.trim()}`,
      recordedBy: userId,
    });

    await crop.save();

    const updatedCrop = await Crop.findById(crop._id)
      .populate('farm', 'name location acreage totalAcreage soilType irrigationType');

    return res.status(200).json({
      success: true,
      message: 'Harvest recorded successfully',
      crop: updatedCrop.toJSON(),
    });
  } catch (error) {
    console.error('[CROP_HARVEST_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record crop harvest',
      error: error.message,
    });
  }
};

/**
 * @desc    Add milestone to crop calendar
 * @route   POST /api/crops/:id/calendar
 * @access  Private (Farmer, Expert, Admin)
 */
export const addCalendarMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { activity, category = 'General', targetDate, notes = '' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID format',
      });
    }

    if (!activity || !activity.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Activity description is required',
      });
    }

    if (!targetDate) {
      return res.status(400).json({
        success: false,
        message: 'Target date is required for calendar milestone',
      });
    }

    const crop = await Crop.findById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // IDOR Protection
    if (crop.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot add calendar milestones to this crop',
      });
    }

    crop.calendar.push({
      activity: activity.trim(),
      category,
      targetDate: new Date(targetDate),
      completed: false,
      notes: notes.trim(),
    });

    await crop.save();

    return res.status(201).json({
      success: true,
      message: 'Milestone added successfully',
      calendar: crop.calendar,
    });
  } catch (error) {
    console.error('[CROP_CALENDAR_ADD_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add calendar milestone',
      error: error.message,
    });
  }
};

/**
 * @desc    Toggle or update calendar milestone completion status
 * @route   PATCH /api/crops/:id/calendar/:milestoneId
 * @access  Private (Farmer, Expert, Admin)
 */
export const updateCalendarMilestone = async (req, res) => {
  try {
    const { id, milestoneId } = req.params;
    const userId = req.user.id;
    const { completed, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(milestoneId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
      });
    }

    const crop = await Crop.findById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // IDOR Protection
    if (crop.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const milestone = crop.calendar.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found in crop calendar',
      });
    }

    if (completed !== undefined) {
      milestone.completed = Boolean(completed);
      milestone.completedDate = milestone.completed ? new Date() : null;
    }
    if (notes !== undefined) {
      milestone.notes = notes.trim();
    }

    await crop.save();

    return res.status(200).json({
      success: true,
      message: 'Milestone updated successfully',
      calendar: crop.calendar,
    });
  } catch (error) {
    console.error('[CROP_CALENDAR_UPDATE_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update calendar milestone',
      error: error.message,
    });
  }
};

/**
 * @desc    Archive a crop record (soft delete)
 * @route   PATCH /api/crops/:id/archive
 * @access  Private (Farmer, Expert, Admin)
 */
export const archiveCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID format',
      });
    }

    const crop = await Crop.findById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // IDOR Protection
    if (crop.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot archive this crop record',
      });
    }

    crop.status = 'Archived';
    await crop.save();

    return res.status(200).json({
      success: true,
      message: 'Crop archived successfully',
      crop: crop.toJSON(),
    });
  } catch (error) {
    console.error('[CROP_ARCHIVE_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive crop',
      error: error.message,
    });
  }
};

/**
 * @desc    Permanently delete crop record
 * @route   DELETE /api/crops/:id
 * @access  Private (Farmer, Expert, Admin)
 */
export const deleteCrop = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID format',
      });
    }

    const crop = await Crop.findById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop record not found',
      });
    }

    // IDOR Protection
    if (crop.owner.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You cannot delete this crop record',
      });
    }

    await crop.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Crop permanently deleted',
    });
  } catch (error) {
    console.error('[CROP_DELETE_ERROR]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete crop',
      error: error.message,
    });
  }
};
