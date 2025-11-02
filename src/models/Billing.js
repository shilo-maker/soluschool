import mongoose from 'mongoose';

const BillingSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
  },
  lessons: [{
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    date: Date,
    duration: Number,
    studentName: String,
    instrument: String,
  }],
  totalLessons: {
    type: Number,
    default: 0,
  },
  totalHours: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid'],
    default: 'pending',
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  paidAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Unique compound index - one billing record per teacher per month
BillingSchema.index({ teacherId: 1, month: 1, year: 1 }, { unique: true });
BillingSchema.index({ status: 1 });

export default mongoose.models.Billing || mongoose.model('Billing', BillingSchema);
