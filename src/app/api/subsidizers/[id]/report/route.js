import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/subsidizers/[id]/report - Get subsidizer payment report
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get subsidizer details
    const subsidizer = await prisma.subsidizer.findUnique({
      where: { id },
    });

    if (!subsidizer) {
      return NextResponse.json({ error: 'Subsidizer not found' }, { status: 404 });
    }

    // Get all students supported by this subsidizer
    const students = await prisma.student.findMany({
      where: {
        additionalSubsidy: {
          path: ['subsidizerId'],
          equals: id,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const studentIds = students.map((s) => s.id);

    // Get all completed lessons that subsidizer hasn't paid for
    const unpaidLessons = await prisma.lesson.findMany({
      where: {
        studentId: { in: studentIds },
        status: 'completed',
        subsidizerPaid: false,
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
        room: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Calculate amounts for each lesson and group by student
    const studentLessonsMap = {};

    unpaidLessons.forEach((lesson) => {
      const student = lesson.student;
      const studentId = student.id;
      const subsidizerAmount = student.additionalSubsidy.hasSubsidy
        ? student.additionalSubsidy.subsidyPerLesson
        : 0;

      if (!studentLessonsMap[studentId]) {
        studentLessonsMap[studentId] = {
          studentId,
          studentName: `${student.user.firstName} ${student.user.lastName}`,
          studentEmail: student.user.email,
          subsidizerAmount,
          lessons: [],
          totalOwed: 0,
          lessonCount: 0,
        };
      }

      studentLessonsMap[studentId].lessons.push({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        instrument: lesson.instrument,
        teacherName: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
        roomName: lesson.room.name,
        amount: subsidizerAmount,
      });

      studentLessonsMap[studentId].totalOwed += subsidizerAmount;
      studentLessonsMap[studentId].lessonCount += 1;
    });

    const studentReports = Object.values(studentLessonsMap);

    // Calculate totals
    const totalOwed = studentReports.reduce((sum, sr) => sum + sr.totalOwed, 0);
    const totalLessons = unpaidLessons.length;

    return NextResponse.json({
      subsidizer: {
        id: subsidizer.id,
        name: subsidizer.name,
        email: subsidizer.email,
        phone: subsidizer.phone,
      },
      studentReports,
      summary: {
        totalStudents: students.length,
        totalLessons,
        totalOwed,
      },
    });
  } catch (error) {
    console.error('Get subsidizer report error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subsidizer report', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/subsidizers/[id]/report - Mark lessons as paid by subsidizer
export async function POST(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { lessonIds, paymentMethod, referenceNumber, notes } = body;

    if (!lessonIds || lessonIds.length === 0) {
      return NextResponse.json(
        { error: 'No lessons selected' },
        { status: 400 }
      );
    }

    // Verify all lessons have this subsidizer
    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: lessonIds },
        status: 'completed',
      },
      include: {
        student: true,
      },
    });

    if (lessons.length !== lessonIds.length) {
      return NextResponse.json(
        { error: 'Invalid lesson selection' },
        { status: 400 }
      );
    }

    // Verify all lessons belong to students with this subsidizer
    const invalidLessons = lessons.filter(
      (lesson) => lesson.student.additionalSubsidy.subsidizerId !== id
    );

    if (invalidLessons.length > 0) {
      return NextResponse.json(
        { error: 'Some lessons do not belong to this subsidizer' },
        { status: 400 }
      );
    }

    // Calculate total amount
    let totalAmount = 0;
    lessons.forEach((lesson) => {
      const subsidizerAmount = lesson.student.additionalSubsidy.hasSubsidy
        ? lesson.student.additionalSubsidy.subsidyPerLesson
        : 0;
      totalAmount += subsidizerAmount;
    });

    // Mark lessons as paid by subsidizer
    await prisma.lesson.updateMany({
      where: {
        id: { in: lessonIds },
      },
      data: {
        subsidizerPaid: true,
        subsidizerPaidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      lessonsMarkedPaid: lessons.length,
      totalAmount,
      paymentMethod,
      referenceNumber,
    });
  } catch (error) {
    console.error('Process subsidizer payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment', details: error.message },
      { status: 500 }
    );
  }
}
