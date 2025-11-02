const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestLesson() {
  console.log('=== CREATING TEST LESSON FOR CHECK-IN ===\n');

  // Get first active student
  const student = await prisma.student.findFirst({
    where: {
      user: {
        isActive: true
      }
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          qrCode: true,
          pinPlainText: true
        }
      }
    }
  });

  // Get first teacher
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

  // Get first room
  const room = await prisma.room.findFirst();

  if (!student || !teacher || !room) {
    console.log('❌ Missing student, teacher, or room');
    await prisma.$disconnect();
    return;
  }

  // Create lesson starting in 15 minutes
  const now = new Date();
  const lessonStart = new Date(now.getTime() + 15 * 60 * 1000);
  const lessonEnd = new Date(lessonStart.getTime() + 60 * 60 * 1000);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startTime = `${String(lessonStart.getHours()).padStart(2, '0')}:${String(lessonStart.getMinutes()).padStart(2, '0')}`;
  const endTime = `${String(lessonEnd.getHours()).padStart(2, '0')}:${String(lessonEnd.getMinutes()).padStart(2, '0')}`;

  const lesson = await prisma.lesson.create({
    data: {
      teacherId: teacher.id,
      studentId: student.id,
      roomId: room.id,
      instrument: 'גיטרה',
      date: today,
      startTime: startTime,
      endTime: endTime,
      duration: 60,
      status: 'scheduled'
    }
  });

  console.log('✅ LESSON CREATED!\n');
  console.log('📋 Lesson Details:');
  console.log(`   ID: ${lesson.id}`);
  console.log(`   Time: ${startTime} - ${endTime}`);
  console.log(`   Instrument: ${lesson.instrument}`);
  console.log(`   Room: ${room.name}`);
  console.log('');

  console.log('👤 Student Info (for testing):');
  console.log(`   Name: ${student.user.firstName} ${student.user.lastName}`);
  console.log(`   PIN: ${student.user.pinPlainText}`);
  console.log(`   QR Code: ${student.user.qrCode}`);
  console.log('');

  console.log('🌐 Test the check-in at:');
  console.log('   http://localhost:3335/student-check-in');
  console.log('');
  console.log('💡 You can try:');
  console.log('   1. Click on visual selector - you should see the student');
  console.log(`   2. Use PIN: ${student.user.pinPlainText}`);
  console.log(`   3. Use QR: ${student.user.qrCode}`);

  await prisma.$disconnect();
}

createTestLesson().catch(console.error);
