/**
 * Test Visual Selector Time Window Filter
 * Verifies that only students with lessons within 60 minutes are shown
 */

const BASE_URL = 'http://localhost:3335';

async function login(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.ok ? response.headers.get('set-cookie') : null;
}

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getTimePlusMinutes(minutes) {
  const time = new Date(Date.now() + minutes * 60 * 1000);
  return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

async function testTimeWindowFilter() {
  console.log('=== VISUAL SELECTOR TIME WINDOW TEST ===\n');

  // Login
  const adminToken = await login('admin@solu.school', 'admin123');
  if (!adminToken) {
    console.log('❌ Failed to login');
    return;
  }
  console.log('✅ Logged in as admin\n');

  // Get students and teachers
  const studentsResult = await apiCall('/api/students', {
    headers: { Cookie: adminToken }
  });
  const students = studentsResult.data.students;

  const teachersResult = await apiCall('/api/teachers', {
    headers: { Cookie: adminToken }
  });
  const teachers = teachersResult.data.teachers || teachersResult.data;

  const roomsResult = await apiCall('/api/rooms', {
    headers: { Cookie: adminToken }
  });
  const rooms = roomsResult.data.rooms || roomsResult.data;

  if (students.length < 2 || teachers.length < 1 || rooms.length < 1) {
    console.log('❌ Need at least 2 students, 1 teacher, and 1 room');
    return;
  }

  const student1 = students[0];
  const student2 = students[1];
  const teacher = teachers[0];
  const room = rooms[0];

  const today = getTodayDate();
  const currentTime = getCurrentTime();
  const timeSoon = getTimePlusMinutes(30); // 30 minutes from now
  const timeFarFuture = getTimePlusMinutes(90); // 90 minutes from now

  console.log(`Current time: ${currentTime}`);
  console.log(`Lesson soon (30 min): ${timeSoon}`);
  console.log(`Lesson far (90 min): ${timeFarFuture}\n`);

  // Create lesson for student1 starting in 30 minutes (SHOULD APPEAR)
  const lesson1Result = await apiCall('/api/lessons', {
    method: 'POST',
    headers: { Cookie: adminToken },
    body: JSON.stringify({
      teacherId: teacher.id,
      studentId: student1.id,
      roomId: room.id,
      instrument: 'גיטרה',
      date: today,
      startTime: timeSoon,
      endTime: getTimePlusMinutes(90),
      duration: 60
    })
  });

  if (!lesson1Result.ok) {
    console.log('❌ Failed to create lesson for student1:', lesson1Result.data);
    return;
  }
  const lesson1 = lesson1Result.data;
  console.log(`✅ Created lesson for ${student1.user.firstName} at ${timeSoon}`);

  // Create lesson for student2 starting in 90 minutes (SHOULD NOT APPEAR)
  const lesson2Result = await apiCall('/api/lessons', {
    method: 'POST',
    headers: { Cookie: adminToken },
    body: JSON.stringify({
      teacherId: teacher.id,
      studentId: student2.id,
      roomId: room.id,
      instrument: 'פסנתר',
      date: today,
      startTime: timeFarFuture,
      endTime: getTimePlusMinutes(150),
      duration: 60
    })
  });

  if (!lesson2Result.ok) {
    console.log('⚠️  Could not create lesson for student2 (may be room conflict)');
  } else {
    console.log(`✅ Created lesson for ${student2.user.firstName} at ${timeFarFuture}\n`);
  }

  // Get visual selector students (should only include student1)
  const visualSelectorResult = await apiCall('/api/student-check-in');

  console.log('=== VISUAL SELECTOR RESULTS ===\n');
  console.log(`Returned ${visualSelectorResult.data.count} students\n`);

  if (visualSelectorResult.data.timeWindow) {
    console.log('Time window info:');
    console.log(`  Current: ${visualSelectorResult.data.timeWindow.current}`);
    console.log(`  Max: ${visualSelectorResult.data.timeWindow.maxTime}`);
    console.log(`  Message: ${visualSelectorResult.data.timeWindow.message}\n`);
  }

  const returnedStudents = visualSelectorResult.data.students || [];

  console.log('Students shown in visual selector:');
  returnedStudents.forEach(s => {
    console.log(`  - ${s.firstName} ${s.lastName}`);
    if (s.nextLesson) {
      console.log(`    Lesson: ${s.nextLesson.instrument} at ${s.nextLesson.startTime}`);
    }
  });
  console.log('');

  // Verify results
  const hasStudent1 = returnedStudents.some(s => s.id === student1.id);
  const hasStudent2 = returnedStudents.some(s => s.id === student2.id);

  console.log('=== VERIFICATION ===\n');
  if (hasStudent1) {
    console.log(`✅ Student1 (${student1.user.firstName}) appears in list (lesson at ${timeSoon})`);
  } else {
    console.log(`❌ Student1 (${student1.user.firstName}) MISSING from list (should appear!)`);
  }

  if (lesson2Result.ok) {
    if (!hasStudent2) {
      console.log(`✅ Student2 (${student2.user.firstName}) NOT in list (lesson at ${timeFarFuture})`);
    } else {
      console.log(`❌ Student2 (${student2.user.firstName}) appears in list (should NOT appear!)`);
    }
  }

  // Cleanup
  console.log('\n=== CLEANUP ===\n');
  await apiCall(`/api/lessons/${lesson1.id}`, {
    method: 'DELETE',
    headers: { Cookie: adminToken }
  });
  console.log('✅ Deleted lesson 1');

  if (lesson2Result.ok) {
    await apiCall(`/api/lessons/${lesson2Result.data.id}`, {
      method: 'DELETE',
      headers: { Cookie: adminToken }
    });
    console.log('✅ Deleted lesson 2');
  }

  console.log('\n=== TEST COMPLETE ===');
}

testTimeWindowFilter().catch(console.error);
