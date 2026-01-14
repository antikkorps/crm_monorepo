import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"

export interface PasswordResetTokenAttributes {
  id: string
  userId: string
  code: string
  expiresAt: Date
  used: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PasswordResetTokenCreationAttributes
  extends Optional<PasswordResetTokenAttributes, "id" | "used" | "createdAt" | "updatedAt"> {}

export class PasswordResetToken
  extends Model<PasswordResetTokenAttributes, PasswordResetTokenCreationAttributes>
  implements PasswordResetTokenAttributes
{
  declare id: string
  declare userId: string
  declare code: string
  declare expiresAt: Date
  declare used: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}

// Initialize the model
PasswordResetToken.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    code: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    modelName: "PasswordResetToken",
    tableName: "password_reset_tokens",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["code"],
      },
      {
        fields: ["expires_at"],
      },
      {
        fields: ["used"],
      },
    ],
  }
)

export default PasswordResetToken
