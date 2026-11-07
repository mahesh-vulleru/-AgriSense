import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import SoilAnalysis from '../src/models/SoilAnalysis.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 7 - Soil Analysis & Soil Health Management Test Suite', () => {
  let server;
  let baseUrl;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let farm1Id = '';
  let farm2Id = '';
  let soilRecord1Id = '';
  let soilRecord2Id = '';

  const user1Email = `soil_farmer1_${Date.now()}@soil.test`;
  const user2Email = `soil_farmer2_${Date.now()}@soil.test`;
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

    // Register Farmer 1
    const reg1Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Soil Farmer One',
        email: user1Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg1Data = await reg1Res.json();
    user1Token = reg1Data.token;
    user1Id = reg1Data.user.id;

    // Register Farmer 2
    const reg2Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Soil Farmer Two',
        email: user2Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.token;
    user2Id = reg2Data.user.id;

    // Create Farm 1 for Farmer 1
    const farm1Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Krishna River Valley Farm',
        location: 'Vijayawada, Krishna',
        acreage: 8.5,
        soilType: 'Alluvial',
        irrigationType: 'Drip',
        mainCrops: ['Rice', 'Maize'],
      }),
    });
    const farm1Data = await farm1Res.json();
    farm1Id = farm1Data.farm._id || farm1Data.farm.id;

    // Create Farm 2 for Farmer 2
    const farm2Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        name: 'Rayalaseema Groundnut Parcel',
        location: 'Anantapur',
        acreage: 12,
        soilType: 'Red',
        irrigationType: 'Sprinkler',
        mainCrops: ['Groundnut'],
      }),
    });
    const farm2Data = await farm2Res.json();
    farm2Id = farm2Data.farm._id || farm2Data.farm.id;
  });

  after(async () => {
    try {
      if (farm1Id) {
        await SoilAnalysis.deleteMany({ farm: farm1Id });
        await Farm.findByIdAndDelete(farm1Id);
      }
      if (farm2Id) {
        await SoilAnalysis.deleteMany({ farm: farm2Id });
        await Farm.findByIdAndDelete(farm2Id);
      }
      if (user1Id) await User.findByIdAndDelete(user1Id);
      if (user2Id) await User.findByIdAndDelete(user2Id);
    } catch {
      // ignore cleanup errors
    } finally {
      if (server) server.close();
    }
  });

  it('1. POST /api/soil-analysis successfully registers a complete soil test with scientific assessment', async () => {
    const payload = {
      farmId: farm1Id,
      sampleId: 'SOIL-KRISHNA-001',
      sampleDate: '2026-05-10',
      labName: 'Regional Krishi Vigyan Kendra Soil Lab',
      testMethod: 'Certified Laboratory',
      soilType: 'Alluvial',
      pH: { value: 6.8, isEstimated: false },
      nitrogen: { value: 240, isEstimated: false }, // Low (<280)
      phosphorus: { value: 18, isEstimated: false }, // Medium (10-25)
      potassium: { value: 210, isEstimated: false }, // Medium (110-280)
      organicCarbon: { value: 0.65, isEstimated: false }, // Medium (0.5-0.75)
      electricalConductivity: { value: 0.45, isEstimated: false }, // Non-saline (<0.8)
      soilMoisture: { value: 22 },
      soilTemperature: { value: 26 },
      notes: 'Soil collected at 15cm depth across 5 zig-zag sample points.',
    };

    const res = await fetch(`${baseUrl}/soil-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.record._id);
    assert.equal(data.record.sampleId, 'SOIL-KRISHNA-001');
    assert.equal(data.record.pH.value, 6.8);
    assert.equal(data.record.pH.rating, 'Neutral / Optimal');
    assert.equal(data.record.nitrogen.rating, 'Low');
    assert.equal(data.record.phosphorus.rating, 'Medium');
    assert.equal(data.record.potassium.rating, 'Medium');
    assert.equal(data.record.overallHealthStatus, 'Needs Improvement'); // Low N triggers Needs Improvement

    soilRecord1Id = data.record._id;
  });

  it('2. POST /api/soil-analysis enforces parameter validation (rejects invalid pH and negative values)', async () => {
    // Test invalid pH > 14
    const resBadPH = await fetch(`${baseUrl}/soil-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        pH: 15.5,
      }),
    });
    assert.equal(resBadPH.status, 400);
    const badPHData = await resBadPH.json();
    assert.equal(badPHData.success, false);

    // Test negative Nitrogen
    const resBadN = await fetch(`${baseUrl}/soil-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        pH: 7.0,
        nitrogen: -50,
      }),
    });
    assert.equal(resBadN.status, 400);
  });

  it('3. IDOR Protection: User 2 cannot register, view, update, or delete User 1 soil records', async () => {
    // User 2 tries to create soil test on User 1's farm
    const resCreate = await fetch(`${baseUrl}/soil-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        pH: 7.0,
      }),
    });
    assert.equal(resCreate.status, 404); // Farm not found for User 2

    // User 2 tries to GET User 1's soil test
    const resGet = await fetch(`${baseUrl}/soil-analysis/${soilRecord1Id}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(resGet.status, 404);

    // User 2 tries to UPDATE User 1's soil test
    const resPut = await fetch(`${baseUrl}/soil-analysis/${soilRecord1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({ pH: 8.0 }),
    });
    assert.equal(resPut.status, 404);

    // User 2 tries to DELETE User 1's soil test
    const resDel = await fetch(`${baseUrl}/soil-analysis/${soilRecord1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(resDel.status, 404);
  });

  it('4. Handles missing measurements cleanly without fabricating data (Insufficient Data)', async () => {
    // Create record with only pH
    const res = await fetch(`${baseUrl}/soil-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farmId: farm1Id,
        sampleId: 'SOIL-MINIMAL-002',
        pH: 7.2,
      }),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.record.nitrogen.value, null);
    assert.equal(data.record.nitrogen.rating, 'Not Measured');
    assert.equal(data.record.phosphorus.value, null);
    assert.equal(data.record.organicCarbon.value, null);
    assert.equal(data.record.overallHealthStatus, 'Insufficient Data');
    assert.ok(data.record.assessmentSummary.includes('Insufficient'));

    soilRecord2Id = data.record._id;
  });

  it('5. GET /api/soil-analysis/dashboard aggregates farm soil statistics and summaries', async () => {
    const res = await fetch(`${baseUrl}/soil-analysis/dashboard`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.summary.totalFarms, 1);
    assert.equal(data.summary.totalFarmsWithRecords, 1);
    assert.equal(data.summary.totalAnalysesRecorded, 2);
    assert.ok(data.farmSoilSummaries.length > 0);
    assert.equal(data.farmSoilSummaries[0].farmName, 'Krishna River Valley Farm');
    assert.equal(data.farmSoilSummaries[0].hasSoilRecord, true);
  });

  it('6. GET /api/soil-analysis/history/:farmId calculates longitudinal trends when >=2 tests exist', async () => {
    const res = await fetch(`${baseUrl}/soil-analysis/history/${farm1Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.hasSufficientHistory, true);
    assert.equal(data.testsCount, 2);
    assert.ok(data.trends);
    assert.ok(Array.isArray(data.chartPoints));
    assert.equal(data.chartPoints.length, 2);
  });

  it('7. POST /api/soil-analysis/upload-report validates file type and saves lab report', async () => {
    // Minimal mock PDF document in base64
    const mockPdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDY5IDAwMDAwIG4gCjAwMDAwMDAxMTkgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA0Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoxODAKJSVFT0Y=';

    const res = await fetch(`${baseUrl}/soil-analysis/upload-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        fileBase64: mockPdfBase64,
        filename: 'KVK_Soil_Health_Card.pdf',
        mimeType: 'application/pdf',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.url.includes('/uploads/soil_reports/'));
    assert.equal(data.mimeType, 'application/pdf');

    // Test unsupported file format
    const resBad = await fetch(`${baseUrl}/soil-analysis/upload-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        fileBase64: 'data:text/plain;base64,SGVsbG8gV29ybGQ=',
        filename: 'bad.txt',
      }),
    });
    assert.equal(resBad.status, 400);
  });

  it('8. POST /api/soil-analysis/recommendations calculates tailored fertilizer and amendment guidance', async () => {
    const res = await fetch(`${baseUrl}/soil-analysis/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        soilAnalysisId: soilRecord1Id,
        cropName: 'Rice',
        cropStage: 'Vegetative Growth',
        acreage: 5,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.guidance);
    assert.equal(data.guidance.crop, 'Rice');
    assert.equal(data.guidance.acreage, 5);
    assert.ok(data.guidance.nutrientRequirements.nitrogen_N_kg > 0);
    assert.ok(data.guidance.indicativeCommercialFertilizers.urea_46_N_kg > 0);
    assert.ok(Array.isArray(data.guidance.stageGuidance));
    assert.ok(Array.isArray(data.guidance.explanations));
    assert.ok(data.guidance.disclaimer.includes('DISCLAIMER'));
  });

  it('9. PUT /api/soil-analysis/:id and DELETE /api/soil-analysis/:id execute properly', async () => {
    // Update record 1
    const resUpdate = await fetch(`${baseUrl}/soil-analysis/${soilRecord1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        nitrogen: { value: 320 }, // Changed from 240 to 320 (now Medium)
        notes: 'Updated after secondary field confirmation.',
      }),
    });

    assert.equal(resUpdate.status, 200);
    const updateData = await resUpdate.json();
    assert.equal(updateData.record.nitrogen.value, 320);
    assert.equal(updateData.record.nitrogen.rating, 'Medium');
    assert.equal(updateData.record.overallHealthStatus, 'Optimal'); // Now N, P, K, pH are all optimal/medium

    // Delete record 2
    const resDelete = await fetch(`${baseUrl}/soil-analysis/${soilRecord2Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(resDelete.status, 200);

    // Verify record 2 is gone
    const resCheck = await fetch(`${baseUrl}/soil-analysis/${soilRecord2Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(resCheck.status, 404);
  });
});
