/**
 * Database Reset Script
 * Cleans all data from the database while preserving the schema
 * Run with: node scripts/reset-database.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // Delete data in correct order (respecting foreign key constraints)
    // Start with tables that have no dependencies, work backwards

    console.log('Deleting notifications...');
    const notifications = await prisma.notification.deleteMany({});
    console.log(`✅ Deleted ${notifications.count} notifications`);

    console.log('Deleting substitute requests...');
    const substituteRequests = await prisma.substituteRequest.deleteMany({});
    console.log(`✅ Deleted ${substituteRequests.count} substitute requests`);

    console.log('Deleting teacher absences...');
    const teacherAbsences = await prisma.teacherAbsence.deleteMany({});
    console.log(`✅ Deleted ${teacherAbsences.count} teacher absences`);

    console.log('Deleting payments...');
    const payments = await prisma.payment.deleteMany({});
    console.log(`✅ Deleted ${payments.count} payments`);

    console.log('Deleting billings...');
    const billings = await prisma.billing.deleteMany({});
    console.log(`✅ Deleted ${billings.count} billings`);

    console.log('Deleting lessons...');
    const lessons = await prisma.lesson.deleteMany({});
    console.log(`✅ Deleted ${lessons.count} lessons`);

    console.log('Deleting schedules...');
    const schedules = await prisma.schedule.deleteMany({});
    console.log(`✅ Deleted ${schedules.count} schedules`);

    console.log('Deleting rooms...');
    const rooms = await prisma.room.deleteMany({});
    console.log(`✅ Deleted ${rooms.count} rooms`);

    console.log('Deleting subsidizers...');
    const subsidizers = await prisma.subsidizer.deleteMany({});
    console.log(`✅ Deleted ${subsidizers.count} subsidizers`);

    console.log('Deleting students...');
    const students = await prisma.student.deleteMany({});
    console.log(`✅ Deleted ${students.count} students`);

    console.log('Deleting teachers...');
    const teachers = await prisma.teacher.deleteMany({});
    console.log(`✅ Deleted ${teachers.count} teachers`);

    console.log('Deleting users...');
    const users = await prisma.user.deleteMany({});
    console.log(`✅ Deleted ${users.count} users`);

    console.log('\n✨ Database cleanup completed successfully!');
    console.log('📊 Summary:');
    console.log(`   - ${users.count} users`);
    console.log(`   - ${teachers.count} teachers`);
    console.log(`   - ${students.count} students`);
    console.log(`   - ${subsidizers.count} subsidizers`);
    console.log(`   - ${rooms.count} rooms`);
    console.log(`   - ${schedules.count} schedules`);
    console.log(`   - ${lessons.count} lessons`);
    console.log(`   - ${payments.count} payments`);
    console.log(`   - ${billings.count} billings`);
    console.log(`   - ${teacherAbsences.count} teacher absences`);
    console.log(`   - ${substituteRequests.count} substitute requests`);
    console.log(`   - ${notifications.count} notifications`);
    console.log('\n🎉 Database is now empty and ready for new data!');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This will delete ALL data from the database!');
console.log('⚠️  This action cannot be undone!\n');

// Check if --confirm flag is provided
if (process.argv.includes('--confirm')) {
  resetDatabase();
} else {
  console.log('To proceed, run this command with the --confirm flag:');
  console.log('node scripts/reset-database.js --confirm\n');
  process.exit(0);
}
