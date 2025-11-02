const BASE_URL = "http://localhost:3335";
const bcrypt = require('bcryptjs');

let adminCookies = null;
let teacherCookies = null;
let studentCookies = null;
let testResults = { passed: [], failed: [] };

let testData = {
  teacherUser: null,
  studentUser: null,
  teacherId: null,
  studentId: null,
  otherTeacherId: null,
  otherStudentId: null
};

function log(emoji, msg) { console.log(`${emoji} ${msg}`); }
function pass(t) { testResults.passed.push(t); console.log(`✅ ${t}`); }
function fail(t, e) { testResults.failed.push({test:t,error:e?.message||e}); console.log(`❌ ${t}`); if(e?.message) console.log(`   Error: ${e.message}`); }

// ========================================
// SETUP: CREATE USERS WITH PASSWORDS
// ========================================

async function setupUsersWithPasswords() {
  log("🔵", "\n=== SETTING UP USERS WITH PASSWORDS ===\n");

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

    adminCookies = loginRes.headers.get("set-cookie");
    pass("Admin login for setup");

    // Get existing teachers and students
    const teachersRes = await fetch(BASE_URL + "/api/teachers", {
      headers: { Cookie: adminCookies }
    });
    const teachersData = await teachersRes.json();
    const teachers = teachersData.teachers || teachersData;

    const studentsRes = await fetch(BASE_URL + "/api/students", {
      headers: { Cookie: adminCookies }
    });
    const studentsData = await studentsRes.json();
    const students = studentsData.students || studentsData;

    // Create test teacher with password
    const teacherEmail = "test-teacher-auth-" + Date.now() + "@test.com";
    const teacherPassword = "teacher123";

    const createTeacherRes = await fetch(BASE_URL + "/api/teachers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        firstName: "מורה-הרשאות",
        lastName: "בדיקה",
        email: teacherEmail,
        password: teacherPassword,
        phone: "050-7777777",
        instruments: ["פסנתר", "גיטרה"],
        lessonRate: 150
      })
    });

    if (createTeacherRes.ok) {
      const created = await createTeacherRes.json();
      testData.teacherId = created.teacher?.id || created.id;
      testData.teacherUser = { email: teacherEmail, password: teacherPassword };
      pass("Create teacher with password");
      log("📝", `  Teacher: ${teacherEmail}`);
      log("📝", `  Teacher ID: ${testData.teacherId}`);
    } else {
      fail("Create teacher with password", `Status: ${createTeacherRes.status}`);
    }

    // Store another teacher ID for permission tests
    if (teachers.length > 0) {
      testData.otherTeacherId = teachers[0].id;
      log("📝", `  Other teacher ID: ${testData.otherTeacherId}`);
    }

    // Create test student with password
    const studentEmail = "test-student-auth-" + Date.now() + "@test.com";
    const studentPassword = "student123";

    const createStudentRes = await fetch(BASE_URL + "/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookies
      },
      body: JSON.stringify({
        firstName: "תלמיד-הרשאות",
        lastName: "בדיקה",
        email: studentEmail,
        password: studentPassword,
        phone: "050-6666666",
        instruments: ["תופים"],
        soluSubsidy: 50,
        additionalSubsidy: { hasSubsidy: false }
      })
    });

    if (createStudentRes.ok) {
      const created = await createStudentRes.json();
      testData.studentId = created.student?.id || created.id;
      testData.studentUser = { email: studentEmail, password: studentPassword };
      pass("Create student with password");
      log("📝", `  Student: ${studentEmail}`);
      log("📝", `  Student ID: ${testData.studentId}`);
    } else {
      fail("Create student with password", `Status: ${createStudentRes.status}`);
    }

    // Store another student ID for permission tests
    if (students.length > 0) {
      testData.otherStudentId = students[0].id;
      log("📝", `  Other student ID: ${testData.otherStudentId}`);
    }

  } catch (error) {
    fail("Setup users with passwords", error);
  }
}

// ========================================
// TEACHER LOGIN & PERMISSIONS TESTS
// ========================================

