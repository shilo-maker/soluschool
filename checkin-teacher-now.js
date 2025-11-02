const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkinTeacherNow() {
  console.log('=== CHECKING IN TEACHER דוד כהן ===\n');

  // Get lessons happening now or soon
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get all lessons for today
  const lessons = await prisma.lesson.findMany({
    where: {
      date: {
        gte: today,
        lt: tomorrow
      },
      status: 'scheduled',
      teacherCheckIn: null // Not checked in yet
    },
    include: {
      teacher: {
        include: {
          user: true
        }
      },
      student: {
        include: {
          user: true
        }
      },
      room: true
    },
    orderBy: {
      startTime: 'asc'
    },
    take: 1 // Get first unchecked lesson
  });

  if (lessons.length === 0) {
    console.log('❌ No lessons found that need teacher check-in');
    await prisma.$disconnect();
    return;
  }

  const lesson = lessons[0];

  // Check in teacher
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      teacherCheckIn: new Date()
    }
  });

  console.log('✅ TEACHER CHECKED IN!');
  console.log(`   Lesson ID: ${lesson.id}`);
  console.log(`   Teacher: ${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`);
  console.log(`   Student: ${lesson.student.user.firstName} ${lesson.student.user.lastName}`);
  console.log(`   Time: ${lesson.startTime} - ${lesson.endTime}`);
  console.log(`   Room: ${lesson.room.name}`);
  console.log('');
  console.log('🎯 Refresh the page to see the green "הגיע" badge!');

  await prisma.$disconnect();
}

checkinTeacherNow().catch(console.error);
