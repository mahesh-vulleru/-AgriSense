import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import IrrigationPlan from '../src/models/IrrigationPlan.js';
import IrrigationSchedule from '../src/models/IrrigationSchedule.js';
import WaterUsage from '../src/models/WaterUsage.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 8 - Smart Irrigation Management Test Suite', () => {
  let server;
  let baseUrl;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let farm1Id = '';
  let crop1Id = '';
  let plan1Id = '';
  let schedule1Id = '';

  const user1Email = `irrig_farmer1_${Date.now()}@irrigation.test`;
  const user2Email = `irrig_farmer2_${Date.now()}@irrigation.test`;
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

    // Register User 1
    const reg1Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Irrigation Farmer One',
        email: user1Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg1Data = await reg1Res.json();
    user1Token = reg1Data.token;
    user1Id = reg1Data.user.id;

    // Register User 2
    const reg2Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Irrigation Farmer Two',
        email: user2Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.token;
    user2Id = reg2Data.user.id;

    // Create Farm 1 for User 1
    const farmRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Godavari Fertigation Orchard',
        location: 'Rajahmundry, East Godavari',
        acreage: 15,
        soilType: 'Alluvial',
        irrigationType: 'Drip',
        coordinates: {
          latitude: 17.0005,
          longitude: 81.804,
        },
      }),
    });
    const farmData = await farmRes.json();
    farm1Id = farmData.farm._id || farmData.farm.id;

    // Create Crop for User 1
    const cropRes = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Sweet Orange Citrus',
        variety: 'Sathgudi',
        category: 'Fruit',
        season: 'Year-round',
        farm: farm1Id,
        cultivatedArea: 10,
        plantingDate: '2025-06-01',
        expectedHarvestDate: '2026-12-15',
        growthStage: 'Fruiting / Grain Formation',
      }),
    });
    const cropData = await cropRes.json();
    crop1Id = cropData.crop._id || cropData.crop.id;
  });

  after(async () => {
    try {
      if (farm1Id) {
        await WaterUsage.deleteMany({ farm: farm1Id });
        await IrrigationSchedule.deleteMany({ farm: farm1Id });
        await IrrigationPlan.deleteMany({ farm: farm1Id });
        await Crop.deleteMany({ farm: farm1Id });
        await Farm.findByIdAndDelete(farm1Id);
      }
      if (user1Id) await User.findByIdAndDelete(user1Id);
      if (user2Id) await User.findByIdAndDelete(user2Id);
    } catch {
      // Ignore cleanup error
    } finally {
      if (server) server.close();
    }
  });

  it('1. POST /api/irrigation/plans creates a valid irrigation plan with farm and crop associations', async () => {
    const res = await fetch(`${baseUrl}/irrigation/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        cropId: crop1Id,
        name: 'Sector A Micro-Drip Fertigation Plan',
        method: 'Drip',
        cultivatedArea: 10,
        waterSource: 'Borewell / Tubewell',
        startDate: '2026-05-01',
        frequency: 'Alternate Days',
        plannedDurationMinutes: 90,
        notes: 'In-line drip emitters spaced 40cm with pressure compensator.',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.plan._id);
    assert.equal(data.plan.name, 'Sector A Micro-Drip Fertigation Plan');
    assert.equal(data.plan.method, 'Drip');
    assert.equal(data.plan.plannedDurationMinutes, 90);
    assert.equal(data.plan.status, 'Active');

    plan1Id = data.plan._id;
  });

  it('2. POST /api/irrigation/plans rejects invalid inputs and unauthorized farm access', async () => {
    // Missing cropId
    const resBad = await fetch(`${baseUrl}/irrigation/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        name: 'Incomplete Plan',
      }),
    });
    assert.equal(resBad.status, 400);

    // User 2 tries to create plan on User 1's farm (IDOR Protection)
    const resIdor = await fetch(`${baseUrl}/irrigation/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        cropId: crop1Id,
        name: 'Malicious Plan',
      }),
    });
    assert.equal(resIdor.status, 404);
  });

  it('3. POST /api/irrigation/schedules creates an irrigation schedule activity', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await fetch(`${baseUrl}/irrigation/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        cropId: crop1Id,
        planId: plan1Id,
        title: 'Morning Drip Session - Sector A',
        scheduledDate: tomorrow.toISOString(),
        durationMinutes: 90,
        method: 'Drip',
        waterSource: 'Borewell / Tubewell',
        notes: 'Check filter backwash pressure before turning valve.',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.schedule._id);
    assert.equal(data.schedule.status, 'Scheduled');
    assert.equal(data.schedule.durationMinutes, 90);

    schedule1Id = data.schedule._id;
  });

  it('4. PATCH /api/irrigation/schedules/:id/status updates status to Completed and logs water usage', async () => {
    const res = await fetch(`${baseUrl}/irrigation/schedules/${schedule1Id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        status: 'Completed',
        waterVolume: 4500,
        waterUnit: 'Liters',
        notes: 'Session finished successfully without line pressure drops.',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.schedule.status, 'Completed');
    assert.ok(data.schedule.completedAt);
    assert.equal(data.schedule.waterUsedLiters, 4500);

    // Verify a WaterUsage record was automatically logged
    const usageRes = await fetch(`${baseUrl}/irrigation/water-usage?farmId=${farm1Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const usageData = await usageRes.json();
    assert.equal(usageData.success, true);
    assert.ok(usageData.records.length > 0);
    assert.equal(usageData.records[0].volumeLiters, 4500);
  });

  it('5. POST /api/irrigation/water-usage records manual water usage with unit conversion', async () => {
    // Record 5 Cubic Meters (should convert to 5000 Liters)
    const res = await fetch(`${baseUrl}/irrigation/water-usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        cropId: crop1Id,
        volume: 5,
        unit: 'Cubic Meters',
        date: new Date().toISOString(),
        durationMinutes: 75,
        waterSource: 'Canal',
        notes: 'Gravity-fed canal turn.',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.record.volume, 5);
    assert.equal(data.record.unit, 'Cubic Meters');
    assert.equal(data.record.volumeLiters, 5000); // 5 m3 = 5000 L
  });

  it('6. GET /api/irrigation/dashboard aggregates farms, plans, schedules, and water statistics', async () => {
    const res = await fetch(`${baseUrl}/irrigation/dashboard`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.summary.totalFarms, 1);
    assert.equal(data.summary.totalFarmsWithPlans, 1);
    assert.equal(data.summary.completedCount, 1);
    assert.ok(data.summary.totalWaterLiters >= 9500); // 4500 + 5000 = 9500 L
    assert.ok(data.activePlans.length > 0);
    assert.ok(data.cropOverview.length > 0);
  });

  it('7. GET /api/irrigation/advisory/:farmId generates meteorological & soil-driven guidance', async () => {
    const res = await fetch(`${baseUrl}/irrigation/advisory/${farm1Id}?cropId=${crop1Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.advisory);
    assert.ok(data.advisory.primaryAction);
    assert.ok(Array.isArray(data.advisory.recommendations));
    assert.ok(data.advisory.soilContext.sensorNotice);
  });

  it('8. IDOR Isolation: User 2 cannot access or delete User 1 irrigation resources', async () => {
    // User 2 tries to GET User 1 plan
    const resGetPlan = await fetch(`${baseUrl}/irrigation/plans/${plan1Id}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(resGetPlan.status, 404);

    // User 2 tries to DELETE User 1 schedule
    const resDelSched = await fetch(`${baseUrl}/irrigation/schedules/${schedule1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(resDelSched.status, 404);
  });
});
