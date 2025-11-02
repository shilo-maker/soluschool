const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function teacherCheckIn() {
  console.log('=== TEACHER CHECK-IN (ALL REMAINING LESSONS) ===\n');

  // Get teacher דוד כהן
  const teacher = await prisma.teacher.findFirst({
    where: {
      user: {
        firstName: 'דוד',
        lastName: 'כהן'
      }
    },
    include: {
      user: true
    }
  });

  if (!teacher) {
    console.log('❌ Teacher not found');
    await prisma.$disconnect();
    return;
  }

  // Get current time
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Find all lessons for this teacher for the rest of today
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId: teacher.id,
      date: {
        gte: today,
        lt: tomorrow
      },
      status: 'scheduled',
      startTime: {
        gte: currentTime // Only lessons that haven't started yet or are happening now
      }
    },
    include: {
      student: {
        include: {
          user: true
        }
      },
      room: true
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  console.log(`Found ${lessons.length} remaining lesson(s) for ${teacher.user.firstName} ${teacher.user.lastName}\n`);

  if (lessons.length === 0) {
    console.log('No remaining lessons to check in to');
    await prisma.$disconnect();
    return;
  }

  // Check in to all remaining lessons
  const checkInTime = new Date();

  for (const lesson of lessons) {
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        teacherCheckIn: checkInTime
      }
    });

    console.log(`✅ Checked in to lesson:`);
    console.log(`   Student: ${lesson.student.user.firstName} ${lesson.student.user.lastName}`);
    console.log(`   Time: ${lesson.startTime} - ${lesson.endTime}`);
    console.log(`   Room: ${lesson.room.name}`);
    console.log('');
  }

  console.log(`🎯 ${teacher.user.firstName} ${teacher.user.lastName} is now checked in to all ${lessons.length} remaining lessons!`);
  console.log('Refresh the page to see all green "הגיע" badges!');

  await prisma.$disconnect();
}

teacherCheckIn().catch(console.error);
