import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/rooms - List all rooms
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where = {};
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const rooms = await prisma.room.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/rooms - Create a new room
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, number, capacity, equipment, isActive } = body;

    // Validation
    if (!name || !number) {
      return NextResponse.json(
        { error: 'Name and number are required' },
        { status: 400 }
      );
    }

    // Check if room name already exists
    const existingRoom = await prisma.room.findUnique({
      where: { name },
    });

    if (existingRoom) {
      return NextResponse.json(
        { error: 'Room with this name already exists' },
        { status: 400 }
      );
    }

    const room = await prisma.room.create({
      data: {
        name,
        number,
        capacity: capacity || 2,
        equipment: equipment || [],
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(
      { success: true, room, message: 'Room created successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Failed to create room', details: error.message },
      { status: 500 }
    );
  }
}
