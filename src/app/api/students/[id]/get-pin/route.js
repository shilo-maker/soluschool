import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/students/[id]/get-pin - Get student's PIN (admin only)
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const student = await prisma.student.findUnique({
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

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pin: student.user.pinPlainText,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
    });
  } catch (error) {
    console.error('Get student PIN error:', error);
    return NextResponse.json(
      { error: 'Failed to get PIN', details: error.message },
      { status: 500 }
    );
  }
}
