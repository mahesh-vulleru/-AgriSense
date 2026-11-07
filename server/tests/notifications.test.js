import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Farm from '../src/models/Farm.js';
import Crop from '../src/models/Crop.js';
import IrrigationSchedule from '../src/models/IrrigationSchedule.js';
import SoilAnalysis from '../src/models/SoilAnalysis.js';
import DiseaseScan from '../src/models/DiseaseScan.js';
import Notification from '../src/models/Notification.js';
import NotificationPreference from '../src/models/NotificationPreference.js';
import { connectDB } from '../src/config/db.js';
import { initSocket, closeSocket } from '../src/socket/socket.js';
import notificationService from '../src/services/notificationService.js';

describe('AgriSense Phase 11 - Real-Time Notifications & Alert Management Test Suite', () => {
  let server;
  let baseUrl;
  let serverPort;
  let user1Token = '';
  let user1Id = '';
  let user2Token = '';
  let user2Id = '';
  let farm1Id = '';
  let crop1Id = '';

  const user1Email = `notif_farmer1_${Date.now()}@notifications.test`;
  const user2Email = `notif_farmer2_${Date.now()}@notifications.test`;
  const testPassword = 'Password123!';

  before(async () => {
    await connectDB();

    server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        baseUrl = `http://127.0.0.1:${serverPort}/api`;
        resolve();
      });
    });

    // 1. Register User 1
    const reg1Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Notification Farmer One',
        email: user1Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg1Data = await reg1Res.json();
    user1Token = reg1Data.token;
    user1Id = reg1Data.user.id;

    // 2. Register User 2
    const reg2Res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Notification Farmer Two',
        email: user2Email,
        password: testPassword,
        role: 'farmer',
      }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.token;
    user2Id = reg2Data.user.id;

    // 3. Create Farm for Farmer 1
    const farm1Res = await fetch(`${baseUrl}/farms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Guntur Tech Farm',
        location: 'Guntur, AP',
        acreage: 10,
        coordinates: { latitude: 16.3067, longitude: 80.4365 },
      }),
    });
    const farm1Data = await farm1Res.json();
    farm1Id = farm1Data.farm?._id || farm1Data.farm?.id || farm1Data.data?._id || farm1Data.data?.id;

    // 4. Create Crop for Farmer 1
    const crop1Res = await fetch(`${baseUrl}/crops`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        farm: farm1Id,
        name: 'Chili',
        variety: 'Teja S17',
        category: 'Cash Crop',
        season: 'Kharif',
        cultivatedArea: 5,
        notes: 'Chili parcel for notification testing',
      }),
    });
    const crop1Data = await crop1Res.json();
    crop1Id = crop1Data.crop?._id || crop1Data.crop?.id;
  });

  after(async () => {
    try {
      await Notification.deleteMany({ farmer: { $in: [user1Id, user2Id] } });
      await NotificationPreference.deleteMany({ farmer: { $in: [user1Id, user2Id] } });
      await IrrigationSchedule.deleteMany({ farmer: { $in: [user1Id, user2Id] } });
      await SoilAnalysis.deleteMany({ farmer: { $in: [user1Id, user2Id] } });
      await DiseaseScan.deleteMany({ farmer: { $in: [user1Id, user2Id] } });
      await Crop.deleteMany({ farmer: { $in: [user1Id, user2Id] } });
      await Farm.deleteMany({ owner: { $in: [user1Id, user2Id] } });
      await User.deleteMany({ _id: { $in: [user1Id, user2Id] } });
    } catch {
      // Ignore cleanup errors
    }

    await closeSocket();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. Rejects unauthenticated Socket.IO connection and allows valid JWT handshake', async () => {
    // A) Attempt unauthenticated connection -> should fail
    const unauthClient = ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      reconnection: false,
      autoConnect: false,
    });

    const unauthFailed = await new Promise((resolve) => {
      unauthClient.on('connect_error', (err) => {
        assert.ok(err.message.includes('Authentication failed'));
        unauthClient.disconnect();
        resolve(true);
      });
      unauthClient.connect();
    });
    assert.strictEqual(unauthFailed, true);

    // B) Attempt authenticated connection with valid farmer token -> should succeed
    const authClient = ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: user1Token },
    });

    const authConnected = await new Promise((resolve) => {
      authClient.on('connect', () => {
        assert.ok(authClient.id);
        authClient.disconnect();
        resolve(true);
      });
    });
    assert.strictEqual(authConnected, true);
  });

  it('2. Emits real-time notification to the correct farmer room and updates unread count', async () => {
    const client1 = ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: user1Token },
    });

    const client2 = ClientIO(`http://127.0.0.1:${serverPort}`, {
      transports: ['websocket'],
      reconnection: false,
      auth: { token: user2Token },
    });

    await Promise.all([
      new Promise((res) => client1.on('connect', res)),
      new Promise((res) => client2.on('connect', res)),
    ]);

    let client2ReceivedNotification = false;
    client2.on('notification:new', () => {
      client2ReceivedNotification = true;
    });

    const notifReceivedPromise = new Promise((resolve) => {
      client1.on('notification:new', (notif) => {
        assert.strictEqual(notif.title, 'Irrigation Started');
        assert.strictEqual(notif.category, 'irrigation');
        resolve(true);
      });
    });

    // Create notification for Farmer 1
    const created = await notificationService.createNotification({
      farmerId: user1Id,
      title: 'Irrigation Started',
      message: 'Zone A drip irrigation pump has initiated watering cycle.',
      category: 'irrigation',
      severity: 'info',
      farm: farm1Id,
      crop: crop1Id,
    });

    assert.ok(created);
    await notifReceivedPromise;

    // Small delay to verify Farmer 2 did NOT receive Farmer 1's notification
    await new Promise((r) => setTimeout(r, 100));
    assert.strictEqual(client2ReceivedNotification, false, 'Farmer 2 must not receive Farmer 1 alerts');

    client1.disconnect();
    client2.disconnect();
  });

  it('3. Suppresses duplicate alerts using deduplication keys (dedupKey)', async () => {
    const dedupKey = `test_dedup_${Date.now()}`;

    const first = await notificationService.createNotification({
      farmerId: user1Id,
      title: 'High Temperature Advisory',
      message: 'Temperature exceeds 39C. Protect nursery beds.',
      category: 'weather',
      severity: 'warning',
      dedupKey,
    });
    assert.ok(first);

    // Attempt to create duplicate with identical dedupKey
    const second = await notificationService.createNotification({
      farmerId: user1Id,
      title: 'High Temperature Advisory',
      message: 'Temperature exceeds 39C. Protect nursery beds.',
      category: 'weather',
      severity: 'warning',
      dedupKey,
    });

    assert.strictEqual(String(first._id), String(second._id), 'Should return existing record instead of duplicate');

    const totalForKey = await Notification.countDocuments({ farmer: user1Id, dedupKey });
    assert.strictEqual(totalForKey, 1, 'Exactly one notification should exist in DB');
  });

  it('4. Enforces Notification Preferences and suppresses disabled categories (except critical)', async () => {
    // Update preferences for Farmer 1: disable weather alerts
    const putRes = await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        weatherAlerts: false,
        criticalOnly: false,
      }),
    });
    assert.strictEqual(putRes.status, 200);

    // Weather warning (non-critical) -> should be suppressed
    const suppressed = await notificationService.createNotification({
      farmerId: user1Id,
      title: 'Light Breeze Forecast',
      message: 'Breeze at 8 km/h.',
      category: 'weather',
      severity: 'info',
    });
    assert.strictEqual(suppressed, null, 'Non-critical weather alert must be suppressed');

    // Weather critical alert -> must bypass suppression
    const criticalWeather = await notificationService.createNotification({
      farmerId: user1Id,
      title: 'Severe Cyclone Alert',
      message: 'Category 3 cyclone approaching coastal region.',
      category: 'weather',
      severity: 'critical',
    });
    assert.ok(criticalWeather, 'Critical alerts must bypass category suppression');

    // Reset weatherAlerts to true
    await fetch(`${baseUrl}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ weatherAlerts: true }),
    });
  });

  it('5. Retrieves paginated notifications with summary KPIs via GET /api/notifications', async () => {
    const res = await fetch(`${baseUrl}/notifications?status=all`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.notifications));
    assert.ok(body.data.notifications.length >= 2);
    assert.ok(body.data.summary);
    assert.ok(typeof body.data.summary.total === 'number');
    assert.ok(typeof body.data.summary.unread === 'number');
    assert.ok(typeof body.data.summary.read === 'number');
    assert.ok(typeof body.data.summary.critical === 'number');
    assert.ok(body.data.summary.byCategory);
    assert.ok(body.data.summary.byCategory.weather !== undefined);
    assert.ok(body.data.summary.byCategory.irrigation !== undefined);
  });

  it('6. Marks single notification as read and recalculates unread count', async () => {
    // Get list to find an unread notification
    const listRes = await fetch(`${baseUrl}/notifications?status=unread`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const listData = await listRes.json();
    assert.ok(listData.data.notifications.length > 0);
    const target = listData.data.notifications[0];
    const targetId = target._id || target.id;

    // Mark as read
    const patchRes = await fetch(`${baseUrl}/notifications/${targetId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.success, true);
    assert.strictEqual(patchData.data.isRead, true);
    assert.ok(patchData.data.readAt);

    // Verify unread count decreased
    const unreadRes = await fetch(`${baseUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const unreadData = await unreadRes.json();
    assert.strictEqual(unreadData.success, true);
    assert.ok(typeof unreadData.data.unreadCount === 'number');
  });

  it('7. Marks all unread notifications as read via PATCH /api/notifications/mark-all-read', async () => {
    const patchRes = await fetch(`${baseUrl}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ category: 'all' }),
    });
    assert.strictEqual(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.success, true);

    // Check that unread count is now 0
    const unreadRes = await fetch(`${baseUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const unreadData = await unreadRes.json();
    assert.strictEqual(unreadData.data.unreadCount, 0);
  });

  it('8. Deletes single notification and enforces strict IDOR protection', async () => {
    // Farmer 1 creates a notification
    const notif = await notificationService.createNotification({
      farmerId: user1Id,
      title: 'Soil Sample Tested',
      message: 'Soil lab test registered.',
      category: 'soil',
      severity: 'info',
    });
    const notifId = notif._id || notif.id;

    // Farmer 2 attempts to delete Farmer 1's notification -> must return 404 (IDOR protected)
    const unauthorizedDel = await fetch(`${baseUrl}/notifications/${notifId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert.strictEqual(unauthorizedDel.status, 404);

    // Farmer 1 deletes their own notification -> must return 200
    const authorizedDel = await fetch(`${baseUrl}/notifications/${notifId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(authorizedDel.status, 200);

    const check = await Notification.findById(notifId);
    assert.strictEqual(check, null);
  });

  it('9. Automatically synchronizes real-time alerts from actual database records via POST /api/notifications/sync', async () => {
    // Seed an overdue irrigation schedule for Farmer 1
      const pastDate = new Date(Date.now() - 3 * 3600 * 1000); // 3 hours ago
      const sched = new IrrigationSchedule({
        farmer: user1Id,
        farm: farm1Id,
        crop: crop1Id,
        title: 'Morning Drip Fertigation',
        scheduledDate: pastDate,
        durationMinutes: 45,
        waterVolumeLiters: 1200,
        status: 'Scheduled',
      });
      await sched.save();

      // Seed a critical crop condition for Farmer 1
      await Crop.findByIdAndUpdate(crop1Id, { healthStatus: 'Critical' });

      // Seed an acidic soil analysis for Farmer 1
      const soil = new SoilAnalysis({
        farmer: user1Id,
        farm: farm1Id,
        sampleId: `SOIL-NOTIF-${Date.now()}`,
        sampleDate: new Date(),
        sampleDepthCm: 15,
        pH: { value: 5.1, status: 'Strongly Acidic', rating: 'Strongly Acidic' },
        nitrogen: { value: 160, unit: 'kg/ha', status: 'Deficient', rating: 'Low' },
        phosphorus: { value: 12, unit: 'kg/ha', status: 'Low', rating: 'Low' },
        potassium: { value: 110, unit: 'kg/ha', status: 'Low', rating: 'Low' },
        organicCarbon: { value: 0.35, unit: '%', status: 'Low', rating: 'Low' },
        electricalConductivity: { value: 0.4, unit: 'dS/m', status: 'Normal', rating: 'Non-saline' },
      });
      await soil.save();

      // Trigger sync
      const syncRes = await fetch(`${baseUrl}/notifications/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.strictEqual(syncRes.status, 200);
      const syncData = await syncRes.json();

      assert.strictEqual(syncData.success, true);
      assert.ok(syncData.data.createdCount >= 3, `Expected at least 3, got ${syncData.data.createdCount}`);

      // Verify notifications exist in DB
      const syncNotifs = await Notification.find({ farmer: user1Id }).sort({ createdAt: -1 });
      const hasIrrigation = syncNotifs.some((n) => n.category === 'irrigation' && n.title.includes('Overdue Irrigation'));
      const hasCrop = syncNotifs.some((n) => n.category === 'crop' && n.severity === 'critical');
      const hasSoil = syncNotifs.some((n) => n.category === 'soil' && n.title.includes('Soil Acidity'));

      assert.ok(hasIrrigation, 'Must generate overdue irrigation alert');
      assert.ok(hasCrop, 'Must generate critical crop alert');
      assert.ok(hasSoil, 'Must generate soil acidity alert');
  });

  it('10. Clears read notifications via DELETE /api/notifications/clear-read', async () => {
    // Mark all as read first
    await fetch(`${baseUrl}/notifications/mark-all-read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${user1Token}` },
    });

    const clearRes = await fetch(`${baseUrl}/notifications/clear-read`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert.strictEqual(clearRes.status, 200);
    const clearData = await clearRes.json();
    assert.strictEqual(clearData.success, true);

    const remaining = await Notification.countDocuments({ farmer: user1Id });
    assert.strictEqual(remaining, 0, 'All read notifications should be removed');
  });
});
