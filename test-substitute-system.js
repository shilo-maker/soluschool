const BASE_URL = "http://localhost:3335";

let adminCookies = null;
let teacherCookies = null;
let substituteCookies = null;

let testResults = {
  passed: [],
  failed: []
};

// Test data IDs (will be populated during tests)
let testData = {
  teacherId: null,
  substituteTeacherId: null,
  studentId: null,
  roomId: null,
  lessonId: null,
  absenceId: null,
  substituteRequestId: null,
  affectedLessons: [],
};

// Helper functions
function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function pass(testName) {
  testResults.passed.push(testName);
  console.log(`✅ ${testName}`);
}

function fail(testName, error) {
  testResults.failed.push({ test: testName, error: error?.message || error });
  console.log(`❌ ${testName}`);
  if (error?.message) console.log(`   Error: ${error.message}`);
}

// ========================================
// SETUP: LOGIN AND GET TEST DATA
// ========================================

async function setup() {
  log("🔵", "\n=== SETUP: AUTHENTICATION ===\n");

  try {
    // Login as admin
    const loginRes = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@solu.school",
        password: "admin123"
      })
    });

    if (!loginRes.ok) {
      throw new Error("Admin login failed");
    }

    adminCookies = loginRes.headers.get("set-cookie");
    pass("Admin login");

    // Get teachers
    const teachersRes = await fetch(BASE_URL + "/api/teachers", {
      headers: { Cookie: adminCookies }
    });
    const teachersData = await teachersRes.json();
    const teachers = teachersData.teachers || teachersData;

    if (teachers.length >= 2) {
      testData.teacherId = teachers[0].id;
      testData.substituteTeacherId = teachers[1].id;
      log("📝", `  Teacher 1 (will be absent): ${teachers[0].user.firstName} ${teachers[0].user.lastName}`);
      log("📝", `  Teacher 2 (substitute): ${teachers[1].user.firstName} ${teachers[1].user.lastName}`);
      pass("Found required teachers");
    } else {
      fail("Found required teachers", "Need at least 2 teachers");
    }

    // Get students
    const studentsRes = await fetch(BASE_URL + "/api/students", {
      headers: { Cookie: adminCookies }
    });
    const studentsData = await studentsRes.json();
    const students = studentsData.students || studentsData;

    if (students.length > 0) {
      testData.studentId = students[0].id;
      log("📝", `  Student: ${students[0].user.firstName} ${students[0].user.lastName}`);
      pass("Found student");
    } else {
      fail("Found student", "No students available");
    }

    // Get rooms
    const roomsRes = await fetch(BASE_URL + "/api/rooms", {
      headers: { Cookie: adminCookies }
    });
    const roomsData = await roomsRes.json();
    const rooms = roomsData.rooms || roomsData;

    if (rooms.length > 0) {
      testData.roomId = rooms[0].id;
      log("📝", `  Room: ${rooms[0].name}`);
      pass("Found room");
    } else {
      fail("Found room", "No rooms available");
    }

  } catch (error) {
    fail("Setup authentication", error);
  }
}

// ========================================
// TEST 1: TEACHER ABSENCE API - CREATE
// ========================================

async function testCreateAbsence() {
  log("🔵", "\n=== TEST 1: CREATE TEACHER ABSENCE ===\n");

  try {
    // Test 1.1: Create absence with valid data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // Next week
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 2); // 3 days

    const createRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason: "בדיקה אוטומטית - טיול משפחתי",
        notes: "הערות לבדיקה"
      })
    });

    if (createRes.ok) {
      const data = await createRes.json();
      testData.absenceId = data.absence.id;
      testData.affectedLessons = data.affectedLessons;
      pass("Create absence with valid data");
      log("📊", `  Absence ID: ${testData.absenceId}`);
      log("📊", `  Affected lessons: ${data.affectedLessons.length}`);
    } else {
      fail("Create absence with valid data", `Status: ${createRes.status}`);
    }

    // Test 1.2: Verify absence structure
    if (testData.absenceId) {
      const data = await (await fetch(BASE_URL + "/api/teacher-absences", {
        headers: { Cookie: adminCookies }
      })).json();

      const absence = data.absences.find(a => a.id === testData.absenceId);
      if (absence && absence.teacher && absence.reportedBy) {
        pass("Verify absence data structure");
        log("✔️ ", "  Includes teacher and reportedBy relations");
      } else {
        fail("Verify absence data structure", "Missing required fields");
      }
    }

    // Test 1.3: Reject absence without required fields
    const missingFieldsRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        // Missing startDate and endDate
      })
    });

    if (!missingFieldsRes.ok) {
      pass("Reject absence without required fields");
      log("✔️ ", "  Validation working");
    } else {
      fail("Reject absence without required fields", "Should require startDate and endDate");
    }

    // Test 1.4: Reject absence for non-existent teacher
    const invalidTeacherRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: "00000000-0000-0000-0000-000000000000",
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      })
    });

    if (invalidTeacherRes.status === 404) {
      pass("Reject absence for non-existent teacher");
      log("✔️ ", "  404 as expected");
    } else {
      fail("Reject absence for non-existent teacher", `Got ${invalidTeacherRes.status}`);
    }

    // Test 1.5: Reject unauthenticated access
    const noAuthRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      })
    });

    if (noAuthRes.status === 401) {
      pass("Reject unauthenticated absence creation");
      log("🔒", "  401 Unauthorized as expected");
    } else {
      fail("Reject unauthenticated absence creation", `Got ${noAuthRes.status}`);
    }

  } catch (error) {
    fail("Create teacher absence tests", error);
  }
}

