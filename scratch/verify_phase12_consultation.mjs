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

  console.log('2. Fetching farmer consultations to get active consultation ID...');
  const consListRes = await fetch('http://localhost:5000/api/consultations/farmer', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const consListData = await consListRes.json();
  const consultation = consListData.data?.consultations?.[0];
  const consultationId = consultation?._id || consultation?.id;
  console.log('Active consultation:', consultation?.referenceId, 'ID:', consultationId);

  console.log('3. Launching Microsoft Edge in headless mode...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-sync',
    '--remote-debugging-port=9224',
    '--user-data-dir=' + process.env.TEMP + '\\edge_cons_phase12_' + Date.now(),
    '--window-size=1280,950',
    'http://localhost:5173/login',
  ]);

  await new Promise((r) => setTimeout(r, 2200));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://localhost:9224/json', (res) => {
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

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = msgId++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  // Helper to capture full screenshot
  const captureScreenshot = async (filename) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const outPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${outPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  };

  // Helper to evaluate script
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result?.subtype === 'error' || res.exceptionDetails) {
      console.error('Eval error:', res.exceptionDetails?.text || res.result?.description);
    }
    return res.result?.value;
  };

  console.log('4. Navigating to AgriSense & setting auth tokens...');
  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise((r) => setTimeout(r, 1200));

  await evaluate(`
    (() => {
      localStorage.setItem('agrisense_token', '${token}');
      localStorage.setItem('agrisense_user', JSON.stringify(${JSON.stringify(user)}));
      window.location.href = '/dashboard/consultation';
    })()
  `);
  await new Promise((r) => setTimeout(r, 3500));

  const pageInfo = await evaluate(`
    (() => JSON.stringify({
      url: window.location.href,
      title: document.title,
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean).slice(0, 10),
      cards: document.querySelectorAll('.rounded-2xl').length
    }))()
  `);
  console.log('Page loaded:', pageInfo);

  // Screenshot 1: Farmer Consultation Dashboard
  await captureScreenshot('farmer_consultation_dashboard_desktop.png');

  console.log('6. Switching to Verified Expert Directory tab...');
  const tabClickResult = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const expTab = btns.find(b => b.textContent.includes('Verified Expert Directory'));
      if (expTab) {
        expTab.click();
        return 'Clicked Verified Expert Directory';
      }
      return 'Not found, buttons: ' + btns.map(b => b.textContent.trim()).join(' | ');
    })()
  `);
  console.log('Tab switch result:', tabClickResult);
  await new Promise((r) => setTimeout(r, 2000));

  // Screenshot 2: Expert Directory
  await captureScreenshot('farmer_consultation_expert_directory.png');

  console.log('7. Opening Request Consultation modal...');
  const reqClickResult = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const reqBtn = btns.find(b => b.textContent.includes('Request Advisory') || b.textContent.includes('Request Consultation'));
      if (reqBtn) {
        reqBtn.click();
        return 'Clicked button: ' + reqBtn.textContent.trim();
      }
      return 'Not found, buttons: ' + btns.map(b => b.textContent.trim()).join(' | ');
    })()
  `);
  console.log('Request modal open result:', reqClickResult);
  await new Promise((r) => setTimeout(r, 2000));

  // Screenshot 3: Consultation Request Modal
  await captureScreenshot('farmer_consultation_request_modal.png');

  // Close modal
  await evaluate(`
    (() => {
      const closeBtn = document.querySelector('button[title="Close"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Cancel');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 800));

  console.log(`8. Navigating to Consultation Workspace: /dashboard/consultation/${consultationId}...`);
  await evaluate(`
    (() => {
      window.location.href = '/dashboard/consultation/${consultationId}';
    })()
  `);
  await new Promise((r) => setTimeout(r, 3500));

  const wsInfo = await evaluate(`
    (() => JSON.stringify({
      url: window.location.href,
      title: document.title,
      h1: document.querySelector('h1')?.innerText,
      messagesCount: document.querySelectorAll('.rounded-2xl').length,
      hasInput: !!document.querySelector('input[type="text"]')
    }))()
  `);
  console.log('Workspace loaded:', wsInfo);

  console.log('9. Sending real-time chat message from Farmer...');
  const chatResult = await evaluate(`
    (() => {
      const input = document.querySelector('input[placeholder*="message"]');
      if (input) {
        input.value = "Thank you Dr. Ganesh! I will commence the copper oxychloride spray tomorrow morning.";
        input.dispatchEvent(new Event('input', { bubbles: true }));
        const form = input.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          return 'Dispatched chat message submit';
        }
      }
      return 'Input not found';
    })()
  `);
  console.log('Chat send result:', chatResult);
  await new Promise((r) => setTimeout(r, 2000));

  // Screenshot 4: Consultation Workspace & Live Chat
  await captureScreenshot('farmer_consultation_workspace_chat.png');

  console.log('10. Emulating mobile device (iPhone 14 / Pixel 7: 390x844)...');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await send('Page.navigate', { url: 'http://localhost:5173/dashboard/consultation' });
  await new Promise((r) => setTimeout(r, 2000));

  // Screenshot 5: Consultation Mobile View
  await captureScreenshot('farmer_consultation_mobile.png');

  console.log('All verification screenshots successfully captured!');
  ws.close();
  edge.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
