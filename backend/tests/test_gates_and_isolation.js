const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:4000';
const JWT_SECRET = 'edith-secret-jwt-key-2026';
const DB_URL = 'postgresql://postgres:edith_secret_2024@localhost:5432/edith';

const userAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const userBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const adminId = '00000000-0000-0000-0000-000000000001';

const client = new Client({ connectionString: DB_URL });

async function setupTestData() {
  await client.connect();
  console.log('  ✅ Connected to DB');

  // Clean up
  await client.query("DELETE FROM proposals WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')");
  await client.query("DELETE FROM users WHERE id IN ($1, $2)", [userAId, userBId]);

  // Insert Users
  await client.query(
    "INSERT INTO users (id, email, role, status) VALUES ($1, 'usera@edith.local', 'user', 'active'), ($2, 'userb@edith.local', 'user', 'active')",
    [userAId, userBId]
  );
  console.log('  ✅ Inserted User A and User B');

  // Insert a mock freelance job so proposals can reference it
  const jobRes = await client.query("SELECT id FROM freelance_jobs LIMIT 1");
  let jobId = null;
  if (jobRes.rows.length > 0) {
    jobId = jobRes.rows[0].id;
  } else {
    // Insert mock freelance job
    const jobInsert = await client.query(
      "INSERT INTO freelance_jobs (source_platform, external_id, title, user_id) VALUES ('upwork', 'mock-job-id-999', 'Mock Job', $1) RETURNING id",
      [adminId]
    );
    jobId = jobInsert.rows[0].id;
  }

  // Insert Proposals
  await client.query(
    "INSERT INTO proposals (id, job_id, user_id, draft_text) VALUES ('11111111-1111-1111-1111-111111111111', $1, $2, 'User A proposal text')",
    [jobId, userAId]
  );
  await client.query(
    "INSERT INTO proposals (id, job_id, user_id, draft_text) VALUES ('22222222-2222-2222-2222-222222222222', $1, $2, 'User B proposal text')",
    [jobId, userBId]
  );
  console.log('  ✅ Inserted proposals for User A and User B');
}

async function cleanTestData() {
  await client.query("DELETE FROM proposals WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')");
  await client.query("DELETE FROM users WHERE id IN ($1, $2)", [userAId, userBId]);
  console.log('  ✅ Cleaned up test data');
  await client.end();
}

