const { io } = require('socket.io-client');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testRealtimeUpdates() {
  console.log('=== TESTING REAL-TIME UPDATES ===\n');

  // Connect to Socket.io server
  const socket = io('http://localhost:3335');

  // Track received events
  let studentCheckinEventReceived = false;
  let teacherCheckinEventReceived = false;

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    console.log('');
    runTests();
  });

  socket.on('student-checkin-update', () => {
    console.log('📡 RECEIVED: student-checkin-update event');
    studentCheckinEventReceived = true;
  });

  socket.on('teacher-checkin-update', () => {
    console.log('📡 RECEIVED: teacher-checkin-update event');
    teacherCheckinEventReceived = true;
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
  });

  async function runTests() {
    try {
      console.log('🧪 TEST 1: Clear existing check-ins for testing...\n');

      // Clear one student check-in and one teacher check-in
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const lesson = await prisma.lesson.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          },
          status: 'scheduled'
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      if (!lesson) {
        console.log('❌ No lessons found for testing');
        socket.disconnect();
        await prisma.$disconnect();
        return;
      }

      // Clear check-ins for this lesson
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          studentCheckIn: null,
          teacherCheckIn: null
        }
      });

      console.log(`Cleared check-ins for lesson ${lesson.id}`);
      console.log('');

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🧪 TEST 2: Simulating STUDENT check-in...\n');

      // Simulate student check-in via API
      const studentResponse = await fetch('http://localhost:3335/api/student-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'studentId',
          value: lesson.studentId,
          lessonId: lesson.id
        })
      });

      const studentData = await studentResponse.json();
      console.log('Student check-in API response:', studentData.success ? '✅ Success' : '❌ Failed');

      // Wait for socket event
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (studentCheckinEventReceived) {
        console.log('✅ TEST PASSED: student-checkin-update event was received!\n');
      } else {
        console.log('❌ TEST FAILED: student-checkin-update event was NOT received\n');
      }

      console.log('🧪 TEST 3: Simulating TEACHER check-in...\n');

      // Simulate teacher check-in via lesson update API
      const teacherResponse = await fetch(`http://localhost:3335/api/lessons/${lesson.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherCheckIn: new Date().toISOString()
        })
      });

      const teacherData = await teacherResponse.json();
      console.log('Teacher check-in API response:', teacherData.success ? '✅ Success' : '❌ Failed');

      // Wait for socket event
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (teacherCheckinEventReceived) {
        console.log('✅ TEST PASSED: teacher-checkin-update event was received!\n');
      } else {
        console.log('❌ TEST FAILED: teacher-checkin-update event was NOT received\n');
      }

      // Summary
      console.log('=== TEST SUMMARY ===');
      console.log(`Student check-in event: ${studentCheckinEventReceived ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Teacher check-in event: ${teacherCheckinEventReceived ? '✅ PASS' : '❌ FAIL'}`);
      console.log('');

      if (studentCheckinEventReceived && teacherCheckinEventReceived) {
        console.log('🎉 ALL TESTS PASSED! Real-time updates are working correctly!');
        console.log('');
        console.log('The student check-in page will now update automatically when:');
        console.log('  - Any student checks in');
        console.log('  - Any teacher checks in');
      } else {
        console.log('⚠️ SOME TESTS FAILED. Check the socket connection and event emitters.');
      }

    } catch (error) {
      console.error('❌ Test error:', error.message);
    } finally {
      socket.disconnect();
      await prisma.$disconnect();
      process.exit(0);
    }
  }
}

testRealtimeUpdates().catch(console.error);
