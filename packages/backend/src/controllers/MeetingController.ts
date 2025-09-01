import {
  MeetingCreateRequest,
  MeetingSearchFilters,
  MeetingStatus,
  MeetingUpdateRequest,
  ParticipantStatus,
} from "@medical-crm/shared"
import { Context } from "../types/koa"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Meeting } from "../models/Meeting"
import { MeetingParticipant } from "../models/MeetingParticipant"
import { User } from "../models/User"

export class MeetingController {
  // GET /api/meetings - List meetings with optional filters
  static async getMeetings(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const {
        organizerId,
        participantId,
        institutionId,
        status,
        startDateFrom,
        startDateTo,
        search,
        page = 1,
        limit = 50,
      } = ctx.query

      const filters: MeetingSearchFilters & { userId?: string; status?: MeetingStatus } = {}

      if (organizerId) filters.organizerId = organizerId as string
      if (participantId) filters.participantId = participantId as string
      if (institutionId) filters.institutionId = institutionId as string
      if (status) filters.status = status as MeetingStatus
      if (startDateFrom) filters.startDateFrom = new Date(startDateFrom as string)
      if (startDateTo) filters.startDateTo = new Date(startDateTo as string)
      if (search) filters.search = search as string

      // Apply access control context for model-level filter
      filters.userId = user.id

      const meetings = await Meeting.searchMeetings(filters)

      const startIndex = (Number(page) - 1) * Number(limit)
      const endIndex = startIndex + Number(limit)
      const paginated = meetings.slice(startIndex, endIndex)

      ctx.body = {
        success: true,
        data: paginated,
        meta: {
          total: meetings.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(meetings.length / Number(limit)),
        },
      }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "MEETING_FETCH_ERROR",
          message: "Failed to fetch meetings",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/meetings/:id - Get single meeting
  static async getMeeting(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const meeting = await Meeting.findByPk(id, {
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
      })

      if (!meeting) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" },
        }
        return
      }

