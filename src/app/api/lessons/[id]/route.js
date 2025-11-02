import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';
import { sendLessonConfirmation, sendLessonCancellation, sendFeedbackNotification } from '@/lib/notifications';

// GET /api/lessons/[id] - Get a single lesson
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'student')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        teacher: {
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
        },
        student: {
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
        },
        room: true,
        cancelledBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // If teacher, verify they own this lesson
    if (user.role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.userId },
      });

      if (!teacher || lesson.teacherId !== teacher.id) {
        return NextResponse.json({ error: 'You can only view your own lessons' }, { status: 403 });
      }
    }

    // If student, verify they own this lesson
    if (user.role === 'student') {
      const student = await prisma.student.findFirst({
        where: { userId: user.userId },
      });

      if (!student || lesson.studentId !== student.id) {
        return NextResponse.json({ error: 'You can only view your own lessons' }, { status: 403 });
      }
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Get lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/lessons/[id] - Update a lesson
export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher' && user.role !== 'student')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
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
      status,
      teacherNotes,
      cancellationReason,
      teacherCheckIn,
      teacherCheckOut,
      studentCheckIn,
      studentCheckOut,
      autoCheckedIn,
      autoCheckedOut,
      autoCheckInEnabled,
    } = body;

    // Check if lesson exists
    const existingLesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        teacher: true,
      },
    });

    if (!existingLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    // If teacher, verify they own this lesson and restrict what they can update
    if (user.role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.userId },
      });

      if (!teacher || existingLesson.teacherId !== teacher.id) {
        return NextResponse.json({ error: 'You can only update your own lessons' }, { status: 403 });
      }

      // Teachers can only update check-in/out, status, and notes
      // Prevent them from changing schedule details
      if (teacherId || studentId || roomId || instrument || date || startTime || endTime || duration) {
        return NextResponse.json(
          { error: 'Teachers cannot modify lesson schedule details' },
          { status: 403 }
        );
      }
    }

    // If student, verify they own this lesson and restrict what they can update
    if (user.role === 'student') {
      const student = await prisma.student.findFirst({
        where: { userId: user.userId },
      });

      if (!student || existingLesson.studentId !== student.id) {
        return NextResponse.json({ error: 'You can only update your own lessons' }, { status: 403 });
      }

      // Students can only update their check-in/out
      // Prevent them from changing anything else
      if (teacherId || studentId || roomId || instrument || date || startTime || endTime || duration ||
          status || teacherNotes || cancellationReason || teacherCheckIn || teacherCheckOut) {
        return NextResponse.json(
          { error: 'Students can only update their own check-in/out' },
          { status: 403 }
        );
      }
    }

    // Check for conflicts if relevant fields changed
    if (roomId || teacherId || studentId || date || startTime || endTime) {
      const checkRoomId = roomId || existingLesson.roomId;
      const checkTeacherId = teacherId || existingLesson.teacherId;
      const checkStudentId = studentId || existingLesson.studentId;
      const lessonDate = date ? new Date(date) : existingLesson.date;
      const startOfDay = new Date(lessonDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(lessonDate);
      endOfDay.setHours(23, 59, 59, 999);
      const checkStartTime = startTime || existingLesson.startTime;
      const checkEndTime = endTime || existingLesson.endTime;

      // Time overlap query
      const timeOverlapQuery = {
        id: { not: id },
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
      const roomConflict = await prisma.lesson.findFirst({
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
      const teacherConflict = await prisma.lesson.findFirst({
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
      const studentConflict = await prisma.lesson.findFirst({
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
    if (date) updateData.date = new Date(date);
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (duration) updateData.duration = duration;
    if (status) {
      updateData.status = status;
      if (status === 'cancelled') {
        updateData.cancelledById = user.userId;
      }
    }
    if (teacherNotes !== undefined) updateData.teacherNotes = teacherNotes;
    if (cancellationReason !== undefined) updateData.cancellationReason = cancellationReason;

    // Check-in/check-out timestamps
    if (teacherCheckIn !== undefined) {
      updateData.teacherCheckIn = teacherCheckIn ? new Date(teacherCheckIn) : null;
    }
    if (teacherCheckOut !== undefined) {
      updateData.teacherCheckOut = teacherCheckOut ? new Date(teacherCheckOut) : null;
    }
    if (studentCheckIn !== undefined) {
      updateData.studentCheckIn = studentCheckIn ? new Date(studentCheckIn) : null;
    }
    if (studentCheckOut !== undefined) {
      updateData.studentCheckOut = studentCheckOut ? new Date(studentCheckOut) : null;
    }

    const lesson = await prisma.lesson.update({
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
        cancelledBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send notifications based on what changed
    const statusChanged = status && existingLesson.status !== status;
    const notesAdded = teacherNotes && teacherNotes !== existingLesson.teacherNotes;
    const teacherCheckedIn = teacherCheckIn && !existingLesson.teacherCheckIn;
    const studentCheckedIn = studentCheckIn && !existingLesson.studentCheckIn;
    const teacherCheckedOut = teacherCheckOut && !existingLesson.teacherCheckOut;
    const studentCheckedOut = studentCheckOut && !existingLesson.studentCheckOut;

    // Emit Socket.io events for real-time updates
    if (global.io) {
      // Emit lesson-updated event for check-ins/check-outs
      if (teacherCheckedIn || studentCheckedIn || teacherCheckedOut || studentCheckedOut) {
        global.io.to('live-updates').emit('lesson-updated', {
          lessonId: lesson.id,
          status: lesson.status,
          teacherCheckIn: lesson.teacherCheckIn,
          studentCheckIn: lesson.studentCheckIn,
          teacherCheckOut: lesson.teacherCheckOut,
          studentCheckOut: lesson.studentCheckOut,
          teacher: lesson.teacher,
          student: lesson.student,
          room: lesson.room,
        });

        // Broadcast global events for student check-in page
        if (teacherCheckedIn) {
          global.io.emit('teacher-checkin-update');
        }
        if (studentCheckedIn) {
          global.io.emit('student-checkin-update');
        }
      }

      // Emit lesson-completed event when lesson is completed
      if (statusChanged && status === 'completed') {
        global.io.to('live-updates').emit('lesson-completed', {
          lessonId: lesson.id,
          lesson: lesson,
        });
      }

      // Emit status-changed event for any status changes
      if (statusChanged) {
        global.io.to('live-updates').emit('status-changed', {
          lessonId: lesson.id,
          oldStatus: existingLesson.status,
          newStatus: status,
          lesson: lesson,
        });
      }
    }

    if (statusChanged) {
      // Send lesson confirmation notification to student
      if (status === 'completed' || status === 'no_show' || status === 'cancelled') {
        await sendLessonConfirmation(lesson);
      }

      // Send cancellation notification to both parties
      if (status === 'cancelled') {
        await sendLessonCancellation(lesson, user.userId);
      }
    } else if (notesAdded && (status === 'completed' || existingLesson.status === 'completed')) {
      // Teacher added feedback after lesson completion
      await sendFeedbackNotification(lesson);
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/lessons/[id] - Delete a lesson
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const lesson = await prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    await prisma.lesson.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson', details: error.message },
      { status: 500 }
    );
  }
}
