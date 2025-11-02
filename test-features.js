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

// ========================================
// SCHEDULE MANAGEMENT TESTS
// ========================================

async function testScheduleManagement() {
  log("🔵", "\n=== SCHEDULE MANAGEMENT TESTS ===\n");

  try {
    // Fetch all schedules
    const schedulesRes = await fetch(BASE_URL + "/api/schedules", {
      headers: { Cookie: cookies }
    });

    if (!schedulesRes.ok) {
      throw new Error(`Failed to fetch schedules: ${schedulesRes.status}`);
    }

    const schedulesData = await schedulesRes.json();
    const schedules = schedulesData.schedules || schedulesData;

    if (!Array.isArray(schedules)) {
      throw new Error("Schedules response is not an array");
    }

    pass("Fetch all schedules");
    log("📊", `  Total schedules: ${schedules.length}`);

    if (schedules.length === 0) {
      log("⚠️ ", "No schedules found - skipping schedule tests");
      return;
    }

    // Test schedule data structure
    const schedule = schedules[0];
    if (schedule.id && schedule.studentId && schedule.teacherId && schedule.dayOfWeek !== undefined) {
      pass("Schedule data structure");
      log("📝", `  Sample schedule: Day ${schedule.dayOfWeek}, Time ${schedule.startTime}`);
      log("📝", `  Student ID: ${schedule.studentId}`);
      log("📝", `  Teacher ID: ${schedule.teacherId}`);
    } else {
      fail("Schedule data structure", "Missing required fields");
    }

    // Fetch single schedule
    const singleScheduleRes = await fetch(BASE_URL + "/api/schedules/" + schedule.id, {
      headers: { Cookie: cookies }
    });

    if (singleScheduleRes.ok) {
      const singleSchedule = await singleScheduleRes.json();
      if (singleSchedule.id === schedule.id) {
        pass("Fetch single schedule");
      } else {
        fail("Fetch single schedule", "ID mismatch");
      }
    } else {
      fail("Fetch single schedule", `Status: ${singleScheduleRes.status}`);
    }

    // Test create schedule
    const studentsRes = await fetch(BASE_URL + "/api/students", { headers: { Cookie: cookies }});
    const studentsData = await studentsRes.json();
    const students = studentsData.students || studentsData;

    const teachersRes = await fetch(BASE_URL + "/api/teachers", { headers: { Cookie: cookies }});
    const teachersData = await teachersRes.json();
    const teachers = teachersData.teachers || teachersData;

    const roomsRes = await fetch(BASE_URL + "/api/rooms", { headers: { Cookie: cookies }});
    const roomsData = await roomsRes.json();
    const rooms = roomsData.rooms || roomsData;

    if (students.length > 0 && teachers.length > 0 && rooms.length > 0) {
      const newSchedule = {
        studentId: students[0].id,
        teacherId: teachers[0].id,
        roomId: rooms[0].id,
        instrument: "פסנתר",
        dayOfWeek: 1, // Monday
        startTime: "16:00",
        endTime: "17:00",
        effectiveFrom: new Date().toISOString().split('T')[0], // Today's date
        isActive: true
      };

      const createRes = await fetch(BASE_URL + "/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify(newSchedule)
      });

      if (createRes.ok) {
        const created = await createRes.json();
        pass("Create new schedule");
        log("📝", `  Created schedule ID: ${created.id || created.schedule?.id}`);

        // Test update schedule
        const scheduleId = created.id || created.schedule?.id;
        const updateRes = await fetch(BASE_URL + "/api/schedules/" + scheduleId, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookies
          },
          body: JSON.stringify({
            ...newSchedule,
            startTime: "17:00",
            endTime: "18:00"
          })
        });

        if (updateRes.ok) {
          pass("Update schedule");
          log("📝", `  Updated schedule time to 17:00-18:00`);
        } else {
          fail("Update schedule", `Status: ${updateRes.status}`);
        }

        // Test delete schedule
        const deleteRes = await fetch(BASE_URL + "/api/schedules/" + scheduleId, {
          method: "DELETE",
          headers: { Cookie: cookies }
        });

        if (deleteRes.ok) {
          pass("Delete schedule");
          log("📝", `  Deleted test schedule`);
        } else {
          fail("Delete schedule", `Status: ${deleteRes.status}`);
        }
      } else {
        fail("Create new schedule", `Status: ${createRes.status}`);
      }
    }

  } catch (error) {
    fail("Schedule management tests", error);
  }
}

// ========================================
// LESSON CHECK-IN/OUT TESTS
// ========================================

