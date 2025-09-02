import { ReminderPriority } from "@medical-crm/shared"
import { Reminder } from "../models/Reminder"
import { User } from "../models/User"
import { logger } from "../utils/logger"
import { NotificationService, NotificationType, NotificationPriority } from "./NotificationService"

export class ReminderNotificationService {
  private static instance: ReminderNotificationService
  private notificationService: NotificationService

  private constructor() {
    this.notificationService = NotificationService.getInstance()
  }

  public static getInstance(): ReminderNotificationService {
    if (!ReminderNotificationService.instance) {
      ReminderNotificationService.instance = new ReminderNotificationService()
    }
    return ReminderNotificationService.instance
  }

  /**
   * Map reminder priority to notification priority
   */
  private mapReminderPriorityToNotificationPriority(
    reminderPriority: ReminderPriority
  ): NotificationPriority {
    switch (reminderPriority) {
      case ReminderPriority.LOW:
        return NotificationPriority.LOW
      case ReminderPriority.MEDIUM:
        return NotificationPriority.MEDIUM
      case ReminderPriority.HIGH:
        return NotificationPriority.HIGH
      case ReminderPriority.URGENT:
        return NotificationPriority.URGENT
      default:
        return NotificationPriority.MEDIUM
    }
  }

  /**
   * Notify user when a reminder is created
   */
  public async notifyReminderCreated(reminder: Reminder): Promise<void> {
    try {
      await this.notificationService.notifyUser(reminder.userId, {
        type: NotificationType.REMINDER_CREATED,
        priority: this.mapReminderPriorityToNotificationPriority(reminder.priority),
        title: "New Reminder Created",
        message: `Reminder "${reminder.title}" has been created for ${reminder.reminderDate.toLocaleDateString()}`,
        reminderId: reminder.id,
        userId: reminder.userId,
        institutionId: reminder.institutionId,
        actionUrl: `/reminders/${reminder.id}`,
        actionText: "View Reminder",
        data: {
          reminder: {
            id: reminder.id,
            title: reminder.title,
            reminderDate: reminder.reminderDate,
            priority: reminder.priority,
          },
        },
      })

      logger.info("Reminder creation notification sent", {
        reminderId: reminder.id,
        userId: reminder.userId,
        title: reminder.title,
      })
    } catch (error) {
      logger.error("Failed to send reminder creation notification", { error, reminderId: reminder.id })
    }
  }

  /**
   * Notify user when reminder is due soon
   */
  public async notifyReminderDueSoon(reminder: Reminder, hoursUntilDue: number): Promise<void> {
    try {
      const timeText = hoursUntilDue < 1 
        ? "less than an hour" 
        : `${hoursUntilDue} hour${hoursUntilDue > 1 ? "s" : ""}`

      await this.notificationService.notifyUser(reminder.userId, {
        type: NotificationType.REMINDER_DUE_SOON,
        priority: this.mapReminderPriorityToNotificationPriority(reminder.priority),
        title: "Reminder Due Soon",
        message: `Reminder "${reminder.title}" is due in ${timeText}`,
        reminderId: reminder.id,
        userId: reminder.userId,
        institutionId: reminder.institutionId,
        actionUrl: `/reminders/${reminder.id}`,
        actionText: "Complete Reminder",
        data: {
          reminder: {
            id: reminder.id,
            title: reminder.title,
            reminderDate: reminder.reminderDate,
            priority: reminder.priority,
            hoursUntilDue,
          },
        },
      })

      logger.info("Reminder due soon notification sent", {
        reminderId: reminder.id,
        userId: reminder.userId,
        hoursUntilDue,
      })
    } catch (error) {
      logger.error("Failed to send reminder due soon notification", { error, reminderId: reminder.id })
    }
  }

