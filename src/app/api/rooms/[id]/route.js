import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/rooms/[id] - Get single room
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lessons: true,
            schedules: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, room });
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/rooms/[id] - Update room
export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { name, number, capacity, equipment, isActive } = body;

    // Check if room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if name is being changed and if it conflicts
    if (name && name !== existingRoom.name) {
      const nameConflict = await prisma.room.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Room with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (number !== undefined) updateData.number = number;
    if (capacity !== undefined) updateData.capacity = capacity;
    if (equipment !== undefined) updateData.equipment = equipment;
    if (isActive !== undefined) updateData.isActive = isActive;

    const room = await prisma.room.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      room,
      message: 'Room updated successfully',
    });
  } catch (error) {
    console.error('Update room error:', error);
    return NextResponse.json(
      { error: 'Failed to update room', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[id] - Delete room (soft delete by setting isActive = false)
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if room exists
    const existingRoom = await prisma.room.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            lessons: true,
            schedules: true,
          },
        },
      },
    });

    if (!existingRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if room has active lessons or schedules
    if (existingRoom._count.lessons > 0 || existingRoom._count.schedules > 0) {
      // Soft delete - just deactivate
      const room = await prisma.room.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        room,
        message: 'Room deactivated (has associated lessons/schedules)',
      });
    }

    // Hard delete if no dependencies
    await prisma.room.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Room deleted permanently',
    });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json(
      { error: 'Failed to delete room', details: error.message },
      { status: 500 }
    );
  }
}
