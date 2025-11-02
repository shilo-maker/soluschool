/**
 * Direct HTTP test of student check-in API
 */

const BASE_URL = 'http://localhost:3335';

async function testDirectAPI() {
  console.log('=== DIRECT API TEST ===\n');

  // Test QR code check-in
  console.log('1. Testing QR code check-in...');
  const qrResponse = await fetch(`${BASE_URL}/api/student-check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'qrCode',
      value: 'SOLU-1761894110232-3XLAJUDHD' // From debug script
    })
  });

  const qrData = await qrResponse.json();
  console.log(`   Status: ${qrResponse.status}`);
  console.log(`   Response:`, JSON.stringify(qrData, null, 2));
  console.log('');

  // Test PIN check-in
  console.log('2. Testing PIN check-in...');
  const pinResponse = await fetch(`${BASE_URL}/api/student-check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'pin',
      value: '0QBN' // From debug script
    })
  });

  const pinData = await pinResponse.json();
  console.log(`   Status: ${pinResponse.status}`);
  console.log(`   Response:`, JSON.stringify(pinData, null, 2));
  console.log('');

  // Test Student ID check-in
  console.log('3. Testing Student ID check-in...');
  const idResponse = await fetch(`${BASE_URL}/api/student-check-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      method: 'studentId',
      value: 'cmhei9g610044fcj4jkscfb7e' // From debug script
    })
  });

  const idData = await idResponse.json();
  console.log(`   Status: ${idResponse.status}`);
  console.log(`   Response:`, JSON.stringify(idData, null, 2));
  console.log('');

  // Test GET endpoint
  console.log('4. Testing GET students endpoint...');
  const getResponse = await fetch(`${BASE_URL}/api/student-check-in`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const getData = await getResponse.json();
  console.log(`   Status: ${getResponse.status}`);
  console.log(`   Student count: ${getData.count || 0}`);
  if (getData.students && getData.students.length > 0) {
    console.log(`   First student: ${getData.students[0].name}`);
  }
  console.log('');
}

testDirectAPI().catch(console.error);
