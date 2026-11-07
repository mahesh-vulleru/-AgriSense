export const IRRIGATION_METHODS = [
  'Drip',
  'Sprinkler',
  'Flood',
  'Furrow',
  'Other',
];

export const WATER_SOURCES = [
  'Borewell / Tubewell',
  'Canal',
  'Farm Pond / Reservoir',
  'River / Stream',
  'Municipal / Tanker',
  'Rainwater Harvesting',
  'Other',
];

export const IRRIGATION_FREQUENCIES = [
  'Daily',
  'Alternate Days',
  'Twice a Week',
  'Weekly',
  'As Needed / Soil Triggered',
  'Custom',
];

export const SCHEDULE_STATUSES = [
  'Scheduled',
  'In Progress',
  'Completed',
  'Cancelled',
  'Skipped',
];

export const WATER_UNITS = ['Liters', 'Cubic Meters', 'Gallons', 'Acre-Inches'];

export const SCHEDULE_STATUS_CONFIG = {
  Scheduled: {
    variant: 'warning',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Scheduled',
  },
  'In Progress': {
    variant: 'info',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    label: 'In Progress',
  },
  Completed: {
    variant: 'success',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Completed',
  },
  Cancelled: {
    variant: 'danger',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Cancelled',
  },
  Skipped: {
    variant: 'neutral',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Skipped (Rain)',
  },
};

export const ADVISORY_STATUS_CONFIG = {
  'Irrigation Recommended': {
    variant: 'info',
    badge: 'Irrigation Recommended',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
  'Irrigation May Be Delayed': {
    variant: 'warning',
    badge: 'Delay Irrigation',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
  },
  'Heavy Rainfall Caution': {
    variant: 'danger',
    badge: 'Heavy Rain Alert',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    iconColor: 'text-rose-600',
  },
  'Monitor Soil Moisture': {
    variant: 'neutral',
    badge: 'Monitor Soil',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    iconColor: 'text-slate-600',
  },
};
