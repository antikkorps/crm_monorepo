import { Op } from "sequelize"
import { Invoice } from "../models/Invoice"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Quote } from "../models/Quote"
import {
  ReminderEntityType,
  ReminderNotificationLog,
  ReminderNotificationType,
} from "../models/ReminderNotificationLog"
import { ReminderRule } from "../models/ReminderRule"
import { Task, TaskPriority, TaskStatus } from "../models/Task"
import { User } from "../models/User"
import EmailService from "./EmailService"
import {
  NotificationPriority,
  NotificationService,
  NotificationType,
} from "./NotificationService"

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
  private emailService: EmailService
  private static instance: ReminderService

  private constructor() {
    this.notificationService = NotificationService.getInstance()
    this.emailService = new EmailService()
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

    return tasks.map((task) => ({
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

    return quotes.map((quote) => ({
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

    return invoices.map((invoice) => ({
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
   * Uses persistent database check instead of in-memory cache
   *
   * @param ruleId - Reminder rule ID
   * @param entityType - Entity type (task, quote, invoice)
   * @param entityId - Entity ID
   * @param recipientId - User ID who will receive the notification
   * @returns true if notification should be sent, false if sent too recently
   */
  private async shouldSendNotification(
    ruleId: string,
    entityType: ReminderEntityType,
    entityId: string,
    recipientId: string,
  ): Promise<boolean> {
    try {
      const recentLog = await ReminderNotificationLog.findRecentNotification(
        ruleId,
        entityType,
        entityId,
        recipientId,
        23, // 23 hours - prevent daily spam
      )

      if (!recentLog) {
        return true // No recent notification found, safe to send
      }

      logger.debug("Duplicate notification prevented by persistent log", {
        ruleId,
        entityType,
        entityId,
        recipientId,
        lastSent: recentLog.sentAt,
      })

      return false // Notification sent too recently
    } catch (error) {
      logger.error("Error checking notification history", {
        error: error instanceof Error ? error.message : String(error),
        ruleId,
        entityId,
        recipientId,
      })
      // On error, allow notification to prevent blocking legitimate alerts
      return true
    }
  }

  /**
   * Log notification as sent in persistent database
   * Replaces in-memory cache with durable audit trail
   *
   * @param ruleId - Reminder rule ID
   * @param entityType - Entity type (task, quote, invoice)
   * @param entityId - Entity ID
   * @param recipientId - User ID who received the notification
   * @param notificationType - Type of notification sent (in_app, email, both)
   */
  private async markNotificationSent(
    ruleId: string,
    entityType: ReminderEntityType,
    entityId: string,
    recipientId: string,
    notificationType: ReminderNotificationType = ReminderNotificationType.IN_APP,
  ): Promise<void> {
    try {
      await ReminderNotificationLog.logNotification({
        ruleId,
        entityType,
        entityId,
        recipientId,
        notificationType,
      })

      logger.debug("Notification logged in persistent database", {
        ruleId,
        entityType,
        entityId,
        recipientId,
        notificationType,
      })
    } catch (error) {
      // Log error but don't throw - notification was already sent
      logger.error("Error logging notification to database", {
        error: error instanceof Error ? error.message : String(error),
        ruleId,
        entityId,
        recipientId,
      })
    }
  }

  /**
   * Send reminder notification
   * Now uses persistent database logging for per-recipient anti-spam protection
   */
  private async sendReminderNotification(
    rule: ReminderRule,
    entity: ReminderData,
  ): Promise<void> {
    try {
      const entityType = rule.entityType as ReminderEntityType
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

      // Collect all notification targets
      const notificationTargets: string[] = []

      // Add assignee if exists
      if (entity.assigneeId) {
        notificationTargets.push(entity.assigneeId)
      }

      // If rule is team-specific, notify team members (except assignee to avoid duplicates)
      if (rule.teamId) {
        const teamMembers = await this.getTeamMembers(rule.teamId)
        const teamMembersToNotify = teamMembers.filter(
          (memberId) => !notificationTargets.includes(memberId),
        )
        notificationTargets.push(...teamMembersToNotify)
      }

      // Send to each recipient with individual anti-spam checking
      let sentCount = 0
      let skippedCount = 0

      for (const recipientId of notificationTargets) {
        // Check if this specific recipient already received this notification recently
        const shouldSend = await this.shouldSendNotification(
          rule.id,
          entityType,
          entity.id,
          recipientId,
        )

        if (!shouldSend) {
          logger.debug(`Skipping duplicate notification for recipient`, {
            entityType: rule.entityType,
            entityId: entity.id,
            ruleId: rule.id,
            recipientId,
          })
          skippedCount++
          continue
        }

        // Send in-app notification
        await this.notificationService.notifyUser(recipientId, notificationData)

        // Determine notification type to log
        const logNotificationType =
          process.env.ENABLE_EMAIL_REMINDERS === "true"
            ? ReminderNotificationType.BOTH
            : ReminderNotificationType.IN_APP

        // Mark notification as sent for this specific recipient
        await this.markNotificationSent(
          rule.id,
          entityType,
          entity.id,
          recipientId,
          logNotificationType,
        )

        sentCount++
      }

      // Send email reminder if enabled and we sent to at least one recipient
      if (sentCount > 0 && process.env.ENABLE_EMAIL_REMINDERS === "true") {
        await this.sendEmailReminder(rule, entity)
      }

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
  private async createReminderTask(
    rule: ReminderRule,
    entity: ReminderData,
  ): Promise<void> {
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
      return users.map((user) => user.id)
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
  private getNotificationType(entityType: string, triggerType: string): NotificationType {
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
        logger.info(
          `Created default reminder rule for ${ruleData.entityType} ${ruleData.triggerType}`,
        )
      }
    }
  }

  /**
   * Send email reminder based on entity type
   */
  private async sendEmailReminder(
    rule: ReminderRule,
    entity: ReminderData,
  ): Promise<void> {
    try {
      const currentDate = new Date()
      let daysUntil: number | undefined

      // Calculate days until due/expiry for the email subject
      if (entity.dueDate) {
        const dueDate = new Date(entity.dueDate)
        daysUntil = Math.ceil(
          (dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      } else if (entity.validUntil) {
        const validUntil = new Date(entity.validUntil)
        daysUntil = Math.ceil(
          (validUntil.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      } else if (entity.dueAt) {
        const dueAt = new Date(entity.dueAt)
        daysUntil = Math.ceil(
          (dueAt.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24),
        )
      }

      switch (rule.entityType) {
        case "task":
          await this.sendTaskReminderEmail(entity, rule, daysUntil)
          break
        case "quote":
          await this.sendQuoteReminderEmail(entity, rule, daysUntil)
          break
        case "invoice":
          await this.sendInvoiceReminderEmail(entity, rule, daysUntil)
          break
        default:
          logger.warn(
            `Email reminder not implemented for entity type: ${rule.entityType}`,
          )
      }
    } catch (error) {
      logger.error("Error sending email reminder", {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
        entityType: rule.entityType,
        ruleId: rule.id,
      })
    }
  }

  /**
   * Send email reminder for task
   */
  private async sendTaskReminderEmail(
    entity: ReminderData,
    rule: ReminderRule,
    daysUntilDue?: number,
  ): Promise<void> {
    try {
      if (!entity.assignee?.email || !entity.assignee.firstName) {
        logger.warn("Cannot send task email: missing assignee email or name", {
          entityId: entity.id,
          assigneeEmail: entity.assignee?.email,
        })
        return
      }

      const assigneeName =
        `${entity.assignee.firstName} ${entity.assignee.lastName || ""}`.trim()
      const taskUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/tasks/${entity.id}`
      const dueDateStr = entity.dueDate
        ? new Date(entity.dueDate).toLocaleDateString("fr-FR")
        : "Non définie"

      const isOverdue = rule.triggerType === "overdue"
      const subject = isOverdue
        ? `🚨 TÂCHE EN RETARD: ${entity.title}`
        : `⏰ RAPPEL: Tâche à échéance dans ${daysUntilDue} jour(s)`

      const message = `
        <p>Bonjour ${assigneeName},</p>
        
        <p>Ceci est un rappel concernant la tâche suivante :</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${entity.title}</h3>
          <p style="margin: 5px 0;"><strong>Échéance :</strong> ${dueDateStr}</p>
          ${entity.institution ? `<p style="margin: 5px 0;"><strong>Institution :</strong> ${entity.institution.name}</p>` : ""}
          <p style="margin: 5px 0;"><strong>Statut :</strong> ${entity.status || "À faire"}</p>
        </div>
        
        ${
          isOverdue
            ? `<p style="color: #d32f2f; font-weight: bold;">⚠️ Cette tâche est en retard !</p>`
            : `<p style="color: #1976d2;">📅 Plus que ${daysUntilDue} jour(s) avant l'échéance.</p>`
        }
        
        <p><a href="${taskUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir la tâche</a></p>
        
        <p>Si vous avez des questions ou besoin d'aide, n'hésitez pas à nous contacter.</p>
        
        <p>Cordialement,<br>Équipe OPEx_CRM</p>
      `

      await this.emailService.sendCustomEmail(entity.assignee.email, subject, message)

      logger.info("Task reminder email sent", {
        entityId: entity.id,
        assigneeEmail: entity.assignee.email,
        triggerType: rule.triggerType,
      })
    } catch (error) {
      logger.error("Failed to send task reminder email", {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      })
    }
  }

  /**
   * Send email reminder for quote
   */
  private async sendQuoteReminderEmail(
    entity: ReminderData,
    rule: ReminderRule,
    daysUntilExpiry?: number,
  ): Promise<void> {
    try {
      if (!entity.assignee?.email || !entity.assignee.firstName) {
        logger.warn("Cannot send quote email: missing assignee email or name", {
          entityId: entity.id,
          assigneeEmail: entity.assignee?.email,
        })
        return
      }

      const assigneeName =
        `${entity.assignee.firstName} ${entity.assignee.lastName || ""}`.trim()
      const quoteUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/quotes/${entity.id}`
      const validUntilStr = entity.validUntil
        ? new Date(entity.validUntil).toLocaleDateString("fr-FR")
        : "Non définie"

      const isExpired = rule.triggerType === "expired"
      const subject = isExpired
        ? `⚠️ DEVIS EXPIRÉ: ${entity.title || entity.quoteNumber}`
        : `⏰ RAPPEL: Devis à échéance dans ${daysUntilExpiry} jour(s)`

      const message = `
        <p>Bonjour ${assigneeName},</p>
        
        <p>Ceci est un rappel concernant le devis suivant :</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${entity.title || entity.quoteNumber}</h3>
          <p style="margin: 5px 0;"><strong>Numéro :</strong> ${entity.quoteNumber || "N/A"}</p>
          <p style="margin: 5px 0;"><strong>Montant :</strong> ${entity.totalAmount ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(entity.totalAmount) : "N/A"}</p>
          <p style="margin: 5px 0;"><strong>Échéance :</strong> ${validUntilStr}</p>
          ${entity.institution ? `<p style="margin: 5px 0;"><strong>Institution :</strong> ${entity.institution.name}</p>` : ""}
        </div>
        
        ${
          isExpired
            ? `<p style="color: #d32f2f; font-weight: bold;">❗ Ce devis a expiré !</p>
             <p>Nous recommandons de contacter le client pour proposer un nouveau devis ou une extension.</p>`
            : `<p style="color: #1976d2;">📅 Plus que ${daysUntilExpiry} jour(s) avant l'expiration.</p>
             <p>N'oubliez pas de relancer le client pour éviter la perte de cette opportunité.</p>`
        }
        
        <p><a href="${quoteUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir le devis</a></p>
        
        <p>Cordialement,<br>Équipe OPEx_CRM</p>
      `

      await this.emailService.sendCustomEmail(entity.assignee.email, subject, message)

      logger.info("Quote reminder email sent", {
        entityId: entity.id,
        assigneeEmail: entity.assignee.email,
        triggerType: rule.triggerType,
      })
    } catch (error) {
      logger.error("Failed to send quote reminder email", {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      })
    }
  }

  /**
   * Send email reminder for invoice
   */
  private async sendInvoiceReminderEmail(
    entity: ReminderData,
    rule: ReminderRule,
    daysUntilDue?: number,
  ): Promise<void> {
    try {
      if (!entity.assignee?.email || !entity.assignee.firstName) {
        logger.warn("Cannot send invoice email: missing assignee email or name", {
          entityId: entity.id,
          assigneeEmail: entity.assignee?.email,
        })
        return
      }

      const assigneeName =
        `${entity.assignee.firstName} ${entity.assignee.lastName || ""}`.trim()
      const invoiceUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/invoices/${entity.id}`
      const dueAtStr = entity.dueAt
        ? new Date(entity.dueAt).toLocaleDateString("fr-FR")
        : "Non définie"

      const isOverdue = rule.triggerType === "unpaid"
      const subject = isOverdue
        ? `🚨 FACTURE EN RETARD: ${entity.title || entity.invoiceNumber}`
        : `💰 RAPPEL: Facture à échéance dans ${daysUntilDue} jour(s)`

      const message = `
        <p>Bonjour ${assigneeName},</p>
        
        <p>Ceci est un rappel concernant la facture suivante :</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #333;">${entity.title || entity.invoiceNumber}</h3>
          <p style="margin: 5px 0;"><strong>Numéro :</strong> ${entity.invoiceNumber || "N/A"}</p>
          <p style="margin: 5px 0;"><strong>Montant :</strong> ${entity.amount ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(entity.amount) : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(entity.totalAmount || 0)}</p>
          <p style="margin: 5px 0;"><strong>Échéance :</strong> ${dueAtStr}</p>
          ${entity.institution ? `<p style="margin: 5px 0;"><strong>Institution :</strong> ${entity.institution.name}</p>` : ""}
        </div>
        
        ${
          isOverdue
            ? `<p style="color: #d32f2f; font-weight: bold;">⚠️ Cette facture est en retard de paiement !</p>
             <p>Veuillez contacter le client pour récupérer le paiement ou proposer un échéancier.</p>`
            : `<p style="color: #1976d2;">📅 Plus que ${daysUntilDue} jour(s) avant l'échéance.</p>
             <p>N'oubliez pas de relancer le client pour le paiement.</p>`
        }
        
        <p><a href="${invoiceUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir la facture</a></p>
        
        <p>Cordialement,<br>Équipe OPEx_CRM</p>
      `

      await this.emailService.sendCustomEmail(entity.assignee.email, subject, message)

      logger.info("Invoice reminder email sent", {
        entityId: entity.id,
        assigneeEmail: entity.assignee.email,
        triggerType: rule.triggerType,
      })
    } catch (error) {
      logger.error("Failed to send invoice reminder email", {
        error: error instanceof Error ? error.message : String(error),
        entityId: entity.id,
      })
    }
  }
}

export default ReminderService
