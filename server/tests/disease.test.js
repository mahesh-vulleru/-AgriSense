import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import DiseaseScan from '../src/models/DiseaseScan.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 9 - AI Crop Disease Detection Test Suite', () => {
  let server;
  let baseUrl;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let farm1Id = '';
  let crop1Id = '';
  let scanRecordId = '';

  const user1Email = `ai_farmer1_${Date.now()}@disease.test`;
  const user2Email = `ai_farmer2_${Date.now()}@disease.test`;
  const testPassword = 'Password123!';

  // Sample 1x1 transparent PNG in base64
  const samplePngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

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
        fullName: 'AI Disease Farmer One',
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
        fullName: 'AI Disease Farmer Two',
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
        name: 'Guntur Precision Chili Holding',
        location: 'Lam, Guntur, Andhra Pradesh',
        acreage: 12,
        soilType: 'Black',
        irrigationType: 'Drip',
        coordinates: {
          latitude: 16.3584,
          longitude: 80.5338,
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
        name: 'Guntur Sannam Hot Chili',
        variety: 'S4 Sannam',
        category: 'Cash Crop',
        season: 'Kharif',
        farm: farm1Id,
        cultivatedArea: 8,
        plantingDate: '2026-06-01',
        expectedHarvestDate: '2026-11-30',
        growthStage: 'Fruiting / Grain Formation',
      }),
    });
    const cropData = await cropRes.json();
    crop1Id = cropData.crop._id || cropData.crop.id;
  });

  after(async () => {
    try {
      if (farm1Id) {
        await DiseaseScan.deleteMany({ farm: farm1Id });
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

  it('1. GET /api/disease-detection/status returns AI provider state and priority crops', async () => {
    const res = await fetch(`${baseUrl}/disease-detection/status`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.provider, 'gemini');
    assert.ok(data.model);
    assert.ok(Array.isArray(data.priorityCrops));
    assert.ok(data.priorityCrops.includes('Chili'));
    assert.ok(data.priorityCrops.includes('Cotton'));
  });

  it('2. POST /api/disease-detection/scan validates image formats and rejects unsupported file types', async () => {
    // Test with plain text base64
    const resBadMime = await fetch(`${baseUrl}/disease-detection/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        cropId: crop1Id,
        imageBase64: 'data:text/plain;base64,SGVsbG8gUGxhbnQ=',
      }),
    });

    assert.equal(resBadMime.status, 400);
    const badMimeData = await resBadMime.json();
    assert.equal(badMimeData.success, false);
    assert.ok(badMimeData.message.includes('Allowed formats'));
  });

  it('3. POST /api/disease-detection/scan enforces IDOR protection for farm and crop ownership', async () => {
    // User 2 attempts to scan User 1's crop
    const resIdor = await fetch(`${baseUrl}/disease-detection/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        cropId: crop1Id,
        imageBase64: samplePngBase64,
      }),
    });

    assert.equal(resIdor.status, 404);
  });

  it('4. POST /api/disease-detection/scan returns setup-required if GEMINI_API_KEY is not configured', async () => {
    const res = await fetch(`${baseUrl}/disease-detection/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        cropId: crop1Id,
        imageBase64: samplePngBase64,
        filename: 'chili_leaf.png',
      }),
    });

    // If real key is unconfigured (YOUR_GEMINI_API_KEY placeholder), returns 503 AI_SETUP_REQUIRED
    // If real key is configured, returns 201 or 502/429
    const data = await res.json();
    if (!data.success && data.code === 'AI_SETUP_REQUIRED') {
      assert.equal(res.status, 503);
      assert.ok(data.message.includes('GEMINI_API_KEY'));
    } else if (data.success) {
      assert.equal(res.status, 201);
      assert.ok(data.scan._id);
      scanRecordId = data.scan._id;
    }
  });

  it('5. Database persistence & schema validation for DiseaseScan model', async () => {
    // Manually create a verified DiseaseScan model record to test schema compliance
    const directScan = new DiseaseScan({
      farmer: user1Id,
      farm: farm1Id,
      crop: crop1Id,
      image: {
        url: '/uploads/disease_scans/test_foliage.jpg',
        filename: 'chili_leaf_anthracnose.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 102400,
        captureMethod: 'camera',
      },
      scanTimestamp: new Date(),
      aiProvider: 'gemini',
      aiModel: 'gemini-2.5-flash',
      status: 'Diseased',
      identifiedCrop: 'Chili (Capsicum annuum)',
      suitableForAnalysis: true,
      possibleDisease: 'Anthracnose Fruit Rot & Dieback (Colletotrichum capsici)',
      visibleSymptoms: [
        'Dark circular sunken necrotic spots on foliage',
        'Concentric rings of salmon-pink acervuli',
        'Dieback of twigs from tip downwards',
      ],
      alternativeCauses: [
        'Cercospora leaf spot (Frogeye spot)',
        'Bacterial spot (Xanthomonas campestris)',
      ],
      explanation:
        'Visible lesions exhibit characteristic concentric rings of fungal fruiting bodies typical of Colletotrichum. Warm temperatures and high humidity accelerate spore dispersal.',
      suggestedActions: [
        'Prune and destroy infected twigs and fruit to reduce inoculum pressure.',
        'Apply copper oxychloride (3g/L) or azoxystrobin (1ml/L) as protective spray.',
        'Avoid overhead sprinkler irrigation to keep canopy dry.',
      ],
      expertVerificationNeeded: true,
      confidenceNote: 'Confidence not calibrated',
      environmentalContext: {
        temperature: 29,
        humidity: 82,
        recentRainfallMm: 14,
        growthStage: 'Fruiting / Grain Formation',
        soilMoisture: '24%',
      },
    });

    await directScan.save();
    assert.ok(directScan._id);
    assert.equal(directScan.status, 'Diseased');
    assert.equal(directScan.confidenceNote, 'Confidence not calibrated');
    assert.equal(directScan.possibleDisease.includes('Anthracnose'), true);

    scanRecordId = directScan._id;
  });

  it('6. GET /api/disease-detection/history lists saved scans for the authenticated farmer', async () => {
    const res = await fetch(`${baseUrl}/disease-detection/history`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.scans.length > 0);
    assert.equal(data.scans[0].farmer.toString(), user1Id.toString());
  });

  it('7. GET /api/disease-detection/history/:id returns full scan details', async () => {
    const res = await fetch(`${baseUrl}/disease-detection/history/${scanRecordId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.scan.possibleDisease, 'Anthracnose Fruit Rot & Dieback (Colletotrichum capsici)');
    assert.equal(data.scan.confidenceNote, 'Confidence not calibrated');
  });

  it('8. DELETE /api/disease-detection/history/:id removes scan record and enforces authorization', async () => {
    // User 2 tries to delete User 1's scan (IDOR Protection)
    const resIdor = await fetch(`${baseUrl}/disease-detection/history/${scanRecordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(resIdor.status, 404);

    // User 1 deletes their scan
    const resDel = await fetch(`${baseUrl}/disease-detection/history/${scanRecordId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(resDel.status, 200);

    // Verify deleted
    const resCheck = await fetch(`${baseUrl}/disease-detection/history/${scanRecordId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(resCheck.status, 404);
  });
});
