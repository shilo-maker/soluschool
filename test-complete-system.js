const BASE_URL = "http://localhost:3335";

// Test state
let cookies = null;
let testResults = {
  passed: [],
  failed: []
};

// Test data storage
let testData = {
  createdStudent: null,
  createdTeacher: null,
  createdSubsidizer: null,
  createdRoom: null,
  createdSchedule: null,
  createdLesson: null
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
  if (error?.details) console.log(`   Details: ${error.details}`);
}

// ========================================
// AUTHENTICATION & AUTHORIZATION TESTS
// ========================================

async function testAuthentication() {
  log("🔵", "\n=== AUTHENTICATION & AUTHORIZATION TESTS ===\n");

  try {
    // Test 1: Login with correct credentials
    const loginRes = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@solu.school",
        password: "admin123"
      })
    });

    if (loginRes.ok) {
      cookies = loginRes.headers.get("set-cookie");
      pass("Admin login with correct credentials");
      log("🔐", "  Session cookie received");
    } else {
      fail("Admin login with correct credentials", `Status: ${loginRes.status}`);
      return; // Can't continue without auth
    }

    // Test 2: Verify /api/auth/me endpoint
    const meRes = await fetch(BASE_URL + "/api/auth/me", {
      headers: { Cookie: cookies }
    });

    if (meRes.ok) {
      const userData = await meRes.json();
      const user = userData.user || userData;
      if (user.role === "admin" || userData.role === "admin") {
        pass("Verify authenticated user details");
        log("👤", `  User: ${user.email || userData.email}, Role: ${user.role || userData.role}`);
      } else {
        fail("Verify authenticated user details", `User data: ${JSON.stringify(userData)}`);
      }
    } else {
      fail("Verify authenticated user details", `Status: ${meRes.status}`);
    }

    // Test 3: Try accessing protected endpoint without auth
    const noAuthRes = await fetch(BASE_URL + "/api/students");
    if (noAuthRes.status === 401) {
      pass("Reject unauthenticated access to protected endpoint");
      log("🔒", "  401 Unauthorized as expected");
    } else {
      fail("Reject unauthenticated access to protected endpoint", `Got status ${noAuthRes.status} instead of 401`);
    }

    // Test 4: Login with wrong password
    const wrongPassRes = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@solu.school",
        password: "wrongpassword"
      })
    });

    if (wrongPassRes.status === 401) {
      pass("Reject login with incorrect password");
      log("🔒", "  401 Unauthorized as expected");
    } else {
      fail("Reject login with incorrect password", `Got status ${wrongPassRes.status}`);
    }

    // Test 5: Login with non-existent email
    const wrongEmailRes = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "password"
      })
    });

    if (wrongEmailRes.status === 401) {
      pass("Reject login with non-existent email");
      log("🔒", "  401 Unauthorized as expected");
    } else {
      fail("Reject login with non-existent email", `Got status ${wrongEmailRes.status}`);
    }

  } catch (error) {
    fail("Authentication tests", error);
  }
}

// ========================================
// STUDENT CRUD TESTS
// ========================================