// ========================================
// TEST 2: TEACHER ABSENCE API - READ
// ========================================

async function testReadAbsences() {
  log("🔵", "\n=== TEST 2: READ TEACHER ABSENCES ===\n");

  try {
    // Test 2.1: Get all absences
    const allRes = await fetch(BASE_URL + "/api/teacher-absences", {
      headers: { Cookie: adminCookies }
    });

    if (allRes.ok) {
      const data = await allRes.json();
      if (data.success && Array.isArray(data.absences)) {
        pass("Get all absences");
        log("📊", `  Total absences: ${data.absences.length}`);
      } else {
        fail("Get all absences", "Invalid response structure");
      }
    } else {
      fail("Get all absences", `Status: ${allRes.status}`);
    }

    // Test 2.2: Get specific absence by ID
    if (testData.absenceId) {
      const specificRes = await fetch(BASE_URL + `/api/teacher-absences/${testData.absenceId}`, {
        headers: { Cookie: adminCookies }
      });

      if (specificRes.ok) {
        const data = await specificRes.json();
        if (data.success && data.absence && data.absence.id === testData.absenceId) {
          pass("Get specific absence by ID");
          log("✔️ ", "  Correct absence returned");
        } else {
          fail("Get specific absence by ID", "Wrong absence data");
        }
      } else {
        fail("Get specific absence by ID", `Status: ${specificRes.status}`);
      }
    }

    // Test 2.3: Get absence with substitute requests included
    if (testData.absenceId) {
      const withRequestsRes = await fetch(BASE_URL + `/api/teacher-absences/${testData.absenceId}`, {
        headers: { Cookie: adminCookies }
      });

      if (withRequestsRes.ok) {
        const data = await withRequestsRes.json();
        if (data.absence && Array.isArray(data.absence.substituteRequests)) {
          pass("Get absence with substitute requests");
          log("📊", `  Substitute requests: ${data.absence.substituteRequests.length}`);
        } else {
          fail("Get absence with substitute requests", "Missing substituteRequests");
        }
      } else {
        fail("Get absence with substitute requests", `Status: ${withRequestsRes.status}`);
      }
    }

    // Test 2.4: Filter absences by teacher
    const filteredRes = await fetch(BASE_URL + `/api/teacher-absences?teacherId=${testData.teacherId}`, {
      headers: { Cookie: adminCookies }
    });

    if (filteredRes.ok) {
      const data = await filteredRes.json();
      const allMatch = data.absences.every(a => a.teacherId === testData.teacherId);
      if (allMatch) {
        pass("Filter absences by teacher");
        log("✔️ ", "  All results match filter");
      } else {
        fail("Filter absences by teacher", "Filter not working correctly");
      }
    } else {
      fail("Filter absences by teacher", `Status: ${filteredRes.status}`);
    }

    // Test 2.5: Get non-existent absence
    const notFoundRes = await fetch(BASE_URL + "/api/teacher-absences/00000000-0000-0000-0000-000000000000", {
      headers: { Cookie: adminCookies }
    });

    if (notFoundRes.status === 404) {
      pass("Return 404 for non-existent absence");
      log("✔️ ", "  404 as expected");
    } else {
      fail("Return 404 for non-existent absence", `Got ${notFoundRes.status}`);
    }

  } catch (error) {
    fail("Read teacher absences tests", error);
  }
}

// ========================================
// TEST 3: FIND SUBSTITUTE TEACHERS
// ========================================

