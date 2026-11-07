import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 5 - Crop Management & Lifecycle Test Suite', () => {
  let server;
  let baseUrl;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let farm1Id = '';
  let farm2Id = '';
  let createdCropId = '';
  let createdMilestoneId = '';

  const user1Email = `crop_farmer1_${Date.now()}@crop-suite.test`;
  const user2Email = `crop_farmer2_${Date.now()}@crop-suite.test`;
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
        fullName: 'Crop Farmer One',
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
        fullName: 'Crop Farmer Two',
        email: user2Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.token;
    user2Id = reg2Data.user.id;

    // Create Farm for User 1
    const farm1Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Greenfield Valley Parcel',
        location: 'Warangal North',
        acreage: 15.5,
        soilType: 'Loamy',
        irrigationType: 'Drip',
      }),
    });
    const farm1Data = await farm1Res.json();
    farm1Id = farm1Data.farm.id;

    // Create Farm for User 2
    const farm2Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        name: 'Delta Riverside Fields',
        location: 'Guntur East',
        acreage: 20.0,
        soilType: 'Alluvial',
        irrigationType: 'Sprinkler',
      }),
    });
    const farm2Data = await farm2Res.json();
    farm2Id = farm2Data.farm.id;
  });

  after(async () => {
    try {
      if (createdCropId) await Crop.findByIdAndDelete(createdCropId);
      if (farm1Id) await Farm.findByIdAndDelete(farm1Id);
      if (farm2Id) await Farm.findByIdAndDelete(farm2Id);
      if (user1Id) await User.findByIdAndDelete(user1Id);
      if (user2Id) await User.findByIdAndDelete(user2Id);
    } catch {
      // ignore cleanup errors
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Should reject unauthenticated requests to /api/crops with 401', async () => {
    const res = await fetch(`${baseUrl}/crops`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('2. Should reject crop registration with missing required fields (400)', async () => {
    const res = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: '',
        farm: farm1Id,
        cultivatedArea: 5,
      }),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('3. Should strictly enforce IDOR: prevent farmer from registering crop on farm owned by another user (403)', async () => {
    // User 1 tries to register crop on User 2's farm
    const res = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Intruder Paddy',
        farm: farm2Id, // Owned by User 2
        cultivatedArea: 5,
      }),
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('4. Should successfully register a new crop on owned farm with initial stage and calendar milestones (201)', async () => {
    const plantingDate = new Date();
    plantingDate.setDate(plantingDate.getDate() - 10);
    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() + 90);

    const res = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Basmati Rice',
        farm: farm1Id,
        variety: 'Pusa 1121',
        category: 'Cereal',
        season: 'Kharif',
        irrigationMethod: 'Flood',
        cultivatedArea: 8.5,
        plantingDate: plantingDate.toISOString(),
        expectedHarvestDate: harvestDate.toISOString(),
        expectedYieldPerAcre: 1800,
        yieldUnit: 'kg',
        growthStage: 'Tillering / Branching',
        notes: 'High organic compost applied during preparation',
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.crop);
    assert.equal(data.crop.name, 'Basmati Rice');
    assert.equal(data.crop.growthStage, 'Tillering / Branching');
    assert.equal(data.crop.status, 'Active');
    assert.equal(data.crop.cultivatedArea, 8.5);
    // Calculated yield: 8.5 * 1800 = 15300
    assert.equal(data.crop.estimatedTotalYield, 15300);
    assert.ok(Array.isArray(data.crop.stageHistory));
    assert.equal(data.crop.stageHistory.length, 1);
    assert.ok(Array.isArray(data.crop.calendar));
    assert.ok(data.crop.calendar.length >= 3);

    createdCropId = data.crop.id;
  });

  it('5. Should list crops for authenticated farmer with summary metrics (200)', async () => {
    const res = await fetch(`${baseUrl}/crops`, {
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.crops));
    assert.ok(data.crops.length >= 1);
    assert.ok(data.summary);
    assert.equal(data.summary.totalCrops, 1);
    assert.equal(data.summary.activeCrops, 1);
    assert.equal(data.summary.totalCultivatedArea, 8.5);
    assert.ok(data.summary.cropsByFarm.length >= 1);
  });

  it('6. Should retrieve full crop details by ID for owner (200)', async () => {
    const res = await fetch(`${baseUrl}/crops/${createdCropId}`, {
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.crop.id, createdCropId);
    assert.equal(data.crop.variety, 'Pusa 1121');
    assert.equal(data.crop.farm.name, 'Greenfield Valley Parcel');
  });

  it('7. Should strictly prevent unauthorized user from viewing another farmer crop (IDOR 403)', async () => {
    // User 2 attempts to fetch User 1's crop
    const res = await fetch(`${baseUrl}/crops/${createdCropId}`, {
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('8. Should update crop details successfully via PUT /api/crops/:id (200)', async () => {
    const res = await fetch(`${baseUrl}/crops/${createdCropId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        notes: 'Updated field notes: First irrigation done',
        expectedYieldPerAcre: 1900,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.crop.notes, 'Updated field notes: First irrigation done');
    assert.equal(data.crop.expectedYieldPerAcre, 1900);
    // Recalculated estimated total yield: 8.5 * 1900 = 16150
    assert.equal(data.crop.estimatedTotalYield, 16150);
  });

  it('9. Should transition crop growth stage and record in stageHistory via PATCH /api/crops/:id/stage (200)', async () => {
    const res = await fetch(`${baseUrl}/crops/${createdCropId}/stage`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        stage: 'Flowering',
        notes: 'Crop entered full flowering phase. Optimal weather recorded.',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.crop.growthStage, 'Flowering');
    assert.equal(data.crop.stageHistory.length, 2);
    assert.equal(data.crop.stageHistory[1].stage, 'Flowering');
  });

  it('10. Should add and toggle calendar milestones for crop (201, 200)', async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 15);

    // Add milestone
    const addRes = await fetch(`${baseUrl}/crops/${createdCropId}/calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        activity: 'Foliar Spray of Micronutrients',
        category: 'Fertilization',
        targetDate: targetDate.toISOString(),
        notes: 'Apply zinc and boron booster spray',
      }),
    });

    assert.equal(addRes.status, 201);
    const addData = await addRes.json();
    assert.equal(addData.success, true);
    const addedMilestone = addData.calendar.find(
      (m) => m.activity === 'Foliar Spray of Micronutrients'
    );
    assert.ok(addedMilestone);
    createdMilestoneId = addedMilestone._id;

    // Toggle milestone completed
    const toggleRes = await fetch(
      `${baseUrl}/crops/${createdCropId}/calendar/${createdMilestoneId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          completed: true,
          notes: 'Completed successfully by farm supervisor',
        }),
      }
    );

    assert.equal(toggleRes.status, 200);
    const toggleData = await toggleRes.json();
    assert.equal(toggleData.success, true);
    const toggled = toggleData.calendar.find((m) => m._id === createdMilestoneId);
    assert.equal(toggled.completed, true);
  });

  it('11. Should record actual harvest and transition crop to Harvested status via POST /api/crops/:id/harvest (200)', async () => {
    const res = await fetch(`${baseUrl}/crops/${createdCropId}/harvest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        harvestDate: new Date().toISOString(),
        actualYield: 15850,
        yieldUnit: 'kg',
        qualityGrade: 'Grade A',
        harvestNotes: 'Bumper harvest with excellent moisture content',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.crop.growthStage, 'Harvested');
    assert.equal(data.crop.status, 'Harvested');
    assert.ok(data.crop.actualHarvest);
    assert.equal(data.crop.actualHarvest.actualYield, 15850);
    assert.equal(data.crop.actualHarvest.qualityGrade, 'Grade A');
    assert.equal(data.crop.actualHarvest.yieldUnit, 'kg');
  });

  it('12. Should soft-archive crop via PATCH /api/crops/:id/archive (200)', async () => {
    const res = await fetch(`${baseUrl}/crops/${createdCropId}/archive`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.crop.status, 'Archived');
  });
});
