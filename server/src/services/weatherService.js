import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// In-memory weather cache (15-minute TTL per coordinate bucket)
const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// Target application timezone
const TARGET_TIMEZONE = 'Asia/Kolkata';

/**
 * Format unix epoch seconds to local ISO date string (YYYY-MM-DD) in target timezone
 */
export function formatEpochToLocalDate(epochSeconds, timezone = TARGET_TIMEZONE) {
  if (!epochSeconds || isNaN(epochSeconds)) return '';
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleDateString('en-CA', { timeZone: timezone });
}

/**
 * Format unix epoch seconds to weekday abbreviation (e.g. 'Fri', 'Sat') in target timezone
 */
export function formatEpochToWeekday(epochSeconds, timezone = TARGET_TIMEZONE) {
  if (!epochSeconds || isNaN(epochSeconds)) return '';
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: timezone });
}

/**
 * Format unix epoch seconds to human readable month/day (e.g. 'Nov 6') in target timezone
 */
export function formatEpochToMonthDay(epochSeconds, timezone = TARGET_TIMEZONE) {
  if (!epochSeconds || isNaN(epochSeconds)) return '';
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: timezone });
}

/**
 * Format unix epoch seconds to time string (e.g. '02:30 PM') in target timezone
 */
export function formatEpochToTime(epochSeconds, timezone = TARGET_TIMEZONE) {
  if (!epochSeconds || isNaN(epochSeconds)) return '';
  const d = new Date(epochSeconds * 1000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: timezone });
}

/**
 * Convert compass degrees to 16-point cardinal compass direction
 */
export function getCompassDirection(degrees) {
  if (degrees === null || degrees === undefined || isNaN(degrees)) return 'N/A';
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const idx = Math.round((degrees % 360) / 22.5) % 16;
  return directions[idx];
}

/**
 * Map OpenWeather icon code / condition ID to standard agricultural UI icon & severity
 */
export function mapOpenWeatherIcon(weatherId, iconCode = '') {
  const isNight = iconCode.endsWith('n');
  if (weatherId >= 200 && weatherId < 300) {
    return { icon: 'cloud-lightning', severity: 'danger' };
  }
  if (weatherId >= 300 && weatherId < 400) {
    return { icon: 'cloud-drizzle', severity: 'info' };
  }
  if (weatherId >= 500 && weatherId < 600) {
    return { icon: 'cloud-rain', severity: weatherId >= 502 ? 'danger' : 'warning' };
  }
  if (weatherId >= 600 && weatherId < 700) {
    return { icon: 'snowflake', severity: 'warning' };
  }
  if (weatherId >= 700 && weatherId < 800) {
    return { icon: 'cloud-fog', severity: 'warning' };
  }
  if (weatherId === 800) {
    return { icon: isNight ? 'moon' : 'sun', severity: 'normal' };
  }
  if (weatherId === 801 || weatherId === 802) {
    return { icon: 'cloud-sun', severity: 'normal' };
  }
  return { icon: 'cloud', severity: 'normal' };
}

/**
 * Fetch raw meteorological data from OpenWeather REST API
 */
