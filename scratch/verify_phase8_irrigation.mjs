import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Mahesh Vulleru\\.gemini\\antigravity\\brain\\6bc9e3db-148f-4931-8547-76b23a0073b6';

async function main() {
  console.log('Logging in as maheshvulleru@gmail.com...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maheshvulleru@gmail.com', password: 'Mahesh@123' }),
  });
  const { token, user } = await loginRes.json();
  if (!token) throw new Error('Login failed: ' + JSON.stringify(user));

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_irrig_' + Date.now(),
    '--window-size=1280,950',
    'http://localhost:5173/',
  ]);

  await new Promise((r) => setTimeout(r, 1800));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
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

  console.log('Navigating to /dashboard/irrigation...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
      localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      window.location.href = '/dashboard/irrigation';
    `,
  });

  // Wait 3.5 seconds for full data render
  await new Promise((r) => setTimeout(r, 3500));

  // 1. Capture Desktop View (Schedules tab)
  console.log('Capturing Desktop Dashboard (Schedules Tab)...');
  const desktopSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_irrigation_dashboard_desktop.png'), Buffer.from(desktopSnap.result.data, 'base64'));
  console.log('Saved farmer_irrigation_dashboard_desktop.png');

  // 2. Capture Mobile View (375x812)
  console.log('Capturing Mobile View (375x812)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 600));
  const mobileSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_irrigation_mobile.png'), Buffer.from(mobileSnap.result.data, 'base64'));
  console.log('Saved farmer_irrigation_mobile.png');

  // Reset viewport back to desktop
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((r) => setTimeout(r, 600));

  // 3. Switch to "Irrigation Plans" Tab
  console.log('Switching to "Irrigation Plans" Tab...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Irrigation Plans'));
        if (btn) btn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 1000));
  const plansSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_irrigation_plans_tab.png'), Buffer.from(plansSnap.result.data, 'base64'));
  console.log('Saved farmer_irrigation_plans_tab.png');

  // 4. Switch to "Water Consumption" Tab (Recharts curve)
  console.log('Switching to "Water Consumption" Tab...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Water Consumption'));
        if (btn) btn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 1200));
  const waterSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_irrigation_water_chart.png'), Buffer.from(waterSnap.result.data, 'base64'));
  console.log('Saved farmer_irrigation_water_chart.png');

  // 5. Open "Schedule Activity" Modal
  console.log('Opening "Schedule Run" Modal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Schedule Run'));
        if (btn) btn.click();
      })()
    `,
  });
  // Wait 2.5 seconds to verify no flicker / brightness changes
  await new Promise((r) => setTimeout(r, 2500));
  const schedModalSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_irrigation_schedule_modal.png'), Buffer.from(schedModalSnap.result.data, 'base64'));
  console.log('Saved farmer_irrigation_schedule_modal.png');

  console.log('All verification snapshots completed successfully.');
  edge.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error in verification:', err);
  process.exit(1);
});
