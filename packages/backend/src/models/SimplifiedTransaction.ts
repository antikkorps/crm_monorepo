import {
  SimplifiedContractType,
  SimplifiedPaymentStatus,
  SimplifiedTransactionStatus,
  SimplifiedTransactionType,
  getValidStatusesForType,
} from "@medical-crm/shared"
import { Association, DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import type { MedicalInstitution } from "./MedicalInstitution"
import type { User } from "./User"

export interface SimplifiedTransactionAttributes {
  id: string
  institutionId: string
  createdById: string

  // Type of transaction
  type: SimplifiedTransactionType

  // Identification
  referenceNumber?: string
  title: string
  description?: string

  // Date of the document
  date: Date

  // Financial amounts
  amountHt: number
  vatRate: number
  amountTtc: number

  // Status
  status: SimplifiedTransactionStatus

  // Invoice-specific fields
  paymentStatus?: SimplifiedPaymentStatus
  paymentDate?: Date
  paymentAmount?: number
  dueDate?: Date

  // Contract-specific fields
  contractType?: SimplifiedContractType
  contractStartDate?: Date
  contractEndDate?: Date
  isRecurring?: boolean

  // Notes
  notes?: string

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface SimplifiedTransactionCreationAttributes
  extends Optional<
    SimplifiedTransactionAttributes,
    | "id"
    | "vatRate"
    | "referenceNumber"
    | "description"
    | "paymentStatus"
    | "paymentDate"
    | "paymentAmount"
    | "dueDate"
    | "contractType"
    | "contractStartDate"
    | "contractEndDate"
    | "isRecurring"
    | "notes"
    | "createdAt"
    | "updatedAt"
    | "deletedAt"
  > {}

export class SimplifiedTransaction
  extends Model<SimplifiedTransactionAttributes, SimplifiedTransactionCreationAttributes>
  implements SimplifiedTransactionAttributes
{
  declare id: string
  declare institutionId: string
  declare createdById: string

  // Type of transaction
  declare type: SimplifiedTransactionType

  // Identification
  declare referenceNumber?: string
  declare title: string
  declare description?: string

  // Date of the document
  declare date: Date

  // Financial amounts
  declare amountHt: number
  declare vatRate: number
  declare amountTtc: number

  // Status
  declare status: SimplifiedTransactionStatus

  // Invoice-specific fields
  declare paymentStatus?: SimplifiedPaymentStatus
  declare paymentDate?: Date
  declare paymentAmount?: number
  declare dueDate?: Date

  // Contract-specific fields
  declare contractType?: SimplifiedContractType
  declare contractStartDate?: Date
  declare contractEndDate?: Date
  declare isRecurring?: boolean

  // Notes
  declare notes?: string

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
  declare readonly deletedAt?: Date

  // Associations
  declare institution?: MedicalInstitution
  declare createdBy?: User

  public static override associations: {
    institution: Association<SimplifiedTransaction, MedicalInstitution>
    createdBy: Association<SimplifiedTransaction, User>
  }

  // Instance methods

  /**
   * Check if this transaction can be modified
   * Only draft and some sent statuses can be modified
   */
  public canBeModified(): boolean {
    const status = this.status || this.getDataValue("status")
    if (!status) {
      return false
    }
    return [
      SimplifiedTransactionStatus.DRAFT,
      SimplifiedTransactionStatus.SENT,
      SimplifiedTransactionStatus.PENDING,
    ].includes(status)
  }

  /**
   * Check if a quote/engagement letter type is expired
   */
  public isExpired(): boolean {
    const type = this.type || this.getDataValue("type")
    const status = this.status || this.getDataValue("status")

    // Only quotes and engagement letters can be expired in this sense
    if (
      type !== SimplifiedTransactionType.QUOTE &&
      type !== SimplifiedTransactionType.ENGAGEMENT_LETTER
    ) {
      return false
    }

    return status === SimplifiedTransactionStatus.EXPIRED
  }

  /**
   * Check if a contract is active
   */
  public isContractActive(): boolean {
    const type = this.type || this.getDataValue("type")
    const status = this.status || this.getDataValue("status")

    if (type !== SimplifiedTransactionType.CONTRACT) {
      return false
    }

    return status === SimplifiedTransactionStatus.ACTIVE
  }

  /**
   * Check if an invoice is overdue
   */
  public isOverdue(): boolean {
    const type = this.type || this.getDataValue("type")
    const status = this.status || this.getDataValue("status")

    if (type !== SimplifiedTransactionType.INVOICE) {
      return false
    }

    return status === SimplifiedTransactionStatus.OVERDUE
  }

  /**
   * Get the type-specific label for display
   */
  public getTypeLabel(): string {
    const type = this.type || this.getDataValue("type")
    const labels: Record<SimplifiedTransactionType, string> = {
      [SimplifiedTransactionType.QUOTE]: "Devis externe",
      [SimplifiedTransactionType.INVOICE]: "Facture externe",
      [SimplifiedTransactionType.ENGAGEMENT_LETTER]: "Lettre de mission externe",
      [SimplifiedTransactionType.CONTRACT]: "Contrat externe",
    }
    return labels[type] || "Transaction externe"
  }

  /**
   * Validate that the status is valid for the transaction type
   */
  public validateStatusForType(): boolean {
    const type = this.type || this.getDataValue("type")
    const status = this.status || this.getDataValue("status")

    if (!type || !status) {
      return false
    }

    const validStatuses = getValidStatusesForType(type)
    return validStatuses.includes(status)
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      canBeModified: this.canBeModified(),
      isExpired: this.isExpired(),
      isContractActive: this.isContractActive(),
      isOverdue: this.isOverdue(),
      typeLabel: this.getTypeLabel(),
      isExternal: true, // Always true for simplified transactions
    }
  }

  // Static methods

  /**
   * Calculate TTC amount from HT and VAT rate
   */
  public static calculateAmountTtc(amountHt: number, vatRate: number): number {
    return amountHt * (1 + vatRate / 100)
  }

  /**
   * Create a simplified transaction with calculated TTC if not provided
   */
  public static async createTransaction(
    data: SimplifiedTransactionCreationAttributes
  ): Promise<SimplifiedTransaction> {
    const vatRate = data.vatRate ?? 20
    const amountHt = Number(data.amountHt) || 0
    const amountTtc =
      data.amountTtc ?? this.calculateAmountTtc(amountHt, vatRate)

    return this.create({
      ...data,
      vatRate,
      amountTtc: Number(amountTtc.toFixed(2)),
    })
  }

  /**
   * Find all transactions for a specific institution
   */
  public static async findByInstitution(
    institutionId: string,
    options?: {
      type?: SimplifiedTransactionType
      status?: SimplifiedTransactionStatus
      dateFrom?: Date
      dateTo?: Date
    }
  ): Promise<SimplifiedTransaction[]> {
    // Dynamic import to avoid circular dependency
    const { MedicalInstitution } = await import("./MedicalInstitution")
    const { User } = await import("./User")

    const where: any = { institutionId }

    if (options?.type) {
      where.type = options.type
    }
    if (options?.status) {
      where.status = options.status
    }
    if (options?.dateFrom || options?.dateTo) {
      where.date = {}
      if (options.dateFrom) where.date[Op.gte] = options.dateFrom
      if (options.dateTo) where.date[Op.lte] = options.dateTo
    }

    return this.findAll({
      where,
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["date", "DESC"]],
    })
  }

  /**
   * Find all transactions of a specific type
   */
  public static async findByType(
    type: SimplifiedTransactionType
  ): Promise<SimplifiedTransaction[]> {
    const { MedicalInstitution } = await import("./MedicalInstitution")
    const { User } = await import("./User")

    return this.findAll({
      where: { type },
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
        {
          model: User,
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["date", "DESC"]],
    })
  }

  /**
   * Find transactions by status
   */
  public static async findByStatus(
    status: SimplifiedTransactionStatus
  ): Promise<SimplifiedTransaction[]> {
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
          as: "createdBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["date", "DESC"]],
    })
  }

  /**
   * Get statistics for simplified transactions
   */
  public static async getStatistics(institutionId?: string): Promise<{
    total: number
    byType: Record<SimplifiedTransactionType, number>
    totalAmountHt: number
    totalAmountTtc: number
  }> {
    const where: any = {}
    if (institutionId) {
      where.institutionId = institutionId
    }

    const transactions = await this.findAll({ where })

    const byType = {
      [SimplifiedTransactionType.QUOTE]: 0,
      [SimplifiedTransactionType.INVOICE]: 0,
      [SimplifiedTransactionType.ENGAGEMENT_LETTER]: 0,
      [SimplifiedTransactionType.CONTRACT]: 0,
    }

    let totalAmountHt = 0
    let totalAmountTtc = 0

    for (const tx of transactions) {
      byType[tx.type]++
      totalAmountHt += Number(tx.amountHt) || 0
      totalAmountTtc += Number(tx.amountTtc) || 0
    }

    return {
      total: transactions.length,
      byType,
      totalAmountHt,
      totalAmountTtc,
    }
  }
}

