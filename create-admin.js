// Create Admin User Script
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...\n');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.firstName, existingAdmin.lastName);
      console.log('\nIf you forgot the password, delete this user and run this script again.\n');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Generate PIN
    const pin = Math.random().toString(36).substring(2, 6).toUpperCase();
    const hashedPin = await bcrypt.hash(pin, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@soluschool.com',
        password: hashedPassword,
        pin: hashedPin,
        pinPlainText: pin,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        phone: '054-000-0000',
        language: 'he',
        isActive: true,
      }
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('=================================');
    console.log('Login Credentials:');
    console.log('=================================');
    console.log('📧 Email:    admin@soluschool.com');
    console.log('🔑 Password: admin123');
    console.log('📌 PIN:      ' + pin);
    console.log('=================================\n');
    console.log('⚠️  IMPORTANT: Change the password after first login!\n');
    console.log('You can now start the server with: npm run dev\n');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 'P2002') {
      console.log('\n💡 An admin user with this email already exists.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
