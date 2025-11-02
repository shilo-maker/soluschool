import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/jwt';

// GET /api/payments - Get all payments with optional filters
export async function GET(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where = {};

    if (studentId && studentId !== 'all') {
      where.studentId = studentId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (paymentMethod && paymentMethod !== 'all') {
      where.paymentMethod = paymentMethod;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/payments - Create a new payment
export async function POST(request) {
  try {
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      studentId,
      amount,
      currency,
      paymentMethod,
      paymentDate,
      periodStart,
      periodEnd,
      status,
      invoiceNumber,
      referenceNumber,
      lessonsCount,
      pricePerLesson,
      notes,
    } = body;

    // Validate required fields
    if (!studentId || !amount || !paymentDate) {
      return NextResponse.json(
        { error: 'Student ID, amount, and payment date are required' },
        { status: 400 }
      );
    }

    // Check if invoice number already exists (if provided)
    if (invoiceNumber) {
      const existingPayment = await prisma.payment.findUnique({
        where: { invoiceNumber },
      });

      if (existingPayment) {
        return NextResponse.json(
          { error: 'Invoice number already exists' },
          { status: 409 }
        );
      }
    }

    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        currency: currency || 'ILS',
        paymentMethod: paymentMethod || 'cash',
        paymentDate: new Date(paymentDate),
        periodStart: periodStart ? new Date(periodStart) : null,
        periodEnd: periodEnd ? new Date(periodEnd) : null,
        status: status || 'completed',
        invoiceNumber,
        referenceNumber,
        recordedById: user.userId,
        lessonsCount: lessonsCount ? parseInt(lessonsCount) : 0,
        pricePerLesson: pricePerLesson ? parseFloat(pricePerLesson) : 0,
        notes,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        recordedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', details: error.message },
      { status: 500 }
    );
  }
}
