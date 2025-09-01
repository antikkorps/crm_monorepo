import { DiscountType } from "@medical-crm/shared"
import { Association, DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import type { Quote } from "./Quote"

export interface QuoteLineAttributes {
  id: string
  quoteId: string
  orderIndex: number

  // Product/Service details
  description: string
  quantity: number
  unitPrice: number

  // Discount per line
  discountType: DiscountType
  discountValue: number
  discountAmount: number

  // Tax per line
  taxRate: number
  taxAmount: number

  // Calculated totals
  subtotal: number // quantity * unitPrice
  totalAfterDiscount: number // subtotal - discountAmount
  total: number // totalAfterDiscount + taxAmount

  createdAt: Date
  updatedAt: Date
}

export interface QuoteLineCreationAttributes
  extends Optional<
    QuoteLineAttributes,
    | "id"
    | "orderIndex"
    | "discountType"
    | "discountValue"
    | "discountAmount"
    | "taxRate"
    | "taxAmount"
    | "subtotal"
    | "totalAfterDiscount"
    | "total"
    | "createdAt"
    | "updatedAt"
  > {}

export class QuoteLine
  extends Model<QuoteLineAttributes, QuoteLineCreationAttributes>
  implements QuoteLineAttributes
{
  public id!: string
  public quoteId!: string
  public orderIndex!: number

  // Product/Service details
  public description!: string
  public quantity!: number
  public unitPrice!: number

  // Discount per line
  public discountType!: DiscountType
  public discountValue!: number
  public discountAmount!: number

  // Tax per line
  public taxRate!: number
  public taxAmount!: number

  // Calculated totals
  public subtotal!: number
  public totalAfterDiscount!: number
  public total!: number

  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public quote?: Quote

  public static override associations: {
    quote: Association<QuoteLine, Quote>
  }

  // Instance methods
  public calculateTotals(): void {
    const quantity = this.quantity || this.getDataValue('quantity') || 0
    const unitPrice = this.unitPrice || this.getDataValue('unitPrice') || 0
    const discountType = this.discountType || this.getDataValue('discountType')
    const discountValue = this.discountValue || this.getDataValue('discountValue') || 0
    const taxRate = this.taxRate || this.getDataValue('taxRate') || 0
    
    // Calculate subtotal
    const subtotal = quantity * unitPrice
    this.setDataValue('subtotal', subtotal)
    // Set as property for direct access in tests
    ;(this as any).subtotal = subtotal

    // Calculate discount amount
    let discountAmount = 0
    if (discountType === DiscountType.PERCENTAGE) {
      discountAmount = subtotal * (discountValue / 100)
    } else if (discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = Math.min(discountValue, subtotal)
    }
    this.setDataValue('discountAmount', discountAmount)
    ;(this as any).discountAmount = discountAmount

    // Calculate total after discount
    const totalAfterDiscount = subtotal - discountAmount
    this.setDataValue('totalAfterDiscount', totalAfterDiscount)
    ;(this as any).totalAfterDiscount = totalAfterDiscount

    // Calculate tax amount
    const taxAmount = totalAfterDiscount * (taxRate / 100)
    this.setDataValue('taxAmount', taxAmount)
    ;(this as any).taxAmount = taxAmount

    // Calculate final total
    const total = totalAfterDiscount + taxAmount
    this.setDataValue('total', total)
    ;(this as any).total = total
  }

  public validateDiscount(): boolean {
    const discountType = this.discountType || this.getDataValue('discountType')
    const discountValue = this.discountValue || this.getDataValue('discountValue') || 0
    const subtotal = this.subtotal || this.getDataValue('subtotal') || 0
    
    if (discountType === DiscountType.PERCENTAGE) {
      return discountValue >= 0 && discountValue <= 100
    } else if (discountType === DiscountType.FIXED_AMOUNT) {
      return discountValue >= 0 && discountValue <= subtotal
    }
    return true
  }

  public getDiscountPercentage(): number {
    const subtotal = this.subtotal || this.getDataValue('subtotal') || 0
    const discountAmount = this.discountAmount || this.getDataValue('discountAmount') || 0
    if (subtotal === 0) return 0
    return (discountAmount / subtotal) * 100
  }

  public getTaxPercentage(): number {
    return this.taxRate || this.getDataValue('taxRate') || 0
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      discountPercentage: this.getDiscountPercentage(),
      taxPercentage: this.getTaxPercentage(),
    }
  }

  // Static methods
  public static async createLine(
    data: QuoteLineCreationAttributes,
    options?: { transaction?: any }
  ): Promise<QuoteLine> {
    // Set default values
    const lineData = {
      ...data,
      discountType: data.discountType || DiscountType.PERCENTAGE,
      discountValue: data.discountValue || 0,
      taxRate: data.taxRate || 0,
    }

    // Get the next order index if not provided
    if (lineData.orderIndex === undefined) {
      const maxOrderIndex = (await this.max("orderIndex", {
        where: { quoteId: data.quoteId },
        transaction: options?.transaction,
      })) as number | null
      lineData.orderIndex = (maxOrderIndex || 0) + 1
    }

    const line = this.build(lineData)
    line.calculateTotals()

    return line.save(options)
  }

  public static async reorderLines(quoteId: string, lineIds: string[]): Promise<void> {
    const transaction = await sequelize.transaction()

    try {
      for (let i = 0; i < lineIds.length; i++) {
        await this.update(
          { orderIndex: i + 1 },
          {
            where: { id: lineIds[i], quoteId },
            transaction,
          }
        )
      }

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }

  public static async findByQuote(quoteId: string): Promise<QuoteLine[]> {
    return this.findAll({
      where: { quoteId },
      order: [["orderIndex", "ASC"]],
    })
  }

  public static async deleteByQuote(quoteId: string): Promise<number> {
    return this.destroy({
      where: { quoteId },
    })
  }

  public static async updateOrderIndexes(quoteId: string): Promise<void> {
    const lines = await this.findAll({
      where: { quoteId },
      order: [["orderIndex", "ASC"]],
    })

    const transaction = await sequelize.transaction()

    try {
      for (let i = 0; i < lines.length; i++) {
        await lines[i].update({ orderIndex: i + 1 }, { transaction })
      }

      await transaction.commit()
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }
}

// Initialize the model
QuoteLine.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "quote_id",
      references: {
        model: "quotes",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "order_index",
      validate: {
        min: 1,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 1000],
        notEmpty: true,
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      validate: {
        min: 0.001,
      },
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "unit_price",
      validate: {
        min: 0,
      },
    },
    discountType: {
      type: DataTypes.ENUM(...Object.values(DiscountType)),
      allowNull: false,
      defaultValue: DiscountType.PERCENTAGE,
      field: "discount_type",
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "discount_value",
      validate: {
        min: 0,
        customValidator(value: number) {
          if (this.discountType === DiscountType.PERCENTAGE && value > 100) {
            throw new Error("Percentage discount cannot exceed 100%")
          }
        },
      },
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "discount_amount",
      validate: {
        min: 0,
      },
    },
    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: "tax_rate",
      validate: {
        min: 0,
        max: 100,
      },
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "tax_amount",
      validate: {
        min: 0,
      },
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    totalAfterDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_after_discount",
      validate: {
        min: 0,
      },
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
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
    modelName: "QuoteLine",
    tableName: "quote_lines",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: (line: QuoteLine) => {
        line.calculateTotals()
      },
      beforeValidate: (line: QuoteLine) => {
        if (!line.validateDiscount()) {
          throw new Error("Invalid discount configuration")
        }
      },
    },
    indexes: [
      {
        fields: ["quote_id"],
      },
      {
        fields: ["quote_id", "order_index"],
        unique: true,
      },
    ],
  }
)

export default QuoteLine
