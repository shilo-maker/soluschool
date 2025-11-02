import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// In-memory cache for student account data (10 second TTL)
const accountCache = new Map();
const CACHE_TTL = 10000; // 10 seconds

// GET /api/students/[id]/account - Get unpaid lessons for a student
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check cache
    const cacheKey = `student_account_${id}`;
    const cached = accountCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('Returning cached student account data');
      return NextResponse.json(cached.data);
    }

    // Allow admin or the student themselves to access account data
    if (user.role !== 'admin') {
      // Find the student record for this user
      const studentRecord = await prisma.student.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (!studentRecord || studentRecord.userId !== user.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Run queries in parallel for better performance
    const [student, unpaidLessons] = await Promise.all([
      // Get student data
      prisma.student.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),

      // Get unpaid completed lessons
      prisma.lesson.findMany({
        where: {
          studentId: id,
          status: 'completed',
          studentPaid: false,
        },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          room: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          date: 'asc',
        },
      }),
    ]);

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Calculate amounts for each lesson
    const lessonsWithAmounts = unpaidLessons.map((lesson) => {
      const lessonRate = lesson.teacher.lessonRate;
      const soluSubsidy = student.soluSubsidy;
      const additionalSubsidy = student.additionalSubsidy;

      const hasSubsidizer = additionalSubsidy.hasSubsidy;
      const subsidizerAmount = hasSubsidizer ? additionalSubsidy.subsidyPerLesson : 0;

      // Student portion = lessonRate - soluSubsidy - subsidizerAmount
      const studentPortion = lessonRate - soluSubsidy - subsidizerAmount;

      return {
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        instrument: lesson.instrument,
        teacherName: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
        roomName: lesson.room.name,
        lessonRate,
        soluSubsidy,
        subsidizerAmount,
        studentPortion,
        teacherCheckIn: lesson.teacherCheckIn,
        studentCheckIn: lesson.studentCheckIn,
        teacherCheckOut: lesson.teacherCheckOut,
        studentCheckOut: lesson.studentCheckOut,
      };
    });

    // Calculate totals
    const totalLessons = lessonsWithAmounts.length;
    const totalAmount = lessonsWithAmounts.reduce((sum, lesson) => sum + lesson.studentPortion, 0);

    const responseData = {
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        phone: student.user.phone,
        soluSubsidy: student.soluSubsidy,
        additionalSubsidy: student.additionalSubsidy,
      },
      lessons: lessonsWithAmounts,
      summary: {
        totalLessons,
        totalAmount,
      },
    };

    // Cache the response
    accountCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
    });

    // Clean up old cache entries (keep cache size manageable)
    if (accountCache.size > 100) {
      const firstKey = accountCache.keys().next().value;
      accountCache.delete(firstKey);
    }

    console.log('Student account data computed and cached');
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get student account error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student account', details: error.message },
      { status: 500 }
    );
  }
}
