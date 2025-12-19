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
import { ContactPerson } from "../models/ContactPerson"
import { createEvents, EventAttributes, Attendee } from "ics"
import { EmailService } from "../services/EmailService"
import logger from "../utils/logger"

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

      // Invite participants if provided
      if (data.participantIds && data.participantIds.length > 0) {
        await MeetingParticipant.bulkInviteUsers(meeting.id, data.participantIds)
      }

      // Invite contact persons if provided
      if (data.contactPersonIds && data.contactPersonIds.length > 0) {
        if (data.institutionId) {
          const contactPersons = await ContactPerson.findAll({
            where: { id: data.contactPersonIds }
          });
          const invalidContacts = contactPersons.filter(
            contact => contact.institutionId !== data.institutionId
          );
          if (invalidContacts.length > 0) {
            ctx.status = 400;
            ctx.body = {
              success: false,
              error: {
                code: "INVALID_CONTACT_PERSON",
                message: "One or more contact persons do not belong to the meeting's institution"
              }
            };
            return;
          }
        }
        await MeetingParticipant.bulkInviteContactPersons(meeting.id, data.contactPersonIds)
      }

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
      const { userIds, userId, contactPersonIds, contactPersonId } = ctx.request.body as {
        userIds?: string[]
        userId?: string
        contactPersonIds?: string[]
        contactPersonId?: string
      }

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

      // Invite users
      if (Array.isArray(userIds) && userIds.length > 0) {
        const userInvited = await MeetingParticipant.bulkInviteUsers(meeting.id, userIds)
        invited = [...invited, ...userInvited]
      } else if (userId) {
        const participant = await meeting.addParticipant(userId)
        invited = [participant]
      }

      // Invite contact persons
      if (Array.isArray(contactPersonIds) && contactPersonIds.length > 0) {
        // Validate that contact persons belong to the meeting's institution (if one is set)
        if (meeting.institutionId) {
          const contacts = await ContactPerson.findAll({
            where: { id: contactPersonIds },
            attributes: ["id", "institutionId"],
          })
          
          const invalidContacts = contacts.filter(
            contact => contact.institutionId !== meeting.institutionId
          )
          
          if (invalidContacts.length > 0) {
            ctx.status = 400
            ctx.body = {
              success: false,
              error: {
                code: "INVALID_CONTACT",
                message: "One or more contact persons do not belong to this meeting's institution",
              },
            }
            return
          }
        }
        
        const contactsInvited = await MeetingParticipant.bulkInviteContactPersons(meeting.id, contactPersonIds)
        invited = [...invited, ...contactsInvited]
      } else if (contactPersonId) {
        // Validate that contact person belongs to the meeting's institution (if one is set)
        if (meeting.institutionId) {
          const contact = await ContactPerson.findByPk(contactPersonId)
          if (!contact) {
            ctx.status = 404
            ctx.body = {
              success: false,
              error: { code: "NOT_FOUND", message: "Contact person not found" },
            }
            return
          }
          
          if (contact.institutionId !== meeting.institutionId) {
            ctx.status = 400
            ctx.body = {
              success: false,
              error: {
                code: "INVALID_CONTACT",
                message: "Contact person does not belong to this meeting's institution",
              },
            }
            return
          }
        }
        
        const contactInvited = await MeetingParticipant.create({
          meetingId: meeting.id,
          contactPersonId,
          status: ParticipantStatus.INVITED,
        })
        invited.push(contactInvited)
      }

      if (invited.length === 0) {
        ctx.status = 400
        ctx.body = { success: false, error: { code: "VALIDATION_ERROR", message: "userId(s) or contactPersonId(s) required" } }
        return
      }

      ctx.status = 201
      ctx.body = { success: true, data: invited }
    } catch (error) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "PARTICIPANT_INVITE_ERROR",
          message: "Failed to invite participants",
          details: error instanceof Error ? error.message : "Unknown error",
        },
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

  // GET /api/meetings/:id/export/ics - Export meeting as .ics file
  static async exportToIcs(ctx: Context) {
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
            attributes: ["id", "name"],
          },
          {
            model: MeetingParticipant,
            as: "participants",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
              },
              {
                model: ContactPerson,
                as: "contactPerson",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
              },
            ],
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

      // Prepare attendees list
      const attendees: Attendee[] = meeting.participants?.map((p) => {
        const isUser = !!p.user
        const firstName = isUser ? p.user?.firstName : p.contactPerson?.firstName
        const lastName = isUser ? p.user?.lastName : p.contactPerson?.lastName
        const email = isUser ? p.user?.email : p.contactPerson?.email

        return {
          name: `${firstName || 'Unknown'} ${lastName || 'Unknown'}`,
          email: email || "",
          rsvp: true,
          partstat: p.status.toUpperCase() as "ACCEPTED" | "DECLINED" | "TENTATIVE" | "NEEDS-ACTION",
          role: "REQ-PARTICIPANT" as const,
        }
      }) || []

      // Add organizer
      attendees.push({
        name: `${meeting.organizer?.firstName || 'Unknown'} ${meeting.organizer?.lastName || 'Unknown'}`,
        email: meeting.organizer?.email || "",
        rsvp: true,
        partstat: "ACCEPTED" as const,
        role: "CHAIR" as const,
      })

      // Convert dates to ICS format [year, month, day, hour, minute]
      const startDate = new Date(meeting.startDate)
      const endDate = new Date(meeting.endDate)

      const event: EventAttributes = {
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
        ],
        end: [
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
        ],
        title: meeting.title,
        description: meeting.description || "",
        location: meeting.location || "",
        status: meeting.status === MeetingStatus.CANCELLED ? "CANCELLED" : "CONFIRMED",
        organizer: {
          name: `${meeting.organizer?.firstName} ${meeting.organizer?.lastName}`,
          email: meeting.organizer?.email || "",
        },
        attendees,
        uid: `${meeting.id}@medical-crm.com`,
        productId: "//Medical CRM//Meeting//EN",
      }

      const { error, value } = createEvents([event])

      if (error) {
        logger.error("ICS generation error", { error, meetingId: id })
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "ICS_GENERATION_ERROR",
            message: "Failed to generate calendar file",
          },
        }
        return
      }

      // Set headers for file download
      const filename = `meeting_${meeting.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`
      ctx.set("Content-Type", "text/calendar; charset=utf-8")
      ctx.set("Content-Disposition", `attachment; filename="${filename}"`)
      ctx.body = value
    } catch (error) {
      logger.error("Export to ICS failed", { error, meetingId: ctx.params.id })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "ICS_EXPORT_ERROR",
          message: "Failed to export meeting",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }

  // POST /api/meetings/:id/send-invitation - Send meeting invitation by email
  static async sendInvitation(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { id } = ctx.params
      const { emails } = ctx.request.body as { emails?: string[] }

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
            attributes: ["id", "name"],
          },
          {
            model: MeetingParticipant,
            as: "participants",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
              },
              {
                model: ContactPerson,
                as: "contactPerson",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
              },
            ],
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

      const canEdit = await meeting.canUserEdit(user.id)
      if (!canEdit) {
        ctx.status = 403
        ctx.body = {
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: "You don't have permission to send invitations",
          },
        }
        return
      }

      // Generate .ics file
      const attendees: Attendee[] = meeting.participants?.map((p) => {
        const isUser = !!p.user
        const firstName = isUser ? p.user?.firstName : p.contactPerson?.firstName
        const lastName = isUser ? p.user?.lastName : p.contactPerson?.lastName
        const email = isUser ? p.user?.email : p.contactPerson?.email

        // Fallback to 'Unknown' if firstName or lastName is undefined
        const displayName = `${firstName || 'Unknown'} ${lastName || 'Unknown'}`

        return {
          name: displayName,
          email: email || "",
          rsvp: true,
          partstat: "NEEDS-ACTION" as const,
          role: "REQ-PARTICIPANT" as const,
        }
      }) || []

      // Add organizer with fallback for undefined values
      const organizerName = `${meeting.organizer?.firstName || 'Unknown'} ${meeting.organizer?.lastName || 'Unknown'}`
      attendees.push({
        name: organizerName,
        email: meeting.organizer?.email || "",
        rsvp: true,
        partstat: "ACCEPTED" as const,
        role: "CHAIR" as const,
      })

      const startDate = new Date(meeting.startDate)
      const endDate = new Date(meeting.endDate)

      const event: EventAttributes = {
        start: [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes(),
        ],
        end: [
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes(),
        ],
        title: meeting.title,
        description: meeting.description || "",
        location: meeting.location || "",
        status: "CONFIRMED",
        organizer: {
          name: `${meeting.organizer?.firstName} ${meeting.organizer?.lastName}`,
          email: meeting.organizer?.email || "",
        },
        attendees,
        uid: `${meeting.id}@medical-crm.com`,
        productId: "//Medical CRM//Meeting//EN",
      }

      const { error, value } = createEvents([event])

      if (error) {
        logger.error("ICS generation error for invitation", { error, meetingId: id })
        ctx.status = 500
        ctx.body = {
          success: false,
          error: {
            code: "ICS_GENERATION_ERROR",
            message: "Failed to generate calendar invitation",
          },
        }
        return
      }

      // Determine recipients
      let recipients: string[] = []
      if (emails && emails.length > 0) {
        recipients = emails
      } else {
        // Send to all participants (both users and contact persons)
        recipients = meeting.participants
          ?.map((p) => p.user?.email || p.contactPerson?.email)
          .filter((email): email is string => !!email) || []
      }

      if (recipients.length === 0) {
        ctx.status = 400
        ctx.body = {
          success: false,
          error: {
            code: "NO_RECIPIENTS",
            message: "No email recipients specified",
          },
        }
        return
      }

      // Send emails
      const emailService = new EmailService()
      const startTime = startDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      const endTime = endDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
      const dateStr = startDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      const htmlBody = `
        <h2>Invitation : ${meeting.title}</h2>
        <p>Vous êtes invité(e) à la réunion suivante :</p>
        <table style="border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Date :</td>
            <td style="padding: 8px;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Heure :</td>
            <td style="padding: 8px;">${startTime} - ${endTime}</td>
          </tr>
          ${meeting.location ? `<tr>
            <td style="padding: 8px; font-weight: bold;">Lieu :</td>
            <td style="padding: 8px;">${meeting.location}</td>
          </tr>` : ""}
          ${meeting.institution ? `<tr>
            <td style="padding: 8px; font-weight: bold;">Institution :</td>
            <td style="padding: 8px;">${meeting.institution.name}</td>
          </tr>` : ""}
        </table>
        ${meeting.description ? `<p><strong>Description :</strong><br>${meeting.description}</p>` : ""}
        <p style="margin-top: 20px;">
          <small>Organisé par : ${meeting.organizer?.firstName} ${meeting.organizer?.lastName}</small>
        </p>
        <p style="margin-top: 10px; font-size: 12px; color: #666;">
          Le fichier .ics joint peut être importé dans votre calendrier Outlook, Google Calendar ou tout autre outil compatible.
        </p>
      `

      await emailService.sendEmail({
        to: recipients,
        subject: `Invitation : ${meeting.title}`,
        html: htmlBody,
        attachments: [
          {
            filename: `meeting_${meeting.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`,
            content: Buffer.from(value || "", "utf-8"),
            contentType: "text/calendar; charset=utf-8",
          },
        ],
      })

      logger.info("Meeting invitation sent", {
        meetingId: id,
        recipients,
        organizerId: user.id,
      })

      ctx.body = {
        success: true,
        data: {
          message: "Invitations sent successfully",
          recipients,
        },
      }
    } catch (error) {
      logger.error("Send invitation failed", { error, meetingId: ctx.params.id })
      ctx.status = 500
      ctx.body = {
        success: false,
        error: {
          code: "SEND_INVITATION_ERROR",
          message: "Failed to send invitations",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  }
}

export default MeetingController

