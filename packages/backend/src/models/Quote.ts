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
  title: string
  description?: string
  validUntil: Date
  status: QuoteStatus
  acceptedAt?: Date
  rejectedAt?: Date
  clientComments?: string
  internalNotes?: string

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
  public id!: string
  public quoteNumber!: string
  public institutionId!: string
  public assignedUserId!: string
  public templateId?: string
  public title!: string
  public description?: string
  public validUntil!: Date
  public status!: QuoteStatus
  public acceptedAt?: Date
  public rejectedAt?: Date
  public clientComments?: string
  public internalNotes?: string

  // Financial totals
  public subtotal!: number
  public totalDiscountAmount!: number
  public totalTaxAmount!: number
  public total!: number

  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public lines?: QuoteLine[]
  public institution?: MedicalInstitution
  public assignedUser?: User

  public static override associations: {
    lines: Association<Quote, QuoteLine>
    institution: Association<Quote, MedicalInstitution>
    assignedUser: Association<Quote, User>
  }

  // Instance methods
  public isExpired(): boolean {
    return this.status !== QuoteStatus.ACCEPTED && new Date() > this.validUntil
  }

  public canBeModified(): boolean {
    return [QuoteStatus.DRAFT, QuoteStatus.SENT].includes(this.status)
  }

  public canBeAccepted(): boolean {
    return this.status === QuoteStatus.SENT && !this.isExpired()
  }

  public canBeRejected(): boolean {
    return this.status === QuoteStatus.SENT && !this.isExpired()
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

  public async cancel(): Promise<void> {
    if (![QuoteStatus.DRAFT, QuoteStatus.SENT].includes(this.status)) {
      throw new Error("Quote cannot be cancelled in its current state")
    }

    this.status = QuoteStatus.CANCELLED
    await this.save()
  }

  public async recalculateTotals(): Promise<void> {
    const lines = await this.getLines()

    this.subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
    this.totalDiscountAmount = lines.reduce((sum, line) => sum + line.discountAmount, 0)
    this.totalTaxAmount = lines.reduce((sum, line) => sum + line.taxAmount, 0)
    this.total = lines.reduce((sum, line) => sum + line.total, 0)

    await this.save()
  }

  public async getLines(): Promise<QuoteLine[]> {
    if (this.lines) {
      return this.lines
    }
    return QuoteLine.findAll({
      where: { quoteId: this.id },
      order: [["orderIndex", "ASC"]],
    })
  }

  public getDaysUntilExpiry(): number | null {
    if (this.status === QuoteStatus.ACCEPTED || this.status === QuoteStatus.REJECTED) {
      return null
    }

    const now = new Date()
    const diffTime = this.validUntil.getTime() - now.getTime()
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

    // Find the highest quote number for this month
    const lastQuote = await this.findOne({
      where: {
        quoteNumber: {
          [Op.like]: `Q${year}${month}%`,
        },
      },
      order: [["quoteNumber", "DESC"]],
    })

    let sequence = 1
    if (lastQuote) {
      const lastSequence = parseInt(lastQuote.quoteNumber.slice(-4))
      sequence = lastSequence + 1
    }

    return `Q${year}${month}${String(sequence).padStart(4, "0")}`
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
      type: DataTypes.ENUM(...Object.values(QuoteStatus)),
      allowNull: false,
      defaultValue: QuoteStatus.DRAFT,
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
