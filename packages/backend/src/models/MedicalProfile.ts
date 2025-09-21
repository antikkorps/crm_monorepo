import { ComplianceStatus } from "@medical-crm/shared"
import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"

export interface MedicalProfileAttributes {
  id: string
  institutionId: string
  bedCapacity?: number
  surgicalRooms?: number
  specialties: string[]
  departments: string[]
  equipmentTypes: string[]
  certifications: string[]
  complianceStatus: ComplianceStatus
  lastAuditDate?: Date
  complianceExpirationDate?: Date
  complianceNotes?: string
  createdAt: Date
  updatedAt: Date
}

export interface MedicalProfileCreationAttributes
  extends Optional<MedicalProfileAttributes, "id" | "createdAt" | "updatedAt"> {}

export class MedicalProfile
  extends Model<MedicalProfileAttributes, MedicalProfileCreationAttributes>
  implements MedicalProfileAttributes
{
  declare id: string
  declare institutionId: string
  declare bedCapacity?: number
  declare surgicalRooms?: number
  declare specialties: string[]
  declare departments: string[]
  declare equipmentTypes: string[]
  declare certifications: string[]
  declare complianceStatus: ComplianceStatus
  declare lastAuditDate?: Date
  declare complianceExpirationDate?: Date
  declare complianceNotes?: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Instance methods
  public isCompliant(): boolean {
    return this.complianceStatus === ComplianceStatus.COMPLIANT
  }

  public isComplianceExpired(): boolean {
    if (!this.complianceExpirationDate) return false
    return new Date() > this.complianceExpirationDate
  }

  public hasSpecialty(specialty: string): boolean {
    return this.specialties.includes(specialty.toLowerCase())
  }

  public hasDepartment(department: string): boolean {
    return this.departments.includes(department.toLowerCase())
  }

  public hasEquipmentType(equipmentType: string): boolean {
    return this.equipmentTypes.includes(equipmentType.toLowerCase())
  }

  // Static methods
  public static async findByInstitution(
    institutionId: string
  ): Promise<MedicalProfile | null> {
    return this.findOne({
      where: { institutionId },
    })
  }

  public static async findByCompliance(
    status: ComplianceStatus
  ): Promise<MedicalProfile[]> {
    return this.findAll({
      where: { complianceStatus: status },
    })
  }

  public static async findExpiredCompliance(): Promise<MedicalProfile[]> {
    return this.findAll({
      where: {
        complianceExpirationDate: {
          [Op.lt]: new Date(),
        },
      },
    })
  }
}

// Initialize the model
MedicalProfile.init(
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
    bedCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "bed_capacity",
      validate: {
        min: 0,
        max: 10000,
      },
    },
    surgicalRooms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "surgical_rooms",
      validate: {
        min: 0,
        max: 1000,
      },
    },
    specialties: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidArray(value: string[]) {
          if (!Array.isArray(value)) {
            throw new Error("Specialties must be an array")
          }
          if (
            value.some(
              (specialty) =>
                typeof specialty !== "string" || specialty.trim().length === 0
            )
          ) {
            throw new Error("All specialties must be non-empty strings")
          }
        },
      },
      set(value: string[]) {
        // Normalize specialties to lowercase for consistency
        this.setDataValue(
          "specialties",
          value.map((s) => s.toLowerCase().trim())
        )
      },
    },
    departments: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidArray(value: string[]) {
          if (!Array.isArray(value)) {
            throw new Error("Departments must be an array")
          }
          if (
            value.some((dept) => typeof dept !== "string" || dept.trim().length === 0)
          ) {
            throw new Error("All departments must be non-empty strings")
          }
        },
      },
      set(value: string[]) {
        // Normalize departments to lowercase for consistency
        this.setDataValue(
          "departments",
          value.map((d) => d.toLowerCase().trim())
        )
      },
    },
    equipmentTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      field: "equipment_types",
      validate: {
        isValidArray(value: string[]) {
          if (!Array.isArray(value)) {
            throw new Error("Equipment types must be an array")
          }
          if (value.some((eq) => typeof eq !== "string" || eq.trim().length === 0)) {
            throw new Error("All equipment types must be non-empty strings")
          }
        },
      },
      set(value: string[]) {
        // Normalize equipment types to lowercase for consistency
        this.setDataValue(
          "equipmentTypes",
          value.map((e) => e.toLowerCase().trim())
        )
      },
    },
    certifications: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidArray(value: string[]) {
          if (!Array.isArray(value)) {
            throw new Error("Certifications must be an array")
          }
          if (
            value.some((cert) => typeof cert !== "string" || cert.trim().length === 0)
          ) {
            throw new Error("All certifications must be non-empty strings")
          }
        },
      },
    },
    complianceStatus: {
      type: process.env.NODE_ENV === "test" 
        ? DataTypes.STRING  // Use STRING in test environment to avoid ENUM issues with pg-mem
        : DataTypes.ENUM(...Object.values(ComplianceStatus)),
      allowNull: false,
      defaultValue: ComplianceStatus.PENDING_REVIEW,
      field: "compliance_status",
      ...(process.env.NODE_ENV === "test" && {
        validate: {
          isIn: [Object.values(ComplianceStatus)],
        },
      }),
    },
    lastAuditDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_audit_date",
    },
    complianceExpirationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "compliance_expiration_date",
    },
    complianceNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "compliance_notes",
      validate: {
        len: [0, 2000],
      },
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
    modelName: "MedicalProfile",
    tableName: "medical_profiles",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["institution_id"],
      },
      {
        fields: ["compliance_status"],
      },
      {
        fields: ["bed_capacity"],
      },
      {
        fields: ["surgical_rooms"],
      },
      {
        fields: ["compliance_expiration_date"],
      },
      {
        using: "gin",
        fields: ["specialties"],
      },
      {
        using: "gin",
        fields: ["departments"],
      },
      {
        using: "gin",
        fields: ["equipment_types"],
      },
    ],
  }
)

export default MedicalProfile
