import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Mahesh Vulleru\\.gemini\\antigravity\\brain\\6bc9e3db-148f-4931-8547-76b23a0073b6';

async function main() {
  console.log('1. Logging in as farmer maheshvulleru@gmail.com...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maheshvulleru@gmail.com', password: 'Mahesh@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const user = loginData.user;
  if (!token) throw new Error('Login failed: ' + JSON.stringify(loginData));
  console.log(`Logged in successfully as ${user.name} (${user.email})`);

  console.log('2. Syncing active platform alerts via POST /api/notifications/sync...');
  const syncRes = await fetch('http://localhost:5000/api/notifications/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const syncData = await syncRes.json();
  console.log('Sync result:', syncData.message, 'Alerts created:', syncData.data?.createdCount);

  // Check unread count
  const unreadRes = await fetch('http://localhost:5000/api/notifications/unread-count', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const unreadData = await unreadRes.json();
  console.log('Current unread notification count:', unreadData.data?.unreadCount);

  console.log('3. Launching headless Microsoft Edge...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--remote-debugging-port=9223',
    '--user-data-dir=' + process.env.TEMP + '\\edge_notif_phase11_' + Date.now(),
    '--window-size=1280,950',
    'http://localhost:5173/',
  ]);

  await new Promise((r) => setTimeout(r, 2200));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://localhost:9223/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  let msgId = 1;
  const callbacks = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data);
      callbacks.delete(data.id);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');

  console.log('4. Navigating to /dashboard/notifications...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
      localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      window.location.href = '/dashboard/notifications';
    `,
  });

  // Wait 4 seconds for full hydration and Socket.IO connection
  await new Promise((r) => setTimeout(r, 4000));

  // 1. Capture Desktop Notifications Overview
  console.log('5. Capturing Desktop Notifications Dashboard...');
  const desktopSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'farmer_notifications_dashboard_desktop.png'),
    Buffer.from(desktopSnap.result.data, 'base64')
  );
  console.log('Saved farmer_notifications_dashboard_desktop.png');

  // 2. Open Notification Preferences Modal
  console.log('6. Opening Preferences Modal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Preferences'));
        if (btn) btn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 1200));

  const modalSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'farmer_notifications_preferences_modal.png'),
    Buffer.from(modalSnap.result.data, 'base64')
  );
  console.log('Saved farmer_notifications_preferences_modal.png');

  // Close modal with Cancel or Escape
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
        if (cancelBtn) cancelBtn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 800));

  // 3. Capture Mobile View (390x844)
  console.log('7. Capturing Mobile Notifications View (390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 1000));
  const mobileSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'farmer_notifications_dashboard_mobile.png'),
    Buffer.from(mobileSnap.result.data, 'base64')
  );
  console.log('Saved farmer_notifications_dashboard_mobile.png');

  // Reset viewport to desktop
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((r) => setTimeout(r, 600));

  // 4. Navigate to /dashboard to capture TopNavbar and Sidebar badges
  console.log('8. Navigating to /dashboard to inspect live notification badges...');
  await send('Runtime.evaluate', {
    expression: `window.location.href = '/dashboard';`,
  });
  await new Promise((r) => setTimeout(r, 3000));

  const badgeSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'farmer_topnavbar_notification_badge.png'),
    Buffer.from(badgeSnap.result.data, 'base64')
  );
  console.log('Saved farmer_topnavbar_notification_badge.png');

  // Teardown
  ws.close();
  edge.kill();
  console.log('Phase 11 verification completed successfully!');
}

main().catch((err) => {
  console.error('Phase 11 verification failed:', err);
  process.exit(1);
});