export async function fetchRawOpenWeatherData(latitude, longitude, overrideApiKey = null) {
  const apiKey = (overrideApiKey || env.OPENWEATHER_API_KEY || '').trim();

  // Validate API key presence
  if (!apiKey || apiKey === 'YOUR_OPENWEATHER_API_KEY') {
    const error = new Error(
      'OpenWeather API key is not configured. Please specify a valid OPENWEATHER_API_KEY in server/.env to retrieve weather advisories.'
    );
    error.code = 'OPENWEATHER_API_KEY_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }

  // Construct official OpenWeather 2.5 Current Weather and 5-Day/3-Hour Forecast endpoints
  const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

  let currentRes;
  let forecastRes;

  try {
    [currentRes, forecastRes] = await Promise.all([
      fetch(currentWeatherUrl, { signal: AbortSignal.timeout(8000) }),
      fetch(forecastUrl, { signal: AbortSignal.timeout(8000) }),
    ]);
  } catch (fetchErr) {
    if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
      const error = new Error('OpenWeather API connection timed out after 8000ms. Please try again.');
      error.code = 'OPENWEATHER_TIMEOUT';
      error.statusCode = 504;
      throw error;
    }
    const error = new Error(`Network failure connecting to OpenWeather: ${fetchErr.message}`);
    error.code = 'OPENWEATHER_NETWORK_ERROR';
    error.statusCode = 502;
    throw error;
  }

  // Handle HTTP error responses
  if (!currentRes.ok || !forecastRes.ok) {
    const failedStatus = !currentRes.ok ? currentRes.status : forecastRes.status;
    let errorDetail = '';
    try {
      const errorBody = !currentRes.ok ? await currentRes.json() : await forecastRes.json();
      errorDetail = errorBody.message || '';
    } catch {
      // ignore json parse failure on error body
    }

    if (failedStatus === 401) {
      const error = new Error(
        `OpenWeather API authentication failed: Invalid or inactive API key (HTTP 401). ${errorDetail ? `Details: ${errorDetail}. ` : ''}Please check your OPENWEATHER_API_KEY in server/.env.`
      );
      error.code = 'OPENWEATHER_AUTHENTICATION_FAILED';
      error.statusCode = 401;
      throw error;
    }

    if (failedStatus === 429) {
      const error = new Error(
        `OpenWeather API rate limit exceeded (HTTP 429). ${errorDetail ? `Details: ${errorDetail}. ` : ''}Please retry shortly.`
      );
      error.code = 'OPENWEATHER_RATE_LIMIT_EXCEEDED';
      error.statusCode = 429;
      throw error;
    }

    const error = new Error(
      `OpenWeather API returned HTTP ${failedStatus}: ${errorDetail || 'Provider error'}`
    );
    error.code = 'OPENWEATHER_PROVIDER_ERROR';
    error.statusCode = failedStatus >= 400 && failedStatus < 500 ? failedStatus : 502;
    throw error;
  }

  const currentData = await currentRes.json();
  const forecastData = await forecastRes.json();

  return parseOpenWeatherPayload(currentData, forecastData);
}

/**
 * Parse and normalize OpenWeather Current & Forecast JSON payload
 */
