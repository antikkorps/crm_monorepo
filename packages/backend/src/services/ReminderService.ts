import { Op } from "sequelize"
import { ReminderRule } from "../models/ReminderRule"
import { Task, TaskPriority, TaskStatus } from "../models/Task"
import { Quote } from "../models/Quote"
import { Invoice } from "../models/Invoice"
import { User } from "../models/User"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { NotificationService, NotificationType, NotificationPriority } from "./NotificationService"

import { logger } from "../utils/logger"

interface ReminderData {
  id: string
  title: string
  dueDate?: Date
  validUntil?: Date
  dueAt?: Date
  assigneeId?: string
  assignee?: User & { name?: string }
  institutionId?: string
  institution?: MedicalInstitution & { name?: string }
  status?: string
  entityType: "task" | "quote" | "invoice"
  totalAmount?: number
  amount?: number
  quoteNumber?: string
  invoiceNumber?: string
}

interface WhereClause {
  [key: string]: any
  dueDate?: { [Op.between]: [Date, Date] } | { [Op.lt]: Date }
  validUntil?: { [Op.between]: [Date, Date] } | { [Op.lt]: Date }
  dueAt?: { [Op.between]: [Date, Date] } | { [Op.lt]: Date }
  status?: { [Op.in]: string[] }
}

export class ReminderService {
  private notificationService: NotificationService
  private static instance: ReminderService
  private lastNotificationCache = new Map<string, Date>() // Cache to prevent spam

  private constructor() {
    this.notificationService = NotificationService.getInstance()
  }

