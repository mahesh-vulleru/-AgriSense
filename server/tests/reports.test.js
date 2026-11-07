import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import SoilAnalysis from '../src/models/SoilAnalysis.js';
import IrrigationSchedule from '../src/models/IrrigationSchedule.js';
import WaterUsage from '../src/models/WaterUsage.js';
import DiseaseScan from '../src/models/DiseaseScan.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 10 - Agricultural Reports & Analytics Test Suite', () => {
  let server;
  let baseUrl;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let farm1Id = '';
  let crop1Id = '';
  let crop2Id = '';

  const user1Email = `rep_farmer1_${Date.now()}@reports.test`;
  const user2Email = `rep_farmer2_${Date.now()}@reports.test`;
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
        fullName: 'Reports Farmer One',
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
        fullName: 'Reports Farmer Two',
        email: user2Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.token;
    user2Id = reg2Data.user.id;

    // Create Farm for User 1
    const farm1 = await Farm.create({
      owner: user1Id,
      name: 'Report Test Delta Farm',
      location: 'Krishna District',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      acreage: 25,
      soilType: 'Alluvial',
      irrigationType: 'Drip',
      coordinates: { latitude: 16.5, longitude: 80.6 },
    });
    farm1Id = farm1._id.toString();

    // Create Crop 1 (Active)
    const crop1 = await Crop.create({
      owner: user1Id,
      farm: farm1Id,
      name: 'Basmati Rice',
      variety: 'Pusa 1121',
      category: 'Cereal',
      season: 'Kharif',
      cultivatedArea: 10,
      expectedYieldPerAcre: 1500,
      estimatedTotalYield: 15000,
      growthStage: 'Vegetative Growth',
      healthStatus: 'Healthy',
      status: 'Active',
      sowingDate: new Date('2026-06-01'),
      expectedHarvestDate: new Date('2026-10-15'),
    });
    crop1Id = crop1._id.toString();

    // Create Crop 2 (Harvested with verified yield)
    const crop2 = await Crop.create({
      owner: user1Id,
      farm: farm1Id,
      name: 'Teja Chili',
      variety: 'S17',
      category: 'Cash Crop',
      season: 'Rabi',
      cultivatedArea: 5,
      expectedYieldPerAcre: 1200,
      estimatedTotalYield: 6000,
      growthStage: 'Harvested',
      healthStatus: 'Normal',
      status: 'Harvested',
      sowingDate: new Date('2025-11-01'),
      expectedHarvestDate: new Date('2026-03-01'),
      actualHarvest: {
        harvestDate: new Date('2026-03-05'),
        actualYield: 5850,
        yieldUnit: 'kg',
        qualityGrade: 'Grade A',
        harvestNotes: 'High export quality',
      },
    });
    crop2Id = crop2._id.toString();

    // Create Soil Record
    await SoilAnalysis.create({
      farmer: user1Id,
      farm: farm1Id,
      sampleId: 'SOIL-TEST-REP-1',
      sampleDate: new Date('2026-05-10'),
      soilType: 'Alluvial',
      pH: { value: 6.8, rating: 'Neutral / Optimal' },
      nitrogen: { value: 240, rating: 'Medium', unit: 'kg/ha' },
      phosphorus: { value: 32, rating: 'Medium', unit: 'kg/ha' },
      potassium: { value: 290, rating: 'High', unit: 'kg/ha' },
      organicCarbon: { value: 0.72, rating: 'Medium' },
      electricalConductivity: { value: 0.65, rating: 'Non-saline' },
      soilMoisture: { value: 45, unit: '%' },
      overallHealth: 'Optimal',
    });

    // Create Irrigation Schedule & Water Usage
    const schedule = await IrrigationSchedule.create({
      farmer: user1Id,
      farm: farm1Id,
      crop: crop1Id,
      title: 'Morning Drip Session',
      scheduledDate: new Date('2026-06-15'),
      completedAt: new Date('2026-06-15T08:00:00Z'),
      durationMinutes: 90,
      method: 'Drip',
      status: 'Completed',
      waterUsedLiters: 12000,
    });

    await WaterUsage.create({
      farmer: user1Id,
      farm: farm1Id,
      crop: crop1Id,
      schedule: schedule._id,
      volume: 12000,
      unit: 'Liters',
      volumeLiters: 12000,
      date: new Date('2026-06-15'),
      durationMinutes: 90,
      waterSource: 'Borewell / Tubewell',
    });

    // Create Disease Scan
    await DiseaseScan.create({
      farmer: user1Id,
      farm: farm1Id,
      crop: crop1Id,
      image: { url: 'http://localhost:5000/uploads/test.jpg' },
      scanTimestamp: new Date('2026-06-20'),
      status: 'Healthy',
      possibleDisease: 'Healthy / No Pathogen Detected',
      confidenceNote: 'Confidence not calibrated',
      aiModel: 'gemini-2.5-flash-lite',
    });
  });

  after(async () => {
    // Clean up test data
    await Promise.all([
      User.deleteMany({ _id: { $in: [user1Id, user2Id] } }),
      Farm.deleteMany({ owner: { $in: [user1Id, user2Id] } }),
      Crop.deleteMany({ owner: { $in: [user1Id, user2Id] } }),
      SoilAnalysis.deleteMany({ farmer: { $in: [user1Id, user2Id] } }),
      IrrigationSchedule.deleteMany({ farmer: { $in: [user1Id, user2Id] } }),
      WaterUsage.deleteMany({ farmer: { $in: [user1Id, user2Id] } }),
      DiseaseScan.deleteMany({ farmer: { $in: [user1Id, user2Id] } }),
    ]);

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. GET /api/reports/summary requires Bearer token authentication', async () => {
    const res = await fetch(`${baseUrl}/reports/summary`);
    assert.equal(res.status, 401);
  });

  it('2. GET /api/reports/summary returns accurate real database aggregation metrics', async () => {
    const res = await fetch(`${baseUrl}/reports/summary`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res.status, 200);

    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.overview);

    const o = json.data.overview;
    assert.equal(o.totalFarms, 1);
    assert.equal(o.totalCrops, 2);
    assert.equal(o.activeCropsCount, 1);
    assert.equal(o.harvestedCropsCount, 1);
    assert.equal(o.totalCultivatedArea, 15); // 10 + 5
    assert.equal(o.actualHarvestedYieldSum, 5850);
    assert.equal(o.estimatedYieldSum, 21000); // 15000 + 6000
    assert.equal(o.totalSoilTests, 1);
    assert.equal(o.avgPh, 6.8);
    assert.equal(o.totalWaterVolumeLiters, 12000);
    assert.equal(o.totalDiseaseScans, 1);
  });

  it('3. GET /api/reports/farms returns farm details and enforces farmer data isolation (IDOR)', async () => {
    // User 1 accesses their farm report
    const res1 = await fetch(`${baseUrl}/reports/farms?farmId=${farm1Id}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res1.status, 200);
    const json1 = await res1.json();
    assert.equal(json1.success, true);
    assert.equal(json1.data.length, 1);
    assert.equal(json1.data[0].name, 'Report Test Delta Farm');
    assert.equal(json1.data[0].cultivatedArea, 15);
    assert.equal(json1.data[0].waterUsedLiters, 12000);

    // User 2 attempts to query User 1's farmId
    const res2 = await fetch(`${baseUrl}/reports/farms?farmId=${farm1Id}`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(res2.status, 403);
    const json2 = await res2.json();
    assert.equal(json2.success, false);
    assert.match(json2.message, /Access denied/i);
  });

  it('4. GET /api/reports/crops clearly distinguishes estimated from actual harvested yields', async () => {
    const res = await fetch(`${baseUrl}/reports/crops`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.length, 2);

    const activeCrop = json.data.find((c) => c.name === 'Basmati Rice');
    assert.equal(activeCrop.yield.isEstimated, true);
    assert.equal(activeCrop.yield.estimatedTotalYield, 15000);
    assert.equal(activeCrop.yield.actualHarvestedYield, null);
    assert.equal(activeCrop.yield.hasActualYield, false);

    const harvestedCrop = json.data.find((c) => c.name === 'Teja Chili');
    assert.equal(harvestedCrop.yield.actualHarvestedYield, 5850);
    assert.equal(harvestedCrop.yield.qualityGrade, 'Grade A');
    assert.equal(harvestedCrop.yield.hasActualYield, true);
  });

  it('5. GET /api/reports/soil returns soil records and nutrient statistics', async () => {
    const res = await fetch(`${baseUrl}/reports/soil`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.summary.totalSamples, 1);
    assert.equal(json.data.summary.avgPh, 6.8);
    assert.equal(json.data.records[0].sampleId, 'SOIL-TEST-REP-1');
    assert.equal(json.data.records[0].pH.rating, 'Neutral / Optimal');
  });

  it('6. GET /api/reports/irrigation returns water usage volume and schedule history', async () => {
    const res = await fetch(`${baseUrl}/reports/irrigation`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.summary.totalWaterVolumeLiters, 12000);
    assert.equal(json.data.summary.completedSchedulesCount, 1);
    assert.equal(json.data.schedules[0].method, 'Drip');
  });

  it('7. GET /api/reports/disease returns AI scan distribution and preliminary disclaimer', async () => {
    const res = await fetch(`${baseUrl}/reports/disease`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.summary.totalScans, 1);
    assert.equal(json.data.summary.statusCounts.Healthy, 1);
    assert.match(json.data.summary.disclaimer, /AI-generated preliminary assessment/i);
  });

  it('8. Date range filtering properly restricts records within specified dates', async () => {
    // Query dates in year 2024 (before any records)
    const res = await fetch(
      `${baseUrl}/reports/summary?startDate=2024-01-01&endDate=2024-12-31`,
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    // Soil tests, water, and disease scans are bounded by date range
    assert.equal(json.data.overview.totalSoilTests, 0);
    assert.equal(json.data.overview.totalWaterVolumeLiters, 0);
    assert.equal(json.data.overview.totalDiseaseScans, 0);
  });

  it('9. GET /api/reports/export/csv produces RFC-4180 CSV with UTF-8 BOM', async () => {
    const res = await fetch(`${baseUrl}/reports/export/csv?category=overview`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);
    assert.match(res.headers.get('content-disposition'), /attachment; filename="agrisense_overview_report_/);

    const arrayBuf = await res.arrayBuffer();
    const bomBytes = new Uint8Array(arrayBuf.slice(0, 3));
    // Verify UTF-8 BOM 0xEF, 0xBB, 0xBF
    assert.deepEqual(Array.from(bomBytes), [0xef, 0xbb, 0xbf]);

    const text = new TextDecoder('utf-8').decode(arrayBuf);
    assert.match(text, /AgriSense Intelligent Agriculture Platform/);
    assert.match(text, /Total Registered Farms/);
    assert.match(text, /Total Cultivated Acreage/);
  });

  it('10. GET /api/reports/export/pdf produces valid binary PDF beginning with %PDF-', async () => {
    const res = await fetch(`${baseUrl}/reports/export/pdf?category=overview`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'application/pdf');
    assert.match(res.headers.get('content-disposition'), /attachment; filename="agrisense_overview_report_/);

    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);

    const magic = new Uint8Array(buffer.slice(0, 5));
    const headerStr = String.fromCharCode(...magic);
    assert.equal(headerStr, '%PDF-');
  });

  it('11. Empty state handling: User 2 with 0 records returns zero statistics without errors or NaN', async () => {
    const res = await fetch(`${baseUrl}/reports/summary`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.overview.totalFarms, 0);
    assert.equal(json.data.overview.totalCrops, 0);
    assert.equal(json.data.overview.totalCultivatedArea, 0);
    assert.equal(json.data.overview.avgPh, null);
    assert.equal(json.data.overview.totalWaterVolumeLiters, 0);
    assert.equal(json.data.overview.totalDiseaseScans, 0);
  });
});
