/**
 * Test what /api/students returns for the test
 */

const BASE_URL = 'http://localhost:3335';

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (response.ok) {
    return response.headers.get('set-cookie');
  }
  return null;
}

async function testGetStudents() {
  console.log('=== TEST /api/students ENDPOINT ===\n');

  // Login as admin
  const adminToken = await login('admin@solu.school', 'admin123');
  if (!adminToken) {
    console.log('❌ Failed to login as admin');
    return;
  }
  console.log('✅ Logged in as admin\n');

  // Get students
  const response = await fetch(`${BASE_URL}/api/students`, {
    headers: { Cookie: adminToken }
  });

  const result = await response.json();
  const students = result.students || result.data?.students || result.data;

  console.log(`Found ${students.length} students\n`);
  console.log('First 5 students (what the test would use):\n');

  for (let i = 0; i < Math.min(5, students.length); i++) {
    const s = students[i];
    console.log(`${i + 1}. ${s.user.firstName} ${s.user.lastName}`);
    console.log(`   ID: ${s.id}`);
    console.log(`   User ID: ${s.user.id}`);
    console.log(`   PIN: ${s.user.pinPlainText || '(null)'}`);
    console.log(`   QR: ${s.user.qrCode || '(null)'}`);
    console.log(`   Active: ${s.user.isActive}`);
    console.log('');
  }
}

testGetStudents().catch(console.error);