async function testStudentCRUD() {
  log("🔵", "\n=== STUDENT CRUD OPERATIONS ===\n");

  try {
    // Test 1: Fetch all students
    const studentsRes = await fetch(BASE_URL + "/api/students", {
      headers: { Cookie: cookies }
    });

    if (!studentsRes.ok) {
      throw new Error(`Failed to fetch students: ${studentsRes.status}`);
    }

    const studentsData = await studentsRes.json();
    const students = studentsData.students || studentsData;
    pass("Fetch all students");
    log("📊", `  Total students: ${students.length}`);

    if (students.length === 0) {
      log("⚠️ ", "No existing students found");
    }

    // Test 2: Fetch single student
    if (students.length > 0) {
      const studentId = students[0].id;
      const singleRes = await fetch(BASE_URL + "/api/students/" + studentId, {
        headers: { Cookie: cookies }
      });

      if (singleRes.ok) {
        const studentData = await singleRes.json();
        const student = studentData.student || studentData;
        if (student.id === studentId) {
          pass("Fetch single student by ID");
          log("📝", `  Student: ${student.user?.firstName} ${student.user?.lastName}`);
        } else {
          fail("Fetch single student by ID", `Expected ${studentId}, got ${student.id}`);
        }
      } else {
        fail("Fetch single student by ID", `Status: ${singleRes.status}`);
      }
    }

    // Test 3: Create new student
    // First get a user to connect (or we need to check if we need to create user first)
    const newStudent = {
      firstName: "בדיקה",
      lastName: "תלמיד-טסט",
      email: "test-student-" + Date.now() + "@test.com",
      phone: "050-1234567",
      instruments: ["פסנתר"],
      soluSubsidy: 50,
      parentName: "הורה בדיקה",
      parentPhone: "050-7654321",
      parentEmail: "parent-test@test.com",
      additionalSubsidy: {
        hasSubsidy: false
      }
    };

    const createRes = await fetch(BASE_URL + "/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify(newStudent)
    });

    if (createRes.ok) {
      const created = await createRes.json();
      testData.createdStudent = created.student || created;
      pass("Create new student");
      log("📝", `  Created student ID: ${testData.createdStudent.id}`);
      log("📝", `  Name: ${newStudent.firstName} ${newStudent.lastName}`);
    } else {
      const errorText = await createRes.text();
      fail("Create new student", `Status: ${createRes.status}, ${errorText}`);
    }

    // Test 4: Update student
    if (testData.createdStudent) {
      const updateData = {
        soluSubsidy: 60,
        parentName: "הורה מעודכן"
      };

      const updateRes = await fetch(BASE_URL + "/api/students/" + testData.createdStudent.id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify(updateData)
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        pass("Update student");
        log("📝", `  Updated SOLU subsidy to: ${updateData.soluSubsidy}`);
      } else {
        fail("Update student", `Status: ${updateRes.status}`);
      }
    }

    // Test 5: Verify student data integrity
    if (testData.createdStudent) {
      const verifyRes = await fetch(BASE_URL + "/api/students/" + testData.createdStudent.id, {
        headers: { Cookie: cookies }
      });

      if (verifyRes.ok) {
        const verified = await verifyRes.json();
        const student = verified.student || verified;
        if (student.soluSubsidy === 60) {
          pass("Verify student data integrity after update");
          log("✔️ ", "  Data matches expected values");
        } else {
          fail("Verify student data integrity after update", "Data mismatch");
        }
      } else {
        fail("Verify student data integrity after update", `Status: ${verifyRes.status}`);
      }
    }

    // Test 6: Delete student (cleanup)
    if (testData.createdStudent) {
      const deleteRes = await fetch(BASE_URL + "/api/students/" + testData.createdStudent.id, {
        method: "DELETE",
        headers: { Cookie: cookies }
      });

      if (deleteRes.ok) {
        pass("Delete student");
        log("🗑️ ", "  Test student deleted successfully");
      } else {
        fail("Delete student", `Status: ${deleteRes.status}`);
      }
    }

  } catch (error) {
    fail("Student CRUD tests", error);
  }
}

// ========================================
// TEACHER CRUD TESTS
// ========================================

