import mongoose from 'mongoose';

const TeacherAbsenceSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['pending', 'coverage_needed', 'partially_covered', 'fully_covered', 'cancelled'],
    default: 'pending',
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  notes: {
    type: String,
    maxlength: 1000,
  },
}, {
  timestamps: true,
});

// Indexes
TeacherAbsenceSchema.index({ teacherId: 1, startDate: 1, endDate: 1 });
TeacherAbsenceSchema.index({ status: 1 });

export default mongoose.models.TeacherAbsence || mongoose.model('TeacherAbsence', TeacherAbsenceSchema);
