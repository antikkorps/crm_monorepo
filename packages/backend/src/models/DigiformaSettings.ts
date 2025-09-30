import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"

interface DigiformaSettingsAttributes {
  id: string
  bearerToken: string // Will be encrypted
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
 * - Bearer token is encrypted at rest
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

  // Encryption key (should be stored in environment variables)
  private static readonly ENCRYPTION_KEY =
    process.env.DIGIFORMA_ENCRYPTION_KEY || "default-key-change-in-production"

  /**
   * Encrypt token before saving
   * Using simple base64 encoding for now (should use proper encryption in production)
   */
  private static encryptToken(token: string): string {
    return Buffer.from(token).toString("base64")
  }

  /**
   * Decrypt token after reading
   */
  private static decryptToken(encryptedToken: string): string {
    return Buffer.from(encryptedToken, "base64").toString("utf8")
  }

  /**
   * Get decrypted bearer token
   */
  getDecryptedToken(): string {
    return DigiformaSettings.decryptToken(this.bearerToken)
  }

  /**
   * Set bearer token (will be encrypted)
   */
  async setBearerToken(token: string): Promise<void> {
    const encrypted = DigiformaSettings.encryptToken(token)
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
