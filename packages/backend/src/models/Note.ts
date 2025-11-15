import { SharePermission } from "@medical-crm/shared"
import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { CollaborationValidation } from "../types/collaboration"
import { MedicalInstitution } from "./MedicalInstitution"
import { User } from "./User"
import type { NoteShare } from "./NoteShare"

export interface NoteAttributes {
  id: string
  title: string
  content: string
  tags: string[]
  creatorId: string
  institutionId?: string
  isPrivate: boolean
  createdAt: Date
  updatedAt: Date
}

export interface NoteCreationAttributes
  extends Optional<NoteAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Note
  extends Model<NoteAttributes, NoteCreationAttributes>
  implements NoteAttributes
{
  declare id: string
  declare title: string
  declare content: string
  declare tags: string[]
  declare creatorId: string
  declare institutionId?: string
  declare isPrivate: boolean
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare creator?: User
  declare institution?: MedicalInstitution
  declare shares?: NoteShare[]

  // Instance methods
  public async shareWith(
    userId: string,
    permission: SharePermission
  ): Promise<NoteShare> {
    const { NoteShare } = await import("./NoteShare")

    // Check if share already exists
    const existingShare = await NoteShare.findOne({
      where: { noteId: this.id, userId },
    })

    if (existingShare) {
      existingShare.permission = permission
      await existingShare.save()
      return existingShare
    }

    return NoteShare.create({
      noteId: this.id,
      userId,
      permission,
    })
  }

  public async removeShare(userId: string): Promise<void> {
    const { NoteShare } = await import("./NoteShare")
    await NoteShare.destroy({
      where: { noteId: this.id, userId },
    })
  }

  public async getShares(): Promise<NoteShare[]> {
    const { NoteShare } = await import("./NoteShare")
    return NoteShare.findAll({
      where: { noteId: this.id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  }

  public async canUserAccess(userId: string): Promise<boolean> {
    // Creator always has access
    if (this.creatorId === userId) {
      return true
    }

    // Public notes are accessible to all
    if (!this.isPrivate) {
      return true
    }

    // Check if user has explicit share permission
    const { NoteShare } = await import("./NoteShare")
    const share = await NoteShare.findOne({
      where: { noteId: this.id, userId },
    })

    return !!share
  }

  public async canUserEdit(userId: string): Promise<boolean> {
    // Creator always can edit
    if (this.creatorId === userId) {
      return true
    }

    // Check if user has write permission
    const { NoteShare } = await import("./NoteShare")
    const share = await NoteShare.findOne({
      where: { noteId: this.id, userId },
    })

    return share?.permission === SharePermission.WRITE
  }

  public addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags = [...this.tags, tag]
    }
  }

  public removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag)
  }

  public hasTag(tag: string): boolean {
    return this.tags.includes(tag)
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return values
  }

  // Static methods
  public static async findByCreator(creatorId: string): Promise<Note[]> {
    return this.findAll({
      where: { creatorId },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByInstitution(institutionId: string): Promise<Note[]> {
    return this.findAll({
      where: { institutionId },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByTags(tags: string[]): Promise<Note[]> {
    return this.findAll({
      where: {
        tags: {
          [Op.overlap]: tags,
        },
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findAccessibleByUser(userId: string): Promise<Note[]> {
    const { NoteShare } = await import("./NoteShare")

    return this.findAll({
      where: {
        [Op.or]: [
          { creatorId: userId }, // Notes created by user
          { isPrivate: false }, // Public notes
          {
            id: {
              [Op.in]: sequelize.literal(`(
                SELECT note_id FROM note_shares WHERE user_id = '${userId}'
              )`),
            },
          }, // Notes shared with user
        ],
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async searchNotes(filters: {
    creatorId?: string
    institutionId?: string
    tags?: string[]
    isPrivate?: boolean
    search?: string
    sharedWithUserId?: string
    userId?: string // For access control
  }): Promise<Note[]> {
    let whereClause: any = {}

    if (filters.creatorId) {
      whereClause.creatorId = filters.creatorId
    }

    if (filters.institutionId) {
      whereClause.institutionId = filters.institutionId
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClause.tags = {
        [Op.overlap]: filters.tags,
      }
    }

    if (filters.isPrivate !== undefined) {
      whereClause.isPrivate = filters.isPrivate
    }

    if (filters.search) {
      whereClause[Op.or] = [
        {
          title: {
            [Op.iLike]: `%${filters.search}%`,
          },
        },
        {
          content: {
            [Op.iLike]: `%${filters.search}%`,
          },
        },
        {
          tags: {
            [Op.overlap]: [filters.search],
          },
        },
      ]
    }

    // Apply access control if userId is provided
    // SECURITY: Use parameterized queries to prevent SQL injection
    if (filters.userId) {
      const { NoteShare } = await import("./NoteShare")
      const sharedNotes = await NoteShare.findAll({
        where: { userId: filters.userId },
        attributes: ["noteId"],
      })
      const sharedNoteIds = sharedNotes.map((share) => share.noteId)

      const accessControlClause = {
        [Op.or]: [
          { creatorId: filters.userId },
          { isPrivate: false },
          ...(sharedNoteIds.length > 0 ? [{
            id: {
              [Op.in]: sharedNoteIds,
            },
          }] : []),
        ],
      }

      // Combine existing where clause with access control
      const existingConditions = Object.keys(whereClause).length > 0 ? [{ ...whereClause }] : []
      whereClause = {
        [Op.and]: [...existingConditions, accessControlClause],
      }
    }

    // Filter by shared with specific user
    // SECURITY: Use parameterized queries to prevent SQL injection
    if (filters.sharedWithUserId) {
      const { NoteShare } = await import("./NoteShare")
      const sharedNotes = await NoteShare.findAll({
        where: { userId: filters.sharedWithUserId },
        attributes: ["noteId"],
      })
      const sharedNoteIds = sharedNotes.map((share) => share.noteId)
      whereClause.id = {
        [Op.in]: sharedNoteIds,
      }
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  // Validation methods
  public static validateNoteData(noteData: Partial<NoteAttributes>): void {
    if (noteData.title !== undefined) {
      CollaborationValidation.validateNoteTitle(noteData.title)
    }

    if (noteData.content !== undefined) {
      CollaborationValidation.validateNoteContent(noteData.content)
    }

    if (noteData.tags !== undefined) {
      CollaborationValidation.validateNoteTags(noteData.tags)
    }
  }
}

// Initialize the model
const isPgDialect = sequelize.getDialect() === "postgres"
const noteIndexes: any[] = [
  {
    fields: ["creator_id"],
  },
  {
    fields: ["institution_id"],
  },
  {
    fields: ["is_private"],
  },
  {
    fields: ["created_at"],
  },
  {
    fields: ["creator_id", "is_private"],
  },
]

// Only create the GIN index in non-test environments, as pg-mem doesn't support it
if (isPgDialect && process.env.NODE_ENV !== "test") {
  noteIndexes.push({ name: "notes_tags_gin_idx", fields: ["tags"], using: "gin" })
}

Note.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255],
        notEmpty: true,
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 10000],
      },
    },
    tags: {
      type:
        sequelize.getDialect() === "postgres"
          ? DataTypes.ARRAY(DataTypes.STRING)
          : DataTypes.TEXT,
      allowNull: false,
      defaultValue: sequelize.getDialect() === "postgres" ? [] : "[]",
      get() {
        const raw = this.getDataValue("tags") as unknown
        if (sequelize.getDialect() === "postgres") {
          return (raw as string[]) ?? []
        }
        if (typeof raw === "string") {
          try {
            return JSON.parse(raw) as string[]
          } catch {
            return []
          }
        }
        return Array.isArray(raw) ? (raw as string[]) : []
      },
      set(value: string[]) {
        if (sequelize.getDialect() === "postgres") {
          this.setDataValue("tags", value as unknown as any)
        } else {
          this.setDataValue("tags", JSON.stringify(value || []) as unknown as any)
        }
      },
      validate: {
        isValidTags(value: string[] | string) {
          let tags: string[]
          if (typeof value === "string") {
            try {
              tags = JSON.parse(value)
            } catch {
              throw new Error("Invalid tags format")
            }
          } else {
            tags = value
          }
          CollaborationValidation.validateNoteTags(tags)
        },
      },
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "creator_id",
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "institution_id",
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_private",
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
    modelName: "Note",
    tableName: "notes",
    timestamps: true,
    underscored: true,
    indexes: noteIndexes,
    hooks: {
      beforeValidate: (note: Note) => {
        // Validate note data
        Note.validateNoteData(note)
      },
    },
  }
)

export default Note
