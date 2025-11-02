import bcrypt from 'bcryptjs';

/**
 * Hash a password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Hash a PIN
 */
export async function hashPin(pin) {
  return bcrypt.hash(pin, 10);
}

/**
 * Compare PIN with hash
 */
export async function comparePin(pin, hash) {
  if (!hash) return false;
  return bcrypt.compare(pin, hash);
}

/**
 * Generate a random 4-character alphanumeric PIN
 */
export function generatePin() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let pin = '';
  for (let i = 0; i < 4; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

/**
 * Generate unique QR code string
 */
export function generateQRCode() {
  return `SOLU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
}
