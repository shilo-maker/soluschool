import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/billings - Get all billings with optional filters
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const teacherId = searchParams.get('teacherId');

    const where = {};

    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    // If teacher, only show their own billings
    if (user.role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.userId },
      });
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }
      where.teacherId = teacher.id;
    } else if (teacherId && teacherId !== 'all') {
      where.teacherId = teacherId;
    }

    const billings = await prisma.billing.findMany({
      where,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return NextResponse.json(billings);
  } catch (error) {
    console.error('Get billings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billings', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/billings - Create a new billing (typically done by system/admin)
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { teacherId, month, year } = body;

    if (!teacherId || !month || !year) {
      return NextResponse.json(
        { error: 'Teacher ID, month, and year are required' },
        { status: 400 }
      );
    }

    // Check if billing already exists
    const existingBilling = await prisma.billing.findUnique({
      where: {
        teacherId_month_year: {
          teacherId,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
    });

    if (existingBilling) {
      return NextResponse.json(
        { error: 'Billing for this period already exists' },
        { status: 409 }
      );
    }

    // Get all completed lessons for this teacher in this period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: 'completed',
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
      },
    });

    // Get teacher's rate
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Calculate totals
    const totalLessons = lessons.length;
    const totalHours = lessons.reduce((sum, lesson) => sum + (lesson.duration / 60), 0);
    const totalAmount = totalHours * teacher.lessonRate;

    // Format lessons data
    const lessonsData = lessons.map(lesson => ({
      lessonId: lesson.id,
      date: lesson.date,
      duration: lesson.duration,
      studentName: `${lesson.student.user.firstName} ${lesson.student.user.lastName}`,
      instrument: lesson.instrument,
    }));

    const billing = await prisma.billing.create({
      data: {
        teacherId,
        month: parseInt(month),
        year: parseInt(year),
        lessons: lessonsData,
        totalLessons,
        totalHours,
        totalAmount,
        status: 'pending',
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

    return NextResponse.json(billing);
  } catch (error) {
    console.error('Create billing error:', error);
    return NextResponse.json(
      { error: 'Failed to create billing', details: error.message },
      { status: 500 }
    );
  }
}
