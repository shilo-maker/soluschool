import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/substitute-requests - List substitute requests
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const absenceId = searchParams.get('absenceId');
    const substituteTeacherId = searchParams.get('substituteTeacherId');
    const status = searchParams.get('status');
    const pending = searchParams.get('pending');

    const where = {};

    if (absenceId) {
      where.absenceId = absenceId;
    }

    if (substituteTeacherId) {
      where.substituteTeacherId = substituteTeacherId;
    }

    if (status) {
      where.status = status;
    }

    // If requesting pending requests for a teacher
    if (pending === 'true' && user.role === 'teacher') {
      // Find teacher record for this user
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.userId }
      });

      if (teacher) {
        where.substituteTeacherId = teacher.id;
        where.status = {
          in: ['pending', 'awaiting_approval']
        };
      }
    }

    const requests = await prisma.substituteRequest.findMany({
      where,
      include: {
        absence: {
          include: {
            teacher: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          }
        },
        lesson: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            },
            room: true,
          }
        },
        originalTeacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        substituteTeacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: {
        lessonDate: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error('Get substitute requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch substitute requests', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/substitute-requests - Create substitute request(s)
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      absenceId,
      lessonIds,
      substituteTeacherId,
      substituteTeacherIds, // NEW: Array for broadcast mode
      notes,
      broadcastMode = false, // NEW: Flag to indicate broadcast mode
    } = body;

    // Handle both single and broadcast mode
    let teacherIds = [];
    if (broadcastMode && substituteTeacherIds && substituteTeacherIds.length > 0) {
      teacherIds = substituteTeacherIds;
    } else if (substituteTeacherId) {
      teacherIds = [substituteTeacherId];
    }

    // Validation
    if (!absenceId || !lessonIds || lessonIds.length === 0 || teacherIds.length === 0) {
      return NextResponse.json(
        { error: 'Absence ID, lesson IDs, and at least one substitute teacher ID are required' },
        { status: 400 }
      );
    }

    // Verify absence exists
    const absence = await prisma.teacherAbsence.findUnique({
      where: { id: absenceId },
      include: {
        teacher: {
          include: {
            user: true
          }
        }
      }
    });

    if (!absence) {
      return NextResponse.json(
        { error: 'Absence not found' },
        { status: 404 }
      );
    }

    // Verify all substitute teachers exist
    const substituteTeachers = await prisma.teacher.findMany({
      where: {
        id: { in: teacherIds }
      },
      include: {
        user: true
      }
    });

    if (substituteTeachers.length !== teacherIds.length) {
      return NextResponse.json(
        { error: 'One or more substitute teachers not found' },
        { status: 404 }
      );
    }

    // Get all lessons
    const lessons = await prisma.lesson.findMany({
      where: {
        id: { in: lessonIds },
        teacherId: absence.teacherId,
      },
      include: {
        student: {
          include: {
            user: true
          }
        },
        room: true,
      }
    });

    if (lessons.length !== lessonIds.length) {
      return NextResponse.json(
        { error: 'Some lessons were not found or do not belong to the absent teacher' },
        { status: 400 }
      );
    }

    // Create substitute requests
    const createdRequests = [];

    // For each lesson, create requests for all selected substitute teachers
    for (const lesson of lessons) {
      // Generate a unique broadcast group ID for THIS lesson if in broadcast mode
      const broadcastGroupId = (broadcastMode && teacherIds.length > 1)
        ? `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : null;

      for (const teacherId of teacherIds) {
        const request = await prisma.substituteRequest.create({
          data: {
            absenceId,
            lessonId: lesson.id,
            originalTeacherId: absence.teacherId,
            substituteTeacherId: teacherId,
            studentId: lesson.studentId,
            roomId: lesson.roomId,
            instrument: lesson.instrument,
            lessonDate: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
            status: 'awaiting_approval',
            notes: notes || null,
            broadcastGroupId, // Link requests for THIS lesson in broadcast mode
          },
          include: {
            lesson: {
              include: {
                student: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                      }
                    }
                  }
                }
              }
            }
          }
        });

        createdRequests.push(request);
      }
    }

    // Send notifications to all substitute teachers
    for (const teacher of substituteTeachers) {
      const teacherRequests = createdRequests.filter(r => r.substituteTeacherId === teacher.id);

      await prisma.notification.create({
        data: {
          userId: teacher.userId,
          type: 'substitute_request',
          title: 'בקשה לתחליף',
          message: broadcastMode
            ? `נשלחה אליך בקשה לשמש כמורה מחליף עבור ${absence.teacher.user.firstName} ${absence.teacher.user.lastName}. ${teacherRequests.length} שיעורים. (המורה הראשון שיאשר יקבל את השיעורים)`
            : `נשלחה אליך בקשה לשמש כמורה מחליף עבור ${absence.teacher.user.firstName} ${absence.teacher.user.lastName}. ${teacherRequests.length} שיעורים.`,
          link: `/substitute-requests`,
        }
      });
    }

    return NextResponse.json({
      success: true,
      requests: createdRequests,
      broadcastMode,
      message: broadcastMode
        ? `${createdRequests.length} substitute request(s) created and sent to ${substituteTeachers.length} teachers. First to approve will get the lessons.`
        : `${createdRequests.length} substitute request(s) created and notification sent to substitute teacher.`,
    }, { status: 201 });
  } catch (error) {
    console.error('Create substitute request error:', error);
    return NextResponse.json(
      { error: 'Failed to create substitute request', details: error.message },
      { status: 500 }
    );
  }
}
