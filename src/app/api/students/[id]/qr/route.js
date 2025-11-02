import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import QRCode from 'qrcode';

// GET /api/students/[id]/qr - Generate QR code
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Find student with user
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            qrCode: true,
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

    if (!student.user.qrCode) {
      return NextResponse.json(
        { success: false, message: 'QR code not found' },
        { status: 404 }
      );
    }

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(student.user.qrCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataURL,
      qrCodeString: student.user.qrCode,
      studentName: `${student.user.firstName} ${student.user.lastName}`,
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
