import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"

export interface SystemSettingsAttributes {
  id: string
  key: string
  value: any
  category: string
  description?: string
  isPublic: boolean
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface SystemSettingsCreationAttributes
  extends Optional<SystemSettingsAttributes, "id" | "createdAt" | "updatedAt"> {}

export class SystemSettings
  extends Model<SystemSettingsAttributes, SystemSettingsCreationAttributes>
  implements SystemSettingsAttributes
{
  public id!: string
  public key!: string
  public value!: any
  public category!: string
  public description?: string
  public isPublic!: boolean
  public updatedBy?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  /**
   * Get a setting by key
   */
  static async getSetting(key: string): Promise<any> {
    const setting = await SystemSettings.findOne({ where: { key } })
    return setting ? setting.value : null
  }

  /**
   * Set a setting by key
   */
  static async setSetting(
    key: string,
    value: any,
    category: string = "general",
    updatedBy?: string
  ): Promise<SystemSettings> {
    const [setting] = await SystemSettings.upsert({
      key,
      value,
      category,
      updatedBy,
      isPublic: false,
    })
    return setting
  }

  /**
   * Get all settings by category
   */
  static async getSettingsByCategory(category: string): Promise<SystemSettings[]> {
    return SystemSettings.findAll({ where: { category } })
  }

  /**
   * Get public settings (accessible without auth)
   */
  static async getPublicSettings(): Promise<Record<string, any>> {
    const settings = await SystemSettings.findAll({
      where: { isPublic: true },
    })
    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      },
      {} as Record<string, any>
    )
  }

  /**
   * Initialize default settings
   */
  static async initializeDefaults(): Promise<void> {
    const defaults = [
      {
        key: "features.quotes_enabled",
        value: true,
        category: "features",
        description: "Enable/disable quotes module",
        isPublic: true,
      },
      {
        key: "features.invoices_enabled",
        value: true,
        category: "features",
        description: "Enable/disable invoices module",
        isPublic: true,
      },
      {
        key: "features.tasks_enabled",
        value: true,
        category: "features",
        description: "Enable/disable tasks module",
        isPublic: true,
      },
      {
        key: "features.contacts_enabled",
        value: true,
        category: "features",
        description: "Enable/disable contacts module",
        isPublic: true,
      },
      {
        key: "features.segmentation_enabled",
        value: true,
        category: "features",
        description: "Enable/disable segmentation module",
        isPublic: true,
      },
      {
        key: "features.sage_enabled",
        value: false,
        category: "features",
        description: "Enable/disable Sage integration module",
        isPublic: true,
      },
    ]

    // Execute all findOrCreate operations without transaction to avoid conflicts
    for (const setting of defaults) {
      try {
        await SystemSettings.findOrCreate({
          where: { key: setting.key },
          defaults: setting,
          transaction: null as any, // Force no transaction
        })
      } catch (error) {
        // If setting already exists, ignore the error
        console.error(`Failed to initialize setting ${setting.key}:`, error)
      }
    }
  }
}

SystemSettings.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "general",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "system_settings",
    timestamps: true,
  }
)
