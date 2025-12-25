import crypto from 'crypto';

/**
 * Generates a cryptographically secure secret key for a title
 * Format: 32 bytes (256 bits) encoded as hex = 64 characters
 */
export function generateTitleSecretKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates that a secret key is in the correct format
 */
export function isValidSecretKey(key: string): boolean {
  return /^[a-f0-9]{64}$/i.test(key);
}

/**
 * Generates a unique title ID
 * Format: timestamp + random bytes for uniqueness
 */
export function generateTitleId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `title_${timestamp}_${random}`;
}
