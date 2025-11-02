import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// POST /api/teachers/find-substitutes - Find available substitute teachers
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      instrument,
      date,
      startTime,
      endTime,
      originalTeacherId,
    } = body;

    // Validation
    if (!instrument || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Instrument, date, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Find all teachers who teach this instrument
    const teachers = await prisma.teacher.findMany({
      where: {
        instruments: {
          has: instrument,
        },
        user: {
          isActive: true,
        },
        // Exclude the original teacher
        ...(originalTeacherId && { id: { not: originalTeacherId } })
      },
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
    });

    // Check availability for each teacher on the specified date/time
    const lessonDate = new Date(date);

    const availableTeachers = [];

    for (const teacher of teachers) {
      // Find lessons for this teacher on the same date
      const conflictingLessons = await prisma.lesson.findMany({
        where: {
          teacherId: teacher.id,
          date: lessonDate,
          status: {
            in: ['scheduled', 'in_progress']
          },
          OR: [
            // Lesson starts during the requested time
            {
              AND: [
                { startTime: { gte: startTime } },
                { startTime: { lt: endTime } }
              ]
            },
            // Lesson ends during the requested time
            {
              AND: [
                { endTime: { gt: startTime } },
                { endTime: { lte: endTime } }
              ]
            },
            // Lesson completely covers the requested time
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gte: endTime } }
              ]
            }
          ]
        }
      });

      // If no conflicting lessons, this teacher is available
      if (conflictingLessons.length === 0) {
        // Calculate total lessons taught
        const totalLessons = await prisma.lesson.count({
          where: {
            teacherId: teacher.id,
            status: 'completed'
          }
        });

        availableTeachers.push({
          ...teacher,
          totalLessonsCompleted: totalLessons,
          isAvailable: true,
        });
      }
    }

    // Sort by experience (total lessons completed) desc
    availableTeachers.sort((a, b) => b.totalLessonsCompleted - a.totalLessonsCompleted);

    return NextResponse.json({
      success: true,
      availableTeachers,
      totalFound: availableTeachers.length,
      searchCriteria: {
        instrument,
        date: lessonDate,
        startTime,
        endTime,
      }
    });
  } catch (error) {
    console.error('Find substitute teachers error:', error);
    return NextResponse.json(
      { error: 'Failed to find substitute teachers', details: error.message },
      { status: 500 }
    );
  }
}