// Initialize the model
SimplifiedTransaction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    createdById: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    type: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(SimplifiedTransactionType)),
      allowNull: false,
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(SimplifiedTransactionType)] },
      }),
    },
    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "reference_number",
    },
    title: {
      type: DataTypes.STRING(255),
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amountHt: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "amount_ht",
      validate: {
        min: 0,
      },
    },
    vatRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 20.0,
      field: "vat_rate",
      validate: {
        min: 0,
        max: 100,
      },
    },
    amountTtc: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      field: "amount_ttc",
      validate: {
        min: 0,
      },
    },
    status: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(SimplifiedTransactionStatus)),
      allowNull: false,
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(SimplifiedTransactionStatus)] },
      }),
    },
    paymentStatus: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(SimplifiedPaymentStatus)),
      allowNull: true,
      field: "payment_status",
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(SimplifiedPaymentStatus)] },
      }),
    },
    paymentDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "payment_date",
    },
    paymentAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: "payment_amount",
      validate: {
        min: 0,
      },
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "due_date",
    },
    contractType: {
      type:
        process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"
          ? DataTypes.STRING
          : DataTypes.ENUM(...Object.values(SimplifiedContractType)),
      allowNull: true,
      field: "contract_type",
      ...(process.env.NODE_ENV !== "production" && {
        validate: { isIn: [Object.values(SimplifiedContractType)] },
      }),
    },
    contractStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "contract_start_date",
    },
    contractEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "contract_end_date",
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      field: "is_recurring",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at",
    },
  },
  {
    sequelize,
    modelName: "SimplifiedTransaction",
    tableName: "simplified_transactions",
    timestamps: true,
    underscored: true,
    paranoid: true, // Enables soft delete
    indexes: [
      {
        fields: ["institution_id"],
      },
      {
        fields: ["created_by_id"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["date"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["deleted_at"],
      },
      {
        fields: ["institution_id", "type", "date"],
      },
    ],
  }
)

export default SimplifiedTransaction
