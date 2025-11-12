import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { ReminderRule } from "./ReminderRule"
import { User } from "./User"

/**
 * Entity types that can trigger reminders
 */
export enum ReminderEntityType {
  TASK = "task",
  QUOTE = "quote",
  INVOICE = "invoice",
}

/**
 * Notification delivery types
 */
export enum ReminderNotificationType {
  IN_APP = "in_app",
  EMAIL = "email",
  BOTH = "both",
}

/**
 * Notification delivery status
 */
export enum ReminderNotificationStatus {
  SENT = "sent",
  FAILED = "failed",
  PENDING = "pending",
}

/**
 * Attributes for ReminderNotificationLog model
 */
export interface ReminderNotificationLogAttributes {
  id: string
  ruleId: string
  entityType: ReminderEntityType
  entityId: string
  recipientId: string
  notificationType: ReminderNotificationType
  status: ReminderNotificationStatus
  errorMessage?: string
  sentAt: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Creation attributes (optional fields)
 */
export interface ReminderNotificationLogCreationAttributes
  extends Optional<
    ReminderNotificationLogAttributes,
    "id" | "notificationType" | "status" | "sentAt" | "createdAt" | "updatedAt" | "errorMessage"
  > {}

/**
 * ReminderNotificationLog Model
 *
 * Persistent log of all reminder notifications sent to users.
 * Replaces the in-memory cache for anti-spam protection and provides
 * audit trail and analytics capabilities.
 *
 * Key features:
 * - Anti-spam: Check if notification sent recently for same rule+entity+recipient
 * - Audit trail: Complete history of all notifications
 * - Analytics: Success/failure rates, volume trends
 * - Debugging: Error messages and timestamps
 *
 * Usage:
 * ```typescript
 * // Check if notification was sent recently (anti-spam)
 * const recentLog = await ReminderNotificationLog.findRecentNotification(
 *   ruleId,
 *   entityType,
 *   entityId,
 *   recipientId,
 *   hours
 * )
 *
 * // Log a sent notification
 * await ReminderNotificationLog.create({
 *   ruleId,
 *   entityType,
 *   entityId,
 *   recipientId,
 *   notificationType: ReminderNotificationType.BOTH,
 *   status: ReminderNotificationStatus.SENT,
 * })
 *
 * // Clean up old logs
 * await ReminderNotificationLog.cleanupOldLogs(30) // delete logs >30 days old
 * ```
 */
export class ReminderNotificationLog
  extends Model<ReminderNotificationLogAttributes, ReminderNotificationLogCreationAttributes>
  implements ReminderNotificationLogAttributes
{
  declare id: string
  declare ruleId: string
  declare entityType: ReminderEntityType
  declare entityId: string
  declare recipientId: string
  declare notificationType: ReminderNotificationType
  declare status: ReminderNotificationStatus
  declare errorMessage: string | undefined
  declare sentAt: Date
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare rule?: ReminderRule
  declare recipient?: User

  /**
   * Check if a notification was sent recently for the same rule+entity+recipient
   * Used for anti-spam protection
   *
   * @param ruleId - Reminder rule ID
   * @param entityType - Entity type (task, quote, invoice)
   * @param entityId - Entity ID
   * @param recipientId - User ID
   * @param withinHours - Time window to check (default: 23 hours)
   * @returns Most recent log if found within time window, null otherwise
   */
  static async findRecentNotification(
    ruleId: string,
    entityType: ReminderEntityType,
    entityId: string,
    recipientId: string,
    withinHours: number = 23
  ): Promise<ReminderNotificationLog | null> {
    const cutoffTime = new Date()
    cutoffTime.setHours(cutoffTime.getHours() - withinHours)

    return this.findOne({
      where: {
        ruleId,
        entityType,
        entityId,
        recipientId,
        status: ReminderNotificationStatus.SENT,
        sentAt: {
          [Op.gte]: cutoffTime,
        },
      },
      order: [["sentAt", "DESC"]],
    })
  }

  /**
   * Log a successful notification
   *
   * @param data - Notification data
   * @returns Created log entry
   */
  static async logNotification(
    data: ReminderNotificationLogCreationAttributes
  ): Promise<ReminderNotificationLog> {
    return this.create({
      ...data,
      status: ReminderNotificationStatus.SENT,
      sentAt: new Date(),
    })
  }

  /**
   * Log a failed notification with error message
   *
   * @param data - Notification data
   * @param errorMessage - Error details
   * @returns Created log entry
   */
  static async logFailedNotification(
    data: ReminderNotificationLogCreationAttributes,
    errorMessage: string
  ): Promise<ReminderNotificationLog> {
    return this.create({
      ...data,
      status: ReminderNotificationStatus.FAILED,
      errorMessage,
      sentAt: new Date(),
    })
  }

  /**
   * Get notification history for a specific entity
   *
   * @param entityType - Entity type
   * @param entityId - Entity ID
   * @param limit - Max results (default: 50)
   * @returns Array of notification logs
   */
  static async getEntityHistory(
    entityType: ReminderEntityType,
    entityId: string,
    limit: number = 50
  ): Promise<ReminderNotificationLog[]> {
    return this.findAll({
      where: {
        entityType,
        entityId,
      },
      include: [
        {
          model: ReminderRule,
          as: "rule",
          attributes: ["id", "entityType", "triggerType", "titleTemplate"],
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["sentAt", "DESC"]],
      limit,
    })
  }

  /**
   * Get notification history for a specific user
   *
   * @param recipientId - User ID
   * @param limit - Max results (default: 50)
   * @returns Array of notification logs
   */
  static async getUserHistory(
    recipientId: string,
    limit: number = 50
  ): Promise<ReminderNotificationLog[]> {
    return this.findAll({
      where: {
        recipientId,
      },
      include: [
        {
          model: ReminderRule,
          as: "rule",
          attributes: ["id", "entityType", "triggerType", "titleTemplate"],
        },
      ],
      order: [["sentAt", "DESC"]],
      limit,
    })
  }

  /**
   * Get notification stats for a specific rule
   *
   * @param ruleId - Reminder rule ID
   * @param daysBack - Number of days to analyze (default: 30)
   * @returns Stats object
   */
  static async getRuleStats(
    ruleId: string,
    daysBack: number = 30
  ): Promise<{
    totalSent: number
    totalFailed: number
    successRate: number
    lastSent: Date | null
  }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    const [results] = (await sequelize.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
        MAX(sent_at) as last_sent
      FROM reminder_notification_logs
      WHERE rule_id = :ruleId
        AND sent_at >= :cutoffDate
    `,
      {
        replacements: { ruleId, cutoffDate },
      }
    )) as any

    const stats = results[0]
    const totalSent = Number.parseInt(stats.total_sent) || 0
    const totalFailed = Number.parseInt(stats.total_failed) || 0
    const total = totalSent + totalFailed
    const successRate = total > 0 ? (totalSent / total) * 100 : 0

    return {
      totalSent,
      totalFailed,
      successRate: Math.round(successRate * 100) / 100,
      lastSent: stats.last_sent ? new Date(stats.last_sent) : null,
    }
  }

  /**
   * Clean up old notification logs
   *
   * @param daysToKeep - Number of days to retain (default: 90)
   * @returns Number of deleted records
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await this.destroy({
      where: {
        sentAt: {
          [Op.lt]: cutoffDate,
        },
      },
    })

    return result
  }
}

// Initialize the model
ReminderNotificationLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ruleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "rule_id",
      references: {
        model: "reminder_rules",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    entityType: {
      type: DataTypes.ENUM(...Object.values(ReminderEntityType)),
      allowNull: false,
      field: "entity_type",
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "entity_id",
    },
    recipientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "recipient_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    notificationType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ReminderNotificationType.IN_APP,
      field: "notification_type",
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ReminderNotificationStatus)),
      allowNull: false,
      defaultValue: ReminderNotificationStatus.SENT,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "sent_at",
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
    modelName: "ReminderNotificationLog",
    tableName: "reminder_notification_logs",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_reminder_logs_dedup",
        fields: ["rule_id", "entity_type", "entity_id", "recipient_id"],
      },
      {
        name: "idx_reminder_logs_entity",
        fields: ["entity_type", "entity_id"],
      },
      {
        name: "idx_reminder_logs_recipient",
        fields: ["recipient_id", "sent_at"],
      },
      {
        name: "idx_reminder_logs_rule",
        fields: ["rule_id", "sent_at"],
      },
      {
        name: "idx_reminder_logs_sent_at",
        fields: ["sent_at"],
      },
      {
        name: "idx_reminder_logs_status",
        fields: ["status", "sent_at"],
      },
    ],
  }
)

export default ReminderNotificationLog
