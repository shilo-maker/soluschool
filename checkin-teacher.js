const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkinTeacher() {
  console.log('=== CHECKING IN TEACHER FOR FIRST LESSON ===\n');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get first lesson
  const lesson = await prisma.lesson.findFirst({
    where: {
      date: {
        gte: today,
        lt: tomorrow
      },
      status: 'scheduled'
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
      }
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  if (!lesson) {
    console.log('No lessons found');
    await prisma.$disconnect();
    return;
  }

  // Check in teacher
  await prisma.lesson.update({
    where: { id: lesson.id },
    data: {
      teacherCheckIn: new Date()
    }
  });

  console.log('✅ Teacher checked in successfully!');
  console.log(`   Lesson ID: ${lesson.id}`);
  console.log(`   Teacher: ${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`);
  console.log(`   Student: ${lesson.student.user.firstName} ${lesson.student.user.lastName}`);
  console.log(`   Time: ${lesson.startTime} - ${lesson.endTime}`);
  console.log('');
  console.log('Now the teacher should show as checked in on the student check-in page!');

  await prisma.$disconnect();
}

checkinTeacher().catch(console.error);