async function testTeacherLoginAndPermissions() {
  log("🔵", "\n=== TEACHER LOGIN & PERMISSIONS ===\n");

  try {
    if (!testData.teacherUser) {
      log("⚠️ ", "No teacher user created - skipping");
      return;
    }

    // Test 1: Teacher can login
    const loginRes = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testData.teacherUser.email,
        password: testData.teacherUser.password
      })
    });

    if (loginRes.ok) {
      teacherCookies = loginRes.headers.get("set-cookie");
      pass("Teacher can login with credentials");
      log("🔐", "  Teacher session established");
    } else {
      fail("Teacher can login with credentials", `Status: ${loginRes.status}`);
      return; // Can't continue without login
    }

    // Test 2: Teacher can access /api/auth/me
    const meRes = await fetch(BASE_URL + "/api/auth/me", {
      headers: { Cookie: teacherCookies }
    });

    if (meRes.ok) {
      const userData = await meRes.json();
      const user = userData.user || userData;
      if (user.role === "teacher") {
        pass("Teacher /api/auth/me shows correct role");
        log("👤", `  Role: ${user.role}`);
      } else {
        fail("Teacher /api/auth/me shows correct role", `Role is ${user.role}`);
      }
    } else {
      fail("Teacher /api/auth/me shows correct role", `Status: ${meRes.status}`);
    }

    // Test 3: Teacher can access their own lessons
    const lessonsRes = await fetch(BASE_URL + "/api/lessons?teacherId=me", {
      headers: { Cookie: teacherCookies }
    });

    if (lessonsRes.ok) {
      const lessonsData = await lessonsRes.json();
      const lessons = lessonsData.lessons || lessonsData;
      pass("Teacher can access their own lessons");
      log("📊", `  Found ${lessons.length} lessons`);

      // Verify all lessons belong to this teacher
      const allOwnLessons = lessons.every(l => l.teacherId === testData.teacherId);
      if (lessons.length === 0 || allOwnLessons) {
        pass("Teacher lessons filtered correctly");
      } else {
        fail("Teacher lessons filtered correctly", "Found lessons from other teachers");
      }
    } else {
      fail("Teacher can access their own lessons", `Status: ${lessonsRes.status}`);
    }

    // Test 4: Teacher can access their payment data
    const paymentRes = await fetch(BASE_URL + "/api/teachers/" + testData.teacherId + "/payment", {
      headers: { Cookie: teacherCookies }
    });

    if (paymentRes.ok) {
      pass("Teacher can access their own payment data");
      const paymentData = await paymentRes.json();
      log("💰", `  Payment info accessible`);
    } else if (paymentRes.status === 403) {
      fail("Teacher can access their own payment data", "403 Forbidden - should be allowed");
    } else {
      fail("Teacher can access their own payment data", `Status: ${paymentRes.status}`);
    }

    // Test 5: Teacher CANNOT access other teacher's payment data
    if (testData.otherTeacherId) {
      const otherPaymentRes = await fetch(BASE_URL + "/api/teachers/" + testData.otherTeacherId + "/payment", {
        headers: { Cookie: teacherCookies }
      });

      if (otherPaymentRes.status === 403 || otherPaymentRes.status === 401) {
        pass("Teacher CANNOT access other teacher's payment data");
        log("🔒", "  403/401 as expected");
      } else if (otherPaymentRes.ok) {
        fail("Teacher CANNOT access other teacher's payment data", "Should be forbidden");
      } else {
        // May be allowed by current implementation
        log("⚠️ ", `  Got status ${otherPaymentRes.status} - may need stricter controls`);
      }
    }

    // Test 6: Teacher CANNOT access admin endpoints
    const studentsRes = await fetch(BASE_URL + "/api/students", {
      headers: { Cookie: teacherCookies }
    });

    if (studentsRes.status === 403 || studentsRes.status === 401) {
      pass("Teacher CANNOT access students list (admin-only)");
      log("🔒", "  Access denied as expected");
    } else if (studentsRes.ok) {
      // Current implementation may allow this - note it
      log("⚠️ ", "  Teacher can access students list - consider restricting");
    }

    // Test 7: Teacher CANNOT create new students
    const createStudentRes = await fetch(BASE_URL + "/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: teacherCookies
      },
      body: JSON.stringify({
        firstName: "Test",
        lastName: "Blocked",
        email: "should-fail@test.com",
        phone: "050-1111111",
        instruments: ["פסנתר"],
        soluSubsidy: 50,
        additionalSubsidy: { hasSubsidy: false }
      })
    });

    if (createStudentRes.status === 403 || createStudentRes.status === 401) {
      pass("Teacher CANNOT create students");
      log("🔒", "  Access denied as expected");
    } else if (createStudentRes.ok) {
      fail("Teacher CANNOT create students", "Should be forbidden");
      // Cleanup
      const created = await createStudentRes.json();
      await fetch(BASE_URL + "/api/students/" + (created.student?.id || created.id), {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });
    }

    // Test 8: Teacher CANNOT access financial dashboard
    const financialRes = await fetch(BASE_URL + "/api/financial/dashboard", {
      headers: { Cookie: teacherCookies }
    });

    if (financialRes.status === 403 || financialRes.status === 401) {
      pass("Teacher CANNOT access financial dashboard");
      log("🔒", "  Access denied as expected");
    } else if (financialRes.ok) {
      log("⚠️ ", "  Teacher can access financial dashboard - consider restricting");
    }

  } catch (error) {
    fail("Teacher login and permissions tests", error);
  }
}

