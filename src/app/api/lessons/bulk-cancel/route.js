import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// POST /api/lessons/bulk-cancel - Cancel multiple lessons based on filters
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      startDate,
      endDate,
      teacherId,
      studentId,
      roomId,
      cancellationReason
    } = body;

    // Validate required fields
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Build the where clause
    const where = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      status: {
        not: 'cancelled', // Only cancel lessons that aren't already cancelled
      },
    };

    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;
    if (roomId) where.roomId = roomId;

    // First, get the count of lessons to be cancelled
    const lessonsToCancel = await prisma.lesson.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (lessonsToCancel.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'לא נמצאו שיעורים לביטול',
        cancelled: 0,
        lessons: [],
      });
    }

    // Cancel all matching lessons
    const result = await prisma.lesson.updateMany({
      where,
      data: {
        status: 'cancelled',
        cancelledById: user.id,
        cancellationReason: cancellationReason || 'ביטול המוני',
      },
    });

    return NextResponse.json({
      success: true,
      message: `בוטלו ${result.count} שיעורים בהצלחה`,
      cancelled: result.count,
      lessons: lessonsToCancel.map(lesson => ({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        teacherName: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
        studentName: `${lesson.student.user.firstName} ${lesson.student.user.lastName}`,
      })),
    });
  } catch (error) {
    console.error('Bulk cancel lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel lessons', details: error.message },
      { status: 500 }
    );
  }
}
