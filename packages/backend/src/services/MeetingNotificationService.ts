import { ParticipantStatus, MeetingStatus } from "@medical-crm/shared"
import { Meeting } from "../models/Meeting"
import { MeetingParticipant } from "../models/MeetingParticipant"
import { Comment } from "../models/Comment"
import { User } from "../models/User"
import { logger } from "../utils/logger"
import { NotificationService, NotificationType, NotificationPriority } from "./NotificationService"

export class MeetingNotificationService {
  private static instance: MeetingNotificationService
  private notificationService: NotificationService

  private constructor() {
    this.notificationService = NotificationService.getInstance()
  }

  public static getInstance(): MeetingNotificationService {
    if (!MeetingNotificationService.instance) {
      MeetingNotificationService.instance = new MeetingNotificationService()
    }
    return MeetingNotificationService.instance
  }

  /**
   * Notify participants when a meeting is created
   */
  public async notifyMeetingCreated(meeting: Meeting, organizer: User): Promise<void> {
    try {
      const participants = await MeetingParticipant.findAll({
        where: { meetingId: meeting.id },
        include: [{ model: User, as: "user" }]
      })

      // Filter out the organizer from participants list
      const participantsToNotify = participants.filter(p => p.userId !== organizer.id)

      if (participantsToNotify.length === 0) {
        return
      }

      const participantIds = participantsToNotify.map(p => p.userId).filter((id): id is string => !!id)

      await this.notificationService.notifyUsers(participantIds, {
        type: NotificationType.MEETING_CREATED,
        priority: NotificationPriority.MEDIUM,
        title: "New Meeting Created",
        message: `${organizer.getFullName()} created a meeting: "${meeting.title}"`,
        meetingId: meeting.id,
        userId: organizer.id,
        institutionId: meeting.institutionId,
        senderId: organizer.id,
        senderName: organizer.getFullName(),
        actionUrl: `/meetings/${meeting.id}`,
        actionText: "View Meeting",
        data: {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            startDate: meeting.startDate,
            endDate: meeting.endDate,
            location: meeting.location,
            status: meeting.status,
          },
          organizer: {
            id: organizer.id,
            name: organizer.getFullName(),
          },
        },
      })

      logger.info("Meeting creation notifications sent", {
        meetingId: meeting.id,
        participantCount: participantsToNotify.length,
        organizerId: organizer.id,
      })
    } catch (error) {
      logger.error("Failed to send meeting creation notifications", { error, meetingId: meeting.id })
    }
  }

  /**
   * Notify participants when meeting invitations are sent
   */
  public async notifyMeetingInvitations(meeting: Meeting, organizer: User, newParticipantIds: string[]): Promise<void> {
    try {
      if (newParticipantIds.length === 0) {
        return
      }

      await this.notificationService.notifyUsers(newParticipantIds, {
        type: NotificationType.MEETING_INVITATION_SENT,
        priority: NotificationPriority.HIGH,
        title: "Meeting Invitation",
        message: `You've been invited to a meeting: "${meeting.title}"`,
        meetingId: meeting.id,
        userId: organizer.id,
        institutionId: meeting.institutionId,
        senderId: organizer.id,
        senderName: organizer.getFullName(),
        actionUrl: `/meetings/${meeting.id}`,
        actionText: "Respond to Invitation",
        data: {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            description: meeting.description,
            startDate: meeting.startDate,
            endDate: meeting.endDate,
            location: meeting.location,
            status: meeting.status,
          },
          organizer: {
            id: organizer.id,
            name: organizer.getFullName(),
          },
        },
      })

      logger.info("Meeting invitation notifications sent", {
        meetingId: meeting.id,
        participantCount: newParticipantIds.length,
        organizerId: organizer.id,
      })
    } catch (error) {
      logger.error("Failed to send meeting invitation notifications", { error, meetingId: meeting.id })
    }
  }

  /**
   * Notify organizer and participants when invitation response is received
   */
  public async notifyInvitationResponse(meeting: Meeting, participant: MeetingParticipant, user: User): Promise<void> {
    try {
      const organizer = await User.findByPk(meeting.organizerId)
      if (!organizer || organizer.id === user.id) {
        return
      }

      const isAccepted = participant.status === ParticipantStatus.ACCEPTED
      const title = isAccepted ? "Meeting Invitation Accepted" : "Meeting Invitation Declined"
      const message = `${user.getFullName()} ${isAccepted ? "accepted" : "declined"} the invitation for "${meeting.title}"`

      await this.notificationService.notifyUser(organizer.id, {
        type: isAccepted ? NotificationType.MEETING_INVITATION_ACCEPTED : NotificationType.MEETING_INVITATION_DECLINED,
        priority: NotificationPriority.MEDIUM,
        title,
        message,
        meetingId: meeting.id,
        userId: user.id,
        institutionId: meeting.institutionId,
        senderId: user.id,
        senderName: user.getFullName(),
        actionUrl: `/meetings/${meeting.id}`,
        actionText: "View Meeting",
        data: {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            startDate: meeting.startDate,
          },
          participant: {
            id: user.id,
            name: user.getFullName(),
            status: participant.status,
          },
        },
      })

      // Also notify other participants if it's acceptance
      if (isAccepted) {
        const otherParticipants = await MeetingParticipant.findAll({
          where: { 
            meetingId: meeting.id,
            userId: { [require('sequelize').Op.not]: user.id }
          }
        })

        const otherParticipantIds = otherParticipants
          .filter(p => p.userId !== organizer.id)
          .map(p => p.userId)
          .filter((id): id is string => !!id)

        if (otherParticipantIds.length > 0) {
          await this.notificationService.notifyUsers(otherParticipantIds, {
            type: NotificationType.MEETING_INVITATION_ACCEPTED,
            priority: NotificationPriority.LOW,
            title: "Meeting Participant Confirmed",
            message: `${user.getFullName()} will attend "${meeting.title}"`,
            meetingId: meeting.id,
            userId: user.id,
            institutionId: meeting.institutionId,
            senderId: user.id,
            senderName: user.getFullName(),
            actionUrl: `/meetings/${meeting.id}`,
            actionText: "View Meeting",
            data: {
              meeting: {
                id: meeting.id,
                title: meeting.title,
                startDate: meeting.startDate,
              },
              participant: {
                id: user.id,
                name: user.getFullName(),
                status: participant.status,
              },
            },
          })
        }
      }

      logger.info("Meeting invitation response notification sent", {
        meetingId: meeting.id,
        userId: user.id,
        status: participant.status,
        organizerId: organizer.id,
      })
    } catch (error) {
      logger.error("Failed to send invitation response notification", { error, meetingId: meeting.id })
    }
  }

  /**
   * Notify participants when a meeting is updated
   */
  public async notifyMeetingUpdated(meeting: Meeting, updatedBy: User, changes: string[]): Promise<void> {
    try {
      const participants = await MeetingParticipant.findAll({
        where: { meetingId: meeting.id },
      })

      // Filter out the person who made the changes
      const participantsToNotify = participants.filter(p => p.userId !== updatedBy.id)

      if (participantsToNotify.length === 0) {
        return
      }

      const participantIds = participantsToNotify.map(p => p.userId).filter((id): id is string => !!id)

      await this.notificationService.notifyUsers(participantIds, {
        type: NotificationType.MEETING_UPDATED,
        priority: NotificationPriority.MEDIUM,
        title: "Meeting Updated",
        message: `${updatedBy.getFullName()} updated the meeting "${meeting.title}": ${changes.join(", ")}`,
        meetingId: meeting.id,
        userId: updatedBy.id,
        institutionId: meeting.institutionId,
        senderId: updatedBy.id,
        senderName: updatedBy.getFullName(),
        actionUrl: `/meetings/${meeting.id}`,
        actionText: "View Changes",
        data: {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            startDate: meeting.startDate,
            endDate: meeting.endDate,
            location: meeting.location,
            status: meeting.status,
          },
          changes,
          updatedBy: {
            id: updatedBy.id,
            name: updatedBy.getFullName(),
          },
        },
      })

      logger.info("Meeting update notifications sent", {
        meetingId: meeting.id,
        participantCount: participantsToNotify.length,
        changes,
        updatedBy: updatedBy.id,
      })
    } catch (error) {
      logger.error("Failed to send meeting update notifications", { error, meetingId: meeting.id })
    }
  }

  /**
   * Notify participants when a meeting is cancelled
   */
  public async notifyMeetingCancelled(meeting: Meeting, cancelledBy: User, reason?: string): Promise<void> {
    try {
      const participants = await MeetingParticipant.findAll({
        where: { meetingId: meeting.id },
      })

      // Filter out the person who cancelled
      const participantsToNotify = participants.filter(p => p.userId !== cancelledBy.id)

      if (participantsToNotify.length === 0) {
        return
      }

      const participantIds = participantsToNotify.map(p => p.userId).filter((id): id is string => !!id)
      const message = reason 
        ? `${cancelledBy.getFullName()} cancelled the meeting "${meeting.title}". Reason: ${reason}`
        : `${cancelledBy.getFullName()} cancelled the meeting "${meeting.title}"`

      await this.notificationService.notifyUsers(participantIds, {
        type: NotificationType.MEETING_CANCELLED,
        priority: NotificationPriority.HIGH,
        title: "Meeting Cancelled",
        message,
        meetingId: meeting.id,
        userId: cancelledBy.id,
        institutionId: meeting.institutionId,
        senderId: cancelledBy.id,
        senderName: cancelledBy.getFullName(),
        actionUrl: `/meetings/${meeting.id}`,
        actionText: "View Details",
        data: {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            startDate: meeting.startDate,
            endDate: meeting.endDate,
            location: meeting.location,
            status: meeting.status,
          },
          reason,
          cancelledBy: {
            id: cancelledBy.id,
            name: cancelledBy.getFullName(),
          },
        },
      })

      logger.info("Meeting cancellation notifications sent", {
        meetingId: meeting.id,
        participantCount: participantsToNotify.length,
        reason,
        cancelledBy: cancelledBy.id,
      })
    } catch (error) {
      logger.error("Failed to send meeting cancellation notifications", { error, meetingId: meeting.id })
    }
  }

  /**
   * Send meeting reminder notifications
   */
  public async sendMeetingReminders(meeting: Meeting, minutesUntilStart: number): Promise<void> {
    try {
      const participants = await MeetingParticipant.findAll({
        where: { 
          meetingId: meeting.id,
          status: ParticipantStatus.ACCEPTED
        },
      })

      if (participants.length === 0) {
        return
      }

      const participantIds = participants.map(p => p.userId).filter((id): id is string => !!id)
      const timeText = minutesUntilStart < 60 
        ? `${minutesUntilStart} minute${minutesUntilStart > 1 ? "s" : ""}`
        : `${Math.floor(minutesUntilStart / 60)} hour${Math.floor(minutesUntilStart / 60) > 1 ? "s" : ""}`

      await this.notificationService.notifyUsers(participantIds, {
        type: NotificationType.MEETING_REMINDER,
        priority: NotificationPriority.HIGH,
        title: "Meeting Reminder",
        message: `Meeting "${meeting.title}" starts in ${timeText}`,
        meetingId: meeting.id,
        institutionId: meeting.institutionId,
        actionUrl: `/meetings/${meeting.id}`,
        actionText: "Join Meeting",
        data: {
          meeting: {
            id: meeting.id,
            title: meeting.title,
            startDate: meeting.startDate,
            endDate: meeting.endDate,
            location: meeting.location,
            status: meeting.status,
          },
          minutesUntilStart,
        },
      })

      logger.info("Meeting reminder notifications sent", {
        meetingId: meeting.id,
        participantCount: participants.length,
        minutesUntilStart,
      })
    } catch (error) {
      logger.error("Failed to send meeting reminder notifications", { error, meetingId: meeting.id })
    }
  }

  /**
   * Notify participants when a comment is added to a meeting
   */
  public async notifyCommentAdded(comment: Comment, meeting: Meeting, author: User): Promise<void> {
    try {
      const participants = await MeetingParticipant.findAll({
        where: { meetingId: meeting.id },
      })

      // Filter out the comment author
      const participantsToNotify = participants.filter(p => p.userId !== author.id)

      if (participantsToNotify.length === 0) {
        return
      }

      const participantIds = participantsToNotify.map(p => p.userId).filter((id): id is string => !!id)

      await this.notificationService.notifyUsers(participantIds, {
        type: NotificationType.MEETING_COMMENT_ADDED,
        priority: NotificationPriority.MEDIUM,
        title: "New Meeting Comment",
        message: `${author.getFullName()} commented on the meeting "${meeting.title}"`,
        meetingId: meeting.id,
        commentId: comment.id,
        userId: author.id,
        institutionId: meeting.institutionId,
        senderId: author.id,
        senderName: author.getFullName(),
        actionUrl: `/meetings/${meeting.id}#comment-${comment.id}`,
        actionText: "View Comment",
        data: {
          comment: {
            id: comment.id,
            content: comment.content.length > 100 ? comment.content.substring(0, 100) + "..." : comment.content,
            createdAt: comment.createdAt,
          },
          meeting: {
            id: meeting.id,
            title: meeting.title,
          },
          author: {
            id: author.id,
            name: author.getFullName(),
          },
        },
      })

      logger.info("Meeting comment notification sent", {
        meetingId: meeting.id,
        commentId: comment.id,
        participantCount: participantsToNotify.length,
        authorId: author.id,
      })
    } catch (error) {
      logger.error("Failed to send meeting comment notification", { error, commentId: comment.id })
    }
  }

  /**
   * Notify participants when a comment is updated
   */
  public async notifyCommentUpdated(comment: Comment, meeting: Meeting, updatedBy: User): Promise<void> {
    try {
      const participants = await MeetingParticipant.findAll({
        where: { meetingId: meeting.id },
      })

      // Filter out the person who updated the comment
      const participantsToNotify = participants.filter(p => p.userId !== updatedBy.id)

      if (participantsToNotify.length === 0) {
        return
      }

      const participantIds = participantsToNotify.map(p => p.userId).filter((id): id is string => !!id)

      await this.notificationService.notifyUsers(participantIds, {
        type: NotificationType.MEETING_COMMENT_UPDATED,
        priority: NotificationPriority.LOW,
        title: "Meeting Comment Updated",
        message: `${updatedBy.getFullName()} updated a comment on the meeting "${meeting.title}"`,
        meetingId: meeting.id,
        commentId: comment.id,
        userId: updatedBy.id,
        institutionId: meeting.institutionId,
        senderId: updatedBy.id,
        senderName: updatedBy.getFullName(),
        actionUrl: `/meetings/${meeting.id}#comment-${comment.id}`,
        actionText: "View Comment",
        data: {
          comment: {
            id: comment.id,
            content: comment.content.length > 100 ? comment.content.substring(0, 100) + "..." : comment.content,
            updatedAt: comment.updatedAt,
          },
          meeting: {
            id: meeting.id,
            title: meeting.title,
          },
          updatedBy: {
            id: updatedBy.id,
            name: updatedBy.getFullName(),
          },
        },
      })

      logger.info("Meeting comment update notification sent", {
        meetingId: meeting.id,
        commentId: comment.id,
        participantCount: participantsToNotify.length,
        updatedBy: updatedBy.id,
      })
    } catch (error) {
      logger.error("Failed to send meeting comment update notification", { error, commentId: comment.id })
    }
  }

  /**
   * Check for upcoming meetings and send reminder notifications
   */
  public async checkAndSendMeetingReminders(): Promise<void> {
    try {
      logger.info("Starting meeting reminder check")

      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + (60 * 60 * 1000))
      const fifteenMinutesFromNow = new Date(now.getTime() + (15 * 60 * 1000))

      // Find meetings starting within the next hour
      const upcomingMeetings = await Meeting.findAll({
        where: {
          startDate: {
            [require('sequelize').Op.between]: [now, oneHourFromNow]
          },
          status: MeetingStatus.SCHEDULED
        }
      })

      for (const meeting of upcomingMeetings) {
        const minutesUntilStart = Math.floor((meeting.startDate.getTime() - now.getTime()) / (1000 * 60))
        
        // Send reminders at 60 minutes, 30 minutes, and 15 minutes
        if (
          (minutesUntilStart <= 60 && minutesUntilStart > 55) ||
          (minutesUntilStart <= 30 && minutesUntilStart > 25) ||
          (minutesUntilStart <= 15 && minutesUntilStart > 10)
        ) {
          await this.sendMeetingReminders(meeting, minutesUntilStart)
        }
      }

      logger.info("Meeting reminder check completed", {
        upcomingMeetingsCount: upcomingMeetings.length,
      })
    } catch (error) {
      logger.error("Failed to check and send meeting reminders", { error })
    }
  }

  /**
   * Start periodic meeting reminder checking (should be called on app startup)
   */
  public startPeriodicReminderCheck(intervalMinutes: number = 5): void {
    logger.info("Starting periodic meeting reminder check", { intervalMinutes })

    const intervalMs = intervalMinutes * 60 * 1000
    
    // Initial check
    this.checkAndSendMeetingReminders()

    // Set up periodic checking
    setInterval(() => {
      this.checkAndSendMeetingReminders()
    }, intervalMs)
  }
}
