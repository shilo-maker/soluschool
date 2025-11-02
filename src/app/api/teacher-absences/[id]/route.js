import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/teacher-absences/[id] - Get specific absence with details
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const absence = await prisma.teacherAbsence.findUnique({
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
              }
            }
          }
        },
        reportedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        substituteRequests: {
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
                },
                room: true,
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
            }
          },
          orderBy: {
            lessonDate: 'asc'
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

    return NextResponse.json({
      success: true,
      absence,
    });
  } catch (error) {
    console.error('Get teacher absence error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch absence', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/teacher-absences/[id] - Update absence status
export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const absence = await prisma.teacherAbsence.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json({
      success: true,
      absence,
    });
  } catch (error) {
    console.error('Update teacher absence error:', error);
    return NextResponse.json(
      { error: 'Failed to update absence', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/teacher-absences/[id] - Delete absence
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Delete all related substitute requests first
    await prisma.substituteRequest.deleteMany({
      where: { absenceId: id }
    });

    // Delete the absence
    await prisma.teacherAbsence.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Absence deleted successfully'
    });
  } catch (error) {
    console.error('Delete teacher absence error:', error);
    return NextResponse.json(
      { error: 'Failed to delete absence', details: error.message },
      { status: 500 }
    );
  }
}
