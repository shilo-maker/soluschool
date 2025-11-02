import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

// GET /api/teachers/[id] - Get single teacher
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const teacher = await prisma.teacher.findUnique({
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
            isActive: true,
            pinPlainText: true,
            qrCode: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            schedules: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, teacher });
  } catch (error) {
    console.error('Get teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teacher', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/teachers/[id] - Update teacher
export async function PUT(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      language,
      isActive,
      instruments,
      lessonRate,
      bio,
      availability,
    } = body;

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Check if email is being changed and if it conflicts
    if (email && email !== existingTeacher.user.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email },
      });

      if (emailConflict) {
        return NextResponse.json(
          { error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Update in transaction
    const updatedTeacher = await prisma.$transaction(async (tx) => {
      // Update user data
      const userUpdateData = {};
      if (email !== undefined) userUpdateData.email = email;
      if (firstName !== undefined) userUpdateData.firstName = firstName;
      if (lastName !== undefined) userUpdateData.lastName = lastName;
      if (phone !== undefined) userUpdateData.phone = phone;
      if (language !== undefined) userUpdateData.language = language;
      if (isActive !== undefined) userUpdateData.isActive = isActive;

      // Hash new password if provided
      if (password) {
        userUpdateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingTeacher.userId },
          data: userUpdateData,
        });
      }

      // Update teacher data
      const teacherUpdateData = {};
      if (instruments !== undefined) teacherUpdateData.instruments = instruments;
      if (lessonRate !== undefined) teacherUpdateData.lessonRate = lessonRate;
      if (bio !== undefined) teacherUpdateData.bio = bio;
      if (availability !== undefined) teacherUpdateData.availability = availability;

      if (Object.keys(teacherUpdateData).length > 0) {
        await tx.teacher.update({
          where: { id },
          data: teacherUpdateData,
        });
      }

      // Fetch updated teacher with user data
      return await tx.teacher.findUnique({
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
              isActive: true,
              pinPlainText: true,
            },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      teacher: updatedTeacher,
      message: 'Teacher updated successfully',
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to update teacher', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/teachers/[id] - Delete teacher (soft delete)
export async function DELETE(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if teacher exists
    const existingTeacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
        _count: {
          select: {
            lessons: true,
            schedules: true,
          },
        },
      },
    });

    if (!existingTeacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Soft delete by deactivating user
    await prisma.user.update({
      where: { id: existingTeacher.userId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Teacher deactivated successfully',
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json(
      { error: 'Failed to delete teacher', details: error.message },
      { status: 500 }
    );
  }
}
