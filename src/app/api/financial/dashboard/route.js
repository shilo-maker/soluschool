import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// In-memory cache for financial dashboard (30 second TTL)
let dashboardCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 30000; // 30 seconds

// GET /api/financial/dashboard - Get complete financial overview
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache
    const now = Date.now();
    if (dashboardCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('Returning cached financial dashboard');
      return NextResponse.json(dashboardCache);
    }

    // Get ONLY completed lessons with unpaid portions (much faster!)
    const completedLessons = await prisma.lesson.findMany({
      where: {
        status: 'completed',
        OR: [
          { studentPaid: false },
          { soluPaid: false },
          { subsidizerPaid: false },
        ],
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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
      },
    });

    // Calculate student amounts owed
    const studentAmounts = {};
    const subsidizerAmounts = {};
    const teacherAmounts = {};

    completedLessons.forEach((lesson) => {
      const lessonRate = lesson.teacher.lessonRate;
      const soluSubsidy = lesson.student.soluSubsidy;
      const additionalSubsidy = lesson.student.additionalSubsidy;

      const hasSubsidizer = additionalSubsidy.hasSubsidy;
      const subsidizerAmount = hasSubsidizer ? additionalSubsidy.subsidyPerLesson : 0;
      const subsidizerId = hasSubsidizer ? additionalSubsidy.subsidizerId : null;

      // Student portion = lessonRate - soluSubsidy - subsidizerAmount
      const studentPortion = lessonRate - soluSubsidy - subsidizerAmount;

      // Track student amounts
      if (!lesson.studentPaid) {
        if (!studentAmounts[lesson.studentId]) {
          studentAmounts[lesson.studentId] = {
            studentId: lesson.studentId,
            studentName: `${lesson.student.user.firstName} ${lesson.student.user.lastName}`,
            unpaidLessons: 0,
            totalOwed: 0,
            lessons: [],
          };
        }
        studentAmounts[lesson.studentId].unpaidLessons += 1;
        studentAmounts[lesson.studentId].totalOwed += studentPortion;
        studentAmounts[lesson.studentId].lessons.push({
          id: lesson.id,
          date: lesson.date,
          instrument: lesson.instrument,
          amount: studentPortion,
        });
      }

      // Track subsidizer amounts
      if (hasSubsidizer && !lesson.subsidizerPaid) {
        if (!subsidizerAmounts[subsidizerId]) {
          subsidizerAmounts[subsidizerId] = {
            subsidizerId,
            unpaidLessons: 0,
            totalOwed: 0,
            students: {},
          };
        }
        subsidizerAmounts[subsidizerId].unpaidLessons += 1;
        subsidizerAmounts[subsidizerId].totalOwed += subsidizerAmount;

        if (!subsidizerAmounts[subsidizerId].students[lesson.studentId]) {
          subsidizerAmounts[subsidizerId].students[lesson.studentId] = {
            studentName: `${lesson.student.user.firstName} ${lesson.student.user.lastName}`,
            lessons: 0,
            amount: 0,
          };
        }
        subsidizerAmounts[subsidizerId].students[lesson.studentId].lessons += 1;
        subsidizerAmounts[subsidizerId].students[lesson.studentId].amount += subsidizerAmount;
      }

      // Track teacher amounts (SOLU owes teachers)
      if (!lesson.soluPaid) {
        if (!teacherAmounts[lesson.teacherId]) {
          teacherAmounts[lesson.teacherId] = {
            teacherId: lesson.teacherId,
            teacherName: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
            unpaidLessons: 0,
            totalOwed: 0,
            soluPortion: 0,
          };
        }
        teacherAmounts[lesson.teacherId].unpaidLessons += 1;
        teacherAmounts[lesson.teacherId].totalOwed += lessonRate;
        teacherAmounts[lesson.teacherId].soluPortion += soluSubsidy;
      }
    });

    // Get subsidizer details
    const subsidizerIds = Object.keys(subsidizerAmounts);
    const subsidizers = await prisma.subsidizer.findMany({
      where: {
        id: { in: subsidizerIds },
      },
    });

    const subsidizerMap = {};
    subsidizers.forEach((sub) => {
      subsidizerMap[sub.id] = sub;
    });

    // Format subsidizer data
    const subsidizerData = Object.values(subsidizerAmounts).map((data) => {
      const subsidizer = subsidizerMap[data.subsidizerId];
      return {
        subsidizerId: data.subsidizerId,
        subsidizerName: subsidizer ? subsidizer.name : 'Unknown',
        subsidizerEmail: subsidizer ? subsidizer.email : '',
        unpaidLessons: data.unpaidLessons,
        totalOwed: data.totalOwed,
        students: Object.values(data.students),
      };
    });

    // Calculate totals
    const totalStudentOwed = Object.values(studentAmounts).reduce((sum, s) => sum + s.totalOwed, 0);
    const totalSubsidizerOwed = Object.values(subsidizerAmounts).reduce((sum, s) => sum + s.totalOwed, 0);
    const totalTeacherOwed = Object.values(teacherAmounts).reduce((sum, t) => sum + t.totalOwed, 0);
    const totalSoluOwedToTeachers = Object.values(teacherAmounts).reduce((sum, t) => sum + t.soluPortion, 0);

    const totalUnpaidLessons = completedLessons.filter(
      (l) => !l.studentPaid || !l.soluPaid || (l.student.additionalSubsidy.hasSubsidy && !l.subsidizerPaid)
    ).length;

    // Build response and cache it
    const responseData = {
      summary: {
        totalStudentOwed,
        totalSubsidizerOwed,
        totalTeacherOwed,
        totalSoluOwedToTeachers,
        totalUnpaidLessons,
        totalCompletedLessons: completedLessons.length,
      },
      students: Object.values(studentAmounts),
      subsidizers: subsidizerData,
      teachers: Object.values(teacherAmounts),
    };

    // Cache the response
    dashboardCache = responseData;
    cacheTimestamp = Date.now();
    console.log('Financial dashboard computed and cached');

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get financial dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial dashboard', details: error.message },
      { status: 500 }
    );
  }
}
