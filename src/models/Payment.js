import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    enum: ['ILS', 'USD', 'EUR'],
    default: 'ILS',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'bank_transfer', 'check', 'other'],
    default: 'cash',
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed',
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  referenceNumber: {
    type: String, // Check number, transaction ID, etc.
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  lessonsCount: {
    type: Number,
    default: 0,
  },
  pricePerLesson: {
    type: Number,
    default: 0,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Indexes
PaymentSchema.index({ studentId: 1, paymentDate: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ invoiceNumber: 1 });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