export function parseOpenWeatherPayload(current, forecast) {
  const currentCondition = current.weather?.[0] || {};
  const iconMeta = mapOpenWeatherIcon(currentCondition.id || 800, currentCondition.icon || '');
  const observationEpoch = current.dt || Math.floor(Date.now() / 1000);
  const timezoneOffsetSeconds = current.timezone !== undefined ? current.timezone : 19800; // default to 19800 (+5:30 Asia/Kolkata)

  // Current Atmospheric State
  const currentWeather = {
    temperature: Math.round(Number(current.main?.temp || 0) * 10) / 10,
    feelsLike: Math.round(Number(current.main?.feels_like || 0) * 10) / 10,
    tempMin: Math.round(Number(current.main?.temp_min || 0) * 10) / 10,
    tempMax: Math.round(Number(current.main?.temp_max || 0) * 10) / 10,
    humidity: current.main?.humidity || 0,
    pressure: current.main?.pressure || 0,
    cloudCoverage: current.clouds?.all || 0,
    weatherCode: currentCondition.id || 800,
    condition: currentCondition.description
      ? currentCondition.description.charAt(0).toUpperCase() + currentCondition.description.slice(1)
      : 'Clear Sky',
    icon: iconMeta.icon,
    windSpeed: Math.round((Number(current.wind?.speed || 0) * 3.6) * 10) / 10, // convert m/s to km/h
    windDirectionDeg: current.wind?.deg ?? null,
    windDirection: getCompassDirection(current.wind?.deg),
    windGust: current.wind?.gust ? Math.round(Number(current.wind.gust) * 3.6 * 10) / 10 : null,
    rainfall: current.rain ? Number(current.rain['1h'] || current.rain['3h'] || 0) : 0,
    sunrise: current.sys?.sunrise ? new Date(current.sys.sunrise * 1000).toISOString() : null,
    sunset: current.sys?.sunset ? new Date(current.sys.sunset * 1000).toISOString() : null,
    observationEpoch,
    observationTime: new Date(observationEpoch * 1000).toISOString(),
    observationFormatted: formatEpochToMonthDay(observationEpoch) + ' ' + formatEpochToTime(observationEpoch),
  };

  // Group forecast 3-hour slices into daily buckets using local calendar dates in Asia/Kolkata
  const dailyBuckets = new Map();

  if (Array.isArray(forecast.list)) {
    forecast.list.forEach((item) => {
      const epoch = item.dt;
      if (!epoch) return;
      const dateKey = formatEpochToLocalDate(epoch, TARGET_TIMEZONE);
      if (!dailyBuckets.has(dateKey)) {
        dailyBuckets.set(dateKey, []);
      }
      dailyBuckets.get(dateKey).push(item);
    });
  }

  const dailyForecast = [];
  for (const [dateStr, items] of dailyBuckets.entries()) {
    const temps = items.map((it) => it.main?.temp || 0);
    const minTemps = items.map((it) => (it.main?.temp_min !== undefined ? it.main.temp_min : it.main?.temp || 0));
    const maxTemps = items.map((it) => (it.main?.temp_max !== undefined ? it.main.temp_max : it.main?.temp || 0));
    const popValues = items.map((it) => it.pop || 0);
    const rainSum = items.reduce((acc, it) => acc + (it.rain?.['3h'] || it.rain?.['1h'] || 0), 0);
    const windSpeeds = items.map((it) => (it.wind?.speed || 0) * 3.6);

    // Pick midday slice or slice with worst weather for representative icon/condition
    const midIndex = Math.floor(items.length / 2);
    const repItem = items[midIndex] || items[0];
    const repCondition = repItem.weather?.[0] || {};
    const repIcon = mapOpenWeatherIcon(repCondition.id || 800, repCondition.icon || '');
    const firstEpoch = items[0].dt;

    dailyForecast.push({
      date: dateStr,
      day: formatEpochToWeekday(firstEpoch),
      formattedDate: formatEpochToMonthDay(firstEpoch),
      epoch: firstEpoch,
      timestamp: new Date(firstEpoch * 1000).toISOString(),
      weatherCode: repCondition.id || 800,
      condition: repCondition.description
        ? repCondition.description.charAt(0).toUpperCase() + repCondition.description.slice(1)
        : 'Partly Cloudy',
      icon: repIcon.icon,
      tempMin: Math.round(Math.min(...minTemps) * 10) / 10,
      tempMax: Math.round(Math.max(...maxTemps) * 10) / 10,
      rainProbability: Math.round(Math.max(...popValues) * 100),
      expectedRainfall: Math.round(rainSum * 10) / 10,
      windSpeedMax: Math.round(Math.max(...windSpeeds) * 10) / 10,
      windDirection: getCompassDirection(repItem.wind?.deg),
      humidityAvg: Math.round(items.reduce((acc, it) => acc + (it.main?.humidity || 0), 0) / items.length),
      sunrise: currentWeather.sunrise,
      sunset: currentWeather.sunset,
    });
  }

  // Official Alerts from OpenWeather (e.g. OneCall 3.0/4.0 alerts)
  const officialAlerts = [];
  if (Array.isArray(forecast.alerts)) {
    forecast.alerts.forEach((alertItem, idx) => {
      officialAlerts.push({
        id: `official-alert-${idx}`,
        isOfficialAlert: true,
        source: `OpenWeather Official Alert: ${alertItem.sender_name || 'Meteorological Authority'}`,
        event: alertItem.event || 'Severe Weather Warning',
        severity: 'danger',
        message: alertItem.description || alertItem.event,
        start: alertItem.start ? new Date(alertItem.start * 1000).toISOString() : null,
        end: alertItem.end ? new Date(alertItem.end * 1000).toISOString() : null,
      });
    });
  }

  return {
    provider: 'OpenWeather (Meteorological Model API)',
    timezone: TARGET_TIMEZONE,
    timezoneOffset: timezoneOffsetSeconds,
    city: forecast.city?.name || current.name || 'Farm Coordinates',
    country: forecast.city?.country || current.sys?.country || 'IN',
    current: currentWeather,
    forecast: dailyForecast,
    officialAlerts,
    coverage: {
      days: dailyForecast.length,
      tier: 'OpenWeather Standard 5-Day / 3-Hour Forecast',
      limitations:
        'OpenWeather standard product supplies rolling 5-day daily aggregations (40 x 3-hour forecasts). Days 6-7 require OpenWeather One Call API daily product subscription.',
      isOneCallDaily: false,
    },
  };
}

/**
 * Generate Agricultural Weather Advisories (Forecast-derived agricultural risk indicators)
 * Clearly labelled as application-generated crop advisories to distinguish from official alerts
 */
