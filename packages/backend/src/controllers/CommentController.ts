import { Context } from "../types/koa"
import { Comment } from "../models/Comment"
import { Meeting } from "../models/Meeting"
import { MeetingParticipant } from "../models/MeetingParticipant"
import { User } from "../models/User"
import { NotificationService, NotificationPriority, NotificationType } from "../services/NotificationService"

export class CommentController {
  // GET /api/meetings/:meetingId/comments - list comments for a meeting
  static async listForMeeting(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { meetingId } = ctx.params

      const meeting = await Meeting.findByPk(meetingId)
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

      const comments = await Comment.findByMeeting(meetingId)
      ctx.body = { success: true, data: comments }
    } catch (error) {
      ctx.status = 500
      ctx.body = { success: false, error: { code: "COMMENT_FETCH_ERROR", message: "Failed to fetch comments" } }
    }
  }

  // POST /api/meetings/:meetingId/comments - create a comment
  static async create(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { meetingId } = ctx.params
      const { content } = ctx.request.body as { content?: string }

      if (!content) {
        ctx.status = 400
        ctx.body = { success: false, error: { code: "VALIDATION_ERROR", message: "Content is required" } }
        return
      }

      const comment = await Comment.createComment(meetingId, user.id, content)

      // Notify meeting participants and organizer (except author)
      const participants = await MeetingParticipant.findByMeeting(meetingId)
      const recipientIds = new Set<string>()
      for (const p of participants) {
        if (p.userId) recipientIds.add(p.userId)
      }
      const meeting = await Meeting.findByPk(meetingId)
      if (meeting) recipientIds.add(meeting.organizerId)
      recipientIds.delete(user.id)

      if (recipientIds.size > 0) {
        const notificationSvc = NotificationService.getInstance()
        await notificationSvc.notifyUsers(Array.from(recipientIds), {
          type: NotificationType.MEETING_COMMENT_ADDED,
          priority: NotificationPriority.LOW,
          title: "New comment on meeting",
          message: `${user.getFullName?.() || "Someone"} commented on "${meeting?.title || "meeting"}"`,
          data: { comment, meetingId },
          senderId: user.id,
          senderName: user.getFullName?.() ?? "Unknown User",
          actionUrl: `/meetings/${meetingId}`,
          actionText: "View Meeting",
        })
      }

      ctx.status = 201
      ctx.body = { success: true, data: comment }
    } catch (error) {
      const message = (error as Error).message
      if (message === "Meeting not found") {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "MEETING_NOT_FOUND", message } }
        return
      }
      if (
        message === "User does not have access to this meeting" ||
        message.includes("permission")
      ) {
        ctx.status = 403
        ctx.body = { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message } }
        return
      }
      ctx.status = 500
      ctx.body = { success: false, error: { code: "COMMENT_CREATE_ERROR", message: "Failed to create comment" } }
    }
  }

  // PUT /api/meetings/:meetingId/comments/:commentId - update a comment
  static async update(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { meetingId, commentId } = ctx.params
      const { content } = ctx.request.body as { content?: string }

      if (!content) {
        ctx.status = 400
        ctx.body = { success: false, error: { code: "VALIDATION_ERROR", message: "Content is required" } }
        return
      }

      const comment = await Comment.findByPk(commentId)
      if (!comment || comment.meetingId !== meetingId) {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "COMMENT_NOT_FOUND", message: "Comment not found" } }
        return
      }

      const updated = await Comment.updateComment(commentId, user.id, content)

      // Notify other attendees
      const participants = await MeetingParticipant.findByMeeting(meetingId)
      const meeting = await Meeting.findByPk(meetingId)
      const recipientIds = new Set<string>()
      for (const p of participants) {
        if (p.userId) recipientIds.add(p.userId)
      }
      if (meeting) recipientIds.add(meeting.organizerId)
      recipientIds.delete(user.id)

      if (recipientIds.size > 0) {
        const notificationSvc = NotificationService.getInstance()
        await notificationSvc.notifyUsers(Array.from(recipientIds), {
          type: NotificationType.MEETING_COMMENT_UPDATED,
          priority: NotificationPriority.LOW,
          title: "Comment updated",
          message: `${user.getFullName?.() || "Someone"} updated a comment on "${meeting?.title || "meeting"}"`,
          data: { comment: updated, meetingId },
          senderId: user.id,
          senderName: user.getFullName?.() ?? "Unknown User",
          actionUrl: `/meetings/${meetingId}`,
          actionText: "View Meeting",
        })
      }

      ctx.body = { success: true, data: updated }
    } catch (error) {
      const message = (error as Error).message
      if (message === "Comment not found") {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "COMMENT_NOT_FOUND", message } }
        return
      }
      if (message.includes("permission")) {
        ctx.status = 403
        ctx.body = { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message } }
        return
      }
      ctx.status = 500
      ctx.body = { success: false, error: { code: "COMMENT_UPDATE_ERROR", message: "Failed to update comment" } }
    }
  }

  // DELETE /api/meetings/:meetingId/comments/:commentId - delete a comment
  static async remove(ctx: Context) {
    try {
      const user = ctx.state.user as User
      const { meetingId, commentId } = ctx.params

      const comment = await Comment.findByPk(commentId)
      if (!comment || comment.meetingId !== meetingId) {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "COMMENT_NOT_FOUND", message: "Comment not found" } }
        return
      }

      await Comment.deleteComment(commentId, user.id)

      // Notify other attendees
      const participants = await MeetingParticipant.findByMeeting(meetingId)
      const meeting = await Meeting.findByPk(meetingId)
      const recipientIds = new Set<string>()
      for (const p of participants) {
        if (p.userId) recipientIds.add(p.userId)
      }
      if (meeting) recipientIds.add(meeting.organizerId)
      recipientIds.delete(user.id)

      if (recipientIds.size > 0) {
        const notificationSvc = NotificationService.getInstance()
        await notificationSvc.notifyUsers(Array.from(recipientIds), {
          type: NotificationType.MEETING_COMMENT_DELETED,
          priority: NotificationPriority.LOW,
          title: "Comment deleted",
          message: `${user.getFullName?.() || "Someone"} deleted a comment on "${meeting?.title || "meeting"}"`,
          data: { commentId, meetingId },
          senderId: user.id,
          senderName: user.getFullName?.() ?? "Unknown User",
          actionUrl: `/meetings/${meetingId}`,
          actionText: "View Meeting",
        })
      }

      ctx.body = { success: true }
    } catch (error) {
      const message = (error as Error).message
      if (message === "Comment not found") {
        ctx.status = 404
        ctx.body = { success: false, error: { code: "COMMENT_NOT_FOUND", message } }
        return
      }
      if (message.includes("permission")) {
        ctx.status = 403
        ctx.body = { success: false, error: { code: "INSUFFICIENT_PERMISSIONS", message } }
        return
      }
      ctx.status = 500
      ctx.body = { success: false, error: { code: "COMMENT_DELETE_ERROR", message: "Failed to delete comment" } }
    }
  }
}

export default CommentController