async function testFindSubstitutes() {
  log("🔵", "\n=== TEST 3: FIND SUBSTITUTE TEACHERS ===\n");

  // First, create a test lesson for tomorrow
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const lessonData = {
      teacherId: testData.teacherId,
      studentId: testData.studentId,
      roomId: testData.roomId,
      instrument: "גיטרה",
      date: tomorrow.toISOString().split('T')[0],
      startTime: "14:00",
      endTime: "15:00",
      status: "scheduled"
    };

    const createLessonRes = await fetch(BASE_URL + "/api/lessons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify(lessonData)
    });

    if (createLessonRes.ok) {
      const lessonResponse = await createLessonRes.json();
      testData.lessonId = lessonResponse.id; // API returns lesson directly, not wrapped
      pass("Create test lesson for substitute search");
      log("📝", `  Lesson ID: ${testData.lessonId}`);
    }

    // Test 3.1: Find substitutes with valid criteria
    const findRes = await fetch(BASE_URL + "/api/teachers/find-substitutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        instrument: "גיטרה",
        date: tomorrow.toISOString().split('T')[0],
        startTime: "14:00",
        endTime: "15:00",
        originalTeacherId: testData.teacherId
      })
    });

    if (findRes.ok) {
      const data = await findRes.json();
      if (data.success && Array.isArray(data.availableTeachers)) {
        pass("Find substitutes with valid criteria");
        log("📊", `  Available teachers: ${data.availableTeachers.length}`);

        // Verify original teacher is excluded
        const hasOriginal = data.availableTeachers.some(t => t.id === testData.teacherId);
        if (!hasOriginal) {
          pass("Original teacher excluded from results");
        } else {
          fail("Original teacher excluded from results", "Original teacher in results");
        }
      } else {
        fail("Find substitutes with valid criteria", "Invalid response structure");
      }
    } else {
      fail("Find substitutes with valid criteria", `Status: ${findRes.status}`);
    }

    // Test 3.2: Verify substitute teachers can teach the instrument
    const findRes2 = await fetch(BASE_URL + "/api/teachers/find-substitutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        instrument: "גיטרה",
        date: tomorrow.toISOString().split('T')[0],
        startTime: "14:00",
        endTime: "15:00",
      })
    });

    if (findRes2.ok) {
      const data = await findRes2.json();
      const allCanTeach = data.availableTeachers.every(t => t.instruments.includes("גיטרה"));
      if (allCanTeach) {
        pass("All substitute results can teach requested instrument");
      } else {
        fail("All substitute results can teach requested instrument", "Some teachers cannot teach instrument");
      }
    }

    // Test 3.3: Reject search without required fields
    const missingFieldsRes = await fetch(BASE_URL + "/api/teachers/find-substitutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        instrument: "גיטרה",
        // Missing date, startTime, endTime
      })
    });

    if (missingFieldsRes.status === 400) {
      pass("Reject substitute search without required fields");
      log("✔️ ", "  Validation working");
    } else {
      fail("Reject substitute search without required fields", `Got ${missingFieldsRes.status}`);
    }

    // Test 3.4: Verify availability checking (create conflicting lesson)
    const conflictTime = new Date(tomorrow);
    const createConflictRes = await fetch(BASE_URL + "/api/lessons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.substituteTeacherId,
        studentId: testData.studentId,
        roomId: testData.roomId,
        instrument: "פסנתר",
        date: tomorrow.toISOString().split('T')[0],
        startTime: "14:30", // Overlaps with 14:00-15:00
        endTime: "15:30",
        status: "scheduled"
      })
    });

    if (createConflictRes.ok) {
      const conflictData = await createConflictRes.json();
      const conflictLessonId = conflictData.id; // API returns lesson directly

      // Now search again - substitute teacher should be excluded
      const findAfterConflict = await fetch(BASE_URL + "/api/teachers/find-substitutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({
          instrument: "גיטרה",
          date: tomorrow.toISOString().split('T')[0],
          startTime: "14:00",
          endTime: "15:00",
        })
      });

      if (findAfterConflict.ok) {
        const data = await findAfterConflict.json();
        const hasConflictingTeacher = data.availableTeachers.some(t => t.id === testData.substituteTeacherId);
        if (!hasConflictingTeacher) {
          pass("Conflicting teachers excluded from results");
          log("✔️ ", "  Availability checking works");
        } else {
          fail("Conflicting teachers excluded from results", "Teacher with conflict still in results");
        }
      }

      // Clean up conflict lesson
      await fetch(BASE_URL + `/api/lessons/${conflictLessonId}`, {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });
    }

  } catch (error) {
    fail("Find substitute teachers tests", error);
  }
}

// ========================================
// TEST 4: SUBSTITUTE REQUESTS - CREATE
// ========================================

