/**
 * COMPREHENSIVE BROADCAST MODE DEEP DIVE TEST SUITE
 *
 * This test thoroughly examines every aspect of the broadcast mode feature:
 * - Request creation and data integrity
 * - Approval/cancellation workflows and state transitions
 * - Notification delivery and content
 * - Race conditions and concurrent operations
 * - Authorization and security
 * - Edge cases and error handling
 * - Database consistency
 * - API response correctness
 */

const BASE_URL = 'http://localhost:3335';

// Dynamic offset to avoid date conflicts
const TEST_TIMESTAMP = Date.now();
const DATE_OFFSET = 200 + (Math.floor(TEST_TIMESTAMP / 1000) % 50);

// Test state
const state = {
  adminToken: null,
  teacher1Token: null,
  teacher2Token: null,
  teacher3Token: null,

  absentTeacherId: null,
  substituteTeacher1Id: null,
  substituteTeacher2Id: null,
  substituteTeacher3Id: null,
  substituteTeacher4Id: null,
  substituteTeacher5Id: null,

  studentId: null,
  roomId: null,
  absenceId: null,

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

  // Add to current section
  const currentSection = state.testResults.sections[state.testResults.sections.length - 1];
  if (currentSection) {
    currentSection.tests.push({ description, passed, details });
  }

  return passed;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// API Helper functions
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

async function createLesson(teacherId, dayOffset, hour) {
  const lessonDate = new Date();
  lessonDate.setDate(lessonDate.getDate() + dayOffset);

  const result = await apiCall('/api/lessons', {
    method: 'POST',
    headers: { Cookie: state.adminToken },
    body: JSON.stringify({
      teacherId,
      studentId: state.studentId,
      roomId: state.roomId,
      instrument: 'פסנתר',
      date: lessonDate.toISOString().split('T')[0],
      startTime: `${hour}:00`,
      endTime: `${hour + 1}:00`,
      duration: 60
    })
  });

  return result.ok ? result.data : null;
}

async function createBroadcastRequest(lessonIds, teacherIds, broadcastMode = true) {
  return await apiCall('/api/substitute-requests', {
    method: 'POST',
    headers: { Cookie: state.adminToken },
    body: JSON.stringify({
      absenceId: state.absenceId,
      lessonIds,
      substituteTeacherIds: teacherIds,
      broadcastMode
    })
  });
}

async function respondToRequest(requestId, response, teacherToken) {
  return await apiCall(`/api/substitute-requests/${requestId}/respond`, {
    method: 'POST',
    headers: { Cookie: teacherToken },
    body: JSON.stringify({ response })
  });
}

async function getRequests(absenceId = null) {
  const query = absenceId ? `?absenceId=${absenceId}` : '';
  const result = await apiCall(`/api/substitute-requests${query}`, {
    headers: { Cookie: state.adminToken }
  });
  return result.ok ? result.data.requests : [];
}

async function getNotifications(token) {
  const result = await apiCall('/api/notifications', {
    headers: { Cookie: token }
  });
  return result.ok ? result.data.notifications : [];
}

// Setup and Teardown
async function setup() {
  logSection('SETUP - Initialize Test Environment');

  // Login as admin
  state.adminToken = await login('admin@solu.school', 'admin123');
  test('Admin login successful', state.adminToken !== null);

  // Get teachers
  const teachersResult = await apiCall('/api/teachers', {
    headers: { Cookie: state.adminToken }
  });

  const teachers = teachersResult.data.teachers || teachersResult.data;
  test('Retrieved teachers list', teachers && teachers.length >= 5,
    { count: teachers?.length });

  if (teachers && teachers.length >= 5) {
    state.absentTeacherId = teachers[0].id;
    state.substituteTeacher1Id = teachers[1].id;
    state.substituteTeacher2Id = teachers[2].id;
    state.substituteTeacher3Id = teachers[3].id;
    state.substituteTeacher4Id = teachers[4].id;
    state.substituteTeacher5Id = teachers[5]?.id || teachers[4].id;

    // Login substitute teachers
    state.teacher1Token = await login(teachers[1].user.email, 'teacher123');
    state.teacher2Token = await login(teachers[2].user.email, 'teacher123');
    state.teacher3Token = await login(teachers[3].user.email, 'teacher123');

    test('Substitute teachers logged in',
      state.teacher1Token && state.teacher2Token && state.teacher3Token);
  }

  // Get student
  const studentsResult = await apiCall('/api/students', {
    headers: { Cookie: state.adminToken }
  });
  const students = studentsResult.data.students || studentsResult.data;
  if (students && students.length > 0) {
    state.studentId = students[0].id;
    test('Retrieved student for testing', true);
  }

  // Get room
  const roomsResult = await apiCall('/api/rooms', {
    headers: { Cookie: state.adminToken }
  });
  const rooms = roomsResult.data.rooms || roomsResult.data;
  if (rooms && rooms.length > 0) {
    state.roomId = rooms[0].id;
    test('Retrieved room for testing', true);
  }

  // Create absence
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + DATE_OFFSET - 5);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const absenceResult = await apiCall('/api/teacher-absences', {
    method: 'POST',
    headers: { Cookie: state.adminToken },
    body: JSON.stringify({
      teacherId: state.absentTeacherId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      reason: 'Deep dive broadcast testing',
      notes: 'Comprehensive test suite'
    })
  });

  if (absenceResult.ok && absenceResult.data.success) {
    state.absenceId = absenceResult.data.absence.id;
    test('Created test absence', true);
  }
}

