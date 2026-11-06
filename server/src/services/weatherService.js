import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// In-memory weather cache (15-minute TTL per coordinate bucket)
const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// WMO Weather interpretation codes standard
const WMO_CODE_MAP = {
  0: { label: 'Clear sky', icon: 'sun', severity: 'normal' },
  1: { label: 'Mainly clear', icon: 'sun-cloud', severity: 'normal' },
  2: { label: 'Partly cloudy', icon: 'cloud-sun', severity: 'normal' },
  3: { label: 'Overcast', icon: 'cloud', severity: 'normal' },
  45: { label: 'Foggy', icon: 'cloud-fog', severity: 'warning' },
  48: { label: 'Depositing rime fog', icon: 'cloud-fog', severity: 'warning' },
  51: { label: 'Light drizzle', icon: 'cloud-drizzle', severity: 'info' },
  53: { label: 'Moderate drizzle', icon: 'cloud-drizzle', severity: 'info' },
  55: { label: 'Dense drizzle', icon: 'cloud-drizzle', severity: 'warning' },
  56: { label: 'Light freezing drizzle', icon: 'cloud-snow', severity: 'warning' },
  57: { label: 'Dense freezing drizzle', icon: 'cloud-snow', severity: 'danger' },
  61: { label: 'Slight rain', icon: 'cloud-rain', severity: 'info' },
  63: { label: 'Moderate rain', icon: 'cloud-rain', severity: 'warning' },
  65: { label: 'Heavy rain', icon: 'cloud-rain', severity: 'danger' },
  66: { label: 'Light freezing rain', icon: 'cloud-snow', severity: 'danger' },
  67: { label: 'Heavy freezing rain', icon: 'cloud-snow', severity: 'danger' },
  71: { label: 'Slight snow fall', icon: 'snowflake', severity: 'warning' },
  73: { label: 'Moderate snow fall', icon: 'snowflake', severity: 'warning' },
  75: { label: 'Heavy snow fall', icon: 'snowflake', severity: 'danger' },
  77: { label: 'Snow grains', icon: 'snowflake', severity: 'warning' },
  80: { label: 'Slight rain showers', icon: 'cloud-rain', severity: 'info' },
  81: { label: 'Moderate rain showers', icon: 'cloud-rain', severity: 'warning' },
  82: { label: 'Violent rain showers', icon: 'cloud-lightning', severity: 'danger' },
  85: { label: 'Slight snow showers', icon: 'snowflake', severity: 'warning' },
  86: { label: 'Heavy snow showers', icon: 'snowflake', severity: 'danger' },
  95: { label: 'Thunderstorm', icon: 'cloud-lightning', severity: 'danger' },
  96: { label: 'Thunderstorm with slight hail', icon: 'cloud-lightning', severity: 'danger' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'cloud-lightning', severity: 'danger' },
};

function getCompassDirection(degrees) {
  if (degrees === null || degrees === undefined) return 'N/A';
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const idx = Math.round((degrees % 360) / 22.5) % 16;
  return directions[idx];
}

function getWeatherCondition(code) {
  return WMO_CODE_MAP[code] || { label: 'Variable conditions', icon: 'cloud', severity: 'normal' };
}

/**
 * Fetch raw meteorological data from Open-Meteo or OpenWeather
 */
async function fetchRawWeatherData(latitude, longitude) {
  const provider = (env.WEATHER_PROVIDER || 'open-meteo').toLowerCase();

  // If OpenWeather provider is requested
  if (provider === 'openweather') {
    const apiKey = env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      const err = new Error(
        'Weather API key is not configured in server/.env. Please configure OPENWEATHER_API_KEY to access live weather advisories, or set WEATHER_PROVIDER=open-meteo.'
      );
      err.code = 'WEATHER_API_KEY_MISSING';
      err.statusCode = 503;
      throw err;
    }

    // Call OpenWeatherMap 5 day / 3 hour forecast + current weather
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

    const [currentRes, forecastRes] = await Promise.all([
      fetch(currentWeatherUrl, { signal: AbortSignal.timeout(8000) }),
      fetch(forecastUrl, { signal: AbortSignal.timeout(8000) }),
    ]);

    if (!currentRes.ok || !forecastRes.ok) {
      const err = new Error(
        `OpenWeather API request failed with status: ${currentRes.status || forecastRes.status}`
      );
      err.statusCode = currentRes.status || 502;
      throw err;
    }

    const currentData = await currentRes.json();
    const forecastData = await forecastRes.json();

    return parseOpenWeatherData(currentData, forecastData);
  }

  // Default: Open-Meteo provider (global ECMWF/GFS physics model, high resolution, no API key required)
  const openMeteoUrl = new URL('https://api.open-meteo.com/v1/forecast');
  openMeteoUrl.searchParams.set('latitude', latitude);
  openMeteoUrl.searchParams.set('longitude', longitude);
  openMeteoUrl.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m'
  );
  openMeteoUrl.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant'
  );
  openMeteoUrl.searchParams.set('timezone', 'auto');

  const response = await fetch(openMeteoUrl.toString(), {
    signal: AbortSignal.timeout(9000),
  });

  if (!response.ok) {
    const err = new Error(`Weather service returned HTTP ${response.status}: ${response.statusText}`);
    err.statusCode = response.status === 400 ? 400 : 502;
    throw err;
  }

  const data = await response.json();
  return parseOpenMeteoData(data);
}

