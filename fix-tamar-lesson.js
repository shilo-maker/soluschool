const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  await prisma.lesson.update({
    where: { id: 'cmhesdfk90001fci4clu4z6dv' },
    data: { teacherCheckIn: new Date() }
  });
  console.log('✅ Teacher checked in to תמר כהן lesson');
  await prisma.$disconnect();
})();
