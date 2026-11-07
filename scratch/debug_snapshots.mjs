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

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_diag_' + Date.now(),
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

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', ${JSON.stringify(token)});
      localStorage.setItem('agrisense_user', ${JSON.stringify(JSON.stringify(user))});
      window.location.href = '/dashboard/disease-detection';
    `,
  });

  await new Promise((r) => setTimeout(r, 4000));

  // Check buttons on page
  const buttonsRes = await send('Runtime.evaluate', {
    expression: `
      Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        title: b.title
      }))
    `,
    returnByValue: true,
  });
  console.log('Buttons on page:', buttonsRes.result?.value);

  // Switch to history tab
  const switchRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scan History'));
        if (btn) {
          btn.click();
          return 'Clicked ' + btn.textContent.trim();
        }
        return 'Not found';
      })()
    `,
    returnByValue: true,
  });
  console.log('Switch result:', switchRes.result?.value);

  await new Promise((r) => setTimeout(r, 1500));

  const historySnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_disease_history_tab.png'), Buffer.from(historySnap.result.data, 'base64'));
  console.log('Saved farmer_disease_history_tab.png');

  // Check buttons in history tab
  const historyButtons = await send('Runtime.evaluate', {
    expression: `
      Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        title: b.title
      }))
    `,
    returnByValue: true,
  });
  console.log('Buttons on history tab:', historyButtons.result?.value);

  // Click View Full AI Findings
  const clickEyeRes = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const eyeBtn = document.querySelector('button[title="View Full AI Findings"]');
        if (eyeBtn) {
          eyeBtn.click();
          return 'Clicked eye button';
        }
        return 'Eye button not found';
      })()
    `,
    returnByValue: true,
  });
  console.log('Click eye result:', clickEyeRes.result?.value);

  await new Promise((r) => setTimeout(r, 1500));

  const modalSnap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'farmer_disease_detail_modal.png'), Buffer.from(modalSnap.result.data, 'base64'));
  console.log('Saved farmer_disease_detail_modal.png');

  edge.kill();
  process.exit(0);
}

main().catch(console.error);
