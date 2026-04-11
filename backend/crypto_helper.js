const crypto = require('crypto');
const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const key = process.env.AES_KEY;
  if (!key || key.length !== 64) throw new Error('AES_KEY must be a 64-char hex string');
  return Buffer.from(key, 'hex');
}

function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return plaintext;
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;
  // If it's not in our encrypted format, return as-is (plaintext fallback for existing data)
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext;
  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return ciphertext; // return raw if decryption fails (e.g. wrong key)
  }
}

// Deterministic HMAC for encrypted fields that need to be searchable (e.g. email lookup)
function hmac(value) {
  if (!value) return value;
  return crypto.createHmac('sha256', process.env.AES_KEY)
    .update(String(value).trim().toLowerCase())
    .digest('hex');
}

module.exports = { encrypt, decrypt, hmac };
