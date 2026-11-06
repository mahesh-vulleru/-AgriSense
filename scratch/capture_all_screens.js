const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWM2YjRlMGZjY2Y5NGRlZDVkNGRiMiIsImVtYWlsIjoicmFqZXNoLmZhcm1lckBhZ3Jpc2Vuc2UudGVzdCIsInJvbGUiOiJmYXJtZXIiLCJpYXQiOjE3OTM4Nzg4NjIsImV4cCI6MTc5NDQ4MzY2Mn0.EW3YOBLY8ieNm1lVAs6Uz86lHI_jdxKS1Czgyeze3IM';
const userJson = JSON.stringify({
  id: '6aec6b4e0fccf94ded5d4db2',
  name: 'Rajesh Farmer',
  fullName: 'Rajesh Farmer',
  email: 'rajesh.farmer@agrisense.test',
  phone: '9876543210',
  role: 'farmer',
  location: 'Green Valley, Pune'
});

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_cdp_' + Date.now(),
    '--window-size=1280,900',
    'http://localhost:5173/'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const targets = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
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

  await new Promise(r => ws.onopen = r);
  console.log('CDP WebSocket connected!');

  await send('Page.enable');
  await send('Runtime.enable');

  // Inject authentication into localStorage
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('agrisense_token', '${token}');
      localStorage.setItem('agrisense_user', '${userJson.replace(/'/g, "\\'")}');
    `
  });

  const capturePage = async (url, filename, delay = 1200) => {
    console.log(`Navigating to ${url}...`);
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, delay));
    const res = await send('Page.captureScreenshot', { format: 'png' });
    if (res.result && res.result.data) {
      fs.writeFileSync(filename, Buffer.from(res.result.data, 'base64'));
      console.log(`Saved screenshot: ${filename} (${fs.statSync(filename).size} bytes)`);
    } else {
      console.error(`Failed to capture ${url}`, res);
    }
  };

  // 1. Farmer Dashboard
  await capturePage('http://localhost:5173/dashboard', 'dashboard_view.png', 1500);

  // 2. My Farms Directory
  await capturePage('http://localhost:5173/dashboard/farms', 'farms_view.png', 1200);

  // 3. Farm Details Page
  await capturePage('http://localhost:5173/dashboard/farms/6aec6b5b0fccf94ded5d4db5', 'farm_details_view.png', 1200);

  ws.close();
  edge.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

