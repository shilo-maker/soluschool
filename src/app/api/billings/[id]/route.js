import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/billings/[id] - Get a single billing
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const billing = await prisma.billing.findUnique({
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
              },
            },
          },
        },
      },
    });

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 });
    }

    // If teacher, verify they own this billing
    if (user.role === 'teacher') {
      const teacher = await prisma.teacher.findFirst({
        where: { userId: user.userId },
      });

      if (!teacher || billing.teacherId !== teacher.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    return NextResponse.json(billing);
  } catch (error) {
    console.error('Get billing error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/billings/[id] - Update a billing
export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const updateData = { status };

    // If marking as paid, set paidAt timestamp
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const billing = await prisma.billing.update({
      where: { id },
      data: updateData,
      include: {
        teacher: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(billing);
  } catch (error) {
    console.error('Update billing error:', error);
    return NextResponse.json(
      { error: 'Failed to update billing', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/billings/[id] - Delete a billing
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const billing = await prisma.billing.findUnique({
      where: { id },
    });

    if (!billing) {
      return NextResponse.json({ error: 'Billing not found' }, { status: 404 });
    }

    await prisma.billing.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Billing deleted successfully' });
  } catch (error) {
    console.error('Delete billing error:', error);
    return NextResponse.json(
      { error: 'Failed to delete billing', details: error.message },
      { status: 500 }
    );
  }
}
