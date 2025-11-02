const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const testSuites = [
  { name: "Payment System", file: "test-all-payments.js", expected: 21 },
  { name: "Core Features", file: "test-features.js", expected: 22 },
  { name: "Complete System", file: "test-complete-system.js", expected: 34 },
  { name: "User Roles & Permissions", file: "test-user-roles.js", expected: 20 },
  { name: "Complete Auth & Role Permissions", file: "test-complete-roles-auth.js", expected: 20 },
  { name: "Substitute Teacher System", file: "test-substitute-system.js", expected: 37 },
  { name: "Edge Cases & Error Handling", file: "test-edge-cases.js", expected: 10 },
];

let results = [];

async function runTestSuite(suite) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Running: ${suite.name}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    const { stdout, stderr } = await execPromise(`node ${suite.file}`);
    console.log(stdout);

    // Parse results
    const passedMatch = stdout.match(/PASSED: (\d+)/);
    const totalMatch = stdout.match(/TOTAL: (\d+)/);
    const rateMatch = stdout.match(/SUCCESS RATE: ([\d.]+)%/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
    const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;

    results.push({
      name: suite.name,
      passed,
      total,
      expected: suite.expected,
      rate,
      status: rate === 100 ? "✅" : "⚠️"
    });

    return { passed, total, rate };
  } catch (error) {
    console.error(`Error running ${suite.name}:`, error.message);
    results.push({
      name: suite.name,
      passed: 0,
      total: 0,
      expected: suite.expected,
      rate: 0,
      status: "❌"
    });
    return { passed: 0, total: 0, rate: 0 };
  }
}

async function runAllTests() {
  console.log("\n🚀 ==================================================");
  console.log("🚀 MASTER TEST RUNNER - ALL COMPREHENSIVE TEST SUITES");
  console.log("🚀 ==================================================\n");

  for (const suite of testSuites) {
    await runTestSuite(suite);
  }

  // Print master summary
  console.log("\n\n" + "=".repeat(70));
  console.log("📊 MASTER TEST SUMMARY - ALL SUITES");
  console.log("=".repeat(70) + "\n");

  let totalPassed = 0;
  let totalTests = 0;

  console.log("Test Suite                          | Passed | Total  | Rate    | Status");
  console.log("-".repeat(70));

  results.forEach(r => {
    totalPassed += r.passed;
    totalTests += r.total;
    const name = r.name.padEnd(35);
    const passed = String(r.passed).padStart(6);
    const total = String(r.total).padStart(6);
    const rate = `${r.rate.toFixed(1)}%`.padStart(7);
    console.log(`${name} | ${passed} | ${total} | ${rate} | ${r.status}`);
  });

  console.log("-".repeat(70));
  const overallRate = ((totalPassed / totalTests) * 100).toFixed(1);
  const overallName = "OVERALL TOTAL".padEnd(35);
  const overallPassed = String(totalPassed).padStart(6);
  const overallTotal = String(totalTests).padStart(6);
  const overallRateStr = `${overallRate}%`.padStart(7);
  const overallStatus = overallRate == 100 ? "✅" : "⚠️";

  console.log(`${overallName} | ${overallPassed} | ${overallTotal} | ${overallRateStr} | ${overallStatus}`);
  console.log("=".repeat(70));

  if (overallRate == 100) {
    console.log("\n🎉🎉🎉 PERFECT SCORE - 100% OF ALL TESTS PASSING! 🎉🎉🎉\n");
  } else {
    console.log(`\n⚠️  OVERALL SUCCESS RATE: ${overallRate}%`);
    console.log(`   Need to fix ${totalTests - totalPassed} failing tests to reach 100%\n`);

    // Show which suites have failures
    const failingSuites = results.filter(r => r.rate < 100);
    if (failingSuites.length > 0) {
      console.log("Suites with failures:");
      failingSuites.forEach(s => {
        console.log(`  ❌ ${s.name}: ${s.passed}/${s.total} passing (${s.rate.toFixed(1)}%)`);
      });
      console.log();
    }
  }
}

runAllTests().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
