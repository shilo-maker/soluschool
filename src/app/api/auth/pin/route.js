import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePin } from '@/lib/auth';
import { signToken } from '@/lib/jwt';

export async function POST(request) {
  try {
    const { pin } = await request.json();

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { success: false, message: 'Valid 4-digit PIN is required' },
        { status: 400 }
      );
    }

    // Find all active users with PINs (we need to compare hashed PINs)
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        pin: {
          not: null,
        },
      },
    });

    // Find user with matching PIN
    let matchedUser = null;
    for (const user of users) {
      const isMatch = await comparePin(pin.toUpperCase(), user.pin);
      if (isMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = signToken({
      userId: matchedUser.id,
      email: matchedUser.email,
      role: matchedUser.role,
      firstName: matchedUser.firstName,
      lastName: matchedUser.lastName,
    });

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        role: matchedUser.role,
        firstName: matchedUser.firstName,
        lastName: matchedUser.lastName,
        language: matchedUser.language,
      },
    });

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('PIN login error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
