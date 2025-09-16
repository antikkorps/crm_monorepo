import { useNotificationStore } from '@/stores/notifications'
import { tasksApi } from '@/services/api'
import type { Task } from '@medical-crm/shared'

export interface OverdueTask {
  id: string
  title: string
  dueDate: Date
  daysPastDue: number
  assignedTo?: string
  institutionName?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export class TaskNotificationService {
  private static instance: TaskNotificationService
  private checkInterval: number | null = null
  private lastCheckedOverdueTasks: Set<string> = new Set()
  private readonly CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

  private constructor() {}

  public static getInstance(): TaskNotificationService {
    if (!TaskNotificationService.instance) {
      TaskNotificationService.instance = new TaskNotificationService()
    }
    return TaskNotificationService.instance
  }

  /**
   * Start monitoring for overdue tasks
   */
  public startMonitoring(): void {
    if (this.checkInterval) {
      this.stopMonitoring()
    }

    // Check immediately when starting
    this.checkOverdueTasks()

    // Set up interval for periodic checks
    this.checkInterval = window.setInterval(() => {
      this.checkOverdueTasks()
    }, this.CHECK_INTERVAL)

    console.log('Task notification monitoring started')
  }

  /**
   * Stop monitoring for overdue tasks
   */
  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      console.log('Task notification monitoring stopped')
    }
  }

  /**
   * Manually trigger a check for overdue tasks
   */
  public async checkOverdueTasks(): Promise<void> {
    try {
      const overdueTasks = await this.fetchOverdueTasks()

      if (overdueTasks.length > 0) {
        await this.processOverdueTasks(overdueTasks)
      }
    } catch (error) {
      console.error('Error checking overdue tasks:', error)
    }
  }

  /**
   * Fetch overdue tasks from the API
   */
  private async fetchOverdueTasks(): Promise<OverdueTask[]> {
    try {
      const now = new Date()

      // Fetch all tasks without status filter first, then filter client-side
      // This avoids the API issue with multiple status parameters
      const response = await tasksApi.getAll({
        limit: 1000 // Ensure we get all relevant tasks
      })

      // Handle different response formats
      let tasks: any[] = []

      if (Array.isArray(response)) {
        tasks = response
      } else if (response.data && Array.isArray(response.data)) {
        tasks = response.data
      } else if (response.data?.tasks && Array.isArray(response.data.tasks)) {
        tasks = response.data.tasks
      } else if (response.tasks && Array.isArray(response.tasks)) {
        tasks = response.tasks
      } else {
        console.warn('Tasks response format unexpected:', response)
        return []
      }

      const overdueTasks: OverdueTask[] = []

      for (const task of tasks) {
        if (this.isTaskOverdue(task, now)) {
          const daysPastDue = this.calculateDaysPastDue(task.dueDate, now)

          overdueTasks.push({
            id: task.id,
            title: task.title,
            dueDate: new Date(task.dueDate),
            daysPastDue,
            assignedTo: task.assignedTo,
            institutionName: task.institution?.name || 'Unknown Institution',
            priority: this.getTaskPriority(task, daysPastDue)
          })

          console.log(`Found overdue task: ${task.title} (${daysPastDue} days past due)`)
        }
      }
      return overdueTasks
    } catch (error) {
      console.error('Error fetching overdue tasks:', error)
      return []
    }
  }

  /**
   * Check if a task is overdue
   */
  private isTaskOverdue(task: Task, now: Date): boolean {
    // Only check tasks that are not completed, cancelled, or on hold
    if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled' || task.status === 'on_hold') {
      return false
    }

    // Consider todo, pending, and in_progress tasks
    const validStatuses = ['todo', 'pending', 'in_progress']
    if (!validStatuses.includes(task.status)) {
      return false
    }

    const dueDate = new Date(task.dueDate)
    return dueDate < now
  }

  /**
   * Calculate days past due
   */
  private calculateDaysPastDue(dueDate: string | Date, now: Date): number {
    const due = new Date(dueDate)
    const diffTime = now.getTime() - due.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Determine task priority based on days overdue
   */
  private getTaskPriority(task: any, daysPastDue: number): 'low' | 'medium' | 'high' | 'urgent' {
    // Use original task priority if available, but escalate based on days overdue
    const basePriority = task.priority || 'medium'

    if (daysPastDue >= 7) return 'urgent'
    if (daysPastDue >= 3) return 'high'
    if (daysPastDue >= 1) return 'medium'

    return basePriority as 'low' | 'medium' | 'high' | 'urgent'
  }

  /**
   * Process and create notifications for overdue tasks
   */
  private async processOverdueTasks(overdueTasks: OverdueTask[]): Promise<void> {
    const notificationStore = useNotificationStore()

    for (const task of overdueTasks) {
      // Create a unique key for this overdue state
      const overdueKey = `${task.id}-${task.daysPastDue}`

      // Only notify if we haven't already notified for this specific overdue state
      if (!this.lastCheckedOverdueTasks.has(overdueKey)) {
        const message = this.createNotificationMessage(task)

        notificationStore.addNotification({
          type: 'task-overdue',
          message,
          data: {
            task: {
              id: task.id,
              title: task.title,
              dueDate: task.dueDate,
              daysPastDue: task.daysPastDue,
              priority: task.priority
            }
          },
          timestamp: new Date()
        })

        this.lastCheckedOverdueTasks.add(overdueKey)

        console.log(`Created notification for overdue task: ${task.title} (${task.daysPastDue} days past due)`)
      }
    }

    // Clean up old tracking keys (keep only current overdue tasks)
    const currentKeys = new Set(overdueTasks.map(t => `${t.id}-${t.daysPastDue}`))
    this.lastCheckedOverdueTasks = new Set(
      Array.from(this.lastCheckedOverdueTasks).filter(key => currentKeys.has(key))
    )
  }

  /**
   * Create a user-friendly notification message
   */
  private createNotificationMessage(task: OverdueTask): string {
    const { title, daysPastDue, institutionName, priority } = task

    const priorityEmoji = {
      low: '📝',
      medium: '⚠️',
      high: '🔥',
      urgent: '🚨'
    }

    if (daysPastDue === 1) {
      return `${priorityEmoji[priority]} Task "${title}" is 1 day overdue (${institutionName})`
    } else {
      return `${priorityEmoji[priority]} Task "${title}" is ${daysPastDue} days overdue (${institutionName})`
    }
  }

  /**
   * Get current overdue tasks count
   */
  public async getOverdueTasksCount(): Promise<number> {
    try {
      const overdueTasks = await this.fetchOverdueTasks()
      return overdueTasks.length
    } catch (error) {
      console.error('Error getting overdue tasks count:', error)
      return 0
    }
  }

  /**
   * Get all current overdue tasks
   */
  public async getOverdueTasks(): Promise<OverdueTask[]> {
    return this.fetchOverdueTasks()
  }

  /**
   * Clear notifications for completed tasks
   */
  public clearNotificationsForCompletedTask(taskId: string): void {
    const notificationStore = useNotificationStore()

    // Find and remove notifications for this specific task
    const taskNotifications = notificationStore.history.filter(
      n => n.type === 'task-overdue' && n.data?.task?.id === taskId
    )

    taskNotifications.forEach(notification => {
      notificationStore.removeNotification(notification.id)
    })

    // Also clean up our tracking
    const keysToRemove = Array.from(this.lastCheckedOverdueTasks).filter(
      key => key.startsWith(`${taskId}-`)
    )
    keysToRemove.forEach(key => this.lastCheckedOverdueTasks.delete(key))

    console.log(`Cleared overdue notifications for completed task: ${taskId}`)
  }
}

// Export singleton instance
export const taskNotificationService = TaskNotificationService.getInstance()