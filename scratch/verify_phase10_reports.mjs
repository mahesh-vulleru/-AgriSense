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
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_reports_phase10_' + Date.now(),
    '--window-size=1280,950',
    'http://localhost:5173/',
  ]);

  await new Promise((r) => setTimeout(r, 2000));

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

  console.log('Navigating to /dashboard/reports...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
      localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      window.location.href = '/dashboard/reports';
    `,
  });

  // Wait 3.5 seconds for complete data load
  await new Promise((r) => setTimeout(r, 3500));

  // 1. Capture Desktop Overview Dashboard
  console.log('Capturing Desktop Reports Overview...');
  const desktopSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_reports_dashboard_desktop.png'), Buffer.from(desktopSnap.result.data, 'base64'));
  console.log('Saved farmer_reports_dashboard_desktop.png');

  // 2. Capture Mobile View (375x812)
  console.log('Capturing Mobile Reports View (375x812)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 800));
  const mobileSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_reports_dashboard_mobile.png'), Buffer.from(mobileSnap.result.data, 'base64'));
  console.log('Saved farmer_reports_dashboard_mobile.png');

  // Reset viewport to desktop
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 950,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((r) => setTimeout(r, 800));

  // 3. Switch to "Crop Performance & Yield" Tab
  console.log('Switching to "Crop Performance" Tab...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Crop Performance'));
        if (btn) btn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 1200));
  const cropsSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_reports_crops_tab.png'), Buffer.from(cropsSnap.result.data, 'base64'));
  console.log('Saved farmer_reports_crops_tab.png');

  // 4. Switch to "Soil Fertility & Health" Tab
  console.log('Switching to "Soil Fertility & Health" Tab...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Soil Fertility'));
        if (btn) btn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 1200));
  const soilSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_reports_soil_tab.png'), Buffer.from(soilSnap.result.data, 'base64'));
  console.log('Saved farmer_reports_soil_tab.png');

  // 5. Switch to "Irrigation & Water" Tab
  console.log('Switching to "Irrigation & Water" Tab...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Irrigation & Water'));
        if (btn) btn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 1200));
  const irrigationSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_reports_irrigation_tab.png'), Buffer.from(irrigationSnap.result.data, 'base64'));
  console.log('Saved farmer_reports_irrigation_tab.png');

  // 6. Test Direct PDF Download for Mahesh
  console.log('Testing direct PDF generation for Mahesh...');
  const pdfRes = await fetch('http://localhost:5000/api/reports/export/pdf?category=overview', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const pdfBuf = await pdfRes.arrayBuffer();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'agrisense_mahesh_report.pdf'), Buffer.from(pdfBuf));
  console.log('Saved agrisense_mahesh_report.pdf (Size:', pdfBuf.byteLength, 'bytes)');

  // 7. Test Direct CSV Export for Mahesh
  console.log('Testing direct CSV generation for Mahesh...');
  const csvRes = await fetch('http://localhost:5000/api/reports/export/csv?category=overview', {
    headers: { Authorization: 'Bearer ' + token },
  });
  const csvText = await csvRes.text();
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'agrisense_mahesh_report.csv'), csvText, 'utf-8');
  console.log('Saved agrisense_mahesh_report.csv');

  console.log('All verification snapshots and exports completed successfully.');
  edge.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error in verification:', err);
  process.exit(1);
});
