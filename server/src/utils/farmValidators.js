/**
 * Validation utilities for Farm Management
 */

const ALLOWED_SOIL_TYPES = [
  'Alluvial',
  'Black',
  'Red',
  'Laterite',
  'Sandy',
  'Clay',
  'Loamy',
  'Other',
];

const ALLOWED_IRRIGATION_TYPES = [
  'Drip',
  'Sprinkler',
  'Flood',
  'Rain-fed',
  'Other',
];

const ALLOWED_STATUSES = ['Active', 'Inactive', 'Archived'];

/**
 * Validates farm creation or update payload
 * @param {Object} data - Input payload
 * @param {boolean} isUpdate - If true, fields are optional
 * @returns {{ isValid: boolean, errors: Object }}
 */
export const validateFarmInput = (data = {}, isUpdate = false) => {
  const errors = {};
  const {
    name,
    location,
    acreage,
    soilType,
    irrigationType,
    status,
    coordinates,
  } = data;

  // Farm Name
  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      errors.name = 'Farm name is required';
    } else if (name.trim().length < 2) {
      errors.name = 'Farm name must be at least 2 characters long';
    } else if (name.trim().length > 120) {
      errors.name = 'Farm name cannot exceed 120 characters';
    }
  }

  // Location
  if (!isUpdate || location !== undefined) {
    if (!location || typeof location !== 'string' || location.trim().length === 0) {
      errors.location = 'Farm location is required';
    } else if (location.trim().length < 2) {
      errors.location = 'Farm location must be at least 2 characters long';
    } else if (location.trim().length > 200) {
      errors.location = 'Location cannot exceed 200 characters';
    }
  }

  // Acreage
  if (!isUpdate || acreage !== undefined) {
    const parsedAcreage = Number(acreage);
    if (acreage === undefined || acreage === null || acreage === '') {
      errors.acreage = 'Total acreage is required';
    } else if (isNaN(parsedAcreage) || parsedAcreage <= 0) {
      errors.acreage = 'Acreage must be a positive number greater than 0';
    } else if (parsedAcreage > 100000) {
      errors.acreage = 'Acreage cannot exceed 100,000 acres';
    }
  }

  // Soil Type
  if (soilType !== undefined && soilType !== null && soilType !== '') {
    if (!ALLOWED_SOIL_TYPES.includes(soilType)) {
      errors.soilType = `Invalid soil type. Allowed types: ${ALLOWED_SOIL_TYPES.join(', ')}`;
    }
  }

  // Irrigation Type
  if (irrigationType !== undefined && irrigationType !== null && irrigationType !== '') {
    if (!ALLOWED_IRRIGATION_TYPES.includes(irrigationType)) {
      errors.irrigationType = `Invalid irrigation type. Allowed types: ${ALLOWED_IRRIGATION_TYPES.join(', ')}`;
    }
  }

  // Status
  if (status !== undefined && status !== null && status !== '') {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.status = `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
    }
  }

  // Coordinates
  if (coordinates && typeof coordinates === 'object') {
    if (coordinates.latitude !== undefined && coordinates.latitude !== null && coordinates.latitude !== '') {
      const lat = Number(coordinates.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors['coordinates.latitude'] = 'Latitude must be a valid number between -90 and 90';
      }
    }
    if (coordinates.longitude !== undefined && coordinates.longitude !== null && coordinates.longitude !== '') {
      const lng = Number(coordinates.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors['coordinates.longitude'] = 'Longitude must be a valid number between -180 and 180';
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

