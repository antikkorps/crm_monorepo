import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { EncryptionService } from "../utils/encryption"
import { logger } from "../utils/logger"

interface DigiformaSettingsAttributes {
  id: string
  bearerToken: string // Will be encrypted with AES-256-GCM
  apiUrl: string
  isEnabled: boolean
  lastTestDate?: Date
  lastTestSuccess?: boolean
  lastTestMessage?: string
  autoSyncEnabled: boolean
  syncFrequency: "daily" | "weekly" | "monthly"
  lastSyncDate?: Date
  createdAt?: Date
  updatedAt?: Date
}

interface DigiformaSettingsCreationAttributes
  extends Optional<
    DigiformaSettingsAttributes,
    | "id"
    | "apiUrl"
    | "isEnabled"
    | "lastTestDate"
    | "lastTestSuccess"
    | "lastTestMessage"
    | "autoSyncEnabled"
    | "syncFrequency"
    | "lastSyncDate"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * DigiformaSettings - Stores Digiforma API configuration
 *
 * Security:
 * - Bearer token is encrypted at rest using AES-256-GCM
 * - Each encryption uses a unique salt and IV
 * - Authentication tag prevents tampering
 * - Only one settings record should exist (singleton pattern)
 */
export class DigiformaSettings
  extends Model<DigiformaSettingsAttributes, DigiformaSettingsCreationAttributes>
  implements DigiformaSettingsAttributes
{
  declare id: string
  declare bearerToken: string
  declare apiUrl: string
  declare isEnabled: boolean
  declare lastTestDate?: Date
  declare lastTestSuccess?: boolean
  declare lastTestMessage?: string
  declare autoSyncEnabled: boolean
  declare syncFrequency: "daily" | "weekly" | "monthly"
  declare lastSyncDate?: Date
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  /**
   * Get decrypted bearer token
   * Handles both new AES-256-GCM format and legacy base64 format
   */
  getDecryptedToken(): string {
    if (!this.bearerToken || this.bearerToken.length === 0) {
      throw new Error('Bearer token is not configured')
    }

    try {
      // Check if token is encrypted with new format
      if (EncryptionService.isEncrypted(this.bearerToken)) {
        return EncryptionService.decrypt(this.bearerToken)
      } else {
        // Legacy base64 format - decrypt and migrate
        logger.warn('Bearer token is using legacy base64 encoding - migrating to AES-256-GCM')
        const plainToken = Buffer.from(this.bearerToken, 'base64').toString('utf8')

        // Migrate to new encryption (async update will happen on next save)
        this.bearerToken = EncryptionService.encrypt(plainToken)
        this.save().catch(err => {
          logger.error('Failed to migrate token encryption', { error: err.message })
        })

        return plainToken
      }
    } catch (error) {
      logger.error('Failed to decrypt bearer token', { error: (error as Error).message })
      throw new Error('Failed to decrypt bearer token - please reconfigure Digiforma settings')
    }
  }

  /**
   * Set bearer token (will be encrypted with AES-256-GCM)
   */
  async setBearerToken(token: string): Promise<void> {
    const encrypted = EncryptionService.encrypt(token)
    await this.update({ bearerToken: encrypted })
  }

  /**
   * Get or create settings (singleton)
   */
  static async getSettings(): Promise<DigiformaSettings> {
    let settings = await DigiformaSettings.findOne()

    if (!settings) {
      settings = await DigiformaSettings.create({
        bearerToken: "",
        apiUrl: "https://app.digiforma.com/api/v1/graphql",
        isEnabled: false,
        autoSyncEnabled: false,
        syncFrequency: "weekly",
      })
    }

    return settings
  }

  /**
   * Update connection test results
   */
  async updateTestResults(success: boolean, message: string): Promise<void> {
    await this.update({
      lastTestDate: new Date(),
      lastTestSuccess: success,
      lastTestMessage: message,
    })
  }

  /**
   * Update last sync date
   */
  async updateLastSync(): Promise<void> {
    await this.update({ lastSyncDate: new Date() })
  }

  /**
   * Check if settings are configured
   */
  isConfigured(): boolean {
    return !!this.bearerToken && this.bearerToken.length > 0
  }
}

DigiformaSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bearerToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
      comment: "Encrypted bearer token for Digiforma API",
    },
    apiUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "https://app.digiforma.com/api/v1/graphql",
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastTestDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastTestSuccess: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    lastTestMessage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    autoSyncEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    syncFrequency: {
      type: DataTypes.ENUM("daily", "weekly", "monthly"),
      allowNull: false,
      defaultValue: "weekly",
    },
    lastSyncDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "digiforma_settings",
    underscored: true,
    timestamps: true,
  }
)
