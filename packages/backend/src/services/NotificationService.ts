import { User } from "../models/User"
import { logger } from "../utils/logger"
import { SocketService } from "./SocketService"

export enum NotificationType {
  // Task notifications
  TASK_ASSIGNED = "task_assigned",
  TASK_STATUS_CHANGED = "task_status_changed",
  TASK_DUE_SOON = "task_due_soon",
  TASK_OVERDUE = "task_overdue",
  TASK_COMPLETED = "task_completed",

  // Medical institution notifications
  INSTITUTION_CREATED = "institution_created",
  INSTITUTION_UPDATED = "institution_updated",
  INSTITUTION_ASSIGNED = "institution_assigned",
  INSTITUTION_IMPORTED = "institution_imported",

  // Team notifications
  TEAM_MEMBER_ADDED = "team_member_added",
  TEAM_MEMBER_REMOVED = "team_member_removed",
  TEAM_ACTIVITY = "team_activity",

  // System notifications
  SYSTEM_MAINTENANCE = "system_maintenance",
  SYSTEM_UPDATE = "system_update",
  SYSTEM_ALERT = "system_alert",

  // User notifications
  USER_MENTIONED = "user_mentioned",
  USER_MESSAGE = "user_message",

  // Billing notifications
  QUOTE_CREATED = "quote_created",
  QUOTE_ACCEPTED = "quote_accepted",
  QUOTE_REJECTED = "quote_rejected",
  INVOICE_CREATED = "invoice_created",
  PAYMENT_RECEIVED = "payment_received",
  INVOICE_OVERDUE = "invoice_overdue",

  // Meeting comments
  MEETING_COMMENT_ADDED = "meeting_comment_added",
  MEETING_COMMENT_UPDATED = "meeting_comment_updated",
  MEETING_COMMENT_DELETED = "meeting_comment_deleted",

  // Reminder notifications
  REMINDER_CREATED = "reminder_created",
  REMINDER_DUE_SOON = "reminder_due_soon",
  REMINDER_OVERDUE = "reminder_overdue",
  REMINDER_COMPLETED = "reminder_completed",
  REMINDER_SNOOZED = "reminder_snoozed",
  REMINDER_RESCHEDULED = "reminder_rescheduled",
}

export enum NotificationPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export interface NotificationData {
  id?: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  data?: any
  userId?: string
  teamId?: string
  institutionId?: string
  taskId?: string
  reminderId?: string
  senderId?: string
  senderName?: string
  timestamp?: string
  expiresAt?: string
  actionUrl?: string
  actionText?: string
}

export interface NotificationRecipient {
  userId: string
  teamId?: string
  role?: string
}

export class NotificationService {
  private static instance: NotificationService
  private socketService: SocketService

  private constructor() {
    this.socketService = SocketService.getInstance()
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Send notification to a specific user
   */
  public async notifyUser(userId: string, notification: NotificationData): Promise<void> {
    const enrichedNotification = this.enrichNotification(notification)

    this.socketService.notifyUser(userId, "notification", enrichedNotification)

    logger.info("User notification sent", {
      userId,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
    })
  }

  /**
   * Send notification to multiple users
   */
  public async notifyUsers(
    userIds: string[],
    notification: NotificationData
  ): Promise<void> {
    const enrichedNotification = this.enrichNotification(notification)

    for (const userId of userIds) {
      this.socketService.notifyUser(userId, "notification", enrichedNotification)
    }

    logger.info("Multiple user notifications sent", {
      userCount: userIds.length,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
    })
  }

  /**
   * Send notification to a team
   */
  public async notifyTeam(teamId: string, notification: NotificationData): Promise<void> {
    const enrichedNotification = this.enrichNotification(notification)

    this.socketService.notifyTeam(teamId, "notification", enrichedNotification)

    logger.info("Team notification sent", {
      teamId,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
    })
  }

  /**
   * Broadcast notification to all connected users
   */
  public async broadcast(notification: NotificationData): Promise<void> {
    const enrichedNotification = this.enrichNotification(notification)

    this.socketService.broadcast("notification", enrichedNotification)

    logger.info("Broadcast notification sent", {
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
    })
  }

  /**
   * Task-specific notification methods
   */
  public async notifyTaskAssigned(
    assigneeId: string,
    taskData: any,
    assignedBy: User
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.TASK_ASSIGNED,
      priority: NotificationPriority.MEDIUM,
      title: "New Task Assigned",
      message: `You have been assigned a new task: "${taskData.title}"`,
      data: {
        task: taskData,
        assignedBy: {
          id: assignedBy.id,
          name: assignedBy.getFullName(),
        },
      },
      taskId: taskData.id,
      senderId: assignedBy.id,
      senderName: assignedBy.getFullName(),
      actionUrl: `/tasks/${taskData.id}`,
      actionText: "View Task",
    }

    await this.notifyUser(assigneeId, notification)

    // Also notify team members about the assignment
    if (assignedBy.teamId) {
      const teamNotification: NotificationData = {
        ...notification,
        type: NotificationType.TEAM_ACTIVITY,
        title: "Task Assignment",
        message: `${assignedBy.getFullName()} assigned a task to a team member`,
        priority: NotificationPriority.LOW,
      }

      await this.notifyTeam(assignedBy.teamId, teamNotification)
    }
  }

