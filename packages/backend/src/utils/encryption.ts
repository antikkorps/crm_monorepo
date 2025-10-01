import crypto from 'crypto'
import { logger } from './logger'

/**
 * Encryption utility using AES-256-GCM
 *
 * Security features:
 * - AES-256-GCM: Strong authenticated encryption
 * - Random IV for each encryption
 * - Authentication tag to detect tampering
 * - Derived key from encryption key using scrypt
 */
export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly KEY_LENGTH = 32 // 256 bits
  private static readonly IV_LENGTH = 16 // 128 bits
  private static readonly AUTH_TAG_LENGTH = 16 // 128 bits
  private static readonly SALT_LENGTH = 32

  // Encryption key from environment variable
  private static readonly ENCRYPTION_KEY = process.env.DIGIFORMA_ENCRYPTION_KEY

  /**
   * Derive a proper encryption key from the password using scrypt
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.scryptSync(password, salt, this.KEY_LENGTH)
  }

  /**
   * Get or generate encryption key
   * In production, this MUST be set in environment variables
   */
  private static getEncryptionKey(): string {
    if (!this.ENCRYPTION_KEY) {
      logger.warn(
        'DIGIFORMA_ENCRYPTION_KEY not set - using default key. ' +
        'CRITICAL: Set a secure encryption key in production!'
      )
      return 'default-key-CHANGE-THIS-IN-PRODUCTION-32chars'
    }

    // Ensure key is at least 32 characters for good entropy
    if (this.ENCRYPTION_KEY.length < 32) {
      throw new Error(
        'DIGIFORMA_ENCRYPTION_KEY must be at least 32 characters long for security'
      )
    }

    return this.ENCRYPTION_KEY
  }

  /**
   * Encrypt a string using AES-256-GCM
   *
   * Output format: salt:iv:authTag:encryptedData (all base64)
   *
   * @param text - Plain text to encrypt
   * @returns Encrypted string in format "salt:iv:authTag:encrypted"
   */
  static encrypt(text: string): string {
    try {
      const password = this.getEncryptionKey()

      // Generate random salt and IV
      const salt = crypto.randomBytes(this.SALT_LENGTH)
      const iv = crypto.randomBytes(this.IV_LENGTH)

      // Derive encryption key from password
      const key = this.deriveKey(password, salt)

      // Create cipher
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv)

      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'base64')
      encrypted += cipher.final('base64')

      // Get authentication tag
      const authTag = cipher.getAuthTag()

      // Combine salt:iv:authTag:encrypted (all base64 encoded)
      const result = [
        salt.toString('base64'),
        iv.toString('base64'),
        authTag.toString('base64'),
        encrypted
      ].join(':')

      return result
    } catch (error) {
      logger.error('Encryption failed', { error: (error as Error).message })
      throw new Error('Failed to encrypt data')
    }
  }

  /**
   * Decrypt a string encrypted with AES-256-GCM
   *
   * @param encryptedText - Encrypted string in format "salt:iv:authTag:encrypted"
   * @returns Decrypted plain text
   */
  static decrypt(encryptedText: string): string {
    try {
      const password = this.getEncryptionKey()

      // Split the encrypted text into components
      const parts = encryptedText.split(':')
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format')
      }

      const [saltB64, ivB64, authTagB64, encrypted] = parts

      // Decode base64 components
      const salt = Buffer.from(saltB64, 'base64')
      const iv = Buffer.from(ivB64, 'base64')
      const authTag = Buffer.from(authTagB64, 'base64')

      // Derive the same key
      const key = this.deriveKey(password, salt)

      // Create decipher
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      // Decrypt the text
      let decrypted = decipher.update(encrypted, 'base64', 'utf8')
      decrypted += decipher.final('utf8')

      return decrypted
    } catch (error) {
      logger.error('Decryption failed', { error: (error as Error).message })
      throw new Error('Failed to decrypt data - the data may be corrupted or the encryption key may be wrong')
    }
  }

  /**
   * Check if data is encrypted with the new format (contains colons)
   * Used for migration from old base64 encoding
   */
  static isEncrypted(data: string): boolean {
    return data.includes(':') && data.split(':').length === 4
  }

  /**
   * Migrate from old base64 encoding to AES-256-GCM encryption
   *
   * @param base64Token - Token encoded in base64
   * @returns Properly encrypted token
   */
  static migrateFromBase64(base64Token: string): string {
    try {
      // Decode base64 to get plain token
      const plainToken = Buffer.from(base64Token, 'base64').toString('utf8')

      // Re-encrypt with AES-256-GCM
      return this.encrypt(plainToken)
    } catch (error) {
      logger.error('Migration from base64 failed', { error: (error as Error).message })
      throw new Error('Failed to migrate token from base64 encoding')
    }
  }
}
