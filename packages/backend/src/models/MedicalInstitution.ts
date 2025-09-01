import { InstitutionType } from "@medical-crm/shared"
import { Association, DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { ContactPerson } from "./ContactPerson"
import { MedicalProfile } from "./MedicalProfile"
import { User } from "./User"

export interface AddressAttributes {
  street: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface MedicalInstitutionAttributes {
  id: string
  name: string
  type: InstitutionType
  address: AddressAttributes
  assignedUserId?: string
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface MedicalInstitutionCreationAttributes
  extends Optional<
    MedicalInstitutionAttributes,
    "id" | "createdAt" | "updatedAt" | "tags" | "isActive"
  > {}

export class MedicalInstitution
  extends Model<MedicalInstitutionAttributes, MedicalInstitutionCreationAttributes>
  implements MedicalInstitutionAttributes
{
  public id!: string
  public name!: string
  public type!: InstitutionType
  public address!: AddressAttributes
  public assignedUserId?: string
  public tags!: string[]
  public isActive!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public medicalProfile?: MedicalProfile
  public contactPersons?: ContactPerson[]
  public assignedUser?: User

  public static override associations: {
    medicalProfile: Association<MedicalInstitution, MedicalProfile>
    contactPersons: Association<MedicalInstitution, ContactPerson>
    assignedUser: Association<MedicalInstitution, User>
  }

  // Instance methods
  public getFullAddress(): string {
    const address = this.address || this.getDataValue('address')
    const { street, city, state, zipCode, country } = address
    return `${street}, ${city}, ${state} ${zipCode}, ${country}`
  }

  public hasTag(tag: string): boolean {
    const tags = this.tags || this.getDataValue('tags')
    return tags.includes(tag.toLowerCase())
  }

  public addTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim()
    const currentTags = this.tags || this.getDataValue('tags')
    if (!this.hasTag(normalizedTag)) {
      this.tags = [...currentTags, normalizedTag]
    }
  }

  public removeTag(tag: string): void {
    const normalizedTag = tag.toLowerCase().trim()
    const currentTags = this.tags || this.getDataValue('tags')
    this.tags = currentTags.filter((t) => t !== normalizedTag)
  }

  public async getPrimaryContact(): Promise<ContactPerson | null> {
    const id = this.id || this.getDataValue('id')
    return ContactPerson.findPrimaryContact(id)
  }

  public async getActiveContacts(): Promise<ContactPerson[]> {
    const id = this.id || this.getDataValue('id')
    return ContactPerson.findByInstitution(id)
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      fullAddress: this.getFullAddress(),
    }
  }

  // Static methods
  public static async findByName(name: string): Promise<MedicalInstitution[]> {
    return this.findAll({
      where: {
        name: {
          [Op.iLike]: `%${name}%`,
        },
        isActive: true,
      },
      include: [
        {
          model: MedicalProfile,
          as: "medicalProfile",
        },
        {
          model: ContactPerson,
          as: "contactPersons",
          where: { isActive: true },
          required: false,
        },
      ],
    })
  }

  public static async findByType(type: InstitutionType): Promise<MedicalInstitution[]> {
    return this.findAll({
      where: {
        type,
        isActive: true,
      },
      include: [
        {
          model: MedicalProfile,
          as: "medicalProfile",
        },
        {
          model: ContactPerson,
          as: "contactPersons",
          where: { isActive: true },
          required: false,
        },
      ],
    })
  }

  public static async findByLocation(
    city?: string,
    state?: string
  ): Promise<MedicalInstitution[]> {
    const whereClause: any = { isActive: true }

    if (city) {
      whereClause["address.city"] = {
        [Op.iLike]: `%${city}%`,
      }
    }

    if (state) {
      whereClause["address.state"] = {
        [Op.iLike]: `%${state}%`,
      }
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: MedicalProfile,
          as: "medicalProfile",
        },
        {
          model: ContactPerson,
          as: "contactPersons",
          where: { isActive: true },
          required: false,
        },
      ],
    })
  }

  public static async findByAssignedUser(userId: string): Promise<MedicalInstitution[]> {
    return this.findAll({
      where: {
        assignedUserId: userId,
        isActive: true,
      },
      include: [
        {
          model: MedicalProfile,
          as: "medicalProfile",
        },
        {
          model: ContactPerson,
          as: "contactPersons",
          where: { isActive: true },
          required: false,
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  }

  public static async findBySpecialty(specialty: string): Promise<MedicalInstitution[]> {
    return this.findAll({
      where: { isActive: true },
      include: [
        {
          model: MedicalProfile,
          as: "medicalProfile",
          where: {
            specialties: {
              [Op.contains]: [specialty.toLowerCase()],
            },
          },
        },
        {
          model: ContactPerson,
          as: "contactPersons",
          where: { isActive: true },
          required: false,
        },
      ],
    })
  }

  public static async findByCapacityRange(
    minBeds?: number,
    maxBeds?: number,
    minSurgicalRooms?: number,
    maxSurgicalRooms?: number
  ): Promise<MedicalInstitution[]> {
    const profileWhere: any = {}

    if (minBeds !== undefined) {
      profileWhere.bedCapacity = { [Op.gte]: minBeds }
    }
    if (maxBeds !== undefined) {
      profileWhere.bedCapacity = {
        ...profileWhere.bedCapacity,
        [Op.lte]: maxBeds,
      }
    }
    if (minSurgicalRooms !== undefined) {
      profileWhere.surgicalRooms = { [Op.gte]: minSurgicalRooms }
    }
    if (maxSurgicalRooms !== undefined) {
      profileWhere.surgicalRooms = {
        ...profileWhere.surgicalRooms,
        [Op.lte]: maxSurgicalRooms,
      }
    }

    return this.findAll({
      where: { isActive: true },
      include: [
        {
          model: MedicalProfile,
          as: "medicalProfile",
          where: profileWhere,
        },
        {
          model: ContactPerson,
          as: "contactPersons",
          where: { isActive: true },
          required: false,
        },
      ],
    })
  }

  public static async searchInstitutions(filters: {
    name?: string
    type?: InstitutionType
    city?: string
    state?: string
    assignedUserId?: string
    teamMemberIds?: string[]
    specialties?: string[]
    minBedCapacity?: number
    maxBedCapacity?: number
    minSurgicalRooms?: number
    maxSurgicalRooms?: number
    tags?: string[]
  }): Promise<MedicalInstitution[]> {
    const whereClause: any = { isActive: true }
    const profileWhere: any = {}

    // Basic filters
    if (filters.name) {
      whereClause.name = {
        [Op.iLike]: `%${filters.name}%`,
      }
    }

    if (filters.type) {
      whereClause.type = filters.type
    }

    if (filters.city) {
      whereClause["address.city"] = {
        [Op.iLike]: `%${filters.city}%`,
      }
    }

    if (filters.state) {
      whereClause["address.state"] = {
        [Op.iLike]: `%${filters.state}%`,
      }
    }

    if (filters.assignedUserId) {
      whereClause.assignedUserId = filters.assignedUserId
    }

    // Team-based filtering for team admins
    if (filters.teamMemberIds && filters.teamMemberIds.length > 0) {
      whereClause[Op.or] = [
        {
          assignedUserId: {
            [Op.in]: filters.teamMemberIds,
          },
        },
        {
          assignedUserId: null, // Include unassigned institutions
        },
      ]
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClause.tags = {
        [Op.overlap]: filters.tags.map((tag) => tag.toLowerCase()),
      }
    }

    // Medical profile filters
    if (filters.specialties && filters.specialties.length > 0) {
      profileWhere.specialties = {
        [Op.overlap]: filters.specialties.map((s) => s.toLowerCase()),
      }
    }

    if (filters.minBedCapacity !== undefined) {
      profileWhere.bedCapacity = { [Op.gte]: filters.minBedCapacity }
    }
    if (filters.maxBedCapacity !== undefined) {
      profileWhere.bedCapacity = {
        ...profileWhere.bedCapacity,
        [Op.lte]: filters.maxBedCapacity,
      }
    }

    if (filters.minSurgicalRooms !== undefined) {
      profileWhere.surgicalRooms = {
        [Op.gte]: filters.minSurgicalRooms,
      }
    }
    if (filters.maxSurgicalRooms !== undefined) {
      profileWhere.surgicalRooms = {
        ...profileWhere.surgicalRooms,
        [Op.lte]: filters.maxSurgicalRooms,
      }
    }

    const includeProfile =
      Object.keys(profileWhere).length > 0
        ? {
            model: MedicalProfile,
            as: "medicalProfile",
            where: profileWhere,
          }
        : {
            model: MedicalProfile,
            as: "medicalProfile",
          }

    return this.findAll({
      where: whereClause,
      include: [
        includeProfile,
        {
          model: ContactPerson,
          as: "contactPersons",
          where: { isActive: true },
          required: false,
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    })
  }
}

// Initialize the model
MedicalInstitution.init(
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
        len: [1, 255],
        notEmpty: true,
      },
    },
    type: {
      type: process.env.NODE_ENV === "test" 
        ? DataTypes.STRING  // Use STRING in test environment to avoid ENUM issues with pg-mem
        : DataTypes.ENUM(...Object.values(InstitutionType)),
      allowNull: false,
      ...(process.env.NODE_ENV === "test" && {
        validate: {
          isIn: [Object.values(InstitutionType)],
        },
      }),
    },
    address: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidAddress(value: AddressAttributes) {
          if (!value || typeof value !== "object") {
            throw new Error("Address must be a valid object")
          }

          const required = ["street", "city", "state", "zipCode", "country"]
          for (const field of required) {
            if (
              !value[field as keyof AddressAttributes] ||
              typeof value[field as keyof AddressAttributes] !== "string" ||
              value[field as keyof AddressAttributes].trim().length === 0
            ) {
              throw new Error(
                `Address ${field} is required and must be a non-empty string`
              )
            }
          }
        },
      },
    },
    assignedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "assigned_user_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidArray(value: string[]) {
          if (!Array.isArray(value)) {
            throw new Error("Tags must be an array")
          }
          if (value.some((tag) => typeof tag !== "string" || tag.trim().length === 0)) {
            throw new Error("All tags must be non-empty strings")
          }
        },
      },
      set(value: string[]) {
        // Normalize tags to lowercase for consistency
        this.setDataValue(
          "tags",
          value.map((tag) => tag.toLowerCase().trim())
        )
      },
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
    modelName: "MedicalInstitution",
    tableName: "medical_institutions",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["name"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["assigned_user_id"],
      },
      {
        fields: ["is_active"],
      },
      {
        using: "gin",
        fields: ["address"],
      },
      {
        using: "gin",
        fields: ["tags"],
      },
      {
        fields: ["created_at"],
      },
    ],
  }
)

export default MedicalInstitution
