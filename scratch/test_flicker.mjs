import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Mahesh Vulleru\\.gemini\\antigravity\\brain\\6bc9e3db-148f-4931-8547-76b23a0073b6';

async function main() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'maheshvulleru@gmail.com', password: 'Mahesh@123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  const user = loginData.user;

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_flicker_' + Date.now(),
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
  await send('Network.enable');

  const networkEvents = [];
  ws.addEventListener('message', (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.method === 'Network.requestWillBeSent') {
        networkEvents.push({ time: Date.now(), url: d.params.request.url });
      }
    } catch {}
  });

  const script = `
    localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
    localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
    window.location.href = '/dashboard/crops/6aedacbfe29d4e9e5fd9bc84';
  `;
  await send('Runtime.evaluate', { expression: script });

  console.log('Waiting for crop details to load...');
  await new Promise((r) => setTimeout(r, 2500));

  console.log('Clicking "Update Stage" button...');
  // Find button with text "Update Stage" and click it
  const clickScript = `
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Update Stage'));
      if (btn) {
        btn.click();
        return 'clicked';
      } else {
        return 'not_found: ' + btns.map(b => b.textContent.trim()).join(' | ');
      }
    })()
  `;
  const clickRes = await send('Runtime.evaluate', { expression: clickScript });
  console.log('Click result:', clickRes.result?.value);

  // Take screenshot at 500ms
  await new Promise((r) => setTimeout(r, 500));
  let snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'snap_0.5s.png'), Buffer.from(snap.result.data, 'base64'));

  // Take screenshot at 2000ms
  await new Promise((r) => setTimeout(r, 1500));
  snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'snap_2.0s.png'), Buffer.from(snap.result.data, 'base64'));

  // Take screenshot at 3000ms
  await new Promise((r) => setTimeout(r, 1000));
  snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'snap_3.0s.png'), Buffer.from(snap.result.data, 'base64'));

  console.log('Network events during modal open:', networkEvents);

  edge.kill();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
