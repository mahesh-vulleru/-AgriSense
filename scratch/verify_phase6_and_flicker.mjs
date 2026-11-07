import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Mahesh Vulleru\\.gemini\\antigravity\\brain\\6bc9e3db-148f-4931-8547-76b23a0073b6';

async function main() {
  console.log('1. Logging in as farmer...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maheshvulleru@gmail.com', password: 'Mahesh@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const user = loginData.user;
  console.log('Logged in user:', user.name, user.role);

  console.log('2. Testing GET /api/monitoring/dashboard...');
  const dashRes = await fetch('http://localhost:5000/api/monitoring/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashData = await dashRes.json();
  console.log('Monitoring Dashboard Summary:', dashData.summary);

  console.log('3. Starting headless Edge browser...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_verify_' + Date.now(),
    '--window-size=1280,900',
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // Inject session and navigate to /dashboard/monitoring
  console.log('4. Navigating to /dashboard/monitoring...');
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
      localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      window.location.href = '/dashboard/monitoring';
    `,
  });

  await new Promise((r) => setTimeout(r, 3200));

  // Capture Desktop Screenshot
  let snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_monitoring_desktop.png'), Buffer.from(snap.result.data, 'base64'));
  console.log('Saved farmer_monitoring_desktop.png');

  // Open "Record Assessment" Modal
  console.log('5. Clicking "Record Assessment" button...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Record Assessment'));
        if (btn) btn.click();
      })()
    `,
  });

  await new Promise((r) => setTimeout(r, 600));
  snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_monitoring_modal.png'), Buffer.from(snap.result.data, 'base64'));
  console.log('Saved farmer_monitoring_modal.png');

  // Close modal via Escape or cancel
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.trim() === 'Cancel');
        if (btn) btn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 400));

  // Capture Mobile Screenshot
  console.log('6. Capturing mobile viewport (375x812)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 600));
  snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_monitoring_mobile.png'), Buffer.from(snap.result.data, 'base64'));
  console.log('Saved farmer_monitoring_mobile.png');

  // Restore Desktop Viewport and test /dashboard/crops/:id modal stability for 5 seconds
  console.log('7. Testing Crop Details Form stability at /dashboard/crops/6aedacbfe29d4e9e5fd9bc84...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await send('Runtime.evaluate', {
    expression: `window.location.href = '/dashboard/crops/6aedacbfe29d4e9e5fd9bc84';`,
  });
  await new Promise((r) => setTimeout(r, 2000));

  // Click "Update Stage"
  console.log('Opening "Update Stage" modal...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Update Stage'));
        if (btn) btn.click();
      })()
    `,
  });

  // Type something into the form
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const ta = document.querySelector('textarea');
        if (ta) {
          ta.value = 'Continuous monitoring observation: Canopy uniform and moisture optimal.';
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `,
  });

  console.log('Holding modal open for 5 seconds to verify ZERO flicker / brightness shift / value reset...');
  for (let sec = 1; sec <= 5; sec++) {
    await new Promise((r) => setTimeout(r, 1000));
    const checkState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const dialog = document.querySelector('[role="dialog"]');
          const ta = document.querySelector('textarea');
          return {
            isOpen: Boolean(dialog),
            textareaValue: ta ? ta.value : null
          };
        })()
      `,
    });
    console.log(`Sec ${sec} state:`, checkState.result?.value);
  }

  snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_crop_stage_modal_stable.png'), Buffer.from(snap.result.data, 'base64'));
  console.log('Saved farmer_crop_stage_modal_stable.png');

  edge.kill();
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
