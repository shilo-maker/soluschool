const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudents() {
  const students = await prisma.student.findMany({
    take: 5,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          pinPlainText: true,
          qrCode: true,
          isActive: true
        }
      }
    }
  });

  console.log('Students in database:\n');
  students.forEach(s => {
    console.log(`${s.user.firstName} ${s.user.lastName}:`);
    console.log(`  PIN: ${s.user.pinPlainText || '(null)'}`);
    console.log(`  QR: ${s.user.qrCode || '(null)'}`);
    console.log(`  Active: ${s.user.isActive}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkStudents().catch(console.error);