function parseOpenMeteoData(data) {
  const current = data.current;
  const daily = data.daily;

  const currentCondition = getWeatherCondition(current.weather_code);

  const currentWeather = {
    temperature: Math.round(current.temperature_2m * 10) / 10,
    feelsLike: Math.round(current.apparent_temperature * 10) / 10,
    humidity: current.relative_humidity_2m,
    weatherCode: current.weather_code,
    condition: currentCondition.label,
    icon: currentCondition.icon,
    windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
    windDirectionDeg: current.wind_direction_10m,
    windDirection: getCompassDirection(current.wind_direction_10m),
    rainfall: current.precipitation !== undefined ? current.precipitation : current.rain || 0,
    pressure: Math.round(current.surface_pressure),
    sunrise: daily.sunrise && daily.sunrise[0] ? daily.sunrise[0] : null,
    sunset: daily.sunset && daily.sunset[0] ? daily.sunset[0] : null,
    timestamp: current.time,
  };

  const dailyForecast = [];
  const daysCount = Math.min(daily.time.length, 7);

  for (let i = 0; i < daysCount; i++) {
    const dateStr = daily.time[i];
    const dateObj = new Date(dateStr);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const code = daily.weather_code[i];
    const condition = getWeatherCondition(code);

    dailyForecast.push({
      date: dateStr,
      day: dayName,
      formattedDate,
      weatherCode: code,
      condition: condition.label,
      icon: condition.icon,
      tempMin: Math.round(daily.temperature_2m_min[i] * 10) / 10,
      tempMax: Math.round(daily.temperature_2m_max[i] * 10) / 10,
      rainProbability: daily.precipitation_probability_max[i] || 0,
      expectedRainfall: Math.round((daily.precipitation_sum[i] || 0) * 10) / 10,
      windSpeedMax: Math.round((daily.wind_speed_10m_max[i] || 0) * 10) / 10,
      windDirection: getCompassDirection(daily.wind_direction_10m_dominant[i]),
      sunrise: daily.sunrise[i] || null,
      sunset: daily.sunset[i] || null,
    });
  }

  return {
    provider: 'Open-Meteo (ECMWF/GFS Physics Model)',
    timezone: data.timezone,
    elevation: data.elevation,
    current: currentWeather,
    forecast: dailyForecast,
  };
}

