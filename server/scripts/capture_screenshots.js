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

    console.log('4. Navigating to Farmer Dashboard...');
    await send('Page.navigate', { url: 'http://localhost:5173/dashboard' });
    await sleep(2500);

    // A. Desktop Screenshot (1440x1600)
    console.log('5. Capturing desktop screenshot (1440x1600)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1600,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(1000);

    const desktopCapture = await send('Page.captureScreenshot', { format: 'png' });
    const desktopPath = path.join(ARTIFACT_DIR, 'farmer_dashboard_phase3_desktop.png');
    fs.writeFileSync(desktopPath, Buffer.from(desktopCapture.data, 'base64'));
    console.log('Saved desktop screenshot to:', desktopPath);

    // B. Mobile Screenshot (390x1500 - iPhone 14 style)
    console.log('6. Capturing mobile screenshot (390x1500)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 1500,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);

    const mobileCapture = await send('Page.captureScreenshot', { format: 'png' });
    const mobilePath = path.join(ARTIFACT_DIR, 'farmer_dashboard_phase3_mobile.png');
    fs.writeFileSync(mobilePath, Buffer.from(mobileCapture.data, 'base64'));
    console.log('Saved mobile screenshot to:', mobilePath);

    ws.close();
    console.log('Screenshots captured successfully!');
  } finally {
    chromeProcess.kill();
  }
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