      const canAccess = await meeting.canUserAccess(user.id)
      if (!canAccess) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have access to this meeting",
          },
        }
        return
      }

      ctx.body = { success: true, data: meeting }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "MEETING_FETCH_ERROR",
          message: "Failed to fetch meeting",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/meetings - Create meeting
  static async createMeeting(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const data = ctx.request.body as MeetingCreateRequest

      if (!data.title || !data.startDate || !data.endDate) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Missing required fields" },
        }
        return
      }

      if (data.institutionId) {
        const inst = await MedicalInstitution.findByPk(data.institutionId)
        if (!inst) {
          ctx.status = 400
          ctx.body = {
            success: false,
            error: { code: "INVALID_INSTITUTION", message: "Institution not found" },
          }
          return
        }
      }

      const meeting = await Meeting.create({
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        location: data.location,
        organizerId: user.id,
        institutionId: data.institutionId,
        status: MeetingStatus.SCHEDULED,
      })

      const created = await Meeting.findByPk(meeting.id)

      ctx.status = 201
      ctx.body = { success: true, data: created }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "MEETING_CREATE_ERROR",
          message: "Failed to create meeting",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // PUT /api/meetings/:id - Update meeting
  static async updateMeeting(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const updates = ctx.request.body as MeetingUpdateRequest

      const meeting = await Meeting.findByPk(id)
      if (!meeting) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" },
        }
        return
      }

      const canEdit = await meeting.canUserEdit(user.id)
      if (!canEdit) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to edit this meeting",
          },
        }
        return
      }

      // Apply allowed updates
      if (updates.title !== undefined) meeting.title = updates.title
      if (updates.description !== undefined) meeting.description = updates.description
      if (updates.location !== undefined) meeting.location = updates.location
      if (updates.institutionId !== undefined) {
        if (updates.institutionId) {
          const inst = await MedicalInstitution.findByPk(updates.institutionId)
          if (!inst) {
            ctx.status = 400
            ctx.body = {
              success: false,
              error: { code: "INVALID_INSTITUTION", message: "Institution not found" },
            }
            return
          }
        }
        meeting.institutionId = updates.institutionId
      }
      if (updates.status !== undefined) await meeting.updateStatus(updates.status)
      if (updates.startDate || updates.endDate) {
        const start = updates.startDate ? new Date(updates.startDate) : meeting.startDate
        const end = updates.endDate ? new Date(updates.endDate) : meeting.endDate
        await meeting.reschedule(start, end)
      } else {
        await meeting.save()
      }

      const updated = await Meeting.findByPk(meeting.id)
      ctx.body = { success: true, data: updated }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "MEETING_UPDATE_ERROR",
          message: "Failed to update meeting",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // DELETE /api/meetings/:id - Delete meeting
  static async deleteMeeting(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params

      const meeting = await Meeting.findByPk(id)
      if (!meeting) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" },
        }
        return
      }

      const canEdit = await meeting.canUserEdit(user.id)
      if (!canEdit) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to delete this meeting",
          },
        }
        return
      }

      await Meeting.destroy({ where: { id } })
      ctx.body = { success: true }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "MEETING_DELETE_ERROR",
          message: "Failed to delete meeting",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // GET /api/meetings/:id/participants - List participants
  static async getParticipants(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const meeting = await Meeting.findByPk(id)
      if (!meeting) {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" } }
        return
      }
      const canAccess = await meeting.canUserAccess(user.id)
      if (!canAccess) {
        ctx.status = 403
        ctx.body = { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message: "No access" } }
        return
      }
      const participants = await meeting.getParticipants()
      ctx.body = { success: true, data: participants }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: { code: "PARTICIPANT_FETCH_ERROR", message: "Failed to fetch participants" },
      }
    }
  }

  // POST /api/meetings/:id/participants - Invite participants (bulk or single)
  static async inviteParticipants(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { userIds, userId } = ctx.request.body as { userIds?: string[]; userId?: string }

      const meeting = await Meeting.findByPk(id)
      if (!meeting) {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" } }
        return
      }

      const canEdit = await meeting.canUserEdit(user.id)
      if (!canEdit) {
        ctx.status = 403
        ctx.body = { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message: "No access" } }
        return
      }

      let invited: any[] = []
      if (Array.isArray(userIds) && userIds.length > 0) {
        invited = await MeetingParticipant.bulkInviteUsers(meeting.id, userIds)
      } else if (userId) {
        const participant = await meeting.addParticipant(userId)
        invited = [participant]
      } else {
        ctx.status = 400
        ctx.body = { success: false, error: { code: "VALIDATION_ERROR", message: "userId(s) required" } }
        return
      }

      ctx.status = 201
      ctx.body = { success: true, data: invited }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: { code: "PARTICIPANT_INVITE_ERROR", message: "Failed to invite participants" },
      }
    }
  }

  // PUT /api/meetings/:id/participants/:userId - Update participant status
  static async updateParticipantStatus(ctx: Context) {
    try {
      const actingUser = ctx.state.user as User
      const { id, userId } = ctx.params
      const { status } = ctx.request.body as { status: ParticipantStatus }

      const meeting = await Meeting.findByPk(id)
      if (!meeting) {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" } }
        return
      }

      const participant = await MeetingParticipant.findByMeetingAndUser(id, userId)
      if (!participant) {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "PARTICIPANT_NOT_FOUND", message: "Participant not found" } }
        return
      }

      // Only the participant themselves or the organizer can change the status
      const isOrganizer = await meeting.canUserEdit(actingUser.id)
      const isSelf = actingUser.id === userId
      if (!isOrganizer && !isSelf) {
        ctx.status = 403
        ctx.body = { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message: "No access" } }
        return
      }

      await participant.updateStatus(status)
      ctx.body = { success: true, data: participant }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: { code: "PARTICIPANT_UPDATE_ERROR", message: "Failed to update participant" },
      }
    }
  }

  // DELETE /api/meetings/:id/participants/:userId - Remove participant
  static async removeParticipant(ctx: Context) {
    try {
      const actingUser = ctx.state.user as User
      const { id, userId } = ctx.params

      const meeting = await Meeting.findByPk(id)
      if (!meeting) {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "MEETING_NOT_FOUND", message: "Meeting not found" } }
        return
      }

      const isOrganizer = await meeting.canUserEdit(actingUser.id)
      const isSelf = actingUser.id === userId
      if (!isOrganizer && !isSelf) {
        ctx.status = 403
        ctx.body = { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message: "No access" } }
        return
      }

      await meeting.removeParticipant(userId)
      ctx.body = { success: true }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: { code: "PARTICIPANT_REMOVE_ERROR", message: "Failed to remove participant" },
      }
    }
  }
}

export default MeetingController