function parseOpenWeatherData(current, forecast) {
  const currentCondition = current.weather[0] || {};
  const currentWeather = {
    temperature: Math.round(current.main.temp * 10) / 10,
    feelsLike: Math.round(current.main.feels_like * 10) / 10,
    humidity: current.main.humidity,
    weatherCode: currentCondition.id,
    condition: currentCondition.description || currentCondition.main || 'Variable',
    icon: 'cloud-sun',
    windSpeed: Math.round(current.wind.speed * 3.6 * 10) / 10, // m/s to km/h
    windDirectionDeg: current.wind.deg,
    windDirection: getCompassDirection(current.wind.deg),
    rainfall: current.rain ? current.rain['1h'] || 0 : 0,
    pressure: current.main.pressure,
    sunrise: new Date(current.sys.sunrise * 1000).toISOString(),
    sunset: new Date(current.sys.sunset * 1000).toISOString(),
    timestamp: new Date().toISOString(),
  };

  // Group forecast by day
  const dailyMap = new Map();
  forecast.list.forEach((item) => {
    const dateKey = item.dt_txt.split(' ')[0];
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, []);
    }
    dailyMap.get(dateKey).push(item);
  });

  const dailyForecast = [];
  Array.from(dailyMap.entries())
    .slice(0, 7)
    .forEach(([dateStr, items]) => {
      const temps = items.map((it) => it.main.temp);
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      const midItem = items[Math.floor(items.length / 2)] || items[0];
      const popMax = Math.max(...items.map((it) => it.pop || 0)) * 100;
      const rainSum = items.reduce((acc, it) => acc + (it.rain?.['3h'] || 0), 0);
      const windMax = Math.max(...items.map((it) => (it.wind?.speed || 0) * 3.6));

      const dateObj = new Date(dateStr);
      dailyForecast.push({
        date: dateStr,
        day: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        formattedDate: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weatherCode: midItem.weather[0]?.id || 800,
        condition: midItem.weather[0]?.description || 'Partly Cloudy',
        icon: 'cloud-sun',
        tempMin: Math.round(minTemp * 10) / 10,
        tempMax: Math.round(maxTemp * 10) / 10,
        rainProbability: Math.round(popMax),
        expectedRainfall: Math.round(rainSum * 10) / 10,
        windSpeedMax: Math.round(windMax * 10) / 10,
        windDirection: getCompassDirection(midItem.wind?.deg),
        sunrise: currentWeather.sunrise,
        sunset: currentWeather.sunset,
      });
    });

  return {
    provider: 'OpenWeatherMap OneCall/Forecast',
    timezone: forecast.city?.timezone || 'UTC',
    elevation: 0,
    current: currentWeather,
    forecast: dailyForecast,
  };
}

/**
 * Generate practical Agricultural Weather Alerts from real weather metrics
 */
function generateAgriculturalAlerts(current, forecast) {
  const alerts = [];

  // 1. Heavy Rainfall Alert
  const maxRainDay = forecast.reduce(
    (max, d) => (d.expectedRainfall > (max?.expectedRainfall || 0) ? d : max),
    null
  );
  if (current.rainfall >= 20 || (maxRainDay && maxRainDay.expectedRainfall >= 25)) {
    alerts.push({
      id: 'alert-heavy-rain',
      type: 'rainfall',
      title: 'Heavy Rainfall Warning',
      severity: 'danger',
      message: `Significant rainfall detected (${maxRainDay?.expectedRainfall || current.rainfall} mm expected on ${maxRainDay?.day || 'today'}). Risk of waterlogging, root suffocation, and nitrogen leaching. Ensure field drainage canals are clear.`,
    });
  } else if (maxRainDay && maxRainDay.expectedRainfall >= 12) {
    alerts.push({
      id: 'alert-moderate-rain',
      type: 'rainfall',
      title: 'Moderate Rainfall Advisory',
      severity: 'warning',
      message: `Precipitation of ${maxRainDay.expectedRainfall} mm forecast for ${maxRainDay.day}. Postpone scheduled pesticide and foliar fertilizer sprays.`,
    });
  }

  // 2. Strong Winds & Storm Alert
  const maxWindDay = forecast.reduce(
    (max, d) => (d.windSpeedMax > (max?.windSpeedMax || 0) ? d : max),
    null
  );
  if (current.windSpeed >= 35 || (maxWindDay && maxWindDay.windSpeedMax >= 35)) {
    alerts.push({
      id: 'alert-strong-wind',
      type: 'wind',
      title: 'High Wind Velocity & Storm Alert',
      severity: 'warning',
      message: `Wind gusts up to ${maxWindDay?.windSpeedMax || current.windSpeed} km/h anticipated. Severe risk of lodging in tall crops (paddy, sugarcane, maize). Immediately suspend high-pressure spraying operations to avoid drift.`,
    });
  }

  // 3. Heatwave & High Thermal Stress Alert
  const maxTempDay = forecast.reduce(
    (max, d) => (d.tempMax > (max?.tempMax || 0) ? d : max),
    null
  );
  if (current.temperature >= 38 || (maxTempDay && maxTempDay.tempMax >= 38)) {
    alerts.push({
      id: 'alert-heatwave',
      type: 'heat',
      title: 'Extreme Heatwave Advisory',
      severity: 'danger',
      message: `Daytime maximum temperatures reaching ${maxTempDay?.tempMax || current.temperature}°C. Severe evapotranspiration stress. Apply micro-irrigation during early dawn or late twilight to prevent flower abortion and leaf scorch.`,
    });
  } else if (current.temperature >= 34 || (maxTempDay && maxTempDay.tempMax >= 34)) {
    alerts.push({
      id: 'alert-warm-temp',
      type: 'heat',
      title: 'Elevated Ambient Temperature',
      severity: 'warning',
      message: `Daytime temperatures peak around ${maxTempDay?.tempMax || current.temperature}°C. Accelerates crop transpiration; monitor topsoil moisture.`,
    });
  }

  // 4. Frost & Low Temperature Alert
  const minTempDay = forecast.reduce(
    (min, d) => (d.tempMin < (min?.tempMin !== undefined ? min.tempMin : 99) ? d : min),
    null
  );
  if (current.temperature <= 4 || (minTempDay && minTempDay.tempMin <= 5)) {
    alerts.push({
      id: 'alert-frost',
      type: 'frost',
      title: 'Frost & Chilling Injury Warning',
      severity: 'danger',
      message: `Night temperatures dropping to ${minTempDay?.tempMin || current.temperature}°C. Frost conditions can damage sensitive horticultural blooms and vegetable seedlings. Provide light night irrigation or straw mulching.`,
    });
  }

  // 5. High Humidity & Fungal Pathogen Incubation Alert
  if (current.humidity >= 80 && current.temperature >= 22) {
    alerts.push({
      id: 'alert-fungal-humidity',
      type: 'humidity',
      title: 'Fungal Disease Risk Alert',
      severity: 'warning',
      message: `Sustained relative humidity of ${current.humidity}% combined with ${current.temperature}°C creates favorable conditions for fungal blast, rust spores, and powdery mildew. Scout vulnerable crop canopies closely.`,
    });
  }

  // 6. Dry Spell & Drought Alert
  const total7DayRain = forecast.reduce((acc, d) => acc + (d.expectedRainfall || 0), 0);
  if (total7DayRain < 1.0 && (maxTempDay?.tempMax || current.temperature) >= 30) {
    alerts.push({
      id: 'alert-dry-spell',
      type: 'drought',
      title: 'Dry Spell / Soil Moisture Depletion',
      severity: 'info',
      message: `Dry weather projected across next 7 days (${total7DayRain.toFixed(1)} mm total precipitation). Plan systematic irrigation rotations to maintain root-zone field capacity.`,
    });
  }

  return alerts;
}

