export const PRIORITY_CROPS = ['Chili', 'Cotton', 'Rice', 'Sugarcane'];

export const SCAN_STATUS_CONFIG = {
  Healthy: {
    variant: 'success',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Healthy Foliage',
  },
  Diseased: {
    variant: 'danger',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    dot: 'bg-rose-500',
    label: 'Disease Detected',
  },
  'Pest Damage': {
    variant: 'warning',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    dot: 'bg-amber-500',
    label: 'Pest Infestation',
  },
  'Nutrient Deficiency': {
    variant: 'warning',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    dot: 'bg-orange-500',
    label: 'Nutrient Deficiency',
  },
  'Physiological Stress': {
    variant: 'info',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    dot: 'bg-blue-500',
    label: 'Physiological / Weather Stress',
  },
  'Unable to Determine': {
    variant: 'neutral',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    dot: 'bg-slate-400',
    label: 'Inconclusive / Unclear Image',
  },
};
