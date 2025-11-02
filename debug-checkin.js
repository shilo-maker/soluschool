const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCheckIn() {
  console.log('=== DEBUG STUDENT CHECK-IN ===\n');

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
          pinPlainText: true,
          isActive: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!student) {
    console.log('❌ No active students found');
    await prisma.$disconnect();
    return;
  }

  console.log('Found student:');
  console.log(`  Name: ${student.user.firstName} ${student.user.lastName}`);
  console.log(`  ID: ${student.id}`);
  console.log(`  User ID: ${student.user.id}`);
  console.log(`  PIN: ${student.user.pinPlainText || '(null)'}`);
  console.log(`  QR: ${student.user.qrCode || '(null)'}`);
  console.log(`  Active: ${student.user.isActive}`);
  console.log('');

  // Test QR code search
  if (student.user.qrCode) {
    console.log(`Testing QR code search for: ${student.user.qrCode}`);
    const foundByQr = await prisma.student.findFirst({
      where: {
        user: {
          qrCode: student.user.qrCode,
          isActive: true
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (foundByQr) {
      console.log(`✅ Found by QR: ${foundByQr.user.firstName} ${foundByQr.user.lastName} (ID: ${foundByQr.id})`);
    } else {
      console.log(`❌ NOT found by QR code`);
    }
    console.log('');
  }

  // Test PIN search
  if (student.user.pinPlainText) {
    console.log(`Testing PIN search for: ${student.user.pinPlainText}`);
    const foundByPin = await prisma.student.findFirst({
      where: {
        user: {
          pinPlainText: student.user.pinPlainText,
          isActive: true
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (foundByPin) {
      console.log(`✅ Found by PIN: ${foundByPin.user.firstName} ${foundByPin.user.lastName} (ID: ${foundByPin.id})`);
    } else {
      console.log(`❌ NOT found by PIN`);
    }
    console.log('');
  }

  // Test student ID search
  console.log(`Testing student ID search for: ${student.id}`);
  const foundById = await prisma.student.findUnique({
    where: {
      id: student.id
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isActive: true
        }
      }
    }
  });

  if (foundById && foundById.user.isActive) {
    console.log(`✅ Found by ID: ${foundById.user.firstName} ${foundById.user.lastName}`);
  } else {
    console.log(`❌ NOT found by ID or inactive`);
  }
  console.log('');

  // Check today's lessons
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysLessons = await prisma.lesson.findMany({
    where: {
      studentId: student.id,
      date: {
        gte: today,
        lt: tomorrow
      },
      status: 'scheduled'
    }
  });

  console.log(`Today's lessons for this student: ${todaysLessons.length}`);
  todaysLessons.forEach(lesson => {
    console.log(`  - ${lesson.instrument} at ${lesson.startTime}-${lesson.endTime} (ID: ${lesson.id})`);
  });

  await prisma.$disconnect();
}

debugCheckIn().catch(console.error);