/**
 * Generate actionable agricultural recommendations based on actual weather
 */
function generateFarmingRecommendations(current, forecast) {
  const next48hRain = forecast.slice(0, 2).reduce((acc, d) => acc + (d.expectedRainfall || 0), 0);
  const total7DayRain = forecast.reduce((acc, d) => acc + (d.expectedRainfall || 0), 0);
  const maxWindNext48h = Math.max(...forecast.slice(0, 2).map((d) => d.windSpeedMax || 0));

  // 1. Irrigation Recommendation
  let irrigation = {
    title: 'Irrigation Advisory',
    status: 'Normal',
    badgeVariant: 'forest',
    recommendation: 'Maintain standard scheduled irrigation cycles.',
    action: 'Standard drip/sprinkler run times suitable for active crops.',
  };
  if (next48hRain >= 15) {
    irrigation = {
      title: 'Irrigation Advisory',
      status: 'Postpone / Hold',
      badgeVariant: 'danger',
      recommendation: `Substantial precipitation (~${next48hRain.toFixed(1)} mm) projected over the next 48 hours. Hold irrigation pumps.`,
      action: 'Conserve water, avoid waterlogging, and protect root aeration by pausing automated pump runs.',
    };
  } else if (total7DayRain < 2 && current.temperature > 32) {
    irrigation = {
      title: 'Irrigation Advisory',
      status: 'Increase Delivery',
      badgeVariant: 'warning',
      recommendation: 'High evapotranspiration rate with minimal rainfall. Increase irrigation frequency by 20-25%.',
      action: 'Run drip irrigation during early dawn (5:00 AM - 8:00 AM) or sunset to reduce evaporation.',
    };
  }

  // 2. Fertilizer Application Recommendation
  let fertilizer = {
    title: 'Fertilizer Application',
    status: 'Favorable',
    badgeVariant: 'success',
    recommendation: 'Optimal soil moisture and wind conditions for top-dressing fertilizer.',
    action: 'Broadcast or fertigate urea, DAP, or MOP according to your crop growth stage schedule.',
  };
  if (next48hRain >= 12) {
    fertilizer = {
      title: 'Fertilizer Application',
      status: 'Postpone Application',
      badgeVariant: 'danger',
      recommendation: 'Heavy rainfall expected within 48 hours. High risk of nutrient runoff and deep leaching.',
      action: 'Delay fertilizer application until after the rainfall event has passed and soil is well-drained.',
    };
  } else if (current.windSpeed > 22) {
    fertilizer = {
      title: 'Fertilizer Application',
      status: 'Moderate Caution',
      badgeVariant: 'warning',
      recommendation: 'Gusty surface winds may cause uneven granular dispersion.',
      action: 'Apply granular fertilizers using banded placement or switch to drip fertigation.',
    };
  }

  // 3. Pesticide & Spraying Conditions
  let spraying = {
    title: 'Pesticide & Foliar Spray',
    status: 'Optimal Window',
    badgeVariant: 'success',
    recommendation: 'Excellent spraying conditions: low wind and zero rain forecasted for the next 24 hours.',
    action: 'Ideal window for foliar micro-nutrients, bio-pesticides, and crop defense sprays.',
  };
  if (maxWindNext48h > 20) {
    spraying = {
      title: 'Pesticide & Foliar Spray',
      status: 'Unfavorable (High Wind)',
      badgeVariant: 'danger',
      recommendation: `Wind speeds reach ${maxWindNext48h} km/h. High risk of droplet drift and off-target contamination.`,
      action: 'Postpone spraying until wind drops below 15 km/h to guarantee canopy adhesion.',
    };
  } else if (next48hRain >= 5) {
    spraying = {
      title: 'Pesticide & Foliar Spray',
      status: 'Unfavorable (Rain Expected)',
      badgeVariant: 'warning',
      recommendation: 'Precipitation expected within 24-48 hours will wash off foliar chemicals before absorption.',
      action: 'Wait for clear weather window or use rain-fast systemic adjuvants if emergency treatment is required.',
    };
  }

  // 4. Harvest Planning
  let dryStreak = 0;
  for (const day of forecast) {
    if (day.expectedRainfall < 1.0 && day.rainProbability < 30) dryStreak++;
    else break;
  }
  let harvest = {
    title: 'Harvest Planning',
    status: dryStreak >= 3 ? 'Optimal Window' : 'Exercise Caution',
    badgeVariant: dryStreak >= 3 ? 'success' : 'warning',
    recommendation:
      dryStreak >= 3
        ? `Clear ${dryStreak}-day dry window ahead. Ideal for harvesting mature grains, cotton, or pulses.`
        : 'Intermittent rainfall or cloud cover may delay field drying of harvested produce.',
    action:
      dryStreak >= 3
        ? 'Schedule combines, labor, and threshing equipment for maximum efficiency.'
        : 'Ensure tarpaulins and dry storage are ready before cutting produce.',
  };

  // 5. Crop Protection Suggestions
  let protection = {
    title: 'Field & Crop Protection',
    status: 'Routine Maintenance',
    badgeVariant: 'neutral',
    recommendation: 'Standard field hygiene and canopy surveillance recommended.',
    action: 'Inspect field borders for weed hosts and check irrigation drippers for sediment clogging.',
  };
  if (current.humidity > 80 && current.temperature > 24) {
    protection = {
      title: 'Field & Crop Protection',
      status: 'Fungal Alert',
      badgeVariant: 'warning',
      recommendation: 'Elevated fungal spore development conditions. Scout inner crop canopy.',
      action: 'Check bottom leaves of rice/cotton/chili for brown spots, rust, or powdery mildew.',
    };
  } else if (next48hRain >= 20) {
    protection = {
      title: 'Field & Crop Protection',
      status: 'Drainage Preparedness',
      badgeVariant: 'danger',
      recommendation: 'Prepare field waterways for high storm run-off.',
      action: 'De-silt tail drains and inspect bund spillways to prevent parcel overflowing.',
    };
  }

  return {
    irrigation,
    fertilizer,
    spraying,
    harvest,
    protection,
  };
}

