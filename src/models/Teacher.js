import mongoose from 'mongoose';

const TeacherSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  instruments: [{
    type: String,
    required: true,
  }],
  lessonRate: {
    type: Number,
    default: 80,
    min: 0,
  },
  bio: {
    type: String,
    maxlength: 500,
  },
  availability: [{
    day: {
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
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
  }],
  // Statistics
  stats: {
    totalLessons: {
      type: Number,
      default: 0,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
  },
}, {
  timestamps: true,
});

// Indexes
TeacherSchema.index({ userId: 1 });
TeacherSchema.index({ instruments: 1 });

export default mongoose.models.Teacher || mongoose.model('Teacher', TeacherSchema);