export function generateAgriculturalAlerts(current, forecast, officialAlerts = []) {
  const alerts = [...officialAlerts];

  if (!Array.isArray(forecast) || forecast.length === 0) return alerts;

  // 1. Heavy Rainfall Advisory
  const maxRainDay = forecast.reduce(
    (max, d) => (d.expectedRainfall > (max?.expectedRainfall || 0) ? d : max),
    null
  );
  if (current.rainfall >= 20 || (maxRainDay && maxRainDay.expectedRainfall >= 25)) {
    alerts.push({
      id: 'adv-heavy-rain',
      isOfficialAlert: false,
      source: 'AgriSense Crop Advisory Model (Forecast-Derived)',
      type: 'rainfall',
      title: 'Heavy Rainfall & Waterlogging Advisory',
      severity: 'danger',
      message: `Significant rainfall expected (${maxRainDay?.expectedRainfall || current.rainfall} mm on ${maxRainDay?.day || 'today'}). Risk of root-zone waterlogging, soil erosion, and nitrogen leaching. Ensure field drainage channels are cleared immediately.`,
    });
  } else if (maxRainDay && maxRainDay.expectedRainfall >= 12) {
    alerts.push({
      id: 'adv-moderate-rain',
      isOfficialAlert: false,
      source: 'AgriSense Crop Advisory Model (Forecast-Derived)',
      type: 'rainfall',
      title: 'Moderate Rainfall Advisory',
      severity: 'warning',
      message: `Precipitation of ${maxRainDay.expectedRainfall} mm forecast on ${maxRainDay.day}. Suspend scheduled pesticide applications and foliar nutrient sprays.`,
    });
  }

  // 2. High Wind & Lodging Risk
  const maxWindDay = forecast.reduce(
    (max, d) => (d.windSpeedMax > (max?.windSpeedMax || 0) ? d : max),
    null
  );
  if (current.windSpeed >= 32 || (maxWindDay && maxWindDay.windSpeedMax >= 32)) {
    alerts.push({
      id: 'adv-strong-wind',
      isOfficialAlert: false,
      source: 'AgriSense Crop Advisory Model (Forecast-Derived)',
      type: 'wind',
      title: 'High Wind Velocity & Lodging Advisory',
      severity: 'warning',
      message: `Wind velocity reaching ${maxWindDay?.windSpeedMax || current.windSpeed} km/h anticipated. Elevated risk of lodging in tall crops (maize, sugarcane, paddy). Cease high-pressure foliar spraying to prevent spray drift.`,
    });
  }

  // 3. Thermal Stress / Heatwave Advisory
  const maxTempDay = forecast.reduce(
    (max, d) => (d.tempMax > (max?.tempMax || 0) ? d : max),
    null
  );
  if (current.temperature >= 38 || (maxTempDay && maxTempDay.tempMax >= 38)) {
    alerts.push({
      id: 'adv-heatwave',
      isOfficialAlert: false,
      source: 'AgriSense Crop Advisory Model (Forecast-Derived)',
      type: 'heat',
      title: 'Extreme Thermal Stress Advisory',
      severity: 'danger',
      message: `Daytime temperatures forecast up to ${maxTempDay?.tempMax || current.temperature}°C. Severe evapotranspiration stress. Apply light irrigation during early dawn or sunset to prevent flower drop and vegetative scorch.`,
    });
  } else if (current.temperature >= 34 || (maxTempDay && maxTempDay.tempMax >= 34)) {
    alerts.push({
      id: 'adv-warm-temp',
      isOfficialAlert: false,
      source: 'AgriSense Crop Advisory Model (Forecast-Derived)',
      type: 'heat',
      title: 'Elevated Ambient Temperature Advisory',
      severity: 'warning',
      message: `Daytime temperatures peak around ${maxTempDay?.tempMax || current.temperature}°C. Accelerates crop moisture loss; monitor soil field capacity.`,
    });
  }

  // 4. Frost / Chilling Injury Advisory
  const minTempDay = forecast.reduce(
    (min, d) => (d.tempMin < (min?.tempMin !== undefined ? min.tempMin : 99) ? d : min),
    null
  );
  if (current.temperature <= 5 || (minTempDay && minTempDay.tempMin <= 5)) {
    alerts.push({
      id: 'adv-frost',
      isOfficialAlert: false,
      source: 'AgriSense Crop Advisory Model (Forecast-Derived)',
      type: 'frost',
      title: 'Chilling / Frost Injury Warning',
      severity: 'danger',
      message: `Night temperatures dropping to ${minTempDay?.tempMin || current.temperature}°C. Frost conditions can damage sensitive vegetable seedlings and horticultural blossoms. Provide light night irrigation or straw mulching.`,
    });
  }

  // 5. Sustained Humidity & Fungal Pathogen Incubation
  if (current.humidity >= 80 && current.temperature >= 20 && current.temperature <= 32) {
    alerts.push({
      id: 'adv-fungal-humidity',
      isOfficialAlert: false,
      source: 'AgriSense Crop Advisory Model (Forecast-Derived)',
      type: 'humidity',
      title: 'Fungal Spore Incubation Advisory',
      severity: 'warning',
      message: `Relative humidity of ${current.humidity}% at ${current.temperature}°C creates favorable conditions for blast, rust, and powdery mildew spore propagation. Inspect inner canopy leaves closely.`,
    });
  }

  return alerts;
}

