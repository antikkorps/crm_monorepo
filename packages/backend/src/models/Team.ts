import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"

export interface TeamAttributes {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TeamCreationAttributes
  extends Optional<TeamAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Team
  extends Model<TeamAttributes, TeamCreationAttributes>
  implements TeamAttributes
{
  declare id: string
  declare name: string
  declare description?: string
  declare isActive: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Instance methods
  public async getMemberCount(): Promise<number> {
    const { User } = await import("./User")
    return User.count({
      where: { teamId: this.id, isActive: true },
    })
  }

  public async getMembers(): Promise<any[]> {
    const { User } = await import("./User")
    const users = await User.findAll({
      where: { teamId: this.id },
      attributes: { exclude: ["passwordHash"] },
      order: [
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
    })
    // Apply toJSON() to each user to include avatarUrl
    return users.map(user => user.toJSON())
  }

  public async getActiveMembers(): Promise<any[]> {
    const { User } = await import("./User")
    const users = await User.findAll({
      where: { teamId: this.id, isActive: true },
      attributes: { exclude: ["passwordHash"] },
      order: [
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
    })
    // Apply toJSON() to each user to include avatarUrl
    return users.map(user => user.toJSON())
  }

  // Static methods
  public static async createTeam(teamData: {
    name: string
    description?: string
  }): Promise<Team> {
    return this.create({
      name: teamData.name,
      description: teamData.description,
      isActive: true,
    })
  }

  public static async findByName(name: string): Promise<Team | null> {
    return this.findOne({
      where: { name },
    })
  }

  public static async getActiveTeams(): Promise<Team[]> {
    return this.findAll({
      where: { isActive: true },
      order: [["name", "ASC"]],
    })
  }
}

// Initialize the model
Team.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 100],
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
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
    modelName: "Team",
    tableName: "teams",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["name"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
)

export default Team
