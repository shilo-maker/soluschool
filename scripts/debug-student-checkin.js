/**
 * Debug Student Check-In
 * This script shows why a specific student/lesson might not appear in student check-in
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugStudentCheckIn() {
  try {
    console.log('🔍 Debugging Student Check-In Visibility\n');
    console.log('═══════════════════════════════════════════\n');

    // Get current server time
    const now = new Date();
    console.log(`⏰ Current Server Time: ${now.toISOString()}`);
    console.log(`   Local Time: ${now.toLocaleString()}`);
    console.log(`   Timezone Offset: UTC${now.getTimezoneOffset() / -60}\n`);

    // Calculate today's date range
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`📅 Today's Date Range:`);
    console.log(`   Start: ${today.toISOString()}`);
    console.log(`   End:   ${tomorrow.toISOString()}\n`);

    // Calculate time window
    const sixtyMinutesFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const maxTime = `${String(sixtyMinutesFromNow.getHours()).padStart(2, '0')}:${String(sixtyMinutesFromNow.getMinutes()).padStart(2, '0')}`;

    console.log(`⏱️  Time Window for Check-In:`);
    console.log(`   Current Time: ${currentTime}`);
    console.log(`   Maximum Time: ${maxTime}`);
    console.log(`   (Shows lessons starting within next 60 minutes)\n`);

    // Find the student
    const student = await prisma.student.findFirst({
      where: {
        user: {
          firstName: 'בדיקה',
          lastName: 'בדיקה'
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

    if (!student) {
      console.log('❌ Student "בדיקה בדיקה" not found!\n');

      // Show all students
      console.log('📋 All Students in Database:');
      const allStudents = await prisma.student.findMany({
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              isActive: true
            }
          }
        }
      });

      allStudents.forEach(s => {
        console.log(`   - ${s.user.firstName} ${s.user.lastName} (${s.user.isActive ? 'Active' : 'Inactive'})`);
      });

      return;
    }

    console.log(`✅ Student Found:`);
    console.log(`   ID: ${student.id}`);
    console.log(`   Name: ${student.user.firstName} ${student.user.lastName}`);
    console.log(`   Active: ${student.user.isActive}`);
    console.log(`   User ID: ${student.user.id}\n`);

    // Find all today's lessons for this student
    const allTodaysLessons = await prisma.lesson.findMany({
      where: {
        studentId: student.id,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        room: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log(`📚 All Lessons Today for This Student: ${allTodaysLessons.length}\n`);

    if (allTodaysLessons.length === 0) {
      console.log('❌ No lessons found for today!\n');

      // Check for lessons on other dates
      const futureLessons = await prisma.lesson.findMany({
        where: {
          studentId: student.id,
          date: {
            gte: today
          }
        },
        orderBy: {
          date: 'asc'
        },
        take: 5
      });

      if (futureLessons.length > 0) {
        console.log('📅 Upcoming Lessons:');
        futureLessons.forEach(lesson => {
          console.log(`   - ${lesson.date.toISOString().split('T')[0]} at ${lesson.startTime}`);
        });
      }

      return;
    }

    allTodaysLessons.forEach((lesson, index) => {
      console.log(`Lesson ${index + 1}:`);
      console.log(`   Lesson ID: ${lesson.id}`);
      console.log(`   Date: ${lesson.date.toISOString()}`);
      console.log(`   Time: ${lesson.startTime} - ${lesson.endTime}`);
      console.log(`   Instrument: ${lesson.instrument}`);
      console.log(`   Status: ${lesson.status}`);
      console.log(`   Room: ${lesson.room?.name || 'N/A'}`);
      console.log(`   Teacher: ${lesson.teacher ? `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}` : 'N/A'}`);
      console.log(`   Student Check-In: ${lesson.studentCheckIn || 'Not checked in'}`);
      console.log(`   Teacher Check-In: ${lesson.teacherCheckIn || 'Not checked in'}`);

      // Check if this lesson would appear in check-in
      const isScheduledStatus = lesson.status === 'scheduled';
      const isInTimeWindow = lesson.startTime >= currentTime && lesson.startTime <= maxTime;
      const isCheckedInAndNotEnded = lesson.studentCheckIn && lesson.endTime >= currentTime;
      const wouldAppear = isScheduledStatus && (isInTimeWindow || isCheckedInAndNotEnded);

      console.log(`\n   ✓ Checks:`);
      console.log(`     - Status is 'scheduled': ${isScheduledStatus ? '✅' : `❌ (${lesson.status})`}`);
      console.log(`     - Start time in window (${currentTime} to ${maxTime}): ${isInTimeWindow ? '✅' : '❌'}`);
      console.log(`     - OR Already checked in and not ended: ${isCheckedInAndNotEnded ? '✅' : '❌'}`);
      console.log(`     - Student is active: ${student.user.isActive ? '✅' : '❌'}`);
      console.log(`\n   ${wouldAppear ? '✅ WOULD APPEAR in check-in' : '❌ WOULD NOT APPEAR in check-in'}\n`);
    });

    // Run the actual query that the API uses
    console.log('═══════════════════════════════════════════');
    console.log('🔍 Running Actual API Query...\n');

    const relevantLessons = await prisma.lesson.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        },
        status: 'scheduled',
        OR: [
          {
            startTime: {
              gte: currentTime,
              lte: maxTime
            }
          },
          {
            studentCheckIn: {
              not: null
            },
            endTime: {
              gte: currentTime
            }
          }
        ],
        student: {
          user: {
            isActive: true
          }
        }
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Students That WOULD Appear in Check-In: ${relevantLessons.length}\n`);

    relevantLessons.forEach((lesson, index) => {
      console.log(`   ${index + 1}. ${lesson.student.user.firstName} ${lesson.student.user.lastName}`);
      console.log(`      Time: ${lesson.startTime} | Checked In: ${lesson.studentCheckIn ? 'Yes' : 'No'}`);
    });

    const ourStudentInList = relevantLessons.some(l => l.studentId === student.id);
    console.log(`\n   ${ourStudentInList ? '✅' : '❌'} "בדיקה בדיקה" ${ourStudentInList ? 'IS' : 'IS NOT'} in the list\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugStudentCheckIn();
