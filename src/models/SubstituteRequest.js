import mongoose from 'mongoose';

const SubstituteRequestSchema = new mongoose.Schema({
  absenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeacherAbsence',
    required: true,
  },
  lessonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true,
  },
  originalTeacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  substituteTeacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  instrument: {
    type: String,
    required: true,
  },
  lessonDate: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'substitute_suggested', 'awaiting_approval', 'approved', 'declined', 'completed', 'cancelled'],
    default: 'pending',
  },
  suggestedSubstitutes: [{
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
    },
    reason: String,
    score: Number,
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Indexes
SubstituteRequestSchema.index({ absenceId: 1 });
SubstituteRequestSchema.index({ lessonId: 1 });
SubstituteRequestSchema.index({ status: 1 });

export default mongoose.models.SubstituteRequest || mongoose.model('SubstituteRequest', SubstituteRequestSchema);
