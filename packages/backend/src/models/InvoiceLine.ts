import { DiscountType } from "@medical-crm/shared"
import { Association, DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"

export interface InvoiceLineAttributes {
  id: string
  invoiceId: string
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

export interface InvoiceLineCreationAttributes
  extends Optional<
    InvoiceLineAttributes,
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

export class InvoiceLine
  extends Model<InvoiceLineAttributes, InvoiceLineCreationAttributes>
  implements InvoiceLineAttributes
{
  public id!: string
  public invoiceId!: string
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
  public invoice?: any

  public static override associations: {
    invoice: Association<InvoiceLine, any>
  }

  // Instance methods
  public calculateTotals(): void {
    // Ensure numeric values
    const quantity = Number(this.quantity) || 0
    const unitPrice = Number(this.unitPrice) || 0
    const discountValue = Number(this.discountValue) || 0
    const taxRate = Number(this.taxRate) || 0

    // Calculate subtotal
    this.subtotal = quantity * unitPrice

    // Calculate discount amount
    if (this.discountType === DiscountType.PERCENTAGE) {
      this.discountAmount = this.subtotal * (discountValue / 100)
    } else if (this.discountType === DiscountType.FIXED_AMOUNT) {
      this.discountAmount = Math.min(discountValue, this.subtotal)
    } else {
      this.discountAmount = 0
    }

    // Calculate total after discount
    this.totalAfterDiscount = this.subtotal - this.discountAmount

    // Calculate tax amount
    this.taxAmount = this.totalAfterDiscount * (taxRate / 100)

    // Calculate final total
    this.total = this.totalAfterDiscount + this.taxAmount
  }

  public validateDiscount(): boolean {
    if (this.discountType === DiscountType.PERCENTAGE) {
      return this.discountValue >= 0 && this.discountValue <= 100
    } else if (this.discountType === DiscountType.FIXED_AMOUNT) {
      return this.discountValue >= 0 && this.discountValue <= this.subtotal
    }
    return true
  }

  public getDiscountPercentage(): number {
    if (this.subtotal === 0) return 0
    return (this.discountAmount / this.subtotal) * 100
  }

  public getTaxPercentage(): number {
    return this.taxRate
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
    data: InvoiceLineCreationAttributes
  ): Promise<InvoiceLine> {
    // Validate that invoiceId is provided and not empty
    if (!data.invoiceId || data.invoiceId.trim() === '') {
      throw new Error(`invoiceId is required for creating an invoice line. Received: ${JSON.stringify(data.invoiceId)}`)
    }

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
        where: { invoiceId: data.invoiceId },
      })) as number | null
      lineData.orderIndex = (maxOrderIndex || 0) + 1
    }

    // Create the line directly instead of using build + save
    const line = await this.create(lineData)

    return line
  }

  public static async reorderLines(invoiceId: string, lineIds: string[]): Promise<void> {
    const transaction = await sequelize.transaction()

    try {
      for (let i = 0; i < lineIds.length; i++) {
        await this.update(
          { orderIndex: i + 1 },
          {
            where: { id: lineIds[i], invoiceId },
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

  public static async findByInvoice(invoiceId: string): Promise<InvoiceLine[]> {
    return this.findAll({
      where: { invoiceId },
      order: [["orderIndex", "ASC"]],
    })
  }

  public static async deleteByInvoice(invoiceId: string): Promise<number> {
    return this.destroy({
      where: { invoiceId },
    })
  }

  public static async updateOrderIndexes(invoiceId: string): Promise<void> {
    const lines = await this.findAll({
      where: { invoiceId },
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

  public static async copyFromQuoteLine(
    invoiceId: string,
    quoteLine: any,
    orderIndex?: number
  ): Promise<InvoiceLine> {
    return this.createLine({
      invoiceId,
      orderIndex: orderIndex || quoteLine.orderIndex,
      description: quoteLine.description,
      quantity: quoteLine.quantity,
      unitPrice: quoteLine.unitPrice,
      discountType: quoteLine.discountType,
      discountValue: quoteLine.discountValue,
      taxRate: quoteLine.taxRate,
    })
  }
}

// Initialize the model
InvoiceLine.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "invoice_id",
      references: {
        model: "invoices",
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
    modelName: "InvoiceLine",
    tableName: "invoice_lines",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: (line: InvoiceLine) => {
        line.calculateTotals()
      },
      beforeSave: (line: InvoiceLine) => {
        line.calculateTotals()
      },
      beforeValidate: (line: InvoiceLine) => {
        if (!line.validateDiscount()) {
          throw new Error("Invalid discount configuration")
        }
      },
    },
    indexes: [
      {
        fields: ["invoice_id"],
      },
      {
        fields: ["invoice_id", "order_index"],
        unique: true,
      },
    ],
  }
)

export default InvoiceLine
