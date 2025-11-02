const io = require('socket.io-client');
const BASE_URL = "http://localhost:3335";

// Test state
let cookies = null;
let testResults = {
  passed: [],
  failed: []
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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// SOCKET.IO CONNECTION TESTS
// ========================================

async function testSocketConnection() {
  log("🔵", "\n=== SOCKET.IO CONNECTION TESTS ===\n");

  try {
    // Test 1: Connect to Socket.io server
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling']
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        pass("Connect to Socket.io server");
        log("🔌", `  Socket ID: ${socket.id}`);
        resolve();
      });

      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Test 2: Join a room
    socket.emit('join-room', 'live-updates');
    await wait(500);
    pass("Join Socket.io room");
    log("🏠", "  Joined 'live-updates' room");

    // Test 3: Disconnect
    socket.disconnect();
    await wait(500);
    pass("Disconnect from Socket.io");
    log("🔌", "  Socket disconnected");

    return socket;

  } catch (error) {
    fail("Socket.io connection tests", error);
    return null;
  }
}

// ========================================
// REAL-TIME LESSON UPDATES TESTS
// ========================================

async function testRealTimeLessonUpdates() {
  log("🔵", "\n=== REAL-TIME LESSON UPDATES ===\n");

  try {
    // First, get auth
    const loginRes = await fetch(BASE_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@solu.school",
        password: "admin123"
      })
    });

    if (!loginRes.ok) {
      throw new Error("Login failed");
    }

    cookies = loginRes.headers.get("set-cookie");

    // Get a scheduled lesson to update
    const lessonsRes = await fetch(BASE_URL + "/api/lessons?status=scheduled", {
      headers: { Cookie: cookies }
    });

    const lessonsData = await lessonsRes.json();
    const lessons = lessonsData.lessons || lessonsData;

    if (lessons.length === 0) {
      log("⚠️ ", "No scheduled lessons found for real-time tests");
      return;
    }

    const testLesson = lessons[0];

    // Test 1: Listen for lesson-updated event
    const socket = io(BASE_URL, {
      transports: ['websocket', 'polling']
    });

    await new Promise((resolve) => {
      socket.on('connect', () => {
        socket.emit('join-room', 'live-updates');
        resolve();
      });
    });

    let lessonUpdateReceived = false;
    socket.on('lesson-updated', (data) => {
      if (data.lessonId === testLesson.id) {
        lessonUpdateReceived = true;
        log("📡", `  Received lesson-updated event for lesson ${data.lessonId}`);
      }
    });

    // Trigger a lesson update
    const now = new Date().toISOString();
    const updateRes = await fetch(BASE_URL + "/api/lessons/" + testLesson.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify({
        teacherCheckIn: now
      })
    });

    if (!updateRes.ok) {
      throw new Error(`Failed to update lesson: ${updateRes.status}`);
    }

    // Wait for Socket.io event
    await wait(2000);

    if (lessonUpdateReceived) {
      pass("Receive real-time lesson-updated event");
    } else {
      fail("Receive real-time lesson-updated event", "Event not received within timeout");
    }

    // Test 2: Multiple clients receiving same event
    const socket2 = io(BASE_URL, {
      transports: ['websocket', 'polling']
    });

    await new Promise((resolve) => {
      socket2.on('connect', () => {
        socket2.emit('join-room', 'live-updates');
        resolve();
      });
    });

    let client2Received = false;
    socket2.on('lesson-updated', (data) => {
      if (data.lessonId === testLesson.id) {
        client2Received = true;
      }
    });

    // Trigger another update
    const updateRes2 = await fetch(BASE_URL + "/api/lessons/" + testLesson.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify({
        studentCheckIn: now
      })
    });

    await wait(2000);

    if (client2Received) {
      pass("Multiple clients receive same event");
      log("📡", "  Both clients received the update");
    } else {
      fail("Multiple clients receive same event", "Second client didn't receive event");
    }

    // Test 3: Lesson completion event
    let completionReceived = false;
    socket.on('lesson-completed', (data) => {
      if (data.lessonId === testLesson.id) {
        completionReceived = true;
        log("📡", `  Received lesson-completed event`);
      }
    });

    const completeRes = await fetch(BASE_URL + "/api/lessons/" + testLesson.id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify({
        status: "completed"
      })
    });

    await wait(2000);

    if (completionReceived) {
      pass("Receive lesson-completed event");
    } else {
      fail("Receive lesson-completed event", "Event not received");
    }

    // Test 4: Status change event
    let statusChangeReceived = false;
    socket.on('status-changed', (data) => {
      statusChangeReceived = true;
      log("📡", `  Status changed from ${data.oldStatus} to ${data.newStatus}`);
    });

    // Get another lesson to cancel
    const cancelLesson = lessons.find(l => l.id !== testLesson.id && l.status === 'scheduled');
    if (cancelLesson) {
      const cancelRes = await fetch(BASE_URL + "/api/lessons/" + cancelLesson.id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify({
          status: "cancelled",
          cancellationReason: "בדיקה - real-time test"
        })
      });

      await wait(2000);

      if (statusChangeReceived) {
        pass("Receive status-changed event");
      } else {
        fail("Receive status-changed event", "Event not received");
      }
    } else {
      log("⚠️ ", "No additional lesson found for status change test");
    }

    // Cleanup
    socket.disconnect();
    socket2.disconnect();

  } catch (error) {
    fail("Real-time lesson updates tests", error);
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log("🚀 ==================================================");
  console.log("🚀 REAL-TIME SOCKET.IO COMPREHENSIVE TEST SUITE");
  console.log("🚀 ==================================================\n");

  try {
    await testSocketConnection();
    await testRealTimeLessonUpdates();

    // Print summary
    console.log("\n📊 ==================================================");
    console.log("📊 TEST SUMMARY");
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
      console.log("\n🎉 ALL SOCKET.IO TESTS PASSED!");
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
