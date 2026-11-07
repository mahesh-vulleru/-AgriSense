import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 1 - Farmer Dashboard Data Integration Test Suite', () => {
  let server;
  let baseUrl;
  let farmerEmptyToken = '';
  let farmerWithFarmsToken = '';
  let farmerWithFarmsId = '';
  let farmerOtherToken = '';
  let farmerOtherId = '';

  const farmerEmptyEmail = `farmer_zero_${Date.now()}@dashboard-suite.test`;
  const farmerWithFarmsEmail = `farmer_farms_${Date.now()}@dashboard-suite.test`;
  const farmerOtherEmail = `farmer_other_${Date.now()}@dashboard-suite.test`;
  const testPassword = 'Password123!';

  before(async () => {
    await connectDB();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 1. Create Farmer with 0 farms
    const regZeroRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Zero Farms Farmer',
        email: farmerEmptyEmail,
        password: testPassword,
        role: 'farmer',
        location: 'Nagpur, Maharashtra',
      }),
    });
    const regZeroData = await regZeroRes.json();
    farmerEmptyToken = regZeroData.token;

    // 2. Create Farmer with multiple farms
    const regFarmsRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Active Multi-Farm Owner',
        email: farmerWithFarmsEmail,
        password: testPassword,
        role: 'farmer',
        location: 'Pune, Maharashtra',
      }),
    });
    const regFarmsData = await regFarmsRes.json();
    farmerWithFarmsToken = regFarmsData.token;
    farmerWithFarmsId = regFarmsData.user.id;

    // 3. Create Other Farmer (for data isolation testing)
    const regOtherRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Isolated Farmer',
        email: farmerOtherEmail,
        password: testPassword,
        role: 'farmer',
        location: 'Nashik, Maharashtra',
      }),
    });
    const regOtherData = await regOtherRes.json();
    farmerOtherToken = regOtherData.token;
    farmerOtherId = regOtherData.user.id;

    // Seed Farm 1 for farmerWithFarms: Active, 15.5 acres, Wheat & Corn
    const farm1Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerWithFarmsToken}`,
      },
      body: JSON.stringify({
        name: 'Valley Green Farm 1',
        location: 'Taluka Haveli',
        acreage: 15.5,
        soilType: 'Black',
        irrigationType: 'Drip',
        mainCrops: ['Wheat', 'Corn'],
      }),
    });
    const farm1Data = await farm1Res.json();
    const farm1Id = farm1Data.farm.id;

    // Seed Farm 2 for farmerWithFarms: Active, 10.0 acres, Corn & Soybean
    const farm2Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerWithFarmsToken}`,
      },
      body: JSON.stringify({
        name: 'Valley Green Farm 2',
        location: 'Taluka Shirur',
        acreage: 10.0,
        soilType: 'Loamy',
        irrigationType: 'Sprinkler',
        mainCrops: ['Corn', 'Soybean'],
      }),
    });
    const farm2Data = await farm2Res.json();
    const farm2Id = farm2Data.farm.id;

    // Seed Farm 3 for farmerWithFarms: Archived, 5.0 acres, should not add to active acreage
    const farm3Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerWithFarmsToken}`,
      },
      body: JSON.stringify({
        name: 'Inactive Old Parcel',
        location: 'Taluka Baramati',
        acreage: 5.0,
        soilType: 'Sandy',
        irrigationType: 'Rain-fed',
        mainCrops: ['Barley'],
      }),
    });
    const farm3Data = await farm3Res.json();
    await fetch(`${baseUrl}/farms/${farm3Data.farm.id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmerWithFarmsToken}` },
    });

    // Seed Farm for Other Farmer: 50 acres, Cotton
    const farmOtherRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerOtherToken}`,
      },
      body: JSON.stringify({
        name: 'Independent Farm',
        location: 'Nashik Valley',
        acreage: 50.0,
        soilType: 'Alluvial',
        irrigationType: 'Drip',
        mainCrops: ['Cotton'],
      }),
    });
    const farmOtherData = await farmOtherRes.json();
    const farmOtherId = farmOtherData.farm.id;

    // Seed real Crop documents for farmerWithFarms
    // 1. Wheat with full dates
    await Crop.create({
      owner: farmerWithFarmsId,
      farm: farm1Id,
      name: 'Durum Wheat',
      variety: 'HD-2967',
      cultivatedArea: 10.0,
      plantingDate: new Date('2026-10-01'),
      expectedHarvestDate: new Date('2027-02-15'),
      growthStage: 'Vegetative Growth',
      status: 'Active',
    });

    // 2. Sweet Corn with missing expected harvest date
    await Crop.create({
      owner: farmerWithFarmsId,
      farm: farm2Id,
      name: 'Sweet Corn',
      variety: 'Pioneer 3396',
      cultivatedArea: 6.0,
      plantingDate: new Date('2026-09-15'),
      expectedHarvestDate: null,
      growthStage: 'Flowering',
      status: 'Active',
    });

    // 3. Soybean with missing planting date and past harvest date (overdue/harvested)
    await Crop.create({
      owner: farmerWithFarmsId,
      farm: farm2Id,
      name: 'Soybean',
      variety: 'JS-335',
      cultivatedArea: 4.0,
      plantingDate: null,
      expectedHarvestDate: new Date('2026-10-25'),
      growthStage: 'Harvested',
      status: 'Harvested',
    });

    // Seed Crop for Other Farmer (to verify strict farmer data isolation)
    await Crop.create({
      owner: farmerOtherId,
      farm: farmOtherId,
      name: 'Bt Cotton',
      variety: 'Bollgard II',
      cultivatedArea: 25.0,
      plantingDate: new Date('2026-08-01'),
      expectedHarvestDate: new Date('2026-12-20'),
      growthStage: 'Fruiting',
      status: 'Active',
    });
  });

  after(async () => {
    // Clean up created test data
    await User.deleteMany({
      email: { $in: [farmerEmptyEmail, farmerWithFarmsEmail, farmerOtherEmail] },
    });
    await Farm.deleteMany({ owner: { $in: [farmerWithFarmsId, farmerOtherId] } });
    await Crop.deleteMany({ owner: { $in: [farmerWithFarmsId, farmerOtherId] } });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Should reject dashboard request when token is missing (401)', async () => {
    const res = await fetch(`${baseUrl}/dashboard/farmer`);
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.match(data.message, /Authorization required/i);
  });

  it('2. Should reject dashboard request when token is invalid (401)', async () => {
    const res = await fetch(`${baseUrl}/dashboard/farmer`, {
      headers: { Authorization: 'Bearer bad.token.value' },
    });
    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  it('3. Should return empty dashboard statistics for farmer with zero farms', async () => {
    const res = await fetch(`${baseUrl}/dashboard/farmer`, {
      headers: { Authorization: `Bearer ${farmerEmptyToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.statistics.totalFarms, 0);
    assert.strictEqual(data.data.statistics.activeFarms, 0);
    assert.strictEqual(data.data.statistics.totalCultivatedAcreage, 0);
    assert.strictEqual(data.data.statistics.activeCropsCount, 0);
    assert.deepStrictEqual(data.data.statistics.uniqueCrops, []);
    assert.deepStrictEqual(data.data.recentFarms, []);
    assert.strictEqual(data.data.sensorStatus.connected, false);
    assert.strictEqual(
      data.data.sensorStatus.message,
      'Sensor data unavailable – connect a device to view live readings.'
    );

    // Verify Phase 3: Zero crops farmer
    assert.ok(data.data.cropsData);
    assert.strictEqual(data.data.cropsData.crops.length, 0);
    assert.strictEqual(data.data.cropsData.statistics.totalCrops, 0);
    assert.strictEqual(data.data.cropsData.statistics.activeCrops, 0);
    assert.strictEqual(data.data.cropsData.statistics.harvestedCrops, 0);
  });

  it('4. Should accurately calculate statistics for farmer with multiple farms', async () => {
    const res = await fetch(`${baseUrl}/dashboard/farmer`, {
      headers: { Authorization: `Bearer ${farmerWithFarmsToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    // 3 total farms: 2 active (15.5 + 10.0 = 25.5 acres), 1 archived
    assert.strictEqual(data.data.statistics.totalFarms, 3);
    assert.strictEqual(data.data.statistics.activeFarms, 2);
    assert.strictEqual(data.data.statistics.archivedFarms, 1);
    assert.strictEqual(data.data.statistics.totalCultivatedAcreage, 25.5);

    // Crops from active farms: Wheat, Corn, Soybean (3 unique active crops)
    assert.strictEqual(data.data.statistics.activeCropsCount, 3);
    assert.ok(data.data.statistics.uniqueCrops.includes('Wheat'));
    assert.ok(data.data.statistics.uniqueCrops.includes('Corn'));
    assert.ok(data.data.statistics.uniqueCrops.includes('Soybean'));
    assert.strictEqual(data.data.recentFarms.length, 3);
    assert.ok(Array.isArray(data.data.farms));
    assert.strictEqual(data.data.farms.length, 3);

    // Verify Phase 3: Multi-crop farmer with real MongoDB records & growth stages
    assert.ok(data.data.cropsData);
    assert.strictEqual(data.data.cropsData.crops.length, 3);
    assert.strictEqual(data.data.cropsData.statistics.totalCrops, 3);
    assert.strictEqual(data.data.cropsData.statistics.activeCrops, 2);
    assert.strictEqual(data.data.cropsData.statistics.harvestedCrops, 1);
    assert.strictEqual(data.data.cropsData.statistics.cropVarietiesCount, 3);
    assert.strictEqual(data.data.cropsData.statistics.cropDistribution.length, 3);

    // Associated farm verification
    const wheat = data.data.cropsData.crops.find((c) => c.name === 'Durum Wheat');
    assert.ok(wheat);
    assert.strictEqual(wheat.variety, 'HD-2967');
    assert.strictEqual(wheat.growthStage, 'Vegetative Growth');
    assert.strictEqual(wheat.farm.name, 'Valley Green Farm 1');

    // Missing harvest date verification
    const corn = data.data.cropsData.crops.find((c) => c.name === 'Sweet Corn');
    assert.ok(corn);
    assert.strictEqual(corn.expectedHarvestDate, null);

    // Missing planting date verification
    const soybean = data.data.cropsData.crops.find((c) => c.name === 'Soybean');
    assert.ok(soybean);
    assert.strictEqual(soybean.plantingDate, null);
  });

  it('5. Should strictly isolate data so Farmer A cannot see Farmer B records or acreage', async () => {
    const resA = await fetch(`${baseUrl}/dashboard/farmer`, {
      headers: { Authorization: `Bearer ${farmerWithFarmsToken}` },
    });
    const dataA = await resA.json();

    const resB = await fetch(`${baseUrl}/dashboard/farmer`, {
      headers: { Authorization: `Bearer ${farmerOtherToken}` },
    });
    const dataB = await resB.json();

    // Farmer A has 25.5 acres, Farmer B has 50 acres
    assert.strictEqual(dataA.data.statistics.totalCultivatedAcreage, 25.5);
    assert.strictEqual(dataB.data.statistics.totalCultivatedAcreage, 50.0);
    assert.strictEqual(dataB.data.statistics.totalFarms, 1);
    assert.strictEqual(dataB.data.recentFarms[0].name, 'Independent Farm');

    // Confirm Farmer A's farm list does not contain Farmer B's farm
    const aNames = dataA.data.recentFarms.map((f) => f.name);
    assert.ok(!aNames.includes('Independent Farm'));

    // Verify Phase 3: Farmer data isolation for crops
    assert.strictEqual(dataA.data.cropsData.crops.length, 3);
    assert.strictEqual(dataB.data.cropsData.crops.length, 1);
    assert.strictEqual(dataB.data.cropsData.crops[0].name, 'Bt Cotton');
    assert.ok(!dataA.data.cropsData.crops.map((c) => c.name).includes('Bt Cotton'));
  });

  it('6. Should return 503 Service Unavailable when database connection is unavailable', async () => {
    // Temporarily mock isDBConnected behavior via readyState
    Object.defineProperty(mongoose.connection, 'readyState', {
      value: 0,
      configurable: true,
      writable: true,
    });

    try {
      const res = await fetch(`${baseUrl}/dashboard/farmer`, {
        headers: { Authorization: `Bearer ${farmerWithFarmsToken}` },
      });
      assert.strictEqual(res.status, 503);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.match(data.message, /Database service is currently unavailable/i);
    } finally {
      // Delete own property so the prototype getter is restored cleanly
      delete mongoose.connection.readyState;
    }
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
