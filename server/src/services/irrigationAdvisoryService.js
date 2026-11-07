/**
 * AgriSense Smart Irrigation & Meteorological Advisory Service
 * 
 * Synthesizes OpenWeather meteorological forecasts, crop growth stage water demands,
 * and actual soil analysis moisture readings to deliver actionable irrigation recommendations.
 */

export const WATER_SENSITIVITY_BY_STAGE = {
  'Land Preparation': {
    level: 'Low',
    factor: 0.5,
    guidance: 'Pre-sowing irrigation to achieve workable soil tilth if field is dry.',
  },
  'Sowing / Planting': {
    level: 'Critical',
    factor: 1.0,
    guidance: 'Crucial for seed germination and uniform seedling establishment.',
  },
  'Germination': {
    level: 'Critical',
    factor: 1.0,
    guidance: 'Maintain light and continuous surface moisture without crusting.',
  },
  'Seedling': {
    level: 'High',
    factor: 0.9,
    guidance: 'Promote root elongation into deeper soil profiles with gentle irrigation.',
  },
  'Vegetative Growth': {
    level: 'Moderate',
    factor: 0.85,
    guidance: 'Steady vegetative canopy expansion. Avoid waterlogging.',
  },
  'Tillering / Branching': {
    level: 'High',
    factor: 1.0,
    guidance: 'Critical tiller initiation. Moisture stress restricts fertile panicle numbers.',
  },
  'Flowering': {
    level: 'Critical',
    factor: 1.25,
    guidance: 'Peak water requirement. Moisture deficit triggers flower drop and sterile pollen.',
  },
  'Fruiting / Grain Formation': {
    level: 'Critical',
    factor: 1.2,
    guidance: 'Essential for grain filling and fruit sizing. Prevent soil drying cycles.',
  },
  'Maturity': {
    level: 'Low',
    factor: 0.4,
    guidance: 'Taper off irrigation to facilitate dry-down, ripening, and sugar accumulation.',
  },
  'Harvesting': {
    level: 'None',
    factor: 0.0,
    guidance: 'Cease irrigation 10-15 days prior to harvest to facilitate field trafficability.',
  },
  'Harvested': {
    level: 'None',
    factor: 0.0,
    guidance: 'Field harvested. Post-harvest stubble management.',
  },
};

/**
 * Generate comprehensive weather and soil-based irrigation advisory
 */
