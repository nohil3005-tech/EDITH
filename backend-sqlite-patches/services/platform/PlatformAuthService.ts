import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Retrieve or derive encryption key
const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || 'edith-platform-secret-key';
const SALT = 'edith-salt';
const KEY = scryptSync(ENCRYPTION_SECRET, SALT, 32); // Derived 32-byte key
const IV_LENGTH = 16;

export class PlatformAuthService {
  encryptPassword(password: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-cbc', KEY, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Store IV concatenated with ciphertext
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptPassword(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted password format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = createDecipheriv('aes-256-cbc', KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