  public async notifyTaskStatusChanged(
    taskData: any,
    oldStatus: string,
    newStatus: string,
    changedBy: User
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.TASK_STATUS_CHANGED,
      priority:
        newStatus === "completed"
          ? NotificationPriority.MEDIUM
          : NotificationPriority.LOW,
      title: "Task Status Updated",
      message: `Task "${taskData.title}" status changed from ${oldStatus} to ${newStatus}`,
      data: {
        task: taskData,
        oldStatus,
        newStatus,
        changedBy: {
          id: changedBy.id,
          name: changedBy.getFullName(),
        },
      },
      taskId: taskData.id,
      senderId: changedBy.id,
      senderName: changedBy.getFullName(),
      actionUrl: `/tasks/${taskData.id}`,
      actionText: "View Task",
    }

    // Notify assignee if different from the person who changed it
    if (taskData.assigneeId && taskData.assigneeId !== changedBy.id) {
      await this.notifyUser(taskData.assigneeId, notification)
    }

    // Notify team about task completion
    if (newStatus === "completed" && changedBy.teamId) {
      const teamNotification: NotificationData = {
        ...notification,
        type: NotificationType.TEAM_ACTIVITY,
        title: "Task Completed",
        message: `${changedBy.getFullName()} completed task "${taskData.title}"`,
        priority: NotificationPriority.LOW,
      }

      await this.notifyTeam(changedBy.teamId, teamNotification)
    }
  }

  /**
   * Medical institution notification methods
   */
  public async notifyInstitutionCreated(
    institutionData: any,
    createdBy: User
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.INSTITUTION_CREATED,
      priority: NotificationPriority.LOW,
      title: "New Medical Institution Added",
      message: `${createdBy.getFullName()} added a new medical institution: "${
        institutionData.name
      }"`,
      data: {
        institution: institutionData,
        createdBy: {
          id: createdBy.id,
          name: createdBy.getFullName(),
        },
      },
      institutionId: institutionData.id,
      senderId: createdBy.id,
      senderName: createdBy.getFullName(),
      actionUrl: `/institutions/${institutionData.id}`,
      actionText: "View Institution",
    }

    // Notify team members
    if (createdBy.teamId) {
      await this.notifyTeam(createdBy.teamId, notification)
    }
  }

  public async notifyInstitutionUpdated(
    institutionData: any,
    updatedBy: User,
    changes: string[]
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.INSTITUTION_UPDATED,
      priority: NotificationPriority.LOW,
      title: "Medical Institution Updated",
      message: `${updatedBy.getFullName()} updated "${
        institutionData.name
      }": ${changes.join(", ")}`,
      data: {
        institution: institutionData,
        changes,
        updatedBy: {
          id: updatedBy.id,
          name: updatedBy.getFullName(),
        },
      },
      institutionId: institutionData.id,
      senderId: updatedBy.id,
      senderName: updatedBy.getFullName(),
      actionUrl: `/institutions/${institutionData.id}`,
      actionText: "View Institution",
    }

    // Notify assigned user if different from updater
    if (
      institutionData.assignedUserId &&
      institutionData.assignedUserId !== updatedBy.id
    ) {
      await this.notifyUser(institutionData.assignedUserId, notification)
    }

    // Notify team members
    if (updatedBy.teamId) {
      await this.notifyTeam(updatedBy.teamId, notification)
    }
  }

  public async notifyInstitutionAssigned(
    institutionData: any,
    assigneeId: string,
    assignedBy: User
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.INSTITUTION_ASSIGNED,
      priority: NotificationPriority.MEDIUM,
      title: "Medical Institution Assigned",
      message: `You have been assigned to manage "${institutionData.name}"`,
      data: {
        institution: institutionData,
        assignedBy: {
          id: assignedBy.id,
          name: assignedBy.getFullName(),
        },
      },
      institutionId: institutionData.id,
      senderId: assignedBy.id,
      senderName: assignedBy.getFullName(),
      actionUrl: `/institutions/${institutionData.id}`,
      actionText: "View Institution",
    }

    await this.notifyUser(assigneeId, notification)
  }

  /**
   * Team activity notification methods
   */
  public async notifyTeamMemberAdded(
    teamId: string,
    newMember: User,
    addedBy: User
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.TEAM_MEMBER_ADDED,
      priority: NotificationPriority.LOW,
      title: "New Team Member",
      message: `${newMember.getFullName()} has joined the team`,
      data: {
        newMember: {
          id: newMember.id,
          name: newMember.getFullName(),
          email: newMember.email,
        },
        addedBy: {
          id: addedBy.id,
          name: addedBy.getFullName(),
        },
      },
      senderId: addedBy.id,
      senderName: addedBy.getFullName(),
      actionUrl: `/team`,
      actionText: "View Team",
    }

    await this.notifyTeam(teamId, notification)
  }

  /**
   * System notification methods
   */
  public async notifySystemMaintenance(
    title: string,
    message: string,
    scheduledTime: Date
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.SYSTEM_MAINTENANCE,
      priority: NotificationPriority.HIGH,
      title,
      message,
      data: {
        scheduledTime: scheduledTime.toISOString(),
      },
      expiresAt: scheduledTime.toISOString(),
    }

    await this.broadcast(notification)
  }

  /**
   * Billing notification methods
   */
  public async notifyQuoteCreated(
    quoteData: any,
    createdBy: User,
    institutionData: any
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.QUOTE_CREATED,
      priority: NotificationPriority.MEDIUM,
      title: "New Quote Created",
      message: `Quote #${quoteData.quoteNumber} created for ${institutionData.name}`,
      data: {
        quote: quoteData,
        institution: institutionData,
        createdBy: {
          id: createdBy.id,
          name: createdBy.getFullName(),
        },
      },
      senderId: createdBy.id,
      senderName: createdBy.getFullName(),
      actionUrl: `/quotes/${quoteData.id}`,
      actionText: "View Quote",
    }

    // Notify team members
    if (createdBy.teamId) {
      await this.notifyTeam(createdBy.teamId, notification)
    }
  }

  public async notifyQuoteSent(quoteData: any, sentBy: User): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.QUOTE_CREATED,
      priority: NotificationPriority.MEDIUM,
      title: "Quote Sent",
      message: `Quote #${quoteData.quoteNumber} has been sent to ${
        quoteData.institution?.name || "client"
      }`,
      data: {
        quote: quoteData,
        sentBy: {
          id: sentBy.id,
          name: sentBy.getFullName(),
        },
      },
      senderId: sentBy.id,
      senderName: sentBy.getFullName(),
      actionUrl: `/quotes/${quoteData.id}`,
      actionText: "View Quote",
    }

    // Notify team members
    if (sentBy.teamId) {
      await this.notifyTeam(sentBy.teamId, notification)
    }
  }

  public async notifyQuoteAccepted(quoteData: any): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.QUOTE_ACCEPTED,
      priority: NotificationPriority.HIGH,
      title: "Quote Accepted",
      message: `Quote #${quoteData.quoteNumber} has been accepted by ${
        quoteData.institution?.name || "client"
      }`,
      data: {
        quote: quoteData,
      },
      actionUrl: `/quotes/${quoteData.id}`,
      actionText: "View Quote",
    }

    // Notify assigned user
    if (quoteData.assignedUserId) {
      await this.notifyUser(quoteData.assignedUserId, notification)
    }

    // Notify team members if assigned user has a team
    if (quoteData.assignedUser?.teamId) {
      await this.notifyTeam(quoteData.assignedUser.teamId, notification)
    }
  }

  public async notifyQuoteRejected(quoteData: any): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.QUOTE_REJECTED,
      priority: NotificationPriority.MEDIUM,
      title: "Quote Rejected",
      message: `Quote #${quoteData.quoteNumber} has been rejected by ${
        quoteData.institution?.name || "client"
      }`,
      data: {
        quote: quoteData,
        clientComments: quoteData.clientComments,
      },
      actionUrl: `/quotes/${quoteData.id}`,
      actionText: "View Quote",
    }

    // Notify assigned user
    if (quoteData.assignedUserId) {
      await this.notifyUser(quoteData.assignedUserId, notification)
    }

    // Notify team members if assigned user has a team
    if (quoteData.assignedUser?.teamId) {
      await this.notifyTeam(quoteData.assignedUser.teamId, notification)
    }
  }

  public async notifyPaymentReceived(
    paymentData: any,
    invoiceData: any,
    institutionData: any
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.PAYMENT_RECEIVED,
      priority: NotificationPriority.MEDIUM,
      title: "Payment Received",
      message: `Payment of $${paymentData.amount} received for invoice #${invoiceData.invoiceNumber}`,
      data: {
        payment: paymentData,
        invoice: invoiceData,
        institution: institutionData,
      },
      actionUrl: `/invoices/${invoiceData.id}`,
      actionText: "View Invoice",
    }

    // Notify assigned user
    if (invoiceData.assignedUserId) {
      await this.notifyUser(invoiceData.assignedUserId, notification)
    }

    // Notify team if assigned user has a team
    // This would require fetching the user to get their team, but for now we'll skip
  }

  /**
   * Invoice notification methods
   */
  public async notifyInvoiceCreated(
    invoiceData: any,
    createdBy: User,
    institutionData: any
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.INVOICE_CREATED,
      priority: NotificationPriority.MEDIUM,
      title: "New Invoice Created",
      message: `Invoice #${invoiceData.invoiceNumber} created for ${institutionData.name}`,
      data: {
        invoice: invoiceData,
        institution: institutionData,
        createdBy: {
          id: createdBy.id,
          name: createdBy.getFullName(),
        },
      },
      senderId: createdBy.id,
      senderName: createdBy.getFullName(),
      actionUrl: `/invoices/${invoiceData.id}`,
      actionText: "View Invoice",
    }

    // Notify team members
    if (createdBy.teamId) {
      await this.notifyTeam(createdBy.teamId, notification)
    }
  }

  public async notifyInvoiceSent(invoiceData: any, sentBy: User): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.INVOICE_CREATED,
      priority: NotificationPriority.MEDIUM,
      title: "Invoice Sent",
      message: `Invoice #${invoiceData.invoiceNumber} has been sent to ${
        invoiceData.institution?.name || "client"
      }`,
      data: {
        invoice: invoiceData,
        sentBy: {
          id: sentBy.id,
          name: sentBy.getFullName(),
        },
      },
      senderId: sentBy.id,
      senderName: sentBy.getFullName(),
      actionUrl: `/invoices/${invoiceData.id}`,
      actionText: "View Invoice",
    }

    // Notify team members
    if (sentBy.teamId) {
      await this.notifyTeam(sentBy.teamId, notification)
    }
  }

  public async notifyPaymentRecorded(paymentData: any, recordedBy: User): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.PAYMENT_RECEIVED,
      priority: NotificationPriority.MEDIUM,
      title: "Payment Recorded",
      message: `Payment of ${paymentData.amount} recorded for invoice #${
        paymentData.invoice?.invoiceNumber || "N/A"
      }`,
      data: {
        payment: paymentData,
        recordedBy: {
          id: recordedBy.id,
          name: recordedBy.getFullName(),
        },
      },
      senderId: recordedBy.id,
      senderName: recordedBy.getFullName(),
      actionUrl: `/invoices/${paymentData.invoiceId}`,
      actionText: "View Invoice",
    }

    // Notify team members
    if (recordedBy.teamId) {
      await this.notifyTeam(recordedBy.teamId, notification)
    }
  }

  public async notifyPaymentConfirmed(
    paymentData: any,
    confirmedBy: User
  ): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.PAYMENT_RECEIVED,
      priority: NotificationPriority.HIGH,
      title: "Payment Confirmed",
      message: `Payment of ${paymentData.amount} confirmed for invoice #${
        paymentData.invoice?.invoiceNumber || "N/A"
      }`,
      data: {
        payment: paymentData,
        confirmedBy: {
          id: confirmedBy.id,
          name: confirmedBy.getFullName(),
        },
      },
      senderId: confirmedBy.id,
      senderName: confirmedBy.getFullName(),
      actionUrl: `/invoices/${paymentData.invoiceId}`,
      actionText: "View Invoice",
    }

    // Notify team members
    if (confirmedBy.teamId) {
      await this.notifyTeam(confirmedBy.teamId, notification)
    }
  }

  public async notifyInvoiceOverdue(invoiceData: any): Promise<void> {
    const notification: NotificationData = {
      type: NotificationType.INVOICE_OVERDUE,
      priority: NotificationPriority.HIGH,
      title: "Invoice Overdue",
      message: `Invoice #${invoiceData.invoiceNumber} is now overdue (${
        invoiceData.institution?.name || "client"
      })`,
      data: {
        invoice: invoiceData,
        daysOverdue: invoiceData.getDaysOverdue?.() || 0,
      },
      actionUrl: `/invoices/${invoiceData.id}`,
      actionText: "View Invoice",
    }

    // Notify assigned user
    if (invoiceData.assignedUserId) {
      await this.notifyUser(invoiceData.assignedUserId, notification)
    }

    // Notify team members if assigned user has a team
    if (invoiceData.assignedUser?.teamId) {
      await this.notifyTeam(invoiceData.assignedUser.teamId, notification)
    }
  }

  /**
   * Enrich notification with default values and metadata
   */
  private enrichNotification(notification: NotificationData): NotificationData {
    return {
      ...notification,
      id: notification.id || this.generateNotificationId(),
      timestamp: notification.timestamp || new Date().toISOString(),
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get notification statistics
   */
  public getStats(): {
    totalSent: number
    connectedUsers: number
  } {
    return {
      totalSent: 0, // This would be tracked in a real implementation
      connectedUsers: this.socketService.getConnectedUsersCount(),
    }
  }
}

export default NotificationService
