import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { User } from "./User"
import { Team } from "./Team"
import { MedicalInstitutionSearchFilters } from "@medical-crm/shared"

export enum SegmentType {
  INSTITUTION = "institution",
  CONTACT = "contact",
}

export enum SegmentVisibility {
  PRIVATE = "private",
  TEAM = "team",
  PUBLIC = "public",
}

export interface SegmentCriteria {
  institutionFilters?: MedicalInstitutionSearchFilters
  contactFilters?: {
    role?: string[]
    department?: string[]
    title?: string[]
    isPrimary?: boolean
    hasPhone?: boolean
    hasEmail?: boolean
    activityLevel?: "high" | "medium" | "low"
    lastContactDate?: {
      from?: Date
      to?: Date
    }
  }
  combinedFilters?: {
    hasActiveContacts?: boolean
    hasMedicalProfile?: boolean
    assignedToTeam?: boolean
    createdDateRange?: {
      from?: Date
      to?: Date
    }
    updatedDateRange?: {
      from?: Date
      to?: Date
    }
  }
}

export interface SegmentAttributes {
  id: string
  name: string
  description?: string
  type: SegmentType
  criteria: SegmentCriteria
  visibility: SegmentVisibility
  ownerId: string
  teamId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SegmentCreationAttributes
  extends Optional<
    SegmentAttributes,
    "id" | "createdAt" | "updatedAt" | "isActive" | "description" | "ownerId"
  > {}

export class Segment
  extends Model<SegmentAttributes, SegmentCreationAttributes>
  implements SegmentAttributes
{
  public id!: string
  public name!: string
  public description?: string
  public type!: SegmentType
  public criteria!: SegmentCriteria
  public visibility!: SegmentVisibility
  public ownerId!: string
  public teamId?: string
  public isActive!: boolean
  public readonly createdAt!: Date
  public readonly updatedAt!: Date

  // Associations
  public owner?: User
  public team?: Team

  // Instance methods
  public isVisibleTo(userId: string, userTeamId?: string): boolean {
    if (this.ownerId === userId) return true

    switch (this.visibility) {
      case SegmentVisibility.PRIVATE:
        return false
      case SegmentVisibility.TEAM:
        return this.teamId === userTeamId
      case SegmentVisibility.PUBLIC:
        return true
      default:
        return false
    }
  }

  public canEdit(userId: string, userTeamId?: string): boolean {
    if (this.ownerId === userId) return true

    // Team admins can edit team segments
    if (this.visibility === SegmentVisibility.TEAM && this.teamId === userTeamId) {
      // TODO: Check if user is team admin
      return true
    }

    return false
  }

  public async getInstitutionCount(): Promise<number> {
    if (this.type !== SegmentType.INSTITUTION) return 0

    const { MedicalInstitution } = await import("./MedicalInstitution")
    const filters = this.criteria.institutionFilters || {}

    const institutions = await MedicalInstitution.searchInstitutions(filters)
    return institutions.length
  }

  public async getContactCount(): Promise<number> {
    if (this.type !== SegmentType.CONTACT) return 0

    const { ContactPerson } = await import("./ContactPerson")
    const { MedicalInstitution } = await import("./MedicalInstitution")

    // Build where clause for contacts
    const whereClause: any = { isActive: true }

    if (this.criteria.contactFilters) {
      const contactFilters = this.criteria.contactFilters

      if (contactFilters.role && contactFilters.role.length > 0) {
        whereClause.title = { [Op.in]: contactFilters.role }
      }

      if (contactFilters.department && contactFilters.department.length > 0) {
        whereClause.department = { [Op.in]: contactFilters.department }
      }

      if (contactFilters.isPrimary !== undefined) {
        whereClause.isPrimary = contactFilters.isPrimary
      }

      if (contactFilters.hasPhone) {
        whereClause.phone = { [Op.ne]: null }
      }

      if (contactFilters.hasEmail) {
        whereClause.email = { [Op.ne]: null }
      }
    }

    // Apply institution filters if specified
    let includeInstitution = false
    const institutionWhere: any = {}

    if (this.criteria.institutionFilters) {
      includeInstitution = true
      const instFilters = this.criteria.institutionFilters

      if (instFilters.type) {
        institutionWhere.type = instFilters.type
      }

      if (instFilters.city) {
        institutionWhere["address.city"] = { [Op.iLike]: `%${instFilters.city}%` }
      }

      if (instFilters.state) {
        institutionWhere["address.state"] = { [Op.iLike]: `%${instFilters.state}%` }
      }

      if (instFilters.assignedUserId) {
        institutionWhere.assignedUserId = instFilters.assignedUserId
      }
    }

    const include = includeInstitution
      ? [
          {
            model: MedicalInstitution,
            as: "institution",
            where: institutionWhere,
            required: true,
          },
        ]
      : []

    const contacts = await ContactPerson.findAll({
      where: whereClause,
      include,
    })

    return contacts.length
  }

  // Static methods
  public static async findVisibleToUser(
    userId: string,
    userTeamId?: string
  ): Promise<Segment[]> {
    const segments = await this.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { ownerId: userId },
          { visibility: SegmentVisibility.PUBLIC },
          {
            visibility: SegmentVisibility.TEAM,
            teamId: userTeamId,
          },
        ],
      },
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Team,
          as: "team",
          attributes: ["id", "name"],
          required: false,
        },
      ],
      order: [
        ["updatedAt", "DESC"],
        ["name", "ASC"],
      ],
    })

    return segments
  }

  public static async findByTypeAndOwner(
    type: SegmentType,
    ownerId: string
  ): Promise<Segment[]> {
    return this.findAll({
      where: {
        type,
        ownerId,
        isActive: true,
      },
      order: [["name", "ASC"]],
    })
  }

  public static async createSegment(
    data: SegmentCreationAttributes,
    userId: string
  ): Promise<Segment> {
    // Validate criteria based on type
    if (data.type === SegmentType.INSTITUTION && !data.criteria.institutionFilters) {
      throw new Error("Institution segments must have institution filters")
    }

    if (data.type === SegmentType.CONTACT && !data.criteria.contactFilters) {
      throw new Error("Contact segments must have contact filters")
    }

    return this.create({
      ...data,
      ownerId: userId,
    })
  }
}

// Initialize the model
Segment.init(
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
        len: [1, 100],
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    type: {
      type: DataTypes.ENUM(...Object.values(SegmentType)),
      allowNull: false,
    },
    criteria: {
      type: DataTypes.JSONB,
      allowNull: false,
      validate: {
        isValidCriteria(value: SegmentCriteria) {
          if (!value || typeof value !== "object") {
            throw new Error("Criteria must be a valid object")
          }
        },
      },
    },
    visibility: {
      type: DataTypes.ENUM(...Object.values(SegmentVisibility)),
      allowNull: false,
      defaultValue: SegmentVisibility.PRIVATE,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "owner_id",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "team_id",
      references: {
        model: "teams",
        key: "id",
      },
      onDelete: "SET NULL",
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
    modelName: "Segment",
    tableName: "segments",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["owner_id"],
      },
      {
        fields: ["team_id"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["visibility"],
      },
      {
        fields: ["is_active"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["updated_at"],
      },
      {
        using: "gin",
        fields: ["criteria"],
      },
    ],
  }
)

export default Segment