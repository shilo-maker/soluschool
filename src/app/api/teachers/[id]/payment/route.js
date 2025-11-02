import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/teachers/[id]/payment - Get teacher payment details with unpaid lessons
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Allow admin or the teacher themselves to access payment data
    if (user.role !== 'admin') {
      // Find the teacher record for this user
      const teacherRecord = await prisma.teacher.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (!teacherRecord || teacherRecord.userId !== user.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get teacher with user details
    const teacher = await prisma.teacher.findUnique({
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
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Get all completed lessons that SOLU hasn't paid teacher for
    const unpaidLessons = await prisma.lesson.findMany({
      where: {
        teacherId: id,
        status: 'completed',
        soluPaid: false,
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

    // Calculate amounts for each lesson
    const lessonsWithAmounts = unpaidLessons.map((lesson) => {
      const lessonRate = teacher.lessonRate;
      const soluSubsidy = lesson.student.soluSubsidy;

      return {
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        instrument: lesson.instrument,
        studentName: `${lesson.student.user.firstName} ${lesson.student.user.lastName}`,
        roomName: lesson.room.name,
        lessonRate,
        soluPortion: soluSubsidy,
        studentPaid: lesson.studentPaid,
        subsidizerPaid: lesson.subsidizerPaid,
      };
    });

    // Calculate totals
    const totalLessons = lessonsWithAmounts.length;
    const totalAmount = totalLessons * teacher.lessonRate;
    const soluPortion = lessonsWithAmounts.reduce((sum, l) => sum + l.soluPortion, 0);

    return NextResponse.json({
      teacher: {
        id: teacher.id,
        name: `${teacher.user.firstName} ${teacher.user.lastName}`,
        email: teacher.user.email,
        phone: teacher.user.phone,
        lessonRate: teacher.lessonRate,
      },
      unpaidLessons: lessonsWithAmounts,
      summary: {
        totalLessons,
        totalAmount,
        soluPortion,
      },
    });
  } catch (error) {
    console.error('Get teacher payment details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher payment details', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/teachers/[id]/payment - Mark lessons as paid to teacher by SOLU
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

    // Verify all lessons belong to this teacher
    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: lessonIds },
        teacherId: id,
        status: 'completed',
      },
      include: {
        teacher: true,
      },
    });

    if (lessons.length !== lessonIds.length) {
      return NextResponse.json(
        { error: 'Invalid lesson selection' },
        { status: 400 }
      );
    }

    const teacher = lessons[0].teacher;
    const totalAmount = lessons.length * teacher.lessonRate;

    // Mark lessons as paid by SOLU
    await prisma.lesson.updateMany({
      where: {
        id: { in: lessonIds },
      },
      data: {
        soluPaid: true,
        soluPaidAt: new Date(),
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
    console.error('Process teacher payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment', details: error.message },
      { status: 500 }
    );
  }
}
