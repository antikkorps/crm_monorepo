import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { Quote } from "./Quote"
import { User } from "./User"

export enum ReminderType {
  SEVEN_DAYS_BEFORE = "7_days_before",
  THREE_DAYS_BEFORE = "3_days_before",
  DAY_OF = "day_of",
  AFTER_EXPIRY = "after_expiry",
}

export enum ReminderAction {
  EMAIL_SENT = "email_sent",
  NOTIFICATION_CREATED = "notification_created",
  TASK_CREATED = "task_created",
  NO_ACTION = "no_action",
}

export interface QuoteReminderAttributes {
  id: string
  quoteId: string
  reminderType: ReminderType
  sentAt: Date
  sentByUserId?: string
  recipientEmail?: string
  message?: string
  actionTaken: ReminderAction
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface QuoteReminderCreationAttributes
  extends Optional<
    QuoteReminderAttributes,
    "id" | "sentAt" | "actionTaken" | "createdAt" | "updatedAt"
  > {}

export class QuoteReminder
  extends Model<QuoteReminderAttributes, QuoteReminderCreationAttributes>
  implements QuoteReminderAttributes
{
  declare id: string
  declare quoteId: string
  declare reminderType: ReminderType
  declare sentAt: Date
  declare sentByUserId?: string
  declare recipientEmail?: string
  declare message?: string
  declare actionTaken: ReminderAction
  declare metadata?: Record<string, any>
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  public quote?: Quote
  public sentBy?: User

  /**
   * Check if a reminder of a specific type has already been sent for a quote
   */
  static async hasBeenSent(
    quoteId: string,
    reminderType: ReminderType
  ): Promise<boolean> {
    const count = await QuoteReminder.count({
      where: {
        quoteId,
        reminderType,
      },
    })
    return count > 0
  }

  /**
   * Get all reminders for a quote
   */
  static async getForQuote(quoteId: string): Promise<QuoteReminder[]> {
    return QuoteReminder.findAll({
      where: { quoteId },
      order: [["sentAt", "DESC"]],
      include: [
        {
          model: User,
          as: "sentBy",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  }

  /**
   * Get statistics about reminders sent
   */
  static async getStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalSent: number
    byType: Record<ReminderType, number>
    byAction: Record<ReminderAction, number>
    emailsSent: number
    tasksCreated: number
  }> {
    const where: any = {}
    if (startDate) {
      where.sentAt = { ...where.sentAt, $gte: startDate }
    }
    if (endDate) {
      where.sentAt = { ...where.sentAt, $lte: endDate }
    }

    const reminders = await QuoteReminder.findAll({ where })

    const stats = {
      totalSent: reminders.length,
      byType: {
        [ReminderType.SEVEN_DAYS_BEFORE]: 0,
        [ReminderType.THREE_DAYS_BEFORE]: 0,
        [ReminderType.DAY_OF]: 0,
        [ReminderType.AFTER_EXPIRY]: 0,
      },
      byAction: {
        [ReminderAction.EMAIL_SENT]: 0,
        [ReminderAction.NOTIFICATION_CREATED]: 0,
        [ReminderAction.TASK_CREATED]: 0,
        [ReminderAction.NO_ACTION]: 0,
      },
      emailsSent: 0,
      tasksCreated: 0,
    }

    reminders.forEach((reminder) => {
      stats.byType[reminder.reminderType]++
      stats.byAction[reminder.actionTaken]++
      if (reminder.actionTaken === ReminderAction.EMAIL_SENT) {
        stats.emailsSent++
      }
      if (reminder.actionTaken === ReminderAction.TASK_CREATED) {
        stats.tasksCreated++
      }
    })

    return stats
  }
}

QuoteReminder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quoteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "quote_id",
    },
    reminderType: {
      type: DataTypes.ENUM(
        ...Object.values(ReminderType)
      ),
      allowNull: false,
      field: "reminder_type",
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "sent_at",
    },
    sentByUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "sent_by_user_id",
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "recipient_email",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    actionTaken: {
      type: DataTypes.ENUM(...Object.values(ReminderAction)),
      allowNull: false,
      defaultValue: ReminderAction.NOTIFICATION_CREATED,
      field: "action_taken",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    tableName: "quote_reminders",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["quote_id"] },
      { fields: ["sent_at"] },
      { fields: ["reminder_type"] },
      { fields: ["quote_id", "reminder_type"] },
    ],
  }
)

// Note: Associations are defined in models/index.ts to avoid circular dependencies

export default QuoteReminder
