const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTeacherStatus() {
  console.log('=== CHECKING TEACHER CHECK-IN STATUS ===\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const lessons = await prisma.lesson.findMany({
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

  console.log(`Found ${lessons.length} lesson(s) for today:\n`);

  lessons.forEach((lesson, index) => {
    console.log(`${index + 1}. Lesson ID: ${lesson.id}`);
    console.log(`   Student: ${lesson.student.user.firstName} ${lesson.student.user.lastName}`);
    console.log(`   Teacher: ${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`);
    console.log(`   Time: ${lesson.startTime} - ${lesson.endTime}`);
    console.log(`   Instrument: ${lesson.instrument}`);
    console.log(`   Room: ${lesson.room.name}`);

    console.log(`   Student Check-in: ${lesson.studentCheckIn ? '✅ YES' : '❌ NO'}`);
    console.log(`   Teacher Check-in: ${lesson.teacherCheckIn ? '✅ YES' : '❌ NO'}`);

    if (lesson.teacherCheckIn) {
      console.log(`   Teacher checked in at: ${lesson.teacherCheckIn}`);
    }

    console.log('');
  });

  await prisma.$disconnect();
}

checkTeacherStatus().catch(console.error);