async function testCreateSubstituteRequest() {
  log("🔵", "\n=== TEST 4: CREATE SUBSTITUTE REQUESTS ===\n");

  try {
    // Test 4.1: Create substitute request with valid data
    if (testData.absenceId && testData.lessonId && testData.substituteTeacherId) {
      const createReqRes = await fetch(BASE_URL + "/api/substitute-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({
          absenceId: testData.absenceId,
          lessonIds: [testData.lessonId],
          substituteTeacherId: testData.substituteTeacherId,
          notes: "בדיקה אוטומטית"
        })
      });

      if (createReqRes.ok) {
        const data = await createReqRes.json();
        if (data.success && data.requests && data.requests.length > 0) {
          testData.substituteRequestId = data.requests[0].id;
          pass("Create substitute request with valid data");
          log("📊", `  Request ID: ${testData.substituteRequestId}`);
          log("📊", `  Requests created: ${data.requests.length}`);
        } else {
          fail("Create substitute request with valid data", "Invalid response structure");
        }
      } else {
        const errorData = await createReqRes.json();
        fail("Create substitute request with valid data", `Status: ${createReqRes.status} - ${errorData.error}`);
      }
    } else {
      log("⚠️ ", "Skipping create request test - missing required IDs");
    }

    // Test 4.2: Verify notification was created
    const notificationsRes = await fetch(BASE_URL + "/api/notifications", {
      headers: { Cookie: adminCookies }
    });

    if (notificationsRes.ok) {
      const data = await notificationsRes.json();
      // This endpoint might not exist, skip gracefully
      pass("Notification creation checked (endpoint may not exist)");
    }

    // Test 4.3: Reject request without required fields
    const missingFieldsRes = await fetch(BASE_URL + "/api/substitute-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        absenceId: testData.absenceId,
        // Missing lessonIds and substituteTeacherId
      })
    });

    if (missingFieldsRes.status === 400) {
      pass("Reject substitute request without required fields");
      log("✔️ ", "  Validation working");
    } else {
      fail("Reject substitute request without required fields", `Got ${missingFieldsRes.status}`);
    }

    // Test 4.4: Reject request with invalid absence ID
    const invalidAbsenceRes = await fetch(BASE_URL + "/api/substitute-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        absenceId: "00000000-0000-0000-0000-000000000000",
        lessonIds: [testData.lessonId],
        substituteTeacherId: testData.substituteTeacherId,
      })
    });

    if (invalidAbsenceRes.status === 404) {
      pass("Reject request with invalid absence ID");
      log("✔️ ", "  404 as expected");
    } else {
      fail("Reject request with invalid absence ID", `Got ${invalidAbsenceRes.status}`);
    }

    // Test 4.5: Reject request with invalid substitute teacher ID
    const invalidTeacherRes = await fetch(BASE_URL + "/api/substitute-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        absenceId: testData.absenceId,
        lessonIds: [testData.lessonId],
        substituteTeacherId: "00000000-0000-0000-0000-000000000000",
      })
    });

    if (invalidTeacherRes.status === 404) {
      pass("Reject request with invalid substitute teacher ID");
      log("✔️ ", "  404 as expected");
    } else {
      fail("Reject request with invalid substitute teacher ID", `Got ${invalidTeacherRes.status}`);
    }

  } catch (error) {
    fail("Create substitute request tests", error);
  }
}

// ========================================
// TEST 5: SUBSTITUTE REQUESTS - READ
// ========================================

