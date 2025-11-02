import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Student Check-In API
 * Supports multiple authentication methods:
 * 1. QR Code
 * 2. PIN
 * 3. Student ID (from visual selector)
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { method, value, lessonId } = body;

    // Validate input
    if (!method || !value) {
      return NextResponse.json(
        { error: 'Method and value are required' },
        { status: 400 }
      );
    }

    let student = null;

    // Find student based on authentication method
    switch (method) {
      case 'qrCode':
        student = await prisma.student.findFirst({
          where: {
            user: {
              qrCode: value,
              isActive: true
            }
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                qrCode: true
              }
            }
          }
        });
        break;

      case 'pin':
        student = await prisma.student.findFirst({
          where: {
            user: {
              pinPlainText: value,
              isActive: true
            }
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                pinPlainText: true
              }
            }
          }
        });
        break;

      case 'studentId':
        student = await prisma.student.findUnique({
          where: {
            id: value
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isActive: true
              }
            }
          }
        });

        if (student && !student.user.isActive) {
          student = null;
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid authentication method' },
          { status: 400 }
        );
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found or inactive' },
        { status: 404 }
      );
    }

    // If lessonId provided, check into specific lesson
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          room: true
        }
      });

      if (!lesson) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      }

      // Verify this lesson belongs to this student
      if (lesson.studentId !== student.id) {
        return NextResponse.json(
          { error: 'This lesson does not belong to you' },
          { status: 403 }
        );
      }

      // Check if already checked in
      if (lesson.studentCheckIn) {
        // Fetch all today's lessons for this student
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaysLessons = await prisma.lesson.findMany({
          where: {
            studentId: student.id,
            date: {
              gte: today,
              lt: tomorrow
            },
            status: 'scheduled'
          },
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            },
            room: true
          },
          orderBy: {
            startTime: 'asc'
          }
        });

        return NextResponse.json({
          success: true,
          alreadyCheckedIn: true,
          student: {
            id: student.id,
            name: `${student.user.firstName} ${student.user.lastName}`,
            userId: student.user.id
          },
          todaysLessons: todaysLessons.map(lesson => ({
            id: lesson.id,
            date: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            instrument: lesson.instrument,
            teacher: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
            room: lesson.room.name,
            checkedIn: !!lesson.studentCheckIn,
            checkedInAt: lesson.studentCheckIn
          })),
          message: 'כבר נרשמת נוכחות לשיעור זה!'
        });
      }

      // Perform check-in
      await prisma.lesson.update({
        where: { id: lessonId },
        data: {
          studentCheckIn: new Date()
        }
      });

      // Emit socket event for real-time updates
      if (global.io) {
        global.io.emit('student-checkin-update');
      }

      // Fetch all today's lessons for this student
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todaysLessons = await prisma.lesson.findMany({
        where: {
          studentId: student.id,
          date: {
            gte: today,
            lt: tomorrow
          },
          status: 'scheduled'
        },
        include: {
          teacher: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          room: true
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      return NextResponse.json({
        success: true,
        alreadyCheckedIn: false,
        student: {
          id: student.id,
          name: `${student.user.firstName} ${student.user.lastName}`,
          userId: student.user.id
        },
        todaysLessons: todaysLessons.map(lesson => ({
          id: lesson.id,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          instrument: lesson.instrument,
          teacher: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
          room: lesson.room.name,
          checkedIn: !!lesson.studentCheckIn,
          checkedInAt: lesson.studentCheckIn
        })),
        message: 'נוכחות נרשמה בהצלחה!'
      });
    }

    // No lesson specified - find today's lessons for this student
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysLessons = await prisma.lesson.findMany({
      where: {
        studentId: student.id,
        date: {
          gte: today,
          lt: tomorrow
        },
        status: 'scheduled'
      },
      include: {
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        room: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        userId: student.user.id
      },
      todaysLessons: todaysLessons.map(lesson => ({
        id: lesson.id,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        instrument: lesson.instrument,
        teacher: `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}`,
        room: lesson.room.name,
        checkedIn: !!lesson.studentCheckIn,
        checkedInAt: lesson.studentCheckIn
      })),
      message: todaysLessons.length > 0
        ? `שלום ${student.user.firstName}! נמצאו ${todaysLessons.length} שיעורים להיום`
        : `שלום ${student.user.firstName}! אין לך שיעורים להיום`
    });

  } catch (error) {
    console.error('Student check-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Get students for visual selector - only those with lessons within 60 minutes
export async function GET(request) {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate time 60 minutes from now and current time
    const sixtyMinutesFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const maxTime = `${String(sixtyMinutesFromNow.getHours()).padStart(2, '0')}:${String(sixtyMinutesFromNow.getMinutes()).padStart(2, '0')}`;

    // Find all lessons that:
    // 1. Start within the next 60 minutes, OR
    // 2. Have been checked in and haven't ended yet
    const relevantLessons = await prisma.lesson.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        },
        status: 'scheduled',
        OR: [
          // Upcoming lessons within 60 minutes
          {
            startTime: {
              gte: currentTime,
              lte: maxTime
            }
          },
          // Already checked in and lesson hasn't ended
          {
            studentCheckIn: {
              not: null
            },
            endTime: {
              gte: currentTime
            }
          }
        ],
        student: {
          user: {
            isActive: true
          }
        }
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isActive: true
              }
            }
          }
        },
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        room: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Extract unique students and include their lesson info
    const studentMap = new Map();

    for (const lesson of relevantLessons) {
      if (!studentMap.has(lesson.studentId)) {
        studentMap.set(lesson.studentId, {
          id: lesson.student.id,
          userId: lesson.student.user.id,
          name: `${lesson.student.user.firstName} ${lesson.student.user.lastName}`,
          firstName: lesson.student.user.firstName,
          lastName: lesson.student.user.lastName,
          instruments: lesson.student.instruments,
          nextLesson: {
            id: lesson.id,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            instrument: lesson.instrument,
            room: lesson.room?.name || 'N/A',
            teacher: lesson.teacher ? `${lesson.teacher.user.firstName} ${lesson.teacher.user.lastName}` : 'N/A',
            teacherCheckedIn: !!lesson.teacherCheckIn
          },
          checkedIn: !!lesson.studentCheckIn,
          checkedInAt: lesson.studentCheckIn
        });
      }
    }

    const formattedStudents = Array.from(studentMap.values());

    return NextResponse.json({
      success: true,
      students: formattedStudents,
      count: formattedStudents.length,
      timeWindow: {
        current: currentTime,
        maxTime: maxTime,
        message: 'Showing students with lessons in the next 60 minutes'
      }
    });

  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
