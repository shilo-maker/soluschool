import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/teachers/[id]/get-pin - Get teacher's PIN (admin only)
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            pinPlainText: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pin: teacher.user.pinPlainText,
      teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`,
    });
  } catch (error) {
    console.error('Get teacher PIN error:', error);
    return NextResponse.json(
      { error: 'Failed to get PIN', details: error.message },
      { status: 500 }
    );
  }
}
