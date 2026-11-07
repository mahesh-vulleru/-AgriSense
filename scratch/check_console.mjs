import http from 'http';
import { spawn } from 'child_process';

async function main() {
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
    '--user-data-dir=' + process.env.TEMP + '\\edge_diag3_' + Date.now(),
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
    if (data.method === 'Runtime.consoleAPICalled') {
      console.log('CONSOLE:', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.log('EXCEPTION:', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
    }
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

  await new Promise((r) => setTimeout(r, 3500));

  edge.kill();
  process.exit(0);
}

main().catch(console.error);
