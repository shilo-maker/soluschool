const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all students
  const students = await prisma.student.findMany({
    include: {
      user: true,
    },
  });

  console.log(`\nTotal students: ${students.length}\n`);

  if (students.length > 0) {
    console.log('Students:');
    students.forEach(s => {
      console.log(`\n- ${s.user.firstName} ${s.user.lastName}`);
      console.log(`  Email: ${s.user.email}`);
      console.log(`  Role: ${s.user.role}`);
      console.log(`  Active: ${s.user.isActive}`);
      if (s.parentName) {
        console.log(`  Parent: ${s.parentName} (${s.parentEmail || 'no email'})`);
      }
    });
  }

  // Check if any have lessons
  console.log('\n\nChecking lessons for each student:');
  for (const student of students) {
    const lessonCount = await prisma.lesson.count({
      where: { studentId: student.id },
    });

    const scheduleCount = await prisma.schedule.count({
      where: { studentId: student.id },
    });

    console.log(`\n${student.user.firstName} ${student.user.lastName}:`);
    console.log(`  - ${lessonCount} lessons`);
    console.log(`  - ${scheduleCount} recurring schedules`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