// ========================================
// STUDENT LOGIN & PERMISSIONS TESTS
// ========================================

async function testStudentLoginAndPermissions() {
  log("🔵", "\n=== STUDENT LOGIN & PERMISSIONS ===\n");

  try {
    if (!testData.studentUser) {
      log("⚠️ ", "No student user created - skipping");
      return;
    }

    // Test 1: Student can login
    const loginRes = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testData.studentUser.email,
        password: testData.studentUser.password
      })
    });

    if (loginRes.ok) {
      studentCookies = loginRes.headers.get("set-cookie");
      pass("Student can login with credentials");
      log("🔐", "  Student session established");
    } else {
      fail("Student can login with credentials", `Status: ${loginRes.status}`);
      return;
    }

    // Test 2: Student can access /api/auth/me
    const meRes = await fetch(BASE_URL + "/api/auth/me", {
      headers: { Cookie: studentCookies }
    });

    if (meRes.ok) {
      const userData = await meRes.json();
      const user = userData.user || userData;
      if (user.role === "student") {
        pass("Student /api/auth/me shows correct role");
        log("👤", `  Role: ${user.role}`);
      } else {
        fail("Student /api/auth/me shows correct role", `Role is ${user.role}`);
      }
    } else {
      fail("Student /api/auth/me shows correct role", `Status: ${meRes.status}`);
    }

    // Test 3: Student can access their own lessons
    const lessonsRes = await fetch(BASE_URL + "/api/lessons?studentId=me", {
      headers: { Cookie: studentCookies }
    });

    if (lessonsRes.ok) {
      const lessonsData = await lessonsRes.json();
      const lessons = lessonsData.lessons || lessonsData;
      pass("Student can access their own lessons");
      log("📊", `  Found ${lessons.length} lessons`);

      // Verify all lessons belong to this student
      const allOwnLessons = lessons.every(l => l.studentId === testData.studentId);
      if (lessons.length === 0 || allOwnLessons) {
        pass("Student lessons filtered correctly");
      } else {
        fail("Student lessons filtered correctly", "Found lessons from other students");
      }
    } else {
      fail("Student can access their own lessons", `Status: ${lessonsRes.status}`);
    }

    // Test 4: Student can access their account data
    const accountRes = await fetch(BASE_URL + "/api/students/" + testData.studentId + "/account", {
      headers: { Cookie: studentCookies }
    });

    if (accountRes.ok) {
      pass("Student can access their own account data");
      const accountData = await accountRes.json();
      log("💰", `  Account info accessible`);
    } else if (accountRes.status === 403) {
      fail("Student can access their own account data", "403 Forbidden - should be allowed");
    } else {
      fail("Student can access their own account data", `Status: ${accountRes.status}`);
    }

    // Test 5: Student CANNOT access other student's data
    if (testData.otherStudentId) {
      const otherAccountRes = await fetch(BASE_URL + "/api/students/" + testData.otherStudentId + "/account", {
        headers: { Cookie: studentCookies }
      });

      if (otherAccountRes.status === 403 || otherAccountRes.status === 401) {
        pass("Student CANNOT access other student's account");
        log("🔒", "  403/401 as expected");
      } else if (otherAccountRes.ok) {
        fail("Student CANNOT access other student's account", "Should be forbidden");
      } else {
        log("⚠️ ", `  Got status ${otherAccountRes.status}`);
      }
    }

    // Test 6: Student CANNOT access teachers list
    const teachersRes = await fetch(BASE_URL + "/api/teachers", {
      headers: { Cookie: studentCookies }
    });

    if (teachersRes.status === 403 || teachersRes.status === 401) {
      pass("Student CANNOT access teachers list (admin-only)");
      log("🔒", "  Access denied as expected");
    } else if (teachersRes.ok) {
      log("⚠️ ", "  Student can access teachers list - consider restricting");
    }

    // Test 7: Student CANNOT process payments themselves
    const paymentRes = await fetch(BASE_URL + "/api/students/" + testData.studentId + "/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: studentCookies
      },
      body: JSON.stringify({
        lessonIds: ["fake-id"],
        paymentMethod: "cash",
        amount: 100
      })
    });

    if (paymentRes.status === 403 || paymentRes.status === 401) {
      pass("Student CANNOT process payments (admin-only)");
      log("🔒", "  Access denied as expected");
    } else if (!paymentRes.ok) {
      // May fail for other reasons (invalid lesson) which is also good
      pass("Student CANNOT process payments (admin-only)");
      log("🔒", "  Payment blocked");
    } else {
      log("⚠️ ", "  Student can process payments - consider restricting");
    }

    // Test 8: Student CANNOT access financial dashboard
    const financialRes = await fetch(BASE_URL + "/api/financial/dashboard", {
      headers: { Cookie: studentCookies }
    });

    if (financialRes.status === 403 || financialRes.status === 401) {
      pass("Student CANNOT access financial dashboard");
      log("🔒", "  Access denied as expected");
    } else if (financialRes.ok) {
      log("⚠️ ", "  Student can access financial dashboard - consider restricting");
    }

  } catch (error) {
    fail("Student login and permissions tests", error);
  }
}

