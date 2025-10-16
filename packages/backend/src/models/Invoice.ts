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
  public archived?: boolean
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
    const status = (this as any).getDataValue ? (this as any).getDataValue('status') : this.status
    return [InvoiceStatus.DRAFT].includes(status)
  }

  public canBeDeleted(): boolean {
    const status = (this as any).getDataValue ? (this as any).getDataValue('status') : this.status
    return [InvoiceStatus.DRAFT].includes(status)
  }

  public canReceivePayments(): boolean {
    const status = (this as any).getDataValue ? (this as any).getDataValue('status') : this.status
    const archived = (this as any).getDataValue ? (this as any).getDataValue('archived') : (this as any).archived
    return [
      InvoiceStatus.SENT,
      InvoiceStatus.PARTIALLY_PAID,
      InvoiceStatus.OVERDUE,
    ].includes(status) && !archived
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

    // First, ensure status is persisted even if optional columns are missing
    await (this.constructor as typeof Invoice).update(
      { status: InvoiceStatus.SENT },
      { where: { id: this.id } }
    )

    // Best-effort update of sentAt; ignore if column doesn't exist
    try {
      await (this.constructor as typeof Invoice).update(
        // @ts-expect-error sentAt may not exist on some DB schemas
        { sentAt: new Date() },
        { where: { id: this.id } }
      )
    } catch {
      // no-op
    }

    await this.reload()
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
    const totalPaid = payments
      .filter((payment) => {
        const status = (payment as any).getDataValue ? (payment as any).getDataValue('status') : (payment as any).status
        return status === "confirmed"
      })
      .reduce((sum, payment) => sum + (Number((payment as any).getDataValue ? (payment as any).getDataValue('amount') : (payment as any).amount) || 0), 0)
    const total = Number((this as any).getDataValue ? (this as any).getDataValue('total') : (this as any).total) || 0
    const remainingAmount = total - totalPaid

    // Find the latest payment date
    const confirmedPayments = payments
      .filter((payment) => {
        const status = (payment as any).getDataValue ? (payment as any).getDataValue('status') : (payment as any).status
        return status === "confirmed"
      })
      .map((p) => {
        const d = (p as any).getDataValue ? (p as any).getDataValue('paymentDate') : (p as any).paymentDate
        return d ? { p, d: new Date(d) } : null
      })
      .filter((x) => !!x)
      .map((x: any) => x)
    let lastPaymentDate: Date | undefined
    if (confirmedPayments.length > 0) {
      confirmedPayments.sort((a: any, b: any) => b.d.getTime() - a.d.getTime())
      lastPaymentDate = confirmedPayments[0].d
    }

    // Update status based on payment amount
    let newStatus = (this as any).getDataValue ? (this as any).getDataValue('status') : (this as any).status
    let paidAt: Date | undefined
    const isFullyPaid = totalPaid >= total
    const isPartiallyPaid = totalPaid > 0 && totalPaid < total
    const overdue = this.isOverdue() && newStatus !== InvoiceStatus.CANCELLED
    if (isFullyPaid) {
      newStatus = InvoiceStatus.PAID
      paidAt = lastPaymentDate || new Date()
    } else if (isPartiallyPaid) {
      newStatus = InvoiceStatus.PARTIALLY_PAID
      paidAt = undefined
    } else if (overdue) {
      newStatus = InvoiceStatus.OVERDUE
      paidAt = undefined
    }

    const invoiceId = (this as any).getDataValue ? (this as any).getDataValue('id') : (this as any).id
    await (this.constructor as typeof Invoice).update(
      { totalPaid, remainingAmount, lastPaymentDate: lastPaymentDate as any, status: newStatus, paidAt: paidAt as any },
      { where: { id: invoiceId } }
    )
    await this.reload()
  }

  public async recalculatePaymentTotals(): Promise<void> {
    const payments = await this.getPayments()

    // Calculate total paid from confirmed payments only
    this.totalPaid = payments
      .filter((payment) => {
        const status = (payment as any).getDataValue ? (payment as any).getDataValue('status') : (payment as any).status
        return status === "confirmed"
      })
      .reduce((sum, payment) => sum + (Number((payment as any).getDataValue ? (payment as any).getDataValue('amount') : (payment as any).amount) || 0), 0)

    this.remainingAmount = this.total - this.totalPaid

    // Find the latest payment date
    const confirmedPayments = payments
      .filter((payment) => {
        const status = (payment as any).getDataValue ? (payment as any).getDataValue('status') : (payment as any).status
        return status === "confirmed"
      })
      .map((p) => {
        const d = (p as any).getDataValue ? (p as any).getDataValue('paymentDate') : (p as any).paymentDate
        return d ? { p, d: new Date(d) } : null
      })
      .filter((x) => !!x)
      .map((x: any) => x)
    if (confirmedPayments.length > 0) {
      confirmedPayments.sort((a: any, b: any) => b.d.getTime() - a.d.getTime())
      this.lastPaymentDate = confirmedPayments[0].d
    } else {
      this.lastPaymentDate = undefined
    }

    await this.save()
  }

  public async updateStatusFromPayments(): Promise<void> {
    const totalPaid = Number((this as any).getDataValue ? (this as any).getDataValue('totalPaid') : (this as any).totalPaid) || 0
    const total = Number((this as any).getDataValue ? (this as any).getDataValue('total') : (this as any).total) || 0
    let newStatus = (this as any).getDataValue ? (this as any).getDataValue('status') : (this as any).status
    let paidAt: Date | undefined = (this as any).getDataValue ? (this as any).getDataValue('paidAt') : (this as any).paidAt

    if (totalPaid >= total) {
      newStatus = InvoiceStatus.PAID
      const lastDate = (this as any).getDataValue ? (this as any).getDataValue('lastPaymentDate') : (this as any).lastPaymentDate
      paidAt = lastDate || new Date()
    } else if (totalPaid > 0) {
      newStatus = InvoiceStatus.PARTIALLY_PAID
      paidAt = undefined
    } else if (this.isOverdue() && newStatus !== InvoiceStatus.CANCELLED) {
      newStatus = InvoiceStatus.OVERDUE
      paidAt = undefined
    } else if (newStatus === InvoiceStatus.PAID && totalPaid < total) {
      newStatus = totalPaid > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.SENT
      paidAt = undefined
    }

    const invoiceId = (this as any).getDataValue ? (this as any).getDataValue('id') : (this as any).id
    await (this.constructor as typeof Invoice).update(
      { status: newStatus, paidAt: paidAt as any },
      { where: { id: invoiceId } }
    )
    await this.reload()
  }

  public async recalculateTotals(options?: { transaction?: any }): Promise<void> {
    const lines = await this.getLines(options)

    this.subtotal = lines.reduce((sum, line) => sum + (Number(line.subtotal) || 0), 0)
    this.totalDiscountAmount = lines.reduce((sum, line) => sum + (Number(line.discountAmount) || 0), 0)
    this.totalTaxAmount = lines.reduce((sum, line) => sum + (Number(line.taxAmount) || 0), 0)
    this.total = lines.reduce((sum, line) => sum + (Number(line.total) || 0), 0)

    // Update remaining amount
    this.remainingAmount = this.total - this.totalPaid

    await this.save(options)
  }

  public async getLines(options?: { transaction?: any }): Promise<any[]> {
    // Do not use cached `this.lines` if in a transaction, as it might be stale
    if (this.lines && !options?.transaction) {
      return this.lines
    }
    const InvoiceLine = sequelize.models.InvoiceLine
    const invoiceId = (this as any).getDataValue ? (this as any).getDataValue('id') : this.id
    return InvoiceLine.findAll({
      where: { invoiceId: invoiceId },
      order: [["orderIndex", "ASC"]],
      transaction: options?.transaction,
    })
  }

  public async getPayments(): Promise<any[]> {
    if (this.payments) {
      return this.payments
    }
    const Payment = sequelize.models.Payment
    const invoiceId = (this as any).getDataValue ? (this as any).getDataValue('id') : (this as any).id
    return Payment.findAll({
      where: { invoice_id: invoiceId },
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
      // Align to existing dev DB column name without migration
      field: "paid_amount",
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
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
