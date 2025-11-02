const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'boris@soluisrael.org' },
    select: {
      id: true,
      email: true,
      firstName: true,
      role: true,
    }
  });

  console.log('Boris user account:', user);

  if (user) {
    const teacher = await prisma.teacher.findFirst({
      where: { userId: user.id },
    });
    console.log('Boris teacher record:', teacher);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
