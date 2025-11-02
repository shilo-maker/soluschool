import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// POST /api/lessons/generate - Generate lessons from schedules for a date range
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: startDate and endDate' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range (max 3 months)
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 90 days' },
        { status: 400 }
      );
    }

    // Get all active schedules
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        OR: [
          {
            AND: [
              { effectiveFrom: { lte: end } },
              { effectiveUntil: null },
            ],
          },
          {
            AND: [
              { effectiveFrom: { lte: end } },
              { effectiveUntil: { gte: start } },
            ],
          },
        ],
      },
    });

    const createdLessons = [];
    const skippedLessons = [];

    // Generate lessons for each day in the range
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

      // Find schedules for this day of week
      const daySchedules = schedules.filter((schedule) => {
        // Check if schedule is active for this date
        const scheduleStart = new Date(schedule.effectiveFrom);
        const scheduleEnd = schedule.effectiveUntil ? new Date(schedule.effectiveUntil) : null;

        return (
          schedule.dayOfWeek === dayOfWeek &&
          date >= scheduleStart &&
          (!scheduleEnd || date <= scheduleEnd)
        );
      });

      // Create lessons for each matching schedule
      for (const schedule of daySchedules) {
        // Check if lesson already exists
        const existingLesson = await prisma.lesson.findFirst({
          where: {
            teacherId: schedule.teacherId,
            studentId: schedule.studentId,
            roomId: schedule.roomId,
            date: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lte: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        });

        if (existingLesson) {
          skippedLessons.push({
            date: new Date(date),
            scheduleId: schedule.id,
            reason: 'Lesson already exists',
          });
          continue;
        }

        try {
          const lesson = await prisma.lesson.create({
            data: {
              teacherId: schedule.teacherId,
              studentId: schedule.studentId,
              roomId: schedule.roomId,
              instrument: schedule.instrument,
              date: new Date(date),
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              duration: schedule.duration,
              status: 'scheduled',
            },
          });

          createdLessons.push(lesson);
        } catch (error) {
          skippedLessons.push({
            date: new Date(date),
            scheduleId: schedule.id,
            reason: error.message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${createdLessons.length} lessons, skipped ${skippedLessons.length}`,
      createdCount: createdLessons.length,
      skippedCount: skippedLessons.length,
      created: createdLessons,
      skipped: skippedLessons,
    });
  } catch (error) {
    console.error('Generate lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to generate lessons', details: error.message },
      { status: 500 }
    );
  }
}