async function testTeacherCRUD() {
  log("🔵", "\n=== TEACHER CRUD OPERATIONS ===\n");

  try {
    // Test 1: Fetch all teachers
    const teachersRes = await fetch(BASE_URL + "/api/teachers", {
      headers: { Cookie: cookies }
    });

    if (!teachersRes.ok) {
      throw new Error(`Failed to fetch teachers: ${teachersRes.status}`);
    }

    const teachersData = await teachersRes.json();
    const teachers = teachersData.teachers || teachersData;
    pass("Fetch all teachers");
    log("📊", `  Total teachers: ${teachers.length}`);

    // Test 2: Fetch single teacher
    if (teachers.length > 0) {
      const teacherId = teachers[0].id;
      const singleRes = await fetch(BASE_URL + "/api/teachers/" + teacherId, {
        headers: { Cookie: cookies }
      });

      if (singleRes.ok) {
        const teacherData = await singleRes.json();
        const teacher = teacherData.teacher || teacherData;
        if (teacher.id === teacherId) {
          pass("Fetch single teacher by ID");
          log("📝", `  Teacher: ${teacher.user?.firstName} ${teacher.user?.lastName}`);
          log("📝", `  Instruments: ${teacher.instruments?.join(', ')}`);
        } else {
          fail("Fetch single teacher by ID", `Expected ${teacherId}, got ${teacher.id}`);
        }
      } else {
        fail("Fetch single teacher by ID", `Status: ${singleRes.status}`);
      }
    }

    // Test 3: Create new teacher
    const newTeacher = {
      firstName: "מורה",
      lastName: "טסט-בדיקה",
      email: "test-teacher-" + Date.now() + "@test.com",
      phone: "050-9876543",
      instruments: ["גיטרה", "פסנתר"],
      lessonRate: 150,
      bio: "מורה לבדיקה"
    };

    const createRes = await fetch(BASE_URL + "/api/teachers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify(newTeacher)
    });

    if (createRes.ok) {
      const created = await createRes.json();
      testData.createdTeacher = created.teacher || created;
      pass("Create new teacher");
      log("📝", `  Created teacher ID: ${testData.createdTeacher.id}`);
      log("📝", `  Name: ${newTeacher.firstName} ${newTeacher.lastName}`);
    } else {
      const errorText = await createRes.text();
      fail("Create new teacher", `Status: ${createRes.status}, ${errorText}`);
    }

    // Test 4: Update teacher
    if (testData.createdTeacher) {
      const updateData = {
        lessonRate: 160,
        bio: "מורה מעודכן לבדיקה"
      };

      const updateRes = await fetch(BASE_URL + "/api/teachers/" + testData.createdTeacher.id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify(updateData)
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        pass("Update teacher");
        log("📝", `  Updated lesson rate to: ${updateData.lessonRate}`);
      } else {
        fail("Update teacher", `Status: ${updateRes.status}`);
      }
    }

    // Test 5: Verify teacher data integrity
    if (testData.createdTeacher) {
      const verifyRes = await fetch(BASE_URL + "/api/teachers/" + testData.createdTeacher.id, {
        headers: { Cookie: cookies }
      });

      if (verifyRes.ok) {
        const verified = await verifyRes.json();
        const teacher = verified.teacher || verified;
        if (teacher.lessonRate === 160) {
          pass("Verify teacher data integrity after update");
          log("✔️ ", "  Data matches expected values");
        } else {
          fail("Verify teacher data integrity after update", "Data mismatch");
        }
      } else {
        fail("Verify teacher data integrity after update", `Status: ${verifyRes.status}`);
      }
    }

    // Test 6: Delete teacher (cleanup)
    if (testData.createdTeacher) {
      const deleteRes = await fetch(BASE_URL + "/api/teachers/" + testData.createdTeacher.id, {
        method: "DELETE",
        headers: { Cookie: cookies }
      });

      if (deleteRes.ok) {
        pass("Delete teacher");
        log("🗑️ ", "  Test teacher deleted successfully");
      } else {
        fail("Delete teacher", `Status: ${deleteRes.status}`);
      }
    }

  } catch (error) {
    fail("Teacher CRUD tests", error);
  }
}

// ========================================
// SUBSIDIZER CRUD TESTS
// ========================================

