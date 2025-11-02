/**
 * COMPREHENSIVE STUDENT CHECK-IN TEST SUITE
 *
 * Tests all aspects of the kid-friendly check-in system:
 * - QR Code authentication
 * - PIN authentication
 * - Visual selector (student ID)
 * - Lesson finding and check-in
 * - Duplicate prevention
 * - Edge cases and error handling
 */

const BASE_URL = 'http://localhost:3335';

// Test state
const state = {
  adminToken: null,
  teacherId: null,
  studentId: null,
  studentUserId: null,
  studentPin: null,
  studentQrCode: null,
  roomId: null,
  lessonId: null,
  todayLessonId: null,

  testResults: {
    total: 0,
    passed: 0,
    failed: 0,
    sections: []
  }
};

// Utility functions
function log(message, type = 'info') {
  const symbols = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    section: '🔍',
    subsection: '  📍'
  };
  console.log(`${symbols[type]} ${message}`);
}

function logSection(name) {
  console.log('\n' + '='.repeat(80));
  log(`SECTION: ${name}`, 'section');
  console.log('='.repeat(80) + '\n');
  state.testResults.sections.push({ name, tests: [] });
}

function logSubsection(name) {
  console.log('\n' + '-'.repeat(80));
  log(`${name}`, 'subsection');
  console.log('-'.repeat(80));
}

