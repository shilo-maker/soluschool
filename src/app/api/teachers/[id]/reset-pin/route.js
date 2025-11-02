import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';
import bcrypt from 'bcryptjs';
import { sendPinResetEmail } from '@/lib/emailService';

// POST /api/teachers/[id]/reset-pin - Reset teacher's PIN
export async function POST(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Generate new PIN
    const generatePin = () => {
      return Math.random().toString(36).substring(2, 6).toUpperCase();
    };

    let newPin = generatePin();
    let pinExists = true;

    // Ensure PIN is unique
    while (pinExists) {
      const existingPin = await prisma.user.findFirst({
        where: { pinPlainText: newPin },
      });
      if (!existingPin) {
        pinExists = false;
      } else {
        newPin = generatePin();
      }
    }

    // Hash new PIN
    const hashedPin = await bcrypt.hash(newPin, 10);

    // Update user with new PIN
    await prisma.user.update({
      where: { id: teacher.userId },
      data: {
        pin: hashedPin,
        pinPlainText: newPin,
      },
    });

    // Send email notification
    try {
      await sendPinResetEmail(
        teacher.user.email,
        `${teacher.user.firstName} ${teacher.user.lastName}`,
        newPin
      );
    } catch (emailError) {
      console.error('Failed to send PIN reset email:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json({
      success: true,
      pin: newPin,
      message: 'PIN reset successfully',
    });
  } catch (error) {
    console.error('Reset teacher PIN error:', error);
    return NextResponse.json(
      { error: 'Failed to reset PIN', details: error.message },
      { status: 500 }
    );
  }
}
