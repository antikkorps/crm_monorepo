import { MeetingStatus, ParticipantStatus } from "@medical-crm/shared"
import { DataTypes, Model, Op, Optional } from "sequelize"
import { sequelize } from "../config/database"
import type { MeetingParticipant } from "./MeetingParticipant"
import type { Comment } from "./Comment"
import { CollaborationValidation } from "../types/collaboration"
import { MedicalInstitution } from "./MedicalInstitution"
import { User } from "./User"

export interface MeetingAttributes {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  location?: string
  organizerId: string
  institutionId?: string
  status: MeetingStatus
  createdAt: Date
  updatedAt: Date
}

export interface MeetingCreationAttributes
  extends Optional<MeetingAttributes, "id" | "status" | "createdAt" | "updatedAt"> {}

export class Meeting
  extends Model<MeetingAttributes, MeetingCreationAttributes>
  implements MeetingAttributes
{
  declare id: string
  declare title: string
  declare description?: string
  declare startDate: Date
  declare endDate: Date
  declare location?: string
  declare organizerId: string
  declare institutionId?: string
  declare status: MeetingStatus
  declare readonly createdAt: Date
  declare readonly updatedAt: Date

  // Associations
  declare organizer?: User
  declare institution?: MedicalInstitution
  declare participants?: MeetingParticipant[]
  declare comments?: Comment[]

  // Instance methods
  public getDuration(): number {
    return this.endDate.getTime() - this.startDate.getTime()
  }

  public getDurationInMinutes(): number {
    return Math.round(this.getDuration() / (1000 * 60))
  }

  public isUpcoming(): boolean {
    return this.startDate > new Date() && this.status === MeetingStatus.SCHEDULED
  }

  public isInProgress(): boolean {
    const now = new Date()
    return (
      this.startDate <= now &&
      this.endDate >= now &&
      this.status === MeetingStatus.IN_PROGRESS
    )
  }

  public isCompleted(): boolean {
    return this.status === MeetingStatus.COMPLETED
  }

  public isCancelled(): boolean {
    return this.status === MeetingStatus.CANCELLED
  }

  public async addParticipant(userId: string): Promise<MeetingParticipant> {
    const { MeetingParticipant } = await import("./MeetingParticipant")

    // Check if participant already exists
    const existingParticipant = await MeetingParticipant.findOne({
      where: { meetingId: this.id, userId },
    })

    if (existingParticipant) {
      throw new Error("User is already a participant in this meeting")
    }

    return MeetingParticipant.create({
      meetingId: this.id,
      userId,
      status: ParticipantStatus.INVITED,
    })
  }

  public async removeParticipant(userId: string): Promise<void> {
    const { MeetingParticipant } = await import("./MeetingParticipant")
    await MeetingParticipant.destroy({
      where: { meetingId: this.id, userId },
    })
  }

  public async getParticipants(): Promise<MeetingParticipant[]> {
    const { MeetingParticipant } = await import("./MeetingParticipant")
    return MeetingParticipant.findAll({
      where: { meetingId: this.id },
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
    // Organizer always has access
    if (this.organizerId === userId) {
      return true
    }

    // Check if user is a participant
    const { MeetingParticipant } = await import("./MeetingParticipant")
    const participant = await MeetingParticipant.findOne({
      where: { meetingId: this.id, userId },
    })

    return !!participant
  }

  public async canUserEdit(userId: string): Promise<boolean> {
    // Only organizer can edit
    return this.organizerId === userId
  }

  public async updateStatus(newStatus: MeetingStatus): Promise<void> {
    CollaborationValidation.validateMeetingStatusTransition(this.status, newStatus)
    this.status = newStatus
    await this.save()
  }

  public async reschedule(startDate: Date, endDate: Date): Promise<void> {
    CollaborationValidation.validateMeetingDates(startDate, endDate)
    this.startDate = startDate
    this.endDate = endDate
    this.status = MeetingStatus.SCHEDULED
    await this.save()
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      duration: this.getDuration(),
      durationInMinutes: this.getDurationInMinutes(),
      isUpcoming: this.isUpcoming(),
      isInProgress: this.isInProgress(),
      isCompleted: this.isCompleted(),
      isCancelled: this.isCancelled(),
    }
  }

  // Static methods
  public static async findByOrganizer(organizerId: string): Promise<Meeting[]> {
    return this.findAll({
      where: { organizerId },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["startDate", "ASC"]],
    })
  }

  public static async findByInstitution(institutionId: string): Promise<Meeting[]> {
    return this.findAll({
      where: { institutionId },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["startDate", "ASC"]],
    })
  }

  public static async findByStatus(status: MeetingStatus): Promise<Meeting[]> {
    return this.findAll({
      where: { status },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["startDate", "ASC"]],
    })
  }

  public static async findByParticipant(userId: string): Promise<Meeting[]> {
    const { MeetingParticipant } = await import("./MeetingParticipant")

    return this.findAll({
      where: {
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT meeting_id FROM meeting_participants WHERE user_id = '${userId}'
          )`),
        },
      },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["startDate", "ASC"]],
    })
  }

  public static async findUpcomingMeetings(): Promise<Meeting[]> {
    return this.findAll({
      where: {
        startDate: {
          [Op.gt]: new Date(),
        },
        status: MeetingStatus.SCHEDULED,
      },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["startDate", "ASC"]],
    })
  }

  public static async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Meeting[]> {
    return this.findAll({
      where: {
        startDate: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["startDate", "ASC"]],
    })
  }

  public static async searchMeetings(filters: {
    organizerId?: string
    participantId?: string
    institutionId?: string
    status?: MeetingStatus
    startDateFrom?: Date
    startDateTo?: Date
    search?: string
    userId?: string // For access control
  }): Promise<Meeting[]> {
    const whereClause: any = {}

    if (filters.organizerId) {
      whereClause.organizerId = filters.organizerId
    }

    if (filters.institutionId) {
      whereClause.institutionId = filters.institutionId
    }

    if (filters.status) {
      whereClause.status = filters.status
    }

    if (filters.startDateFrom) {
      whereClause.startDate = {
        ...whereClause.startDate,
        [Op.gte]: filters.startDateFrom,
      }
    }

    if (filters.startDateTo) {
      whereClause.startDate = {
        ...whereClause.startDate,
        [Op.lte]: filters.startDateTo,
      }
    }

    if (filters.search) {
      whereClause[Op.or] = [
        {
          title: {
            [Op.iLike]: `%${filters.search}%`,
          },
        },
        {
          description: {
            [Op.iLike]: `%${filters.search}%`,
          },
        },
        {
          location: {
            [Op.iLike]: `%${filters.search}%`,
          },
        },
      ]
    }

    // Apply access control if userId is provided
    // SECURITY: Use parameterized queries to prevent SQL injection
    if (filters.userId) {
      const { MeetingParticipant } = await import("./MeetingParticipant")
      const participantMeetings = await MeetingParticipant.findAll({
        where: { userId: filters.userId },
        attributes: ["meetingId"],
      })
      const participantMeetingIds = participantMeetings.map((p) => p.meetingId)

      whereClause[Op.and] = [
        whereClause,
        {
          [Op.or]: [
            { organizerId: filters.userId },
            participantMeetingIds.length > 0
              ? {
                  id: {
                    [Op.in]: participantMeetingIds,
                  },
                }
              : {
                  id: {
                    [Op.in]: [-1],
                  },
                },
          ],
        },
      ]
    }

    // Filter by participant
    // SECURITY: Use parameterized queries to prevent SQL injection
    if (filters.participantId) {
      const { MeetingParticipant } = await import("./MeetingParticipant")
      const participantMeetings = await MeetingParticipant.findAll({
        where: { userId: filters.participantId },
        attributes: ["meetingId"],
      })
      const participantMeetingIds = participantMeetings.map((p) => p.meetingId)
      
      if (participantMeetingIds.length > 0) {
        whereClause.id = {
          [Op.in]: participantMeetingIds,
        }
      } else {
        // No participant meetings found, return no results
        whereClause.id = {
          [Op.in]: [-1],
        }
      }
    }

    return this.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "organizer",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["startDate", "ASC"]],
    })
  }

  // Validation methods
  public static validateMeetingData(meetingData: Partial<MeetingAttributes>): void {
    if (meetingData.title !== undefined) {
      CollaborationValidation.validateMeetingTitle(meetingData.title)
    }

    if (meetingData.startDate && meetingData.endDate) {
      CollaborationValidation.validateMeetingDates(
        meetingData.startDate,
        meetingData.endDate
      )
    }

    if (meetingData.location !== undefined) {
      CollaborationValidation.validateMeetingLocation(meetingData.location)
    }
  }
}

// Initialize the model
Meeting.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "start_date",
      validate: {
        isDate: true,
      },
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "end_date",
      validate: {
        isDate: true,
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    organizerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "organizer_id",
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "institution_id",
    },
    status: {
      type: DataTypes.ENUM(...Object.values(MeetingStatus)),
      allowNull: false,
      defaultValue: MeetingStatus.SCHEDULED,
      validate: {
        isIn: [Object.values(MeetingStatus)],
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
    modelName: "Meeting",
    tableName: "meetings",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ["organizer_id"],
      },
      {
        fields: ["institution_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["start_date"],
      },
      {
        fields: ["end_date"],
      },
      {
        fields: ["created_at"],
      },
      {
        fields: ["organizer_id", "status"],
      },
      {
        fields: ["start_date", "status"],
      },
    ],
    hooks: {
      beforeValidate: (meeting: Meeting) => {
        // Validate meeting data
        Meeting.validateMeetingData(meeting)
      },
      beforeSave: (meeting: Meeting) => {
        // Validate status transitions if this is an update
        if (!meeting.isNewRecord && meeting.changed("status")) {
          const previousStatus = meeting.previous("status") as MeetingStatus
          CollaborationValidation.validateMeetingStatusTransition(
            previousStatus,
            meeting.status
          )
        }
      },
    },
  }
)

export default Meeting
