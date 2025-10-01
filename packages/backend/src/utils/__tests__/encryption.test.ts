import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { EncryptionService } from '../encryption'

describe('EncryptionService', () => {
  const originalEnv = process.env.DIGIFORMA_ENCRYPTION_KEY

  beforeEach(() => {
    // Set a test encryption key
    process.env.DIGIFORMA_ENCRYPTION_KEY = 'test-encryption-key-32-characters-long!'
  })

  afterEach(() => {
    // Restore original env
    process.env.DIGIFORMA_ENCRYPTION_KEY = originalEnv
  })

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string correctly', () => {
      const plainText = 'my-secret-bearer-token-123456'
      const encrypted = EncryptionService.encrypt(plainText)
      const decrypted = EncryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plainText)
    })

    it('should produce different encrypted outputs for the same input', () => {
      const plainText = 'my-secret-bearer-token'
      const encrypted1 = EncryptionService.encrypt(plainText)
      const encrypted2 = EncryptionService.encrypt(plainText)

      // Should be different due to random IV and salt
      expect(encrypted1).not.toBe(encrypted2)

      // But both should decrypt to the same value
      expect(EncryptionService.decrypt(encrypted1)).toBe(plainText)
      expect(EncryptionService.decrypt(encrypted2)).toBe(plainText)
    })

    it('should handle special characters', () => {
      const plainText = 'token!@#$%^&*(){}[]|\\:;"\'<>?,./'
      const encrypted = EncryptionService.encrypt(plainText)
      const decrypted = EncryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plainText)
    })

    it('should handle unicode characters', () => {
      const plainText = 'token-with-émojis-🔐🔑-and-accènts-café'
      const encrypted = EncryptionService.encrypt(plainText)
      const decrypted = EncryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plainText)
    })

    it('should handle long strings', () => {
      const plainText = 'a'.repeat(1000)
      const encrypted = EncryptionService.encrypt(plainText)
      const decrypted = EncryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plainText)
    })
  })

  describe('isEncrypted', () => {
    it('should detect encrypted format', () => {
      const plainText = 'my-token'
      const encrypted = EncryptionService.encrypt(plainText)

      expect(EncryptionService.isEncrypted(encrypted)).toBe(true)
    })

    it('should not detect base64 as encrypted', () => {
      const base64 = Buffer.from('my-token').toString('base64')

      expect(EncryptionService.isEncrypted(base64)).toBe(false)
    })

    it('should not detect plain text as encrypted', () => {
      expect(EncryptionService.isEncrypted('plain-text')).toBe(false)
    })
  })

  describe('migrateFromBase64', () => {
    it('should migrate base64 encoded token to encrypted format', () => {
      const plainText = 'my-legacy-token'
      const base64 = Buffer.from(plainText).toString('base64')

      const encrypted = EncryptionService.migrateFromBase64(base64)
      const decrypted = EncryptionService.decrypt(encrypted)

      expect(decrypted).toBe(plainText)
      expect(EncryptionService.isEncrypted(encrypted)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should throw error when decrypting invalid data', () => {
      expect(() => {
        EncryptionService.decrypt('invalid:data:format:here')
      }).toThrow()
    })

    it('should throw error when decrypting with wrong format', () => {
      expect(() => {
        EncryptionService.decrypt('not-encrypted-data')
      }).toThrow()
    })

    it('should use default key if encryption key is not set', () => {
      const originalKey = process.env.DIGIFORMA_ENCRYPTION_KEY
      delete process.env.DIGIFORMA_ENCRYPTION_KEY

      // Should still work with default key (warning logged)
      const encrypted = EncryptionService.encrypt('test')
      expect(encrypted).toBeDefined()
      expect(EncryptionService.isEncrypted(encrypted)).toBe(true)

      // Restore original key
      process.env.DIGIFORMA_ENCRYPTION_KEY = originalKey
    })

    it('should detect tampered data', () => {
      const plainText = 'my-token'
      const encrypted = EncryptionService.encrypt(plainText)

      // Tamper with the encrypted data
      const parts = encrypted.split(':')
      parts[3] = 'tampered'
      const tampered = parts.join(':')

      expect(() => {
        EncryptionService.decrypt(tampered)
      }).toThrow()
    })
  })

  describe('format validation', () => {
    it('encrypted output should have correct format', () => {
      const encrypted = EncryptionService.encrypt('test')
      const parts = encrypted.split(':')

      // Should have 4 parts: salt:iv:authTag:encrypted
      expect(parts).toHaveLength(4)

      // All parts should be base64 encoded
      parts.forEach(part => {
        expect(() => Buffer.from(part, 'base64')).not.toThrow()
      })
    })
  })
})
