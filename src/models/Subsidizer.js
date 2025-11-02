import mongoose from 'mongoose';

const SubsidizerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
  },
  notes: {
    type: String,
    maxlength: 1000,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
SubsidizerSchema.index({ name: 1 });
SubsidizerSchema.index({ isActive: 1 });

export default mongoose.models.Subsidizer || mongoose.model('Subsidizer', SubsidizerSchema);