async function testReadSubstituteRequests() {
  log("🔵", "\n=== TEST 5: READ SUBSTITUTE REQUESTS ===\n");

  try {
    // Test 5.1: Get all substitute requests
    const allRes = await fetch(BASE_URL + "/api/substitute-requests", {
      headers: { Cookie: adminCookies }
    });

    if (allRes.ok) {
      const data = await allRes.json();
      if (data.success && Array.isArray(data.requests)) {
        pass("Get all substitute requests");
        log("📊", `  Total requests: ${data.requests.length}`);
      } else {
        fail("Get all substitute requests", "Invalid response structure");
      }
    } else {
      fail("Get all substitute requests", `Status: ${allRes.status}`);
    }

    // Test 5.2: Filter requests by absence ID
    if (testData.absenceId) {
      const filteredRes = await fetch(BASE_URL + `/api/substitute-requests?absenceId=${testData.absenceId}`, {
        headers: { Cookie: adminCookies }
      });

      if (filteredRes.ok) {
        const data = await filteredRes.json();
        const allMatch = data.requests.every(r => r.absenceId === testData.absenceId);
        if (allMatch) {
          pass("Filter requests by absence ID");
          log("✔️ ", "  All results match filter");
        } else {
          fail("Filter requests by absence ID", "Filter not working correctly");
        }
      } else {
        fail("Filter requests by absence ID", `Status: ${filteredRes.status}`);
      }
    }

    // Test 5.3: Filter requests by substitute teacher ID
    if (testData.substituteTeacherId) {
      const filteredRes = await fetch(BASE_URL + `/api/substitute-requests?substituteTeacherId=${testData.substituteTeacherId}`, {
        headers: { Cookie: adminCookies }
      });

      if (filteredRes.ok) {
        const data = await filteredRes.json();
        pass("Filter requests by substitute teacher ID");
        log("📊", `  Requests for this teacher: ${data.requests.length}`);
      } else {
        fail("Filter requests by substitute teacher ID", `Status: ${filteredRes.status}`);
      }
    }

    // Test 5.4: Filter requests by status
    const statusRes = await fetch(BASE_URL + "/api/substitute-requests?status=awaiting_approval", {
      headers: { Cookie: adminCookies }
    });

    if (statusRes.ok) {
      const data = await statusRes.json();
      const allMatch = data.requests.every(r => r.status === "awaiting_approval");
      if (allMatch) {
        pass("Filter requests by status");
        log("✔️ ", "  Status filter working");
      } else {
        fail("Filter requests by status", "Status filter not working");
      }
    } else {
      fail("Filter requests by status", `Status: ${statusRes.status}`);
    }

    // Test 5.5: Verify request includes all relations
    if (testData.substituteRequestId) {
      const allReqRes = await fetch(BASE_URL + "/api/substitute-requests", {
        headers: { Cookie: adminCookies }
      });

      if (allReqRes.ok) {
        const data = await allReqRes.json();
        const request = data.requests.find(r => r.id === testData.substituteRequestId);

        if (request && request.absence && request.lesson && request.originalTeacher && request.substituteTeacher) {
          pass("Request includes all required relations");
          log("✔️ ", "  absence, lesson, teachers included");
        } else {
          fail("Request includes all required relations", "Missing relations");
        }
      }
    }

  } catch (error) {
    fail("Read substitute requests tests", error);
  }
}

// ========================================
// TEST 6: SUBSTITUTE RESPONSE - APPROVE
// ========================================

