import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { User } from "./User"

export interface ReminderRuleAttributes {
  id: string
  entityType: "task" | "quote" | "invoice"
  triggerType: "due_soon" | "overdue" | "expired" | "unpaid"
  daysBefore: number
  daysAfter: number
  priority: "low" | "medium" | "high" | "urgent"
  isActive: boolean
  titleTemplate: string
  messageTemplate: string
  actionUrlTemplate: string
  actionTextTemplate: string
  autoCreateTask: boolean
  taskTitleTemplate?: string
  taskPriority: "low" | "medium" | "high" | "urgent"
  teamId?: string
  createdBy: string
  updatedBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export interface ReminderRuleCreationAttributes
  extends Optional<ReminderRuleAttributes, "id" | "createdAt" | "updatedAt"> {}

export class ReminderRule
  extends Model<ReminderRuleAttributes, ReminderRuleCreationAttributes>
  implements ReminderRuleAttributes
{
  public id!: string
  public entityType!: "task" | "quote" | "invoice"
  public triggerType!: "due_soon" | "overdue" | "expired" | "unpaid"
  public daysBefore!: number
  public daysAfter!: number
  public priority!: "low" | "medium" | "high" | "urgent"
  public isActive!: boolean
  public titleTemplate!: string
  public messageTemplate!: string
  public actionUrlTemplate!: string
  public actionTextTemplate!: string
  public autoCreateTask!: boolean
  public taskTitleTemplate?: string
  public taskPriority!: "low" | "medium" | "high" | "urgent"
  public teamId?: string
  public createdBy!: string
  public updatedBy?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Helper methods
  public shouldTrigger(dueDate: Date, currentDate: Date = new Date()): boolean {
    const diffTime = dueDate.getTime() - currentDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    switch (this.triggerType) {
      case "due_soon":
        return diffDays >= 0 && diffDays <= this.daysBefore
      case "overdue":
        return diffDays < 0 && Math.abs(diffDays) >= this.daysAfter
      case "expired":
        return diffDays < 0 && Math.abs(diffDays) >= this.daysAfter
      case "unpaid":
        return diffDays < 0 && Math.abs(diffDays) >= this.daysAfter
      default:
        return false
    }
  }

  public getTriggerDays(dueDate: Date, currentDate: Date = new Date()): number {
    const diffTime = dueDate.getTime() - currentDate.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  public formatMessage(data: {
    title?: string
    quoteNumber?: string
    invoiceNumber?: string
    dueDate?: Date
    validUntil?: Date
    institution?: { name?: string }
    institutionName?: string
    assignee?: { name?: string }
    assigneeName?: string
    totalAmount?: number
    amount?: number
  }): string {
    const safeTitle = data.title || data.quoteNumber || data.invoiceNumber || ""
    const safeDate = data.dueDate || data.validUntil
    const safeInstitutionName = data.institution?.name || data.institutionName || ""
    const safeAssigneeName = data.assignee?.name || data.assigneeName || ""
    const safeAmount = data.totalAmount || data.amount || ""

    return this.messageTemplate
      .replace(/\{title\}/g, safeTitle)
      .replace(/\{entityType\}/g, this.entityType)
      .replace(/\{days\}/g, safeDate ? Math.abs(this.getTriggerDays(safeDate)).toString() : "0")
      .replace(/\{institutionName\}/g, safeInstitutionName)
      .replace(/\{assigneeName\}/g, safeAssigneeName)
      .replace(/\{amount\}/g, safeAmount.toString())
  }

  public formatTitle(data: {
    title?: string
    quoteNumber?: string
    invoiceNumber?: string
    dueDate?: Date
    validUntil?: Date
  }): string {
    const safeTitle = data.title || data.quoteNumber || data.invoiceNumber || ""
    const safeDate = data.dueDate || data.validUntil

    return this.titleTemplate
      .replace(/\{title\}/g, safeTitle)
      .replace(/\{entityType\}/g, this.entityType)
      .replace(/\{days\}/g, safeDate ? Math.abs(this.getTriggerDays(safeDate)).toString() : "0")
  }

  public formatActionUrl(data: { id: string }): string {
    return this.actionUrlTemplate
      .replace(/\{id\}/g, data.id)
      .replace(/\{entityType\}/g, this.entityType)
  }

  public formatTaskTitle(data: {
    title?: string
    quoteNumber?: string
    invoiceNumber?: string
    institution?: { name?: string }
    institutionName?: string
  }): string {
    if (!this.taskTitleTemplate) return ""
    
    const safeTitle = data.title || data.quoteNumber || data.invoiceNumber || ""
    const safeInstitutionName = data.institution?.name || data.institutionName || ""

    return this.taskTitleTemplate
      .replace(/\{title\}/g, safeTitle)
      .replace(/\{entityType\}/g, this.entityType)
      .replace(/\{institutionName\}/g, safeInstitutionName)
  }

  public formatActionText(data: {
    title?: string
    quoteNumber?: string
    invoiceNumber?: string
  }): string {
    const safeTitle = data.title || data.quoteNumber || data.invoiceNumber || ""
    
    return this.actionTextTemplate
      .replace(/\{entityType\}/g, this.entityType)
      .replace(/\{title\}/g, safeTitle)
  }
}

ReminderRule.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "id",
    },
    entityType: {
      type: DataTypes.ENUM("task", "quote", "invoice"),
      allowNull: false,
      field: "entity_type",
    },
    triggerType: {
      type: DataTypes.ENUM("due_soon", "overdue", "expired", "unpaid"),
      allowNull: false,
      field: "trigger_type",
    },
    daysBefore: {
      type: DataTypes.INTEGER,
      defaultValue: 7,
      comment: "Days before due date to trigger for 'due_soon' type",
      field: "days_before",
    },
    daysAfter: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: "Days after due date to trigger for 'overdue' type",
      field: "days_after",
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
      allowNull: false,
      field: "priority",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: "is_active",
    },
    titleTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "{entityType} Reminder",
      field: "title_template",
    },
    messageTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "Your {entityType} '{title}' needs attention.",
      field: "message_template",
    },
    actionUrlTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "/{entityType}s/{id}",
      field: "action_url_template",
    },
    actionTextTemplate: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "View {entityType}",
      field: "action_text_template",
    },
    autoCreateTask: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      field: "auto_create_task",
    },
    taskTitleTemplate: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Template for auto-generated task title",
      field: "task_title_template",
    },
    taskPriority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
      allowNull: false,
      field: "task_priority",
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "team_id",
      references: {
        model: "teams",
        key: "id",
      },
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "created_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "updated_by",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "ReminderRule",
    tableName: "reminder_rules",
    timestamps: true,
    indexes: [
      {
        fields: ["entity_type", "trigger_type", "is_active"],
      },
      {
        fields: ["team_id"],
      },
      {
        fields: ["created_by"],
      },
    ],
  }
)

// Note: Associations are defined in models/index.ts to avoid circular dependencies

export default ReminderRule