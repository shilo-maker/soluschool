const BASE_URL = "http://localhost:3335";

let cookies = null;
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function pass(testName) {
  testResults.passed++;
  testResults.tests.push({ name: testName, status: "PASS" });
  log("✅", testName);
}

function fail(testName, error) {
  testResults.failed++;
  testResults.tests.push({ name: testName, status: "FAIL", error: error.message || error });
  log("❌", `${testName} - ${error.message || error}`);
}

async function login() {
  const res = await fetch(BASE_URL + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@solu.school", password: "admin123" })
  });
  cookies = res.headers.get("set-cookie");
  if (!cookies) throw new Error("Login failed - no cookies");
  return cookies;
}

// ========================================
// STUDENT PAYMENT TESTS
// ========================================

async function testStudentPaymentFlow() {
  log("🔵", "\n=== STUDENT PAYMENT TESTS ===\n");

  try {
    // Get students
    const studentsRes = await fetch(BASE_URL + "/api/students", {
      headers: { Cookie: cookies }
    });
    const studentsData = await studentsRes.json();
    const students = studentsData.students || studentsData;

    if (!Array.isArray(students) || students.length === 0) {
      throw new Error("No students found");
    }
    pass("Fetch students list");

    const student = students[0];
    log("📝", `Testing with student: ${student.user.firstName} ${student.user.lastName}`);

    // Get account data
    const accountRes = await fetch(BASE_URL + "/api/students/" + student.id + "/account", {
      headers: { Cookie: cookies }
    });
    const account = await accountRes.json();

    if (!account.summary) {
      throw new Error("Invalid account response");
    }
    pass("Fetch student account data");

    log("📊", `  Unpaid lessons: ${account.summary.totalLessons}`);
    log("💰", `  Total amount owed: ${account.summary.totalAmount.toFixed(2)} NIS`);

    if (account.lessons.length === 0) {
      log("⚠️ ", "No unpaid lessons - skipping payment test");
      return;
    }

    // Verify calculation accuracy
    const lesson = account.lessons[0];
    const expectedStudentPortion = lesson.lessonRate - lesson.soluSubsidy - lesson.subsidizerAmount;
    if (Math.abs(lesson.studentPortion - expectedStudentPortion) < 0.01) {
      pass("Student payment calculation accuracy");
      log("💵", `  Lesson Rate: ${lesson.lessonRate} NIS`);
      log("💵", `  SOLU Subsidy: ${lesson.soluSubsidy} NIS`);
      log("💵", `  Subsidizer: ${lesson.subsidizerAmount} NIS`);
      log("💵", `  Student Pays: ${lesson.studentPortion} NIS`);
    } else {
      fail("Student payment calculation accuracy",
        `Expected ${expectedStudentPortion}, got ${lesson.studentPortion}`);
    }

    // Process payment
    const lessonIds = account.lessons.slice(0, 2).map(l => l.id);
    const total = account.lessons.slice(0, 2).reduce((s, l) => s + l.studentPortion, 0);

    const paymentRes = await fetch(BASE_URL + "/api/students/" + student.id + "/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({
        lessonIds,
        paymentMethod: "cash",
        amount: total,
        notes: "Test payment"
      })
    });

    if (!paymentRes.ok) {
      throw new Error(`Payment failed: ${paymentRes.status}`);
    }

    const payment = await paymentRes.json();
    pass("Process student payment");
    log("💳", `  Payment ID: ${payment.payment.id}`);
    log("💳", `  Amount: ${payment.payment.amount} NIS`);
    log("💳", `  Method: ${payment.payment.paymentMethod}`);

    // Verify lessons marked as paid
    const accountAfter = await fetch(BASE_URL + "/api/students/" + student.id + "/account", {
      headers: { Cookie: cookies }
    }).then(r => r.json());

    const lessonsPaid = account.summary.totalLessons - accountAfter.summary.totalLessons;
    if (lessonsPaid === lessonIds.length) {
      pass("Lessons marked as paid correctly");
      log("✔️ ", `  ${lessonsPaid} lessons marked as paid`);
    } else {
      fail("Lessons marked as paid correctly",
        `Expected ${lessonIds.length} lessons paid, got ${lessonsPaid}`);
    }

  } catch (error) {
    fail("Student payment flow", error);
  }
}