  /**
   * Notify user when reminder is overdue
   */
  public async notifyReminderOverdue(reminder: Reminder, hoursOverdue: number): Promise<void> {
    try {
      const timeText = hoursOverdue < 1 
        ? "less than an hour" 
        : `${hoursOverdue} hour${hoursOverdue > 1 ? "s" : ""}`

      await this.notificationService.notifyUser(reminder.userId, {
        type: NotificationType.REMINDER_OVERDUE,
        priority: NotificationPriority.HIGH, // Always high priority for overdue
        title: "Reminder Overdue",
        message: `Reminder "${reminder.title}" is overdue by ${timeText}`,
        reminderId: reminder.id,
        userId: reminder.userId,
        institutionId: reminder.institutionId,
        actionUrl: `/reminders/${reminder.id}`,
        actionText: "Complete Now",
        data: {
          reminder: {
            id: reminder.id,
            title: reminder.title,
            reminderDate: reminder.reminderDate,
            priority: reminder.priority,
            hoursOverdue,
          },
        },
      })

      logger.info("Reminder overdue notification sent", {
        reminderId: reminder.id,
        userId: reminder.userId,
        hoursOverdue,
      })
    } catch (error) {
      logger.error("Failed to send reminder overdue notification", { error, reminderId: reminder.id })
    }
  }

  /**
   * Notify user when reminder is completed
   */
  public async notifyReminderCompleted(reminder: Reminder): Promise<void> {
    try {
      await this.notificationService.notifyUser(reminder.userId, {
        type: NotificationType.REMINDER_COMPLETED,
        priority: NotificationPriority.LOW,
        title: "Reminder Completed",
        message: `Reminder "${reminder.title}" has been marked as completed`,
        reminderId: reminder.id,
        userId: reminder.userId,
        institutionId: reminder.institutionId,
        actionUrl: `/reminders/${reminder.id}`,
        actionText: "View Reminder",
        data: {
          reminder: {
            id: reminder.id,
            title: reminder.title,
            reminderDate: reminder.reminderDate,
            priority: reminder.priority,
            completedAt: new Date(),
          },
        },
      })

      logger.info("Reminder completion notification sent", {
        reminderId: reminder.id,
        userId: reminder.userId,
      })
    } catch (error) {
      logger.error("Failed to send reminder completion notification", { error, reminderId: reminder.id })
    }
  }

  /**
   * Notify user when reminder is snoozed
   */
  public async notifyReminderSnoozed(reminder: Reminder, snoozeMinutes: number): Promise<void> {
    try {
      const snoozeText = snoozeMinutes < 60 
        ? `${snoozeMinutes} minute${snoozeMinutes > 1 ? "s" : ""}`
        : `${Math.floor(snoozeMinutes / 60)} hour${Math.floor(snoozeMinutes / 60) > 1 ? "s" : ""}`

      await this.notificationService.notifyUser(reminder.userId, {
        type: NotificationType.REMINDER_SNOOZED,
        priority: NotificationPriority.LOW,
        title: "Reminder Snoozed",
        message: `Reminder "${reminder.title}" has been snoozed for ${snoozeText}`,
        reminderId: reminder.id,
        userId: reminder.userId,
        institutionId: reminder.institutionId,
        actionUrl: `/reminders/${reminder.id}`,
        actionText: "View Reminder",
        data: {
          reminder: {
            id: reminder.id,
            title: reminder.title,
            reminderDate: reminder.reminderDate,
            priority: reminder.priority,
            snoozeMinutes,
          },
        },
      })

      logger.info("Reminder snooze notification sent", {
        reminderId: reminder.id,
        userId: reminder.userId,
        snoozeMinutes,
      })
    } catch (error) {
      logger.error("Failed to send reminder snooze notification", { error, reminderId: reminder.id })
    }
  }

