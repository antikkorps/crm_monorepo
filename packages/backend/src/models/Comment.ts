import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { CollaborationValidation } from "../types/collaboration"

export interface CommentAttributes {
  id: string
  content: string
  meetingId: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface CommentCreationAttributes
  extends Optional<CommentAttributes, "id" | "createdAt" | "updatedAt"> {}

export class Comment
  extends Model<CommentAttributes, CommentCreationAttributes>
  implements CommentAttributes
{
  declare id: string
  declare content: string
  declare meetingId: string
  declare userId: string
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare meeting?: any
  declare user?: any

  // Instance methods
  public async canUserEdit(userId: string): Promise<boolean> {
    // Only the comment author can edit their comment
    return this.userId === userId
  }

  public async canUserDelete(userId: string): Promise<boolean> {
    // Comment author can delete their comment
    if (this.userId === userId) {
      return true
    }

    // Meeting organizer can delete any comment in their meeting
    if (this.meeting) {
      return this.meeting.organizerId === userId
    }

    // Load meeting if not already loaded
    const { Meeting } = await import("./Meeting")
    const meeting = await Meeting.findByPk(this.meetingId)
    return meeting ? meeting.organizerId === userId : false
  }

  public async canUserAccess(userId: string): Promise<boolean> {
    // Load meeting if not already loaded
    if (!this.meeting) {
      const { Meeting } = await import("./Meeting")
      this.meeting = await Meeting.findByPk(this.meetingId)
    }

    if (!this.meeting) {
      return false
    }

    // Use meeting's access control
    return this.meeting.canUserAccess(userId)
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return values
  }

  // Static methods
  public static async findByMeeting(meetingId: string): Promise<Comment[]> {
    const { User } = await import("./User")
    return this.findAll({
      where: { meetingId },
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

  public static async findByUser(userId: string): Promise<Comment[]> {
    const { User } = await import("./User")
    const { Meeting } = await import("./Meeting")
    return this.findAll({
      where: { userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Meeting,
          as: "meeting",
          attributes: ["id", "title", "startDate", "organizerId"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async createComment(
    meetingId: string,
    userId: string,
    content: string
  ): Promise<Comment> {
    // Validate that the meeting exists and user has access
    const { Meeting } = await import("./Meeting")
    const meeting = await Meeting.findByPk(meetingId)
    if (!meeting) {
      throw new Error("Meeting not found")
    }

    const hasAccess = await meeting.canUserAccess(userId)
    if (!hasAccess) {
      throw new Error("User does not have access to this meeting")
    }

    // Validate comment content
    CollaborationValidation.validateCommentContent(content)

    return this.create({
      meetingId,
      userId,
      content,
    })
  }

  public static async updateComment(
    commentId: string,
    userId: string,
    content: string
  ): Promise<Comment> {
    const { Meeting } = await import("./Meeting")
    const comment = await this.findByPk(commentId, {
      include: [
        {
          model: Meeting,
          as: "meeting",
        },
      ],
    })

    if (!comment) {
      throw new Error("Comment not found")
    }

    const canEdit = await comment.canUserEdit(userId)
    if (!canEdit) {
      throw new Error("User does not have permission to edit this comment")
    }

    // Validate comment content
    CollaborationValidation.validateCommentContent(content)

    comment.content = content
    await comment.save()

    return comment
  }

  public static async deleteComment(commentId: string, userId: string): Promise<void> {
    const { Meeting } = await import("./Meeting")
    const comment = await this.findByPk(commentId, {
      include: [
        {
          model: Meeting,
          as: "meeting",
        },
      ],
    })

    if (!comment) {
      throw new Error("Comment not found")
    }

    const canDelete = await comment.canUserDelete(userId)
    if (!canDelete) {
      throw new Error("User does not have permission to delete this comment")
    }

    await comment.destroy()
  }

  public static async searchComments(filters: {
    meetingId?: string
    userId?: string
    search?: string
    accessUserId?: string // For access control
  }): Promise<Comment[]> {
    const whereClause: any = {}

    if (filters.meetingId) {
      whereClause.meetingId = filters.meetingId
    }

    if (filters.userId) {
      whereClause.userId = filters.userId
    }

    if (filters.search) {
      whereClause.content = {
        [Op.iLike]: `%${filters.search}%`,
      }
    }

    const { User } = await import("./User")
    const { Meeting } = await import("./Meeting")
    let comments = await this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Meeting,
          as: "meeting",
          attributes: ["id", "title", "startDate", "organizerId"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })

    // Apply access control if accessUserId is provided
    if (filters.accessUserId) {
      const accessibleComments = []
      for (const comment of comments) {
        const hasAccess = await comment.canUserAccess(filters.accessUserId)
        if (hasAccess) {
          accessibleComments.push(comment)
        }
      }
      comments = accessibleComments
    }

    return comments
  }

  // Validation methods
  public static validateCommentData(commentData: Partial<CommentAttributes>): void {
    if (commentData.content !== undefined) {
      CollaborationValidation.validateCommentContent(commentData.content)
    }
  }
}

// Initialize the model
Comment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 2000],
        notEmpty: true,
      },
    },
    meetingId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "meeting_id",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
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
    modelName: "Comment",
    tableName: "comments",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["meeting_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["meeting_id", "created_at"],
      },
    ],
    hooks: {
      beforeValidate: (comment: Comment) => {
        // Validate comment data
        Comment.validateCommentData(comment)
      },
    },
  }
)

export default Comment
