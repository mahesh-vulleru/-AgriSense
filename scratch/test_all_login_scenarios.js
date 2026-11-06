const http = require('http');

async function sendLoginRequest(email, password, port = 5000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            durationMs: Date.now() - start,
            body: JSON.parse(body || '{}'),
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        statusCode: null,
        durationMs: Date.now() - start,
        error: err.message,
        code: err.code,
      });
    });

    req.write(JSON.stringify({ email, password }));
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('       AGRISENSE LOGIN FLOW VERIFICATION SUITE       ');
  console.log('====================================================\n');

  // Test 1: Valid Login
  console.log('--> TEST 1: Valid Login');
  const t1 = await sendLoginRequest('farmer.demo@agrisense.test', 'Password123!');
  console.log(`Status: ${t1.statusCode} | Duration: ${t1.durationMs}ms`);
  console.log(`Success: ${t1.body.success} | Message: "${t1.body.message}"`);
  console.log(`Token Issued: ${Boolean(t1.body.token)} | User Role: ${t1.body.user?.role}`);
  console.log(t1.statusCode === 200 && t1.body.token ? '>>> PASSED\n' : '>>> FAILED\n');

  // Test 2: Invalid Password
  console.log('--> TEST 2: Invalid Password');
  const t2 = await sendLoginRequest('farmer.demo@agrisense.test', 'IncorrectPass123!');
  console.log(`Status: ${t2.statusCode} | Duration: ${t2.durationMs}ms`);
  console.log(`Success: ${t2.body.success} | Message: "${t2.body.message}"`);
  console.log(t2.statusCode === 401 && t2.body.message === 'Invalid email or password.' ? '>>> PASSED\n' : '>>> FAILED\n');

  // Test 3: Unknown Email
  console.log('--> TEST 3: Unknown Email');
  const t3 = await sendLoginRequest('ghost.user.999@agrisense.test', 'Password123!');
  console.log(`Status: ${t3.statusCode} | Duration: ${t3.durationMs}ms`);
  console.log(`Success: ${t3.body.success} | Message: "${t3.body.message}"`);
  console.log(t3.statusCode === 401 && t3.body.message === 'Invalid email or password.' ? '>>> PASSED\n' : '>>> FAILED\n');

  // Test 4: Backend Unavailable (Non-existent port 5999)
  console.log('--> TEST 4: Backend Unavailable');
  const t4 = await sendLoginRequest('farmer.demo@agrisense.test', 'Password123!', 5999);
  console.log(`Error: ${t4.error} (Code: ${t4.code}) | Duration: ${t4.durationMs}ms`);
  console.log(t4.code === 'ECONNREFUSED' ? '>>> PASSED (Fails fast without hanging)\n' : '>>> FAILED\n');

  // Test 5: MongoDB Unavailable (Simulate disconnected state)
  console.log('--> TEST 5: MongoDB Unavailable (Fast 503 Service Unavailable)');
  const { default: mongoose } = await import('mongoose');
  const { requireDB } = await import('../server/src/middleware/checkDbConnection.js');
  
  // Create mock req, res, next to verify middleware behavior when disconnected
  let resStatus = null;
  let resBody = null;
  const mockReq = { method: 'POST', originalUrl: '/api/auth/login' };
  const mockRes = {
    status: (code) => {
      resStatus = code;
      return {
        json: (data) => { resBody = data; },
      };
    },
  };
  let nextCalled = false;
  const mockNext = () => { nextCalled = true; };

  // Temporarily force readyState to 0 (disconnected)
  const originalReadyState = mongoose.connection.readyState;
  Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });

  const mStart = Date.now();
  requireDB(mockReq, mockRes, mockNext);
  const mDuration = Date.now() - mStart;

  console.log(`Status: ${resStatus} | Duration: ${mDuration}ms`);
  console.log(`Message: "${resBody?.message}" | Next Called: ${nextCalled}`);
  console.log(resStatus === 503 && resBody?.message.includes('unavailable') && !nextCalled ? '>>> PASSED\n' : '>>> FAILED\n');

  // Restore readyState
  Object.defineProperty(mongoose.connection, 'readyState', { value: originalReadyState, configurable: true });

  console.log('====================================================');
  console.log('            ALL 5 TEST SCENARIOS COMPLETED          ');
  console.log('====================================================');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
