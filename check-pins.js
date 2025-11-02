const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usersWithPins = await prisma.user.findMany({
    where: {
      OR: [
        { pin: { not: null } },
        { pinPlainText: { not: null } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      pinPlainText: true,
      pin: true,
    },
  });

  console.log(`\nUsers with PINs: ${usersWithPins.length}\n`);

  if (usersWithPins.length > 0) {
    usersWithPins.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.role})`);
      console.log(`  Email: ${user.email}`);
      console.log(`  PIN: ${user.pinPlainText || 'Hashed only'}`);
      console.log('');
    });
  } else {
    console.log('No users have PINs set up yet.');
    console.log('\nTo set up a PIN for a user, you can:');
    console.log('1. Use the admin interface to set PINs');
    console.log('2. Or run a script to set PINs for testing');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
