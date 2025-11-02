import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/subsidizers - Get all subsidizers
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subsidizers = await prisma.subsidizer.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Get student count for each subsidizer
    const subsidizersWithCounts = await Promise.all(
      subsidizers.map(async (subsidizer) => {
        const studentCount = await prisma.student.count({
          where: {
            additionalSubsidy: {
              path: ['subsidizerId'],
              equals: subsidizer.id,
            },
          },
        });

        return {
          ...subsidizer,
          studentCount,
        };
      })
    );

    return NextResponse.json(subsidizersWithCounts);
  } catch (error) {
    console.error('Get subsidizers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subsidizers', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/subsidizers - Create new subsidizer
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if subsidizer with same name already exists
    const existing = await prisma.subsidizer.findFirst({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Subsidizer with this name already exists' },
        { status: 400 }
      );
    }

    const subsidizer = await prisma.subsidizer.create({
      data: {
        name,
        email,
        phone,
        notes,
        isActive: true,
      },
    });

    return NextResponse.json(subsidizer, { status: 201 });
  } catch (error) {
    console.error('Create subsidizer error:', error);
    return NextResponse.json(
      { error: 'Failed to create subsidizer', details: error.message },
      { status: 500 }
    );
  }
}