  /**
   * Notify user when reminder is rescheduled
   */
  public async notifyReminderRescheduled(reminder: Reminder, oldDate: Date): Promise<void> {
    try {
      await this.notificationService.notifyUser(reminder.userId, {
        type: NotificationType.REMINDER_RESCHEDULED,
        priority: NotificationPriority.LOW,
        title: "Reminder Rescheduled",
        message: `Reminder "${reminder.title}" has been rescheduled to ${reminder.reminderDate.toLocaleDateString()}`,
        reminderId: reminder.id,
        userId: reminder.userId,
        institutionId: reminder.institutionId,
        actionUrl: `/reminders/${reminder.id}`,
        actionText: "View Reminder",
        data: {
          reminder: {
            id: reminder.id,
            title: reminder.title,
            oldReminderDate: oldDate,
            newReminderDate: reminder.reminderDate,
            priority: reminder.priority,
          },
        },
      })

      logger.info("Reminder reschedule notification sent", {
        reminderId: reminder.id,
        userId: reminder.userId,
        oldDate,
        newDate: reminder.reminderDate,
      })
    } catch (error) {
      logger.error("Failed to send reminder reschedule notification", { error, reminderId: reminder.id })
    }
  }

  /**
   * Check for due/overdue reminders and send notifications
   */
  public async checkAndNotifyDueReminders(): Promise<void> {
    try {
      logger.info("Starting due reminder check")

      // Check for reminders due in the next hour
      const upcomingReminders = await Reminder.findUpcomingReminders(undefined, 1)
      
      for (const reminder of upcomingReminders) {
        const hoursUntilDue = reminder.getHoursUntilDue()
        if (hoursUntilDue !== null && hoursUntilDue > 0 && hoursUntilDue <= 1) {
          await this.notifyReminderDueSoon(reminder, Math.ceil(hoursUntilDue))
        }
      }

      // Check for overdue reminders
      const overdueReminders = await Reminder.findOverdueReminders()
      
      for (const reminder of overdueReminders) {
        const now = new Date()
        const hoursOverdue = Math.floor((now.getTime() - reminder.reminderDate.getTime()) / (1000 * 60 * 60))
        await this.notifyReminderOverdue(reminder, hoursOverdue)
      }

      logger.info("Due reminder check completed", {
        upcomingCount: upcomingReminders.length,
        overdueCount: overdueReminders.length,
      })
    } catch (error) {
      logger.error("Failed to check and notify due reminders", { error })
    }
  }

  /**
   * Notify team members about reminders for shared institutions
   */
  public async notifyTeamAboutInstitutionReminder(reminder: Reminder, teamMemberIds: string[]): Promise<void> {
    try {
      if (!reminder.institutionId || teamMemberIds.length === 0) {
        return
      }

      const filteredTeamMembers = teamMemberIds.filter(id => id !== reminder.userId)

      if (filteredTeamMembers.length === 0) {
        return
      }

      await this.notificationService.notifyUsers(filteredTeamMembers, {
        type: NotificationType.REMINDER_CREATED,
        priority: this.mapReminderPriorityToNotificationPriority(reminder.priority),
        title: "Team Reminder Created",
        message: `A reminder "${reminder.title}" has been created for a shared institution`,
        reminderId: reminder.id,
        userId: reminder.userId,
        institutionId: reminder.institutionId,
        actionUrl: `/reminders/${reminder.id}`,
        actionText: "View Reminder",
        data: {
          reminder: {
            id: reminder.id,
            title: reminder.title,
            reminderDate: reminder.reminderDate,
            priority: reminder.priority,
          },
          isTeamNotification: true,
        },
      })

      logger.info("Team reminder notification sent", {
        reminderId: reminder.id,
        institutionId: reminder.institutionId,
        teamMemberCount: filteredTeamMembers.length,
      })
    } catch (error) {
      logger.error("Failed to send team reminder notification", { error, reminderId: reminder.id })
    }
  }

  /**
   * Start periodic reminder checking (should be called on app startup)
   */
  public startPeriodicReminderCheck(intervalMinutes: number = 15): void {
    logger.info("Starting periodic reminder check", { intervalMinutes })

    const intervalMs = intervalMinutes * 60 * 1000
    
    // Initial check
    this.checkAndNotifyDueReminders()

    // Set up periodic checking
    setInterval(() => {
      this.checkAndNotifyDueReminders()
    }, intervalMs)
  }
}