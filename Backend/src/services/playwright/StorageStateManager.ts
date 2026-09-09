import crypto from 'crypto';
import { EncryptedData, StorageStateData } from '../../types/automation.types.js';
import logger from '../../utility/logger.js';

/**
 * Manages encryption and decryption of Playwright storageState
 * Uses AES-256-CBC encryption for secure storage in MongoDB
 */
export class StorageStateManager {
  private algorithm = 'aes-256-cbc';
  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY must be 32 characters. Set it in .env file.'
      );
    }
    this.encryptionKey = Buffer.from(key, 'utf8');
  }

  /**
   * Encrypt storageState data
   * @param data - The storageState object to encrypt
   * @returns Encrypted data with IV
   */
  encrypt(data: StorageStateData): EncryptedData {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      const jsonData = JSON.stringify(data);
      let encrypted = cipher.update(jsonData, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const result: EncryptedData = {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
      };

      logger.debug('StorageState encrypted successfully');
      return result;
    } catch (error) {
      logger.error('Failed to encrypt storageState', { error });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt storageState data
   * @param encryptedData - The encrypted data object with IV
   * @returns Decrypted storageState object
   */
  decrypt(encryptedData: EncryptedData): StorageStateData {
    try {
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv
      );

      let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const result = JSON.parse(decrypted) as StorageStateData;
      logger.debug('StorageState decrypted successfully');
      return result;
    } catch (error) {
      logger.error('Failed to decrypt storageState', { error });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Prepare encrypted string for database storage
   * @param data - The storageState object
   * @returns JSON string of encrypted data
   */
  encryptForDB(data: StorageStateData): string {
    const encrypted = this.encrypt(data);
    return JSON.stringify(encrypted);
  }

  /**
   * Parse and decrypt from database string
   * @param dbString - The encrypted string from database
   * @returns Decrypted storageState object
   */
  decryptFromDB(dbString: string): StorageStateData {
    const encryptedData = JSON.parse(dbString) as EncryptedData;
    return this.decrypt(encryptedData);
  }
}