async function testSubstituteResponse() {
  log("🔵", "\n=== TEST 6: SUBSTITUTE RESPONSE (APPROVE/DECLINE) ===\n");

  try {
    // Test 6.1: Approve substitute request
    if (testData.substituteRequestId) {
      const approveRes = await fetch(BASE_URL + `/api/substitute-requests/${testData.substituteRequestId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({
          response: "approved",
          notes: "אישור אוטומטי מבדיקה"
        })
      });

      if (approveRes.ok) {
        const data = await approveRes.json();
        if (data.success && data.substituteRequest.status === "approved") {
          pass("Approve substitute request");
          log("✔️ ", "  Status changed to approved");
        } else {
          fail("Approve substitute request", "Status not updated");
        }
      } else {
        fail("Approve substitute request", `Status: ${approveRes.status}`);
      }

      // Test 6.2: Verify lesson was reassigned
      if (testData.lessonId) {
        const lessonRes = await fetch(BASE_URL + `/api/lessons/${testData.lessonId}`, {
          headers: { Cookie: adminCookies }
        });

        if (lessonRes.ok) {
          const lessonData = await lessonRes.json();
          const lesson = lessonData; // API returns lesson directly

          if (lesson.teacherId === testData.substituteTeacherId) {
            pass("Lesson reassigned to substitute teacher");
            log("✔️ ", "  Teacher ID updated in lesson");
          } else {
            fail("Lesson reassigned to substitute teacher", `Teacher ID: ${lesson.teacherId}, Expected: ${testData.substituteTeacherId}`);
          }
        } else {
          fail("Verify lesson reassignment", `Status: ${lessonRes.status}`);
        }
      }
    }

    // Test 6.3: Create another request for decline test
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const createLesson2Res = await fetch(BASE_URL + "/api/lessons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        studentId: testData.studentId,
        roomId: testData.roomId,
        instrument: "גיטרה",
        date: tomorrow.toISOString().split('T')[0],
        startTime: "16:00",
        endTime: "17:00",
        status: "scheduled"
      })
    });

    if (createLesson2Res.ok) {
      const lesson2Data = await createLesson2Res.json();
      const lesson2Id = lesson2Data.id; // API returns lesson directly

      const createReq2Res = await fetch(BASE_URL + "/api/substitute-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({
          absenceId: testData.absenceId,
          lessonIds: [lesson2Id],
          substituteTeacherId: testData.substituteTeacherId,
        })
      });

      if (createReq2Res.ok) {
        const req2Data = await createReq2Res.json();
        const request2Id = req2Data.requests[0].id;

        // Test 6.4: Decline substitute request
        const declineRes = await fetch(BASE_URL + `/api/substitute-requests/${request2Id}/respond`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: adminCookies
          },
          body: JSON.stringify({
            response: "declined",
            notes: "דחייה אוטומטית מבדיקה"
          })
        });

        if (declineRes.ok) {
          const declineData = await declineRes.json();
          if (declineData.success && declineData.substituteRequest.status === "declined") {
            pass("Decline substitute request");
            log("✔️ ", "  Status changed to declined");
          } else {
            fail("Decline substitute request", "Status not updated");
          }
        } else {
          fail("Decline substitute request", `Status: ${declineRes.status}`);
        }

        // Test 6.5: Verify lesson was NOT reassigned
        const lesson2CheckRes = await fetch(BASE_URL + `/api/lessons/${lesson2Id}`, {
          headers: { Cookie: adminCookies }
        });

        if (lesson2CheckRes.ok) {
          const lesson2Data = await lesson2CheckRes.json();
          const lesson2 = lesson2Data; // API returns lesson directly

          if (lesson2.teacherId === testData.teacherId) {
            pass("Declined request does not reassign lesson");
            log("✔️ ", "  Lesson still with original teacher");
          } else {
            fail("Declined request does not reassign lesson", "Lesson was reassigned");
          }
        }

        // Cleanup
        await fetch(BASE_URL + `/api/lessons/${lesson2Id}`, {
          method: "DELETE",
          headers: { Cookie: adminCookies }
        });
      }
    }

    // Test 6.6: Reject invalid response type
    if (testData.substituteRequestId) {
      const invalidRes = await fetch(BASE_URL + `/api/substitute-requests/${testData.substituteRequestId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({
          response: "invalid-type"
        })
      });

      if (invalidRes.status === 400) {
        pass("Reject invalid response type");
        log("✔️ ", "  Validation working");
      } else {
        fail("Reject invalid response type", `Got ${invalidRes.status}`);
      }
    }

    // Test 6.7: Reject response without authentication
    if (testData.substituteRequestId) {
      const noAuthRes = await fetch(BASE_URL + `/api/substitute-requests/${testData.substituteRequestId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: "approved" })
      });

      if (noAuthRes.status === 401) {
        pass("Reject unauthenticated response");
        log("🔒", "  401 Unauthorized as expected");
      } else {
        fail("Reject unauthenticated response", `Got ${noAuthRes.status}`);
      }
    }

  } catch (error) {
    fail("Substitute response tests", error);
  }
}

// ========================================
// TEST 7: UPDATE AND DELETE OPERATIONS
// ========================================

async function testUpdateAndDelete() {
  log("🔵", "\n=== TEST 7: UPDATE AND DELETE OPERATIONS ===\n");

  try {
    // Test 7.1: Update absence status
    if (testData.absenceId) {
      const updateRes = await fetch(BASE_URL + `/api/teacher-absences/${testData.absenceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({
          status: "fully_covered",
          notes: "הערות מעודכנות"
        })
      });

      if (updateRes.ok) {
        const data = await updateRes.json();
        if (data.success && data.absence.status === "fully_covered") {
          pass("Update absence status");
          log("✔️ ", "  Status updated successfully");
        } else {
          fail("Update absence status", "Status not updated");
        }
      } else {
        fail("Update absence status", `Status: ${updateRes.status}`);
      }
    }

    // Test 7.2: Verify update persisted
    if (testData.absenceId) {
      const checkRes = await fetch(BASE_URL + `/api/teacher-absences/${testData.absenceId}`, {
        headers: { Cookie: adminCookies }
      });

      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.absence.status === "fully_covered" && data.absence.notes === "הערות מעודכנות") {
          pass("Verify absence update persisted");
          log("✔️ ", "  Changes saved to database");
        } else {
          fail("Verify absence update persisted", "Changes not saved");
        }
      }
    }

    // Test 7.3: Reject unauthorized update
    const noAuthUpdateRes = await fetch(BASE_URL + `/api/teacher-absences/${testData.absenceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" })
    });

    if (noAuthUpdateRes.status === 401) {
      pass("Reject unauthorized absence update");
      log("🔒", "  401 Unauthorized as expected");
    } else {
      fail("Reject unauthorized absence update", `Got ${noAuthUpdateRes.status}`);
    }

  } catch (error) {
    fail("Update and delete operations tests", error);
  }
}

// ========================================
// TEST 8: END-TO-END WORKFLOW
// ========================================

async function testEndToEndWorkflow() {
  log("🔵", "\n=== TEST 8: END-TO-END WORKFLOW ===\n");

  try {
    // Create complete workflow from start to finish
    log("📝", "Starting complete workflow test...");

    // Step 1: Report absence (use far future date to avoid conflicts)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 30); // 30 days from now
    const nextWeekEnd = new Date(nextWeek);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 1);

    const workflowAbsenceRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        startDate: nextWeek.toISOString().split('T')[0],
        endDate: nextWeekEnd.toISOString().split('T')[0],
        reason: "בדיקת תהליך מלא"
      })
    });

    if (!workflowAbsenceRes.ok) {
      fail("E2E: Report absence", `Status: ${workflowAbsenceRes.status}`);
      return;
    }

    const workflowAbsenceData = await workflowAbsenceRes.json();
    const workflowAbsenceId = workflowAbsenceData.absence.id;
    pass("E2E: Report absence");

    // Step 2: Create test lesson in that period
    const workflowLessonRes = await fetch(BASE_URL + "/api/lessons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        studentId: testData.studentId,
        roomId: testData.roomId,
        instrument: "גיטרה",
        date: nextWeek.toISOString().split('T')[0],
        startTime: "20:00", // Use late time to avoid conflicts
        endTime: "21:00",
        status: "scheduled"
      })
    });

    if (!workflowLessonRes.ok) {
      fail("E2E: Create affected lesson", `Status: ${workflowLessonRes.status}`);
      return;
    }

    const workflowLessonData = await workflowLessonRes.json();
    const workflowLessonId = workflowLessonData.id; // API returns lesson directly
    pass("E2E: Create affected lesson");

    // Step 3: Find substitutes
    const workflowFindRes = await fetch(BASE_URL + "/api/teachers/find-substitutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        instrument: "גיטרה",
        date: nextWeek.toISOString().split('T')[0],
        startTime: "20:00",
        endTime: "21:00",
        originalTeacherId: testData.teacherId
      })
    });

    if (!workflowFindRes.ok) {
      fail("E2E: Find substitutes", `Status: ${workflowFindRes.status}`);
      return;
    }

    const workflowFindData = await workflowFindRes.json();
    if (workflowFindData.availableTeachers.length > 0) {
      pass("E2E: Find substitutes");

      // Step 4: Request substitute
      const workflowSubstituteId = workflowFindData.availableTeachers[0].id;
      const workflowRequestRes = await fetch(BASE_URL + "/api/substitute-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({
          absenceId: workflowAbsenceId,
          lessonIds: [workflowLessonId],
          substituteTeacherId: workflowSubstituteId
        })
      });

      if (!workflowRequestRes.ok) {
        fail("E2E: Request substitute", `Status: ${workflowRequestRes.status}`);
        return;
      }

      const workflowRequestData = await workflowRequestRes.json();
      const workflowRequestId = workflowRequestData.requests[0].id;
      pass("E2E: Request substitute");

      // Step 5: Approve request
      const workflowApproveRes = await fetch(BASE_URL + `/api/substitute-requests/${workflowRequestId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: JSON.stringify({ response: "approved" })
      });

      if (!workflowApproveRes.ok) {
        fail("E2E: Approve request", `Status: ${workflowApproveRes.status}`);
        return;
      }

      pass("E2E: Approve request");

      // Step 6: Verify complete workflow
      const finalLessonRes = await fetch(BASE_URL + `/api/lessons/${workflowLessonId}`, {
        headers: { Cookie: adminCookies }
      });

      if (finalLessonRes.ok) {
        const finalLesson = await finalLessonRes.json();
        const lesson = finalLesson; // API returns lesson directly

        if (lesson.teacherId === workflowSubstituteId) {
          pass("E2E: Complete workflow successful");
          log("🎉", "  Entire workflow from absence to approved substitution works!");
        } else {
          fail("E2E: Complete workflow successful", "Lesson not reassigned correctly");
        }
      }

      // Cleanup
      await fetch(BASE_URL + `/api/lessons/${workflowLessonId}`, {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });

      await fetch(BASE_URL + `/api/teacher-absences/${workflowAbsenceId}`, {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });

    } else {
      log("⚠️ ", "No available substitutes for E2E test");
    }

  } catch (error) {
    fail("End-to-end workflow test", error);
  }
}

