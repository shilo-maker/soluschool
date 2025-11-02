import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  instrument: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String, // Format: "HH:MM"
    required: true,
  },
  endTime: {
    type: String, // Format: "HH:MM"
    required: true,
  },
  duration: {
    type: Number, // Duration in minutes
    default: 35,
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
  },
  // Check-in/out timestamps
  teacherCheckIn: {
    type: Date,
  },
  studentCheckIn: {
    type: Date,
  },
  teacherCheckOut: {
    type: Date,
  },
  studentCheckOut: {
    type: Date,
  },
  // Notes and cancellation
  teacherNotes: {
    type: String,
    maxlength: 1000,
  },
  cancellationReason: {
    type: String,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Notification flags
  reminderSent: {
    type: Boolean,
    default: false,
  },
  dailySummarySent: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes
LessonSchema.index({ date: 1, startTime: 1 });
LessonSchema.index({ teacherId: 1, date: 1 });
LessonSchema.index({ studentId: 1, date: 1 });
LessonSchema.index({ roomId: 1, date: 1 });
LessonSchema.index({ status: 1 });
LessonSchema.index({ date: 1, status: 1 });

export default mongoose.models.Lesson || mongoose.model('Lesson', LessonSchema);
