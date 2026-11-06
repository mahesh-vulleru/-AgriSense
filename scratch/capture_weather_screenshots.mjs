import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Mahesh Vulleru\\.gemini\\antigravity\\brain\\6bc9e3db-148f-4931-8547-76b23a0073b6';

async function main() {
  console.log('Logging in to obtain session token...');
  let token = '';
  let user = null;

  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'maheshvulleru@gmail.com',
        password: 'Mahesh@123',
      }),
    });
    const loginData = await loginRes.json();
    if (loginData.success && loginData.token) {
      token = loginData.token;
      user = loginData.user;
    }
  } catch (err) {
    console.error('Login error:', err);
  }

  console.log('Token acquired:', Boolean(token));

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_weather_' + Date.now(),
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
  console.log('Connected to Chrome DevTools Protocol!');

  await send('Page.enable');
  await send('Runtime.enable');

  // Inject authentication into localStorage
  if (token && user) {
    const script = `
      localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
      localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      localStorage.setItem('token', ${JSON.stringify(token)});
      localStorage.setItem('user', ${JSON.stringify(JSON.stringify(user))});
      window.location.href = '/dashboard/weather';
    `;
    await send('Runtime.evaluate', { expression: script });
  }

  console.log('Navigating and awaiting weather data load...');
  await new Promise((r) => setTimeout(r, 3500));

  // Capture Desktop Screenshot (1280x900)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await new Promise((r) => setTimeout(r, 1200));

  const desktopScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  const desktopPath = path.join(ARTIFACTS_DIR, 'farmer_weather_desktop.png');
  fs.writeFileSync(desktopPath, Buffer.from(desktopScreenshot.result.data, 'base64'));
  console.log('Saved Desktop Screenshot:', desktopPath);

  // Capture Mobile Screenshot (390x844)
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await new Promise((r) => setTimeout(r, 800));

  const mobileScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  const mobilePath = path.join(ARTIFACTS_DIR, 'farmer_weather_mobile.png');
  fs.writeFileSync(mobilePath, Buffer.from(mobileScreenshot.result.data, 'base64'));
  console.log('Saved Mobile Screenshot:', mobilePath);

  edge.kill();
  console.log('Done!');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
