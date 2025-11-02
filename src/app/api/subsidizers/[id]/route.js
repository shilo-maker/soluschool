import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/subsidizers/[id] - Get single subsidizer
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const subsidizer = await prisma.subsidizer.findUnique({
      where: { id },
    });

    if (!subsidizer) {
      return NextResponse.json({ error: 'Subsidizer not found' }, { status: 404 });
    }

    // Get students supported by this subsidizer
    const students = await prisma.student.findMany({
      where: {
        additionalSubsidy: {
          path: ['subsidizerId'],
          equals: id,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...subsidizer,
      students,
      studentCount: students.length,
    });
  } catch (error) {
    console.error('Get subsidizer error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subsidizer', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/subsidizers/[id] - Update subsidizer
export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, notes, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if subsidizer exists
    const existing = await prisma.subsidizer.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Subsidizer not found' }, { status: 404 });
    }

    // Check if another subsidizer has the same name
    const duplicate = await prisma.subsidizer.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Another subsidizer with this name already exists' },
        { status: 400 }
      );
    }

    const subsidizer = await prisma.subsidizer.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        notes,
        isActive,
      },
    });

    return NextResponse.json(subsidizer);
  } catch (error) {
    console.error('Update subsidizer error:', error);
    return NextResponse.json(
      { error: 'Failed to update subsidizer', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/subsidizers/[id] - Delete subsidizer
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if subsidizer exists
    const subsidizer = await prisma.subsidizer.findUnique({
      where: { id },
    });

    if (!subsidizer) {
      return NextResponse.json({ error: 'Subsidizer not found' }, { status: 404 });
    }

    // Check if any students are using this subsidizer
    const studentCount = await prisma.student.count({
      where: {
        additionalSubsidy: {
          path: ['subsidizerId'],
          equals: id,
        },
      },
    });

    if (studentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete subsidizer. ${studentCount} student(s) are currently using this subsidizer.`,
        },
        { status: 400 }
      );
    }

    await prisma.subsidizer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete subsidizer error:', error);
    return NextResponse.json(
      { error: 'Failed to delete subsidizer', details: error.message },
      { status: 500 }
    );
  }
}