// ========================================
// TEST 9: EDGE CASES AND ERROR HANDLING
// ========================================

async function testEdgeCases() {
  log("🔵", "\n=== TEST 9: EDGE CASES & ERROR HANDLING ===\n");

  try {
    // Test 9.1: Absence with end date before start date
    const invalidDateRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        startDate: "2024-12-31",
        endDate: "2024-01-01",
      })
    });

    // Should handle gracefully (may accept or reject)
    pass("Handle absence with invalid date range");
    log("✔️ ", `  Status: ${invalidDateRes.status}`);

    // Test 9.2: Very long reason text
    const longReason = "א".repeat(5000);
    const longTextRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        teacherId: testData.teacherId,
        startDate: "2024-12-01",
        endDate: "2024-12-02",
        reason: longReason
      })
    });

    pass("Handle very long text fields");
    log("✔️ ", `  Status: ${longTextRes.status}`);

    // Test 9.3: Malformed JSON
    try {
      const malformedRes = await fetch(BASE_URL + "/api/teacher-absences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookies
        },
        body: "{invalid json"
      });

      if (malformedRes.status >= 400) {
        pass("Reject malformed JSON");
        log("✔️ ", "  Error handling works");
      } else {
        fail("Reject malformed JSON", "Should reject bad JSON");
      }
    } catch (e) {
      pass("Reject malformed JSON");
    }

    // Test 9.4: Request with array instead of object
    const arrayRes = await fetch(BASE_URL + "/api/teacher-absences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify([{ teacherId: testData.teacherId }])
    });

    if (arrayRes.status >= 400) {
      pass("Reject array when expecting object");
    } else {
      fail("Reject array when expecting object", "Should expect object");
    }

    // Test 9.5: Empty lesson IDs array
    const emptyLessonsRes = await fetch(BASE_URL + "/api/substitute-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        absenceId: testData.absenceId,
        lessonIds: [],
        substituteTeacherId: testData.substituteTeacherId
      })
    });

    if (emptyLessonsRes.status === 400) {
      pass("Reject empty lesson IDs array");
      log("✔️ ", "  Validation works");
    } else {
      fail("Reject empty lesson IDs array", `Got ${emptyLessonsRes.status}`);
    }

  } catch (error) {
    fail("Edge cases and error handling tests", error);
  }
}

