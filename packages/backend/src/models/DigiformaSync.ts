import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  ERROR = 'error',
  PARTIAL = 'partial'
}

export enum SyncType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  AUTO = 'auto'
}

interface DigiformaSyncAttributes {
  id: string
  syncType: SyncType
  status: SyncStatus
  startedAt: Date
  completedAt?: Date
  companiesSynced: number
  contactsSynced: number
  quotesSynced: number
  invoicesSynced: number
  companiesCreated: number
  companiesUpdated: number
  contactsCreated: number
  contactsUpdated: number
  quotesCreated: number
  quotesUpdated: number
  invoicesCreated: number
  invoicesUpdated: number
  errors: Array<{ type: string; message: string; details?: any }>
  metadata?: Record<string, any>
  triggeredBy?: string // User ID who triggered manual sync
  createdAt?: Date
  updatedAt?: Date
}

interface DigiformaSyncCreationAttributes
  extends Optional<DigiformaSyncAttributes, 'id' | 'completedAt' | 'errors' | 'metadata' | 'triggeredBy' | 'createdAt' | 'updatedAt'> {}

export class DigiformaSync
  extends Model<DigiformaSyncAttributes, DigiformaSyncCreationAttributes>
  implements DigiformaSyncAttributes
{
  declare id: string
  declare syncType: SyncType
  declare status: SyncStatus
  declare startedAt: Date
  declare completedAt?: Date
  declare companiesSynced: number
  declare contactsSynced: number
  declare quotesSynced: number
  declare invoicesSynced: number
  declare companiesCreated: number
  declare companiesUpdated: number
  declare contactsCreated: number
  declare contactsUpdated: number
  declare quotesCreated: number
  declare quotesUpdated: number
  declare invoicesCreated: number
  declare invoicesUpdated: number
  declare errors: Array<{ type: string; message: string; details?: any }>
  declare metadata?: Record<string, any>
  declare triggeredBy?: string
  declare readonly createdAt?: Date
  declare readonly updatedAt?: Date

  /**
   * Get the last successful sync
   */
  static async getLastSuccessfulSync(): Promise<DigiformaSync | null> {
    return await DigiformaSync.findOne({
      where: { status: SyncStatus.SUCCESS },
      order: [['completedAt', 'DESC']],
    })
  }

  /**
   * Get sync history with pagination
   */
  static async getSyncHistory(limit = 50, offset = 0): Promise<{ rows: DigiformaSync[]; count: number }> {
    return await DigiformaSync.findAndCountAll({
      limit,
      offset,
      order: [['startedAt', 'DESC']],
    })
  }

  /**
   * Create a new sync record
   */
  static async createSync(syncType: SyncType, triggeredBy?: string): Promise<DigiformaSync> {
    return await DigiformaSync.create({
      syncType,
      status: SyncStatus.PENDING,
      startedAt: new Date(),
      companiesSynced: 0,
      contactsSynced: 0,
      quotesSynced: 0,
      invoicesSynced: 0,
      companiesCreated: 0,
      companiesUpdated: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      quotesCreated: 0,
      quotesUpdated: 0,
      invoicesCreated: 0,
      invoicesUpdated: 0,
      errors: [],
      triggeredBy,
    })
  }

  /**
   * Update sync status and statistics
   */
  async updateSyncProgress(updates: Partial<DigiformaSyncAttributes>): Promise<void> {
    await this.update(updates)
  }

  /**
   * Mark sync as completed
   */
  async complete(status: SyncStatus): Promise<void> {
    await this.update({
      status,
      completedAt: new Date(),
    })
  }

  /**
   * Add error to sync record
   */
  async addError(type: string, message: string, details?: any): Promise<void> {
    const currentErrors = this.errors || []
    await this.update({
      errors: [...currentErrors, { type, message, details }],
    })
  }
}

DigiformaSync.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    syncType: {
      type: DataTypes.ENUM(...Object.values(SyncType)),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(SyncStatus)),
      allowNull: false,
      defaultValue: SyncStatus.PENDING,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    companiesSynced: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    contactsSynced: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quotesSynced: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    invoicesSynced: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    companiesCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    companiesUpdated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    contactsCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    contactsUpdated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quotesCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    quotesUpdated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    invoicesCreated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    invoicesUpdated: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    errors: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    triggeredBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'digiforma_syncs',
    underscored: true,
    timestamps: true,
  }
)
