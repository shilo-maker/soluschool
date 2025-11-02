import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// POST /api/students/[id]/pay - Process student payment
export async function POST(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { lessonIds, paymentMethod, amount, notes } = body;

    if (!lessonIds || !Array.isArray(lessonIds) || lessonIds.length === 0) {
      return NextResponse.json({ error: 'Lesson IDs are required' }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id },
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

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Verify all lessons belong to this student and are unpaid
    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: lessonIds },
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
      },
    });

    if (lessons.length !== lessonIds.length) {
      return NextResponse.json(
        { error: 'Some lessons are invalid or already paid' },
        { status: 400 }
      );
    }

    // Calculate total amount
    const calculatedTotal = lessons.reduce((sum, lesson) => {
      const lessonRate = lesson.teacher.lessonRate;
      const soluSubsidy = student.soluSubsidy;
      const additionalSubsidy = student.additionalSubsidy;
      const subsidizerAmount = additionalSubsidy.hasSubsidy ? additionalSubsidy.subsidyPerLesson : 0;
      const studentPortion = lessonRate - soluSubsidy - subsidizerAmount;
      return sum + studentPortion;
    }, 0);

    // Calculate period (earliest and latest lesson dates)
    const lessonDates = lessons.map(l => new Date(l.date));
    const periodStart = new Date(Math.min(...lessonDates));
    const periodEnd = new Date(Math.max(...lessonDates));
    const pricePerLesson = calculatedTotal / lessons.length;

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        student: {
          connect: { id },
        },
        amount: amount || calculatedTotal,
        paymentMethod,
        periodStart,
        periodEnd,
        recordedBy: {
          connect: { id: user.userId },
        },
        lessonsCount: lessons.length,
        pricePerLesson,
        notes: notes || `תשלום עבור ${lessons.length} שיעורים`,
      },
    });

    // Mark lessons as paid by student
    await prisma.lesson.updateMany({
      where: {
        id: { in: lessonIds },
      },
      data: {
        studentPaid: true,
        studentPaidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      payment,
      message: `Payment of ₪${(amount || calculatedTotal).toFixed(2)} processed successfully for ${lessons.length} lessons`,
    });
  } catch (error) {
    console.error('Process student payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment', details: error.message },
      { status: 500 }
    );
  }
}
