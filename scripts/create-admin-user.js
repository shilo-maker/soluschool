/**
 * Create Admin User Script
 * Creates an admin user in the database
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🔧 Creating admin user...\n');

  try {
    const email = 'rebekah@soluisrael.org';
    const password = '123456789Rw';
    const firstName = 'Rebekah';
    const lastName = 'Admin';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  User already exists with this email!');
      console.log(`   Email: ${email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Name: ${existingUser.firstName} ${existingUser.lastName}`);

      // Ask if we should update the password
      console.log('\n✅ User already exists. No changes made.');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the admin user
    const adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'admin',
        firstName,
        lastName,
        language: 'he',
        isActive: true,
      },
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${firstName} ${lastName}`);
    console.log(`   Role: admin`);
    console.log(`   User ID: ${adminUser.id}`);
    console.log('\n🎉 You can now log in with these credentials!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
