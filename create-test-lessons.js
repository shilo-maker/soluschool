const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestLessons() {
  try {
    console.log('=== CREATING 5 TEST LESSONS ===\n');

    // Get students (excluding נועם שפירא if needed)
    const students = await prisma.student.findMany({
      take: 5,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (students.length < 5) {
      console.log('❌ Not enough students in the database');
      return;
    }

    // Get a teacher
    const teacher = await prisma.teacher.findFirst({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Get rooms
    const rooms = await prisma.room.findMany({
      take: 3
    });

    const instruments = ['גיטרה', 'פסנתר', 'תופים', 'חליל', 'כינור'];

    // Create lessons at different times
    const now = new Date();
    const lessonOffsets = [
      { minutes: 5, duration: 60 },   // In 5 minutes
      { minutes: 15, duration: 60 },  // In 15 minutes
      { minutes: 25, duration: 60 },  // In 25 minutes
      { minutes: 35, duration: 60 },  // In 35 minutes
      { minutes: 50, duration: 60 }   // In 50 minutes
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Creating lessons:\n');

    for (let i = 0; i < 5; i++) {
      const student = students[i];
      const offset = lessonOffsets[i];
      const room = rooms[i % rooms.length];
      const instrument = instruments[i % instruments.length];

      const lessonStart = new Date(now.getTime() + offset.minutes * 60 * 1000);
      const lessonEnd = new Date(lessonStart.getTime() + offset.duration * 60 * 1000);

      // Format times
      const startTime = lessonStart.toTimeString().slice(0, 5);
      const endTime = lessonEnd.toTimeString().slice(0, 5);

      const lesson = await prisma.lesson.create({
        data: {
          teacherId: teacher.id,
          studentId: student.id,
          roomId: room.id,
          instrument: instrument,
          date: today,
          startTime: startTime,
          endTime: endTime,
          duration: offset.duration,
          status: 'scheduled'
        }
      });

      console.log(`✅ Lesson ${i + 1}:`);
      console.log(`   Student: ${student.user.firstName} ${student.user.lastName}`);
      console.log(`   Instrument: ${instrument}`);
      console.log(`   Room: ${room.name}`);
      console.log(`   Time: ${startTime} - ${endTime} (in ${offset.minutes} minutes)`);
      console.log(`   Lesson ID: ${lesson.id}`);
      console.log('');
    }

    console.log('🎉 Successfully created 5 test lessons!');
    console.log('\nYou can now test the student check-in page at:');
    console.log('http://localhost:3335/student-check-in');

  } catch (error) {
    console.error('❌ Error creating test lessons:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestLessons();