/**
 * Generate actionable agricultural recommendations based on actual OpenWeather measurements
 * Strictly prevents contradictory spray recommendations during rainy forecast windows
 */
export function generateFarmingRecommendations(current, forecast) {
  if (!Array.isArray(forecast) || forecast.length === 0) {
    return {
      irrigation: { title: 'Irrigation Advisory', status: 'Unavailable', reason: 'Insufficient forecast data' },
      fertilizer: { title: 'Fertilizer Application', status: 'Unavailable', reason: 'Insufficient forecast data' },
      spraying: { title: 'Pesticide & Foliar Spray', status: 'Unavailable', reason: 'Insufficient forecast data' },
      harvest: { title: 'Harvest Planning', status: 'Unavailable', reason: 'Insufficient forecast data' },
      protection: { title: 'Field Protection', status: 'Unavailable', reason: 'Insufficient forecast data' },
    };
  }

  const day1 = forecast[0];
  const next48hRain = forecast.slice(0, 2).reduce((acc, d) => acc + (d.expectedRainfall || 0), 0);
  const totalForecastRain = forecast.reduce((acc, d) => acc + (d.expectedRainfall || 0), 0);
  const maxWindNext48h = Math.max(...forecast.slice(0, 2).map((d) => d.windSpeedMax || 0));

  // 1. Irrigation Recommendation
  let irrigation;
  if (next48hRain >= 15) {
    irrigation = {
      title: 'Irrigation Advisory',
      status: 'Hold / Suspend Irrigation',
      badgeVariant: 'danger',
      recommendation: `Substantial precipitation (~${next48hRain.toFixed(1)} mm) projected over the next 48 hours. Turn off irrigation pumps.`,
      reason: `Rainfall exceeds root-zone infiltration rate. Pausing pumps prevents root hypoxia and fertilizer leaching.`,
      action: 'Conserve water and power; inspect field drainage canals to prevent standing water.',
    };
  } else if (totalForecastRain < 1.5 && current.temperature >= 32) {
    irrigation = {
      title: 'Irrigation Advisory',
      status: 'Increase Delivery (+20%)',
      badgeVariant: 'warning',
      recommendation: `High evapotranspiration rate (${current.temperature}°C, ${current.humidity}% humidity) with negligible rainfall. Increase water application.`,
      reason: `Dry atmospheric conditions will rapidly deplete available soil moisture.`,
      action: 'Run drip irrigation in early dawn (5:00 - 8:00 AM) or sunset to minimize evaporation.',
    };
  } else {
    irrigation = {
      title: 'Irrigation Advisory',
      status: 'Standard Scheduled Delivery',
      badgeVariant: 'forest',
      recommendation: 'Maintain standard scheduled irrigation cycles.',
      reason: 'Ambient temperature and humidity levels align with normal crop water uptake curves.',
      action: 'Operate regular drip or sprinkler cycles calibrated for your current crop growth stage.',
    };
  }

  // 2. Fertilizer Application Guidance
  let fertilizer;
  if (next48hRain >= 10) {
    fertilizer = {
      title: 'Fertilizer Application',
      status: 'Postpone Application',
      badgeVariant: 'danger',
      recommendation: `Rainfall (~${next48hRain.toFixed(1)} mm) expected within 48 hours. High risk of surface runoff and deep nitrogen leaching.`,
      reason: 'Dissolved nutrients will wash off into drainage channels before crop roots can absorb them.',
      action: 'Delay broadcast or soil application until the weather system clears and soil is at field capacity.',
    };
  } else if (current.windSpeed > 20) {
    fertilizer = {
      title: 'Fertilizer Application',
      status: 'Caution (Windy)',
      badgeVariant: 'warning',
      recommendation: `Surface wind speed (${current.windSpeed} km/h) disrupts broadcast spreading uniformity.`,
      reason: 'Granular fertilizer will be blown off-target, creating uneven vegetative growth.',
      action: 'Use banded placement or switch to fertigation via drip lines rather than broadcast broadcasting.',
    };
  } else {
    fertilizer = {
      title: 'Fertilizer Application',
      status: 'Favorable Window',
      badgeVariant: 'success',
      recommendation: 'Optimal soil moisture and wind conditions for top-dressing fertilizer.',
      reason: 'Low wind and moderate soil moisture ensure rapid granule solubilization and root uptake.',
      action: 'Apply scheduled doses (Urea/DAP/MOP) as per crop growth stage recommendations.',
    };
  }

  // 3. Pesticide & Spraying Conditions (STRICT CONSISTENCY ENFORCED)
  let spraying;
  if (day1.expectedRainfall > 1.0 || day1.rainProbability > 35) {
    spraying = {
      title: 'Pesticide & Foliar Spray',
      status: 'Unfavorable (Rain Expected)',
      badgeVariant: 'danger',
      recommendation: `Rainfall projected in spray window (${day1.rainProbability}% probability / ${day1.expectedRainfall} mm rain). High wash-off risk.`,
      reason: 'Chemical active ingredients require 3 to 6 hours of rain-free drying to penetrate leaf tissues.',
      action: 'Postpone all chemical and bio-pesticide sprays until a clear, rain-free window is confirmed.',
    };
  } else if (day1.windSpeedMax > 18) {
    spraying = {
      title: 'Pesticide & Foliar Spray',
      status: 'Unfavorable (High Wind)',
      badgeVariant: 'warning',
      recommendation: `Wind velocity (${day1.windSpeedMax} km/h) exceeds safe spraying thresholds. Critical spray drift risk.`,
      reason: 'Droplets drift off-target, contaminating adjacent parcels and drastically lowering target dosage.',
      action: 'Suspend high-pressure spraying until wind speeds subside below 14 km/h.',
    };
  } else if (day1.windSpeedMax > 14 || day1.rainProbability > 20) {
    spraying = {
      title: 'Pesticide & Foliar Spray',
      status: 'Moderate Window (Caution)',
      badgeVariant: 'neutral',
      recommendation: `Marginal spray window: slight wind (${day1.windSpeedMax} km/h) or low rain probability (${day1.rainProbability}%).`,
      reason: 'Acceptable only with anti-drift nozzles and early morning timing.',
      action: 'Spray strictly between 6:00 AM and 9:00 AM using coarse spray nozzles.',
    };
  } else {
    spraying = {
      title: 'Pesticide & Foliar Spray',
      status: 'Optimal Window',
      badgeVariant: 'success',
      recommendation: `Excellent spraying conditions: calm wind (${day1.windSpeedMax} km/h) and dry weather (<0.5 mm rain).`,
      reason: 'Low wind prevents drift and dry foliage guarantees maximum foliar chemical uptake.',
      action: 'Ideal window for foliar nutrition, micronutrient sprays, and pest management treatments.',
    };
  }

  // 4. Harvest Planning
  let dryStreak = 0;
  for (const day of forecast) {
    if (day.expectedRainfall < 1.0 && day.rainProbability < 30) dryStreak++;
    else break;
  }
  const harvest = {
    title: 'Harvest Planning',
    status: dryStreak >= 3 ? 'Optimal Window' : 'Exercise Caution',
    badgeVariant: dryStreak >= 3 ? 'success' : 'warning',
    recommendation:
      dryStreak >= 3
        ? `Clear ${dryStreak}-day dry window ahead. Ideal conditions for grain, cotton, or pulse harvesting.`
        : 'Intermittent rainfall or high cloud cover will impede field drying of harvested produce.',
    reason:
      dryStreak >= 3
        ? 'Low atmospheric humidity and dry soil enable machinery access and prevent mold in threshed grain.'
        : 'High moisture in cut swaths risks grain discoloration, sprouting, and fungal contamination.',
    action:
      dryStreak >= 3
        ? 'Mobilize combines, harvest labor, and prepare storage facilities for maximum efficiency.'
        : 'Ensure tarpaulins and dry storage are prepared before cutting produce.',
  };

  // 5. Crop Protection Suggestions
  let protection;
  if (current.humidity >= 80 && current.temperature >= 20 && current.temperature <= 32) {
    protection = {
      title: 'Field & Crop Protection',
      status: 'Fungal Risk Alert',
      badgeVariant: 'warning',
      recommendation: 'High humidity combined with warm temperatures stimulates fungal spore germination.',
      reason: 'Microclimate creates optimal leaf-wetness duration for blast, rust, and powdery mildew.',
      action: 'Scout lower crop canopies and check leaf sheaths for brown lesions or fungal spore pustules.',
    };
  } else if (next48hRain >= 20) {
    protection = {
      title: 'Field & Crop Protection',
      status: 'Drainage Preparedness',
      badgeVariant: 'danger',
      recommendation: 'Prepare field waterways and boundary bunds for high storm run-off.',
      reason: 'Excessive rainwater accumulation can wash away topsoil and cause root suffocation.',
      action: 'De-silt tail drains and inspect bund spillways to ensure swift water exit from parcels.',
    };
  } else {
    protection = {
      title: 'Field & Crop Protection',
      status: 'Routine Field Surveillance',
      badgeVariant: 'neutral',
      recommendation: 'Standard field hygiene and canopy surveillance recommended.',
      reason: 'No immediate extreme meteorological hazards detected.',
      action: 'Inspect field borders for weed hosts and verify irrigation drippers are free of sediment.',
    };
  }

  return {
    irrigation,
    fertilizer,
    spraying,
    harvest,
    protection,
    disclaimer:
      'Weather-based farming recommendations are heuristic agronomic decision support aids based on OpenWeather meteorological data and should be verified with local agricultural extension officers.',
  };
}

