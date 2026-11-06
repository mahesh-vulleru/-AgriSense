const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZWM2YjRlMGZjY2Y5NGRlZDVkNGRiMiIsImVtYWlsIjoicmFqZXNoLmZhcm1lckBhZ3Jpc2Vuc2UudGVzdCIsInJvbGUiOiJmYXJtZXIiLCJpYXQiOjE3OTM4Nzg4NjIsImV4cCI6MTc5NDQ4MzY2Mn0.EW3YOBLY8ieNm1lVAs6Uz86lHI_jdxKS1Czgyeze3IM';

async function main() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edge = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=' + process.env.TEMP + '\\edge_cdp_' + Date.now(),
    '--window-size=1280,900',
    'http://localhost:5173/'
  ]);

  // Wait 1.5 seconds for Edge to initialize CDP
  await new Promise(r => setTimeout(r, 1500));

  // Get websocket debugger URL
  const versionInfo = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/version', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  console.log('Connected to Edge:', versionInfo.Browser);

  const targets = await new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;

  const WebSocket = require('stream'); // or use simple socket / CDP
  console.log('WS Target:', wsUrl);
  
  edge.kill();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