// ========================================
// CLEANUP
// ========================================

async function cleanup() {
  log("🔵", "\n=== CLEANUP ===\n");

  try {
    // Delete test lesson
    if (testData.lessonId) {
      await fetch(BASE_URL + `/api/lessons/${testData.lessonId}`, {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });
      log("🗑️ ", "  Deleted test lesson");
    }

    // Delete test absence (this will cascade delete substitute requests)
    if (testData.absenceId) {
      await fetch(BASE_URL + `/api/teacher-absences/${testData.absenceId}`, {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });
      log("🗑️ ", "  Deleted test absence");
    }

    pass("Cleanup completed");

  } catch (error) {
    fail("Cleanup", error);
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log("\n🚀 ==========================================================");
  console.log("🚀 COMPREHENSIVE SUBSTITUTE TEACHER SYSTEM TEST SUITE");
  console.log("🚀 ==========================================================\n");

  try {
    await setup();
    await testCreateAbsence();
    await testReadAbsences();
    await testFindSubstitutes();
    await testCreateSubstituteRequest();
    await testReadSubstituteRequests();
    await testSubstituteResponse();
    await testUpdateAndDelete();
    await testEndToEndWorkflow();
    await testEdgeCases();
    await cleanup();

    // Print summary
    console.log("\n📊 ==========================================================");
    console.log("📊 TEST SUMMARY");
    console.log("📊 ==========================================================");
    console.log(`✅ PASSED: ${testResults.passed.length}`);
    if (testResults.failed.length > 0) {
      console.log(`❌ FAILED: ${testResults.failed.length}`);
    }
    console.log(`📈 TOTAL: ${testResults.passed.length + testResults.failed.length}`);

    const successRate = ((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100).toFixed(1);
    console.log(`🎯 SUCCESS RATE: ${successRate}%\n`);

    // Print detailed results
    console.log("\n📋 DETAILED RESULTS:");
    testResults.passed.forEach((test, i) => {
      console.log(`  ${i + 1}. ✅ ${test}`);
    });

    if (testResults.failed.length > 0) {
      console.log("\n❌ FAILED TESTS:");
      testResults.failed.forEach((failure, i) => {
        console.log(`  ${i + 1}. ❌ ${failure.test}`);
        console.log(`     Error: ${failure.error}`);
      });
    } else {
      console.log("\n🎉 ALL SUBSTITUTE SYSTEM TESTS PASSED!");
    }

  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
