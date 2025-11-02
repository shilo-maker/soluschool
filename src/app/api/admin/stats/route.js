import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// In-memory cache for stats (30 second TTL)
let statsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if cache is still valid
    const now = Date.now();
    if (statsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('Returning cached stats');
      return NextResponse.json(statsCache);
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this week's date range
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Use optimized raw SQL queries for better performance
    const [
      studentsResult,
      teachersResult,
      roomsResult,
      todayLessonsResult,
      weekLessonsResult,
      completedLessonsResult,
      noShowLessonsResult,
      upcomingLessonsResult,
      activeSchedulesResult,
    ] = await Promise.all([
      // Count active students (optimized with raw SQL)
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Student" s
        INNER JOIN "User" u ON s."userId" = u.id
        WHERE u."isActive" = true
      `,

      // Count active teachers (optimized with raw SQL)
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Teacher" t
        INNER JOIN "User" u ON t."userId" = u.id
        WHERE u."isActive" = true
      `,

      // Count active rooms
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Room"
        WHERE "isActive" = true
      `,

      // Count today's lessons
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Lesson"
        WHERE date >= ${today}
        AND date < ${tomorrow}
        AND status != 'cancelled'
      `,

      // Count this week's lessons
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Lesson"
        WHERE date >= ${startOfWeek}
        AND date < ${endOfWeek}
      `,

      // Count completed lessons
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Lesson"
        WHERE date >= ${startOfWeek}
        AND date < ${endOfWeek}
        AND status = 'completed'
      `,

      // Count no-show lessons
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Lesson"
        WHERE date >= ${startOfWeek}
        AND date < ${endOfWeek}
        AND status = 'no_show'
      `,

      // Count upcoming lessons
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Lesson"
        WHERE date >= ${today}
        AND date < ${new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)}
        AND status IN ('scheduled', 'in_progress')
      `,

      // Count active schedules
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM "Schedule"
        WHERE "isActive" = true
      `,
    ]);

    // Extract counts from results (BigInt to Number conversion)
    const totalStudents = Number(studentsResult[0].count);
    const totalTeachers = Number(teachersResult[0].count);
    const totalRooms = Number(roomsResult[0].count);
    const todayLessons = Number(todayLessonsResult[0].count);
    const weekLessons = Number(weekLessonsResult[0].count);
    const completedLessons = Number(completedLessonsResult[0].count);
    const noShowLessons = Number(noShowLessonsResult[0].count);
    const upcomingLessons = Number(upcomingLessonsResult[0].count);
    const activeSchedules = Number(activeSchedulesResult[0].count);

    // Calculate attendance rate
    const totalAttendable = completedLessons + noShowLessons;
    const attendanceRate = totalAttendable > 0 ? Math.round((completedLessons / totalAttendable) * 100) : 0;

    // Build response
    const stats = {
      totalStudents,
      totalTeachers,
      totalRooms,
      todayLessons,
      weekLessons,
      attendanceRate,
      upcomingLessons,
      activeSchedules,
    };

    // Update cache
    statsCache = stats;
    cacheTimestamp = Date.now();
    console.log('Stats computed and cached');

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    );
  }
}
