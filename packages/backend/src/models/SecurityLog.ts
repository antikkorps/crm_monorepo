import { DataTypes, Model, Optional, Op } from "sequelize"
import { sequelize } from "../config/database"

export enum SecurityLogAction {
  AUTH_LOGIN = "auth.login",
  AUTH_LOGOUT = "auth.logout",
  AUTH_FAILED = "auth.failed",
  AUTH_TOKEN_REFRESH = "auth.token_refresh",
  DATA_READ = "data.read",
  DATA_CREATE = "data.create",
  DATA_UPDATE = "data.update",
  DATA_DELETE = "data.delete",
  DATA_EXPORT = "data.export",
  PERMISSION_DENIED = "permission.denied",
}

export enum SecurityLogResource {
  USER = "user",
  INSTITUTION = "institution",
  INVOICE = "invoice",
  QUOTE = "quote",
  PAYMENT = "payment",
  DOCUMENT_TEMPLATE = "document_template",
  CATALOG_ITEM = "catalog_item",
  TASK = "task",
  MEETING = "meeting",
  NOTE = "note",
  CONTACT_PERSON = "contact_person",
  WEBHOOK = "webhook",
  TEAM = "team",
  SEGMENT = "segment",
}

export enum SecurityLogStatus {
  SUCCESS = "success",
  FAILURE = "failure",
}

export enum SecurityLogSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface SecurityLogAttributes {
  id: string
  userId?: string
  action: SecurityLogAction
  resource: SecurityLogResource
  resourceId?: string
  ipAddress: string
  userAgent: string
  status: SecurityLogStatus
  severity: SecurityLogSeverity
  details?: string
  createdAt: Date
}

export interface SecurityLogCreationAttributes
  extends Optional<SecurityLogAttributes, "id" | "createdAt"> {}

export class SecurityLog
  extends Model<SecurityLogAttributes, SecurityLogCreationAttributes>
  implements SecurityLogAttributes
{
  declare id: string
  declare userId?: string
  declare action: SecurityLogAction
  declare resource: SecurityLogResource
  declare resourceId?: string
  declare ipAddress: string
  declare userAgent: string
  declare status: SecurityLogStatus
  declare severity: SecurityLogSeverity
  declare details?: string
  declare readonly createdAt: Date

  // Static method to determine severity based on action
  public static getSeverityForAction(
    action: SecurityLogAction,
    status: SecurityLogStatus
  ): SecurityLogSeverity {
    // Critical: Failed authentication attempts
    if (action === SecurityLogAction.AUTH_FAILED) {
      return SecurityLogSeverity.CRITICAL
    }

    // High: Permission denied, data deletion
    if (
      action === SecurityLogAction.PERMISSION_DENIED ||
      action === SecurityLogAction.DATA_DELETE
    ) {
      return SecurityLogSeverity.HIGH
    }

    // Medium: Data modifications, exports
    if (
      action === SecurityLogAction.DATA_CREATE ||
      action === SecurityLogAction.DATA_UPDATE ||
      action === SecurityLogAction.DATA_EXPORT
    ) {
      return SecurityLogSeverity.MEDIUM
    }

    // Low: everything else
    return SecurityLogSeverity.LOW
  }

  // Static method to log a security event
  public static async logEvent(data: {
    userId?: string
    action: SecurityLogAction
    resource: SecurityLogResource
    resourceId?: string
    ipAddress: string
    userAgent: string
    status: SecurityLogStatus
    details?: string
  }): Promise<SecurityLog> {
    const severity = this.getSeverityForAction(data.action, data.status)

    return this.create({
      ...data,
      severity,
    })
  }

  // Static method to clean up old logs
  public static async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await this.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
        // Keep critical logs longer (365 days)
        severity: {
          [Op.notIn]: [SecurityLogSeverity.CRITICAL, SecurityLogSeverity.HIGH],
        },
      },
    })

    return result
  }

  // Static method to clean up critical logs (1 year retention)
  public static async cleanupCriticalLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const result = await this.destroy({
      where: {
        createdAt: {
          [Op.lt]: cutoffDate,
        },
        severity: {
          [Op.in]: [SecurityLogSeverity.CRITICAL, SecurityLogSeverity.HIGH],
        },
      },
    })

    return result
  }
}

// Initialize the model
SecurityLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    action: {
      type: process.env.NODE_ENV === "test"
        ? DataTypes.STRING
        : DataTypes.ENUM(...Object.values(SecurityLogAction)),
      allowNull: false,
      ...(process.env.NODE_ENV === "test" && {
        validate: {
          isIn: [Object.values(SecurityLogAction)],
        },
      }),
    },
    resource: {
      type: process.env.NODE_ENV === "test"
        ? DataTypes.STRING
        : DataTypes.ENUM(...Object.values(SecurityLogResource)),
      allowNull: false,
      ...(process.env.NODE_ENV === "test" && {
        validate: {
          isIn: [Object.values(SecurityLogResource)],
        },
      }),
    },
    resourceId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "resource_id",
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "ip_address",
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "user_agent",
    },
    status: {
      type: process.env.NODE_ENV === "test"
        ? DataTypes.STRING
        : DataTypes.ENUM(...Object.values(SecurityLogStatus)),
      allowNull: false,
      ...(process.env.NODE_ENV === "test" && {
        validate: {
          isIn: [Object.values(SecurityLogStatus)],
        },
      }),
    },
    severity: {
      type: process.env.NODE_ENV === "test"
        ? DataTypes.STRING
        : DataTypes.ENUM(...Object.values(SecurityLogSeverity)),
      allowNull: false,
      ...(process.env.NODE_ENV === "test" && {
        validate: {
          isIn: [Object.values(SecurityLogSeverity)],
        },
      }),
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    modelName: "SecurityLog",
    tableName: "security_logs",
    timestamps: true,
    updatedAt: false, // Security logs should never be updated
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["action"],
      },
      {
        fields: ["resource", "resource_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["severity"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["ip_address"],
      },
    ],
  }
)

export default SecurityLog
