import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPin, generatePin, generateQRCode } from '@/lib/auth';
import { getUserFromRequest } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

// GET /api/students - List all students
export async function GET(request) {
  try {
    // Check authentication
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get all students with user data included
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            language: true,
            qrCode: true,
            pinPlainText: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      students,
    });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/students - Create new student
export async function POST(request) {
  try {
    // Check authentication (admin only)
    const currentUser = getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      // User fields
      email,
      password,
      firstName,
      lastName,
      phone,
      language,
      // Student fields
      instruments,
      parentName,
      parentPhone,
      parentEmail,
      notes,
      soluSubsidy,
      additionalSubsidy,
    } = body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'Email, firstName, and lastName are required' },
        { status: 400 }
      );
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Generate PIN and QR code
    const plainPin = generatePin();
    const hashedPin = await hashPin(plainPin);
    const qrCode = generateQRCode();

    // Hash password if provided (optional for students)
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Create user with student in a single transaction using nested create
    const createdUser = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        language: language || 'he',
        role: 'student',
        pin: hashedPin,
        pinPlainText: plainPin,
        qrCode,
        isActive: true,
        student: {
          create: {
            instruments: instruments || [],
            parentName,
            parentPhone,
            parentEmail,
            notes,
            soluSubsidy: soluSubsidy || 20,
            additionalSubsidy: additionalSubsidy || {
              hasSubsidy: false,
              subsidyPerLesson: 0,
            },
          },
        },
      },
      include: {
        student: true,
      },
    });

    return NextResponse.json({
      success: true,
      student: createdUser.student,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        phone: createdUser.phone,
        language: createdUser.language,
        qrCode: createdUser.qrCode,
      },
      pin: plainPin, // Return plain PIN for admin to share with student
    }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
