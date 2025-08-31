import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize"
import { sequelize } from "../config/database"
import { User } from "./User"

export enum WebhookStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DISABLED = "disabled",
}

export enum WebhookEvent {
  INSTITUTION_CREATED = "institution.created",
  INSTITUTION_UPDATED = "institution.updated",
  INSTITUTION_DELETED = "institution.deleted",
  QUOTE_CREATED = "quote.created",
  QUOTE_UPDATED = "quote.updated",
  QUOTE_ACCEPTED = "quote.accepted",
  QUOTE_REJECTED = "quote.rejected",
  INVOICE_CREATED = "invoice.created",
  INVOICE_UPDATED = "invoice.updated",
  INVOICE_PAID = "invoice.paid",
  PAYMENT_RECEIVED = "payment.received",
  TASK_CREATED = "task.created",
  TASK_UPDATED = "task.updated",
  TASK_COMPLETED = "task.completed",
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
}

export interface WebhookAttributes
  extends Model<InferAttributes<Webhook>, InferCreationAttributes<Webhook>> {
  id: CreationOptional<string>
  name: string
  url: string
  events: WebhookEvent[]
  status: WebhookStatus
  secret?: string
  headers?: Record<string, string>
  timeout: number
  maxRetries: number
  retryDelay: number
  lastTriggeredAt?: Date
  lastSuccessAt?: Date
  lastFailureAt?: Date
  failureCount: number
  isActive: boolean
  createdBy: ForeignKey<User["id"]>
  createdAt: CreationOptional<Date>
  updatedAt: CreationOptional<Date>
}

export class Webhook
  extends Model<InferAttributes<Webhook>, InferCreationAttributes<Webhook>>
  implements WebhookAttributes
{
  declare id: CreationOptional<string>
  declare name: string
  declare url: string
  declare events: WebhookEvent[]
  declare status: WebhookStatus
  declare secret?: string
  declare headers?: Record<string, string>
  declare timeout: number
  declare maxRetries: number
  declare retryDelay: number
  declare lastTriggeredAt?: Date
  declare lastSuccessAt?: Date
  declare lastFailureAt?: Date
  declare failureCount: number
  declare isActive: boolean
  declare createdBy: ForeignKey<User["id"]>
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  // Associations
  declare creator?: User

  /**
   * Check if webhook should be triggered for a specific event
   */
  shouldTrigger(event: WebhookEvent): boolean {
    return (
      this.isActive && this.status === WebhookStatus.ACTIVE && this.events.includes(event)
    )
  }

  /**
   * Update failure count and status
   */
  async recordFailure(): Promise<void> {
    const newFailureCount = this.failureCount + 1
    const updates: Partial<WebhookAttributes> = {
      failureCount: newFailureCount,
      lastFailureAt: new Date(),
    }

    // Disable webhook if it has failed too many times
    if (newFailureCount >= this.maxRetries) {
      updates.status = WebhookStatus.DISABLED
      updates.isActive = false
    }

    await this.update(updates)
  }

  /**
   * Record successful webhook delivery
   */
  async recordSuccess(): Promise<void> {
    await this.update({
      lastSuccessAt: new Date(),
      lastTriggeredAt: new Date(),
      failureCount: 0, // Reset failure count on success
    })
  }

  /**
   * Update last triggered timestamp
   */
  async recordTrigger(): Promise<void> {
    await this.update({
      lastTriggeredAt: new Date(),
    })
  }

  /**
   * Reset webhook status and failure count
   */
  async reset(): Promise<void> {
    await this.update({
      status: WebhookStatus.ACTIVE,
      isActive: true,
      failureCount: 0,
      lastFailureAt: undefined,
    })
  }

  /**
   * Validate webhook URL format
   */
  static validateUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
    } catch {
      return false
    }
  }

  /**
   * Generate webhook secret
   */
  static generateSecret(): string {
    return require("crypto").randomBytes(32).toString("hex")
  }
}

// Initialize the model
Webhook.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: true,
        customValidator(value: string) {
          if (!Webhook.validateUrl(value)) {
            throw new Error("Invalid webhook URL format")
          }
        },
      },
    },
    events: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidEvents(value: WebhookEvent[]) {
          if (!Array.isArray(value) || value.length === 0) {
            throw new Error("At least one event must be specified")
          }
          const validEvents = Object.values(WebhookEvent)
          for (const event of value) {
            if (!validEvents.includes(event)) {
              throw new Error(`Invalid webhook event: ${event}`)
            }
          }
        },
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(WebhookStatus)),
      allowNull: false,
      defaultValue: WebhookStatus.ACTIVE,
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    headers: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    timeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30000, // 30 seconds
      validate: {
        min: 1000, // Minimum 1 second
        max: 300000, // Maximum 5 minutes
      },
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 0,
        max: 10,
      },
    },
    retryDelay: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5000, // 5 seconds
      validate: {
        min: 1000, // Minimum 1 second
        max: 300000, // Maximum 5 minutes
      },
    },
    lastTriggeredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastSuccessAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastFailureAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failureCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Webhook",
    tableName: "webhooks",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["created_by"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
)
