import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/schedules - Get all schedules
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
    const dayOfWeek = searchParams.get('dayOfWeek');
    const isActive = searchParams.get('isActive');

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
    if (dayOfWeek !== null && dayOfWeek !== undefined) where.dayOfWeek = parseInt(dayOfWeek);
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true';

    const schedules = await prisma.schedule.findMany({
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
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/schedules - Create a new schedule
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
      dayOfWeek,
      startTime,
      endTime,
      duration,
      effectiveFrom,
      effectiveUntil,
      notes,
    } = body;

    // Validate required fields
    if (!teacherId || !studentId || !roomId || !instrument || dayOfWeek === undefined || !startTime || !endTime || !effectiveFrom) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for conflicts - time overlap query
    const timeOverlapQuery = {
      dayOfWeek: parseInt(dayOfWeek),
      isActive: true,
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
    const roomConflict = await prisma.schedule.findFirst({
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
    const teacherConflict = await prisma.schedule.findFirst({
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
    const studentConflict = await prisma.schedule.findFirst({
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

    const schedule = await prisma.schedule.create({
      data: {
        teacherId,
        studentId,
        roomId,
        instrument,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        duration: duration || 35,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        notes,
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

    // Auto-generate lessons until mid-June (June 30, 2026)
    const midJune = new Date('2026-06-30');
    const generateUntil = schedule.effectiveUntil && new Date(schedule.effectiveUntil) < midJune
      ? new Date(schedule.effectiveUntil)
      : midJune;

    const createdLessons = [];
    const skippedLessons = [];

    // Generate lessons from effectiveFrom to generateUntil
    const currentDate = new Date(schedule.effectiveFrom);
    while (currentDate <= generateUntil) {
      const dayOfWeek = currentDate.getDay();

      // Check if this date matches the schedule's day of week
      if (dayOfWeek === schedule.dayOfWeek) {
        // Create date range for this specific day
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Check if lesson already exists
        const existingLesson = await prisma.lesson.findFirst({
          where: {
            teacherId: schedule.teacherId,
            studentId: schedule.studentId,
            roomId: schedule.roomId,
            date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (existingLesson) {
          skippedLessons.push({
            date: new Date(currentDate),
            reason: 'Lesson already exists',
          });
        } else {
          try {
            const lesson = await prisma.lesson.create({
              data: {
                teacherId: schedule.teacherId,
                studentId: schedule.studentId,
                roomId: schedule.roomId,
                instrument: schedule.instrument,
                date: new Date(currentDate),
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                duration: schedule.duration,
                status: 'scheduled',
              },
            });

            createdLessons.push(lesson);
          } catch (error) {
            skippedLessons.push({
              date: new Date(currentDate),
              reason: error.message,
            });
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      schedule,
      lessonsGenerated: {
        created: createdLessons.length,
        skipped: skippedLessons.length,
        message: `נוצרו ${createdLessons.length} שיעורים אוטומטית עד אמצע יוני`,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to create schedule', details: error.message },
      { status: 500 }
    );
  }
}
