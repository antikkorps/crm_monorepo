import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"

export interface InstitutionAddressAttributes {
  id: string
  institutionId: string
  street: string
  city: string
  state: string
  zipCode: string
  country: string
  createdAt: Date
  updatedAt: Date
}

export interface InstitutionAddressCreationAttributes
  extends Optional<InstitutionAddressAttributes, "id" | "createdAt" | "updatedAt"> {}

export class InstitutionAddress
  extends Model<InstitutionAddressAttributes, InstitutionAddressCreationAttributes>
  implements InstitutionAddressAttributes
{
  public id!: string
  public institutionId!: string
  public street!: string
  public city!: string
  public state!: string
  public zipCode!: string
  public country!: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

InstitutionAddress.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: "institution_id",
    },
    street: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "zip_code",
    },
    country: {
      type: DataTypes.STRING,
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
    modelName: "InstitutionAddress",
    tableName: "institution_addresses",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["institution_id"], unique: true },
      { fields: ["city"] },
      { fields: ["state"] },
    ],
  }
)

export default InstitutionAddress