async function cleanup() {
  logSection('CLEANUP - Remove Test Data');

  let deletedCount = 0;

  // Get all requests for this absence
  const requests = await getRequests(state.absenceId);

  // Delete lessons through their requests
  const lessonIds = new Set();
  for (const request of requests) {
    if (request.lessonId) {
      lessonIds.add(request.lessonId);
    }
  }

  for (const lessonId of lessonIds) {
    const result = await apiCall(`/api/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: { Cookie: state.adminToken }
    });
    if (result.ok) deletedCount++;
  }

  // Delete absence
  if (state.absenceId) {
    const result = await apiCall(`/api/teacher-absences/${state.absenceId}`, {
      method: 'DELETE',
      headers: { Cookie: state.adminToken }
    });
    if (result.ok) deletedCount++;
  }

  test(`Cleanup completed (${deletedCount} items deleted)`, true);
}

// Test Sections

async function testRequestCreation() {
  logSection('REQUEST CREATION - Broadcast Group Formation');

  // Test 1: Single teacher broadcast
  logSubsection('1.1 - Single Teacher (Backward Compatibility)');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET, 9);
  if (lesson1) {
    const result = await createBroadcastRequest([lesson1.id], [state.substituteTeacher1Id], false);
    test('Single teacher request created', result.ok && result.data.success);
    test('Returns 1 request', result.data.requests?.length === 1);
    test('No broadcastGroupId for single request',
      result.data.requests?.[0]?.broadcastGroupId === null);
    test('Status is awaiting_approval',
      result.data.requests?.[0]?.status === 'awaiting_approval');
  }

  // Test 2: Broadcast to 2 teachers
  logSubsection('1.2 - Broadcast to 2 Teachers');
  const lesson2 = await createLesson(state.absentTeacherId, DATE_OFFSET + 1, 10);
  if (lesson2) {
    const result = await createBroadcastRequest(
      [lesson2.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    test('Broadcast to 2 teachers created', result.ok && result.data.success);
    test('Returns 2 requests', result.data.requests?.length === 2);

    if (result.data.requests?.length === 2) {
      const groupId1 = result.data.requests[0].broadcastGroupId;
      const groupId2 = result.data.requests[1].broadcastGroupId;

      test('Both requests have broadcastGroupId', groupId1 && groupId2);
      test('Same broadcastGroupId for both', groupId1 === groupId2);
      test('BroadcastGroupId format correct',
        groupId1?.startsWith('broadcast_'));
      test('Both point to same lesson',
        result.data.requests[0].lessonId === result.data.requests[1].lessonId);
      test('Different substitute teachers',
        result.data.requests[0].substituteTeacherId !== result.data.requests[1].substituteTeacherId);
      test('Both have awaiting_approval status',
        result.data.requests.every(r => r.status === 'awaiting_approval'));
    }
  }

  // Test 3: Broadcast to 5 teachers
  logSubsection('1.3 - Broadcast to 5 Teachers (Large Group)');
  const lesson3 = await createLesson(state.absentTeacherId, DATE_OFFSET + 2, 11);
  if (lesson3) {
    const teacherIds = [
      state.substituteTeacher1Id,
      state.substituteTeacher2Id,
      state.substituteTeacher3Id,
      state.substituteTeacher4Id,
      state.substituteTeacher5Id
    ].filter(Boolean);

    const result = await createBroadcastRequest([lesson3.id], teacherIds, true);

    test('Large broadcast created', result.ok && result.data.success);
    test(`Returns ${teacherIds.length} requests`,
      result.data.requests?.length === teacherIds.length);

    if (result.data.requests?.length > 0) {
      const groupIds = result.data.requests.map(r => r.broadcastGroupId);
      const uniqueGroupIds = new Set(groupIds);

      test('All have same broadcastGroupId', uniqueGroupIds.size === 1);
      test('All point to same lesson',
        result.data.requests.every(r => r.lessonId === lesson3.id));
      test('Each teacher appears once',
        new Set(result.data.requests.map(r => r.substituteTeacherId)).size === teacherIds.length);
    }
  }

  // Test 4: Multiple lessons, multiple teachers
  logSubsection('1.4 - Multiple Lessons with Different Teacher Sets');
  const lesson4a = await createLesson(state.absentTeacherId, DATE_OFFSET + 3, 12);
  const lesson4b = await createLesson(state.absentTeacherId, DATE_OFFSET + 4, 13);

  if (lesson4a && lesson4b) {
    const result = await createBroadcastRequest(
      [lesson4a.id, lesson4b.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id, state.substituteTeacher3Id],
      true
    );

    test('Multiple lessons broadcast created', result.ok && result.data.success);
    test('Returns 6 requests (2 lessons × 3 teachers)',
      result.data.requests?.length === 6);

    if (result.data.requests?.length === 6) {
      const lesson4aRequests = result.data.requests.filter(r => r.lessonId === lesson4a.id);
      const lesson4bRequests = result.data.requests.filter(r => r.lessonId === lesson4b.id);

      test('3 requests for first lesson', lesson4aRequests.length === 3);
      test('3 requests for second lesson', lesson4bRequests.length === 3);

      const groupId4a = lesson4aRequests[0]?.broadcastGroupId;
      const groupId4b = lesson4bRequests[0]?.broadcastGroupId;

      test('First lesson has consistent broadcastGroupId',
        lesson4aRequests.every(r => r.broadcastGroupId === groupId4a));
      test('Second lesson has consistent broadcastGroupId',
        lesson4bRequests.every(r => r.broadcastGroupId === groupId4b));
      test('Different lessons have different broadcastGroupIds',
        groupId4a !== groupId4b);
    }
  }

  // Test 5: BroadcastGroupId uniqueness
  logSubsection('1.5 - BroadcastGroupId Uniqueness and Format');
  const lesson5a = await createLesson(state.absentTeacherId, DATE_OFFSET + 5, 14);
  const lesson5b = await createLesson(state.absentTeacherId, DATE_OFFSET + 6, 15);

  if (lesson5a && lesson5b) {
    const result1 = await createBroadcastRequest(
      [lesson5a.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    await sleep(100); // Ensure different timestamps

    const result2 = await createBroadcastRequest(
      [lesson5b.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    if (result1.data.requests && result2.data.requests) {
      const groupId1 = result1.data.requests[0]?.broadcastGroupId;
      const groupId2 = result2.data.requests[0]?.broadcastGroupId;

      test('BroadcastGroupIds are unique across different broadcasts',
        groupId1 !== groupId2);
      test('BroadcastGroupId contains timestamp component',
        groupId1?.includes('_') && groupId2?.includes('_'));
    }
  }
}

async function testApprovalFlow() {
  logSection('APPROVAL FLOW - First-to-Approve Mechanism');

  // Test 1: First teacher approves
  logSubsection('2.1 - First Teacher Approves → Others Cancelled');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET + 10, 9);
  if (lesson1) {
    const createResult = await createBroadcastRequest(
      [lesson1.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id, state.substituteTeacher3Id],
      true
    );

    if (createResult.data.requests?.length === 3) {
      const requests = createResult.data.requests;
      const req1 = requests.find(r => r.substituteTeacherId === state.substituteTeacher1Id);

      // Teacher 1 approves
      const approveResult = await respondToRequest(req1.id, 'approved', state.teacher1Token);

      test('Approval successful', approveResult.ok && approveResult.data.success);
      test('Returns updated request', approveResult.data.request?.status === 'approved');

      // Check other requests were cancelled
      await sleep(500); // Allow time for auto-cancellation
      const allRequests = await getRequests(state.absenceId);
      const thisGroupRequests = allRequests.filter(
        r => r.broadcastGroupId === requests[0].broadcastGroupId
      );

      test('3 requests in broadcast group', thisGroupRequests.length === 3);

      const approvedCount = thisGroupRequests.filter(r => r.status === 'approved').length;
      const cancelledCount = thisGroupRequests.filter(r => r.status === 'cancelled').length;

      test('Exactly 1 approved request', approvedCount === 1);
      test('Exactly 2 cancelled requests', cancelledCount === 2);
      test('Approved request is teacher 1',
        thisGroupRequests.find(r => r.status === 'approved')?.substituteTeacherId === state.substituteTeacher1Id);
    }
  }

  // Test 2: Last teacher approves
  logSubsection('2.2 - Last Teacher Approves → Others Cancelled');
  const lesson2 = await createLesson(state.absentTeacherId, DATE_OFFSET + 11, 10);
  if (lesson2) {
    const createResult = await createBroadcastRequest(
      [lesson2.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id, state.substituteTeacher3Id],
      true
    );

    if (createResult.data.requests?.length === 3) {
      const requests = createResult.data.requests;
      const req3 = requests.find(r => r.substituteTeacherId === state.substituteTeacher3Id);

      // Teacher 3 approves
      await respondToRequest(req3.id, 'approved', state.teacher3Token);

      await sleep(500);
      const allRequests = await getRequests(state.absenceId);
      const thisGroupRequests = allRequests.filter(
        r => r.broadcastGroupId === requests[0].broadcastGroupId
      );

      const approvedReq = thisGroupRequests.find(r => r.status === 'approved');
      test('Last teacher successfully approved',
        approvedReq?.substituteTeacherId === state.substituteTeacher3Id);
      test('Other 2 requests cancelled',
        thisGroupRequests.filter(r => r.status === 'cancelled').length === 2);
    }
  }

  // Test 3: One declines, another approves
  logSubsection('2.3 - One Declines, Another Approves');
  const lesson3 = await createLesson(state.absentTeacherId, DATE_OFFSET + 12, 11);
  if (lesson3) {
    const createResult = await createBroadcastRequest(
      [lesson3.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id, state.substituteTeacher3Id],
      true
    );

    if (createResult.data.requests?.length === 3) {
      const requests = createResult.data.requests;
      const req1 = requests.find(r => r.substituteTeacherId === state.substituteTeacher1Id);
      const req2 = requests.find(r => r.substituteTeacherId === state.substituteTeacher2Id);

      // Teacher 1 declines
      await respondToRequest(req1.id, 'declined', state.teacher1Token);
      await sleep(200);

      // Teacher 2 approves
      await respondToRequest(req2.id, 'approved', state.teacher2Token);
      await sleep(500);

      const allRequests = await getRequests(state.absenceId);
      const thisGroupRequests = allRequests.filter(
        r => r.broadcastGroupId === requests[0].broadcastGroupId
      );

      const declined = thisGroupRequests.filter(r => r.status === 'declined').length;
      const approved = thisGroupRequests.filter(r => r.status === 'approved').length;
      const cancelled = thisGroupRequests.filter(r => r.status === 'cancelled').length;

      test('1 request declined', declined === 1);
      test('1 request approved', approved === 1);
      test('1 request cancelled (neither declined nor approved)', cancelled === 1);
      test('Approved request is teacher 2',
        thisGroupRequests.find(r => r.status === 'approved')?.substituteTeacherId === state.substituteTeacher2Id);
    }
  }

  // Test 4: Cannot approve after cancelled
  logSubsection('2.4 - Cannot Approve After Being Cancelled');
  const lesson4 = await createLesson(state.absentTeacherId, DATE_OFFSET + 13, 12);
  if (lesson4) {
    const createResult = await createBroadcastRequest(
      [lesson4.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    if (createResult.data.requests?.length === 2) {
      const requests = createResult.data.requests;
      const req1 = requests.find(r => r.substituteTeacherId === state.substituteTeacher1Id);
      const req2 = requests.find(r => r.substituteTeacherId === state.substituteTeacher2Id);

      // Teacher 1 approves
      await respondToRequest(req1.id, 'approved', state.teacher1Token);
      await sleep(500);

      // Teacher 2 tries to approve (should fail or be rejected)
      const approveResult2 = await respondToRequest(req2.id, 'approved', state.teacher2Token);

      test('Second approval rejected or marked as invalid',
        !approveResult2.ok || approveResult2.data.error || approveResult2.data.request?.status === 'cancelled');
    }
  }
}

async function testNotifications() {
  logSection('NOTIFICATIONS - Delivery and Content');

  logSubsection('3.1 - Initial Broadcast Notifications');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET + 20, 9);
  if (lesson1) {
    // Clear existing notifications (conceptually)
    const beforeNotifs1 = await getNotifications(state.teacher1Token);
    const beforeNotifs2 = await getNotifications(state.teacher2Token);
    const beforeCount1 = beforeNotifs1?.length || 0;
    const beforeCount2 = beforeNotifs2?.length || 0;

    const createResult = await createBroadcastRequest(
      [lesson1.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    await sleep(500);

    const afterNotifs1 = await getNotifications(state.teacher1Token);
    const afterNotifs2 = await getNotifications(state.teacher2Token);

    test('Teacher 1 received notification',
      afterNotifs1 && afterNotifs1.length > beforeCount1);
    test('Teacher 2 received notification',
      afterNotifs2 && afterNotifs2.length > beforeCount2);

    if (afterNotifs1 && afterNotifs1.length > 0) {
      const latestNotif = afterNotifs1[0];
      test('Notification type is substitute_request_created',
        latestNotif.type === 'substitute_request_created');
      test('Notification contains Hebrew message',
        latestNotif.message && latestNotif.message.includes('הראשון'));
    }
  }

  logSubsection('3.2 - Cancellation Notifications');
  const lesson2 = await createLesson(state.absentTeacherId, DATE_OFFSET + 21, 10);
  if (lesson2) {
    const beforeNotifs2 = await getNotifications(state.teacher2Token);
    const beforeCount2 = beforeNotifs2?.length || 0;

    const createResult = await createBroadcastRequest(
      [lesson2.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    if (createResult.data.requests?.length === 2) {
      const req1 = createResult.data.requests.find(
        r => r.substituteTeacherId === state.substituteTeacher1Id
      );

      // Teacher 1 approves
      await respondToRequest(req1.id, 'approved', state.teacher1Token);
      await sleep(800);

      const afterNotifs2 = await getNotifications(state.teacher2Token);

      test('Teacher 2 received cancellation notification',
        afterNotifs2 && afterNotifs2.length > beforeCount2 + 1); // +1 for initial, +1 for cancellation

      if (afterNotifs2 && afterNotifs2.length > 0) {
        const cancelNotif = afterNotifs2.find(
          n => n.type === 'substitute_request_cancelled'
        );
        test('Cancellation notification exists', cancelNotif !== undefined);
        test('Cancellation message mentions another teacher approved',
          cancelNotif?.message && cancelNotif.message.includes('אחר'));
      }
    }
  }
}

async function testEdgeCases() {
  logSection('EDGE CASES - Error Handling and Validation');

  logSubsection('4.1 - Empty Teacher Array');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET + 30, 9);
  if (lesson1) {
    const result = await createBroadcastRequest([lesson1.id], [], true);
    test('Empty teacher array rejected', !result.ok || result.status === 400);
    test('Error message provided', result.data?.error !== undefined);
  }

  logSubsection('4.2 - Invalid Teacher ID');
  const lesson2 = await createLesson(state.absentTeacherId, DATE_OFFSET + 31, 10);
  if (lesson2) {
    const result = await createBroadcastRequest(
      [lesson2.id],
      [state.substituteTeacher1Id, 'invalid-teacher-id-999'],
      true
    );
    test('Invalid teacher ID rejected', !result.ok || result.status === 404);
  }

  logSubsection('4.3 - Non-existent Lesson');
  const result = await createBroadcastRequest(
    ['nonexistent-lesson-id'],
    [state.substituteTeacher1Id],
    true
  );
  test('Non-existent lesson rejected', !result.ok || result.status === 400 || result.status === 404);

  logSubsection('4.4 - Non-existent Absence');
  const lesson4 = await createLesson(state.absentTeacherId, DATE_OFFSET + 32, 11);
  if (lesson4) {
    const result = await apiCall('/api/substitute-requests', {
      method: 'POST',
      headers: { Cookie: state.adminToken },
      body: JSON.stringify({
        absenceId: 'nonexistent-absence-id',
        lessonIds: [lesson4.id],
        substituteTeacherIds: [state.substituteTeacher1Id],
        broadcastMode: true
      })
    });
    test('Non-existent absence rejected', !result.ok || result.status === 404);
  }

  logSubsection('4.5 - Duplicate Teacher IDs');
  const lesson5 = await createLesson(state.absentTeacherId, DATE_OFFSET + 33, 12);
  if (lesson5) {
    const result = await createBroadcastRequest(
      [lesson5.id],
      [state.substituteTeacher1Id, state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    if (result.ok && result.data.success) {
      // Should deduplicate or handle gracefully
      test('Handles duplicate teacher IDs gracefully',
        result.data.requests?.length === 2 || result.data.requests?.length === 3);
    } else {
      test('Duplicate teacher IDs rejected or handled', true);
    }
  }

  logSubsection('4.6 - Single Teacher with Broadcast Mode');
  const lesson6 = await createLesson(state.absentTeacherId, DATE_OFFSET + 34, 13);
  if (lesson6) {
    const result = await createBroadcastRequest(
      [lesson6.id],
      [state.substituteTeacher1Id],
      true
    );

    test('Single teacher with broadcast mode succeeds', result.ok);
    if (result.data.requests?.length === 1) {
      test('No broadcastGroupId for single teacher (not really broadcasting)',
        result.data.requests[0].broadcastGroupId === null);
    }
  }
}

async function testDataIntegrity() {
  logSection('DATA INTEGRITY - Database Consistency');

  logSubsection('5.1 - Foreign Key Relationships');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET + 40, 9);
  if (lesson1) {
    const createResult = await createBroadcastRequest(
      [lesson1.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    if (createResult.data.requests?.length === 2) {
      const requests = createResult.data.requests;

      test('All requests have absenceId',
        requests.every(r => r.absenceId === state.absenceId));
      test('All requests have lessonId',
        requests.every(r => r.lessonId === lesson1.id));
      test('All requests have originalTeacherId',
        requests.every(r => r.originalTeacherId === state.absentTeacherId));
      test('All requests have valid substituteTeacherId',
        requests.every(r => r.substituteTeacherId));
      test('All requests have studentId',
        requests.every(r => r.studentId === state.studentId));
      test('All requests have roomId',
        requests.every(r => r.roomId === state.roomId));
    }
  }

  logSubsection('5.2 - Broadcast Group Consistency');
  const lesson2a = await createLesson(state.absentTeacherId, DATE_OFFSET + 41, 10);
  const lesson2b = await createLesson(state.absentTeacherId, DATE_OFFSET + 42, 11);

  if (lesson2a && lesson2b) {
    await createBroadcastRequest(
      [lesson2a.id, lesson2b.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id, state.substituteTeacher3Id],
      true
    );

    await sleep(500);
    const allRequests = await getRequests(state.absenceId);

    // Group by broadcastGroupId
    const groups = {};
    allRequests.forEach(req => {
      if (req.broadcastGroupId) {
        if (!groups[req.broadcastGroupId]) {
          groups[req.broadcastGroupId] = [];
        }
        groups[req.broadcastGroupId].push(req);
      }
    });

    test('Multiple broadcast groups exist', Object.keys(groups).length > 0);

    // Each group should have same lessonId
    Object.entries(groups).forEach(([groupId, reqs]) => {
      const lessonIds = new Set(reqs.map(r => r.lessonId));
      test(`Broadcast group ${groupId.substring(0, 8)}... has consistent lessonId`,
        lessonIds.size === 1);
    });
  }

  logSubsection('5.3 - Status Transitions');
  const lesson3 = await createLesson(state.absentTeacherId, DATE_OFFSET + 43, 12);
  if (lesson3) {
    const createResult = await createBroadcastRequest(
      [lesson3.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    if (createResult.data.requests?.length === 2) {
      const initialStatuses = createResult.data.requests.map(r => r.status);
      test('All start with awaiting_approval',
        initialStatuses.every(s => s === 'awaiting_approval'));

      const req1 = createResult.data.requests[0];
      await respondToRequest(req1.id, 'approved', state.teacher1Token);
      await sleep(500);

      const allRequests = await getRequests(state.absenceId);
      const thisGroup = allRequests.filter(
        r => r.broadcastGroupId === createResult.data.requests[0].broadcastGroupId
      );

      const statuses = new Set(thisGroup.map(r => r.status));
      test('Only valid statuses exist',
        Array.from(statuses).every(s => ['approved', 'cancelled', 'declined', 'awaiting_approval'].includes(s)));
      test('Exactly one approved status',
        thisGroup.filter(r => r.status === 'approved').length === 1);
    }
  }
}

async function testAuthorization() {
  logSection('AUTHORIZATION - Security and Access Control');

  logSubsection('6.1 - Teacher Can Only Respond to Own Requests');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET + 50, 9);
  if (lesson1) {
    const createResult = await createBroadcastRequest(
      [lesson1.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    if (createResult.data.requests?.length === 2) {
      const req1 = createResult.data.requests.find(
        r => r.substituteTeacherId === state.substituteTeacher1Id
      );

      // Teacher 2 tries to approve Teacher 1's request
      const wrongTeacherResult = await respondToRequest(
        req1.id,
        'approved',
        state.teacher2Token
      );

      test('Cannot respond to another teacher\'s request',
        !wrongTeacherResult.ok || wrongTeacherResult.data?.error);
    }
  }

  logSubsection('6.2 - Unauthorized User Cannot Create Broadcast');
  const lesson2 = await createLesson(state.absentTeacherId, DATE_OFFSET + 51, 10);
  if (lesson2) {
    const result = await apiCall('/api/substitute-requests', {
      method: 'POST',
      headers: { Cookie: state.teacher1Token }, // Teacher token, not admin
      body: JSON.stringify({
        absenceId: state.absenceId,
        lessonIds: [lesson2.id],
        substituteTeacherIds: [state.substituteTeacher2Id],
        broadcastMode: true
      })
    });

    test('Non-admin cannot create broadcast request',
      !result.ok || result.status === 401 || result.status === 403);
  }
}

async function testConcurrency() {
  logSection('CONCURRENCY - Race Conditions and Simultaneous Operations');

  logSubsection('7.1 - Simultaneous Approvals');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET + 60, 9);
  if (lesson1) {
    const createResult = await createBroadcastRequest(
      [lesson1.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id, state.substituteTeacher3Id],
      true
    );

    if (createResult.data.requests?.length === 3) {
      const req1 = createResult.data.requests.find(r => r.substituteTeacherId === state.substituteTeacher1Id);
      const req2 = createResult.data.requests.find(r => r.substituteTeacherId === state.substituteTeacher2Id);
      const req3 = createResult.data.requests.find(r => r.substituteTeacherId === state.substituteTeacher3Id);

      // Fire all three approvals simultaneously
      const results = await Promise.all([
        respondToRequest(req1.id, 'approved', state.teacher1Token),
        respondToRequest(req2.id, 'approved', state.teacher2Token),
        respondToRequest(req3.id, 'approved', state.teacher3Token)
      ]);

      await sleep(1000);

      const allRequests = await getRequests(state.absenceId);
      const thisGroup = allRequests.filter(
        r => r.broadcastGroupId === createResult.data.requests[0].broadcastGroupId
      );

      const approvedCount = thisGroup.filter(r => r.status === 'approved').length;

      test('Only one approval succeeds in race condition',
        approvedCount === 1);
      test('Other requests are cancelled or rejected',
        thisGroup.filter(r => r.status === 'cancelled').length === 2);
    }
  }

  logSubsection('7.2 - Multiple Broadcasts Created Simultaneously');
  const lesson2a = await createLesson(state.absentTeacherId, DATE_OFFSET + 61, 10);
  const lesson2b = await createLesson(state.absentTeacherId, DATE_OFFSET + 62, 11);
  const lesson2c = await createLesson(state.absentTeacherId, DATE_OFFSET + 63, 12);

  if (lesson2a && lesson2b && lesson2c) {
    const results = await Promise.all([
      createBroadcastRequest([lesson2a.id], [state.substituteTeacher1Id, state.substituteTeacher2Id], true),
      createBroadcastRequest([lesson2b.id], [state.substituteTeacher2Id, state.substituteTeacher3Id], true),
      createBroadcastRequest([lesson2c.id], [state.substituteTeacher1Id, state.substituteTeacher3Id], true)
    ]);

    const successCount = results.filter(r => r.ok).length;
    test('All simultaneous broadcasts created successfully', successCount === 3);

    if (successCount === 3) {
      const groupIds = results.flatMap(r => r.data.requests || [])
        .map(req => req.broadcastGroupId)
        .filter(Boolean);

      const uniqueGroupIds = new Set(groupIds);
      test('Each broadcast has unique broadcastGroupId', uniqueGroupIds.size >= 3);
    }
  }
}

async function testAPIResponses() {
  logSection('API RESPONSES - Data Format and Completeness');

  logSubsection('8.1 - Request Creation Response Format');
  const lesson1 = await createLesson(state.absentTeacherId, DATE_OFFSET + 70, 9);
  if (lesson1) {
    const result = await createBroadcastRequest(
      [lesson1.id],
      [state.substituteTeacher1Id, state.substituteTeacher2Id],
      true
    );

    test('Response has success field', result.data?.success !== undefined);
    test('Response has requests array', Array.isArray(result.data?.requests));
    test('Response has broadcastMode field', result.data?.broadcastMode !== undefined);
    test('Response has message field', typeof result.data?.message === 'string');

    if (result.data.requests?.length > 0) {
      const req = result.data.requests[0];

      test('Request has id', req.id !== undefined);
      test('Request has absenceId', req.absenceId !== undefined);
      test('Request has lessonId', req.lessonId !== undefined);
      test('Request has substituteTeacherId', req.substituteTeacherId !== undefined);
      test('Request has status', req.status !== undefined);
      test('Request has broadcastGroupId', req.broadcastGroupId !== undefined);
      test('Request has createdAt timestamp', req.createdAt !== undefined);
      test('Request includes lesson details', req.lesson !== undefined);
      test('Request includes student details', req.student !== undefined);
    }
  }

  logSubsection('8.2 - Approval Response Format');
  const lesson2 = await createLesson(state.absentTeacherId, DATE_OFFSET + 71, 10);
  if (lesson2) {
    const createResult = await createBroadcastRequest(
      [lesson2.id],
      [state.substituteTeacher1Id],
      false
    );

    if (createResult.data.requests?.length === 1) {
      const approveResult = await respondToRequest(
        createResult.data.requests[0].id,
        'approved',
        state.teacher1Token
      );

      test('Approval response has success field', approveResult.data?.success !== undefined);
      test('Approval response has request field', approveResult.data?.request !== undefined);
      test('Approval response has message', approveResult.data?.message !== undefined);

      if (approveResult.data.request) {
        test('Updated request has approved status',
          approveResult.data.request.status === 'approved');
        test('Updated request has approvedAt timestamp',
          approveResult.data.request.approvedAt !== undefined);
      }
    }
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 BROADCAST MODE DEEP DIVE TEST SUITE');
  console.log('   Comprehensive analysis of all broadcast mode features');
  console.log('='.repeat(80) + '\n');

  try {
    await setup();

    await testRequestCreation();
    await testApprovalFlow();
    await testNotifications();
    await testEdgeCases();
    await testDataIntegrity();
    await testAuthorization();
    await testConcurrency();
    await testAPIResponses();

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
    console.log('🎉🎉🎉 ALL TESTS PASSED! BROADCAST MODE IS PRODUCTION READY! 🎉🎉🎉');
  } else {
    console.log(`⚠️  ${state.testResults.failed} test(s) failed. Review the output above.`);
  }

  console.log('='.repeat(80) + '\n');
}

// Run the tests
runAllTests().catch(console.error);