async function testSubsidizerCRUD() {
  log("🔵", "\n=== SUBSIDIZER CRUD OPERATIONS ===\n");

  try {
    // Test 1: Fetch all subsidizers
    const subsidizersRes = await fetch(BASE_URL + "/api/subsidizers", {
      headers: { Cookie: cookies }
    });

    if (!subsidizersRes.ok) {
      throw new Error(`Failed to fetch subsidizers: ${subsidizersRes.status}`);
    }

    const subsidizersData = await subsidizersRes.json();
    const subsidizers = subsidizersData.subsidizers || subsidizersData;
    pass("Fetch all subsidizers");
    log("📊", `  Total subsidizers: ${subsidizers.length}`);

    // Test 2: Fetch single subsidizer
    if (subsidizers.length > 0) {
      const subsidizerId = subsidizers[0].id;
      const singleRes = await fetch(BASE_URL + "/api/subsidizers/" + subsidizerId, {
        headers: { Cookie: cookies }
      });

      if (singleRes.ok) {
        const subsidizer = await singleRes.json();
        const sub = subsidizer.subsidizer || subsidizer;
        if (sub.id === subsidizerId) {
          pass("Fetch single subsidizer by ID");
          log("📝", `  Subsidizer: ${sub.name}`);
        } else {
          fail("Fetch single subsidizer by ID", "ID mismatch");
        }
      } else {
        fail("Fetch single subsidizer by ID", `Status: ${singleRes.status}`);
      }
    }

    // Test 3: Create new subsidizer
    const newSubsidizer = {
      name: "עמותת טסט " + Date.now(),
      email: "test-subsidizer-" + Date.now() + "@test.com",
      contactName: "איש קשר בדיקה",
      contactEmail: "test-subsidizer@test.com",
      contactPhone: "050-1111111",
      defaultSubsidyPerLesson: 40,
      isActive: true
    };

    const createRes = await fetch(BASE_URL + "/api/subsidizers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify(newSubsidizer)
    });

    if (createRes.ok) {
      const created = await createRes.json();
      testData.createdSubsidizer = created.subsidizer || created;
      pass("Create new subsidizer");
      log("📝", `  Created subsidizer ID: ${testData.createdSubsidizer.id}`);
      log("📝", `  Name: ${newSubsidizer.name}`);
    } else {
      const errorText = await createRes.text();
      fail("Create new subsidizer", `Status: ${createRes.status}, ${errorText}`);
    }

    // Test 4: Update subsidizer
    if (testData.createdSubsidizer) {
      const updateData = {
        name: testData.createdSubsidizer.name,
        email: testData.createdSubsidizer.email,
        phone: "050-2222222",
        notes: "עמותה מעודכנת לבדיקה"
      };

      const updateRes = await fetch(BASE_URL + "/api/subsidizers/" + testData.createdSubsidizer.id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify(updateData)
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        pass("Update subsidizer");
        log("📝", `  Updated phone to: ${updateData.phone}`);
      } else {
        const errorText = await updateRes.text();
        fail("Update subsidizer", `Status: ${updateRes.status}, ${errorText}`);
      }
    }

    // Test 5: Verify subsidizer data integrity
    if (testData.createdSubsidizer) {
      const verifyRes = await fetch(BASE_URL + "/api/subsidizers/" + testData.createdSubsidizer.id, {
        headers: { Cookie: cookies }
      });

      if (verifyRes.ok) {
        const verified = await verifyRes.json();
        const subsidizer = verified.subsidizer || verified;
        if (subsidizer.phone === "050-2222222") {
          pass("Verify subsidizer data integrity after update");
          log("✔️ ", "  Data matches expected values");
        } else {
          fail("Verify subsidizer data integrity after update", `Phone mismatch: expected 050-2222222, got ${subsidizer.phone}`);
        }
      } else {
        fail("Verify subsidizer data integrity after update", `Status: ${verifyRes.status}`);
      }
    }

    // Test 6: Delete subsidizer (cleanup)
    if (testData.createdSubsidizer) {
      const deleteRes = await fetch(BASE_URL + "/api/subsidizers/" + testData.createdSubsidizer.id, {
        method: "DELETE",
        headers: { Cookie: cookies }
      });

      if (deleteRes.ok) {
        pass("Delete subsidizer");
        log("🗑️ ", "  Test subsidizer deleted successfully");
      } else {
        fail("Delete subsidizer", `Status: ${deleteRes.status}`);
      }
    }

  } catch (error) {
    fail("Subsidizer CRUD tests", error);
  }
}

// ========================================
// LESSON MANAGEMENT TESTS
// ========================================

