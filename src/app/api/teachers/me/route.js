import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/teachers/me - Get current teacher's data
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: user.userId,
      },
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
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json(teacher);
  } catch (error) {
    console.error('Get teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher data', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/teachers/me - Update current teacher's profile
export async function PUT(request) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, bio } = body;

    // Update teacher record
    const teacher = await prisma.teacher.findFirst({
      where: { userId: user.userId },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        bio: bio || teacher.bio,
      },
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
    });

    // Update user phone if provided
    if (phone) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { phone },
      });
    }

    return NextResponse.json(updatedTeacher);
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to update teacher profile', details: error.message },
      { status: 500 }
    );
  }
}
