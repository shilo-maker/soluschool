const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCheckIn() {
  console.log('=== VERIFYING CHECK-IN STATUS ===\n');

  // Get today's lessons for the student we created
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysLessons = await prisma.lesson.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow
      },
      status: 'scheduled'
    },
    include: {
      student: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      teacher: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      },
      room: true
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  console.log(`Found ${todaysLessons.length} lesson(s) for today:\n`);

  todaysLessons.forEach((lesson, index) => {
    console.log(`${index + 1}. Lesson ID: ${lesson.id}`);
    console.log(`   Student: ${lesson.student.user.firstName} ${lesson.student.user.lastName}`);
    console.log(`   Teacher: ${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`);
    console.log(`   Time: ${lesson.startTime} - ${lesson.endTime}`);
    console.log(`   Instrument: ${lesson.instrument}`);
    console.log(`   Room: ${lesson.room.name}`);

    if (lesson.studentCheckIn) {
      const checkInTime = new Date(lesson.studentCheckIn);
      console.log(`   ✅ CHECKED IN at: ${checkInTime.toLocaleTimeString('he-IL')}`);
      console.log(`   Check-in timestamp: ${lesson.studentCheckIn}`);
    } else {
      console.log(`   ❌ NOT checked in yet`);
    }

    console.log('');
  });

  await prisma.$disconnect();
}

verifyCheckIn().catch(console.error);
