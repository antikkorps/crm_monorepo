import {
  CreationOptional,
  DataTypes,
  ForeignKey,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize"
import { sequelize } from "../config/database"
import { Webhook, WebhookEvent } from "./Webhook"

export enum WebhookLogStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
  RETRYING = "retrying",
}

export interface WebhookLogAttributes
  extends Model<InferAttributes<WebhookLog>, InferCreationAttributes<WebhookLog>> {
  id: CreationOptional<string>
  webhookId: ForeignKey<Webhook["id"]>
  event: WebhookEvent
  payload: Record<string, any>
  status: WebhookLogStatus
  httpStatus?: number
  responseBody?: string
  errorMessage?: string
  attemptCount: number
  maxAttempts: number
  nextRetryAt?: Date
  deliveredAt?: Date
  createdAt: CreationOptional<Date>
  updatedAt: CreationOptional<Date>
}

export class WebhookLog
  extends Model<InferAttributes<WebhookLog>, InferCreationAttributes<WebhookLog>>
  implements WebhookLogAttributes
{
  declare id: CreationOptional<string>
  declare webhookId: ForeignKey<Webhook["id"]>
  declare event: WebhookEvent
  declare payload: Record<string, any>
  declare status: WebhookLogStatus
  declare httpStatus?: number
  declare responseBody?: string
  declare errorMessage?: string
  declare attemptCount: number
  declare maxAttempts: number
  declare nextRetryAt?: Date
  declare deliveredAt?: Date
  declare createdAt: CreationOptional<Date>
  declare updatedAt: CreationOptional<Date>

  // Associations
  declare webhook?: Webhook

  /**
   * Check if this log entry can be retried
   */
  canRetry(): boolean {
    return (
      this.status === WebhookLogStatus.FAILED &&
      this.attemptCount < this.maxAttempts &&
      (!this.nextRetryAt || this.nextRetryAt <= new Date())
    )
  }

  /**
   * Mark delivery as successful
   */
  async markSuccess(httpStatus: number, responseBody?: string): Promise<void> {
    await this.update({
      status: WebhookLogStatus.SUCCESS,
      httpStatus,
      responseBody: responseBody?.substring(0, 10000), // Limit response body size
      deliveredAt: new Date(),
      errorMessage: undefined,
    })
  }

  /**
   * Mark delivery as failed and schedule retry if applicable
   */
  async markFailed(
    errorMessage: string,
    httpStatus?: number,
    responseBody?: string
  ): Promise<void> {
    const newAttemptCount = this.attemptCount + 1
    const updates: Partial<WebhookLogAttributes> = {
      attemptCount: newAttemptCount,
      httpStatus,
      responseBody: responseBody?.substring(0, 10000),
      errorMessage: errorMessage.substring(0, 1000), // Limit error message size
    }

    if (newAttemptCount >= this.maxAttempts) {
      updates.status = WebhookLogStatus.FAILED
      updates.nextRetryAt = undefined
    } else {
      updates.status = WebhookLogStatus.RETRYING
      // Exponential backoff: 5s, 25s, 125s, etc.
      const baseDelay = 5000 // 5 seconds
      const delay = baseDelay * Math.pow(5, newAttemptCount - 1)
      updates.nextRetryAt = new Date(Date.now() + delay)
    }

    await this.update(updates)
  }

  /**
   * Mark as pending retry
   */
  async markRetrying(): Promise<void> {
    await this.update({
      status: WebhookLogStatus.RETRYING,
    })
  }

  /**
   * Get formatted duration since creation
   */
  getDuration(): string {
    const now = this.deliveredAt || new Date()
    const duration = now.getTime() - this.createdAt.getTime()

    if (duration < 1000) {
      return `${duration}ms`
    } else if (duration < 60000) {
      return `${Math.round(duration / 1000)}s`
    } else {
      return `${Math.round(duration / 60000)}m`
    }
  }

  /**
   * Get logs that need to be retried
   */
  static async getRetryableLogs(): Promise<WebhookLog[]> {
    return this.findAll({
      where: {
        status: WebhookLogStatus.RETRYING,
        nextRetryAt: {
          [require("sequelize").Op.lte]: new Date(),
        },
      },
      include: [
        {
          model: Webhook,
          as: "webhook",
          where: {
            isActive: true,
            status: "active",
          },
        },
      ],
    })
  }
}

// Initialize the model
WebhookLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    webhookId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "webhooks",
        key: "id",
      },
    },
    event: {
      type: DataTypes.ENUM(...Object.values(WebhookEvent)),
      allowNull: false,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM(...Object.values(WebhookLogStatus)),
      allowNull: false,
      defaultValue: WebhookLogStatus.PENDING,
    },
    httpStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    responseBody: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      validate: {
        min: 1,
        max: 10,
      },
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: "WebhookLog",
    tableName: "webhook_logs",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["webhook_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["event"],
      },
      {
        fields: ["next_retry_at"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
)
