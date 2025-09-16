import { Op } from "sequelize"
import { Task } from "../models/Task"
import { NotificationService, NotificationType, NotificationPriority } from "./NotificationService"
import { logger } from "../utils/logger"

/**
 * Service for handling task-related notifications (due dates, overdue, etc.)
 */
export class TaskNotificationService {
  private static instance: TaskNotificationService
  private notificationService: NotificationService
  private checkInterval: NodeJS.Timeout | null = null
  private isRunning = false

  private constructor() {
    this.notificationService = NotificationService.getInstance()
  }

  public static getInstance(): TaskNotificationService {
    if (!TaskNotificationService.instance) {
      TaskNotificationService.instance = new TaskNotificationService()
    }
    return TaskNotificationService.instance
  }

  /**
   * Start the task notification processor
   */
  public start(): void {
    if (this.isRunning) {
      logger.warn("Task notification processor is already running")
      return
    }

    this.isRunning = true
    logger.info("Starting task notification processor")

    // Check for due tasks every 5 minutes
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkDueTasks()
      } catch (error) {
        logger.error("Error checking due tasks", {
          error: (error as Error).message,
        })
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Also run immediately on start
    setTimeout(() => this.checkDueTasks(), 10000) // 10 seconds after start
  }

  /**
   * Stop the task notification processor
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    this.isRunning = false
    logger.info("Task notification processor stopped")
  }

  /**
   * Check for tasks that are due soon or overdue and send notifications
   */
  private async checkDueTasks(): Promise<void> {
    try {
      const now = new Date()

      // Get overdue tasks (already past due date)
      const overdueTasks = await Task.findOverdueTasks()

      // Get tasks due within the next 24 hours
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const tasksDueSoon = await Task.findAll({
        where: {
          dueDate: {
            [Op.between]: [now, tomorrow],
          },
          status: {
            [Op.notIn]: ["completed", "cancelled"],
          },
        },
      })

      logger.debug("Checking due tasks", {
        overdueCount: overdueTasks.length,
        dueSoonCount: tasksDueSoon.length,
      })

      // Process overdue tasks
      for (const task of overdueTasks) {
        await this.notifyTaskOverdue(task)
      }

      // Process tasks due soon
      for (const task of tasksDueSoon) {
        await this.notifyTaskDueSoon(task)
      }

    } catch (error) {
      logger.error("Error in checkDueTasks", {
        error: (error as Error).message,
      })
    }
  }

  /**
   * Send notification for overdue task
   */
  private async notifyTaskOverdue(task: Task): Promise<void> {
    try {
      // Only notify if we haven't notified recently (avoid spam)
      // In a real implementation, you'd track notification history
      const daysOverdue = task.getDaysUntilDue()
      if (daysOverdue !== null && daysOverdue < -1) {
        // Skip if already notified for this overdue task
        // This is a simple implementation - in production you'd track sent notifications
        return
      }

      if (!task.assigneeId) {
        logger.warn("Cannot notify overdue task - no assignee", { taskId: task.id })
        return
      }

      // Send notification via the generic notification system
      const notification = {
        type: "task-overdue" as any,
        priority: NotificationPriority.HIGH,
        title: "Tâche en retard",
        message: `La tâche "${task.title}" est en retard`,
        data: {
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            priority: task.priority,
          },
          daysOverdue: Math.abs(daysOverdue || 0),
        },
        taskId: task.id,
        actionUrl: `/tasks/${task.id}`,
        actionText: "Voir la tâche",
      }

      await this.notificationService.notifyUser(task.assigneeId, notification)

      logger.info("Overdue task notification sent", {
        taskId: task.id,
        assigneeId: task.assigneeId,
        daysOverdue: Math.abs(daysOverdue || 0),
      })

    } catch (error) {
      logger.error("Error sending overdue task notification", {
        taskId: task.id,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Send notification for task due soon
   */
  private async notifyTaskDueSoon(task: Task): Promise<void> {
    try {
      // Only notify if due within 24 hours and not already notified
      const daysUntilDue = task.getDaysUntilDue()
      if (daysUntilDue === null || daysUntilDue > 1 || daysUntilDue < 0) {
        return
      }

      if (!task.assigneeId) {
        logger.warn("Cannot notify due soon task - no assignee", { taskId: task.id })
        return
      }

      const notification = {
        type: "task-due-soon" as any,
        priority: NotificationPriority.MEDIUM,
        title: "Tâche à échéance proche",
        message: `La tâche "${task.title}" arrive à échéance ${daysUntilDue === 0 ? "aujourd'hui" : "demain"}`,
        data: {
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            priority: task.priority,
          },
          daysUntilDue,
        },
        taskId: task.id,
        actionUrl: `/tasks/${task.id}`,
        actionText: "Voir la tâche",
      }

      await this.notificationService.notifyUser(task.assigneeId, notification)

      logger.info("Due soon task notification sent", {
        taskId: task.id,
        assigneeId: task.assigneeId,
        daysUntilDue,
      })

    } catch (error) {
      logger.error("Error sending due soon task notification", {
        taskId: task.id,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Manually trigger check for a specific task
   */
  public async checkTaskNotifications(taskId: string): Promise<void> {
    try {
      const task = await Task.findByPk(taskId)
      if (!task) {
        logger.warn("Task not found for notification check", { taskId })
        return
      }

      const daysUntilDue = task.getDaysUntilDue()
      if (daysUntilDue !== null && daysUntilDue < 0) {
        await this.notifyTaskOverdue(task)
      } else if (daysUntilDue !== null && daysUntilDue <= 1 && daysUntilDue >= 0) {
        await this.notifyTaskDueSoon(task)
      }
    } catch (error) {
      logger.error("Error checking task notifications", {
        taskId,
        error: (error as Error).message,
      })
    }
  }

  /**
   * Get notification statistics
   */
  public getStats(): {
    isRunning: boolean
    nextCheckIn: number
  } {
    return {
      isRunning: this.isRunning,
      nextCheckIn: this.checkInterval ? 5 * 60 * 1000 : 0, // 5 minutes in ms
    }
  }
}

export default TaskNotificationService