/**
 * Generate spray suitability forecast matrix across the forecast window
 * Guaranteed consistency: days with rain or high wind are NEVER marked as "Optimal"
 */
export function generateSpraySuitability(forecast) {
  if (!Array.isArray(forecast)) return [];

  return forecast.map((day) => {
    const isWindHigh = day.windSpeedMax > 18;
    const isRainHigh = day.expectedRainfall > 1.0 || day.rainProbability > 35;

    let status = 'Optimal';
    let badgeVariant = 'success';
    let reason = `Calm wind (${day.windSpeedMax} km/h) & dry (<0.5 mm rain)`;

    if (isWindHigh && isRainHigh) {
      status = 'Poor / High Risk';
      badgeVariant = 'danger';
      reason = `High wind (${day.windSpeedMax} km/h) and rain (${day.expectedRainfall} mm)`;
    } else if (isRainHigh) {
      status = 'Unfavorable';
      badgeVariant = 'danger';
      reason = `Rain risk (${day.rainProbability}% prob / ${day.expectedRainfall} mm rain) causes wash-off`;
    } else if (isWindHigh) {
      status = 'Unfavorable';
      badgeVariant = 'warning';
      reason = `Windy (${day.windSpeedMax} km/h) - spray drift hazard`;
    } else if (day.windSpeedMax > 14 || day.rainProbability > 20) {
      status = 'Moderate';
      badgeVariant = 'neutral';
      reason = `Marginal wind (${day.windSpeedMax} km/h) or rain chance (${day.rainProbability}%)`;
    }

    return {
      date: day.date,
      day: day.day,
      formattedDate: day.formattedDate,
      status,
      badgeVariant,
      windSpeed: day.windSpeedMax,
      rainProbability: day.rainProbability,
      expectedRainfall: day.expectedRainfall,
      reason,
    };
  });
}

