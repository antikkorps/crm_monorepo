import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { EncryptionService } from "../utils/encryption"
import { logger } from "../utils/logger"

interface SageSettingsAttributes {
  id: string
  apiKey: string // Will be encrypted with AES-256-GCM
  apiUrl: string
  companyId: string // Sage company/organization identifier
  isEnabled: boolean
  lastTestDate?: Date
  lastTestSuccess?: boolean
  lastTestMessage?: string
  autoSyncEnabled: boolean
  syncFrequency: "hourly" | "daily" | "weekly"
  lastSyncDate?: Date
  lastCustomersSync?: Date
  lastInvoicesSync?: Date
  lastPaymentsSync?: Date
  createdAt?: Date
  updatedAt?: Date
}

interface SageSettingsCreationAttributes
  extends Optional<
    SageSettingsAttributes,
    | "id"
    | "apiUrl"
    | "companyId"
    | "isEnabled"
    | "lastTestDate"
    | "lastTestSuccess"
    | "lastTestMessage"
    | "autoSyncEnabled"
    | "syncFrequency"
    | "lastSyncDate"
    | "lastCustomersSync"
    | "lastInvoicesSync"
    | "lastPaymentsSync"
    | "createdAt"
    | "updatedAt"
  > {}

/**
 * SageSettings - Stores Sage accounting API configuration
 *
 * Security:
 * - API key is encrypted at rest using AES-256-GCM
 * - Each encryption uses a unique salt and IV
 * - Authentication tag prevents tampering
 * - Only one settings record should exist (singleton pattern)
 *
 * Sync Strategy:
 * - Unidirectional Sage → CRM for v1
 * - Match institutions by accountingNumber (client number in Sage)
 * - Sync customers, invoices, and payments
 * - Future: bidirectional sync with conflict resolution
 */
export class SageSettings
  extends Model<SageSettingsAttributes, SageSettingsCreationAttributes>
  implements SageSettingsAttributes
{
  declare id: string
  declare apiKey: string
  declare apiUrl: string
  declare companyId: string
  declare isEnabled: boolean
  declare lastTestDate?: Date
  declare lastTestSuccess?: boolean
  declare lastTestMessage?: string
  declare autoSyncEnabled: boolean
  declare syncFrequency: "hourly" | "daily" | "weekly"
  declare lastSyncDate?: Date
  declare lastCustomersSync?: Date
  declare lastInvoicesSync?: Date
  declare lastPaymentsSync?: Date
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  /**
   * Get decrypted API key (async to ensure migration is saved)
   */
  async getDecryptedApiKey(): Promise<string> {
    if (!this.apiKey || this.apiKey.length === 0) {
      throw new Error('Sage API key is not configured')
    }

    try {
      // Check if key is encrypted
      if (EncryptionService.isEncrypted(this.apiKey)) {
        return EncryptionService.decrypt(this.apiKey)
      } else {
        // Legacy format - encrypt and migrate
        logger.warn('Sage API key is using legacy format - migrating to AES-256-GCM')
        const plainKey = this.apiKey

        // Migrate to new encryption (await to ensure consistency)
        this.apiKey = EncryptionService.encrypt(plainKey)
        try {
          await this.save()
          logger.info('Successfully migrated Sage API key to AES-256-GCM encryption')
        } catch (err) {
          logger.error('Failed to migrate API key encryption', { error: (err as Error).message })
          throw new Error('Failed to save encrypted API key - migration failed')
        }

        return plainKey
      }
    } catch (error) {
      logger.error('Failed to decrypt Sage API key', { error: (error as Error).message })
      throw new Error('Failed to decrypt Sage API key - please reconfigure Sage settings')
    }
  }

  /**
   * Set API key (will be encrypted with AES-256-GCM)
   */
  async setApiKey(key: string): Promise<void> {
    const encrypted = EncryptionService.encrypt(key)
    await this.update({ apiKey: encrypted })
  }

  /**
   * Get or create settings (singleton)
   */
  static async getSettings(): Promise<SageSettings> {
    let settings = await SageSettings.findOne()

    if (!settings) {
      settings = await SageSettings.create({
        apiKey: "",
        apiUrl: "",
        companyId: "",
        isEnabled: false,
        autoSyncEnabled: false,
        syncFrequency: "daily",
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
   * Update last sync date for specific entity type
   */
  async updateLastSync(entityType?: 'customers' | 'invoices' | 'payments'): Promise<void> {
    const updates: Partial<SageSettingsAttributes> = {
      lastSyncDate: new Date()
    }

    if (entityType === 'customers') {
      updates.lastCustomersSync = new Date()
    } else if (entityType === 'invoices') {
      updates.lastInvoicesSync = new Date()
    } else if (entityType === 'payments') {
      updates.lastPaymentsSync = new Date()
    }

    await this.update(updates)
  }

  /**
   * Check if settings are configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKey.length > 0 && this.apiUrl && this.companyId)
  }
}

SageSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
      comment: "Encrypted API key for Sage accounting API",
    },
    apiUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
      comment: "Sage API base URL (e.g., https://api.sage.com)",
    },
    companyId: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
      comment: "Sage company/organization identifier",
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
      type: DataTypes.ENUM("hourly", "daily", "weekly"),
      allowNull: false,
      defaultValue: "daily",
    },
    lastSyncDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last successful sync of any entity type",
    },
    lastCustomersSync: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last successful sync of customers",
    },
    lastInvoicesSync: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last successful sync of invoices",
    },
    lastPaymentsSync: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Last successful sync of payments",
    },
  },
  {
    sequelize,
    tableName: "sage_settings",
    underscored: true,
    timestamps: true,
  }
)
