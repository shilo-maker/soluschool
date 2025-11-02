import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';
import QRCode from 'qrcode';

// GET /api/teachers/[id]/qr - Generate QR code for teacher
export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            qrCode: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(teacher.user.qrCode, {
      width: 300,
      margin: 2,
    });

    return NextResponse.json({
      success: true,
      qrCode: qrDataUrl,
      teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`,
    });
  } catch (error) {
    console.error('Generate teacher QR error:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code', details: error.message },
      { status: 500 }
    );
  }
}
