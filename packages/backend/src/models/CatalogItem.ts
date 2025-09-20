import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { User } from "./User"

export interface CatalogItemAttributes {
  id: string
  name: string
  description?: string
  category?: string
  unitPrice: number
  taxRate: number
  isActive: boolean
  sku?: string
  unit?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface CatalogItemCreationAttributes
  extends Optional<CatalogItemAttributes, "id" | "isActive" | "createdAt" | "updatedAt"> {}

export class CatalogItem
  extends Model<CatalogItemAttributes, CatalogItemCreationAttributes>
  implements CatalogItemAttributes
{
  public id!: string
  public name!: string
  public description?: string
  public category?: string
  public unitPrice!: number
  public taxRate!: number
  public isActive!: boolean
  public sku?: string
  public unit?: string
  public createdBy!: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public creator?: User

  // Instance methods
  public async activate(): Promise<void> {
    this.isActive = true
    await this.save()
  }

  public async deactivate(): Promise<void> {
    this.isActive = false
    await this.save()
  }

  // Static methods
  public static async getActiveItems(): Promise<CatalogItem[]> {
    return this.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["name", "ASC"]],
    })
  }

  public static async searchItems(query: string): Promise<CatalogItem[]> {
    const { Op } = require("sequelize")
    return this.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { sku: { [Op.iLike]: `%${query}%` } },
          { category: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["name", "ASC"]],
    })
  }

  public static async getItemsByCategory(category: string): Promise<CatalogItem[]> {
    return this.findAll({
      where: {
        isActive: true,
        category
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["name", "ASC"]],
    })
  }

  public static async getCategories(): Promise<string[]> {
    const items = await this.findAll({
      attributes: ["category"],
      where: {
        isActive: true,
        category: { [require("sequelize").Op.ne]: null }
      },
      group: ["category"],
      raw: true,
    })

    return items
      .map(item => item.category)
      .filter((category): category is string => Boolean(category))
      .sort()
  }

  public static async createItem(
    data: CatalogItemCreationAttributes
  ): Promise<CatalogItem> {
    return this.create({
      ...data,
      isActive: true,
    })
  }
}

// Initialize the model
CatalogItem.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 100],
      },
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
        isDecimal: true,
      },
      field: "unit_price",
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
        isDecimal: true,
      },
      field: "tax_rate",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        len: [1, 50],
      },
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 20],
      },
      comment: "Unit of measurement (e.g., 'hour', 'piece', 'kg', 'day')",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
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
    modelName: "CatalogItem",
    tableName: "catalog_items",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["name"],
      },
      {
        fields: ["category"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["sku"],
        unique: true,
        where: {
          sku: { [require("sequelize").Op.ne]: null },
        },
      },
      {
        fields: ["created_by"],
      },
    ],
  }
)

export default CatalogItem