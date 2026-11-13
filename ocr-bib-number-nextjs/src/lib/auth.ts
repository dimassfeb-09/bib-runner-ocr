import crypto from 'crypto';

/**
 * Membuat hash password yang aman menggunakan algoritma scrypt bawaan Node.js (tanpa library tambahan)
 * @param password Password text biasa
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Memverifikasi apakah password cocok dengan hash yang tersimpan di database
 * @param password Password text biasa dari input login
 * @param storedHash Hash yang diambil dari database (format "salt:hash")
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return verifyHash === hash;
}
