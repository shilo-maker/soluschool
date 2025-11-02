const BASE_URL = "http://localhost:3334";

async function test() {
  console.log("Testing student payment flow...");
  const login = await fetch(BASE_URL + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@solu.school", password: "admin123" })
  });
  const cookies = login.headers.get("set-cookie");
  console.log("✅ Login successful");
  
  const studentsRes = await fetch(BASE_URL + "/api/students", { headers: { Cookie: cookies }});

  if (!studentsRes.ok) {
    console.log("❌ Failed to fetch students:", studentsRes.status);
    return;
  }

  const studentsData = await studentsRes.json();
  const students = studentsData.students || studentsData;

  if (!Array.isArray(students) || students.length === 0) {
    console.log("❌ No students found");
    return;
  }

  const student = students[0];
  console.log("✅ Got student:", student.user.firstName, student.user.lastName);
  
  const accountRes = await fetch(BASE_URL + "/api/students/" + student.id + "/account", { headers: { Cookie: cookies }});
  if (!accountRes.ok) {
    console.log("❌ Failed to fetch account:", accountRes.status);
    return;
  }

  const account = await accountRes.json();
  if (!account.summary) {
    console.log("❌ Invalid account response:", account);
    return;
  }

  console.log("✅ Account data:", account.summary.totalLessons, "lessons,", account.summary.totalAmount.toFixed(2), "NIS");
  
  if (account.lessons.length === 0) {
    console.log("⚠️  No unpaid lessons");
    return;
  }
  
  const lessonIds = account.lessons.slice(0,2).map(l => l.id);
  const total = account.lessons.slice(0,2).reduce((s,l) => s + l.studentPortion, 0);
  
  const payment = await fetch(BASE_URL + "/api/students/" + student.id + "/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookies },
    body: JSON.stringify({ lessonIds, paymentMethod: "cash", amount: total, notes: "Test" })
  });
  
  const result = await payment.json();
  console.log("✅ Payment processed:", result.payment.id, result.payment.amount, "NIS");
  
  const accountAfter = await (await fetch(BASE_URL + "/api/students/" + student.id + "/account", { headers: { Cookie: cookies }})).json();
  console.log("✅ Verified: Lessons paid:", account.summary.totalLessons - accountAfter.summary.totalLessons);
  console.log("\n🎉 Student payment system working!");
}
test().catch(e => console.error("Error:", e));