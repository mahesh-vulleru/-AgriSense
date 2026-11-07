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
    '--user-data-dir=' + process.env.TEMP + '\\edge_soil_' + Date.now(),
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

  console.log('Navigating to /dashboard/soil-analysis...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
      localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      window.location.href = '/dashboard/soil-analysis';
    `,
  });

  // Wait 3.5 seconds for complete data load
  await new Promise((r) => setTimeout(r, 3500));

  // 1. Capture Desktop View
  console.log('Capturing Desktop View...');
  const desktopSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_soil_dashboard_desktop.png'), Buffer.from(desktopSnap.result.data, 'base64'));
  console.log('Saved farmer_soil_dashboard_desktop.png');

  // 2. Capture Mobile View
  console.log('Capturing Mobile View (375x812)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 600));
  const mobileSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_soil_dashboard_mobile.png'), Buffer.from(mobileSnap.result.data, 'base64'));
  console.log('Saved farmer_soil_dashboard_mobile.png');

  // Reset viewport back to desktop
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((r) => setTimeout(r, 600));

  // 3. Select Krishna Delta Farm to trigger Trend Chart
  console.log('Selecting Krishna Delta Farm filter for Trend Chart...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const select = Array.from(document.querySelectorAll('select')).find(s => s.previousElementSibling && s.previousElementSibling.textContent.includes('Filter by Farm'));
        if (select) {
          const opt = Array.from(select.options).find(o => o.textContent.includes('Krishna Delta'));
          if (opt) {
            select.value = opt.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      })()
    `,
  });

  await new Promise((r) => setTimeout(r, 1500));
  const trendsSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_soil_trends_chart.png'), Buffer.from(trendsSnap.result.data, 'base64'));
  console.log('Saved farmer_soil_trends_chart.png');

  // 4. Open "Record Soil Test" Modal
  console.log('Opening "Record Soil Test" Modal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Record Soil Test'));
        if (btn) btn.click();
      })()
    `,
  });

  // Verify modal is open and hold for 2.5 seconds to test flicker stability
  await new Promise((r) => setTimeout(r, 2500));
  const modalSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_soil_register_modal.png'), Buffer.from(modalSnap.result.data, 'base64'));
  console.log('Saved farmer_soil_register_modal.png');

  // Close modal by clicking Cancel
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Cancel');
        if (cancelBtn) cancelBtn.click();
      })()
    `,
  });

  await new Promise((r) => setTimeout(r, 800));

  // 5. Open Full Diagnostics Detail Modal
  console.log('Opening Soil Diagnostics Detail Modal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const eyeBtn = document.querySelector('button[title=\"View Full Diagnostics\"]');
        if (eyeBtn) eyeBtn.click();
      })()
    `,
  });

  await new Promise((r) => setTimeout(r, 1000));
  const detailSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_soil_detail_modal.png'), Buffer.from(detailSnap.result.data, 'base64'));
  console.log('Saved farmer_soil_detail_modal.png');

  console.log('All verification snapshots completed successfully.');
  edge.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error in verification:', err);
  process.exit(1);
});
