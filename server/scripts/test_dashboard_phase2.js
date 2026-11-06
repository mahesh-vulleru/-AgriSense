async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'farmer.phase2@agrisense.test',
      password: 'Password123!',
    }),
  });

  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status, 'Success:', loginData.success);
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }

  const token = loginData.token;
  console.log('Token acquired successfully.');

  const dashRes = await fetch('http://localhost:5000/api/dashboard/farmer', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dashData = await dashRes.json();
  console.log('Dashboard Status:', dashRes.status);
  console.log('Statistics:', JSON.stringify(dashData.data.statistics, null, 2));
  console.log('Total Farms returned in data.farms:', dashData.data.farms?.length);
  console.log('Farm names:', dashData.data.farms?.map((f) => `${f.name} (${f.status}, ${f.acreage} ac)`));
}

test().catch(console.error);
