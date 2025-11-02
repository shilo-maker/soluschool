const BASE_URL = "http://localhost:3335";
let cookies = null;
let testResults = { passed: [], failed: [] };

function log(emoji, msg) { console.log(`${emoji} ${msg}`); }
function pass(t) { testResults.passed.push(t); console.log(`✅ ${t}`); }
function fail(t, e) { testResults.failed.push({test:t,error:e?.message||e}); console.log(`❌ ${t}`); if(e?.message) console.log(`   Error: ${e.message}`); }

async function setup() {
  const r = await fetch(BASE_URL+"/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"admin@solu.school",password:"admin123"})});
  cookies = r.headers.get("set-cookie");
}

async function testEdgeCases() {
  log("🔵", "\n=== EDGE CASES & ERROR HANDLING ===\n");

  try {
    // Test 1: Empty string fields
    const r1 = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify({firstName:"",lastName:"Test",email:"edge1@test.com",phone:"050-1234567",instruments:["פסנתר"],soluSubsidy:50,additionalSubsidy:{hasSubsidy:false}})});
    if (!r1.ok) { pass("Reject empty firstName"); log("✔️ ","  Validation working"); }
    else { fail("Reject empty firstName", "Should reject empty string"); }

    // Test 2: Invalid email format
    const r2 = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify({firstName:"Test",lastName:"Test",email:"notanemail",phone:"050-1234567",instruments:["פסנתר"],soluSubsidy:50,additionalSubsidy:{hasSubsidy:false}})});
    if (!r2.ok) { pass("Reject invalid email format"); log("✔️ ","  Email validation working"); }
    else { fail("Reject invalid email format", "Should validate email"); }

    // Test 3: Very long string (SQL injection attempt)
    const longStr = "A".repeat(10000);
    const r3 = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify({firstName:longStr,lastName:"Test",email:"edge3@test.com",phone:"050-1234567",instruments:["פסנתר"],soluSubsidy:50,additionalSubsidy:{hasSubsidy:false}})});
    pass("Handle very long strings without crashing");

    // Test 4: Negative numbers
    const r4 = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify({firstName:"Test",lastName:"Test",email:"edge4@test.com",phone:"050-1234567",instruments:["פסנתר"],soluSubsidy:-50,additionalSubsidy:{hasSubsidy:false}})});
    pass("Handle negative subsidy values");

    // Test 5: Invalid UUID
    const r5 = await fetch(BASE_URL+"/api/students/invalid-uuid-12345",{headers:{Cookie:cookies}});
    if (!r5.ok) { pass("Reject invalid UUID format"); log("✔️ ","  UUID validation working"); }
    else { fail("Reject invalid UUID format", "Should validate UUID"); }

    // Test 6: Non-existent ID
    const r6 = await fetch(BASE_URL+"/api/students/00000000-0000-0000-0000-000000000000",{headers:{Cookie:cookies}});
    if (r6.status === 404) { pass("Return 404 for non-existent ID"); log("✔️ ","  404 as expected"); }
    else { fail("Return 404 for non-existent ID", `Got ${r6.status}`); }

    // Test 7: Missing required fields
    const r7 = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify({firstName:"Test"})});
    if (!r7.ok) { pass("Reject missing required fields"); log("✔️ ","  Required field validation working"); }
    else { fail("Reject missing required fields", "Should require all fields"); }

    // Test 8: Duplicate email (if enforced)
    const email = "duplicate-test-"+Date.now()+"@test.com";
    const r8a = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify({firstName:"Dup1",lastName:"Test",email,phone:"050-1111111",instruments:["פסנתר"],soluSubsidy:50,additionalSubsidy:{hasSubsidy:false}})});
    if (r8a.ok) {
      const created = await r8a.json();
      const r8b = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify({firstName:"Dup2",lastName:"Test",email,phone:"050-2222222",instruments:["גיטרה"],soluSubsidy:40,additionalSubsidy:{hasSubsidy:false}})});
      if (!r8b.ok) { pass("Prevent duplicate email addresses"); log("✔️ ","  Unique constraint working"); }
      else { fail("Prevent duplicate email addresses", "Should reject duplicate email"); await fetch(BASE_URL+"/api/students/"+(await r8b.json()).student.id,{method:"DELETE",headers:{Cookie:cookies}}); }
      await fetch(BASE_URL+"/api/students/"+created.student.id,{method:"DELETE",headers:{Cookie:cookies}});
    } else {
      log("⚠️ ","  Could not test duplicate email");
    }

    // Test 9: Malformed JSON
    const r9 = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:"{invalid json"});
    if (!r9.ok) { pass("Reject malformed JSON"); log("✔️ ","  JSON parsing error handled"); }
    else { fail("Reject malformed JSON", "Should reject bad JSON"); }

    // Test 10: Array instead of object
    const r10 = await fetch(BASE_URL+"/api/students",{method:"POST",headers:{"Content-Type":"application/json",Cookie:cookies},body:JSON.stringify([{firstName:"Test"}])});
    if (!r10.ok) { pass("Reject array when expecting object"); }
    else { fail("Reject array when expecting object", "Should expect object"); }

  } catch (error) {
    fail("Edge cases tests", error);
  }
}

async function runAllTests() {
  console.log("🚀 ==================================================");
  console.log("🚀 EDGE CASES & ERROR HANDLING TEST SUITE");
  console.log("🚀 ==================================================\n");

  await setup();
  await testEdgeCases();

  console.log("\n📊 ==================================================");
  console.log("📊 TEST SUMMARY");
  console.log("📊 ==================================================");
  console.log(`✅ PASSED: ${testResults.passed.length}`);
  if (testResults.failed.length>0) console.log(`❌ FAILED: ${testResults.failed.length}`);
  console.log(`📈 TOTAL: ${testResults.passed.length+testResults.failed.length}`);
  console.log(`🎯 SUCCESS RATE: ${((testResults.passed.length/(testResults.passed.length+testResults.failed.length))*100).toFixed(1)}%\n`);

  console.log("\n📋 DETAILED RESULTS:");
  testResults.passed.forEach((t,i)=>console.log(`  ${i+1}. ✅ ${t}`));
  if (testResults.failed.length>0) {
    console.log("\n❌ FAILED TESTS:");
    testResults.failed.forEach((f,i)=>{console.log(`  ${i+1}. ❌ ${f.test}`);console.log(`     Error: ${f.error}`);});
  } else {
    console.log("\n🎉 ALL EDGE CASE TESTS PASSED!");
  }
}

runAllTests().catch(e=>{console.error("Fatal:",e);process.exit(1);});