export function generateIrrigationAdvisory({
  farm,
  crop = null,
  weatherData = null,
  soilRecord = null,
}) {
  const recommendations = [];
  let primaryAction = 'Monitor Soil Moisture';
  let primaryStatus = 'info'; // 'optimal' | 'warning' | 'danger' | 'info'
  let summary = '';

  // 1. Weather factors extraction
  let expectedRainfall24h = 0;
  let maxRainProb = 0;
  let temp = 28;
  let humidity = 60;
  let windSpeedKmh = 10;
  let weatherCondition = 'Normal';
  let isWeatherAvailable = false;

  if (weatherData && weatherData.current) {
    isWeatherAvailable = true;
    temp = weatherData.current.temp ?? 28;
    humidity = weatherData.current.humidity ?? 60;
    windSpeedKmh = Math.round((weatherData.current.windSpeed || 0) * 3.6);
    weatherCondition = weatherData.current.condition || 'Clear';

    // Forecast rainfall in next 48h
    if (Array.isArray(weatherData.forecast) && weatherData.forecast.length > 0) {
      const nearDays = weatherData.forecast.slice(0, 2);
      expectedRainfall24h = Math.round(nearDays.reduce((sum, d) => sum + (d.expectedRainfall || 0), 0) * 10) / 10;
      maxRainProb = Math.max(...nearDays.map((d) => d.rainProbability || 0));
    }
  }

  // 2. Soil moisture extraction
  let isSoilMoistureMeasured = false;
  let measuredSoilMoisture = null;
  if (soilRecord && soilRecord.soilMoisture && soilRecord.soilMoisture.value !== null && soilRecord.soilMoisture.value !== undefined) {
    measuredSoilMoisture = Number(soilRecord.soilMoisture.value);
    isSoilMoistureMeasured = true;
  }

  // 3. Crop growth stage sensitivity
  const currentStage = crop?.growthStage || 'Vegetative Growth';
  const stageMeta = WATER_SENSITIVITY_BY_STAGE[currentStage] || WATER_SENSITIVITY_BY_STAGE['Vegetative Growth'];

  // 4. Evaluate Weather-Driven Rules
  // Rule A: Heavy Rainfall Event
  if (expectedRainfall24h >= 25) {
    primaryAction = 'Heavy Rainfall Caution';
    primaryStatus = 'danger';
    recommendations.push({
      category: 'Meteorological Rain Alert',
      action: 'Suspend Irrigation & Inspect Drainage',
      severity: 'High',
      reason: `Heavy rainfall of ${expectedRainfall24h}mm is forecast over the next 48 hours (${maxRainProb}% probability). Suspend all irrigation activities immediately.`,
      actionableGuidance: 'Ensure field furrows and drainage ditches are clear to prevent water stagnation and collar rot around root zones.',
    });
  }
  // Rule B: Moderate Rain Delay
  else if (expectedRainfall24h >= 8 || maxRainProb >= 65) {
    primaryAction = 'Irrigation May Be Delayed';
    primaryStatus = 'warning';
    recommendations.push({
      category: 'Precipitation Delay',
      action: 'Postpone Scheduled Irrigation',
      severity: 'Medium',
      reason: `Upcoming rain forecast indicates ${expectedRainfall24h}mm precipitation with ${maxRainProb}% probability. Natural precipitation is anticipated to meet crop water needs.`,
      actionableGuidance: 'Postpone scheduled irrigation by 24–48 hours to conserve water and power, then inspect topsoil moisture after rainfall.',
    });
  }

  // Rule C: High Evapotranspiration / Heat Stress
  if (temp >= 35) {
    recommendations.push({
      category: 'Atmospheric Evaporation',
      action: 'Irrigate in Early Morning / Late Evening',
      severity: temp >= 38 ? 'High' : 'Medium',
      reason: `Daytime ambient temperature (${temp}°C) causes elevated vapor pressure deficit and transpirational pull. Midday watering leads to significant evaporative loss.`,
      actionableGuidance: 'Run irrigation between 5:00 AM – 8:30 AM or after 6:00 PM to ensure optimal root penetration and lower leaf scalding risk.',
    });
    if (primaryAction !== 'Heavy Rainfall Caution' && primaryAction !== 'Irrigation May Be Delayed') {
      primaryAction = 'Irrigation Recommended';
      primaryStatus = 'info';
    }
  }

  // Rule D: Wind Drift Hazard for Overhead Sprinklers
  if (windSpeedKmh >= 20) {
    recommendations.push({
      category: 'Wind Drift Hazard',
      action: 'Avoid Overhead Sprinkler Systems',
      severity: windSpeedKmh >= 30 ? 'High' : 'Medium',
      reason: `Sustained wind speeds (${windSpeedKmh} km/h) distort sprinkler spray patterns, causing uneven water application and drift.`,
      actionableGuidance: 'Prefer micro-drip systems or postpone sprinkler operations until wind drops below 12 km/h.',
    });
  }

  // 5. Evaluate Soil Moisture & Soil Type Rules
  const soilType = farm?.soilType || 'Loamy';
  if (isSoilMoistureMeasured) {
    if (measuredSoilMoisture < 15) {
      if (primaryAction !== 'Heavy Rainfall Caution') {
        primaryAction = 'Irrigation Recommended';
        primaryStatus = 'info';
      }
      recommendations.push({
        category: 'Measured Soil Moisture',
        action: 'Watering Recommended (Soil Deficit)',
        severity: 'High',
        reason: `Measured soil moisture is ${measuredSoilMoisture}% (below the 15% field depletion threshold). Root zones are approaching wilting point.`,
        actionableGuidance: `Apply scheduled irrigation according to the ${soilType} soil infiltration rate.`,
      });
    } else if (measuredSoilMoisture > 32) {
      if (primaryAction !== 'Heavy Rainfall Caution') {
        primaryAction = 'Irrigation May Be Delayed';
        primaryStatus = 'warning';
      }
      recommendations.push({
        category: 'Measured Soil Moisture',
        action: 'Soil Saturated / Sufficient Hydration',
        severity: 'Low',
        reason: `Measured root-zone moisture is ${measuredSoilMoisture}%. Soil has abundant moisture reserves.`,
        actionableGuidance: 'Delay watering to prevent root-zone hypoxia and anaerobic soil conditions.',
      });
    }
  }

  // 6. Growth Stage Water Sensitivity
  if (stageMeta.level === 'Critical' && primaryAction !== 'Heavy Rainfall Caution') {
    recommendations.push({
      category: 'Phenological Sensitivity',
      action: `Maintain Consistent Moisture for ${currentStage}`,
      severity: 'Medium',
      reason: `${currentStage} is a critical crop development stage. ${stageMeta.guidance}`,
      actionableGuidance: 'Avoid allowing root zone to undergo severe moisture fluctuation.',
    });
  } else if (currentStage === 'Harvesting' || currentStage === 'Harvested') {
    primaryAction = 'Irrigation Ceased (Harvesting)';
    primaryStatus = 'info';
    recommendations.push({
      category: 'Harvest Preparation',
      action: 'Cease Irrigation',
      severity: 'Low',
      reason: 'Crop is in or near harvest. Dry soil facilitates mechanical harvesting and prevents grain rot.',
      actionableGuidance: 'Suspend all field watering.',
    });
  }

  // Fallback summary
  if (primaryAction === 'Irrigation Recommended') {
    summary = `Atmospheric conditions and crop demand (${crop?.name || 'Crop'} at ${currentStage}) indicate irrigation is recommended during cooler hours.`;
  } else if (primaryAction === 'Irrigation May Be Delayed') {
    summary = `Precipitation forecast (${expectedRainfall24h}mm expected) or adequate soil moisture indicates irrigation can be delayed by 24–48 hours.`;
  } else if (primaryAction === 'Heavy Rainfall Caution') {
    summary = `Heavy precipitation event (${expectedRainfall24h}mm) forecast. Cease irrigation and ensure field drainage channels are clear.`;
  } else {
    summary = `Weather conditions are moderate. Monitor root-zone soil condition before initiating irrigation cycles.`;
  }

  return {
    primaryAction,
    primaryStatus,
    summary,
    weatherSummary: {
      isWeatherAvailable,
      condition: weatherCondition,
      temperature: temp,
      humidity,
      windSpeedKmh,
      expectedRainfall24h,
      maxRainProb,
    },
    soilContext: {
      soilType,
      isSoilMoistureMeasured,
      measuredSoilMoisture: isSoilMoistureMeasured ? `${measuredSoilMoisture}%` : null,
      sensorNotice: isSoilMoistureMeasured
        ? 'Soil moisture verified from recent field test.'
        : 'Sensor data unavailable. Recommendations are agronomic estimates based on weather forecasts and crop stage demand.',
    },
    cropContext: {
      cropName: crop?.name || 'General Crop',
      variety: crop?.variety || '',
      growthStage: currentStage,
      waterSensitivity: stageMeta.level,
      stageGuidance: stageMeta.guidance,
    },
    recommendations,
  };
}