  public static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService()
    }
    return ReminderService.instance
  }

  /**
   * Process all active reminder rules
   */
  public async processAllReminders(): Promise<void> {
    try {
      logger.info("Starting reminder processing")

      const activeRules = await ReminderRule.findAll({
        where: { isActive: true },
        order: [["priority", "DESC"]],
      })

      logger.info(`Found ${activeRules.length} active reminder rules`)

      for (const rule of activeRules) {
        await this.processReminderRule(rule)
      }

      logger.info("Reminder processing completed")
    } catch (error) {
      logger.error("Error processing reminders", {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Process a single reminder rule
   */
  private async processReminderRule(rule: ReminderRule): Promise<void> {
    try {
      let entities: ReminderData[] = []

      switch (rule.entityType) {
        case "task":
          entities = await this.getTasksForReminder(rule)
          break
        case "quote":
          entities = await this.getQuotesForReminder(rule)
          break
        case "invoice":
          entities = await this.getInvoicesForReminder(rule)
          break
      }

      logger.info(`Found ${entities.length} ${rule.entityType}(s) for rule ${rule.id}`)

      for (const entity of entities) {
        await this.sendReminderNotification(rule, entity)
        
        // Auto-create task if enabled
        if (rule.autoCreateTask) {
          await this.createReminderTask(rule, entity)
        }
      }
    } catch (error) {
      logger.error(`Error processing reminder rule ${rule.id}`, {
        error: error instanceof Error ? error.message : String(error),
        ruleId: rule.id,
      })
    }
  }

  /**
   * Get tasks that match reminder rule
   */
  private async getTasksForReminder(rule: ReminderRule): Promise<ReminderData[]> {
    const currentDate = new Date()
    let whereClause: WhereClause = {}

    if (rule.triggerType === "due_soon") {
      const dueDateFrom = new Date(currentDate)
      const dueDateTo = new Date(currentDate)
      dueDateTo.setDate(dueDateTo.getDate() + rule.daysBefore)
      
      whereClause.dueDate = {
        [Op.between]: [dueDateFrom, dueDateTo],
      }
      whereClause.status = { [Op.in]: ["todo", "in_progress"] }
    } else if (rule.triggerType === "overdue") {
      const overdueDate = new Date(currentDate)
      overdueDate.setDate(overdueDate.getDate() - rule.daysAfter)
      
      whereClause.dueDate = {
        [Op.lt]: overdueDate,
      }
      whereClause.status = { [Op.in]: ["todo", "in_progress"] }
    }

    const tasks = await Task.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "assignee",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      limit: 100, // Pagination for performance
    })

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      assigneeId: task.assigneeId,
      assignee: task.assignee,
      institutionId: task.institutionId,
      status: task.status,
      entityType: "task",
    }))
  }

  /**
   * Get quotes that match reminder rule
   */
  private async getQuotesForReminder(rule: ReminderRule): Promise<ReminderData[]> {
    const currentDate = new Date()
    let whereClause: WhereClause = {}

    if (rule.triggerType === "due_soon") {
      const validUntilFrom = new Date(currentDate)
      const validUntilTo = new Date(currentDate)
      validUntilTo.setDate(validUntilTo.getDate() + rule.daysBefore)
      
      whereClause.validUntil = {
        [Op.between]: [validUntilFrom, validUntilTo],
      }
      whereClause.status = { [Op.in]: ["draft", "sent"] }
    } else if (rule.triggerType === "expired") {
      const expiredDate = new Date(currentDate)
      expiredDate.setDate(expiredDate.getDate() - rule.daysAfter)
      
      whereClause.validUntil = {
        [Op.lt]: expiredDate,
      }
      whereClause.status = { [Op.in]: ["draft", "sent"] }
    }

    const quotes = await Quote.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      limit: 100, // Pagination for performance
    })

    return quotes.map(quote => ({
      id: quote.id,
      title: quote.quoteNumber,
      validUntil: quote.validUntil,
      assigneeId: quote.assignedUserId,
      assignee: quote.assignedUser,
      institutionId: quote.institutionId,
      institution: quote.institution,
      status: quote.status,
      totalAmount: quote.total,
      quoteNumber: quote.quoteNumber,
      entityType: "quote",
    }))
  }

  /**
   * Get invoices that match reminder rule
   */
  private async getInvoicesForReminder(rule: ReminderRule): Promise<ReminderData[]> {
    const currentDate = new Date()
    let whereClause: WhereClause = {}

    if (rule.triggerType === "due_soon") {
      const dueDateFrom = new Date(currentDate)
      const dueDateTo = new Date(currentDate)
      dueDateTo.setDate(dueDateTo.getDate() + rule.daysBefore)
      
      whereClause.dueAt = {
        [Op.between]: [dueDateFrom, dueDateTo],
      }
      whereClause.status = { [Op.in]: ["sent", "overdue"] }
    } else if (rule.triggerType === "unpaid") {
      const unpaidDate = new Date(currentDate)
      unpaidDate.setDate(unpaidDate.getDate() - rule.daysAfter)
      
      whereClause.dueAt = {
        [Op.lt]: unpaidDate,
      }
      whereClause.status = { [Op.in]: ["sent", "overdue"] }
    }

    const invoices = await Invoice.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
      limit: 100, // Pagination for performance
    })

    return invoices.map(invoice => ({
      id: invoice.id,
      title: invoice.invoiceNumber,
      dueAt: invoice.dueDate,
      assigneeId: invoice.assignedUserId,
      assignee: invoice.assignedUser,
      institutionId: invoice.institutionId,
      institution: invoice.institution,
      status: invoice.status,
      amount: invoice.total,
      invoiceNumber: invoice.invoiceNumber,
      entityType: "invoice",
    }))
  }

  /**
   * Check if notification was already sent recently (anti-spam)
   */
  private shouldSendNotification(ruleId: string, entityId: string): boolean {
    const cacheKey = `${ruleId}-${entityId}`
    const lastSent = this.lastNotificationCache.get(cacheKey)
    
    if (!lastSent) {
      return true // First time notification
    }
    
    const now = new Date()
    const hoursSinceLastNotification = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60)
    
    // Only allow notification every 23 hours to avoid daily spam
    return hoursSinceLastNotification >= 23
  }

  /**
   * Mark notification as sent
   */
  private markNotificationSent(ruleId: string, entityId: string): void {
    const cacheKey = `${ruleId}-${entityId}`
    this.lastNotificationCache.set(cacheKey, new Date())
    
    // Clean old cache entries (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const keysToDelete: string[] = []
    this.lastNotificationCache.forEach((date, key) => {
      if (date < sevenDaysAgo) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.lastNotificationCache.delete(key))
  }

  /**
   * Send reminder notification
   */
  private async sendReminderNotification(
    rule: ReminderRule,
    entity: ReminderData
  ): Promise<void> {
    try {
      // Check anti-spam mechanism
      if (!this.shouldSendNotification(rule.id, entity.id)) {
        logger.debug(`Skipping duplicate notification for ${rule.entityType} ${entity.id}`, {
          entityType: rule.entityType,
          entityId: entity.id,
          ruleId: rule.id,
        })
        return
      }

      const notificationType = this.getNotificationType(rule.entityType, rule.triggerType)
      const notificationData = {
        type: notificationType,
        title: rule.formatTitle(entity),
        message: rule.formatMessage(entity),
        priority: this.getNotificationPriority(rule.priority),
        actionUrl: rule.formatActionUrl(entity),
        actionText: rule.formatActionText(entity),
        entityType: rule.entityType,
        entityId: entity.id,
      }

      // Send notification - avoid duplicates
      const notificationTargets: string[] = []
      
      // Add assignee if exists
      if (entity.assigneeId) {
        notificationTargets.push(entity.assigneeId)
      }
      
      // If rule is team-specific, notify team members (except assignee to avoid duplicates)
      if (rule.teamId) {
        const teamMembers = await this.getTeamMembers(rule.teamId)
        const teamMembersToNotify = teamMembers.filter(memberId => 
          !notificationTargets.includes(memberId)
        )
        for (const memberId of teamMembersToNotify) {
          await this.notificationService.notifyUser(memberId, notificationData)
        }
      } else {
        // Notify individual assignee
        for (const targetId of notificationTargets) {
          await this.notificationService.notifyUser(targetId, notificationData)
        }
      }

      // Mark notification as sent to prevent spam
      this.markNotificationSent(rule.id, entity.id)

      logger.info(`Reminder notification sent for ${rule.entityType} ${entity.id}`, {
        entityType: rule.entityType,
        entityId: entity.id,
        assigneeId: entity.assigneeId,
        ruleId: rule.id,
      })
    } catch (error) {
      logger.error(`Error sending reminder notification`, {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
        ruleId: rule.id,
      })
    }
  }

  /**
   * Create automatic task for reminder
   */
  private async createReminderTask(rule: ReminderRule, entity: ReminderData): Promise<void> {
    try {
      const taskTitle = rule.formatTaskTitle(entity)
      
      if (!taskTitle) {
        logger.warn(`No task title template for rule ${rule.id}`)
        return
      }

      const taskData = {
        title: taskTitle,
        description: `Automatic reminder task for ${rule.entityType}: ${entity.title}`,
        priority: rule.taskPriority as TaskPriority,
        status: TaskStatus.TODO,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
        assigneeId: entity.assigneeId || rule.createdBy, // Use creator as fallback
        institutionId: entity.institutionId,
        creatorId: rule.createdBy,
      }

      await Task.create(taskData)

      logger.info(`Automatic reminder task created for ${rule.entityType} ${entity.id}`, {
        entityType: rule.entityType,
        entityId: entity.id,
        taskTitle,
        assigneeId: entity.assigneeId,
      })
    } catch (error) {
      logger.error(`Error creating reminder task`, {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
        ruleId: rule.id,
      })
    }
  }

  /**
   * Get team members by team ID
   */
  private async getTeamMembers(teamId: string): Promise<string[]> {
    try {
      const users = await User.findAll({
        where: { teamId, isActive: true },
        attributes: ["id"],
      })
      return users.map(user => user.id)
    } catch (error) {
      logger.error("Error fetching team members", {
        error: error instanceof Error ? error.message : String(error),
        teamId,
      })
      return []
    }
  }

  /**
   * Get notification type based on entity and trigger
   */
  private getNotificationType(
    entityType: string,
    triggerType: string
  ): NotificationType {
    switch (entityType) {
      case "task":
        if (triggerType === "due_soon") return NotificationType.TASK_ASSIGNED
        if (triggerType === "overdue") return NotificationType.TASK_OVERDUE
        break
      case "quote":
        if (triggerType === "due_soon") return NotificationType.QUOTE_CREATED
        if (triggerType === "expired") return NotificationType.QUOTE_CREATED // Use QUOTE_CREATED for expired quotes
        break
      case "invoice":
        if (triggerType === "due_soon") return NotificationType.INVOICE_CREATED
        if (triggerType === "unpaid") return NotificationType.INVOICE_OVERDUE
        break
    }
    return NotificationType.SYSTEM_ALERT
  }

  /**
   * Get notification priority
   */
  private getNotificationPriority(rulePriority: string): NotificationPriority {
    switch (rulePriority) {
      case "low":
        return NotificationPriority.LOW
      case "medium":
        return NotificationPriority.MEDIUM
      case "high":
        return NotificationPriority.HIGH
      case "urgent":
        return NotificationPriority.URGENT
      default:
        return NotificationPriority.MEDIUM
    }
  }

  /**
   * Create default reminder rules
   */
  public async createDefaultRules(adminUserId: string): Promise<void> {
    const defaultRules = [
      // Task reminders
      {
        entityType: "task" as const,
        triggerType: "due_soon" as const,
        daysBefore: 7,
        daysAfter: 0,
        priority: "medium" as const,
        isActive: true,
        titleTemplate: "Task Due Soon",
        messageTemplate: 'Task "{title}" is due in {days} day(s)',
        actionUrlTemplate: "/tasks/{id}",
        actionTextTemplate: "View Task",
        autoCreateTask: true,
        taskTitleTemplate: 'Follow up on task: "{title}"',
        taskPriority: "medium" as const,
        createdBy: adminUserId,
      },
      {
        entityType: "task" as const,
        triggerType: "overdue" as const,
        daysBefore: 0,
        daysAfter: 1,
        priority: "high" as const,
        isActive: true,
        titleTemplate: "Task Overdue",
        messageTemplate: 'Task "{title}" is {days} day(s) overdue',
        actionUrlTemplate: "/tasks/{id}",
        actionTextTemplate: "View Task",
        autoCreateTask: true,
        taskTitleTemplate: 'Urgent: Overdue task "{title}"',
        taskPriority: "high" as const,
        createdBy: adminUserId,
      },
      // Quote reminders
      {
        entityType: "quote" as const,
        triggerType: "expired" as const,
        daysBefore: 0,
        daysAfter: 7,
        priority: "medium" as const,
        isActive: true,
        titleTemplate: "Quote Expired",
        messageTemplate: 'Quote "{title}" expired {days} day(s) ago',
        actionUrlTemplate: "/quotes/{id}",
        actionTextTemplate: "View Quote",
        autoCreateTask: true,
        taskTitleTemplate: 'Follow up on expired quote "{title}"',
        taskPriority: "medium" as const,
        createdBy: adminUserId,
      },
      {
        entityType: "quote" as const,
        triggerType: "due_soon" as const,
        daysBefore: 7,
        daysAfter: 0,
        priority: "low" as const,
        isActive: true,
        titleTemplate: "Quote Expiring Soon",
        messageTemplate: 'Quote "{title}" expires in {days} day(s)',
        actionUrlTemplate: "/quotes/{id}",
        actionTextTemplate: "View Quote",
        autoCreateTask: false,
        taskTitleTemplate: 'Check quote "{title}" status',
        taskPriority: "low" as const,
        createdBy: adminUserId,
      },
      // Invoice reminders
      {
        entityType: "invoice" as const,
        triggerType: "unpaid" as const,
        daysBefore: 0,
        daysAfter: 30,
        priority: "high" as const,
        isActive: true,
        titleTemplate: "Invoice Overdue",
        messageTemplate: 'Invoice "{title}" is {days} day(s) overdue',
        actionUrlTemplate: "/invoices/{id}",
        actionTextTemplate: "View Invoice",
        autoCreateTask: true,
        taskTitleTemplate: 'Follow up on unpaid invoice "{title}"',
        taskPriority: "high" as const,
        createdBy: adminUserId,
      },
      {
        entityType: "invoice" as const,
        triggerType: "due_soon" as const,
        daysBefore: 7,
        daysAfter: 0,
        priority: "medium" as const,
        isActive: true,
        titleTemplate: "Invoice Due Soon",
        messageTemplate: 'Invoice "{title}" is due in {days} day(s)',
        actionUrlTemplate: "/invoices/{id}",
        actionTextTemplate: "View Invoice",
        autoCreateTask: false,
        taskTitleTemplate: 'Check invoice "{title}" payment status',
        taskPriority: "medium" as const,
        createdBy: adminUserId,
      },
    ]

    for (const ruleData of defaultRules) {
      const existingRule = await ReminderRule.findOne({
        where: {
          entityType: ruleData.entityType,
          triggerType: ruleData.triggerType,
          createdBy: ruleData.createdBy,
        },
      })

      if (!existingRule) {
        await ReminderRule.create(ruleData)
        logger.info(`Created default reminder rule for ${ruleData.entityType} ${ruleData.triggerType}`)
      }
    }
  }
}

export default ReminderService