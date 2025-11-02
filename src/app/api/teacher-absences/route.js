import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// In-memory cache for teacher absences (30 second TTL)
let absencesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 30000; // 30 seconds

// GET /api/teacher-absences - List all teacher absences
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming');

    // Create cache key based on filters
    const cacheKey = `${teacherId || 'all'}-${status || 'all'}-${upcoming || 'all'}`;

    // Check cache (only for list view without filters)
    const now = Date.now();
    if (!teacherId && !status && !upcoming && absencesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('Returning cached teacher absences');
      return NextResponse.json(absencesCache);
    }

    const where = {};

    // Filter by teacher
    if (teacherId) {
      where.teacherId = teacherId;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter for upcoming absences
    if (upcoming === 'true') {
      where.startDate = {
        gte: new Date()
      };
    }

    // Optimized query - only load what's needed for list view
    const absences = await prisma.teacherAbsence.findMany({
      where,
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
        // Only load basic substitute request data for count
        substituteRequests: {
          select: {
            id: true,
            status: true,
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    const responseData = {
      success: true,
      absences,
    };

    // Cache the response (only for unfiltered list view)
    if (!teacherId && !status && !upcoming) {
      absencesCache = responseData;
      cacheTimestamp = Date.now();
      console.log('Teacher absences computed and cached');
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get teacher absences error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher absences', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/teacher-absences - Report a teacher absence
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      teacherId,
      startDate,
      endDate,
      reason,
      notes,
    } = body;

    // Validation
    if (!teacherId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Teacher ID, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Verify teacher exists
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      );
    }

    // Create absence record
    const absence = await prisma.teacherAbsence.create({
      data: {
        teacherId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        notes: notes || null,
        status: 'pending',
        reportedById: user.userId,
      },
      include: {
        teacher: {
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
      }
    });

    // Find affected lessons (scheduled lessons in the absence period)
    const affectedLessons = await prisma.lesson.findMany({
      where: {
        teacherId,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: 'scheduled',
      },
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
      },
      orderBy: {
        date: 'asc',
      }
    });

    return NextResponse.json({
      success: true,
      absence,
      affectedLessons,
      message: `Absence reported. ${affectedLessons.length} lesson(s) affected.`,
    }, { status: 201 });
  } catch (error) {
    console.error('Create teacher absence error:', error);
    return NextResponse.json(
      { error: 'Failed to report absence', details: error.message },
      { status: 500 }
    );
  }
}