async function testLessonCheckInOut() {
  log("🔵", "\n=== LESSON CHECK-IN/OUT TESTS ===\n");

  try {
    // Get today's lessons
    const today = new Date().toISOString().split('T')[0];
    const todayRes = await fetch(BASE_URL + "/api/lessons?date=" + today, {
      headers: { Cookie: cookies }
    });

    if (!todayRes.ok) {
      throw new Error(`Failed to fetch today's lessons: ${todayRes.status}`);
    }

    const todayData = await todayRes.json();
    const todayLessons = todayData.lessons || todayData;

    pass("Fetch today's lessons");
    log("📊", `  Lessons today: ${Array.isArray(todayLessons) ? todayLessons.length : 0}`);

    // Get all lessons
    const allLessonsRes = await fetch(BASE_URL + "/api/lessons", {
      headers: { Cookie: cookies }
    });

    if (!allLessonsRes.ok) {
      throw new Error(`Failed to fetch all lessons: ${allLessonsRes.status}`);
    }

    const allLessonsData = await allLessonsRes.json();
    const allLessons = allLessonsData.lessons || allLessonsData;

    pass("Fetch all lessons");
    log("📊", `  Total lessons: ${allLessons.length}`);

    if (allLessons.length === 0) {
      log("⚠️ ", "No lessons found - skipping check-in/out tests");
      return;
    }

    // Find a scheduled lesson to test with
    const scheduledLesson = allLessons.find(l => l.status === 'scheduled');

    if (scheduledLesson) {
      const now = new Date().toISOString();

      // Test teacher check-in
      const teacherCheckinRes = await fetch(BASE_URL + "/api/lessons/" + scheduledLesson.id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify({ teacherCheckIn: now })
      });

      if (teacherCheckinRes.ok) {
        pass("Teacher check-in");
        log("✔️ ", `  Teacher checked in to lesson ${scheduledLesson.id}`);

        // Test student check-in
        const studentCheckinRes = await fetch(BASE_URL + "/api/lessons/" + scheduledLesson.id, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookies
          },
          body: JSON.stringify({ studentCheckIn: now })
        });

        if (studentCheckinRes.ok) {
          pass("Student check-in");
          log("✔️ ", `  Student checked in to lesson ${scheduledLesson.id}`);

          // Test teacher check-out
          const teacherCheckoutRes = await fetch(BASE_URL + "/api/lessons/" + scheduledLesson.id, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Cookie: cookies
            },
            body: JSON.stringify({ teacherCheckOut: now })
          });

          if (teacherCheckoutRes.ok) {
            pass("Teacher check-out");
            log("✔️ ", `  Teacher checked out from lesson ${scheduledLesson.id}`);

            // Test student check-out
            const studentCheckoutRes = await fetch(BASE_URL + "/api/lessons/" + scheduledLesson.id, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                Cookie: cookies
              },
              body: JSON.stringify({ studentCheckOut: now })
            });

            if (studentCheckoutRes.ok) {
              pass("Student check-out");
              log("✔️ ", `  Student checked out from lesson ${scheduledLesson.id}`);

              // Test marking lesson as completed
              const completeRes = await fetch(BASE_URL + "/api/lessons/" + scheduledLesson.id, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  Cookie: cookies
                },
                body: JSON.stringify({ status: "completed" })
              });

              if (completeRes.ok) {
                const completedLesson = await completeRes.json();
                if (completedLesson.status === 'completed') {
                  pass("Mark lesson as completed");
                  log("✔️ ", `  Lesson marked as completed`);
                } else {
                  fail("Mark lesson as completed", `Status is ${completedLesson.status}`);
                }
              } else {
                fail("Mark lesson as completed", `Status: ${completeRes.status}`);
              }
            } else {
              fail("Student check-out", `Status: ${studentCheckoutRes.status}`);
            }
          } else {
            fail("Teacher check-out", `Status: ${teacherCheckoutRes.status}`);
          }
        } else {
          fail("Student check-in", `Status: ${studentCheckinRes.status}`);
        }
      } else {
        fail("Teacher check-in", `Status: ${teacherCheckinRes.status}`);
      }
    } else {
      log("⚠️ ", "No scheduled lessons found - check-in/out tests skipped");
    }

  } catch (error) {
    fail("Lesson check-in/out tests", error);
  }
}

// ========================================
// ROOM MANAGEMENT TESTS
// ========================================