/**
 * Calculate Growing Degree Days (GDD) dynamically using actual OpenWeather temperature data
 * Formula: GDD = max(0, ((Tmax + Tmin) / 2) - Base Temperature)
 */
export function calculateGDD(forecast, baseTemp = 10) {
  if (!Array.isArray(forecast) || forecast.length === 0) {
    return {
      baseTemperature: baseTemp,
      totalGDD: 0,
      dailyGDD: [],
      accumulationStartDate: null,
      calculationPeriod: 'No valid daily data',
      explanation: 'GDD calculation requires valid daily temperature records.',
    };
  }

  let accumulatedGDD = 0;
  const dailyGDD = forecast.map((day) => {
    const meanTemp = (day.tempMax + day.tempMin) / 2;
    const gdd = Math.max(0, Math.round((meanTemp - baseTemp) * 10) / 10);
    accumulatedGDD += gdd;
    return {
      date: day.date,
      day: day.day,
      formattedDate: day.formattedDate,
      tempMax: day.tempMax,
      tempMin: day.tempMin,
      meanTemp: Math.round(meanTemp * 10) / 10,
      gdd,
      cumulativeGDD: Math.round(accumulatedGDD * 10) / 10,
    };
  });

  return {
    baseTemperature: baseTemp,
    baseTemp,
    unit: '°C',
    totalGDD: Math.round(accumulatedGDD * 10) / 10,
    sevenDayTotalGDD: Math.round(accumulatedGDD * 10) / 10,
    periodTotalGDD: Math.round(accumulatedGDD * 10) / 10,
    periodDays: forecast.length,
    accumulationStartDate: forecast[0].formattedDate,
    calculationPeriod: `${forecast.length}-Day Rolling Forecast Window`,
    dailyGDD,
    explanation: `Growing Degree Days (GDD) quantify thermal heat accumulation above crop developmental baseline (Tbase = ${baseTemp}°C). Baseline thresholds vary by crop species: Wheat (4.5°C), Rice & Maize (10°C), Cotton (12°C).`,
  };
}

/**
 * Generate Weather-Related Crop Risk Indicators
 */
