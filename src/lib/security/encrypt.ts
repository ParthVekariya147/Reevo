import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '@/lib/env';

// Warn on Vercel if GBP encryption key is missing — mirrors rateLimit.ts pattern.
if (
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.VERCEL &&
  (!process.env.GBP_OAUTH_CLIENT_ID ||
   !process.env.GBP_OAUTH_CLIENT_SECRET ||
   !process.env.GBP_OAUTH_REDIRECT_URI ||
   !process.env.GBP_TOKEN_ENC_KEY)
) {
  console.warn(
    '[gbp] One or more GBP OAuth env vars are not set (GBP_OAUTH_CLIENT_ID, ' +
    'GBP_OAUTH_CLIENT_SECRET, GBP_OAUTH_REDIRECT_URI, GBP_TOKEN_ENC_KEY). ' +
    'Automated Google Review Reply will be unavailable.',
  );
}

function getKey(): Buffer {
  const hex = env.GBP_TOKEN_ENC_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('[encrypt] GBP_TOKEN_ENC_KEY must be a 64-char hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns a colon-delimited blob: iv_hex:authTag_hex:ciphertext_hex
 * Never logs or exposes the plaintext.
 */
export function encryptToken(plain: string): string {
  const key        = getKey();
  const iv         = randomBytes(12);
  const cipher     = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag    = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypts a blob produced by encryptToken.
 * Throws if the blob is malformed or authentication fails (tampered data).
 */
export function decryptToken(blob: string): string {
  const key   = getKey();
  const parts = blob.split(':');
  if (parts.length !== 3) throw new Error('[decrypt] Invalid token format');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv         = Buffer.from(ivHex, 'hex');
  const authTag    = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher   = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
