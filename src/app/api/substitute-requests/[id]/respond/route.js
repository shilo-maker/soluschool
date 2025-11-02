import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// POST /api/substitute-requests/[id]/respond - Substitute teacher responds to request
export async function POST(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { response, notes } = body; // response: 'approved' or 'declined'

    // Validation
    if (!response || !['approved', 'declined'].includes(response)) {
      return NextResponse.json(
        { error: 'Response must be either "approved" or "declined"' },
        { status: 400 }
      );
    }

    // Get the substitute request
    const substituteRequest = await prisma.substituteRequest.findUnique({
      where: { id },
      include: {
        absence: {
          include: {
            teacher: {
              include: {
                user: true
              }
            }
          }
        },
        lesson: {
          include: {
            student: {
              include: {
                user: true
              }
            }
          }
        },
        substituteTeacher: {
          include: {
            user: true
          }
        }
      }
    });

    if (!substituteRequest) {
      return NextResponse.json(
        { error: 'Substitute request not found' },
        { status: 404 }
      );
    }

    // Verify that the current user is the substitute teacher
    const teacher = await prisma.teacher.findUnique({
      where: { userId: user.userId }
    });

    if (!teacher || teacher.id !== substituteRequest.substituteTeacherId) {
      return NextResponse.json(
        { error: 'You are not authorized to respond to this request' },
        { status: 403 }
      );
    }

    if (response === 'approved') {
      // Check if this is part of a broadcast group
      const broadcastGroupId = substituteRequest.broadcastGroupId;
      let cancelledRequests = [];

      // If in broadcast mode, auto-cancel all other pending requests for the same lesson
      if (broadcastGroupId) {
        const otherPendingRequests = await prisma.substituteRequest.findMany({
          where: {
            broadcastGroupId,
            lessonId: substituteRequest.lessonId,
            id: { not: id },
            status: { in: ['pending', 'awaiting_approval'] }
          },
          include: {
            substituteTeacher: {
              include: {
                user: true
              }
            }
          }
        });

        // Auto-cancel other pending requests
        if (otherPendingRequests.length > 0) {
          await prisma.substituteRequest.updateMany({
            where: {
              id: { in: otherPendingRequests.map(r => r.id) }
            },
            data: {
              status: 'cancelled',
              notes: 'Auto-cancelled: Another teacher was approved first (broadcast mode)'
            }
          });

          cancelledRequests = otherPendingRequests;

          // Notify teachers whose requests were auto-cancelled
          for (const cancelledRequest of otherPendingRequests) {
            await prisma.notification.create({
              data: {
                userId: cancelledRequest.substituteTeacher.userId,
                type: 'substitute_request_cancelled',
                title: 'בקשת תחליף בוטלה',
                message: `הבקשה לשיעור ב-${new Date(substituteRequest.lessonDate).toLocaleDateString('he-IL')} בשעה ${substituteRequest.startTime} בוטלה כי מורה אחר אישר ראשון.`,
                link: `/substitute-requests`,
              }
            });
          }
        }
      }

      // Update the substitute request status
      const updatedRequest = await prisma.substituteRequest.update({
        where: { id },
        data: {
          status: 'approved',
          approvedById: user.userId,
          approvedAt: new Date(),
          notes: notes || substituteRequest.notes,
        }
      });

      // Update the lesson to assign the substitute teacher
      await prisma.lesson.update({
        where: { id: substituteRequest.lessonId },
        data: {
          teacherId: substituteRequest.substituteTeacherId,
        }
      });

      // Send notification to original teacher
      await prisma.notification.create({
        data: {
          userId: substituteRequest.absence.teacher.userId,
          type: 'substitute_approved',
          title: 'מורה מחליף אושר',
          message: `${substituteRequest.substituteTeacher.user.firstName} ${substituteRequest.substituteTeacher.user.lastName} אישר/ה להחליף את השיעור ב-${new Date(substituteRequest.lessonDate).toLocaleDateString('he-IL')} בשעה ${substituteRequest.startTime}.`,
          link: `/teacher-absences/${substituteRequest.absenceId}`,
        }
      });

      // Send notification to student
      await prisma.notification.create({
        data: {
          userId: substituteRequest.lesson.student.userId,
          type: 'teacher_changed',
          title: 'שינוי מורה',
          message: `השיעור שלך ב-${new Date(substituteRequest.lessonDate).toLocaleDateString('he-IL')} בשעה ${substituteRequest.startTime} יינתן על ידי ${substituteRequest.substituteTeacher.user.firstName} ${substituteRequest.substituteTeacher.user.lastName}.`,
          link: `/lessons`,
        }
      });

      return NextResponse.json({
        success: true,
        substituteRequest: updatedRequest,
        cancelledRequests: cancelledRequests.length,
        message: broadcastGroupId
          ? `Request approved. Lesson has been assigned to you. ${cancelledRequests.length} other pending request(s) auto-cancelled.`
          : 'Request approved. Lesson has been assigned to you.',
      });

    } else { // declined
      // Update the substitute request status
      const updatedRequest = await prisma.substituteRequest.update({
        where: { id },
        data: {
          status: 'declined',
          notes: notes || substituteRequest.notes,
        }
      });

      // Send notification to the person who created the request (reporter)
      await prisma.notification.create({
        data: {
          userId: substituteRequest.absence.reportedById,
          type: 'substitute_declined',
          title: 'בקשת תחליף נדחתה',
          message: `${substituteRequest.substituteTeacher.user.firstName} ${substituteRequest.substituteTeacher.user.lastName} דחה/תה את הבקשה לשמש כמורה מחליף לשיעור ב-${new Date(substituteRequest.lessonDate).toLocaleDateString('he-IL')} בשעה ${substituteRequest.startTime}.`,
          link: `/teacher-absences/${substituteRequest.absenceId}`,
        }
      });

      return NextResponse.json({
        success: true,
        substituteRequest: updatedRequest,
        message: 'Request declined.',
      });
    }
  } catch (error) {
    console.error('Respond to substitute request error:', error);
    return NextResponse.json(
      { error: 'Failed to respond to request', details: error.message },
      { status: 500 }
    );
  }
}
