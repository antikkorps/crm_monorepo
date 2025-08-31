import { SharePermission } from "@medical-crm/shared"
import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { User } from "./User"

export interface NoteShareAttributes {
  id: string
  noteId: string
  userId: string
  permission: SharePermission
  createdAt: Date
}

export interface NoteShareCreationAttributes
  extends Optional<NoteShareAttributes, "id" | "createdAt"> {}

export class NoteShare
  extends Model<NoteShareAttributes, NoteShareCreationAttributes>
  implements NoteShareAttributes
{
  declare id: string
  declare noteId: string
  declare userId: string
  declare permission: SharePermission
  declare readonly createdAt: Date

  // Associations
  declare user?: User
  declare note?: any // Note type - avoiding circular import

  // Instance methods
  public async updatePermission(newPermission: SharePermission): Promise<void> {
    this.permission = newPermission
    await this.save()
  }

  public hasReadPermission(): boolean {
    return (
      this.permission === SharePermission.READ ||
      this.permission === SharePermission.WRITE
    )
  }

  public hasWritePermission(): boolean {
    return this.permission === SharePermission.WRITE
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return values
  }

  // Static methods
  public static async findByNote(noteId: string): Promise<NoteShare[]> {
    return this.findAll({
      where: { noteId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "ASC"]],
    })
  }

  public static async findByUser(userId: string): Promise<NoteShare[]> {
    return this.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByNoteAndUser(
    noteId: string,
    userId: string
  ): Promise<NoteShare | null> {
    return this.findOne({
      where: { noteId, userId },
    })
  }

  public static async shareNoteWithUsers(
    noteId: string,
    shares: Array<{ userId: string; permission: SharePermission }>
  ): Promise<NoteShare[]> {
    const createdShares: NoteShare[] = []

    for (const share of shares) {
      // Check if share already exists
      const existingShare = await this.findByNoteAndUser(noteId, share.userId)

      if (existingShare) {
        // Update existing share
        await existingShare.updatePermission(share.permission)
        createdShares.push(existingShare)
      } else {
        // Create new share
        const newShare = await this.create({
          noteId,
          userId: share.userId,
          permission: share.permission,
        })
        createdShares.push(newShare)
      }
    }

    return createdShares
  }

  public static async removeNoteShares(
    noteId: string,
    userIds: string[]
  ): Promise<number> {
    return this.destroy({
      where: {
        noteId,
        userId: userIds,
      },
    })
  }

  public static async getUsersWithAccess(noteId: string): Promise<
    Array<{
      user: User
      permission: SharePermission
      sharedAt: Date
    }>
  > {
    const shares = await this.findAll({
      where: { noteId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "ASC"]],
    })

    return shares.map((share) => ({
      user: share.user!,
      permission: share.permission,
      sharedAt: share.createdAt,
    }))
  }

  public static async getNotesSharedWithUser(userId: string): Promise<string[]> {
    const shares = await this.findAll({
      where: { userId },
      attributes: ["noteId"],
    })

    return shares.map((share) => share.noteId)
  }

  // Validation methods
  public static validateSharePermission(permission: string): void {
    if (!Object.values(SharePermission).includes(permission as SharePermission)) {
      throw new Error(`Invalid share permission: ${permission}`)
    }
  }

  public static async validateNoteExists(noteId: string): Promise<void> {
    const { Note } = await import("./Note")
    const note = await Note.findByPk(noteId)
    if (!note) {
      throw new Error(`Note with id ${noteId} does not exist`)
    }
  }

  public static async validateUserExists(userId: string): Promise<void> {
    const user = await User.findByPk(userId)
    if (!user) {
      throw new Error(`User with id ${userId} does not exist`)
    }
  }

  public static async validateShareCreation(
    noteId: string,
    userId: string,
    creatorId: string
  ): Promise<void> {
    // Cannot share with the creator (they already have access)
    if (userId === creatorId) {
      throw new Error("Cannot share note with its creator")
    }

    // Validate note and user exist
    await this.validateNoteExists(noteId)
    await this.validateUserExists(userId)
  }
}

// Initialize the model
NoteShare.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    noteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "note_id",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
    },
    permission: {
      type: DataTypes.ENUM(...Object.values(SharePermission)),
      allowNull: false,
      defaultValue: SharePermission.READ,
      validate: {
        isIn: [Object.values(SharePermission)],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
    },
  },
  {
    sequelize,
    modelName: "NoteShare",
    tableName: "note_shares",
    timestamps: false, // Only createdAt, no updatedAt
    underscored: true,
    indexes: [
      {
        fields: ["note_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        unique: true,
        fields: ["note_id", "user_id"],
        name: "note_shares_note_user_unique",
      },
      {
        fields: ["note_id", "permission"],
      },
    ],
    hooks: {
      beforeValidate: async (noteShare: NoteShare) => {
        // Validate permission
        NoteShare.validateSharePermission(noteShare.permission)
      },
      beforeCreate: async (noteShare: NoteShare) => {
        // Additional validation before creation
        const { Note } = await import("./Note")
        const note = await Note.findByPk(noteShare.noteId)
        if (note) {
          await NoteShare.validateShareCreation(
            noteShare.noteId,
            noteShare.userId,
            note.creatorId
          )
        }
      },
    },
  }
)

export default NoteShare
