import crypto from 'node:crypto';
import { config } from '../config.js';

/**
 * Field-level encryption for sensitive secrets (Plaid access tokens).
 *
 * Uses AES-256-GCM, an authenticated cipher: tampering with the stored
 * ciphertext is detected on decrypt. The output stored in the database is
 *
 *     base64(iv) : base64(authTag) : base64(ciphertext)
 *
 * The key comes from APP_ENCRYPTION_KEY (32 bytes, base64). A leaked database
 * dump without this key is useless to an attacker.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  if (!config.encryptionKey) {
    throw new Error(
      'APP_ENCRYPTION_KEY is not set. Generate one with `npm run key:gen`.',
    );
  }
  const key = Buffer.from(config.encryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error(
      `APP_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). ` +
        'Generate a valid one with `npm run key:gen`.',
    );
  }
  cachedKey = key;
  return key;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed ciphertext payload.');
  }
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
