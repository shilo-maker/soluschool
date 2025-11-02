import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/students/[id] - Get student by ID
export async function GET(request, { params }) {
  try {
    // Check authentication
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const student = await prisma.student.findUnique({
      where: { id },
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
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error('Get student error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/students/[id] - Update student
export async function PUT(request, { params }) {
  try {
    // Check authentication (admin only)
    const currentUser = getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const {
      // User fields
      email,
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

    // Find student
    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Prepare user update data
    const userUpdateData = {};
    if (email) userUpdateData.email = email.toLowerCase();
    if (firstName) userUpdateData.firstName = firstName;
    if (lastName) userUpdateData.lastName = lastName;
    if (phone !== undefined) userUpdateData.phone = phone;
    if (language) userUpdateData.language = language;

    // Prepare student update data
    const studentUpdateData = {};
    if (instruments) studentUpdateData.instruments = instruments;
    if (parentName !== undefined) studentUpdateData.parentName = parentName;
    if (parentPhone !== undefined) studentUpdateData.parentPhone = parentPhone;
    if (parentEmail !== undefined) studentUpdateData.parentEmail = parentEmail;
    if (notes !== undefined) studentUpdateData.notes = notes;
    if (soluSubsidy !== undefined) studentUpdateData.soluSubsidy = soluSubsidy;
    if (additionalSubsidy) studentUpdateData.additionalSubsidy = additionalSubsidy;

    // Update user if there are changes
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: student.userId },
        data: userUpdateData,
      });
    }

    // Update student if there are changes
    const updatedStudent = await prisma.student.update({
      where: { id },
      data: studentUpdateData,
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
    });

    return NextResponse.json({
      success: true,
      student: updatedStudent,
    });
  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[id] - Soft delete student
export async function DELETE(request, { params }) {
  try {
    // Check authentication (admin only)
    const currentUser = getUserFromRequest(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Find student
    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, message: 'Student not found' },
        { status: 404 }
      );
    }

    // Soft delete user (set isActive = false)
    await prisma.user.update({
      where: { id: student.userId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Student deactivated successfully',
    });
  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
