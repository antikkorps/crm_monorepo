import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"

export interface CgvTemplateAttributes {
  id: string
  name: string
  description?: string
  content: string // JSON ProseMirror content
  category?: string // audit, formation, conseil, general
  isDefault: boolean
  isActive: boolean
  orderIndex: number
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface CgvTemplateCreationAttributes
  extends Optional<
    CgvTemplateAttributes,
    "id" | "description" | "category" | "isDefault" | "isActive" | "orderIndex" | "createdBy" | "createdAt" | "updatedAt"
  > {}

export class CgvTemplate
  extends Model<CgvTemplateAttributes, CgvTemplateCreationAttributes>
  implements CgvTemplateAttributes
{
  declare id: string
  declare name: string
  declare description?: string
  declare content: string
  declare category?: string
  declare isDefault: boolean
  declare isActive: boolean
  declare orderIndex: number
  declare createdBy?: string
  declare createdAt: Date
  declare updatedAt: Date

  /**
   * Get all active templates ordered by orderIndex
   */
  static async getActiveTemplates(): Promise<CgvTemplate[]> {
    return this.findAll({
      where: { isActive: true },
      order: [["orderIndex", "ASC"], ["name", "ASC"]],
    })
  }

  /**
   * Get the default template
   */
  static async getDefaultTemplate(): Promise<CgvTemplate | null> {
    return this.findOne({
      where: { isDefault: true, isActive: true },
    })
  }

  /**
   * Set a template as default (and unset others)
   */
  async setAsDefault(): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      // Unset all other defaults
      await CgvTemplate.update(
        { isDefault: false },
        { where: {}, transaction }
      )
      // Set this one as default
      this.isDefault = true
      await this.save({ transaction })
    })
  }
}

CgvTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_default",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "order_index",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "created_by",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "cgv_templates",
    timestamps: true,
    underscored: true,
  }
)