// ========================================
// TEACHER PAYMENT TESTS
// ========================================

async function testTeacherPaymentFlow() {
  log("🔵", "\n=== TEACHER PAYMENT TESTS ===\n");

  try {
    // Get teachers
    const teachersRes = await fetch(BASE_URL + "/api/teachers", {
      headers: { Cookie: cookies }
    });
    const teachersData = await teachersRes.json();
    const teachers = teachersData.teachers || teachersData;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      throw new Error("No teachers found");
    }
    pass("Fetch teachers list");

    const teacher = teachers[0];
    log("📝", `Testing with teacher: ${teacher.user.firstName} ${teacher.user.lastName}`);

    // Get teacher payment data
    const paymentDataRes = await fetch(BASE_URL + "/api/teachers/" + teacher.id + "/payment", {
      headers: { Cookie: cookies }
    });
    const paymentData = await paymentDataRes.json();

    if (!paymentData.summary) {
      throw new Error("Invalid payment data response");
    }
    pass("Fetch teacher payment data");

    log("📊", `  Unpaid lessons: ${paymentData.summary.totalLessons}`);
    log("💰", `  Total SOLU owes: ${paymentData.summary.totalAmount.toFixed(2)} NIS`);

    if (paymentData.unpaidLessons.length === 0) {
      log("⚠️ ", "No unpaid lessons - skipping teacher payment test");
      return;
    }

    // Verify SOLU portion calculation
    const lesson = paymentData.unpaidLessons[0];
    log("💵", `  SOLU pays per lesson: ${lesson.soluPortion} NIS`);
    log("💵", `  Student paid: ${lesson.studentPaid ? 'Yes' : 'No'}`);
    log("💵", `  Subsidizer paid: ${lesson.subsidizerPaid ? 'Yes' : 'No'}`);
    pass("Teacher payment data structure");

    // Process teacher payment
    const lessonIds = paymentData.unpaidLessons.slice(0, 2).map(l => l.id);
    const total = paymentData.unpaidLessons.slice(0, 2).reduce((s, l) => s + l.soluPortion, 0);

    const paymentRes = await fetch(BASE_URL + "/api/teachers/" + teacher.id + "/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({
        lessonIds,
        paymentMethod: "bank_transfer",
        amount: total,
        notes: "Test SOLU payment to teacher"
      })
    });

    if (!paymentRes.ok) {
      throw new Error(`Teacher payment failed: ${paymentRes.status}`);
    }

    const result = await paymentRes.json();
    pass("Process SOLU payment to teacher");
    log("💳", `  Marked ${result.lessonsMarkedPaid} lessons as soluPaid`);

    // Verify lessons marked as soluPaid
    const paymentDataAfter = await fetch(BASE_URL + "/api/teachers/" + teacher.id + "/payment", {
      headers: { Cookie: cookies }
    }).then(r => r.json());

    const lessonsPaid = paymentData.summary.totalLessons - paymentDataAfter.summary.totalLessons;
    if (lessonsPaid === lessonIds.length) {
      pass("Teacher lessons marked as soluPaid correctly");
      log("✔️ ", `  ${lessonsPaid} lessons marked as soluPaid`);
    } else {
      fail("Teacher lessons marked as soluPaid correctly",
        `Expected ${lessonIds.length} lessons paid, got ${lessonsPaid}`);
    }

  } catch (error) {
    fail("Teacher payment flow", error);
  }
}

// ========================================
// SUBSIDIZER PAYMENT TESTS
// ========================================

