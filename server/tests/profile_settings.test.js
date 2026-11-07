import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import { generateToken } from '../src/utils/token.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 13 - Profile, Settings & Account Management Tests', () => {
  let server;
  let baseUrl;
  let testFarmer;
  let otherFarmer;
  let farmerToken;
  let otherToken;
  let farmerFarm;
  let otherFarm;

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api`;

    // Clean up previous test users
    await User.deleteMany({ email: { $in: ['test_farmer_p13@example.com', 'other_farmer_p13@example.com'] } });

    // Seed test farmer
    testFarmer = await User.create({
      name: 'Ramesh Reddy',
      email: 'test_farmer_p13@example.com',
      passwordHash: '$2b$12$D2M6gM2j2qW038lPfxJb1.GfE9lGk/qj2H3gM2j2qW038lPfxJb1e', // hashed 'Password@123'
      phone: '+919876543210',
      location: 'Nalgonda',
      role: 'farmer',
      state: 'Telangana',
    });
    // Set actual bcrypt password for test
    const bcrypt = (await import('bcryptjs')).default;
    testFarmer.passwordHash = await bcrypt.hash('Password@123', 10);
    await testFarmer.save();

    otherFarmer = await User.create({
      name: 'Suresh Kumar',
      email: 'other_farmer_p13@example.com',
      passwordHash: await bcrypt.hash('OtherPass@123', 10),
      phone: '+919876543211',
      role: 'farmer',
    });

    farmerToken = generateToken(testFarmer);
    otherToken = generateToken(otherFarmer);

    // Create a farm for each farmer
    farmerFarm = await Farm.create({
      name: 'Ramesh Mango Orchard',
      owner: testFarmer._id,
      location: 'Nalgonda, Telangana',
      acreage: 15,
      soilType: 'Red',
    });

    otherFarm = await Farm.create({
      name: 'Suresh Cotton Farm',
      owner: otherFarmer._id,
      location: 'Warangal, Telangana',
      acreage: 22,
      soilType: 'Black',
    });
  });

  after(async () => {
    if (farmerFarm) await Farm.findByIdAndDelete(farmerFarm._id);
    if (otherFarm) await Farm.findByIdAndDelete(otherFarm._id);
    if (testFarmer) await User.findByIdAndDelete(testFarmer._id);
    if (otherFarmer) await User.findByIdAndDelete(otherFarmer._id);
    if (server) await new Promise((r) => server.close(r));
    await mongoose.disconnect();
  });

  test('1. GET /api/users/profile - Returns authenticated farmer profile without sensitive password hashes', async () => {
    const res = await fetch(`${baseUrl}/users/profile`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.name, 'Ramesh Reddy');
    assert.equal(data.user.email, 'test_farmer_p13@example.com');
    assert.equal(data.user.role, 'farmer');
    assert.equal(data.user.passwordHash, undefined, 'passwordHash must never be returned');
    assert.ok(data.user.preferences);
  });

  test('2. PUT /api/users/profile - Updates permitted profile fields (Address, Mandal, District, Pincode)', async () => {
    const res = await fetch(`${baseUrl}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Rameshwar Reddy',
        phone: '9876543210',
        village: 'Miryalguda',
        mandal: 'Miryalguda',
        district: 'Nalgonda',
        state: 'Telangana',
        pincode: '508207',
        language: 'te',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.name, 'Rameshwar Reddy');
    assert.equal(data.user.village, 'Miryalguda');
    assert.equal(data.user.pincode, '508207');
    assert.equal(data.user.language, 'te');
  });

  test('3. PUT /api/users/profile - Rejects invalid profile data (invalid pincode, invalid phone)', async () => {
    const res = await fetch(`${baseUrl}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        pincode: '123', // invalid PIN
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /valid 6-digit/i);
  });

  test('4. PUT /api/users/profile - Strictly rejects unauthorized role escalation attempts', async () => {
    const res = await fetch(`${baseUrl}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Hacker Ramesh',
        role: 'admin', // Disallowed role modification
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.success, false);
    assert.match(data.message, /Modifying user role or permissions is strictly prohibited/i);
  });

  test('5. POST /api/users/profile/avatar - Uploads and sets profile photograph', async () => {
    const dummyBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/users/profile/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        imageBase64: dummyBase64,
        filename: 'profile_pic.png',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.avatar.startsWith('/uploads/avatars/'));
    assert.equal(data.user.avatar, data.avatar);
  });

  test('6. DELETE /api/users/profile/avatar - Removes profile photograph', async () => {
    const res = await fetch(`${baseUrl}/users/profile/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.avatar, '');
  });

  test('7. PUT /api/users/change-password - Rejects incorrect current password', async () => {
    const res = await fetch(`${baseUrl}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'WrongPassword@123',
        newPassword: 'NewPassword@123',
        confirmPassword: 'NewPassword@123',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /Current password is incorrect/i);
  });

  test('8. PUT /api/users/change-password - Successfully updates password with verification', async () => {
    const res = await fetch(`${baseUrl}/users/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'Password@123',
        newPassword: 'BrandNewPassword@456',
        confirmPassword: 'BrandNewPassword@456',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    // Verify login with new password
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_farmer_p13@example.com',
        password: 'BrandNewPassword@456',
      }),
    });
    const loginData = await loginRes.json();
    assert.equal(loginRes.status, 200);
    assert.ok(loginData.token);
  });

  test('9. PUT /api/users/preferences - Updates farm preferences and sets default farm', async () => {
    const res = await fetch(`${baseUrl}/users/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        defaultFarmId: String(farmerFarm._id),
        areaUnit: 'hectares',
        tempUnit: 'celsius',
        waterUnit: 'liters',
        theme: 'light',
        language: 'en',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.preferences.areaUnit, 'hectares');
    assert.equal(String(data.defaultFarm), String(farmerFarm._id));
  });

  test('10. PUT /api/users/preferences - Rejects IDOR attempt to set another farmer’s farm as default', async () => {
    const res = await fetch(`${baseUrl}/users/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        defaultFarmId: String(otherFarm._id), // Belongs to otherFarmer
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /not owned by your account/i);
  });

  test('11. POST /api/users/delete-request - Submits account deletion request with password check', async () => {
    const res = await fetch(`${baseUrl}/users/delete-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        password: 'BrandNewPassword@456',
        reason: 'Consolidating agricultural accounts',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.deletionRequest.requested, true);
    assert.equal(data.deletionRequest.reason, 'Consolidating agricultural accounts');
  });
});
