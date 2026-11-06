/**
 * 11 Phenological Growth Stages with progression and accent metadata
 */
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
  'Harvested',
];

export const STAGE_CONFIG = {
  'Land Preparation': { step: 1, percent: 9, color: '#64748B', badgeVariant: 'neutral' },
  'Sowing / Planting': { step: 2, percent: 18, color: '#D97706', badgeVariant: 'warning' },
  'Sowing': { step: 2, percent: 18, color: '#D97706', badgeVariant: 'warning' },
  'Germination': { step: 3, percent: 27, color: '#84CC16', badgeVariant: 'success' },
  'Seedling': { step: 4, percent: 36, color: '#22C55E', badgeVariant: 'success' },
  'Vegetative Growth': { step: 5, percent: 45, color: '#166534', badgeVariant: 'forest' },
  'Tillering / Branching': { step: 6, percent: 55, color: '#0D9488', badgeVariant: 'forest' },
  'Flowering': { step: 7, percent: 64, color: '#8B5CF6', badgeVariant: 'info' },
  'Fruiting / Grain Formation': { step: 8, percent: 73, color: '#EA580C', badgeVariant: 'warning' },
  'Fruiting': { step: 8, percent: 73, color: '#EA580C', badgeVariant: 'warning' },
  'Maturity': { step: 9, percent: 82, color: '#D97706', badgeVariant: 'warning' },
  'Harvesting': { step: 10, percent: 91, color: '#F59E0B', badgeVariant: 'warning' },
  'Harvested': { step: 11, percent: 100, color: '#0284C7', badgeVariant: 'info' },
};

export const CROP_CATEGORIES = [
  'All',
  'Cereal',
  'Pulses',
  'Oilseeds',
  'Fiber',
  'Cash Crop',
  'Vegetable',
  'Fruit',
  'Horticulture',
  'Other',
];

export const CROP_SEASONS = ['All', 'Kharif', 'Rabi', 'Zaid', 'Year-round', 'Other'];

export const IRRIGATION_METHODS = ['Drip', 'Sprinkler', 'Flood', 'Rain-fed', 'Other'];

export const YIELD_UNITS = ['kg', 'quintals', 'tons', 'bags'];
