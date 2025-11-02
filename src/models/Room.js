import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  number: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    default: 2,
    min: 1,
  },
  equipment: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
RoomSchema.index({ name: 1 });
RoomSchema.index({ isActive: 1 });

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);
