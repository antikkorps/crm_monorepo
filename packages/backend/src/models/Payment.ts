import { PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import { Association, DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { User } from "./User"

export interface PaymentAttributes {
  id: string
  invoiceId: string

  // Payment details
  amount: number
  paymentDate: Date
  paymentMethod: PaymentMethod
  reference?: string

  // Status and notes
  status: PaymentStatus
  notes?: string

  // Metadata
  recordedBy: string
  createdAt: Date
  updatedAt: Date
}

export interface PaymentCreationAttributes
  extends Optional<PaymentAttributes, "id" | "status" | "createdAt" | "updatedAt"> {}

export class Payment
  extends Model<PaymentAttributes, PaymentCreationAttributes>
  implements PaymentAttributes
{
  declare id: string
  declare invoiceId: string

  // Payment details
  declare amount: number
  declare paymentDate: Date
  declare paymentMethod: PaymentMethod
  declare reference: string | undefined

  // Status and notes
  declare status: PaymentStatus
  declare notes: string | undefined

  // Metadata
  declare recordedBy: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  public invoice?: any
  public recordedByUser?: User

  public static override associations: {
    invoice: Association<Payment, any>
    recordedByUser: Association<Payment, User>
  }

  // Instance methods
  public canBeModified(): boolean {
    return [PaymentStatus.PENDING].includes(this.status)
  }

  public canBeDeleted(): boolean {
    return [
      PaymentStatus.PENDING,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELLED,
    ].includes(this.status)
  }

  public canBeConfirmed(): boolean {
    const status = (this as any).getDataValue ? (this as any).getDataValue('status') : this.status
    return status === PaymentStatus.PENDING
  }

  public canBeCancelled(): boolean {
    const status = (this as any).getDataValue ? (this as any).getDataValue('status') : this.status
    return [PaymentStatus.PENDING].includes(status)
  }

  public async confirm(): Promise<void> {
    if (!this.canBeConfirmed()) {
      throw {
        code: "PAYMENT_NOT_CONFIRMABLE",
        message: "Payment cannot be confirmed in its current state",
        status: 400,
      }
    }

    // Persist status change explicitly
    const paymentId = (this as any).getDataValue ? (this as any).getDataValue('id') : (this as any).id
    if (!paymentId) {
      throw {
        code: "PAYMENT_ID_MISSING",
        message: "Payment ID is missing on instance",
        status: 500,
      }
    }
    await (this.constructor as typeof Payment).update(
      { status: PaymentStatus.CONFIRMED },
      { where: { id: paymentId } }
    )
    await this.reload()

    // Update the invoice payment status
    const invoice = await this.getInvoice()
    if (invoice) {
      await invoice.updatePaymentStatus()
    }
  }

  public async fail(reason?: string): Promise<void> {
    if (this.status !== PaymentStatus.PENDING) {
      throw new Error("Only pending payments can be marked as failed")
    }

    this.status = PaymentStatus.FAILED
    if (reason) {
      this.notes = this.notes ? `${this.notes}\nFailed: ${reason}` : `Failed: ${reason}`
    }
    await this.save()

    // Update the invoice payment status
    const invoice = await this.getInvoice()
    if (invoice) {
      await invoice.updatePaymentStatus()
    }
  }

  public async cancel(reason?: string): Promise<void> {
    if (!this.canBeCancelled()) {
      throw {
        code: "PAYMENT_NOT_CANCELLABLE",
        message: "Payment cannot be cancelled in its current state",
        status: 400,
      }
    }

    // Build new notes if provided
    let newNotes = this.notes || undefined
    if (reason) {
      newNotes = newNotes ? `${newNotes}\nCancelled: ${reason}` : `Cancelled: ${reason}`
    }

    const paymentId = (this as any).getDataValue ? (this as any).getDataValue('id') : (this as any).id
    if (!paymentId) {
      throw {
        code: "PAYMENT_ID_MISSING",
        message: "Payment ID is missing on instance",
        status: 500,
      }
    }
    await (this.constructor as typeof Payment).update(
      { status: PaymentStatus.CANCELLED, notes: newNotes },
      { where: { id: paymentId } }
    )
    await this.reload()

    // Update the invoice payment status
    const invoice = await this.getInvoice()
    if (invoice) {
      await invoice.updatePaymentStatus()
    }
  }

  public async getInvoice(): Promise<any | null> {
    if (this.invoice) {
      return this.invoice
    }
    const { Invoice } = require("./Invoice")
    const invId = (this as any).getDataValue ? (this as any).getDataValue('invoiceId') : (this as any).invoiceId
    return Invoice.findByPk(invId)
  }

  public isRecent(): boolean {
    const date: Date | undefined = (this as any).getDataValue
      ? (this as any).getDataValue('paymentDate')
      : (this as any).paymentDate
    if (!date) return false
    const daysSincePayment = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
    return daysSincePayment <= 7
  }

  public getFormattedReference(): string {
    if (!this.reference) {
      const method = (this as any).getDataValue
        ? (this as any).getDataValue('paymentMethod')
        : (this as any).paymentMethod
      const methodStr = method ? String(method).toUpperCase() : 'PAYMENT'
      return `${methodStr}-${(this.id || '').slice(-8)}`
    }
    return this.reference
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      canBeModified: this.canBeModified(),
      canBeDeleted: this.canBeDeleted(),
      canBeConfirmed: this.canBeConfirmed(),
      canBeCancelled: this.canBeCancelled(),
      isRecent: this.isRecent(),
      formattedReference: this.getFormattedReference(),
    }
  }

  // Static methods
  public static async createPayment(data: PaymentCreationAttributes): Promise<Payment> {
    const payment = await this.create({
      ...data,
      status: PaymentStatus.PENDING,
    })

    // Update the invoice payment status
    const invoice = await payment.getInvoice()
    if (invoice) {
      await invoice.updatePaymentStatus()
    }

    return payment
  }

  public static async findByInvoice(invoiceId: string): Promise<Payment[]> {
    return this.findAll({
      where: { invoiceId },
      include: [
        {
          model: User,
          as: "recordedByUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    })
  }

  public static async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    return this.findAll({
      where: { status },
      include: [
        {
          model: sequelize.models.Invoice,
          as: "invoice",
          attributes: ["id", "invoiceNumber", "title", "total"],
        },
        {
          model: User,
          as: "recordedByUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    })
  }

  public static async findByUser(userId: string): Promise<Payment[]> {
    return this.findAll({
      where: { recordedBy: userId },
      include: [
        {
          model: sequelize.models.Invoice,
          as: "invoice",
          attributes: ["id", "invoiceNumber", "title", "total"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    })
  }

  public static async findByPaymentMethod(method: PaymentMethod): Promise<Payment[]> {
    return this.findAll({
      where: { paymentMethod: method },
      include: [
        {
          model: sequelize.models.Invoice,
          as: "invoice",
          attributes: ["id", "invoiceNumber", "title", "total"],
        },
        {
          model: User,
          as: "recordedByUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    })
  }

  public static async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Payment[]> {
    return this.findAll({
      where: {
        paymentDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: sequelize.models.Invoice,
          as: "invoice",
          attributes: ["id", "invoiceNumber", "title", "total"],
        },
        {
          model: User,
          as: "recordedByUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    })
  }

  public static async getTotalByStatus(status: PaymentStatus): Promise<number> {
    const result = await this.sum("amount", {
      where: { status },
    })
    return result || 0
  }

  public static async getTotalByInvoice(invoiceId: string): Promise<number> {
    const result = await this.sum("amount", {
      where: {
        invoiceId,
        status: PaymentStatus.CONFIRMED,
      },
    })
    return result || 0
  }

  public static async getPaymentSummary(invoiceId: string): Promise<{
    totalPaid: number
    totalPending: number
    paymentCount: number
    lastPaymentDate?: Date
  }> {
    const payments = await this.findByInvoice(invoiceId)

    const confirmedPayments = payments.filter((p) => p.status === PaymentStatus.CONFIRMED)
    const pendingPayments = payments.filter((p) => p.status === PaymentStatus.PENDING)

    const totalPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0)

    const lastPaymentDate =
      confirmedPayments.length > 0
        ? confirmedPayments.sort(
            (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime()
          )[0].paymentDate
        : undefined

    return {
      totalPaid,
      totalPending,
      paymentCount: confirmedPayments.length,
      lastPaymentDate,
    }
  }

  public static async reconcilePayments(invoiceId: string): Promise<void> {
    const { Invoice } = require("./Invoice")
    const invoice = await Invoice.findByPk(invoiceId)
    if (!invoice) {
      throw new Error("Invoice not found")
    }

    await invoice.updatePaymentStatus()
  }
}

// Initialize the model
Payment.init(
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "payment_date",
      validate: {
        isDate: true,
      },
    },
    paymentMethod: {
      type: DataTypes.ENUM(...Object.values(PaymentMethod)),
      allowNull: false,
      field: "payment_method",
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 255],
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(PaymentStatus)),
      allowNull: false,
      defaultValue: PaymentStatus.PENDING,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recordedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "recorded_by",
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
    modelName: "Payment",
    tableName: "payments",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["invoice_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["payment_method"],
      },
      {
        fields: ["payment_date"],
      },
      {
        fields: ["recorded_by"],
      },
      {
        fields: ["reference"],
      },
    ],
  }
)

export default Payment
