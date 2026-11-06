import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\Mahesh Vulleru\\.gemini\\antigravity\\brain\\6bc9e3db-148f-4931-8547-76b23a0073b6';
const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  console.log('1. Authenticating to obtain live session token...');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'maheshvulleru@gmail.com',
      password: 'Mahesh@123',
    }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    throw new Error('Failed to login: ' + JSON.stringify(loginData));
  }
  const token = loginData.token;
  const user = loginData.user;
  console.log('Logged in as:', user.name);

  // Launch headless Chrome with remote debugging
  console.log('2. Launching headless browser...');
  const port = 9222;
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${port}`,
      '--remote-allow-origins=*',
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--hide-scrollbars',
      'http://localhost:5173/login',
    ],
    { stdio: 'ignore' }
  );

  await sleep(1500);

  try {
    // Connect via CDP
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    console.log('Target found:', pageTarget.title, pageTarget.url);
    const wsUrl = pageTarget.webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    let messageId = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = messageId++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            ws.removeEventListener('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('3. Injecting authentication into browser localStorage...');
    await sleep(1000);
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
        localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      `,
    });

    // 1. Desktop View of Farmer Dashboard with Restructured Sidebar
    console.log('4. Navigating to Farmer Dashboard...');
    await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
    await sleep(2500);

    console.log('5. Capturing desktop sidebar & dashboard (1440x1200)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1200,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(1200);

    const desktopCapture = await send('Page.captureScreenshot', { format: 'png' });
    const desktopPath = path.join(ARTIFACT_DIR, 'farmer_workflow_sidebar_desktop.png');
    fs.writeFileSync(desktopPath, Buffer.from(desktopCapture.data, 'base64'));
    console.log('Saved desktop sidebar screenshot to:', desktopPath);

    // 2. Desktop View of Crop Monitoring (showing dynamic breadcrumbs & module status)
    console.log('6. Navigating to Crop Monitoring...');
    await send('Page.navigate', { url: 'http://localhost:5173/dashboard/monitoring' });
    await sleep(2000);

    const monitoringCapture = await send('Page.captureScreenshot', { format: 'png' });
    const monitoringPath = path.join(ARTIFACT_DIR, 'farmer_workflow_monitoring_desktop.png');
    fs.writeFileSync(monitoringPath, Buffer.from(monitoringCapture.data, 'base64'));
    console.log('Saved crop monitoring screenshot to:', monitoringPath);

    // 3. Mobile View (390x844) with Open Drawer
    console.log('7. Setting mobile viewport and opening sidebar drawer...');
    await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1500);

    // Open mobile sidebar by clicking hamburger
    await send('Runtime.evaluate', {
      expression: `
        const btn = document.querySelector('button[aria-label="Open navigation drawer"]') || document.querySelector('button[aria-label="Open sidebar"]');
        if (btn) btn.click();
      `,
    });
    await sleep(800);

    const mobileDrawerCapture = await send('Page.captureScreenshot', { format: 'png' });
    const mobileDrawerPath = path.join(ARTIFACT_DIR, 'farmer_workflow_mobile_drawer.png');
    fs.writeFileSync(mobileDrawerPath, Buffer.from(mobileDrawerCapture.data, 'base64'));
    console.log('Saved mobile drawer screenshot to:', mobileDrawerPath);

    ws.close();
    console.log('All screenshots captured successfully!');
  } finally {
    chromeProcess.kill();
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
