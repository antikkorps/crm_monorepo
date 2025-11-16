import bcrypt from "bcryptjs"
import { DataTypes, Model, Optional, Op } from "sequelize"
import { sequelize } from "../config/database"
import { AvatarService } from "../services/AvatarService"

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  TEAM_ADMIN = "team_admin",
  MANAGER = "manager",
  USER = "user",
}

export interface UserAttributes {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  role: UserRole
  teamId?: string
  avatarSeed: string
  avatarStyle: string
  isActive: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UserCreationAttributes
  extends Optional<UserAttributes, "id" | "createdAt" | "updatedAt" | "lastLoginAt"> {}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: string
  declare email: string
  declare passwordHash: string
  declare firstName: string
  declare lastName: string
  declare role: UserRole
  declare teamId?: string
  declare avatarSeed: string
  declare avatarStyle: string
  declare isActive: boolean
  declare lastLoginAt?: Date
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Instance methods
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash)
  }

  public getFullName(): string {
    return `${this.firstName} ${this.lastName}`
  }

  public getAvatarUrl(style?: string): string {
    // Return local avatar URL instead of external DiceBear URL
    return AvatarService.getLocalAvatarUrl(this.id, style || this.avatarStyle)
  }

  public getAvatarMetadata(style?: string): {
    seed: string
    url: string
    style: string
  } {
    const avatarStyle = style || this.avatarStyle
    return {
      seed: this.avatarSeed,
      url: this.getAvatarUrl(avatarStyle),
      style: avatarStyle,
    }
  }

  public async updateAvatarSeed(forceNew: boolean = false): Promise<void> {
    this.avatarSeed = AvatarService.updateUserAvatarSeed(
      this.firstName,
      this.lastName,
      forceNew
    )
    await this.save()
  }

  public async getTeam(): Promise<any | null> {
    if (!this.teamId) return null
    const { Team } = await import("./Team")
    return Team.findByPk(this.teamId)
  }

  public async assignToTeam(teamId: string): Promise<void> {
    this.teamId = teamId
    await this.save()
  }

  public async removeFromTeam(): Promise<void> {
    this.teamId = undefined
    await this.save()
  }

  public override toJSON(): Partial<UserAttributes> {
    const values = { ...this.get() } as any
    delete values.passwordHash
    // Add avatar URL for convenience
    values.avatarUrl = this.getAvatarUrl()
    return values
  }

  // Static methods
  public static async hashPassword(password: string): Promise<string> {
    // 2024+ security standard: 12 rounds minimum for bcrypt
    // Provides strong protection against brute force attacks
    // (~0.3s per hash on modern hardware)
    const saltRounds = 12
    return bcrypt.hash(password, saltRounds)
  }

  public static async findByEmail(email: string): Promise<User | null> {
    return this.findOne({
      where: { email: email.toLowerCase() },
    })
  }

  public static async createUser(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    role?: UserRole
    teamId?: string
  }): Promise<User> {
    const passwordHash = await this.hashPassword(userData.password)
    const avatarSeed = AvatarService.generateSeedFromName(
      userData.firstName,
      userData.lastName
    )

    return this.create({
      email: userData.email.toLowerCase(),
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || UserRole.USER,
      teamId: userData.teamId,
      avatarSeed,
      avatarStyle: "avataaars",
      isActive: true,
    })
  }

  public static async findByTeam(teamId: string): Promise<User[]> {
    return this.findAll({
      where: { teamId, isActive: true },
      attributes: { exclude: ["passwordHash"] },
      order: [
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
    })
  }

  public static async findWithoutTeam(): Promise<User[]> {
    return this.findAll({
      where: { teamId: { [Op.is]: null } as any },
      attributes: { exclude: ["passwordHash"] },
      order: [
        ["firstName", "ASC"],
        ["lastName", "ASC"],
      ],
    })
  }
}

// Initialize the model
User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
      set(value: string) {
        this.setDataValue("email", value.toLowerCase())
      },
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password_hash",
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "first_name",
      validate: {
        len: [1, 50],
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "last_name",
      validate: {
        len: [1, 50],
      },
    },
    role: {
      type: process.env.NODE_ENV === "test" 
        ? DataTypes.STRING  // Use STRING in test environment to avoid ENUM issues with pg-mem
        : DataTypes.ENUM(...Object.values(UserRole)),
      allowNull: false,
      defaultValue: UserRole.USER,
      ...(process.env.NODE_ENV === "test" && {
        validate: {
          isIn: [Object.values(UserRole)],
        },
      }),
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "team_id",
    },
    avatarSeed: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "avatar_seed",
    },
    avatarStyle: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "avataaars",
      field: "avatar_style",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login_at",
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
    modelName: "User",
    tableName: "users",
    timestamps: true,
    underscored: true,
    hooks: {
      /**
       * After creating a user, generate and store their avatar locally
       */
      afterCreate: async (user: User) => {
        try {
          await AvatarService.generateAndStoreAvatar(
            user.id,
            user.avatarSeed,
            user.avatarStyle
          )
        } catch (error: any) {
          // Log error but don't fail user creation if avatar generation fails
          const { logger } = await import("../utils/logger")
          logger.error("Failed to generate avatar after user creation", {
            userId: user.id,
            error: error.message,
          })
        }
      },

      /**
       * After updating a user, regenerate avatar if name or style changed
       */
      afterUpdate: async (user: User) => {
        try {
          // Check if firstName, lastName, avatarSeed, or avatarStyle changed
          const changed = user.changed()
          if (
            changed &&
            (changed.includes("firstName") ||
              changed.includes("lastName") ||
              changed.includes("avatarSeed") ||
              changed.includes("avatarStyle"))
          ) {
            await AvatarService.regenerateAvatar(
              user.id,
              user.avatarSeed,
              user.avatarStyle
            )
          }
        } catch (error: any) {
          // Log error but don't fail user update if avatar regeneration fails
          const { logger } = await import("../utils/logger")
          logger.error("Failed to regenerate avatar after user update", {
            userId: user.id,
            error: error.message,
          })
        }
      },
    },
    indexes: [
      {
        unique: true,
        fields: ["email"],
      },
      {
        fields: ["team_id"],
      },
      {
        fields: ["role"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
)

export default User
