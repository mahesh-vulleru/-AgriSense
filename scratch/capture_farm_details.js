const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWM2YjRlMGZjY2Y5NGRlZDVkNGRiMiIsImVtYWlsIjoicmFqZXNoLmZhcm1lckBhZ3Jpc2Vuc2UudGVzdCIsInJvbGUiOiJmYXJtZXIiLCJpYXQiOjE3OTM4Nzg4NjIsImV4cCI6MTc5NDQ4MzY2Mn0.EW3YOBLY8ieNm1lVAs6Uz86lHI_jdxKS1Czgyeze3IM';
const userJson = JSON.stringify({
  id: '6aec6b4e0fccf94ded5d4db2',
  name: 'Rajesh Farmer',
  fullName: 'Rajesh Farmer',
  email: 'rajesh.farmer@agrisense.test',
  role: 'farmer'
});

async function run() {
  const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--user-data-dir=' + process.env.TEMP + '\\edge_farm_det2',
    '--window-size=1280,900',
    'http://localhost:5173/'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  const targets = await new Promise((resolve) => {
    http.get('http://localhost:9224/json', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });

  const page = targets.find(t => t.type === 'page') || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let id = 1;
  const cbs = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id && cbs.has(d.id)) { cbs.get(d.id)(d); cbs.delete(d.id); }
  };
  const send = (m, p = {}) => new Promise(r => { const i = id++; cbs.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('agrisense_token', '${token}'); localStorage.setItem('agrisense_user', '${userJson.replace(/'/g, "\\'")}');`
  });

  await send('Page.navigate', { url: 'http://localhost:5173/dashboard/farms/6aec6b5b0fccf94ded5d4db5' });
  await new Promise(r => setTimeout(r, 2000));

  const res = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('farm_details_view.png', Buffer.from(res.result.data, 'base64'));
  console.log('Recaptured farm_details_view.png successfully');

  ws.close();
  edge.kill();
}
run();

