import { QuoteStatus } from "@medical-crm/shared"
import { Association, DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { MedicalInstitution } from "./MedicalInstitution"
import { QuoteLine } from "./QuoteLine"
import { User } from "./User"

export interface QuoteAttributes {
  id: string
  quoteNumber: string
  institutionId: string
  assignedUserId: string
  templateId?: string
  orderNumber?: string
  title: string
  description?: string
  validUntil: Date
  status: QuoteStatus
  acceptedAt?: Date
  rejectedAt?: Date
  orderedAt?: Date
  clientComments?: string
  internalNotes?: string
  lastReminderSent?: Date

  // Financial totals
  subtotal: number
  totalDiscountAmount: number
  totalTaxAmount: number
  total: number

  createdAt: Date
  updatedAt: Date
}

export interface QuoteCreationAttributes
  extends Optional<
    QuoteAttributes,
    | "id"
    | "quoteNumber"
    | "status"
    | "subtotal"
    | "totalDiscountAmount"
    | "totalTaxAmount"
    | "total"
    | "createdAt"
    | "updatedAt"
  > {}

export class Quote
  extends Model<QuoteAttributes, QuoteCreationAttributes>
  implements QuoteAttributes
{
  declare id: string
  declare quoteNumber: string
  declare institutionId: string
  declare assignedUserId: string
  declare templateId?: string
  declare orderNumber?: string
  declare title: string
  declare description?: string
  declare validUntil: Date
  declare status: QuoteStatus
  declare acceptedAt?: Date
  declare rejectedAt?: Date
  declare orderedAt?: Date
  declare clientComments?: string
  declare internalNotes?: string
  declare lastReminderSent?: Date

  // Financial totals
  declare subtotal: number
  declare totalDiscountAmount: number
  declare totalTaxAmount: number
  declare total: number

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations - use declare to avoid shadowing Sequelize's getters
  declare lines?: QuoteLine[]
  declare institution?: MedicalInstitution
  declare assignedUser?: User

  public static override associations: {
    lines: Association<Quote, QuoteLine>
    institution: Association<Quote, MedicalInstitution>
    assignedUser: Association<Quote, User>
  }

  // Instance methods
  public isExpired(): boolean {
    const status = this.status || this.getDataValue('status')
    const validUntil = this.validUntil || this.getDataValue('validUntil')
    // Handle case where validUntil is not loaded (partial association)
    if (!validUntil) {
      return false
    }
    return status !== QuoteStatus.ACCEPTED && new Date() > validUntil
  }

  public canBeModified(): boolean {
    const status = this.status || this.getDataValue('status')
    // Handle case where status is not loaded
    if (!status) {
      return false
    }
    return [QuoteStatus.DRAFT, QuoteStatus.SENT].includes(status)
  }

  public canBeAccepted(): boolean {
    const status = this.status || this.getDataValue('status')
    // Handle case where status is not loaded
    if (!status) {
      return false
    }
    // Allow acceptance from draft (manual send) or sent status
    return [QuoteStatus.DRAFT, QuoteStatus.SENT].includes(status) && !this.isExpired()
  }

  public canBeRejected(): boolean {
    const status = this.status || this.getDataValue('status')
    // Handle case where status is not loaded
    if (!status) {
      return false
    }
    return status === QuoteStatus.SENT && !this.isExpired()
  }

  public async accept(clientComments?: string): Promise<void> {
    if (!this.canBeAccepted()) {
      throw new Error("Quote cannot be accepted in its current state")
    }

    this.status = QuoteStatus.ACCEPTED
    this.acceptedAt = new Date()
    if (clientComments) {
      this.clientComments = clientComments
    }
    await this.save()
  }

  public async reject(clientComments?: string): Promise<void> {
    if (!this.canBeRejected()) {
      throw new Error("Quote cannot be rejected in its current state")
    }

    this.status = QuoteStatus.REJECTED
    this.rejectedAt = new Date()
    if (clientComments) {
      this.clientComments = clientComments
    }
    await this.save()
  }

  public async send(): Promise<void> {
    if (this.status !== QuoteStatus.DRAFT) {
      throw new Error("Only draft quotes can be sent")
    }

    this.status = QuoteStatus.SENT
    await this.save()
  }

  public async confirmOrder(): Promise<void> {
    const status = this.status || this.getDataValue('status')
    // Allow order confirmation from draft, sent, or accepted status
    if (![QuoteStatus.DRAFT, QuoteStatus.SENT, QuoteStatus.ACCEPTED].includes(status)) {
      throw new Error("Quote cannot be ordered in its current state")
    }
    const number = await (this.constructor as typeof Quote).generateOrderNumber()
    this.orderNumber = number
    this.orderedAt = new Date()
    this.status = QuoteStatus.ORDERED as any
    await this.save()
  }

  public async cancel(): Promise<void> {
    if (![QuoteStatus.DRAFT, QuoteStatus.SENT].includes(this.status)) {
      throw new Error("Quote cannot be cancelled in its current state")
    }

    this.status = QuoteStatus.CANCELLED
    await this.save()
  }

  public async recalculateTotals(transaction?: any): Promise<void> {
    const lines = await this.getLines(transaction)

    // Convert all line values to numbers to ensure proper arithmetic
    this.subtotal = lines.reduce((sum, line) => {
      const lineSubtotal = Number(line.subtotal) || 0
      return sum + lineSubtotal
    }, 0)

    this.totalDiscountAmount = lines.reduce((sum, line) => {
      const lineDiscount = Number(line.discountAmount) || 0
      return sum + lineDiscount
    }, 0)

    this.totalTaxAmount = lines.reduce((sum, line) => {
      const lineTax = Number(line.taxAmount) || 0
      return sum + lineTax
    }, 0)

    this.total = lines.reduce((sum, line) => {
      const lineTotal = Number(line.total) || 0
      return sum + lineTotal
    }, 0)

    await this.save({ transaction })
  }

  public async getLines(transaction?: any): Promise<QuoteLine[]> {
    if (this.lines) {
      return this.lines
    }
    return QuoteLine.findAll({
      where: { quoteId: this.id },
      order: [["orderIndex", "ASC"]],
      transaction,
    })
  }

  public getDaysUntilExpiry(): number | null {
    const status = this.status || this.getDataValue('status')
    if (status === QuoteStatus.ACCEPTED || status === QuoteStatus.REJECTED) {
      return null
    }

    const validUntil = this.validUntil || this.getDataValue('validUntil')
    // Handle case where validUntil is not loaded (partial association)
    if (!validUntil) {
      return null
    }
    const now = new Date()
    const diffTime = validUntil.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      isExpired: this.isExpired(),
      canBeModified: this.canBeModified(),
      canBeAccepted: this.canBeAccepted(),
      canBeRejected: this.canBeRejected(),
      daysUntilExpiry: this.getDaysUntilExpiry(),
    }
  }

  // Static methods
  public static async generateQuoteNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, "0")
    const basePattern = `Q${year}${month}`

    console.log("=== DEBUG: generateQuoteNumber ===")
    console.log("Base pattern:", basePattern)

    // Use raw query to avoid transaction issues
    const sequelize = this.sequelize!
    const result = await sequelize.query(
      `SELECT quote_number FROM quotes
       WHERE quote_number LIKE $1
       ORDER BY quote_number DESC
       LIMIT 1`,
      {
        bind: [`${basePattern}%`],
        type: (sequelize.constructor as any).QueryTypes.SELECT,
      }
    ) as unknown as Array<{ quote_number: string }>

    console.log("Raw query result:", result)

    let sequence = 1
    if (result.length > 0 && result[0].quote_number) {
      const lastSequence = Number.parseInt(result[0].quote_number.slice(-4))
      console.log("Last sequence:", lastSequence)
      sequence = lastSequence + 1
    }

    const newNumber = `${basePattern}${String(sequence).padStart(4, "0")}`
    console.log("Generated number:", newNumber)
    return newNumber
  }

  public static async createQuote(data: QuoteCreationAttributes): Promise<Quote> {
    const quoteNumber = await this.generateQuoteNumber()

    return this.create({
      ...data,
      quoteNumber,
      status: QuoteStatus.DRAFT,
      subtotal: 0,
      totalDiscountAmount: 0,
      totalTaxAmount: 0,
      total: 0,
    })
  }

  public static async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, "0")
    const basePattern = `O${year}${month}`

    const sequelize = this.sequelize!
    const rows = (await sequelize.query(
      `SELECT order_number FROM quotes
       WHERE order_number LIKE $1
       ORDER BY order_number DESC
       LIMIT 1`,
      {
        bind: [`${basePattern}%`],
        type: (sequelize.constructor as any).QueryTypes.SELECT,
      }
    )) as unknown as Array<{ order_number: string }>

    let sequence = 1
    if (rows.length > 0 && rows[0].order_number) {
      const lastSequence = Number.parseInt(rows[0].order_number.slice(-4))
      sequence = lastSequence + 1
    }
    return `${basePattern}${String(sequence).padStart(4, "0")}`
  }

  public static async findByInstitution(institutionId: string): Promise<Quote[]> {
    return this.findAll({
      where: { institutionId },
      include: [
        {
          model: QuoteLine,
          as: "lines",
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

  public static async findByUser(userId: string): Promise<Quote[]> {
    return this.findAll({
      where: { assignedUserId: userId },
      include: [
        {
          model: QuoteLine,
          as: "lines",
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

  public static async findByStatus(status: QuoteStatus): Promise<Quote[]> {
    return this.findAll({
      where: { status },
      include: [
        {
          model: QuoteLine,
          as: "lines",
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

  public static async findExpired(): Promise<Quote[]> {
    return this.findAll({
      where: {
        status: QuoteStatus.SENT,
        validUntil: {
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

  public static async markExpiredQuotes(): Promise<number> {
    const [affectedCount] = await this.update(
      { status: QuoteStatus.EXPIRED },
      {
        where: {
          status: QuoteStatus.SENT,
          validUntil: {
            [Op.lt]: new Date(),
          },
        },
      }
    )
    return affectedCount
  }
}

// Initialize the model
Quote.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quoteNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "quote_number",
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
    templateId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "template_id",
      set(value: string | null | undefined) {
        if (
          value === null ||
          value === undefined ||
          (typeof value === "string" && value.trim().length === 0)
        ) {
          this.setDataValue("templateId", undefined)
        } else {
          this.setDataValue("templateId", value)
        }
      },
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      field: "order_number",
      validate: {
        len: [0, 50],
      },
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
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "valid_until",
      validate: {
        isDate: true,
        isAfter: new Date().toISOString(),
      },
    },
    status: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(QuoteStatus)),
      allowNull: false,
      defaultValue: QuoteStatus.DRAFT,
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(QuoteStatus)] },
      }),
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "accepted_at",
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "rejected_at",
    },
    orderedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "ordered_at",
    },
    clientComments: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "client_comments",
    },
    internalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "internal_notes",
    },
    lastReminderSent: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_reminder_sent",
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
    modelName: "Quote",
    tableName: "quotes",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["quote_number"],
      },
      {
        fields: ["institution_id"],
      },
      {
        fields: ["assigned_user_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["valid_until"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
)

export default Quote