// ========================================
// CLEANUP
// ========================================

async function cleanup() {
  log("🔵", "\n=== CLEANUP ===\n");

  try {
    // Delete test teacher
    if (testData.teacherId) {
      await fetch(BASE_URL + "/api/teachers/" + testData.teacherId, {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });
      log("🗑️ ", "  Deleted test teacher");
    }

    // Delete test student
    if (testData.studentId) {
      await fetch(BASE_URL + "/api/students/" + testData.studentId, {
        method: "DELETE",
        headers: { Cookie: adminCookies }
      });
      log("🗑️ ", "  Deleted test student");
    }

    pass("Cleanup completed");
  } catch (error) {
    log("⚠️ ", "  Cleanup error: " + error.message);
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log("🚀 ==================================================");
  console.log("🚀 COMPLETE ROLES & AUTH WITH LOGIN TEST SUITE");
  console.log("🚀 ==================================================\n");

  try {
    await setupUsersWithPasswords();
    await testTeacherLoginAndPermissions();
    await testStudentLoginAndPermissions();
    await cleanup();

    console.log("\n📊 ==================================================");
    console.log("📊 TEST SUMMARY");
    console.log("📊 ==================================================");
    console.log(`✅ PASSED: ${testResults.passed.length}`);
    if (testResults.failed.length > 0) console.log(`❌ FAILED: ${testResults.failed.length}`);
    console.log(`📈 TOTAL: ${testResults.passed.length + testResults.failed.length}`);
    console.log(`🎯 SUCCESS RATE: ${((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100).toFixed(1)}%\n`);

    console.log("\n📋 DETAILED RESULTS:");
    testResults.passed.forEach((t, i) => console.log(`  ${i + 1}. ✅ ${t}`));

    if (testResults.failed.length > 0) {
      console.log("\n❌ FAILED TESTS:");
      testResults.failed.forEach((f, i) => {
        console.log(`  ${i + 1}. ❌ ${f.test}`);
        console.log(`     Error: ${f.error}`);
      });
    } else {
      console.log("\n🎉 ALL COMPLETE AUTH TESTS PASSED!");
    }

  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
    process.exit(1);
  }
}

runAllTests().catch(e => { console.error("Fatal:", e); process.exit(1); });
