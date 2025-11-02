const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateStudentAuth() {
  console.log('Populating student authentication data...\n');

  const students = await prisma.student.findMany({
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          pinPlainText: true,
          qrCode: true
        }
      }
    },
    orderBy: {
      id: 'asc'
    }
  });

  console.log(`Found ${students.length} students\n`);

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const needsUpdate = !student.user.pinPlainText || !student.user.qrCode;

    if (needsUpdate) {
      const pin = (1000 + i + 1).toString(); // 1001, 1002, 1003, etc.
      const qrCode = `QR-STU-${String(i + 1).padStart(3, '0')}`; // QR-STU-001, QR-STU-002, etc.

      await prisma.user.update({
        where: { id: student.user.id },
        data: {
          pinPlainText: pin,
          qrCode: qrCode
        }
      });

      console.log(`✓ Updated ${student.user.firstName} ${student.user.lastName}:`);
      console.log(`  PIN: ${pin}`);
      console.log(`  QR: ${qrCode}`);
      console.log('');
      updated++;
    } else {
      console.log(`- Skipped ${student.user.firstName} ${student.user.lastName} (already has auth data)`);
      skipped++;
    }
  }

  console.log('\n=================================');
  console.log(`Updated: ${updated} students`);
  console.log(`Skipped: ${skipped} students`);
  console.log(`Total: ${students.length} students`);
  console.log('=================================\n');

  await prisma.$disconnect();
}

populateStudentAuth().catch(console.error);
