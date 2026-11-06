import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 4 - Weather Advisory Module Test Suite', () => {
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

    // 1. Register main test farmer
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Weather Test Farmer',
        email: testEmail,
        password: testPassword,
        role: 'farmer',
        location: 'Vijayawada, Andhra Pradesh',
      }),
    });
    const regData = await regRes.json();
    farmerToken = regData.token;

    // 2. Register second farmer for IDOR testing
    const otherRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Other Farmer',
        email: otherEmail,
        password: testPassword,
        role: 'farmer',
        location: 'Pune, Maharashtra',
      }),
    });
    const otherData = await otherRes.json();
    otherFarmerToken = otherData.token;

    // 3. Create a farm with coordinates for main farmer
    const farmWithCoordsRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Krishna Coastal Plot',
        location: 'Gannavaram, Krishna, AP',
        acreage: 18.5,
        soilType: 'Alluvial',
        irrigationType: 'Flood',
        coordinates: { latitude: 16.5062, longitude: 80.648 },
      }),
    });
    const farmWithCoordsData = await farmWithCoordsRes.json();
    farmWithCoordsId = (farmWithCoordsData.farm?._id || farmWithCoordsData.farm?.id || '').toString();

    // 4. Create a farm without coordinates for main farmer
    const farmWithoutCoordsRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Dry Parcel No GPS',
        location: 'Interior Guntur, AP',
        acreage: 12.0,
        soilType: 'Black',
        irrigationType: 'Rain-fed',
      }),
    });
    const farmWithoutCoordsData = await farmWithoutCoordsRes.json();
    farmWithoutCoordsId = (farmWithoutCoordsData.farm?._id || farmWithoutCoordsData.farm?.id || '').toString();

    // 5. Create a farm for other farmer
    const otherFarmRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherFarmerToken}`,
      },
      body: JSON.stringify({
        name: 'Private Other Farm',
        location: 'Baramati, Pune',
        acreage: 25.0,
        soilType: 'Loamy',
        irrigationType: 'Drip',
        coordinates: { latitude: 18.1519, longitude: 74.5772 },
      }),
    });
    const otherFarmData = await otherFarmRes.json();
    otherFarmId = (otherFarmData.farm?._id || otherFarmData.farm?.id || '').toString();
  });

  after(async () => {
    // Cleanup created test records
    await Farm.deleteMany({ _id: { $in: [farmWithCoordsId, farmWithoutCoordsId, otherFarmId] } });
    await User.deleteMany({ email: { $in: [testEmail, otherEmail] } });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

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
    assert.equal(data.count >= 2, true);

    const farm1 = data.farms.find((f) => f.id === farmWithCoordsId);
    assert.ok(farm1);
    assert.equal(farm1.hasCoordinates, true);
    assert.equal(farm1.coordinates.latitude, 16.5062);

    const farm2 = data.farms.find((f) => f.id === farmWithoutCoordsId);
    assert.ok(farm2);
    assert.equal(farm2.hasCoordinates, false);
  });

  it('4. Should reject weather request for invalid farm ID format with 400', async () => {
    const res = await fetch(`${baseUrl}/weather/farm/invalid-id-format`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('5. Should return 404 when requested farm does not exist', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/weather/farm/${nonExistentId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 404);
  });

  it('6. Should strictly enforce IDOR protection: Farmer A cannot view weather for Farmer B farm (403)', async () => {
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
    assert.equal(data.farm.name, 'Dry Parcel No GPS');
  });

  it('8. Should update farm coordinates via PATCH /api/weather/farm/:id/coordinates and return live weather', async () => {
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
    assert.ok(data.weather);
    assert.equal(data.weather.coordinates.latitude, 16.3067);
    assert.equal(data.weather.coordinates.longitude, 80.4365);
    assert.ok(data.weather.current.temperature !== undefined);

    // Verify persistence directly in MongoDB
    const updatedFarm = await Farm.findById(farmWithoutCoordsId);
    assert.equal(updatedFarm.coordinates.latitude, 16.3067);
    assert.equal(updatedFarm.coordinates.longitude, 80.4365);
  });

  it('9. Should return comprehensive agricultural weather advisory for farm with coordinates', async () => {
    const res = await fetch(`${baseUrl}/weather/farm/${farmWithCoordsId}`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.weather);

    const w = data.weather;
    // Current weather
    assert.ok(typeof w.current.temperature === 'number');
    assert.ok(typeof w.current.humidity === 'number');
    assert.ok(typeof w.current.windSpeed === 'number');
    assert.ok(typeof w.current.pressure === 'number');
    assert.ok(typeof w.current.condition === 'string');

    // 7-Day forecast
    assert.equal(w.forecast.length, 7);
    assert.ok(typeof w.forecast[0].tempMin === 'number');
    assert.ok(typeof w.forecast[0].tempMax === 'number');
    assert.ok(typeof w.forecast[0].rainProbability === 'number');

    // Farming recommendations
    assert.ok(w.recommendations.irrigation);
    assert.ok(w.recommendations.fertilizer);
    assert.ok(w.recommendations.spraying);
    assert.ok(w.recommendations.harvest);
    assert.ok(w.recommendations.protection);

    // Spray suitability
    assert.equal(w.spraySuitability.length, 7);
    assert.ok(w.spraySuitability[0].status);

    // GDD and rainfall summary
    assert.ok(typeof w.gdd.sevenDayTotalGDD === 'number');
    assert.ok(typeof w.rainfallSummary.sevenDayTotalMm === 'number');
  });

  it('10. Should fetch weather by direct coordinates via GET /api/weather/coordinates', async () => {
    const res = await fetch(`${baseUrl}/weather/coordinates?lat=17.9689&lon=79.5941`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.weather.coordinates.latitude, 17.9689);
    assert.equal(data.weather.coordinates.longitude, 79.5941);
  });

  it('11. Should reject invalid coordinate inputs (lat > 90 or lon < -180) with 400', async () => {
    const res = await fetch(`${baseUrl}/weather/coordinates?lat=120&lon=50`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });
});
