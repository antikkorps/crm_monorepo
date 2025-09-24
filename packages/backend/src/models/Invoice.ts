import { InvoiceStatus } from "@medical-crm/shared"
import { Association, DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { MedicalInstitution } from "./MedicalInstitution"
import { Quote } from "./Quote"
import { User } from "./User"

export interface InvoiceAttributes {
  id: string
  invoiceNumber: string
  institutionId: string
  assignedUserId: string
  quoteId?: string
  templateId?: string

  title: string
  description?: string
  dueDate: Date
  status: InvoiceStatus

  // Payment tracking
  totalPaid: number
  remainingAmount: number
  lastPaymentDate?: Date

  // Financial totals
  subtotal: number
  totalDiscountAmount: number
  totalTaxAmount: number
  total: number

  // Metadata
  sentAt?: Date
  paidAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceCreationAttributes
  extends Optional<
    InvoiceAttributes,
    | "id"
    | "invoiceNumber"
    | "status"
    | "totalPaid"
    | "remainingAmount"
    | "subtotal"
    | "totalDiscountAmount"
    | "totalTaxAmount"
    | "total"
    | "createdAt"
    | "updatedAt"
  > {}

export class Invoice
  extends Model<InvoiceAttributes, InvoiceCreationAttributes>
  implements InvoiceAttributes
{
  public id!: string
  public invoiceNumber!: string
  public institutionId!: string
  public assignedUserId!: string
  public quoteId?: string
  public templateId?: string

  public title!: string
  public description?: string
  public dueDate!: Date
  public status!: InvoiceStatus

  // Payment tracking
  public totalPaid!: number
  public remainingAmount!: number
  public lastPaymentDate?: Date

  // Financial totals
  public subtotal!: number
  public totalDiscountAmount!: number
  public totalTaxAmount!: number
  public total!: number

  // Metadata
  public sentAt?: Date
  public paidAt?: Date
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public lines?: any[]
  public payments?: any[]
  public institution?: MedicalInstitution
  public assignedUser?: User
  public quote?: Quote

  public static override associations: {
    lines: Association<Invoice, any>
    payments: Association<Invoice, any>
    institution: Association<Invoice, MedicalInstitution>
    assignedUser: Association<Invoice, User>
    quote: Association<Invoice, Quote>
  }

  // Instance methods
  public isOverdue(): boolean {
    const dueDate = this.dueDate || this.getDataValue('dueDate')
    if (!dueDate) {
      return false
    }
    return this.status !== InvoiceStatus.PAID && new Date() > new Date(dueDate)
  }

  public canBeModified(): boolean {
    return [InvoiceStatus.DRAFT].includes(this.status)
  }

  public canBeDeleted(): boolean {
    return [InvoiceStatus.DRAFT].includes(this.status)
  }

  public canReceivePayments(): boolean {
    return [
      InvoiceStatus.SENT,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
    ].includes(this.status)
  }

  public isFullyPaid(): boolean {
    return this.totalPaid >= this.total
  }

  public isPartiallyPaid(): boolean {
    return this.totalPaid > 0 && this.totalPaid < this.total
  }

  public async send(): Promise<void> {
    if (this.status !== InvoiceStatus.DRAFT) {
      throw new Error("Only draft invoices can be sent")
    }

    this.status = InvoiceStatus.SENT
    this.sentAt = new Date()
    await this.save()
  }

  public async cancel(): Promise<void> {
    if (![InvoiceStatus.DRAFT, InvoiceStatus.SENT].includes(this.status)) {
      throw new Error("Invoice cannot be cancelled in its current state")
    }

    this.status = InvoiceStatus.CANCELLED
    await this.save()
  }

  public async updatePaymentStatus(): Promise<void> {
    const payments = await this.getPayments()

    // Calculate total paid from confirmed payments only
    this.totalPaid = payments
      .filter((payment) => payment.status === "confirmed")
      .reduce((sum, payment) => sum + payment.amount, 0)

    this.remainingAmount = this.total - this.totalPaid

    // Find the latest payment date
    const confirmedPayments = payments.filter((payment) => payment.status === "confirmed")
    if (confirmedPayments.length > 0) {
      this.lastPaymentDate = confirmedPayments.sort(
        (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime()
      )[0].paymentDate
    }

    // Update status based on payment amount
    if (this.isFullyPaid()) {
      this.status = InvoiceStatus.PAID
      this.paidAt = this.lastPaymentDate || new Date()
    } else if (this.isPartiallyPaid()) {
      this.status = InvoiceStatus.PARTIALLY_PAID
      this.paidAt = undefined
    } else if (this.isOverdue() && this.status !== InvoiceStatus.CANCELLED) {
      this.status = InvoiceStatus.OVERDUE
      this.paidAt = undefined
    }

    await this.save()
  }

  public async recalculatePaymentTotals(): Promise<void> {
    const payments = await this.getPayments()

    // Calculate total paid from confirmed payments only
    this.totalPaid = payments
      .filter((payment) => payment.status === "confirmed")
      .reduce((sum, payment) => sum + payment.amount, 0)

    this.remainingAmount = this.total - this.totalPaid

    // Find the latest payment date
    const confirmedPayments = payments.filter((payment) => payment.status === "confirmed")
    if (confirmedPayments.length > 0) {
      this.lastPaymentDate = confirmedPayments.sort(
        (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime()
      )[0].paymentDate
    } else {
      this.lastPaymentDate = undefined
    }

    await this.save()
  }

  public async updateStatusFromPayments(): Promise<void> {
    // Update status based on payment amount
    if (this.isFullyPaid()) {
      this.status = InvoiceStatus.PAID
      this.paidAt = this.lastPaymentDate || new Date()
    } else if (this.isPartiallyPaid()) {
      this.status = InvoiceStatus.PARTIALLY_PAID
      this.paidAt = undefined
    } else if (this.isOverdue() && this.status !== InvoiceStatus.CANCELLED) {
      this.status = InvoiceStatus.OVERDUE
      this.paidAt = undefined
    } else if (this.status === InvoiceStatus.PAID && !this.isFullyPaid()) {
      // If status was paid but now it's not fully paid, revert to appropriate status
      if (this.isPartiallyPaid()) {
        this.status = InvoiceStatus.PARTIALLY_PAID
      } else {
        this.status = InvoiceStatus.SENT
      }
      this.paidAt = undefined
    }

    await this.save()
  }

  public async recalculateTotals(): Promise<void> {
    const lines = await this.getLines()

    this.subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
    this.totalDiscountAmount = lines.reduce((sum, line) => sum + line.discountAmount, 0)
    this.totalTaxAmount = lines.reduce((sum, line) => sum + line.taxAmount, 0)
    this.total = lines.reduce((sum, line) => sum + line.total, 0)

    // Update remaining amount
    this.remainingAmount = this.total - this.totalPaid

    await this.save()
  }

  public async getLines(): Promise<any[]> {
    if (this.lines) {
      return this.lines
    }
    const InvoiceLine = sequelize.models.InvoiceLine
    return InvoiceLine.findAll({
      where: { invoice_id: this.id },
      order: [["order_index", "ASC"]],
    })
  }

  public async getPayments(): Promise<any[]> {
    if (this.payments) {
      return this.payments
    }
    const Payment = sequelize.models.Payment
    return Payment.findAll({
      where: { invoice_id: this.id },
      order: [["payment_date", "DESC"]],
    })
  }

  public getDaysOverdue(): number | null {
    if (!this.isOverdue()) {
      return null
    }

    const dueDate = this.dueDate || this.getDataValue('dueDate')
    if (!dueDate) {
      return null
    }

    const now = new Date()
    const diffTime = now.getTime() - new Date(dueDate).getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  public getDaysUntilDue(): number | null {
    if (this.status === InvoiceStatus.PAID) {
      return null
    }

    const dueDate = this.dueDate || this.getDataValue('dueDate')
    if (!dueDate) {
      return null
    }

    const now = new Date()
    const diffTime = new Date(dueDate).getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      isOverdue: this.isOverdue(),
      canBeModified: this.canBeModified(),
      canBeDeleted: this.canBeDeleted(),
      canReceivePayments: this.canReceivePayments(),
      isFullyPaid: this.isFullyPaid(),
      isPartiallyPaid: this.isPartiallyPaid(),
      daysOverdue: this.getDaysOverdue(),
      daysUntilDue: this.getDaysUntilDue(),
    }
  }

  // Static methods
  public static async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, "0")
    const prefix = `INV${year}${month}`

    // Find all invoices for this month to get the highest sequence number
    const invoices = await this.findAll({
      where: {
        invoiceNumber: {
          [Op.like]: `${prefix}%`,
        },
      },
      attributes: ['invoiceNumber'],
      order: [["invoiceNumber", "ASC"]],
    })

    let sequence = 1
    if (invoices.length > 0) {
      // Extract sequence numbers and find the highest + 1
      const sequences = invoices
        .map(invoice => {
          if (!invoice.invoiceNumber || invoice.invoiceNumber.length < prefix.length + 4) {
            return 0
          }
          const seqStr = invoice.invoiceNumber.slice(-4)
          const seqNum = parseInt(seqStr, 10)
          return isNaN(seqNum) ? 0 : seqNum
        })
        .filter(seq => seq > 0)
        .sort((a, b) => b - a) // Sort descending

      if (sequences.length > 0) {
        sequence = sequences[0] + 1
      }
    }

    let attempts = 0
    while (attempts < 100) {
      const invoiceNumber = `${prefix}${String(sequence).padStart(4, "0")}`

      // Check if this number already exists
      const existing = await this.findOne({
        where: { invoiceNumber },
        attributes: ['id']
      })

      if (!existing) {
        return invoiceNumber
      }

      sequence++
      attempts++
    }

    // Fallback with timestamp if we can't find a unique number
    const timestamp = Date.now().toString().slice(-6)
    return `${prefix}${timestamp}`
  }

  public static async createInvoice(data: InvoiceCreationAttributes): Promise<Invoice> {
    let attempts = 0
    while (attempts < 5) {
      try {
        const invoiceNumber = await this.generateInvoiceNumber()

        return await this.create({
          ...data,
          invoiceNumber,
          status: InvoiceStatus.DRAFT,
          totalPaid: 0,
          remainingAmount: 0,
          subtotal: 0,
          totalDiscountAmount: 0,
          totalTaxAmount: 0,
          total: 0,
        })
      } catch (error: any) {
        // Check if it's a unique constraint violation on invoice_number
        if (error.code === '23505' && error.constraint?.includes('invoice_number')) {
          attempts++
          console.log(`Invoice number collision, retrying (attempt ${attempts}/5)`)
          if (attempts >= 5) {
            throw new Error('Unable to generate unique invoice number after multiple attempts')
          }
          continue
        }
        // If it's any other error, rethrow immediately
        throw error
      }
    }
    throw new Error('Maximum retry attempts exceeded')
  }

  public static async createFromQuote(quote: Quote): Promise<Invoice> {
    const invoiceData: InvoiceCreationAttributes = {
      institutionId: quote.institutionId,
      assignedUserId: quote.assignedUserId,
      quoteId: quote.id,
      templateId: quote.templateId,
      title: quote.title,
      description: quote.description,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    }

    const invoice = await this.createInvoice(invoiceData)

    // Copy quote lines to invoice lines
    const quoteLines = await quote.getLines()
    const { InvoiceLine } = require("./InvoiceLine")
    for (const quoteLine of quoteLines) {
      await InvoiceLine.createLine({
        invoiceId: invoice.id,
        orderIndex: quoteLine.orderIndex,
        description: quoteLine.description,
        quantity: quoteLine.quantity,
        unitPrice: quoteLine.unitPrice,
        discountType: quoteLine.discountType,
        discountValue: quoteLine.discountValue,
        taxRate: quoteLine.taxRate,
      })
    }

    // Recalculate totals
    await invoice.recalculateTotals()

    return invoice
  }

  public static async findByInstitution(institutionId: string): Promise<Invoice[]> {
    return this.findAll({
      where: { institutionId },
      include: [
        {
          model: sequelize.models.InvoiceLine,
          as: "lines",
        },
        {
          model: sequelize.models.Payment,
          as: "payments",
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByUser(userId: string): Promise<Invoice[]> {
    return this.findAll({
      where: { assignedUserId: userId },
      include: [
        {
          model: sequelize.models.InvoiceLine,
          as: "lines",
        },
        {
          model: sequelize.models.Payment,
          as: "payments",
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    return this.findAll({
      where: { status },
      include: [
        {
          model: sequelize.models.InvoiceLine,
          as: "lines",
        },
        {
          model: sequelize.models.Payment,
          as: "payments",
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findOverdue(): Promise<Invoice[]> {
    return this.findAll({
      where: {
        status: {
          [Op.in]: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
        },
        dueDate: {
          [Op.lt]: new Date(),
        },
      },
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  }

  public static async markOverdueInvoices(): Promise<number> {
    const [affectedCount] = await this.update(
      { status: InvoiceStatus.OVERDUE },
      {
        where: {
          status: {
            [Op.in]: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID],
          },
          dueDate: {
            [Op.lt]: new Date(),
          },
        },
      }
    )
    return affectedCount
  }
}

// Initialize the model
Invoice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    invoiceNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "invoice_number",
      validate: {
        len: [1, 50],
      },
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "institution_id",
      references: {
        model: "medical_institutions",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    assignedUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "assigned_user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    quoteId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "quote_id",
      references: {
        model: "quotes",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "template_id",
    },
    title: {
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
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "due_date",
      validate: {
        isDate: true,
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(InvoiceStatus)),
      allowNull: false,
      defaultValue: InvoiceStatus.DRAFT,
    },
    totalPaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_paid",
      validate: {
        min: 0,
      },
    },
    remainingAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "remaining_amount",
      validate: {
        min: 0,
      },
    },
    lastPaymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_payment_date",
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    totalDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_discount_amount",
      validate: {
        min: 0,
      },
    },
    totalTaxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_tax_amount",
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
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sent_at",
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "paid_at",
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
    modelName: "Invoice",
    tableName: "invoices",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["invoice_number"],
      },
      {
        fields: ["institution_id"],
      },
      {
        fields: ["assigned_user_id"],
      },
      {
        fields: ["quote_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["due_date"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
)

export default Invoice
