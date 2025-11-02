const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Check teacher passwords
  const users = await prisma.user.findMany({
    where: {
      email: { in: ['yosef@soluisrael.org', 'boris@soluisrael.org', 'shilo@soluisrael.org'] }
    },
    select: {
      email: true,
      firstName: true,
      password: true,
      pinPlainText: true
    }
  });

  console.log('Teacher accounts:');
  users.forEach(u => {
    console.log(`- ${u.email}: Password ${u.password ? 'SET' : 'NOT SET'}, PIN: ${u.pinPlainText || 'NOT SET'}`);
  });

  // Check lessons
  const lessons = await prisma.lesson.findMany({
    include: {
      teacher: {
        include: {
          user: { select: { firstName: true, lastName: true } }
        }
      }
    }
  });

  console.log(`\nTotal lessons in database: ${lessons.length}`);

  const lessonsByTeacher = {};
  lessons.forEach(l => {
    const teacherName = `${l.teacher.user.firstName} ${l.teacher.user.lastName}`;
    lessonsByTeacher[teacherName] = (lessonsByTeacher[teacherName] || 0) + 1;
  });

  console.log('Lessons by teacher:');
  Object.entries(lessonsByTeacher).forEach(([name, count]) => {
    console.log(`- ${name}: ${count} lessons`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
