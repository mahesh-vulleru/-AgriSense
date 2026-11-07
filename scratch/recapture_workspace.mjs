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
  const { token, user } = await loginRes.json();

  const consListRes = await fetch('http://localhost:5000/api/consultations/farmer', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const consListData = await consListRes.json();
  const consultation = consListData.data?.consultations?.[0];
  const consultationId = consultation?._id || consultation?.id;

  // Send a real message via the API to verify live rendering in the workspace
  const sendRes = await fetch(`http://localhost:5000/api/consultations/${consultationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: 'Thank you Dr. Ganesh! I will commence the copper oxychloride spray tomorrow morning at 6:30 AM.',
    }),
  });
  const sendData = await sendRes.json();
  console.log('Farmer message sent via API:', sendData.success, sendData.data?.message);

  // Now capture the workspace in Edge
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--no-first-run',
    '--remote-debugging-port=9227',
    '--user-data-dir=' + process.env.TEMP + '\\edge_ws_' + Date.now(),
    '--window-size=1280,1050',
    `http://localhost:5173/dashboard/consultation/${consultationId}`,
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://localhost:9227/json', (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let msgId = 1;
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = msgId++;
      const handler = (event) => {
        const d = JSON.parse(event.data);
        if (d.id === id) {
          ws.removeEventListener('message', handler);
          resolve(d.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send('Page.enable');
  await send('Runtime.enable');

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', '${token}');
      localStorage.setItem('agrisense_user', JSON.stringify(${JSON.stringify(user)}));
      window.location.reload();
    `,
  });

  await new Promise((r) => setTimeout(r, 3500));

  const snap = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACTS_DIR, 'farmer_consultation_workspace_chat.png');
  fs.writeFileSync(outPath, Buffer.from(snap.data, 'base64'));
  console.log(`Saved updated screenshot: ${outPath} (${(snap.data.length * 0.75 / 1024).toFixed(1)} KB)`);

  ws.close();
  edge.kill();
  process.exit(0);
}

main().catch(console.error);
