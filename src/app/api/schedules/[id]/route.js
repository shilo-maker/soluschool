import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/schedules/[id] - Get a single schedule
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
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

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/schedules/[id] - Update a schedule
export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
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
      isActive,
      notes,
    } = body;

    // Check if schedule exists
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Check for conflicts if relevant fields changed
    if (roomId || teacherId || studentId || dayOfWeek !== undefined || startTime || endTime) {
      const checkRoomId = roomId || existingSchedule.roomId;
      const checkTeacherId = teacherId || existingSchedule.teacherId;
      const checkStudentId = studentId || existingSchedule.studentId;
      const checkDayOfWeek = dayOfWeek !== undefined ? parseInt(dayOfWeek) : existingSchedule.dayOfWeek;
      const checkStartTime = startTime || existingSchedule.startTime;
      const checkEndTime = endTime || existingSchedule.endTime;

      // Time overlap query
      const timeOverlapQuery = {
        id: { not: id },
        dayOfWeek: checkDayOfWeek,
        isActive: true,
        OR: [
          {
            AND: [
              { startTime: { lte: checkStartTime } },
              { endTime: { gt: checkStartTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: checkEndTime } },
              { endTime: { gte: checkEndTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: checkStartTime } },
              { endTime: { lte: checkEndTime } },
            ],
          },
        ],
      };

      // Check for room conflict
      const roomConflict = await prisma.schedule.findFirst({
        where: {
          roomId: checkRoomId,
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
          teacherId: checkTeacherId,
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
          studentId: checkStudentId,
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
    }

    const updateData = {};
    if (teacherId) updateData.teacherId = teacherId;
    if (studentId) updateData.studentId = studentId;
    if (roomId) updateData.roomId = roomId;
    if (instrument) updateData.instrument = instrument;
    if (dayOfWeek !== undefined) updateData.dayOfWeek = parseInt(dayOfWeek);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (duration) updateData.duration = duration;
    if (effectiveFrom) updateData.effectiveFrom = new Date(effectiveFrom);
    if (effectiveUntil !== undefined) updateData.effectiveUntil = effectiveUntil ? new Date(effectiveUntil) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (notes !== undefined) updateData.notes = notes;

    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/schedules/[id] - Delete a schedule
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const schedule = await prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    await prisma.schedule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule', details: error.message },
      { status: 500 }
    );
  }
}
