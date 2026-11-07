export const SOIL_TYPES = [
  'Alluvial',
  'Black',
  'Red',
  'Laterite',
  'Sandy',
  'Clay',
  'Loamy',
  'Silt',
  'Peat',
  'Saline',
  'Other',
];

export const TEST_METHODS = [
  'Certified Laboratory',
  'Rapid Soil Test Kit',
  'Mobile Testing Van',
  'Digital IoT Soil Sensor',
  'Farmer Estimation',
];

export const CROP_OPTIONS = [
  'Rice',
  'Wheat',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Soybean',
  'Groundnut',
  'Tomato',
  'Potato',
  'Chili',
  'Pulses',
  'General',
];

export const GROWTH_STAGES = [
  'Land Preparation',
  'Sowing / Planting',
  'Germination',
  'Seedling',
  'Vegetative Growth',
  'Tillering / Branching',
  'Flowering',
  'Fruiting / Grain Formation',
  'Maturity',
  'Harvesting',
];

export const SOIL_HEALTH_CONFIG = {
  Optimal: {
    variant: 'success',
    badge: 'Optimal Fertility',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Balanced pH and macronutrient availability supporting maximum yield potential.',
  },
  'Moderately Healthy': {
    variant: 'success',
    badge: 'Moderately Healthy',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
    dot: 'bg-teal-500',
    description: 'Good productive condition with minor micronutrient or organic matter adjustments needed.',
  },
  'Needs Improvement': {
    variant: 'warning',
    badge: 'Needs Improvement',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    description: 'Notable nutrient deficiency or pH skew requiring targeted fertilization & organic inputs.',
  },
  'Degraded / Critical': {
    variant: 'danger',
    badge: 'Critical / Degraded',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
    description: 'Severe acidity, alkalinity, salinity, or acute multi-nutrient depletion detected.',
  },
  'Insufficient Data': {
    variant: 'neutral',
    badge: 'Insufficient Data',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    dot: 'bg-slate-400',
    description: 'Insufficient soil parameters recorded to calculate a reliable agronomic health index.',
  },
};