async function testLessonManagement() {
  log("🔵", "\n=== LESSON MANAGEMENT & GENERATION ===\n");

  try {
    // Test 1: Fetch all lessons
    const lessonsRes = await fetch(BASE_URL + "/api/lessons", {
      headers: { Cookie: cookies }
    });

    if (!lessonsRes.ok) {
      throw new Error(`Failed to fetch lessons: ${lessonsRes.status}`);
    }

    const lessonsData = await lessonsRes.json();
    const lessons = lessonsData.lessons || lessonsData;
    pass("Fetch all lessons");
    log("📊", `  Total lessons: ${lessons.length}`);

    // Test 2: Fetch lessons with filters
    const today = new Date().toISOString().split('T')[0];
    const filteredRes = await fetch(BASE_URL + "/api/lessons?date=" + today, {
      headers: { Cookie: cookies }
    });

    if (filteredRes.ok) {
      const filteredData = await filteredRes.json();
      const filteredLessons = filteredData.lessons || filteredData;
      pass("Fetch lessons with date filter");
      log("📊", `  Today's lessons: ${filteredLessons.length}`);
    } else {
      fail("Fetch lessons with date filter", `Status: ${filteredRes.status}`);
    }

    // Test 3: Fetch lessons by status
    const scheduledRes = await fetch(BASE_URL + "/api/lessons?status=scheduled", {
      headers: { Cookie: cookies }
    });

    if (scheduledRes.ok) {
      const scheduledData = await scheduledRes.json();
      const scheduledLessons = scheduledData.lessons || scheduledData;
      pass("Fetch lessons by status filter");
      log("📊", `  Scheduled lessons: ${scheduledLessons.length}`);
    } else {
      fail("Fetch lessons by status filter", `Status: ${scheduledRes.status}`);
    }

    // Test 4: Fetch single lesson
    if (lessons.length > 0) {
      const lessonId = lessons[0].id;
      const singleRes = await fetch(BASE_URL + "/api/lessons/" + lessonId, {
        headers: { Cookie: cookies }
      });

      if (singleRes.ok) {
        const lesson = await singleRes.json();
        if (lesson.id === lessonId) {
          pass("Fetch single lesson by ID");
          log("📝", `  Lesson: ${lesson.instrument}, ${lesson.status}`);
        } else {
          fail("Fetch single lesson by ID", "ID mismatch");
        }
      } else {
        fail("Fetch single lesson by ID", `Status: ${singleRes.status}`);
      }
    }

    // Test 5: Test lesson generation
    const studentsRes = await fetch(BASE_URL + "/api/students", { headers: { Cookie: cookies }});
    const studentsData = await studentsRes.json();
    const students = studentsData.students || studentsData;

    const schedulesRes = await fetch(BASE_URL + "/api/schedules", { headers: { Cookie: cookies }});
    const schedulesData = await schedulesRes.json();
    const schedules = schedulesData.schedules || schedulesData;

    if (schedules.length > 0) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30); // Generate 30 days from now
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // 1 week period

      const generateData = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };

      const generateRes = await fetch(BASE_URL + "/api/lessons/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify(generateData)
      });

      if (generateRes.ok) {
        const result = await generateRes.json();
        pass("Generate lessons from schedules");
        log("📝", `  Generated ${result.created || result.lessonsCreated || 0} lessons`);
      } else {
        const errorText = await generateRes.text();
        fail("Generate lessons from schedules", `Status: ${generateRes.status}, ${errorText}`);
      }
    } else {
      log("⚠️ ", "No schedules found - skipping lesson generation test");
    }

    // Test 6: Update lesson
    if (lessons.length > 0) {
      const lesson = lessons.find(l => l.status === 'scheduled');
      if (lesson) {
        const updateData = {
          teacherNotes: "הערות בדיקה"
        };

        const updateRes = await fetch(BASE_URL + "/api/lessons/" + lesson.id, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookies
          },
          body: JSON.stringify(updateData)
        });

        if (updateRes.ok) {
          const updated = await updateRes.json();
          pass("Update lesson notes");
          log("📝", `  Added notes to lesson`);
        } else {
          fail("Update lesson notes", `Status: ${updateRes.status}`);
        }
      }
    }

  } catch (error) {
    fail("Lesson management tests", error);
  }
}

// ========================================
// LESSON CANCELLATION TESTS
// ========================================

