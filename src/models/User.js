import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values
  },
  pin: {
    type: String, // Hashed 4-digit alphanumeric PIN
  },
  pinPlainText: {
    type: String, // Unhashed PIN for user reference
  },
  password: {
    type: String, // Hashed password
  },
  qrCode: {
    type: String, // Unique QR code string
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'student', 'sponsor'],
    required: true,
    default: 'student',
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  language: {
    type: String,
    enum: ['en', 'he'],
    default: 'he', // Hebrew is default
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ pin: 1 });
UserSchema.index({ qrCode: 1 });

// Methods
UserSchema.methods.comparePin = async function(candidatePin) {
  if (!this.pin) return false;
  return bcrypt.compare(candidatePin, this.pin);
};

UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') && !this.isModified('pin')) {
    return next();
  }

  try {
    if (this.isModified('password') && this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }

    if (this.isModified('pin') && this.pin && !this.pin.startsWith('$2')) {
      // Only hash if not already hashed
      this.pin = await bcrypt.hash(this.pin, 10);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Generate a random 4-character alphanumeric PIN
UserSchema.statics.generatePin = function() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
};

// Generate unique QR code string
UserSchema.statics.generateQRCode = function() {
  return `SOLU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
