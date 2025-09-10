import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { MedicalInstitution } from "./MedicalInstitution"

export interface ContactPersonAttributes {
  id: string
  institutionId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  title?: string
  department?: string
  isPrimary: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ContactPersonCreationAttributes
  extends Optional<
    ContactPersonAttributes,
    "id" | "createdAt" | "updatedAt" | "isActive"
  > {}

export class ContactPerson
  extends Model<ContactPersonAttributes, ContactPersonCreationAttributes>
  implements ContactPersonAttributes
{
  public id!: string
  public institutionId!: string
  public firstName!: string
  public lastName!: string
  public email!: string
  public phone?: string
  public title?: string
  public department?: string
  public isPrimary!: boolean
  public isActive!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public institution?: MedicalInstitution

  // Instance methods
  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  public getDisplayTitle(): string {
    if (this.title && this.department) {
      return `${this.title}, ${this.department}`
    }
    return this.title || this.department || "Contact Person"
  }

  public override toJSON(): Partial<ContactPersonAttributes> {
    const values = { ...this.get() } as ContactPersonAttributes
    return {
      ...values,
      fullName: this.getFullName(),
      displayTitle: this.getDisplayTitle(),
    } as any
  }

  // Static methods
  public static async findByInstitution(institutionId: string): Promise<ContactPerson[]> {
    return this.findAll({
      where: {
        institutionId,
        isActive: true,
      },
      order: [
        ["isPrimary", "DESC"],
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
    })
  }

  public static async findPrimaryContact(
    institutionId: string
  ): Promise<ContactPerson | null> {
    return this.findOne({
      where: {
        institutionId,
        isPrimary: true,
        isActive: true,
      },
    })
  }

  public static async findByEmail(email: string): Promise<ContactPerson | null> {
    return this.findOne({
      where: {
        email: email.toLowerCase(),
        isActive: true,
      },
    })
  }

  public static async setPrimaryContact(
    institutionId: string,
    contactId: string
  ): Promise<void> {
    // First, remove primary status from all contacts for this institution
    await this.update(
      { isPrimary: false },
      {
        where: {
          institutionId,
          isActive: true,
        },
      }
    )

    // Then set the specified contact as primary
    await this.update(
      { isPrimary: true },
      {
        where: {
          id: contactId,
          institutionId,
          isActive: true,
        },
      }
    )
  }
}

// Initialize the model
ContactPerson.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "institution_id",
      references: {
        model: "medical_institutions",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "first_name",
      validate: {
        len: [1, 50],
        notEmpty: true,
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "last_name",
      validate: {
        len: [1, 50],
        notEmpty: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        len: [1, 255],
      },
      set(value: string) {
        this.setDataValue("email", value.toLowerCase().trim())
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 20],
        is: /^[\+]?[1-9][\d]{0,15}$/i, // Basic international phone number format
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 100],
      },
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_primary",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
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
    modelName: "ContactPerson",
    tableName: "contact_persons",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["institution_id"],
      },
      {
        fields: ["email"],
      },
      {
        fields: ["institution_id", "is_primary"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["first_name", "last_name"],
      },
    ],
    validate: {
      // Ensure only one primary contact per institution
      async onlyOnePrimaryPerInstitution() {
        if (this.isPrimary && this.isActive) {
          const existingPrimary = await ContactPerson.findOne({
            where: {
              institutionId: this.institutionId as string,
              isPrimary: true,
              isActive: true,
              id: { [Op.ne]: this.id as string },
            },
          })

          if (existingPrimary) {
            throw new Error("Only one primary contact is allowed per institution")
          }
        }
      },
    },
  }
)

export default ContactPerson