async function testGates() {
  console.log('\n🔒 Testing Security Gates sequential transitions...');

  // 1. Try accessing Gate 2 without Gate 1 Token
  let res = await fetch(`${BASE_URL}/api/v1/auth/gate2`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codename: 'STARRY NIGHT' })
  });
  console.log(`  - POST /auth/gate2 without Gate 1 token: status = ${res.status} (expected: 401)`);
  if (res.status !== 401) throw new Error('Gate 1 bypass succeeded!');

  // 2. Submit wrong password to Gate 1
  res = await fetch(`${BASE_URL}/api/v1/auth/gate1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'WRONG' })
  });
  console.log(`  - POST /auth/gate1 with incorrect password: status = ${res.status} (expected: 401)`);
  if (res.status !== 401) throw new Error('Wrong password allowed!');

  // 3. Submit correct password to Gate 1
  res = await fetch(`${BASE_URL}/api/v1/auth/gate1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'NSB@3035' })
  });
  const gate1Body = await res.json();
  console.log(`  - POST /auth/gate1 with correct password: status = ${res.status} (expected: 200)`);
  if (res.status !== 200 || !gate1Body.data.token) throw new Error('Gate 1 unlock failed!');
  const gate1Token = gate1Body.data.token;

  // 4. Submit correct codename to Gate 2 using Gate 1 token
  res = await fetch(`${BASE_URL}/api/v1/auth/gate2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${gate1Token}`
    },
    body: JSON.stringify({ codename: 'STARRY NIGHT' })
  });
  const gate2Body = await res.json();
  console.log(`  - POST /auth/gate2 with correct codename & Gate 1 token: status = ${res.status} (expected: 200)`);
  if (res.status !== 200 || !gate2Body.data.token) throw new Error('Gate 2 unlock failed!');
  const gate2Token = gate2Body.data.token;

  // 5. Try accessing Google Login without Gate 2 Token
  res = await fetch(`${BASE_URL}/api/v1/auth/google/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: 'mock' })
  });
  console.log(`  - POST /auth/google/login without Gate 2 token: status = ${res.status} (expected: 401)`);
  if (res.status !== 401) throw new Error('Gate 2 bypass succeeded!');
}

async function testDataIsolation() {
  console.log('\n👁️ Testing Multi-User Data Isolation...');

  const tokenA = jwt.sign({ userId: userAId, email: 'usera@edith.local', role: 'user' }, JWT_SECRET);
  const tokenB = jwt.sign({ userId: userBId, email: 'userb@edith.local', role: 'user' }, JWT_SECRET);
  const tokenAdmin = jwt.sign({ userId: adminId, email: 'admin@edith.local', role: 'admin' }, JWT_SECRET);

  // 1. Query proposals as User A
  let res = await fetch(`${BASE_URL}/api/v1/freelance/proposals`, {
    headers: { 'Authorization': `Bearer ${tokenA}` }
  });
  const resA = await res.json();
  console.log(`  - Query proposals as User A: status = ${res.status}, found ${resA.data.length} proposals`);
  const userAHasOnlyOwn = resA.data.every(p => p.userId === userAId);
  console.log(`    Has only own data: ${userAHasOnlyOwn}`);
  if (!userAHasOnlyOwn || resA.data.length !== 1) throw new Error('User A data isolation breach!');

  // 2. Query proposals as User B
  res = await fetch(`${BASE_URL}/api/v1/freelance/proposals`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const resB = await res.json();
  console.log(`  - Query proposals as User B: status = ${res.status}, found ${resB.data.length} proposals`);
  const userBHasOnlyOwn = resB.data.every(p => p.userId === userBId);
  console.log(`    Has only own data: ${userBHasOnlyOwn}`);
  if (!userBHasOnlyOwn || resB.data.length !== 1) throw new Error('User B data isolation breach!');

  // 3. User B tries to impersonate User A
  res = await fetch(`${BASE_URL}/api/v1/freelance/proposals?userId=${userAId}`, {
    headers: { 'Authorization': `Bearer ${tokenB}` }
  });
  const resBImpersonate = await res.json();
  console.log(`  - Query proposals?userId=UserA as User B: status = ${res.status}, found ${resBImpersonate.data.length} proposals`);
  // Even if User B passes userId=UserA, the system must force target userId = userBId (req.user.id)
  const impersonateBBlocked = resBImpersonate.data.every(p => p.userId === userBId);
  console.log(`    Did data isolation correctly fallback to B's own data: ${impersonateBBlocked}`);
  if (!impersonateBBlocked) throw new Error('User B successfully impersonated User A!');

  // 4. Admin queries User A's proposals using override query param
  res = await fetch(`${BASE_URL}/api/v1/freelance/proposals?userId=${userAId}`, {
    headers: { 'Authorization': `Bearer ${tokenAdmin}` }
  });
  const resAdminImpersonate = await res.json();
  console.log(`  - Query proposals?userId=UserA as Admin: status = ${res.status}, found ${resAdminImpersonate.data.length} proposals`);
  const adminAccessA = resAdminImpersonate.data.every(p => p.userId === userAId);
  console.log(`    Did admin successfully impersonate User A: ${adminAccessA}`);
  if (!adminAccessA || resAdminImpersonate.data.length === 0) throw new Error('Admin override failed!');
}

async function run() {
  try {
    await setupTestData();
    await testGates();
    await testDataIsolation();
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Security gates and data isolation are working perfectly.\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  } finally {
    await cleanTestData();
  }
}

run();
