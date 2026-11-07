import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import CropAssessment from '../src/models/CropAssessment.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 6 - Crop Monitoring & Health Tracking Test Suite', () => {
  let server;
  let baseUrl;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let farm1Id = '';
  let testCropId = '';
  let assessmentId = '';

  const user1Email = `mon_farmer1_${Date.now()}@monitoring.test`;
  const user2Email = `mon_farmer2_${Date.now()}@monitoring.test`;
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
        fullName: 'Monitoring Farmer One',
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
        fullName: 'Monitoring Farmer Two',
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
        name: 'Guntur Precision Chili Farm',
        location: 'Mangalagiri, Guntur',
        acreage: 10,
        soilType: 'Black',
        irrigationType: 'Drip',
        coordinates: {
          latitude: 16.3584,
          longitude: 80.5338,
        },
      }),
    });
    const farm1Data = await farm1Res.json();
    farm1Id = farm1Data.farm._id || farm1Data.farm.id;

    // Create Crop for User 1
    const cropRes = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Guntur Mirchi Special',
        variety: 'Teja S17',
        category: 'Cash Crop',
        season: 'Kharif',
        farm: farm1Id,
        cultivatedArea: 5,
        plantingDate: '2026-06-01',
        expectedHarvestDate: '2026-11-20',
        growthStage: 'Flowering',
      }),
    });
    const cropData = await cropRes.json();
    testCropId = cropData.crop.id || cropData.crop._id;
  });

  after(async () => {
    try {
      if (testCropId) {
        await CropAssessment.deleteMany({ crop: testCropId });
        await Crop.findByIdAndDelete(testCropId);
      }
      if (farm1Id) await Farm.findByIdAndDelete(farm1Id);
      if (user1Id) await User.findByIdAndDelete(user1Id);
      if (user2Id) await User.findByIdAndDelete(user2Id);
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    } catch {}
  });

  it('1. GET /api/monitoring/dashboard returns aggregated statistics for farmer', async () => {
    const res = await fetch(`${baseUrl}/monitoring/dashboard`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.summary);
    assert.equal(typeof data.summary.totalMonitored, 'number');
    assert.ok(data.summary.totalMonitored >= 1);
    assert.ok(Array.isArray(data.crops));
    assert.ok(Array.isArray(data.recentAssessments));
  });

  it('2. POST /api/monitoring/assessment logs a new health assessment and updates crop status', async () => {
    const res = await fetch(`${baseUrl}/monitoring/assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        cropId: testCropId,
        healthStatus: 'Needs Attention',
        growthStage: 'Flowering',
        growthCondition: 'Normal',
        leafCondition: 'Yellowing',
        pestSeverity: 'Minor',
        pestDetails: 'Aphid clusters noticed on lower leaf surfaces',
        diseaseSeverity: 'None',
        soilMoisture: 'Adequate',
        waterStress: 'Low',
        notes: 'Advised mild neem oil spray application early morning.',
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.assessment);
    assert.equal(data.assessment.healthStatus, 'Needs Attention');
    assert.equal(data.crop.healthStatus, 'Needs Attention');
    assessmentId = data.assessment.id || data.assessment._id;
  });

  it('3. GET /api/monitoring/crop/:cropId returns assessment timeline & telemetry', async () => {
    const res = await fetch(`${baseUrl}/monitoring/crop/${testCropId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.crop.id || data.crop._id, testCropId);
    assert.ok(Array.isArray(data.assessments));
    assert.ok(data.assessments.length >= 1);
    assert.equal(data.latestAssessment.healthStatus, 'Needs Attention');
    assert.ok(data.weatherRisks);
  });

  it('4. IDOR Protection: User 2 cannot access or record assessment on User 1 crop', async () => {
    // Attempt to access User 1's crop monitoring
    const getRes = await fetch(`${baseUrl}/monitoring/crop/${testCropId}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(getRes.status, 404);

    // Attempt to record assessment on User 1's crop
    const postRes = await fetch(`${baseUrl}/monitoring/assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        cropId: testCropId,
        healthStatus: 'Critical',
      }),
    });
    assert.equal(postRes.status, 404);
  });

  it('5. POST /api/monitoring/upload-photo validates formats and saves image', async () => {
    // 1x1 transparent PNG base64
    const validBase64 =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/monitoring/upload-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        imageBase64: validBase64,
        filename: 'leaf_sample.png',
        caption: 'Lower leaf underside scouting',
        cropId: testCropId,
      }),
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.url.startsWith('/uploads/crops/'));

    // Unsupported format check
    const badRes = await fetch(`${baseUrl}/monitoring/upload-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        imageBase64: 'data:text/plain;base64,SGVsbG8=',
      }),
    });
    assert.equal(badRes.status, 400);
  });

  it('6. GET /api/monitoring/weather-risks/:cropId calculates meteorological crop risks', async () => {
    const res = await fetch(`${baseUrl}/monitoring/weather-risks/${testCropId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.weatherRisks);
    assert.equal(typeof data.weatherRisks.available, 'boolean');
  });
});
