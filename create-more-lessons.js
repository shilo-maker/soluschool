const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMoreLessons() {
  console.log('=== CREATING 3 MORE TEST LESSONS ===\n');

  // Get active students (excluding נועם שפירא)
  const students = await prisma.student.findMany({
    where: {
      user: {
        isActive: true,
        NOT: {
          firstName: 'נועם',
          lastName: 'שפירא'
        }
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
    },
    take: 3 // Get 3 different students
  });

  if (students.length < 3) {
    console.log(`❌ Need at least 3 students (excluding נועם שפירא), found only ${students.length}`);
    await prisma.$disconnect();
    return;
  }

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

  if (!teacher || !room) {
    console.log('❌ Missing teacher or room');
    await prisma.$disconnect();
    return;
  }

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const instruments = ['גיטרה', 'פסנתר', 'תופים'];

  // Lesson times: +10 minutes, +50 minutes, +2 hours
  const lessonOffsets = [
    { minutes: 10, duration: 60 },
    { minutes: 50, duration: 60 },
    { minutes: 120, duration: 60 }
  ];

  const createdLessons = [];

  for (let i = 0; i < 3; i++) {
    const student = students[i];
    const offset = lessonOffsets[i];

    const lessonStart = new Date(now.getTime() + offset.minutes * 60 * 1000);
    const lessonEnd = new Date(lessonStart.getTime() + offset.duration * 60 * 1000);

    const startTime = `${String(lessonStart.getHours()).padStart(2, '0')}:${String(lessonStart.getMinutes()).padStart(2, '0')}`;
    const endTime = `${String(lessonEnd.getHours()).padStart(2, '0')}:${String(lessonEnd.getMinutes()).padStart(2, '0')}`;

    const lesson = await prisma.lesson.create({
      data: {
        teacherId: teacher.id,
        studentId: student.id,
        roomId: room.id,
        instrument: instruments[i % instruments.length],
        date: today,
        startTime: startTime,
        endTime: endTime,
        duration: offset.duration,
        status: 'scheduled'
      }
    });

    createdLessons.push({
      lesson,
      student,
      startTime,
      endTime,
      offsetMinutes: offset.minutes
    });
  }

  console.log('✅ ALL LESSONS CREATED!\n');

  createdLessons.forEach((item, index) => {
    console.log(`${index + 1}. 📋 Lesson (starts in ${item.offsetMinutes} minutes):`);
    console.log(`   ID: ${item.lesson.id}`);
    console.log(`   Student: ${item.student.user.firstName} ${item.student.user.lastName}`);
    console.log(`   PIN: ${item.student.user.pinPlainText}`);
    console.log(`   QR Code: ${item.student.user.qrCode}`);
    console.log(`   Time: ${item.startTime} - ${item.endTime}`);
    console.log(`   Instrument: ${item.lesson.instrument}`);
    console.log(`   Room: ${room.name}`);
    console.log('');
  });

  console.log('🌐 Test the check-in at:');
  console.log('   http://localhost:3335/student-check-in');
  console.log('');
  console.log('💡 All students should now appear in the visual selector!');

  await prisma.$disconnect();
}

createMoreLessons().catch(console.error);