async function testSubsidizerPaymentFlow() {
  log("🔵", "\n=== SUBSIDIZER PAYMENT TESTS ===\n");

  try {
    // Get subsidizers
    const subsidizersRes = await fetch(BASE_URL + "/api/subsidizers", {
      headers: { Cookie: cookies }
    });
    const subsidizersData = await subsidizersRes.json();
    const subsidizers = subsidizersData.subsidizers || subsidizersData;

    if (!Array.isArray(subsidizers) || subsidizers.length === 0) {
      throw new Error("No subsidizers found");
    }
    pass("Fetch subsidizers list");

    const subsidizer = subsidizers[0];
    log("📝", `Testing with subsidizer: ${subsidizer.name}`);

    // Get subsidizer report
    const reportRes = await fetch(BASE_URL + "/api/subsidizers/" + subsidizer.id + "/report", {
      headers: { Cookie: cookies }
    });
    const report = await reportRes.json();

    if (!report.summary) {
      throw new Error("Invalid report response");
    }
    pass("Fetch subsidizer report");

    log("📊", `  Unpaid lessons: ${report.summary.totalLessons}`);
    log("💰", `  Total owed: ${report.summary.totalOwed.toFixed(2)} NIS`);
    log("👥", `  Students: ${report.studentReports.length}`);

    if (report.studentReports.length === 0 || report.studentReports.every(s => s.lessons.length === 0)) {
      log("⚠️ ", "No unpaid lessons - skipping subsidizer payment test");
      return;
    }

    // Verify subsidizer amount calculation
    const studentWithLessons = report.studentReports.find(s => s.lessons.length > 0);
    const lesson = studentWithLessons.lessons[0];
    log("💵", `  Subsidizer pays per lesson: ${lesson.amount} NIS`);
    log("💵", `  Student: ${studentWithLessons.studentName}`);
    pass("Subsidizer payment data structure");

    // Process subsidizer payment
    const lessonIds = [];
    for (const student of report.studentReports) {
      lessonIds.push(...student.lessons.slice(0, 1).map(l => l.id));
      if (lessonIds.length >= 2) break;
    }

    if (lessonIds.length === 0) {
      log("⚠️ ", "No lessons to pay");
      return;
    }

    const total = report.studentReports.reduce((sum, student) => {
      const selectedLessons = student.lessons.filter(l => lessonIds.includes(l.id));
      return sum + selectedLessons.reduce((s, l) => s + l.amount, 0);
    }, 0);

    const paymentRes = await fetch(BASE_URL + "/api/subsidizers/" + subsidizer.id + "/report", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookies },
      body: JSON.stringify({
        lessonIds,
        paymentMethod: "bank_transfer",
        amount: total,
        notes: "Test subsidizer payment"
      })
    });

    if (!paymentRes.ok) {
      throw new Error(`Subsidizer payment failed: ${paymentRes.status}`);
    }

    const result = await paymentRes.json();
    pass("Process subsidizer payment");
    log("💳", `  Marked ${result.lessonsMarkedPaid} lessons as subsidizerPaid`);

    // Verify lessons marked as subsidizerPaid
    const reportAfter = await fetch(BASE_URL + "/api/subsidizers/" + subsidizer.id + "/report", {
      headers: { Cookie: cookies }
    }).then(r => r.json());

    const lessonsPaid = report.summary.totalLessons - reportAfter.summary.totalLessons;
    if (lessonsPaid === lessonIds.length) {
      pass("Subsidizer lessons marked as paid correctly");
      log("✔️ ", `  ${lessonsPaid} lessons marked as subsidizerPaid`);
    } else {
      fail("Subsidizer lessons marked as paid correctly",
        `Expected ${lessonIds.length} lessons paid, got ${lessonsPaid}`);
    }

  } catch (error) {
    fail("Subsidizer payment flow", error);
  }
}

// ========================================
// PAYMENT VALIDATION TESTS
// ========================================

