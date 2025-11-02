const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.lesson.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billing.deleteMany();
  await prisma.student.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.room.deleteMany();
  await prisma.subsidizer.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  console.log('Creating admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@solu.school',
      password: hashedPassword,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'SOLU',
      phone: '050-1234567',
      language: 'he',
      isActive: true,
    },
  });

  // Create subsidizers
  console.log('Creating subsidizers...');
  const subsidizer1 = await prisma.subsidizer.create({
    data: {
      name: 'קרן ירושלים למוזיקה',
      email: 'jerusalem@music-fund.org',
      phone: '02-6543210',
      notes: 'תומכים בתלמידים מירושלים',
      isActive: true,
    },
  });

  const subsidizer2 = await prisma.subsidizer.create({
    data: {
      name: 'עמותת מוזיקה לכולם',
      email: 'info@music4all.org.il',
      phone: '03-7654321',
      notes: 'תמיכה לתלמידים בעלי צרכים מיוחדים',
      isActive: true,
    },
  });

  const subsidizer3 = await prisma.subsidizer.create({
    data: {
      name: 'קרן גולדשמידט',
      email: 'support@goldschmidt.org',
      phone: '04-8765432',
      notes: 'מלגות למוזיקאים מצטיינים',
      isActive: true,
    },
  });

  // Create rooms
  console.log('Creating rooms...');
  const room1 = await prisma.room.create({
    data: {
      name: 'חדר 1 - פסנתר',
      number: '101',
      capacity: 2,
      equipment: ['פסנתר', 'כיסא'],
      isActive: true,
    },
  });

  const room2 = await prisma.room.create({
    data: {
      name: 'חדר 2 - גיטרה',
      number: '102',
      capacity: 2,
      equipment: ['מגבר גיטרה', 'כיסאות'],
      isActive: true,
    },
  });

  const room3 = await prisma.room.create({
    data: {
      name: 'חדר 3 - תופים',
      number: '103',
      capacity: 2,
      equipment: ['סט תופים', 'מצ\'צים'],
      isActive: true,
    },
  });

  const room4 = await prisma.room.create({
    data: {
      name: 'אולם גדול',
      number: '201',
      capacity: 5,
      equipment: ['פסנתר', 'מערכת הגברה', 'מיקרופונים'],
      isActive: true,
    },
  });

  // Create teachers
  console.log('Creating teachers...');
  const teachers = [];

  const teacher1User = await prisma.user.create({
    data: {
      email: 'david.cohen@solu.school',
      password: await bcrypt.hash('teacher123', 10),
      role: 'teacher',
      firstName: 'דוד',
      lastName: 'כהן',
      phone: '052-1111111',
      language: 'he',
      isActive: true,
    },
  });
  const teacher1 = await prisma.teacher.create({
    data: {
      userId: teacher1User.id,
      instruments: ['פסנתר', 'קלידים'],
      lessonRate: 150,
      bio: 'מורה לפסנתר עם 15 שנות ניסיון',
    },
  });
  teachers.push(teacher1);

  const teacher2User = await prisma.user.create({
    data: {
      email: 'sarah.levi@solu.school',
      password: await bcrypt.hash('teacher123', 10),
      role: 'teacher',
      firstName: 'שרה',
      lastName: 'לוי',
      phone: '052-2222222',
      language: 'he',
      isActive: true,
    },
  });
  const teacher2 = await prisma.teacher.create({
    data: {
      userId: teacher2User.id,
      instruments: ['גיטרה קלאסית', 'גיטרה חשמלית'],
      lessonRate: 140,
      bio: 'מורה לגיטרה, בוגרת המוזיקה האקדמית',
    },
  });
  teachers.push(teacher2);

  const teacher3User = await prisma.user.create({
    data: {
      email: 'michael.israelov@solu.school',
      password: await bcrypt.hash('teacher123', 10),
      role: 'teacher',
      firstName: 'מיכאל',
      lastName: 'ישראלוב',
      phone: '052-3333333',
      language: 'he',
      isActive: true,
    },
  });
  const teacher3 = await prisma.teacher.create({
    data: {
      userId: teacher3User.id,
      instruments: ['תופים', 'כלי הקשה'],
      lessonRate: 160,
      bio: 'מתופף מקצועי עם ניסיון בלהקות מובילות',
    },
  });
  teachers.push(teacher3);

  const teacher4User = await prisma.user.create({
    data: {
      email: 'yael.mizrahi@solu.school',
      password: await bcrypt.hash('teacher123', 10),
      role: 'teacher',
      firstName: 'יעל',
      lastName: 'מזרחי',
      phone: '052-4444444',
      language: 'he',
      isActive: true,
    },
  });
  const teacher4 = await prisma.teacher.create({
    data: {
      userId: teacher4User.id,
      instruments: ['ווקאל', 'פסנתר'],
      lessonRate: 145,
      bio: 'מורה לווקאל ופסנתר, זמרת מקצועית',
    },
  });
  teachers.push(teacher4);

  const teacher5User = await prisma.user.create({
    data: {
      email: 'avi.ben-david@solu.school',
      password: await bcrypt.hash('teacher123', 10),
      role: 'teacher',
      firstName: 'אבי',
      lastName: 'בן-דוד',
      phone: '052-5555555',
      language: 'he',
      isActive: true,
    },
  });
  const teacher5 = await prisma.teacher.create({
    data: {
      userId: teacher5User.id,
      instruments: ['בס', 'גיטרה'],
      lessonRate: 135,
      bio: 'נגן בס עם ניסיון בהוראה ובהופעות',
    },
  });
  teachers.push(teacher5);

  // Create students with various subsidy configurations
  console.log('Creating students...');
  const students = [];

  // Student 1 - No additional subsidy
  const student1User = await prisma.user.create({
    data: {
      email: 'noam.shapira@student.com',
      password: await bcrypt.hash('student123', 10),
      role: 'student',
      firstName: 'נועם',
      lastName: 'שפירא',
      phone: '054-1111111',
      language: 'he',
      isActive: true,
    },
  });
  const student1 = await prisma.student.create({
    data: {
      userId: student1User.id,
      instruments: [{ instrument: 'פסנתר', level: 'beginner', teacherId: teacher1.id }],
      soluSubsidy: 30,
      additionalSubsidy: { hasSubsidy: false, subsidyPerLesson: 0, subsidizerId: null },
      parentName: 'רחל שפירא',
      parentPhone: '050-9999991',
      parentEmail: 'rachel.shapira@gmail.com',
    },
  });
  students.push(student1);

  // Student 2 - With subsidizer 1
  const student2User = await prisma.user.create({
    data: {
      email: 'tamar.cohen@student.com',
      password: await bcrypt.hash('student123', 10),
      role: 'student',
      firstName: 'תמר',
      lastName: 'כהן',
      phone: '054-2222222',
      language: 'he',
      isActive: true,
    },
  });
  const student2 = await prisma.student.create({
    data: {
      userId: student2User.id,
      instruments: [{ instrument: 'גיטרה קלאסית', level: 'intermediate', teacherId: teacher2.id }],
      soluSubsidy: 30,
      additionalSubsidy: { hasSubsidy: true, subsidyPerLesson: 40, subsidizerId: subsidizer1.id },
      parentName: 'יוסי כהן',
      parentPhone: '050-9999992',
      parentEmail: 'yossi.cohen@gmail.com',
    },
  });
  students.push(student2);

  // Student 3 - With subsidizer 2
  const student3User = await prisma.user.create({
    data: {
      email: 'daniel.levi@student.com',
      password: await bcrypt.hash('student123', 10),
      role: 'student',
      firstName: 'דניאל',
      lastName: 'לוי',
      phone: '054-3333333',
      language: 'he',
      isActive: true,
    },
  });
  const student3 = await prisma.student.create({
    data: {
      userId: student3User.id,
      instruments: [{ instrument: 'תופים', level: 'beginner', teacherId: teacher3.id }],
      soluSubsidy: 30,
      additionalSubsidy: { hasSubsidy: true, subsidyPerLesson: 50, subsidizerId: subsidizer2.id },
      parentName: 'מיכל לוי',
      parentPhone: '050-9999993',
      parentEmail: 'michal.levi@gmail.com',
    },
  });
  students.push(student3);

  // Student 4 - No additional subsidy
  const student4User = await prisma.user.create({
    data: {
      email: 'maya.israeli@student.com',
      password: await bcrypt.hash('student123', 10),
      role: 'student',
      firstName: 'מאיה',
      lastName: 'ישראלי',
      phone: '054-4444444',
      language: 'he',
      isActive: true,
    },
  });
  const student4 = await prisma.student.create({
    data: {
      userId: student4User.id,
      instruments: [{ instrument: 'ווקאל', level: 'advanced', teacherId: teacher4.id }],
      soluSubsidy: 30,
      additionalSubsidy: { hasSubsidy: false, subsidyPerLesson: 0, subsidizerId: null },
      parentName: 'אורי ישראלי',
      parentPhone: '050-9999994',
      parentEmail: 'uri.israeli@gmail.com',
    },
  });
  students.push(student4);

  // Student 5 - With subsidizer 3
  const student5User = await prisma.user.create({
    data: {
      email: 'yonatan.green@student.com',
      password: await bcrypt.hash('student123', 10),
      role: 'student',
      firstName: 'יונתן',
      lastName: 'גרין',
      phone: '054-5555555',
      language: 'he',
      isActive: true,
    },
  });
  const student5 = await prisma.student.create({
    data: {
      userId: student5User.id,
      instruments: [{ instrument: 'בס', level: 'intermediate', teacherId: teacher5.id }],
      soluSubsidy: 30,
      additionalSubsidy: { hasSubsidy: true, subsidyPerLesson: 35, subsidizerId: subsidizer3.id },
      parentName: 'דינה גרין',
      parentPhone: '050-9999995',
      parentEmail: 'dina.green@gmail.com',
    },
  });
  students.push(student5);

  // Add more students with various configurations
  // Create instrument-teacher mappings for proper assignment
  const instrumentTeacherMap = [
    { instrument: 'פסנתר', teacher: teacher1 },
    { instrument: 'קלידים', teacher: teacher1 },
    { instrument: 'גיטרה קלאסית', teacher: teacher2 },
    { instrument: 'גיטרה חשמלית', teacher: teacher2 },
    { instrument: 'גיטרה', teacher: teacher2 },
    { instrument: 'תופים', teacher: teacher3 },
    { instrument: 'כלי הקשה', teacher: teacher3 },
    { instrument: 'ווקאל', teacher: teacher4 },
    { instrument: 'בס', teacher: teacher5 },
  ];

  for (let i = 6; i <= 12; i++) {
    const studentUser = await prisma.user.create({
      data: {
        email: `student${i}@student.com`,
        password: await bcrypt.hash('student123', 10),
        role: 'student',
        firstName: `תלמיד${i}`,
        lastName: 'בדיקה',
        phone: `054-${i}${i}${i}${i}${i}${i}${i}`,
        language: 'he',
        isActive: true,
      },
    });

    // Pick a random instrument-teacher pair that matches
    const randomMapping = instrumentTeacherMap[Math.floor(Math.random() * instrumentTeacherMap.length)];
    const hasSubsidy = i % 3 === 0; // Every 3rd student has additional subsidy
    const subsidizers = [subsidizer1, subsidizer2, subsidizer3];
    const randomSubsidizer = subsidizers[i % 3];

    const student = await prisma.student.create({
      data: {
        userId: studentUser.id,
        instruments: [{ instrument: randomMapping.instrument, level: 'beginner', teacherId: randomMapping.teacher.id }],
        soluSubsidy: 30,
        additionalSubsidy: hasSubsidy
          ? { hasSubsidy: true, subsidyPerLesson: 30 + (i % 3) * 10, subsidizerId: randomSubsidizer.id }
          : { hasSubsidy: false, subsidyPerLesson: 0, subsidizerId: null },
        parentName: `הורה${i}`,
        parentPhone: `050-999999${i}`,
        parentEmail: `parent${i}@gmail.com`,
      },
    });
    students.push(student);
  }

  console.log(`Created ${students.length} students`);

  // Create schedules for students
  console.log('Creating schedules...');
  const daysOfWeek = [0, 1, 2, 3, 4]; // 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday
  const roomsList = [room1, room2, room3, room4];

  // Date calculations for lessons
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(today.getMonth() - 1);

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    // Use the teacher assigned to this student's instrument
    const teacherId = student.instruments[0].teacherId;
    const day = daysOfWeek[i % daysOfWeek.length];
    const hour = 14 + (i % 6); // Between 14:00-20:00
    const room = roomsList[i % roomsList.length];

    await prisma.schedule.create({
      data: {
        teacherId: teacherId,
        studentId: student.id,
        roomId: room.id,
        instrument: student.instruments[0].instrument,
        dayOfWeek: day,
        startTime: `${hour.toString().padStart(2, '0')}:00`,
        endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
        effectiveFrom: oneMonthAgo,
        isActive: true,
      },
    });
  }

  // Create completed lessons for the past month to test payment system
  console.log('Creating completed lessons...');
  let lessonCount = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    // Use the teacher assigned to this student's instrument
    const teacherId = student.instruments[0].teacherId;
    const room = roomsList[i % roomsList.length];

    // Create 4-8 lessons per student in the past month
    const numLessons = 4 + Math.floor(Math.random() * 5);

    for (let j = 0; j < numLessons; j++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const lessonDate = new Date(today);
      lessonDate.setDate(today.getDate() - daysAgo);
      lessonDate.setHours(0, 0, 0, 0);

      const hour = 14 + (j % 6);

      await prisma.lesson.create({
        data: {
          teacherId: teacherId,
          studentId: student.id,
          roomId: room.id,
          instrument: student.instruments[0].instrument,
          date: lessonDate,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          duration: 60,
          status: 'completed',
          teacherCheckIn: new Date(lessonDate.getTime() + hour * 60 * 60 * 1000),
          studentCheckIn: new Date(lessonDate.getTime() + hour * 60 * 60 * 1000 + 2 * 60 * 1000),
          teacherCheckOut: new Date(lessonDate.getTime() + (hour + 1) * 60 * 60 * 1000),
          studentCheckOut: new Date(lessonDate.getTime() + (hour + 1) * 60 * 60 * 1000 - 2 * 60 * 1000),
          // Leave payments as false to test the payment system
          studentPaid: false,
          soluPaid: false,
          subsidizerPaid: false,
        },
      });

      lessonCount++;
    }
  }

  console.log(`Created ${lessonCount} completed lessons`);

  // Create a few scheduled future lessons
  console.log('Creating future scheduled lessons...');
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    // Use the teacher assigned to this student's instrument
    const teacherId = student.instruments[0].teacherId;
    const room = roomsList[i % roomsList.length];

    for (let j = 1; j <= 3; j++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + j * 7); // Next 3 weeks
      futureDate.setHours(0, 0, 0, 0);

      const hour = 14 + (i % 6);

      await prisma.lesson.create({
        data: {
          teacherId: teacherId,
          studentId: student.id,
          roomId: room.id,
          instrument: student.instruments[0].instrument,
          date: futureDate,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          duration: 60,
          status: 'scheduled',
        },
      });
    }
  }

  console.log('Database seeding completed!');
  console.log('---');
  console.log('Admin credentials:');
  console.log('Email: admin@solu.school');
  console.log('Password: admin123');
  console.log('---');
  console.log(`Teachers: ${teachers.length}`);
  console.log(`Students: ${students.length}`);
  console.log(`Subsidizers: 3`);
  console.log(`Rooms: 4`);
  console.log(`Completed Lessons: ${lessonCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
