import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

// In-memory cache for teachers list (30 second TTL)
let teachersCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 30000; // 30 seconds

// GET /api/teachers - List all teachers
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const instrument = searchParams.get('instrument');

    // Check cache (only for unfiltered list)
    const now = Date.now();
    if (!isActive && !instrument && teachersCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('Returning cached teachers list');
      return NextResponse.json(teachersCache);
    }

    const where = {};
    if (isActive !== null && isActive !== undefined) {
      where.user = {
        isActive: isActive === 'true',
      };
    }

    // Filter by instrument if specified
    if (instrument) {
      where.instruments = {
        has: instrument,
      };
    }

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            language: true,
            isActive: true,
            pinPlainText: true,
          },
        },
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });

    const responseData = { success: true, teachers };

    // Cache the response (only for unfiltered list)
    if (!isActive && !instrument) {
      teachersCache = responseData;
      cacheTimestamp = Date.now();
      console.log('Teachers list computed and cached');
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teachers', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/teachers - Create a new teacher
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      language,
      instruments,
      lessonRate,
      bio,
      availability,
    } = body;

    // Validation
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate unique PIN (4 alphanumeric characters)
    const generatePin = () => {
      return Math.random().toString(36).substring(2, 6).toUpperCase();
    };

    let pin = generatePin();
    let pinExists = true;

    // Ensure PIN is unique
    while (pinExists) {
      const existingPin = await prisma.user.findFirst({
        where: { pinPlainText: pin },
      });
      if (!existingPin) {
        pinExists = false;
      } else {
        pin = generatePin();
      }
    }

    // Hash PIN and password
    const hashedPin = await bcrypt.hash(pin, 10);
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Generate QR code data (just the user ID - actual QR image generated on request)
    const qrCode = `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create user and teacher in a transaction
    const newTeacher = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          pin: hashedPin,
          pinPlainText: pin,
          qrCode,
          role: 'teacher',
          firstName,
          lastName,
          phone: phone || null,
          language: language || 'he',
          isActive: true,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: createdUser.id,
          instruments: instruments || [],
          lessonRate: lessonRate || 80,
          bio: bio || null,
          availability: availability || [],
          stats: {
            totalLessons: 0,
            totalStudents: 0,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              language: true,
              pinPlainText: true,
            },
          },
        },
      });

      return teacher;
    });

    return NextResponse.json(
      {
        success: true,
        teacher: newTeacher,
        pin,
        message: 'Teacher created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to create teacher', details: error.message },
      { status: 500 }
    );
  }
}
