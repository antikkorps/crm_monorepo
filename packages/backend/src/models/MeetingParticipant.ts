import { ParticipantStatus } from "@medical-crm/shared"
import { DataTypes, Model, Optional } from "sequelize"
import { sequelize } from "../config/database"
import { CollaborationValidation } from "../types/collaboration"
import { User } from "./User"
import type { Meeting } from "./Meeting"

export interface MeetingParticipantAttributes {
  id: string
  meetingId: string
  userId: string
  status: ParticipantStatus
  createdAt: Date
}

export interface MeetingParticipantCreationAttributes
  extends Optional<MeetingParticipantAttributes, "id" | "status" | "createdAt"> {}

export class MeetingParticipant
  extends Model<MeetingParticipantAttributes, MeetingParticipantCreationAttributes>
  implements MeetingParticipantAttributes
{
  declare id: string
  declare meetingId: string
  declare userId: string
  declare status: ParticipantStatus
  declare readonly createdAt: Date

  // Associations
  declare user?: User
  declare meeting?: Meeting

  // Instance methods
  public async accept(): Promise<void> {
    CollaborationValidation.validateParticipantStatusTransition(
      this.status,
      ParticipantStatus.ACCEPTED
    )
    this.status = ParticipantStatus.ACCEPTED
    await this.save()
  }

  public async decline(): Promise<void> {
    CollaborationValidation.validateParticipantStatusTransition(
      this.status,
      ParticipantStatus.DECLINED
    )
    this.status = ParticipantStatus.DECLINED
    await this.save()
  }

  public async markTentative(): Promise<void> {
    CollaborationValidation.validateParticipantStatusTransition(
      this.status,
      ParticipantStatus.TENTATIVE
    )
    this.status = ParticipantStatus.TENTATIVE
    await this.save()
  }

  public async updateStatus(newStatus: ParticipantStatus): Promise<void> {
    CollaborationValidation.validateParticipantStatusTransition(this.status, newStatus)
    this.status = newStatus
    await this.save()
  }

  public isAccepted(): boolean {
    return this.status === ParticipantStatus.ACCEPTED
  }

  public isDeclined(): boolean {
    return this.status === ParticipantStatus.DECLINED
  }

  public isTentative(): boolean {
    return this.status === ParticipantStatus.TENTATIVE
  }

  public isInvited(): boolean {
    return this.status === ParticipantStatus.INVITED
  }

  public override toJSON(): any {
    const values = { ...this.get() } as any
    return {
      ...values,
      isAccepted: this.isAccepted(),
      isDeclined: this.isDeclined(),
      isTentative: this.isTentative(),
      isInvited: this.isInvited(),
    }
  }

  // Static methods
  public static async findByMeeting(meetingId: string): Promise<MeetingParticipant[]> {
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

  public static async findByUser(userId: string): Promise<MeetingParticipant[]> {
    const { Meeting } = await import("./Meeting")
    return this.findAll({
      where: { userId },
      include: [
        {
          model: Meeting,
          as: "meeting",
          attributes: ["id", "title", "startDate", "endDate", "status"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByStatus(
    status: ParticipantStatus
  ): Promise<MeetingParticipant[]> {
    return this.findAll({
      where: { status },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    })
  }

  public static async findByMeetingAndUser(
    meetingId: string,
    userId: string
  ): Promise<MeetingParticipant | null> {
    return this.findOne({
      where: { meetingId, userId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    })
  }

  public static async getAcceptedParticipants(
    meetingId: string
  ): Promise<MeetingParticipant[]> {
    return this.findAll({
      where: {
        meetingId,
        status: ParticipantStatus.ACCEPTED,
      },
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

  public static async getDeclinedParticipants(
    meetingId: string
  ): Promise<MeetingParticipant[]> {
    return this.findAll({
      where: {
        meetingId,
        status: ParticipantStatus.DECLINED,
      },
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

  public static async getPendingParticipants(
    meetingId: string
  ): Promise<MeetingParticipant[]> {
    return this.findAll({
      where: {
        meetingId,
        status: [ParticipantStatus.INVITED, ParticipantStatus.TENTATIVE],
      },
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

  public static async getMeetingParticipantCount(meetingId: string): Promise<{
    total: number
    accepted: number
    declined: number
    pending: number
  }> {
    const participants = await this.findAll({
      where: { meetingId },
      attributes: ["status"],
    })

    const counts = {
      total: participants.length,
      accepted: 0,
      declined: 0,
      pending: 0,
    }

    participants.forEach((participant) => {
      switch (participant.status) {
        case ParticipantStatus.ACCEPTED:
          counts.accepted++
          break
        case ParticipantStatus.DECLINED:
          counts.declined++
          break
        case ParticipantStatus.INVITED:
        case ParticipantStatus.TENTATIVE:
          counts.pending++
          break
      }
    })

    return counts
  }

  public static async bulkInviteUsers(
    meetingId: string,
    userIds: string[]
  ): Promise<MeetingParticipant[]> {
    // Check for existing participants to avoid duplicates
    const existingParticipants = await this.findAll({
      where: { meetingId, userId: userIds },
      attributes: ["userId"],
    })

    const existingUserIds = existingParticipants.map((p) => p.userId)
    const newUserIds = userIds.filter((id) => !existingUserIds.includes(id))

    if (newUserIds.length === 0) {
      return []
    }

    const participantsData = newUserIds.map((userId) => ({
      meetingId,
      userId,
      status: ParticipantStatus.INVITED,
    }))

    return this.bulkCreate(participantsData)
  }

  public static async removeParticipants(
    meetingId: string,
    userIds: string[]
  ): Promise<number> {
    return this.destroy({
      where: { meetingId, userId: userIds },
    })
  }

  // Validation methods
  public static validateParticipantData(
    participantData: Partial<MeetingParticipantAttributes>
  ): void {
    if (!participantData.meetingId) {
      throw new Error("Meeting ID is required")
    }

    if (!participantData.userId) {
      throw new Error("User ID is required")
    }

    if (
      participantData.status &&
      !Object.values(ParticipantStatus).includes(participantData.status)
    ) {
      throw new Error("Invalid participant status")
    }
  }
}

// Initialize the model
MeetingParticipant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
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
    status: {
      type: DataTypes.ENUM(...Object.values(ParticipantStatus)),
      allowNull: false,
      defaultValue: ParticipantStatus.INVITED,
      validate: {
        isIn: [Object.values(ParticipantStatus)],
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,
    modelName: "MeetingParticipant",
    tableName: "meeting_participants",
    timestamps: true,
    updatedAt: false, // Only createdAt, no updatedAt
    underscored: true,
    indexes: [
      {
        fields: ["meeting_id"],
      },
      {
        fields: ["user_id"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["meeting_id", "user_id"],
        unique: true, // Prevent duplicate participants
      },
      {
        fields: ["meeting_id", "status"],
      },
      {
        fields: ["user_id", "status"],
      },
    ],
    hooks: {
      beforeValidate: (participant: MeetingParticipant) => {
        // Validate participant data
        MeetingParticipant.validateParticipantData(participant)
      },
      beforeSave: (participant: MeetingParticipant) => {
        // Validate status transitions if this is an update
        if (!participant.isNewRecord && participant.changed("status")) {
          const previousStatus = participant.previous("status") as ParticipantStatus
          CollaborationValidation.validateParticipantStatusTransition(
            previousStatus,
            participant.status
          )
        }
      },
    },
  }
)

export default MeetingParticipant
