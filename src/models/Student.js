import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  instruments: [{
    instrument: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
    },
  }],
  parentName: {
    type: String,
  },
  parentPhone: {
    type: String,
  },
  parentEmail: {
    type: String,
    lowercase: true,
    trim: true,
  },
  notes: {
    type: String,
    maxlength: 1000,
  },
  // SOLU Subsidy (always 20 ILS)
  soluSubsidy: {
    type: Number,
    default: 20,
    required: true,
  },
  // Additional Subsidy (optional)
  additionalSubsidy: {
    hasSubsidy: {
      type: Boolean,
      default: false,
    },
    subsidyPerLesson: {
      type: Number,
      default: 0,
      min: 0,
    },
    subsidizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subsidizer',
    },
  },
  // Statistics
  stats: {
    totalLessons: {
      type: Number,
      default: 0,
    },
    attendanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
}, {
  timestamps: true,
});

// Indexes
StudentSchema.index({ userId: 1 });
StudentSchema.index({ 'instruments.teacherId': 1 });
StudentSchema.index({ 'additionalSubsidy.subsidizerId': 1 });

export default mongoose.models.Student || mongoose.model('Student', StudentSchema);