function test(description, assertion, details = null) {
  state.testResults.total++;
  const passed = Boolean(assertion);

  if (passed) {
    state.testResults.passed++;
    log(`${description}`, 'success');
  } else {
    state.testResults.failed++;
    log(`${description}`, 'error');
    if (details) {
      console.log(`    Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  const currentSection = state.testResults.sections[state.testResults.sections.length - 1];
  if (currentSection) {
    currentSection.tests.push({ description, passed, details });
  }

  return passed;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API Helper
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }
}

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

// Setup
async function setup() {
  logSection('SETUP - Initialize Test Environment');

  // Login as admin
  state.adminToken = await login('admin@solu.school', 'admin123');
  test('Admin login successful', state.adminToken !== null);

  // Get a teacher
  const teachersResult = await apiCall('/api/teachers', {
    headers: { Cookie: state.adminToken }
  });
  const teachers = teachersResult.data.teachers || teachersResult.data;
  if (teachers && teachers.length > 0) {
    state.teacherId = teachers[0].id;
    test('Retrieved teacher for testing', true);
  }

  // Get a student with PIN and QR code
  const studentsResult = await apiCall('/api/students', {
    headers: { Cookie: state.adminToken }
  });
  const students = studentsResult.data.students || studentsResult.data;

  if (students && students.length > 0) {
    const student = students[0];
    state.studentId = student.id;
    state.studentUserId = student.userId;
    state.studentPin = student.user.pinPlainText;
    state.studentQrCode = student.user.qrCode;

    test('Retrieved student for testing', true);
    test('Student has PIN', state.studentPin !== null && state.studentPin !== undefined,
      { pin: state.studentPin });
    test('Student has QR code', state.studentQrCode !== null && state.studentQrCode !== undefined,
      { qrCode: state.studentQrCode });
  }

  // Get a room
  const roomsResult = await apiCall('/api/rooms', {
    headers: { Cookie: state.adminToken }
  });
  const rooms = roomsResult.data.rooms || roomsResult.data;
  if (rooms && rooms.length > 0) {
    state.roomId = rooms[0].id;
    test('Retrieved room for testing', true);
  }

  // Create a lesson for today - within next 60 minutes so it appears in visual selector
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calculate lesson time 30 minutes from now
  const lessonTime = new Date(Date.now() + 30 * 60 * 1000);
  const startTime = `${String(lessonTime.getHours()).padStart(2, '0')}:${String(lessonTime.getMinutes()).padStart(2, '0')}`;
  const endTime = new Date(lessonTime.getTime() + 60 * 60 * 1000);
  const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;

  const lessonResult = await apiCall('/api/lessons', {
    method: 'POST',
    headers: { Cookie: state.adminToken },
    body: JSON.stringify({
      teacherId: state.teacherId,
      studentId: state.studentId,
      roomId: state.roomId,
      instrument: 'פסנתר',
      date: todayStr,
      startTime: startTime,
      endTime: endTimeStr,
      duration: 60
    })
  });

  if (lessonResult.ok && lessonResult.data.id) {
    state.todayLessonId = lessonResult.data.id;
    test('Created lesson for today', true);
  } else {
    test('Created lesson for today', false, lessonResult.data);
  }

  // Create a future lesson
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const futureLessonResult = await apiCall('/api/lessons', {
    method: 'POST',
    headers: { Cookie: state.adminToken },
    body: JSON.stringify({
      teacherId: state.teacherId,
      studentId: state.studentId,
      roomId: state.roomId,
      instrument: 'גיטרה',
      date: futureDateStr,
      startTime: '16:00',
      endTime: '17:00',
      duration: 60
    })
  });

  if (futureLessonResult.ok) {
    state.lessonId = futureLessonResult.data.id;
    test('Created future lesson for testing', true);
  }
}

// Test QR Code Authentication
async function testQrCodeAuth() {
  logSection('QR CODE AUTHENTICATION');

  logSubsection('1.1 - Valid QR Code');

  if (!state.studentQrCode) {
    log('Skipping QR tests - no QR code available', 'warning');
    return;
  }

  const result = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'qrCode',
      value: state.studentQrCode
    })
  });

  test('QR code authentication successful', result.ok && result.data.success);
  test('Returns student information', result.data.student !== undefined);
  test('Student name is correct', result.data.student?.id === state.studentId);
  test('Returns today\'s lessons', Array.isArray(result.data.todaysLessons));
  test('Returns welcome message in Hebrew',
    result.data.message && result.data.message.includes('שלום'));

  if (result.data.todaysLessons) {
    test('Found at least one lesson for today',
      result.data.todaysLessons.length > 0);

    if (result.data.todaysLessons.length > 0) {
      const lesson = result.data.todaysLessons[0];
      test('Lesson has required fields',
        lesson.id && lesson.startTime && lesson.endTime && lesson.instrument);
      test('Lesson check-in status included',
        lesson.checkedIn !== undefined);
    }
  }

  logSubsection('1.2 - Invalid QR Code');

  const invalidResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'qrCode',
      value: 'invalid-qr-code-12345'
    })
  });

  test('Invalid QR code rejected', !invalidResult.ok || !invalidResult.data.success);
  test('Returns error message', invalidResult.data.error !== undefined);
}

// Test PIN Authentication
async function testPinAuth() {
  logSection('PIN AUTHENTICATION');

  logSubsection('2.1 - Valid PIN');

  if (!state.studentPin) {
    log('Skipping PIN tests - no PIN available', 'warning');
    return;
  }

  const result = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'pin',
      value: state.studentPin
    })
  });

  test('PIN authentication successful', result.ok && result.data.success);
  test('Returns correct student', result.data.student?.id === state.studentId);
  test('Returns today\'s lessons', Array.isArray(result.data.todaysLessons));

  logSubsection('2.2 - Invalid PIN');

  const invalidResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'pin',
      value: '9999'
    })
  });

  test('Invalid PIN rejected', !invalidResult.ok || !invalidResult.data.success);
  test('Returns 404 status', invalidResult.status === 404);

  logSubsection('2.3 - PIN Format Validation');

  const shortPinResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'pin',
      value: '12'
    })
  });

  test('Short PIN handled gracefully', !shortPinResult.ok || !shortPinResult.data.success);
}

// Test Visual Selector (Student ID)
async function testVisualSelector() {
  logSection('VISUAL SELECTOR - Student ID Authentication');

  logSubsection('3.1 - Get All Students');

  const studentsResult = await apiCall('/api/student-check-in', {
    method: 'GET'
  });

  test('GET endpoint returns students', studentsResult.ok && studentsResult.data.success);
  test('Returns array of students', Array.isArray(studentsResult.data.students));
  test('Returns student count', studentsResult.data.count !== undefined);

  if (studentsResult.data.students) {
    test('Students have required fields',
      studentsResult.data.students.every(s => s.id && s.name && s.firstName));
  }

  logSubsection('3.2 - Valid Student ID');

  const result = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'studentId',
      value: state.studentId
    })
  });

  test('Student ID authentication successful', result.ok && result.data.success);
  test('Returns correct student', result.data.student?.id === state.studentId);

  logSubsection('3.3 - Invalid Student ID');

  const invalidResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'studentId',
      value: 'invalid-student-id-xyz'
    })
  });

  test('Invalid student ID rejected', !invalidResult.ok || !invalidResult.data.success);
}

// Test Lesson Check-In
async function testLessonCheckIn() {
  logSection('LESSON CHECK-IN FUNCTIONALITY');

  logSubsection('4.1 - Check Into Specific Lesson');

  if (!state.todayLessonId) {
    log('Skipping lesson check-in tests - no lesson created', 'warning');
    return;
  }

  const result = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'studentId',
      value: state.studentId,
      lessonId: state.todayLessonId
    })
  });

  test('Lesson check-in successful', result.ok && result.data.success);
  test('Returns lesson details', result.data.lesson !== undefined);
  test('Lesson has check-in timestamp', result.data.lesson?.checkedInAt !== undefined);
  test('Check-in timestamp is recent',
    result.data.lesson?.checkedInAt &&
    new Date(result.data.lesson.checkedInAt).getTime() > Date.now() - 10000);
  test('Success message in Hebrew', result.data.message?.includes('נוכחות'));

  logSubsection('4.2 - Duplicate Check-In Prevention');

  // Try checking in again
  const duplicateResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'studentId',
      value: state.studentId,
      lessonId: state.todayLessonId
    })
  });

  test('Duplicate check-in handled', duplicateResult.ok && duplicateResult.data.success);
  test('Already checked in flag set', duplicateResult.data.alreadyCheckedIn === true);
  test('Returns appropriate message', duplicateResult.data.message?.includes('כבר נרשמת'));

  logSubsection('4.3 - Check Into Wrong Student\'s Lesson');

  // Get another student's lesson
  const studentsResult = await apiCall('/api/students', {
    headers: { Cookie: state.adminToken }
  });
  const students = studentsResult.data.students || studentsResult.data;
  const otherStudent = students?.find(s => s.id !== state.studentId);

  if (otherStudent) {
    // Try to check into another student's lesson
    const wrongResult = await apiCall('/api/student-check-in', {
      method: 'POST',
      body: JSON.stringify({
        method: 'studentId',
        value: otherStudent.id,
        lessonId: state.todayLessonId
      })
    });

    test('Cannot check into another student\'s lesson',
      !wrongResult.ok || wrongResult.data.error);
  }

  logSubsection('4.4 - Non-Existent Lesson');

  const notFoundResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'studentId',
      value: state.studentId,
      lessonId: 'nonexistent-lesson-id'
    })
  });

  test('Non-existent lesson rejected', !notFoundResult.ok || notFoundResult.data.error);
  test('Returns 404 status', notFoundResult.status === 404);
}

// Test Today's Lessons Filtering
async function testTodaysLessonsFilter() {
  logSection('TODAY\'S LESSONS FILTERING');

  logSubsection('5.1 - Only Today\'s Lessons Returned');

  const result = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'studentId',
      value: state.studentId
    })
  });

  if (result.data.todaysLessons) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const allToday = result.data.todaysLessons.every(lesson => {
      const lessonDate = new Date(lesson.date);
      return lessonDate >= today && lessonDate < tomorrow;
    });

    test('All returned lessons are for today', allToday);
    test('Future lessons not included',
      !result.data.todaysLessons.some(l => l.id === state.lessonId));
  }

  logSubsection('5.2 - Scheduled Lessons Only');

  if (result.data.todaysLessons) {
    const allScheduled = result.data.todaysLessons.every(lesson =>
      lesson.instrument && lesson.startTime && lesson.endTime
    );

    test('All lessons have complete information', allScheduled);
  }
}

// Test Edge Cases
async function testEdgeCases() {
  logSection('EDGE CASES AND ERROR HANDLING');

  logSubsection('6.1 - Missing Required Fields');

  const noMethodResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      value: 'some-value'
    })
  });

  test('Missing method rejected', noMethodResult.status === 400);

  const noValueResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'pin'
    })
  });

  test('Missing value rejected', noValueResult.status === 400);

  logSubsection('6.2 - Invalid Method');

  const invalidMethodResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'invalidMethod',
      value: 'some-value'
    })
  });

  test('Invalid authentication method rejected', invalidMethodResult.status === 400);

  logSubsection('6.3 - Inactive Student');

  // This would require setting up an inactive student - skip for now
  log('Inactive student test - requires specific setup', 'info');

  logSubsection('6.4 - Empty Request Body');

  const emptyResult = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({})
  });

  test('Empty request body rejected', emptyResult.status === 400);
}

// Test Response Format
async function testResponseFormat() {
  logSection('API RESPONSE FORMAT VALIDATION');

  logSubsection('7.1 - Authentication Response Format');

  const result = await apiCall('/api/student-check-in', {
    method: 'POST',
    body: JSON.stringify({
      method: 'studentId',
      value: state.studentId
    })
  });

  if (result.data) {
    test('Response has success field', result.data.success !== undefined);
    test('Response has student object', result.data.student !== undefined);
    test('Student has id', result.data.student?.id !== undefined);
    test('Student has name', result.data.student?.name !== undefined);
    test('Response has todaysLessons array', Array.isArray(result.data.todaysLessons));
    test('Response has message', result.data.message !== undefined);
  }

  logSubsection('7.2 - Lesson Check-In Response Format');

  if (state.lessonId) {
    // Create a new lesson to test check-in response
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const newLessonResult = await apiCall('/api/lessons', {
      method: 'POST',
      headers: { Cookie: state.adminToken },
      body: JSON.stringify({
        teacherId: state.teacherId,
        studentId: state.studentId,
        roomId: state.roomId,
        instrument: 'drums',
        date: todayStr,
        startTime: '15:00',
        endTime: '16:00',
        duration: 60
      })
    });

    if (newLessonResult.ok) {
      const checkInResult = await apiCall('/api/student-check-in', {
        method: 'POST',
        body: JSON.stringify({
          method: 'studentId',
          value: state.studentId,
          lessonId: newLessonResult.data.id
        })
      });

      if (checkInResult.data) {
        test('Check-in response has success', checkInResult.data.success !== undefined);
        test('Check-in response has student', checkInResult.data.student !== undefined);
        test('Check-in response has lesson', checkInResult.data.lesson !== undefined);
        test('Lesson has checkedInAt timestamp', checkInResult.data.lesson?.checkedInAt !== undefined);
        test('Lesson has teacher name', checkInResult.data.lesson?.teacher !== undefined);
        test('Lesson has room name', checkInResult.data.lesson?.room !== undefined);
        test('Lesson has instrument', checkInResult.data.lesson?.instrument !== undefined);
      }
    }
  }

  logSubsection('7.3 - GET Students Response Format');

  const studentsResult = await apiCall('/api/student-check-in', {
    method: 'GET'
  });

  if (studentsResult.data) {
    test('GET response has success', studentsResult.data.success !== undefined);
    test('GET response has students array', Array.isArray(studentsResult.data.students));
    test('GET response has count', studentsResult.data.count !== undefined);

    if (studentsResult.data.students?.length > 0) {
      const student = studentsResult.data.students[0];
      test('Student has id', student.id !== undefined);
      test('Student has name', student.name !== undefined);
      test('Student has firstName', student.firstName !== undefined);
      test('Student has lastName', student.lastName !== undefined);
    }
  }
}

// Cleanup
async function cleanup() {
  logSection('CLEANUP - Remove Test Data');

  let deletedCount = 0;

  // Delete today's lesson
  if (state.todayLessonId) {
    const result = await apiCall(`/api/lessons/${state.todayLessonId}`, {
      method: 'DELETE',
      headers: { Cookie: state.adminToken }
    });
    if (result.ok) deletedCount++;
  }

  // Delete future lesson
  if (state.lessonId) {
    const result = await apiCall(`/api/lessons/${state.lessonId}`, {
      method: 'DELETE',
      headers: { Cookie: state.adminToken }
    });
    if (result.ok) deletedCount++;
  }

  test(`Cleanup completed (${deletedCount} items deleted)`, true);
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🎓 STUDENT CHECK-IN COMPREHENSIVE TEST SUITE');
  console.log('   Testing all aspects of the kid-friendly check-in system');
  console.log('='.repeat(80) + '\n');

  try {
    await setup();
    await testQrCodeAuth();
    await testPinAuth();
    await testVisualSelector();
    await testLessonCheckIn();
    await testTodaysLessonsFilter();
    await testEdgeCases();
    await testResponseFormat();
    await cleanup();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal Tests: ${state.testResults.total}`);
  console.log(`✅ Passed: ${state.testResults.passed}`);
  console.log(`❌ Failed: ${state.testResults.failed}`);
  console.log(`\n📈 Success Rate: ${(state.testResults.passed / state.testResults.total * 100).toFixed(1)}%`);

  // Section breakdown
  console.log('\n' + '-'.repeat(80));
  console.log('📋 Breakdown by Section:');
  console.log('-'.repeat(80));

  state.testResults.sections.forEach(section => {
    const sectionPassed = section.tests.filter(t => t.passed).length;
    const sectionTotal = section.tests.length;
    const sectionRate = sectionTotal > 0 ? (sectionPassed / sectionTotal * 100).toFixed(1) : 0;

    console.log(`\n${section.name}:`);
    console.log(`  ${sectionPassed}/${sectionTotal} passed (${sectionRate}%)`);
  });

  console.log('\n' + '='.repeat(80));

  if (state.testResults.failed === 0) {
    console.log('🎉🎉🎉 ALL TESTS PASSED! STUDENT CHECK-IN IS PRODUCTION READY! 🎉🎉🎉');
  } else {
    console.log(`⚠️  ${state.testResults.failed} test(s) failed. Review the output above.`);
  }

  console.log('='.repeat(80) + '\n');
}

// Run the tests
runAllTests().catch(console.error);
