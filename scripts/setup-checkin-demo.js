/**
 * Setup Demo Data for Student Check-In
 * Creates students, teachers, rooms, and lessons for testing check-in
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupCheckInDemo() {
  try {
    console.log('🎬 Setting up Student Check-In Demo Data\n');
    console.log('═══════════════════════════════════════════\n');

    // Get current time
    const now = new Date();
    console.log(`⏰ Current Time: ${now.toLocaleString()}\n`);

    // Calculate lesson times (starting in 10 minutes, 30 minutes, and 50 minutes)
    const lesson1Start = new Date(now.getTime() + 10 * 60 * 1000);
    const lesson2Start = new Date(now.getTime() + 30 * 60 * 1000);
    const lesson3Start = new Date(now.getTime() + 50 * 60 * 1000);

    const formatTime = (date) => {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const lesson1End = new Date(lesson1Start.getTime() + 45 * 60 * 1000);
    const lesson2End = new Date(lesson2Start.getTime() + 45 * 60 * 1000);
    const lesson3End = new Date(lesson3Start.getTime() + 45 * 60 * 1000);

    console.log('📅 Lessons will be scheduled for:');
    console.log(`   Lesson 1: ${formatTime(lesson1Start)} - ${formatTime(lesson1End)} (in 10 min)`);
    console.log(`   Lesson 2: ${formatTime(lesson2Start)} - ${formatTime(lesson2End)} (in 30 min)`);
    console.log(`   Lesson 3: ${formatTime(lesson3Start)} - ${formatTime(lesson3End)} (in 50 min)\n`);

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create or find teacher
    console.log('👨‍🏫 Creating/Finding Teacher...');
    let teacher = await prisma.teacher.findFirst({
      include: { user: true }
    });

    if (!teacher) {
      const hashedPassword = await bcrypt.hash('teacher123', 10);
      const teacherUser = await prisma.user.create({
        data: {
          email: 'demo.teacher@soluschool.com',
          password: hashedPassword,
          firstName: 'דמו',
          lastName: 'מורה',
          role: 'teacher',
          isActive: true,
          language: 'he',
          pinPlainText: '1234'
        }
      });

      teacher = await prisma.teacher.create({
        data: {
          userId: teacherUser.id,
          instruments: ['פסנתר', 'גיטרה'],
          lessonRate: 150
        },
        include: { user: true }
      });
      console.log(`   ✅ Created teacher: ${teacher.user.firstName} ${teacher.user.lastName}\n`);
    } else {
      console.log(`   ✅ Using existing teacher: ${teacher.user.firstName} ${teacher.user.lastName}\n`);
    }

    // Create or find rooms
    console.log('🚪 Creating/Finding Rooms...');
    let room1 = await prisma.room.findFirst({ where: { name: 'חדר 1' } });
    if (!room1) {
      room1 = await prisma.room.create({
        data: {
          name: 'חדר 1',
          number: '1',
          capacity: 2,
          isActive: true
        }
      });
      console.log(`   ✅ Created room: ${room1.name}`);
    } else {
      console.log(`   ✅ Using existing room: ${room1.name}`);
    }

    let room2 = await prisma.room.findFirst({ where: { name: 'חדר 2' } });
    if (!room2) {
      room2 = await prisma.room.create({
        data: {
          name: 'חדר 2',
          number: '2',
          capacity: 2,
          isActive: true
        }
      });
      console.log(`   ✅ Created room: ${room2.name}`);
    } else {
      console.log(`   ✅ Using existing room: ${room2.name}`);
    }

    let room3 = await prisma.room.findFirst({ where: { name: 'חדר 3' } });
    if (!room3) {
      room3 = await prisma.room.create({
        data: {
          name: 'חדר 3',
          number: '3',
          capacity: 2,
          isActive: true
        }
      });
      console.log(`   ✅ Created room: ${room3.name}\n`);
    } else {
      console.log(`   ✅ Using existing room: ${room3.name}\n`);
    }

    // Create students
    console.log('👨‍🎓 Creating Students...');
    const students = [];

    for (let i = 1; i <= 3; i++) {
      const hashedPassword = await bcrypt.hash('student123', 10);
      const studentUser = await prisma.user.create({
        data: {
          email: `student${i}@demo.com`,
          password: hashedPassword,
          firstName: `תלמיד${i}`,
          lastName: 'דמו',
          role: 'student',
          isActive: true,
          language: 'he',
          pinPlainText: `000${i}`,
          qrCode: `DEMO-STUDENT-${i}`
        }
      });

      const student = await prisma.student.create({
        data: {
          userId: studentUser.id,
          instruments: i === 1 ? ['פסנתר'] : i === 2 ? ['גיטרה'] : ['כינור'],
          parentName: `הורה דמו ${i}`,
          parentPhone: `050-000-000${i}`,
          parentEmail: `parent${i}@demo.com`
        },
        include: { user: true }
      });

      students.push(student);
      console.log(`   ✅ Created: ${student.user.firstName} ${student.user.lastName} (PIN: ${studentUser.pinPlainText}, QR: ${studentUser.qrCode})`);
    }
    console.log('');

    // Create lessons
    console.log('📚 Creating Lessons...');

    const lesson1 = await prisma.lesson.create({
      data: {
        teacherId: teacher.id,
        studentId: students[0].id,
        roomId: room1.id,
        date: today,
        startTime: formatTime(lesson1Start),
        endTime: formatTime(lesson1End),
        duration: 45,
        instrument: 'פסנתר',
        status: 'scheduled'
      }
    });
    console.log(`   ✅ Lesson 1: ${students[0].user.firstName} - פסנתר - ${formatTime(lesson1Start)}`);

    const lesson2 = await prisma.lesson.create({
      data: {
        teacherId: teacher.id,
        studentId: students[1].id,
        roomId: room2.id,
        date: today,
        startTime: formatTime(lesson2Start),
        endTime: formatTime(lesson2End),
        duration: 45,
        instrument: 'גיטרה',
        status: 'scheduled'
      }
    });
    console.log(`   ✅ Lesson 2: ${students[1].user.firstName} - גיטרה - ${formatTime(lesson2Start)}`);

    const lesson3 = await prisma.lesson.create({
      data: {
        teacherId: teacher.id,
        studentId: students[2].id,
        roomId: room3.id,
        date: today,
        startTime: formatTime(lesson3Start),
        endTime: formatTime(lesson3End),
        duration: 45,
        instrument: 'כינור',
        status: 'scheduled'
      }
    });
    console.log(`   ✅ Lesson 3: ${students[2].user.firstName} - כינור - ${formatTime(lesson3Start)}\n`);

    console.log('═══════════════════════════════════════════');
    console.log('✅ Demo Setup Complete!\n');
    console.log('📋 Summary:');
    console.log(`   • Teacher: ${teacher.user.firstName} ${teacher.user.lastName}`);
    console.log(`   • Students: ${students.length}`);
    console.log(`   • Rooms: 3`);
    console.log(`   • Lessons: 3 (all scheduled for today)\n`);

    console.log('🎯 Next Steps:');
    console.log('   1. Go to http://localhost:3334/student-check-in');
    console.log('   2. You should see all 3 students ready to check in');
    console.log('   3. Click on any student to check them in\n');

    console.log('👤 Student Login Credentials:');
    students.forEach((s, i) => {
      console.log(`   • ${s.user.firstName}: PIN ${s.user.pinPlainText} or QR ${s.user.qrCode}`);
    });
    console.log('');

    console.log('🔴 Live Page:');
    console.log('   • Go to http://localhost:3334/live');
    console.log('   • All 3 rooms will show with upcoming lessons\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupCheckInDemo();
