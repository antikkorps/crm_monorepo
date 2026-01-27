import { Association, DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import type { EngagementLetter } from "./EngagementLetter"
import type { User } from "./User"

export interface EngagementLetterMemberAttributes {
  id: string
  engagementLetterId: string
  userId?: string // Nullable for external team members
  name: string
  role: string
  qualification?: string
  dailyRate: number
  estimatedDays: number
  isLead: boolean
  orderIndex: number
  createdAt: Date
  updatedAt: Date
}

export interface EngagementLetterMemberCreationAttributes
  extends Optional<
    EngagementLetterMemberAttributes,
    "id" | "isLead" | "orderIndex" | "createdAt" | "updatedAt"
  > {}

export class EngagementLetterMember
  extends Model<
    EngagementLetterMemberAttributes,
    EngagementLetterMemberCreationAttributes
  >
  implements EngagementLetterMemberAttributes
{
  declare id: string
  declare engagementLetterId: string
  declare userId?: string
  declare name: string
  declare role: string
  declare qualification?: string
  declare dailyRate: number
  declare estimatedDays: number
  declare isLead: boolean
  declare orderIndex: number

  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare engagementLetter?: EngagementLetter
  declare user?: User

  public static override associations: {
    engagementLetter: Association<EngagementLetterMember, EngagementLetter>
    user: Association<EngagementLetterMember, User>
  }

  // Instance methods
  public getSubtotal(): number {
    const dailyRate = Number(this.dailyRate) || 0
    const estimatedDays = Number(this.estimatedDays) || 0
    return dailyRate * estimatedDays
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      subtotal: this.getSubtotal(),
    }
  }

  // Static methods
  public static async findByEngagementLetter(
    engagementLetterId: string
  ): Promise<EngagementLetterMember[]> {
    const { User } = await import("./User")

    return this.findAll({
      where: { engagementLetterId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["orderIndex", "ASC"]],
    })
  }

  public static async getNextOrderIndex(
    engagementLetterId: string
  ): Promise<number> {
    const lastMember = await this.findOne({
      where: { engagementLetterId },
      order: [["orderIndex", "DESC"]],
    })

    return lastMember ? lastMember.orderIndex + 1 : 0
  }

  public static async createMember(
    data: Omit<EngagementLetterMemberCreationAttributes, "orderIndex">,
    transaction?: any
  ): Promise<EngagementLetterMember> {
    const orderIndex = await this.getNextOrderIndex(data.engagementLetterId)

    return this.create(
      {
        ...data,
        orderIndex,
        isLead: data.isLead ?? false,
      },
      { transaction }
    )
  }

  public static async reorderMembers(
    engagementLetterId: string,
    memberIds: string[],
    transaction?: any
  ): Promise<void> {
    for (let i = 0; i < memberIds.length; i++) {
      await this.update(
        { orderIndex: i },
        {
          where: {
            id: memberIds[i],
            engagementLetterId,
          },
          transaction,
        }
      )
    }
  }
}

// Initialize the model
EngagementLetterMember.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    engagementLetterId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "engagement_letter_id",
      references: {
        model: "engagement_letters",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    role: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    qualification: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dailyRate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "daily_rate",
      validate: {
        min: 0,
      },
    },
    estimatedDays: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: "estimated_days",
      validate: {
        min: 0,
      },
    },
    isLead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_lead",
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "order_index",
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
    modelName: "EngagementLetterMember",
    tableName: "engagement_letter_members",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["engagement_letter_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["is_lead"],
      },
      {
        fields: ["order_index"],
      },
    ],
  }
)

export default EngagementLetterMember