async function testRoomManagement() {
  log("🔵", "\n=== ROOM MANAGEMENT TESTS ===\n");

  try {
    // Fetch all rooms
    const roomsRes = await fetch(BASE_URL + "/api/rooms", {
      headers: { Cookie: cookies }
    });

    if (!roomsRes.ok) {
      throw new Error(`Failed to fetch rooms: ${roomsRes.status}`);
    }

    const roomsData = await roomsRes.json();
    const rooms = roomsData.rooms || roomsData;

    if (!Array.isArray(rooms)) {
      throw new Error("Rooms response is not an array");
    }

    pass("Fetch all rooms");
    log("📊", `  Total rooms: ${rooms.length}`);

    if (rooms.length === 0) {
      log("⚠️ ", "No rooms found");
    } else {
      // Test room data structure
      const room = rooms[0];
      if (room.id && room.name) {
        pass("Room data structure");
        log("📝", `  Sample room: ${room.name} (${room.number || 'No number'})`);
        log("📝", `  Capacity: ${room.capacity || 'Not set'}`);
        log("📝", `  Active: ${room.isActive ? 'Yes' : 'No'}`);
      } else {
        fail("Room data structure", "Missing required fields");
      }

      // Fetch single room
      const singleRoomRes = await fetch(BASE_URL + "/api/rooms/" + room.id, {
        headers: { Cookie: cookies }
      });

      if (singleRoomRes.ok) {
        const singleRoom = await singleRoomRes.json();
        if (singleRoom.id === room.id || singleRoom.room?.id === room.id) {
          pass("Fetch single room");
        } else {
          fail("Fetch single room", "ID mismatch");
        }
      } else {
        fail("Fetch single room", `Status: ${singleRoomRes.status}`);
      }
    }

    // Test create room
    const newRoom = {
      name: "חדר בדיקה",
      number: "TEST-1",
      capacity: 2,
      equipment: ["פסנתר", "כיסא"],
      isActive: true
    };

    const createRes = await fetch(BASE_URL + "/api/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookies
      },
      body: JSON.stringify(newRoom)
    });

    if (createRes.ok) {
      const created = await createRes.json();
      pass("Create new room");
      const roomId = created.id || created.room?.id;
      log("📝", `  Created room ID: ${roomId}`);

      // Test update room
      const updateRes = await fetch(BASE_URL + "/api/rooms/" + roomId, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies
        },
        body: JSON.stringify({
          ...newRoom,
          capacity: 3,
          equipment: ["פסנתר", "כיסא", "מחשב"]
        })
      });

      if (updateRes.ok) {
        pass("Update room");
        log("📝", `  Updated room capacity to 3`);
      } else {
        fail("Update room", `Status: ${updateRes.status}`);
      }

      // Test delete room
      const deleteRes = await fetch(BASE_URL + "/api/rooms/" + roomId, {
        method: "DELETE",
        headers: { Cookie: cookies }
      });

      if (deleteRes.ok) {
        pass("Delete room");
        log("📝", `  Deleted test room`);
      } else {
        fail("Delete room", `Status: ${deleteRes.status}`);
      }
    } else {
      const errorText = await createRes.text();
      fail("Create new room", `Status: ${createRes.status}, ${errorText}`);
    }

  } catch (error) {
    fail("Room management tests", error);
  }
}

// ========================================
// CALENDAR & DASHBOARD TESTS
// ========================================

async function testCalendarAndDashboard() {
  log("🔵", "\n=== CALENDAR & DASHBOARD TESTS ===\n");

  try {
    // Test admin stats
    const statsRes = await fetch(BASE_URL + "/api/admin/stats", {
      headers: { Cookie: cookies }
    });

    if (!statsRes.ok) {
      throw new Error(`Failed to fetch stats: ${statsRes.status}`);
    }

    const stats = await statsRes.json();

    if (stats.totalStudents !== undefined && stats.totalTeachers !== undefined) {
      pass("Fetch admin dashboard stats");
      log("📊", `  Students: ${stats.totalStudents}`);
      log("📊", `  Teachers: ${stats.totalTeachers}`);
      log("📊", `  Lessons: ${stats.totalLessons || 0}`);
      log("📊", `  Rooms: ${stats.totalRooms || 0}`);
    } else {
      fail("Fetch admin dashboard stats", "Missing required stat fields");
    }

    // Test notifications (if available)
    const notificationsRes = await fetch(BASE_URL + "/api/notifications", {
      headers: { Cookie: cookies }
    });

    if (notificationsRes.ok) {
      const notifications = await notificationsRes.json();
      pass("Fetch notifications");
      log("📊", `  Notifications: ${Array.isArray(notifications) ? notifications.length : 'N/A'}`);
    } else if (notificationsRes.status === 404) {
      log("⚠️ ", "Notifications endpoint not found (optional feature)");
    } else {
      fail("Fetch notifications", `Status: ${notificationsRes.status}`);
    }

  } catch (error) {
    fail("Calendar & dashboard tests", error);
  }
}

// ========================================
// MAIN TEST RUNNER
// ========================================

async function runAllTests() {
  console.log("🚀 ==================================================");
  console.log("🚀 COMPREHENSIVE FEATURE TEST SUITE");
  console.log("🚀 ==================================================\n");

  try {
    // Login first
    log("🔐", "Logging in...");
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
    pass("Admin login");

    // Run all test suites
    await testScheduleManagement();
    await testLessonCheckInOut();
    await testRoomManagement();
    await testCalendarAndDashboard();

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
      console.log("\n🎉 ALL TESTS PASSED! All features are working correctly!");
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