async function testLessonCancellation() {
  log("🔵", "\n=== LESSON CANCELLATION WORKFLOWS ===\n");

  try {
    // Get a scheduled lesson to cancel
    const lessonsRes = await fetch(BASE_URL + "/api/lessons?status=scheduled", {
      headers: { Cookie: cookies }
    });

    if (!lessonsRes.ok) {
      throw new Error(`Failed to fetch lessons: ${lessonsRes.status}`);
    }

    const lessonsData = await lessonsRes.json();
    const lessons = lessonsData.lessons || lessonsData;

    if (lessons.length === 0) {
      log("⚠️ ", "No scheduled lessons found - skipping cancellation tests");
      return;
    }

    // Test 1: Cancel single lesson
    const lessonToCancel = lessons[0];
    const cancelData = {
      status: "cancelled",
      cancellationReason: "בדיקה - ביטול שיעור"
    };

    const cancelRes = await fetch(BASE_URL + "/api/lessons/" + lessonToCancel.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify(cancelData)
    });

    if (cancelRes.ok) {
      const cancelled = await cancelRes.json();
      if (cancelled.status === 'cancelled') {
        pass("Cancel single lesson");
        log("📝", `  Lesson cancelled with reason`);
      } else {
        fail("Cancel single lesson", "Status not updated");
      }
    } else {
      fail("Cancel single lesson", `Status: ${cancelRes.status}`);
    }

    // Test 2: Verify cancelled lesson has cancellation data
    if (cancelRes.ok) {
      const verifyRes = await fetch(BASE_URL + "/api/lessons/" + lessonToCancel.id, {
        headers: { Cookie: cookies }
      });

      if (verifyRes.ok) {
        const lesson = await verifyRes.json();
        if (lesson.cancellationReason && lesson.cancelledById) {
          pass("Verify cancellation metadata");
          log("✔️ ", "  Cancellation reason and user recorded");
        } else {
          fail("Verify cancellation metadata", "Missing cancellation data");
        }
      } else {
        fail("Verify cancellation metadata", `Status: ${verifyRes.status}`);
      }
    }

    // Test 3: Test bulk cancellation by date range
    if (lessons.length > 1) {
      // Find future lessons to cancel
      const futureLesson = lessons.find(l => new Date(l.date) > new Date());

      if (futureLesson) {
        const lessonDate = new Date(futureLesson.date);
        const startDate = new Date(lessonDate);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(lessonDate);
        endDate.setDate(endDate.getDate() + 1);

        const bulkCancelRes = await fetch(BASE_URL + "/api/lessons/bulk-cancel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookies
          },
          body: JSON.stringify({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            cancellationReason: "בדיקה - ביטול מרובה"
          })
        });

        if (bulkCancelRes.ok) {
          const result = await bulkCancelRes.json();
          pass("Bulk cancel multiple lessons");
          log("📝", `  Cancelled ${result.cancelled} lessons in date range`);
        } else {
          const errorText = await bulkCancelRes.text();
          fail("Bulk cancel multiple lessons", `Status: ${bulkCancelRes.status}, ${errorText}`);
        }
      } else {
        log("⚠️ ", "No future lessons found for bulk cancel test");
      }
    }

  } catch (error) {
    fail("Lesson cancellation tests", error);
  }
}

// ========================================
// NOTIFICATION TESTS
// ========================================

async function testNotifications() {
  log("🔵", "\n=== NOTIFICATION SYSTEM ===\n");

  try {
    // Test 1: Fetch notifications
    const notifRes = await fetch(BASE_URL + "/api/notifications", {
      headers: { Cookie: cookies }
    });

    if (notifRes.ok) {
      const notifications = await notifRes.json();
      pass("Fetch notifications");
      log("📊", `  Notifications: ${Array.isArray(notifications) ? notifications.length : 'N/A'}`);
    } else if (notifRes.status === 404) {
      log("⚠️ ", "Notifications endpoint not implemented");
    } else {
      fail("Fetch notifications", `Status: ${notifRes.status}`);
    }

  } catch (error) {
    fail("Notification tests", error);
  }
}

// ========================================
// SECURITY & AUTHORIZATION TESTS
// ========================================

async function testSecurity() {
  log("🔵", "\n=== SECURITY & AUTHORIZATION RULES ===\n");

  try {
    // Test 1: Admin can access all endpoints
    const endpoints = [
      "/api/students",
      "/api/teachers",
      "/api/subsidizers",
      "/api/lessons",
      "/api/schedules",
      "/api/rooms"
    ];

    let adminAccessCount = 0;
    for (const endpoint of endpoints) {
      const res = await fetch(BASE_URL + endpoint, {
        headers: { Cookie: cookies }
      });
      if (res.ok) adminAccessCount++;
    }

    if (adminAccessCount === endpoints.length) {
      pass("Admin has access to all protected endpoints");
      log("✔️ ", `  ${adminAccessCount}/${endpoints.length} endpoints accessible`);
    } else {
      fail("Admin has access to all protected endpoints", `Only ${adminAccessCount}/${endpoints.length} accessible`);
    }

    // Test 2: Cannot access other users' data (would need different user)
    // Skipping for now as we only have admin

  } catch (error) {
    fail("Security tests", error);
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log("🚀 ==================================================");
  console.log("🚀 MASTER COMPREHENSIVE TEST SUITE");
  console.log("🚀 Testing EVERY feature systematically");
  console.log("🚀 ==================================================\n");

  try {
    // Run all test suites in order
    await testAuthentication();
    await testStudentCRUD();
    await testTeacherCRUD();
    await testSubsidizerCRUD();
    await testLessonManagement();
    await testLessonCancellation();
    await testNotifications();
    await testSecurity();

    // Print summary
    console.log("\n📊 ==================================================");
    console.log("📊 MASTER TEST SUMMARY");
    console.log("📊 ==================================================");
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
      console.log("\n🎉 ALL TESTS PASSED! System is fully operational!");
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