export function calculateCropRiskIndicators(current, forecast) {
  // 1. Fungal Pathogen Incubation Risk
  let fungalRisk = 'Low';
  let fungalScore = 20;
  if (current.humidity >= 80 && current.temperature >= 20 && current.temperature <= 32) {
    fungalRisk = 'High';
    fungalScore = 85;
  } else if (current.humidity >= 65 && current.temperature >= 18) {
    fungalRisk = 'Moderate';
    fungalScore = 55;
  }

  // 2. Soil Evaporation / Moisture Depletion Risk
  let evaporationRisk = 'Low';
  let evaporationScore = 30;
  if (current.temperature > 34 || (current.temperature > 30 && current.windSpeed > 18)) {
    evaporationRisk = 'High';
    evaporationScore = 85;
  } else if (current.temperature > 28 || current.windSpeed > 14) {
    evaporationRisk = 'Moderate';
    evaporationScore = 55;
  }

  // 3. Ambient Heat Stress Index
  let heatStress = 'Normal';
  let heatScore = 25;
  if (current.temperature >= 38) {
    heatStress = 'Severe';
    heatScore = 95;
  } else if (current.temperature >= 33) {
    heatStress = 'Moderate';
    heatScore = 60;
  }

  return {
    fungalRisk: { level: fungalRisk, score: fungalScore },
    evaporationRisk: { level: evaporationRisk, score: evaporationScore },
    heatStress: { level: heatStress, score: heatScore },
  };
}

/**
 * Main Agricultural Weather Service Method
 * Retrieves, caches, and calculates full agricultural advisory
 */
export async function getAgriculturalWeather(latitude, longitude, farm = null) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    const error = new Error('Invalid coordinates: latitude must be [-90, 90] and longitude [-180, 180]');
    error.statusCode = 400;
    throw error;
  }

  // Coordinate bucket for 15-minute caching
  const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      isCached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
      retrievedAt: new Date().toISOString(),
    };
  }

  logger.info(`Fetching live meteorological weather from OpenWeather for: lat=${lat}, lon=${lon}`);
  const raw = await fetchRawOpenWeatherData(lat, lon);

  const alerts = generateAgriculturalAlerts(raw.current, raw.forecast, raw.officialAlerts);
  const recommendations = generateFarmingRecommendations(raw.current, raw.forecast);
  const spraySuitability = generateSpraySuitability(raw.forecast);
  const gdd = calculateGDD(raw.forecast);
  const cropRisks = calculateCropRiskIndicators(raw.current, raw.forecast);

  // Rainfall summary across available forecast
  const totalRainfall = raw.forecast.reduce((acc, d) => acc + (d.expectedRainfall || 0), 0);
  const rainyDaysCount = raw.forecast.filter((d) => (d.expectedRainfall || 0) >= 0.5).length;

  const result = {
    provider: raw.provider,
    timezone: raw.timezone,
    timezoneOffset: raw.timezoneOffset,
    city: raw.city,
    country: raw.country,
    coverage: raw.coverage,
    coordinates: { latitude: lat, longitude: lon },
    farm: farm
      ? {
          id: farm._id || farm.id,
          name: farm.name,
          location: farm.location,
          district: farm.district,
          state: farm.state,
          acreage: farm.acreage || farm.totalAcreage,
          soilType: farm.soilType,
          mainCrops: farm.mainCrops,
        }
      : null,
    current: raw.current,
    forecast: raw.forecast,
    alerts,
    recommendations,
    spraySuitability,
    gdd,
    cropRisks,
    rainfallSummary: {
      totalRainfallMm: Math.round(totalRainfall * 10) / 10,
      sevenDayTotalMm: Math.round(totalRainfall * 10) / 10,
      totalMm: Math.round(totalRainfall * 10) / 10,
      rainyDaysCount,
      periodDays: raw.forecast.length,
    },
    retrievedAt: new Date().toISOString(),
    isCached: false,
  };

  // Cache normalized result
  weatherCache.set(cacheKey, {
    timestamp: Date.now(),
    data: result,
  });

  return result;
}

/**
 * Clear in-memory weather cache (primarily for tests)
 */
export function clearWeatherCache() {
  weatherCache.clear();
}

export default {
  getAgriculturalWeather,
  fetchRawOpenWeatherData,
  parseOpenWeatherPayload,
  generateAgriculturalAlerts,
  generateFarmingRecommendations,
  generateSpraySuitability,
  calculateGDD,
  calculateCropRiskIndicators,
  formatEpochToLocalDate,
  formatEpochToWeekday,
  formatEpochToMonthDay,
  formatEpochToTime,
  getCompassDirection,
  clearWeatherCache,
};