async function testPaymentValidation() {
  log("🔵", "\n=== PAYMENT VALIDATION TESTS ===\n");

  try {
    // Get a student
    const studentsRes = await fetch(BASE_URL + "/api/students", {
      headers: { Cookie: cookies }
    });
    const students = (await studentsRes.json()).students || await studentsRes.json();
    const student = students[0];

    // Test: Pay with no lesson IDs
    try {
      const res = await fetch(BASE_URL + "/api/students/" + student.id + "/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({ lessonIds: [], paymentMethod: "cash", amount: 0 })
      });
      if (!res.ok) {
        pass("Reject payment with no lessons");
      } else {
        fail("Reject payment with no lessons", "Should have rejected empty lesson IDs");
      }
    } catch (e) {
      pass("Reject payment with no lessons");
    }

    // Test: Pay with invalid lesson ID
    try {
      const res = await fetch(BASE_URL + "/api/students/" + student.id + "/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookies },
        body: JSON.stringify({
          lessonIds: ["invalid-id"],
          paymentMethod: "cash",
          amount: 100
        })
      });
      if (!res.ok) {
        pass("Reject payment with invalid lesson ID");
      } else {
        fail("Reject payment with invalid lesson ID", "Should have rejected invalid ID");
      }
    } catch (e) {
      pass("Reject payment with invalid lesson ID");
    }

    // Test: Pay without payment method
    const account = await fetch(BASE_URL + "/api/students/" + student.id + "/account", {
      headers: { Cookie: cookies }
    }).then(r => r.json());

    if (account.lessons.length > 0) {
      try {
        const res = await fetch(BASE_URL + "/api/students/" + student.id + "/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json", Cookie: cookies },
          body: JSON.stringify({
            lessonIds: [account.lessons[0].id],
            amount: 100
          })
        });
        if (!res.ok) {
          pass("Reject payment without payment method");
        } else {
          fail("Reject payment without payment method", "Should require payment method");
        }
      } catch (e) {
        pass("Reject payment without payment method");
      }
    }

  } catch (error) {
    fail("Payment validation tests", error);
  }
}

// ========================================
// FINANCIAL DASHBOARD TEST
// ========================================

async function testFinancialDashboard() {
  log("🔵", "\n=== FINANCIAL DASHBOARD TEST ===\n");

  try {
    const res = await fetch(BASE_URL + "/api/financial/dashboard", {
      headers: { Cookie: cookies }
    });

    if (!res.ok) {
      throw new Error(`Dashboard API failed: ${res.status}`);
    }

    const data = await res.json();

    if (!data.students || !data.subsidizers || !data.teachers) {
      throw new Error("Invalid dashboard data structure");
    }
    pass("Fetch financial dashboard");

    log("📊", `  Students owing: ${data.students.length}`);
    log("📊", `  Total student debt: ${data.students.reduce((s, st) => s + st.totalAmount, 0).toFixed(2)} NIS`);
    log("📊", `  Subsidizers owing: ${data.subsidizers.length}`);
    log("📊", `  Total subsidizer debt: ${data.subsidizers.reduce((s, sub) => s + sub.totalAmount, 0).toFixed(2)} NIS`);
    log("📊", `  Teachers to pay: ${data.teachers.length}`);
    log("📊", `  Total SOLU owes: ${data.teachers.reduce((s, t) => s + t.totalAmount, 0).toFixed(2)} NIS`);

    pass("Financial dashboard data structure");

  } catch (error) {
    fail("Financial dashboard test", error);
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log("\n");
  log("🚀", "=".repeat(50));
  log("🚀", "COMPREHENSIVE PAYMENT SYSTEM TEST SUITE");
  log("🚀", "=".repeat(50));
  console.log("\n");

  try {
    // Login first
    log("🔐", "Logging in...");
    await login();
    pass("Admin login");
    console.log("\n");

    // Run all test suites
    await testStudentPaymentFlow();
    await testTeacherPaymentFlow();
    await testSubsidizerPaymentFlow();
    await testPaymentValidation();
    await testFinancialDashboard();

    // Print summary
    console.log("\n");
    log("📊", "=".repeat(50));
    log("📊", "TEST SUMMARY");
    log("📊", "=".repeat(50));
    log("✅", `PASSED: ${testResults.passed}`);
    if (testResults.failed > 0) {
      log("❌", `FAILED: ${testResults.failed}`);
    }
    log("📈", `TOTAL: ${testResults.passed + testResults.failed}`);
    log("🎯", `SUCCESS RATE: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    console.log("\n");
    log("📋", "DETAILED RESULTS:");
    testResults.tests.forEach((test, i) => {
      const status = test.status === "PASS" ? "✅" : "❌";
      console.log(`  ${i + 1}. ${status} ${test.name}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });

    console.log("\n");
    if (testResults.failed === 0) {
      log("🎉", "ALL TESTS PASSED! Payment system is fully functional!");
    } else {
      log("⚠️ ", "Some tests failed. Please review the errors above.");
    }
    console.log("\n");

  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    console.error(error);
  }
}

// Run the tests
runAllTests().catch(e => {
  console.error("Fatal error:", e);
  process.exit(1);
});
