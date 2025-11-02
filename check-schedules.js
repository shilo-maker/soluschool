const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get Yosef's user ID
  const yosef = await prisma.user.findUnique({
    where: { email: 'yosef@soluisrael.org' },
  });

  if (!yosef) {
    console.log('Yosef not found');
    return;
  }

  console.log('Yosef user:', yosef.id, yosef.firstName);

  // Get Yosef's teacher record
  const teacher = await prisma.teacher.findFirst({
    where: { userId: yosef.id },
  });

  if (!teacher) {
    console.log('Yosef teacher record not found');
    return;
  }

  console.log('Yosef teacher:', teacher.id);

  // Get all schedules for Yosef
  const schedules = await prisma.schedule.findMany({
    where: { teacherId: teacher.id },
    include: {
      student: {
        include: {
          user: true,
        },
      },
      room: true,
    },
  });

  console.log(`\nTotal schedules for Yosef: ${schedules.length}`);

  if (schedules.length > 0) {
    console.log('\nSchedules:');
    schedules.forEach(s => {
      console.log(`- Day ${s.dayOfWeek} (${getDayName(s.dayOfWeek)}): ${s.startTime}-${s.endTime}`);
      console.log(`  Student: ${s.student.user.firstName} ${s.student.user.lastName}`);
      console.log(`  Instrument: ${s.instrument}`);
      console.log(`  Room: ${s.room.name}`);
      console.log(`  Active: ${s.isActive}`);
    });
  }

  // Also check total schedules in the system
  const allSchedules = await prisma.schedule.count();
  console.log(`\nTotal schedules in database: ${allSchedules}`);
}

function getDayName(day) {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[day] || 'Unknown';
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
