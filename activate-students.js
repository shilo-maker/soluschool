const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function activateStudents() {
  console.log('Activating all students...\n');

  // Get all students where user is inactive
  const inactiveStudents = await prisma.student.findMany({
    where: {
      user: {
        isActive: false
      }
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

  console.log(`Found ${inactiveStudents.length} inactive students\n`);

  for (const student of inactiveStudents) {
    await prisma.user.update({
      where: { id: student.user.id },
      data: { isActive: true }
    });
    console.log(`✅ Activated: ${student.user.firstName} ${student.user.lastName}`);
  }

  console.log(`\n✅ Activated ${inactiveStudents.length} students`);

  await prisma.$disconnect();
}

activateStudents().catch(console.error);
