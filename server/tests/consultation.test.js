import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import Consultation from '../src/models/Consultation.js';
import ConsultationMessage from '../src/models/ConsultationMessage.js';
import Notification from '../src/models/Notification.js';
import { connectDB } from '../src/config/db.js';
import { initSocket, closeSocket } from '../src/socket/socket.js';

describe('AgriSense Phase 12 - Expert Consultation & Farmer Support Test Suite', () => {
  let server;
  let baseUrl;
  let farmerToken = '';
  let farmerId = '';
  let expertToken = '';
  let expertId = '';
  let otherFarmerToken = '';
  let otherFarmerId = '';
  let farmId = '';
  let cropId = '';
  let consultationId = '';

  const farmerEmail = `farmer_cons_${Date.now()}@consult.test`;
  const expertEmail = `expert_cons_${Date.now()}@consult.test`;
  const otherFarmerEmail = `other_cons_${Date.now()}@consult.test`;
  const testPassword = 'Password123!';

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });

    // 1. Register Farmer
    const regFarmerRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Consultation Farmer',
        email: farmerEmail,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const regFarmerData = await regFarmerRes.json();
    farmerToken = regFarmerData.token;
    farmerId = regFarmerData.user.id;

    // 2. Register Expert directly in DB or via Auth
    const expertUser = new User({
      name: 'Dr. Ramesh Agronomist',
      email: expertEmail,
      passwordHash: regFarmerData.user.id, // placeholder
      role: 'expert',
      location: 'ANGRAU Research Center, Guntur',
      expertProfile: {
        specialization: 'Plant Pathology & Crop Protection',
        qualification: 'Ph.D. in Plant Pathology (IARI)',
        experienceYears: 14,
        institution: 'Regional Agricultural Research Station',
        areasOfExpertise: ['Chili Leaf Curl', 'Cotton Bollworm', 'Bio-Fungicides'],
        availabilityStatus: 'Available',
        consultationModes: ['In-App Message', 'Audio Call'],
        rating: 4.9,
        reviewsCount: 32,
        isVerified: true,
      },
    });
    const salt = '$2a$10$7rXgZ4uG5s9/3v5G8iQ4pe';
    expertUser.passwordHash = await (await import('bcryptjs')).default.hash(testPassword, 10);
    await expertUser.save();
    expertId = expertUser._id.toString();

    // Login Expert to acquire JWT
    const expLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: expertEmail, password: testPassword }),
    });
    const expLoginData = await expLoginRes.json();
    expertToken = expLoginData.token;

    // 3. Register Other Farmer (for IDOR checks)
    const regOtherRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Unauthorized Farmer',
        email: otherFarmerEmail,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const regOtherData = await regOtherRes.json();
    otherFarmerToken = regOtherData.token;
    otherFarmerId = regOtherData.user.id;

    // 4. Create Farm for Farmer
    const farmRes = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        name: 'Guntur Spice Estate',
        location: 'Guntur, Andhra Pradesh',
        acreage: 12,
        coordinates: { latitude: 16.3067, longitude: 80.4365 },
      }),
    });
    const farmData = await farmRes.json();
    farmId = farmData.farm?._id || farmData.farm?.id;

    // 5. Create Crop for Farmer
    const cropRes = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        farm: farmId,
        name: 'Chili (Capsicum annuum)',
        variety: 'Teja S17',
        category: 'Cash Crop',
        season: 'Kharif',
        cultivatedArea: 6,
        growthStage: 'Flowering',
      }),
    });
    const cropData = await cropRes.json();
    cropId = cropData.crop?._id || cropData.crop?.id;
  });

  after(async () => {
    try {
      await ConsultationMessage.deleteMany({ sender: { $in: [farmerId, expertId, otherFarmerId] } });
      await Consultation.deleteMany({ farmer: { $in: [farmerId, otherFarmerId] } });
      await Notification.deleteMany({ farmer: { $in: [farmerId, expertId, otherFarmerId] } });
      await Crop.deleteMany({ owner: { $in: [farmerId, otherFarmerId] } });
      await Farm.deleteMany({ owner: { $in: [farmerId, otherFarmerId] } });
      await User.deleteMany({ _id: { $in: [farmerId, expertId, otherFarmerId] } });
    } catch {
      // Ignore cleanup
    }

    await closeSocket();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Returns verified agricultural specialists via GET /api/consultations/experts', async () => {
    const res = await fetch(`${baseUrl}/consultations/experts`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    const ram = body.data.find((e) => e.email === expertEmail);
    assert.ok(ram, 'Expert must be present in directory');
    assert.strictEqual(ram.name, 'Dr. Ramesh Agronomist');
    assert.strictEqual(ram.expertProfile?.specialization, 'Plant Pathology & Crop Protection');
    assert.strictEqual(ram.expertProfile?.isVerified, true);
  });

  it('2. Prevents creating consultation on a farm or crop owned by another farmer (IDOR)', async () => {
    const res = await fetch(`${baseUrl}/consultations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherFarmerToken}`,
      },
      body: JSON.stringify({
        farmId,
        cropId,
        subject: 'Unauthorized access test',
        description: 'Trying to request consultation on another farmer parcel.',
        category: 'Crop Protection',
      }),
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('not found') || body.message.includes('unauthorized'));
  });

  it('3. Farmer creates consultation request with unique reference ID', async () => {
    const res = await fetch(`${baseUrl}/consultations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        farmId,
        cropId,
        subject: 'Foliar curling and necrotic brown spots on chili leaves',
        description: 'Leaves on northern rows show severe curling and downward margin cupping. Please advise on curative measures.',
        category: 'Plant Diseases',
        priority: 'High',
        preferredMethod: 'In-App Message',
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(body.data.referenceId);
    assert.ok(body.data.referenceId.startsWith('CONS-'));
    assert.strictEqual(body.data.status, 'Submitted');
    assert.strictEqual(body.data.priority, 'High');
    assert.ok(body.data.statusHistory.length >= 1);

    consultationId = body.data._id || body.data.id;
  });

  it('4. Farmer retrieves their consultations list with summary KPIs via GET /api/consultations/farmer', async () => {
    const res = await fetch(`${baseUrl}/consultations/farmer?status=all`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.consultations));
    assert.strictEqual(body.data.summary.total, 1);
    assert.strictEqual(body.data.summary.pending, 1);
  });

  it('5. Expert retrieves open/available consultations queue via GET /api/consultations/expert', async () => {
    const res = await fetch(`${baseUrl}/consultations/expert`, {
      headers: { Authorization: `Bearer ${expertToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.consultations));
    const target = body.data.consultations.find((c) => (c._id || c.id) === consultationId);
    assert.ok(target, 'Consultation must be visible in expert queue');
  });

  it('6. Expert accepts consultation request via PATCH /api/consultations/:id/accept', async () => {
    const res = await fetch(`${baseUrl}/consultations/${consultationId}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${expertToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'Accepted');
    assert.strictEqual(body.data.expert.toString(), expertId);

    // Verify notification was sent to farmer
    const notifs = await Notification.find({ farmer: farmerId });
    const hasAcceptedNotif = notifs.some((n) => n.title.includes('Consultation Accepted'));
    assert.ok(hasAcceptedNotif, 'Farmer must receive acceptance notification');
  });

  it('7. Handles two-way consultation messaging and authorization', async () => {
    // A) Farmer sends message
    const farmerMsgRes = await fetch(`${baseUrl}/consultations/${consultationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        message: 'Hello Doctor, the curling started 3 days after sudden rainfall.',
      }),
    });
    assert.strictEqual(farmerMsgRes.status, 201);
    const farmerMsgData = await farmerMsgRes.json();
    assert.strictEqual(farmerMsgData.success, true);
    assert.strictEqual(farmerMsgData.data.senderRole, 'farmer');

    // B) Expert sends reply
    const expMsgRes = await fetch(`${baseUrl}/consultations/${consultationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expertToken}`,
      },
      body: JSON.stringify({
        message: 'Thank you for the observation. This is characteristic of thrips/mite vector combined with fungal leaf spot.',
      }),
    });
    assert.strictEqual(expMsgRes.status, 201);

    // C) Other farmer cannot post to this consultation
    const unauthorizedMsgRes = await fetch(`${baseUrl}/consultations/${consultationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherFarmerToken}`,
      },
      body: JSON.stringify({ message: 'Intrusion attempt' }),
    });
    assert.strictEqual(unauthorizedMsgRes.status, 403);

    // D) Retrieve message history
    const historyRes = await fetch(`${baseUrl}/consultations/${consultationId}/messages`, {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(historyRes.status, 200);
    const historyData = await historyRes.json();
    assert.ok(historyData.data.length >= 2);
  });

  it('8. Expert submits structured agronomic recommendations', async () => {
    const recPayload = {
      problemAssessment: 'Thrips and mite infestation causing leaf curl syndrome, accompanied by secondary Cercospora leaf spot.',
      possibleCauses: [
        'Prolonged dry spell followed by rainfall triggering vector breeding',
        'High nitrogen top-dressing softening foliage tissues',
      ],
      recommendedPractices: [
        'Foliar spray of neem-based Azadirachtin (10,000 ppm) at 2 ml/liter of water',
        'Introduce yellow and blue sticky traps (15 traps/acre) to control insect vector',
        'Avoid excessive urea fertilizer application during active flowering',
      ],
      preventiveMeasures: [
        'Maintain border barrier crops such as maize or sorghum',
        'Monitor irrigation scheduling to eliminate drought stress cycles',
      ],
      followUpInstructions: 'Inspect new apical leaf emergence in 6-8 days.',
      expertNotes: 'Organic biocontrol preferred given current flowering stage.',
      recommendedNextSteps: ['Install sticky traps', 'Apply biopesticide at dawn'],
    };

    const res = await fetch(`${baseUrl}/consultations/${consultationId}/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expertToken}`,
      },
      body: JSON.stringify(recPayload),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'Response Provided');
    assert.strictEqual(body.data.recommendation.problemAssessment, recPayload.problemAssessment);
    assert.strictEqual(body.data.recommendation.recommendedPractices.length, 3);

    // Verify farmer received notification
    const notifs = await Notification.find({ farmer: farmerId });
    const hasAdviceNotif = notifs.some((n) => n.title.includes('Expert Advice Provided'));
    assert.ok(hasAdviceNotif, 'Farmer must receive advice notification');
  });

  it('9. Farmer marks consultation as completed with feedback rating', async () => {
    const res = await fetch(`${baseUrl}/consultations/${consultationId}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${farmerToken}`,
      },
      body: JSON.stringify({
        rating: 5,
        feedback: 'Dr. Ramesh provided fast, actionable biocontrol guidance that resolved the leaf curling!',
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'Completed');
    assert.strictEqual(body.data.rating, 5);
  });

  it('10. Enforces IDOR data isolation: Other farmer cannot view consultation details', async () => {
    const res = await fetch(`${baseUrl}/consultations/${consultationId}`, {
      headers: { Authorization: `Bearer ${otherFarmerToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });
});
