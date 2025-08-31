import { CallType } from "@medical-crm/shared"
import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { CollaborationValidation } from "../types/collaboration"
import { ContactPerson } from "./ContactPerson"
import { MedicalInstitution } from "./MedicalInstitution"
import { User } from "./User"

export interface CallAttributes {
  id: string
  phoneNumber: string
  duration?: number
  summary?: string
  callType: CallType
  userId: string
  institutionId?: string
  contactPersonId?: string
  createdAt: Date
  updatedAt: Date
}

export interface CallCreationAttributes
  extends Optional<CallAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Call
  extends Model<CallAttributes, CallCreationAttributes>
  implements CallAttributes
{
  declare id: string
  declare phoneNumber: string
  declare duration?: number
  declare summary?: string
  declare callType: CallType
  declare userId: string
  declare institutionId?: string
  declare contactPersonId?: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare user?: User
  declare institution?: MedicalInstitution
  declare contactPerson?: ContactPerson

  // Instance methods
  public getDurationInMinutes(): number | null {
    return this.duration ? Math.round(this.duration / 60) : null
  }

  public getDurationFormatted(): string {
    if (!this.duration) return "Unknown"

    const minutes = Math.floor(this.duration / 60)
    const seconds = this.duration % 60

    if (minutes === 0) {
      return `${seconds}s`
    } else if (seconds === 0) {
      return `${minutes}m`
    } else {
      return `${minutes}m ${seconds}s`
    }
  }

  public isIncoming(): boolean {
    return this.callType === CallType.INCOMING
  }

  public isOutgoing(): boolean {
    return this.callType === CallType.OUTGOING
  }

  public isMissed(): boolean {
    return this.callType === CallType.MISSED
  }

  public getFormattedPhoneNumber(): string {
    // Basic phone number formatting
    const cleaned = this.phoneNumber.replace(/\D/g, "")

    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    } else if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }

    return this.phoneNumber
  }

  public async linkToInstitution(): Promise<void> {
    if (this.institutionId) return // Already linked

    // Try to find institution by matching phone number with contact persons
    const contactPerson = await ContactPerson.findOne({
      where: {
        phone: this.phoneNumber,
        isActive: true,
      },
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          where: { isActive: true },
        },
      ],
    })

    if (contactPerson) {
      this.institutionId = contactPerson.institutionId
      this.contactPersonId = contactPerson.id
      await this.save()
    }
  }

  public async linkToContact(): Promise<void> {
    if (this.contactPersonId) return // Already linked

    // Try to find contact person by phone number
    const contactPerson = await ContactPerson.findOne({
      where: {
        phone: this.phoneNumber,
        isActive: true,
      },
    })

    if (contactPerson) {
      this.contactPersonId = contactPerson.id
      if (!this.institutionId) {
        this.institutionId = contactPerson.institutionId
      }
      await this.save()
    }
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      durationInMinutes: this.getDurationInMinutes(),
      durationFormatted: this.getDurationFormatted(),
      formattedPhoneNumber: this.getFormattedPhoneNumber(),
      isIncoming: this.isIncoming(),
      isOutgoing: this.isOutgoing(),
      isMissed: this.isMissed(),
    }
  }

  // Static methods
  public static async findByUser(userId: string): Promise<Call[]> {
    return this.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: ContactPerson,
          as: "contactPerson",
          attributes: ["id", "firstName", "lastName", "phone", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByInstitution(institutionId: string): Promise<Call[]> {
    return this.findAll({
      where: { institutionId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: ContactPerson,
          as: "contactPerson",
          attributes: ["id", "firstName", "lastName", "phone", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByPhoneNumber(phoneNumber: string): Promise<Call[]> {
    // Clean the phone number for comparison
    const cleanedPhone = phoneNumber.replace(/\D/g, "")

    return this.findAll({
      where: {
        [Op.or]: [
          { phoneNumber },
          { phoneNumber: cleanedPhone },
          // Try to match with different formatting
          sequelize.where(
            sequelize.fn(
              "regexp_replace",
              sequelize.col("phone_number"),
              "[^0-9]",
              "",
              "g"
            ),
            cleanedPhone
          ),
        ],
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: ContactPerson,
          as: "contactPerson",
          attributes: ["id", "firstName", "lastName", "phone", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByCallType(callType: CallType): Promise<Call[]> {
    return this.findAll({
      where: { callType },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: ContactPerson,
          as: "contactPerson",
          attributes: ["id", "firstName", "lastName", "phone", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByDateRange(startDate: Date, endDate: Date): Promise<Call[]> {
    return this.findAll({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: ContactPerson,
          as: "contactPerson",
          attributes: ["id", "firstName", "lastName", "phone", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async searchCalls(filters: {
    userId?: string
    institutionId?: string
    callType?: CallType
    phoneNumber?: string
    dateFrom?: Date
    dateTo?: Date
    search?: string
    contactPersonId?: string
  }): Promise<Call[]> {
    const whereClause: any = {}

    if (filters.userId) {
      whereClause.userId = filters.userId
    }

    if (filters.institutionId) {
      whereClause.institutionId = filters.institutionId
    }

    if (filters.callType) {
      whereClause.callType = filters.callType
    }

    if (filters.contactPersonId) {
      whereClause.contactPersonId = filters.contactPersonId
    }

    if (filters.phoneNumber) {
      const cleanedPhone = filters.phoneNumber.replace(/\D/g, "")
      whereClause[Op.or] = [
        { phoneNumber: { [Op.iLike]: `%${filters.phoneNumber}%` } },
        { phoneNumber: { [Op.iLike]: `%${cleanedPhone}%` } },
        sequelize.where(
          sequelize.fn(
            "regexp_replace",
            sequelize.col("phone_number"),
            "[^0-9]",
            "",
            "g"
          ),
          { [Op.iLike]: `%${cleanedPhone}%` }
        ),
      ]
    }

    if (filters.dateFrom) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.gte]: filters.dateFrom,
      }
    }

    if (filters.dateTo) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: filters.dateTo,
      }
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { phoneNumber: { [Op.iLike]: `%${filters.search}%` } },
        { summary: { [Op.iLike]: `%${filters.search}%` } },
      ]
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: ContactPerson,
          as: "contactPerson",
          attributes: ["id", "firstName", "lastName", "phone", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async createCallWithAutoLink(callData: {
    phoneNumber: string
    duration?: number
    summary?: string
    callType: CallType
    userId: string
    institutionId?: string
    contactPersonId?: string
  }): Promise<Call> {
    // Create the call first
    const call = await this.create(callData)

    // Try to auto-link to institution and contact if not provided
    if (!call.institutionId || !call.contactPersonId) {
      await call.linkToInstitution()
      await call.linkToContact()
    }

    // Reload with associations
    return call.reload({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: ContactPerson,
          as: "contactPerson",
          attributes: ["id", "firstName", "lastName", "phone", "email"],
        },
      ],
    })
  }

  // Validation methods
  public static validateCallData(callData: Partial<CallAttributes>): void {
    if (callData.phoneNumber !== undefined) {
      CollaborationValidation.validatePhoneNumber(callData.phoneNumber)
    }

    if (callData.duration !== undefined) {
      CollaborationValidation.validateCallDuration(callData.duration)
    }

    if (callData.summary !== undefined) {
      CollaborationValidation.validateCallSummary(callData.summary)
    }
  }
}

// Initialize the model
Call.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "phone_number",
      validate: {
        len: [7, 20],
        notEmpty: true,
        isValidPhone(value: string) {
          CollaborationValidation.validatePhoneNumber(value)
        },
      },
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 86400, // 24 hours in seconds
        isValidDuration(value?: number) {
          CollaborationValidation.validateCallDuration(value)
        },
      },
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 2000],
        isValidSummary(value?: string) {
          CollaborationValidation.validateCallSummary(value)
        },
      },
    },
    callType: {
      type: DataTypes.ENUM(...Object.values(CallType)),
      allowNull: false,
      field: "call_type",
      validate: {
        isIn: [Object.values(CallType)],
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "institution_id",
      references: {
        model: "medical_institutions",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    contactPersonId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "contact_person_id",
      references: {
        model: "contact_persons",
        key: "id",
      },
      onDelete: "SET NULL",
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
    modelName: "Call",
    tableName: "calls",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["institution_id"],
      },
      {
        fields: ["contact_person_id"],
      },
      {
        fields: ["phone_number"],
      },
      {
        fields: ["call_type"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["user_id", "call_type"],
      },
      {
        fields: ["phone_number", "created_at"],
      },
    ],
    hooks: {
      beforeValidate: (call: Call) => {
        // Validate call data
        Call.validateCallData(call)
      },
      afterCreate: async (call: Call) => {
        // Auto-link to institution and contact after creation
        if (!call.institutionId || !call.contactPersonId) {
          await call.linkToInstitution()
          await call.linkToContact()
        }
      },
    },
  }
)

export default Call
