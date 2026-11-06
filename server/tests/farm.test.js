import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 4 - Farm Management Test Suite', () => {
  let server;
  let baseUrl;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let createdFarmId = '';

  const user1Email = `farm_owner1_${Date.now()}@farm-suite.test`;
  const user2Email = `farm_owner2_${Date.now()}@farm-suite.test`;
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

    // Create User 1
    const reg1Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Primary Farmer',
        email: user1Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg1Data = await reg1Res.json();
    user1Token = reg1Data.token;
    user1Id = reg1Data.user.id;

    // Create User 2 (for IDOR testing)
    const reg2Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Secondary Farmer',
        email: user2Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.token;
  });

  after(async () => {
    try {
      await Farm.deleteMany({ name: { $regex: /Test Farm/i } });
      await User.deleteMany({ email: { $regex: /@farm-suite\.test$/ } });
    } catch {
      // Ignore cleanup error
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  // 1. Create Farm Successfully
  it('1. Should create a new farm successfully for authenticated user', async () => {
    const res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Green Valley Test Farm A',
        location: 'Sector 4, Green Valley',
        state: 'California',
        district: 'Central Coast',
        village: 'Salinas Valley',
        pincode: '93901',
        acreage: 45.5,
        soilType: 'Black',
        irrigationType: 'Drip',
        mainCrops: ['Corn', 'Soybean', 'Wheat'],
        description: 'Prime agricultural acreage with automated drip irrigation sensors.',
        status: 'Active',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.farm.id);
    assert.equal(data.farm.name, 'Green Valley Test Farm A');
    assert.equal(data.farm.acreage, 45.5);
    assert.equal(data.farm.soilType, 'Black');
    assert.equal(data.farm.irrigationType, 'Drip');
    assert.equal(data.farm.mainCrops.length, 3);
    assert.equal(data.farm.owner.toString(), user1Id);

    createdFarmId = data.farm.id;
  });

  // 2. Reject Missing Farm Name
  it('2. Should reject farm creation with missing farm name', async () => {
    const res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: '',
        location: 'Somewhere Valley',
        acreage: 20,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /name is required/i);
  });

  // 3. Reject Invalid Acreage
  it('3. Should reject farm creation with invalid acreage (negative or 0)', async () => {
    const res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Invalid Acreage Test Farm',
        location: 'Somewhere Valley',
        acreage: -5,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /positive number/i);
  });

  // 4. List Authenticated User's Farms
  it('4. Should list farms owned by the authenticated user with summary stats', async () => {
    const res = await fetch(`${baseUrl}/farms`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.farms));
    assert.ok(data.farms.length >= 1);
    assert.ok(data.summary);
    assert.equal(data.summary.totalFarms, 1);
    assert.equal(data.summary.activeFarms, 1);
    assert.equal(data.summary.totalAcreage, 45.5);
  });

  // 5. Get Farm Details
  it('5. Should retrieve full farm details by ID for owner', async () => {
    const res = await fetch(`${baseUrl}/farms/${createdFarmId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.farm.id, createdFarmId);
    assert.equal(data.farm.name, 'Green Valley Test Farm A');
    assert.equal(data.farm.location, 'Sector 4, Green Valley');
  });

  // 6. Update Farm Successfully
  it('6. Should update farm details successfully', async () => {
    const res = await fetch(`${baseUrl}/farms/${createdFarmId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Green Valley Test Farm A (Updated)',
        acreage: 50.0,
        soilType: 'Loamy',
        mainCrops: ['Corn', 'Soybean', 'Cotton', 'Barley'],
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.farm.name, 'Green Valley Test Farm A (Updated)');
    assert.equal(data.farm.acreage, 50.0);
    assert.equal(data.farm.soilType, 'Loamy');
    assert.equal(data.farm.mainCrops.length, 4);
  });

  // 7. Archive Farm
  it('7. Should soft-archive farm via PATCH /api/farms/:id/archive', async () => {
    const res = await fetch(`${baseUrl}/farms/${createdFarmId}/archive`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${user1Token}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.farm.status, 'Archived');
  });

  // 8. Reject Unauthenticated Requests
  it('8. Should reject farm requests when token is missing', async () => {
    const res = await fetch(`${baseUrl}/farms`, {
      method: 'GET',
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // 9. Reject Access to Another User's Farm (IDOR Protection)
  it('9. Should prevent User 2 from accessing User 1 farm (IDOR Protection)', async () => {
    const res = await fetch(`${baseUrl}/farms/${createdFarmId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${user2Token}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message, /Access denied/i);
  });

  // 10. Verify Database Persistence in MongoDB
  it('10. Should verify persistent storage directly in MongoDB', async () => {
    const persistedFarm = await Farm.findById(createdFarmId);
    assert.ok(persistedFarm);
    assert.equal(persistedFarm.name, 'Green Valley Test Farm A (Updated)');
    assert.equal(persistedFarm.status, 'Archived');
    assert.equal(persistedFarm.acreage, 50.0);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
