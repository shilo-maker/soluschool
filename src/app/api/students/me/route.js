import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/students/me - Get current student's profile
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findFirst({
      where: {
        userId: user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get stats
    const totalLessons = await prisma.lesson.count({
      where: { studentId: student.id },
    });

    const completedLessons = await prisma.lesson.count({
      where: {
        studentId: student.id,
        status: 'completed',
      },
    });

    const upcomingLessons = await prisma.lesson.count({
      where: {
        studentId: student.id,
        date: { gte: new Date() },
        status: { not: 'cancelled' },
      },
    });

    return NextResponse.json({
      ...student,
      stats: {
        totalLessons,
        completedLessons,
        upcomingLessons,
      },
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student profile', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/students/me - Update current student's profile
export async function PUT(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.student.findFirst({
      where: { userId: user.userId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const body = await request.json();
    const { phone, notes } = body;

    // Update user phone if provided
    if (phone !== undefined) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { phone },
      });
    }

    // Update student fields
    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(updatedStudent);
  } catch (error) {
    console.error('Update student profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update student profile', details: error.message },
      { status: 500 }
    );
  }
}
