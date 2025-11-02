import mongoose from 'mongoose';

const ScheduleSchema = new mongoose.Schema({
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
  dayOfWeek: {
    type: Number, // 0=Sunday, 1=Monday, ..., 6=Saturday
    required: true,
    min: 0,
    max: 6,
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
  effectiveFrom: {
    type: Date,
    required: true,
  },
  effectiveUntil: {
    type: Date, // null = indefinite
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

// Indexes
ScheduleSchema.index({ dayOfWeek: 1, startTime: 1 });
ScheduleSchema.index({ teacherId: 1 });
ScheduleSchema.index({ studentId: 1 });
ScheduleSchema.index({ roomId: 1 });
ScheduleSchema.index({ isActive: 1 });

export default mongoose.models.Schedule || mongoose.model('Schedule', ScheduleSchema);