/**
 * Generate 7-day spray suitability forecast matrix
 */
function generateSpraySuitability(forecast) {
  return forecast.map((day) => {
    const isWindHigh = day.windSpeedMax > 20;
    const isRainHigh = day.rainProbability > 40 || day.expectedRainfall > 2.0;

    let status = 'Optimal';
    let badgeVariant = 'success';
    let reason = 'Low wind & dry conditions';

    if (isWindHigh && isRainHigh) {
      status = 'Poor';
      badgeVariant = 'danger';
      reason = 'High wind & rain probability';
    } else if (isWindHigh) {
      status = 'Unfavorable';
      badgeVariant = 'warning';
      reason = `Windy (${day.windSpeedMax} km/h) - drift risk`;
    } else if (isRainHigh) {
      status = 'Unfavorable';
      badgeVariant = 'warning';
      reason = `Rain risk (${day.rainProbability}% / ${day.expectedRainfall} mm)`;
    } else if (day.windSpeedMax > 15 || day.rainProbability > 25) {
      status = 'Moderate';
      badgeVariant = 'neutral';
      reason = 'Marginal wind or humidity';
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
 * Calculate Growing Degree Days (GDD) with Base Temp = 10°C
 */
function calculateGDD(forecast, baseTemp = 10) {
  let accumulatedGDD = 0;
  const dailyGDD = forecast.map((day) => {
    const meanTemp = (day.tempMax + day.tempMin) / 2;
    const gdd = Math.max(0, Math.round((meanTemp - baseTemp) * 10) / 10);
    accumulatedGDD += gdd;
    return {
      date: day.date,
      day: day.day,
      meanTemp: Math.round(meanTemp * 10) / 10,
      gdd,
      accumulatedGDD: Math.round(accumulatedGDD * 10) / 10,
    };
  });

  return {
    baseTemperature: baseTemp,
    sevenDayTotalGDD: Math.round(accumulatedGDD * 10) / 10,
    dailyGDD,
  };
}

/**
 * Generate Weather-Related Crop Risk Indicators
 */
function calculateCropRiskIndicators(current, forecast) {
  // Fungal Risk
  let fungalRisk = 'Low';
  let fungalScore = 20;
  if (current.humidity > 80 && current.temperature >= 22) {
    fungalRisk = 'High';
    fungalScore = 85;
  } else if (current.humidity > 65 && current.temperature >= 20) {
    fungalRisk = 'Moderate';
    fungalScore = 55;
  }

  // Soil Evaporation Loss Rate
  let evaporationRisk = 'Low';
  let evaporationScore = 30;
  if (current.temperature > 34 || (current.temperature > 30 && current.windSpeed > 18)) {
    evaporationRisk = 'High';
    evaporationScore = 80;
  } else if (current.temperature > 28 || current.windSpeed > 14) {
    evaporationRisk = 'Moderate';
    evaporationScore = 50;
  }

  // Heat Stress Index
  let heatStress = 'Normal';
  let heatScore = 25;
  if (current.temperature >= 38) {
    heatStress = 'Severe';
    heatScore = 90;
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
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      ...cached.data,
      isCached: true,
      cachedAt: new Date(cached.timestamp).toISOString(),
    };
  }

  logger.info(`Fetching live meteorological weather from provider for: lat=${lat}, lon=${lon}`);
  const raw = await fetchRawWeatherData(lat, lon);

  const alerts = generateAgriculturalAlerts(raw.current, raw.forecast);
  const recommendations = generateFarmingRecommendations(raw.current, raw.forecast);
  const spraySuitability = generateSpraySuitability(raw.forecast);
  const gdd = calculateGDD(raw.forecast);
  const cropRisks = calculateCropRiskIndicators(raw.current, raw.forecast);

  // Rainfall summary
  const totalRainfall = raw.forecast.reduce((acc, d) => acc + (d.expectedRainfall || 0), 0);
  const rainyDaysCount = raw.forecast.filter((d) => (d.expectedRainfall || 0) >= 0.5).length;

  const result = {
    provider: raw.provider,
    timezone: raw.timezone,
    coordinates: { latitude: lat, longitude: lon },
    farm: farm
      ? {
          id: farm._id,
          name: farm.name,
          location: farm.location,
          district: farm.district,
          state: farm.state,
          acreage: farm.acreage,
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
      sevenDayTotalMm: Math.round(totalRainfall * 10) / 10,
      rainyDaysCount,
    },
    fetchedAt: new Date().toISOString(),
  };

  // Cache in memory
  weatherCache.set(cacheKey, {
    timestamp: Date.now(),
    data: result,
  });

  return result;
}

export default {
  getAgriculturalWeather,
};
