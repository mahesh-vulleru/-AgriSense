import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import { connectDB } from '../src/config/db.js';
import {
  parseOpenWeatherPayload,
  generateAgriculturalAlerts,
  generateFarmingRecommendations,
  generateSpraySuitability,
  calculateGDD,
  calculateCropRiskIndicators,
  formatEpochToLocalDate,
  formatEpochToWeekday,
  formatEpochToMonthDay,
} from '../src/services/weatherService.js';

describe('AgriSense OpenWeather Integration & Advisory Module Test Suite', () => {
  let server;
  let baseUrl;
  let farmerToken = '';
  let otherFarmerToken = '';
  let farmWithCoordsId = '';
  let farmWithoutCoordsId = '';
  let otherFarmId = '';

  const testEmail = `weather_farmer_${Date.now()}@agrisense.test`;
  const otherEmail = `weather_other_${Date.now()}@agrisense.test`;
  const testPassword = 'Password123!';

  before(async () => {
    await connectDB();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 1. Register primary test farmer
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'OpenWeather Test Farmer',
        email: testEmail,
        password: testPassword,
        role: 'farmer',
        location: 'Guntur, Andhra Pradesh',
      }),
    });
    const regData = await regRes.json();
    farmerToken = regData.token;

    // 2. Register secondary farmer for IDOR isolation check
    const otherRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Other Regional Farmer',
        email: otherEmail,
        password: testPassword,
        role: 'farmer',
        location: 'Kurnool, Andhra Pradesh',
      }),
    });
    const otherData = await otherRes.json();
    otherFarmerToken = otherData.token;

    // 3. Create a farm with valid coordinates (Guntur: 16.3584, 80.5338)
    const farmWithCoordsRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Guntur Chilli & Cotton Parcel',
        location: 'Chebrolu, Guntur, AP',
        acreage: 22.5,
        soilType: 'Black',
        irrigationType: 'Drip',
        coordinates: { latitude: 16.3584, longitude: 80.5338 },
      }),
    });
    const farmWithCoordsData = await farmWithCoordsRes.json();
    farmWithCoordsId = (farmWithCoordsData.farm?._id || farmWithCoordsData.farm?.id || '').toString();

    // 4. Create a farm without coordinates
    const farmWithoutCoordsRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Paddy Field Without Coordinates',
        location: 'Tenali, Guntur, AP',
        acreage: 15.0,
        soilType: 'Alluvial',
        irrigationType: 'Flood',
      }),
    });
    const farmWithoutCoordsData = await farmWithoutCoordsRes.json();
    farmWithoutCoordsId = (farmWithoutCoordsData.farm?._id || farmWithoutCoordsData.farm?.id || '').toString();

    // 5. Create a farm owned by the other farmer
    const otherFarmRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherFarmerToken}`,
      },
      body: JSON.stringify({
        name: 'Kurnool Groundnut Estate',
        location: 'Nandyal, Kurnool',
        acreage: 30.0,
        soilType: 'Red',
        irrigationType: 'Sprinkler',
        coordinates: { latitude: 15.4859, longitude: 78.4842 },
      }),
    });
    const otherFarmData = await otherFarmRes.json();
    otherFarmId = (otherFarmData.farm?._id || otherFarmData.farm?.id || '').toString();
  });

  after(async () => {
    await Farm.deleteMany({ _id: { $in: [farmWithCoordsId, farmWithoutCoordsId, otherFarmId] } });
    await User.deleteMany({ email: { $in: [testEmail, otherEmail] } });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // 1. ENDPOINT AUTHENTICATION & ACCESS CONTROL TESTS
  // =========================================================================

  it('1. Should reject unauthenticated request to /api/weather/farms-summary with 401', async () => {
    const res = await fetch(`${baseUrl}/weather/farms-summary`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('2. Should reject unauthenticated request to /api/weather/farm/:id with 401', async () => {
    const res = await fetch(`${baseUrl}/weather/farm/${farmWithCoordsId}`);
    assert.equal(res.status, 401);
  });

  it('3. Should return farms summary for authenticated farmer with coordinate availability status', async () => {
    const res = await fetch(`${baseUrl}/weather/farms-summary`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.count >= 2);

    const farmWithGps = data.farms.find((f) => f.id === farmWithCoordsId);
    assert.ok(farmWithGps);
    assert.equal(farmWithGps.hasCoordinates, true);
    assert.equal(farmWithGps.coordinates.latitude, 16.3584);
    assert.equal(farmWithGps.coordinates.longitude, 80.5338);

    const farmWithoutGps = data.farms.find((f) => f.id === farmWithoutCoordsId);
    assert.ok(farmWithoutGps);
    assert.equal(farmWithoutGps.hasCoordinates, false);
  });

  it('4. Should reject weather request for malformed farm ID with 400', async () => {
    const res = await fetch(`${baseUrl}/weather/farm/invalid-farm-id-123`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('5. Should return 404 when requested farm does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/weather/farm/${fakeId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 404);
  });

  it('6. Should strictly enforce IDOR protection: Farmer cannot access weather for another farmer farm (403)', async () => {
    const res = await fetch(`${baseUrl}/weather/farm/${otherFarmId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('7. Should return COORDINATES_MISSING when farm coordinates are null', async () => {
    const res = await fetch(`${baseUrl}/weather/farm/${farmWithoutCoordsId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.code, 'COORDINATES_MISSING');
    assert.ok(data.farm);
    assert.equal(data.farm.name, 'Paddy Field Without Coordinates');
  });

  it('8. Should update farm coordinates via PATCH /api/weather/farm/:id/coordinates and persist to MongoDB', async () => {
    const res = await fetch(`${baseUrl}/weather/farm/${farmWithoutCoordsId}/coordinates`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        latitude: 16.3067,
        longitude: 80.4365,
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.farm.coordinates.latitude, 16.3067);
    assert.equal(data.farm.coordinates.longitude, 80.4365);

    // Verify in MongoDB
    const updatedFarm = await Farm.findById(farmWithoutCoordsId);
    assert.equal(updatedFarm.coordinates.latitude, 16.3067);
    assert.equal(updatedFarm.coordinates.longitude, 80.4365);
  });

  it('9. Should reject invalid coordinate inputs (lat > 90 or lon < -180) with 400', async () => {
    const res = await fetch(`${baseUrl}/weather/coordinates?lat=120&lon=50`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  // =========================================================================
  // 2. OPENWEATHER CONFIGURATION & ENVIRONMENT VALIDATION
  // =========================================================================

  it('10. Should return HTTP 503 and OPENWEATHER_API_KEY_NOT_CONFIGURED when API key is placeholder', async () => {
    // When OPENWEATHER_API_KEY is placeholder or missing, backend refuses silently falling back to Open-Meteo
    const res = await fetch(`${baseUrl}/weather/farm/${farmWithCoordsId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    // With default placeholder YOUR_OPENWEATHER_API_KEY, expect 503 or 401
    assert.ok([401, 503].includes(res.status));
    const data = await res.json();
    assert.equal(data.success, false);
    assert.ok(
      data.code === 'OPENWEATHER_API_KEY_NOT_CONFIGURED' ||
      data.code === 'OPENWEATHER_AUTHENTICATION_FAILED' ||
      data.message.includes('OpenWeather')
    );
  });

  // =========================================================================
  // 3. OPENWEATHER PAYLOAD PARSING & AGRO-METEOROLOGY LOGIC
  // =========================================================================

  it('11. Should accurately parse OpenWeather Current & Forecast payloads into agricultural models', () => {
    const mockCurrent = {
      coord: { lon: 80.5338, lat: 16.3584 },
      weather: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
      main: { temp: 31.4, feels_like: 34.2, temp_min: 30.0, temp_max: 32.5, pressure: 1012, humidity: 62 },
      wind: { speed: 3.5, deg: 135 }, // 3.5 m/s = 12.6 km/h, 135 deg = SE
      rain: { '1h': 0.0 },
      clouds: { all: 20 },
      dt: 1730894400, // Unix epoch seconds
      timezone: 19800, // UTC+5:30 (Asia/Kolkata)
      sys: { country: 'IN', sunrise: 1730853600, sunset: 1730895000 },
      name: 'Guntur',
    };

    const mockForecast = {
      city: { name: 'Guntur', country: 'IN', timezone: 19800 },
      list: [
        // Day 1
        {
          dt: 1730894400,
          main: { temp: 31.4, temp_min: 24.2, temp_max: 32.5, humidity: 60 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
          wind: { speed: 3.0, deg: 120 },
          pop: 0.1,
          rain: { '3h': 0 },
        },
        // Day 2 (Rainy day: 15mm rain, 80% pop)
        {
          dt: 1730980800,
          main: { temp: 27.0, temp_min: 22.0, temp_max: 28.5, humidity: 88 },
          weather: [{ id: 501, main: 'Rain', description: 'moderate rain', icon: '10d' }],
          wind: { speed: 5.5, deg: 90 }, // 19.8 km/h
          pop: 0.8,
          rain: { '3h': 15.0 },
        },
        // Day 3
        {
          dt: 1731067200,
          main: { temp: 29.0, temp_min: 23.0, temp_max: 30.0, humidity: 70 },
          weather: [{ id: 802, main: 'Clouds', description: 'scattered clouds', icon: '03d' }],
          wind: { speed: 4.0, deg: 110 },
          pop: 0.2,
          rain: { '3h': 0.2 },
        },
        // Day 4
        {
          dt: 1731153600,
          main: { temp: 30.5, temp_min: 24.0, temp_max: 31.0, humidity: 65 },
          weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
          wind: { speed: 3.2, deg: 140 },
          pop: 0.05,
          rain: { '3h': 0 },
        },
        // Day 5
        {
          dt: 1731240000,
          main: { temp: 31.0, temp_min: 24.5, temp_max: 32.0, humidity: 63 },
          weather: [{ id: 801, main: 'Clouds', description: 'few clouds', icon: '02d' }],
          wind: { speed: 2.8, deg: 130 },
          pop: 0.0,
          rain: { '3h': 0 },
        },
      ],
    };

    const parsed = parseOpenWeatherPayload(mockCurrent, mockForecast);

    // Verify current weather mapping
    assert.equal(parsed.provider, 'OpenWeather (Meteorological Model API)');
    assert.equal(parsed.current.temperature, 31.4);
    assert.equal(parsed.current.feelsLike, 34.2);
    assert.equal(parsed.current.humidity, 62);
    assert.equal(parsed.current.windSpeed, 12.6); // 3.5 m/s * 3.6 = 12.6 km/h
    assert.equal(parsed.current.windDirection, 'SE');
    assert.equal(parsed.current.pressure, 1012);
    assert.equal(parsed.city, 'Guntur');
    assert.ok(parsed.current.observationTime);

    // Verify 5-day daily forecast aggregation & coverage metadata
    assert.equal(parsed.forecast.length, 5);
    assert.equal(parsed.coverage.days, 5);
    assert.equal(parsed.coverage.tier, 'OpenWeather Standard 5-Day / 3-Hour Forecast');
    assert.ok(parsed.coverage.limitations.includes('5-day daily aggregations'));

    // Verify day 2 rain and wind values
    const rainyDay = parsed.forecast[1];
    assert.equal(rainyDay.expectedRainfall, 15.0);
    assert.equal(rainyDay.rainProbability, 80);
    assert.equal(rainyDay.windSpeedMax, 19.8);
  });

  // =========================================================================
  // 4. RECOMMENDATION CONSISTENCY & SPRAY RAIN VALIDATION
  // =========================================================================

  it('12. Should strictly prevent "Optimal Window" spray recommendation when rain is forecast', () => {
    const current = {
      temperature: 30,
      humidity: 85,
      windSpeed: 8, // Calm wind
      rainfall: 0,
    };

    // Day 1 has 12mm rain and 75% rain probability
    const forecastWithRain = [
      {
        date: '2026-11-06',
        day: 'Fri',
        formattedDate: 'Nov 6',
        tempMin: 22,
        tempMax: 29,
        expectedRainfall: 12.0,
        rainProbability: 75,
        windSpeedMax: 10,
      },
      {
        date: '2026-11-07',
        day: 'Sat',
        formattedDate: 'Nov 7',
        tempMin: 23,
        tempMax: 30,
        expectedRainfall: 5.0,
        rainProbability: 40,
        windSpeedMax: 12,
      },
    ];

    const recs = generateFarmingRecommendations(current, forecastWithRain);
    const sprayMatrix = generateSpraySuitability(forecastWithRain);

    // CRITICAL REQUIREMENT: Spraying recommendation MUST NOT be "Optimal" when rain is forecast
    assert.notEqual(recs.spraying.status, 'Optimal Window');
    assert.equal(recs.spraying.status, 'Unfavorable (Rain Expected)');
    assert.equal(recs.spraying.badgeVariant, 'danger');
    assert.ok(recs.spraying.reason.includes('wash-off') || recs.spraying.reason.includes('rain'));

    // In the daily spray matrix, Day 1 must be Unfavorable
    assert.equal(sprayMatrix[0].status, 'Unfavorable');
    assert.equal(sprayMatrix[0].badgeVariant, 'danger');
  });

  it('13. Should evaluate "Optimal Window" spray recommendation only when wind is calm (<14 km/h) and no rain', () => {
    const current = {
      temperature: 28,
      humidity: 55,
      windSpeed: 6,
      rainfall: 0,
    };

    const dryCalmForecast = [
      {
        date: '2026-11-06',
        day: 'Fri',
        formattedDate: 'Nov 6',
        tempMin: 20,
        tempMax: 30,
        expectedRainfall: 0.0,
        rainProbability: 5,
        windSpeedMax: 8.5,
      },
    ];

    const recs = generateFarmingRecommendations(current, dryCalmForecast);
    const sprayMatrix = generateSpraySuitability(dryCalmForecast);

    assert.equal(recs.spraying.status, 'Optimal Window');
    assert.equal(recs.spraying.badgeVariant, 'success');
    assert.equal(sprayMatrix[0].status, 'Optimal');
    assert.equal(sprayMatrix[0].badgeVariant, 'success');
  });

  // =========================================================================
  // 5. DYNAMIC GROWING DEGREE DAYS (GDD) CALCULATION (Tbase = 10°C)
  // =========================================================================

  it('14. Should dynamically calculate GDD using formula: max(0, ((Tmax + Tmin)/2) - 10)', () => {
    const forecast = [
      // Day 1: Tmax=32, Tmin=20 => mean=26, GDD = 26 - 10 = 16.0
      { date: '2026-11-06', day: 'Fri', formattedDate: 'Nov 6', tempMin: 20, tempMax: 32 },
      // Day 2: Tmax=30, Tmin=22 => mean=26, GDD = 26 - 10 = 16.0
      { date: '2026-11-07', day: 'Sat', formattedDate: 'Nov 7', tempMin: 22, tempMax: 30 },
      // Day 3: Cold day: Tmax=12, Tmin=6 => mean=9, GDD = max(0, 9 - 10) = 0
      { date: '2026-11-08', day: 'Sun', formattedDate: 'Nov 8', tempMin: 6, tempMax: 12 },
    ];

    const gddResult = calculateGDD(forecast, 10);

    assert.equal(gddResult.baseTemperature, 10);
    assert.equal(gddResult.dailyGDD[0].gdd, 16.0);
    assert.equal(gddResult.dailyGDD[1].gdd, 16.0);
    assert.equal(gddResult.dailyGDD[2].gdd, 0.0); // cold day does not accumulate negative GDD
    assert.equal(gddResult.totalGDD, 32.0);
    assert.equal(gddResult.periodDays, 3);
    assert.ok(gddResult.explanation.includes('Tbase = 10°C'));
  });

  // =========================================================================
  // 6. OFFICIAL ALERTS VS APPLICATION-GENERATED ADVISORIES
  // =========================================================================

  it('15. Should clearly distinguish official meteorological alerts from application-generated crop advisories', () => {
    const current = { temperature: 39, humidity: 85, windSpeed: 35, rainfall: 30 };
    const forecast = [
      {
        date: '2026-11-06',
        day: 'Fri',
        formattedDate: 'Nov 6',
        tempMin: 28,
        tempMax: 40,
        expectedRainfall: 35,
        windSpeedMax: 38,
      },
    ];
    const officialAlerts = [
      {
        id: 'official-cyclone-warning',
        isOfficialAlert: true,
        source: 'India Meteorological Department (IMD)',
        event: 'Cyclone Warning',
        severity: 'danger',
        message: 'Severe cyclonic storm approaching coastal Andhra Pradesh.',
      },
    ];

    const alerts = generateAgriculturalAlerts(current, forecast, officialAlerts);

    // Official alert must be preserved with isOfficialAlert: true
    const official = alerts.find((a) => a.id === 'official-cyclone-warning');
    assert.ok(official);
    assert.equal(official.isOfficialAlert, true);
    assert.equal(official.source, 'India Meteorological Department (IMD)');

    // Application-generated advisories must have isOfficialAlert: false
    const appAdvisories = alerts.filter((a) => a.isOfficialAlert === false);
    assert.ok(appAdvisories.length > 0);
    appAdvisories.forEach((adv) => {
      assert.equal(adv.isOfficialAlert, false);
      assert.ok(adv.source.includes('AgriSense'));
    });
  });

  // =========================================================================
  // 7. TIMEZONE FORMATTING IN ASIA/KOLKATA
  // =========================================================================

  it('16. Should format timestamps dynamically in Asia/Kolkata without hardcoding weekday names', () => {
    // 1730894400 is 2024-11-06T12:00:00Z -> In UTC+5:30 it is 2024-11-06 17:30
    const epoch = 1730894400;
    const localDate = formatEpochToLocalDate(epoch, 'Asia/Kolkata');
    const weekday = formatEpochToWeekday(epoch, 'Asia/Kolkata');
    const monthDay = formatEpochToMonthDay(epoch, 'Asia/Kolkata');

    assert.equal(localDate, '2024-11-06');
    assert.equal(weekday, 'Wed');
    assert.equal(monthDay, 'Nov 6');
  });
});
