import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { ReminderType } from "./QuoteReminder"
import { Team } from "./Team"
import { User } from "./User"

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface ReminderTemplateAttributes {
  id: string
  name: string
  reminderType: ReminderType
  subject: string
  body: string
  notificationTitle?: string
  notificationMessage?: string
  createTask: boolean
  taskTitleTemplate?: string
  taskPriority?: TaskPriority
  isDefault: boolean
  isActive: boolean
  teamId?: string
  institutionType?: string
  minAmount?: number
  maxAmount?: number
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface ReminderTemplateCreationAttributes
  extends Optional<
    ReminderTemplateAttributes,
    "id" | "createTask" | "isDefault" | "isActive" | "createdAt" | "updatedAt"
  > {}

export class ReminderTemplate
  extends Model<ReminderTemplateAttributes, ReminderTemplateCreationAttributes>
  implements ReminderTemplateAttributes
{
  declare id: string
  declare name: string
  declare reminderType: ReminderType
  declare subject: string
  declare body: string
  declare notificationTitle?: string
  declare notificationMessage?: string
  declare createTask: boolean
  declare taskTitleTemplate?: string
  declare taskPriority?: TaskPriority
  declare isDefault: boolean
  declare isActive: boolean
  declare teamId?: string
  declare institutionType?: string
  declare minAmount?: number
  declare maxAmount?: number
  declare createdBy?: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  public team?: Team
  public creator?: User

  /**
   * Get the most appropriate template for a quote
   * Considers team, institution type, and amount
   */
  static async getTemplateForQuote(
    reminderType: ReminderType,
    options: {
      teamId?: string
      institutionType?: string
      amount?: number
    }
  ): Promise<ReminderTemplate | null> {
    const where: any = {
      reminderType,
      isActive: true,
    }

    // Try to find the most specific match first
    const templates = await ReminderTemplate.findAll({
      where,
      order: [
        // Prioritize templates with matching criteria
        [sequelize.literal("CASE WHEN team_id IS NOT NULL THEN 1 ELSE 0 END"), "DESC"],
        [
          sequelize.literal("CASE WHEN institution_type IS NOT NULL THEN 1 ELSE 0 END"),
          "DESC",
        ],
        [
          sequelize.literal(
            "CASE WHEN min_amount IS NOT NULL OR max_amount IS NOT NULL THEN 1 ELSE 0 END"
          ),
          "DESC",
        ],
        ["isDefault", "DESC"],
        ["createdAt", "DESC"],
      ],
    })

    for (const template of templates) {
      // Check if template matches all criteria
      if (template.teamId && template.teamId !== options.teamId) continue
      if (template.institutionType && template.institutionType !== options.institutionType)
        continue
      if (
        template.minAmount !== null &&
        template.minAmount !== undefined &&
        options.amount !== undefined &&
        options.amount < template.minAmount
      )
        continue
      if (
        template.maxAmount !== null &&
        template.maxAmount !== undefined &&
        options.amount !== undefined &&
        options.amount > template.maxAmount
      )
        continue

      return template
    }

    // Fallback to default template
    return (
      ReminderTemplate.findOne({
        where: { reminderType, isDefault: true, isActive: true },
      }) || null
    )
  }

  /**
   * Replace variables in a template string
   */
  replaceVariables(
    template: string,
    variables: Record<string, any>
  ): string {
    let result = template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g")
      result = result.replace(regex, String(value ?? ""))
    })
    return result
  }

  /**
   * Get rendered content with variables replaced
   */
  render(variables: Record<string, any>): {
    subject: string
    body: string
    notificationTitle?: string
    notificationMessage?: string
    taskTitle?: string
  } {
    return {
      subject: this.replaceVariables(this.subject, variables),
      body: this.replaceVariables(this.body, variables),
      notificationTitle: this.notificationTitle
        ? this.replaceVariables(this.notificationTitle, variables)
        : undefined,
      notificationMessage: this.notificationMessage
        ? this.replaceVariables(this.notificationMessage, variables)
        : undefined,
      taskTitle: this.taskTitleTemplate
        ? this.replaceVariables(this.taskTitleTemplate, variables)
        : undefined,
    }
  }

  /**
   * Get all active templates for a reminder type
   */
  static async getActiveTemplatesForType(
    reminderType: ReminderType
  ): Promise<ReminderTemplate[]> {
    return ReminderTemplate.findAll({
      where: {
        reminderType,
        isActive: true,
      },
      order: [["isDefault", "DESC"], ["name", "ASC"]],
    })
  }
}

ReminderTemplate.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reminderType: {
      type: DataTypes.ENUM(...Object.values(ReminderType)),
      allowNull: false,
      field: "reminder_type",
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    notificationTitle: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "notification_title",
    },
    notificationMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "notification_message",
    },
    createTask: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "create_task",
    },
    taskTitleTemplate: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "task_title_template",
    },
    taskPriority: {
      type: DataTypes.ENUM(...Object.values(TaskPriority)),
      allowNull: true,
      defaultValue: TaskPriority.MEDIUM,
      field: "task_priority",
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_default",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "team_id",
    },
    institutionType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "institution_type",
    },
    minAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "min_amount",
    },
    maxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "max_amount",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "created_by",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    tableName: "reminder_templates",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["reminder_type"] },
      { fields: ["is_active"] },
      { fields: ["is_default"] },
      { fields: ["team_id"] },
      { fields: ["institution_type"] },
    ],
  }
)

// Note: Associations are defined in models/index.ts to avoid circular dependencies

export default ReminderTemplate
