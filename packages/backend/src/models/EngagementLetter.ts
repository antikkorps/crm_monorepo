import {
  BillingType,
  EngagementLetterStatus,
  MissionType,
  type Deliverable,
} from "@medical-crm/shared"
import { Association, DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import type { EngagementLetterMember } from "./EngagementLetterMember"
import type { MedicalInstitution } from "./MedicalInstitution"
import type { User } from "./User"

export interface EngagementLetterAttributes {
  id: string
  letterNumber: string
  institutionId: string
  assignedUserId: string
  templateId?: string

  // Mission details
  title: string
  missionType: MissionType
  scope?: string // HTML content from rich text editor
  objectives?: string[]
  deliverables?: Deliverable[]

  // Timeline
  startDate?: Date
  endDate?: Date
  estimatedHours?: number

  // Financial
  billingType: BillingType
  rate: number
  totalDays: number
  travelExpenses: number
  estimatedTotal: number
  vatRate?: number // TVA rate (default 20%)
  showVat: boolean // Whether to display VAT in the document

  // Workflow
  status: EngagementLetterStatus
  validUntil: Date
  sentAt?: Date
  acceptedAt?: Date
  rejectedAt?: Date
  completedAt?: Date

  // Additional info
  termsAndConditions?: string
  clientComments?: string
  internalNotes?: string

  createdAt: Date
  updatedAt: Date
}

export interface EngagementLetterCreationAttributes
  extends Optional<
    EngagementLetterAttributes,
    | "id"
    | "letterNumber"
    | "status"
    | "estimatedTotal"
    | "totalDays"
    | "travelExpenses"
    | "showVat"
    | "createdAt"
    | "updatedAt"
  > {}

export class EngagementLetter
  extends Model<EngagementLetterAttributes, EngagementLetterCreationAttributes>
  implements EngagementLetterAttributes
{
  declare id: string
  declare letterNumber: string
  declare institutionId: string
  declare assignedUserId: string
  declare templateId?: string

  // Mission details
  declare title: string
  declare missionType: MissionType
  declare scope?: string
  declare objectives?: string[]
  declare deliverables?: Deliverable[]

  // Timeline
  declare startDate?: Date
  declare endDate?: Date
  declare estimatedHours?: number

  // Financial
  declare billingType: BillingType
  declare rate: number
  declare totalDays: number
  declare travelExpenses: number
  declare estimatedTotal: number
  declare vatRate?: number
  declare showVat: boolean

  // Workflow
  declare status: EngagementLetterStatus
  declare validUntil: Date
  declare sentAt?: Date
  declare acceptedAt?: Date
  declare rejectedAt?: Date
  declare completedAt?: Date

  // Additional info
  declare termsAndConditions?: string
  declare clientComments?: string
  declare internalNotes?: string

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare members?: EngagementLetterMember[]
  declare institution?: MedicalInstitution
  declare assignedUser?: User

  public static override associations: {
    members: Association<EngagementLetter, EngagementLetterMember>
    institution: Association<EngagementLetter, MedicalInstitution>
    assignedUser: Association<EngagementLetter, User>
  }

  // Instance methods
  public isExpired(): boolean {
    const status = this.status || this.getDataValue("status")
    const validUntil = this.validUntil || this.getDataValue("validUntil")
    if (!validUntil) {
      return false
    }
    return (
      ![
        EngagementLetterStatus.ACCEPTED,
        EngagementLetterStatus.COMPLETED,
      ].includes(status) && new Date() > validUntil
    )
  }

  public canBeModified(): boolean {
    const status = this.status || this.getDataValue("status")
    if (!status) {
      return false
    }
    return [EngagementLetterStatus.DRAFT, EngagementLetterStatus.SENT].includes(
      status
    )
  }

  public canBeSent(): boolean {
    const status = this.status || this.getDataValue("status")
    if (!status) {
      return false
    }
    return status === EngagementLetterStatus.DRAFT && !this.isExpired()
  }

  public canBeAccepted(): boolean {
    const status = this.status || this.getDataValue("status")
    if (!status) {
      return false
    }
    return (
      [EngagementLetterStatus.DRAFT, EngagementLetterStatus.SENT].includes(
        status
      ) && !this.isExpired()
    )
  }

  public canBeRejected(): boolean {
    const status = this.status || this.getDataValue("status")
    if (!status) {
      return false
    }
    return status === EngagementLetterStatus.SENT && !this.isExpired()
  }

  public canBeCompleted(): boolean {
    const status = this.status || this.getDataValue("status")
    if (!status) {
      return false
    }
    return status === EngagementLetterStatus.ACCEPTED
  }

  public async send(): Promise<void> {
    if (!this.canBeSent()) {
      throw new Error("Engagement letter cannot be sent in its current state")
    }

    this.status = EngagementLetterStatus.SENT
    this.sentAt = new Date()
    await this.save()
  }

  public async accept(clientComments?: string): Promise<void> {
    if (!this.canBeAccepted()) {
      throw new Error(
        "Engagement letter cannot be accepted in its current state"
      )
    }

    this.status = EngagementLetterStatus.ACCEPTED
    this.acceptedAt = new Date()
    if (clientComments) {
      this.clientComments = clientComments
    }
    await this.save()
  }

  public async reject(clientComments?: string): Promise<void> {
    if (!this.canBeRejected()) {
      throw new Error(
        "Engagement letter cannot be rejected in its current state"
      )
    }

    this.status = EngagementLetterStatus.REJECTED
    this.rejectedAt = new Date()
    if (clientComments) {
      this.clientComments = clientComments
    }
    await this.save()
  }

  public async complete(): Promise<void> {
    if (!this.canBeCompleted()) {
      throw new Error(
        "Engagement letter cannot be completed in its current state"
      )
    }

    this.status = EngagementLetterStatus.COMPLETED
    this.completedAt = new Date()
    await this.save()
  }

  public async cancel(): Promise<void> {
    if (
      ![EngagementLetterStatus.DRAFT, EngagementLetterStatus.SENT].includes(
        this.status
      )
    ) {
      throw new Error(
        "Engagement letter cannot be cancelled in its current state"
      )
    }

    this.status = EngagementLetterStatus.CANCELLED
    await this.save()
  }

  public getDaysUntilExpiry(): number | null {
    const status = this.status || this.getDataValue("status")
    if (
      [
        EngagementLetterStatus.ACCEPTED,
        EngagementLetterStatus.REJECTED,
        EngagementLetterStatus.COMPLETED,
        EngagementLetterStatus.CANCELLED,
      ].includes(status)
    ) {
      return null
    }

    const validUntil = this.validUntil || this.getDataValue("validUntil")
    if (!validUntil) {
      return null
    }
    const now = new Date()
    const diffTime = validUntil.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  public async recalculateTotal(transaction?: any): Promise<void> {
    // Calculate total using the simplified formula: rate × totalDays + travelExpenses
    const rate = Number(this.rate) || 0
    const totalDays = Number(this.totalDays) || 0
    const travelExpenses = Number(this.travelExpenses) || 0

    this.estimatedTotal = rate * totalDays + travelExpenses
    await this.save({ transaction })
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      isExpired: this.isExpired(),
      canBeModified: this.canBeModified(),
      canBeSent: this.canBeSent(),
      canBeAccepted: this.canBeAccepted(),
      canBeRejected: this.canBeRejected(),
      canBeCompleted: this.canBeCompleted(),
      daysUntilExpiry: this.getDaysUntilExpiry(),
    }
  }

  // Static methods
  public static async generateLetterNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, "0")
    const basePattern = `LM${year}${month}`

    const sequelizeInstance = this.sequelize!
    const result = (await sequelizeInstance.query(
      `SELECT letter_number FROM engagement_letters
       WHERE letter_number LIKE $1
       ORDER BY letter_number DESC
       LIMIT 1`,
      {
        bind: [`${basePattern}%`],
        type: (sequelizeInstance.constructor as any).QueryTypes.SELECT,
      }
    )) as unknown as Array<{ letter_number: string }>

    let sequence = 1
    if (result.length > 0 && result[0].letter_number) {
      const lastSequence = Number.parseInt(result[0].letter_number.slice(-4))
      sequence = lastSequence + 1
    }

    return `${basePattern}${String(sequence).padStart(4, "0")}`
  }

  public static async createLetter(
    data: EngagementLetterCreationAttributes
  ): Promise<EngagementLetter> {
    const letterNumber = await this.generateLetterNumber()

    // Calculate estimatedTotal from rate, totalDays, and travelExpenses if not provided
    const rate = Number(data.rate) || 0
    const totalDays = Number(data.totalDays) || 0
    const travelExpenses = Number(data.travelExpenses) || 0
    const calculatedTotal = rate * totalDays + travelExpenses

    return this.create({
      ...data,
      letterNumber,
      status: EngagementLetterStatus.DRAFT,
      estimatedTotal: data.estimatedTotal ?? calculatedTotal,
    })
  }

  public static async findByInstitution(
    institutionId: string
  ): Promise<EngagementLetter[]> {
    // Dynamic import to avoid circular dependency
    const { MedicalInstitution } = await import("./MedicalInstitution")
    const { User } = await import("./User")

    return this.findAll({
      where: { institutionId },
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
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByStatus(
    status: EngagementLetterStatus
  ): Promise<EngagementLetter[]> {
    const { MedicalInstitution } = await import("./MedicalInstitution")
    const { User } = await import("./User")

    return this.findAll({
      where: { status },
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
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findExpired(): Promise<EngagementLetter[]> {
    const { MedicalInstitution } = await import("./MedicalInstitution")
    const { User } = await import("./User")

    return this.findAll({
      where: {
        status: EngagementLetterStatus.SENT,
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
}

// Initialize the model
EngagementLetter.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    letterNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: "letter_number",
      validate: {
        len: [1, 20],
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
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    missionType: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(MissionType)),
      allowNull: false,
      field: "mission_type",
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(MissionType)] },
      }),
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    objectives: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    deliverables: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "start_date",
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "end_date",
    },
    estimatedHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "estimated_hours",
      validate: {
        min: 0,
      },
    },
    billingType: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(BillingType)),
      allowNull: false,
      defaultValue: BillingType.DAILY,
      field: "billing_type",
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(BillingType)] },
      }),
    },
    rate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    totalDays: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0,
      field: "total_days",
      validate: {
        min: 0,
      },
    },
    travelExpenses: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      field: "travel_expenses",
      validate: {
        min: 0,
      },
    },
    estimatedTotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "estimated_total",
      validate: {
        min: 0,
      },
    },
    vatRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 20.0,
      field: "vat_rate",
      validate: {
        min: 0,
        max: 100,
      },
    },
    showVat: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "show_vat",
    },
    status: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(EngagementLetterStatus)),
      allowNull: false,
      defaultValue: EngagementLetterStatus.DRAFT,
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(EngagementLetterStatus)] },
      }),
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "valid_until",
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sent_at",
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
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at",
    },
    termsAndConditions: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "terms_and_conditions",
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
    modelName: "EngagementLetter",
    tableName: "engagement_letters",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["letter_number"],
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
        fields: ["mission_type"],
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

export default EngagementLetter
