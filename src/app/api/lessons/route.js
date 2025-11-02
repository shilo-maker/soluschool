import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/lessons - Get all lessons with filters
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'student')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let studentId = searchParams.get('studentId');
    let teacherId = searchParams.get('teacherId');
    const roomId = searchParams.get('roomId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // If teacher is logged in and teacherId is "me" or not specified, filter by their ID
    if (user.role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.userId },
      });
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
      }
      teacherId = teacher.id;
    } else if (teacherId === 'me' && user.role === 'admin') {
      // Admin shouldn't use "me", clear it
      teacherId = null;
    }

    // If student is logged in, filter by their ID only
    if (user.role === 'student') {
      const student = await prisma.student.findFirst({
        where: { userId: user.userId },
      });
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }
      studentId = student.id;
    }

    const where = {};
    if (studentId) where.studentId = studentId;
    if (teacherId) where.teacherId = teacherId;
    if (roomId) where.roomId = roomId;
    if (status) where.status = status;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const lessons = await prisma.lesson.findMany({
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
        student: {
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
        room: true,
        cancelledBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json(lessons);
  } catch (error) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/lessons - Create a new lesson
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      teacherId,
      studentId,
      roomId,
      instrument,
      date,
      startTime,
      endTime,
      duration,
      teacherNotes,
      status,
    } = body;

    // Validate required fields
    if (!teacherId || !studentId || !roomId || !instrument || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for conflicts
    const lessonDate = new Date(date);
    const startOfDay = new Date(lessonDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(lessonDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Time overlap query
    const timeOverlapQuery = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        not: 'cancelled',
      },
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } },
          ],
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    };

    // Check for room conflict
    const roomConflict = await prisma.lesson.findFirst({
      where: {
        roomId,
        ...timeOverlapQuery,
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        room: true,
      },
    });

    if (roomConflict) {
      return NextResponse.json(
        {
          error: 'Room conflict',
          message: `החדר "${roomConflict.room.name}" תפוס בזמן זה עבור ${roomConflict.student.user.firstName} ${roomConflict.student.user.lastName}`,
        },
        { status: 409 }
      );
    }

    // Check for teacher conflict
    const teacherConflict = await prisma.lesson.findFirst({
      where: {
        teacherId,
        ...timeOverlapQuery,
      },
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

    if (teacherConflict) {
      return NextResponse.json(
        {
          error: 'Teacher conflict',
          message: `המורה ${teacherConflict.teacher.user.firstName} ${teacherConflict.teacher.user.lastName} כבר מלמד/ת בזמן זה את ${teacherConflict.student.user.firstName} ${teacherConflict.student.user.lastName}`,
        },
        { status: 409 }
      );
    }

    // Check for student conflict
    const studentConflict = await prisma.lesson.findFirst({
      where: {
        studentId,
        ...timeOverlapQuery,
      },
      include: {
        student: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        teacher: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (studentConflict) {
      return NextResponse.json(
        {
          error: 'Student conflict',
          message: `התלמיד/ה ${studentConflict.student.user.firstName} ${studentConflict.student.user.lastName} כבר לומד/ת בזמן זה אצל ${studentConflict.teacher.user.firstName} ${studentConflict.teacher.user.lastName}`,
        },
        { status: 409 }
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        teacherId,
        studentId,
        roomId,
        instrument,
        date: new Date(date),
        startTime,
        endTime,
        duration: duration || 35,
        teacherNotes,
        status: status || 'scheduled',
      },
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
        student: {
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
        room: true,
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error('Create lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson', details: error.message },
      { status: 500 }
    );
  }
}
