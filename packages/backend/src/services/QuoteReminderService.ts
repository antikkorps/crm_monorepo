import { Op } from "sequelize"
import { QuoteStatus } from "@medical-crm/shared"
import { Quote } from "../models/Quote"
import { QuoteReminder, ReminderType, ReminderAction } from "../models/QuoteReminder"
import { ReminderTemplate, TaskPriority as TemplatePriority } from "../models/ReminderTemplate"
import { Task, TaskPriority, TaskStatus } from "../models/Task"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { ContactPerson } from "../models/ContactPerson"
import { User } from "../models/User"
import {
  NotificationService,
  NotificationType,
  NotificationPriority,
} from "./NotificationService"
import { EmailService } from "./EmailService"

interface ReminderResult {
  quoteId: string
  quoteNumber: string
  reminderType: ReminderType
  success: boolean
  actionTaken: ReminderAction
  error?: string
}

export class QuoteReminderService {
  /**
   * Check all quotes and send appropriate reminders
   * This method should be called by a scheduled job
   */
  static async checkAndSendReminders(): Promise<ReminderResult[]> {
    const results: ReminderResult[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    try {
      // Get all active quotes (SENT status)
      const quotes = await Quote.findAll({
        where: {
          status: QuoteStatus.SENT,
        },
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            include: [
              {
                model: User,
                as: "assignedUser",
              },
            ],
          },
          {
            model: User,
            as: "assignedUser",
          },
        ],
      })

      console.log(`Checking ${quotes.length} quotes for reminders...`)

      for (const quote of quotes) {
        const daysUntilExpiry = quote.getDaysUntilExpiry()

        if (daysUntilExpiry === null) {
          continue
        }

        let reminderType: ReminderType | null = null

        // Determine which reminder to send based on days until expiry
        if (daysUntilExpiry === 7) {
          reminderType = ReminderType.SEVEN_DAYS_BEFORE
        } else if (daysUntilExpiry === 3) {
          reminderType = ReminderType.THREE_DAYS_BEFORE
        } else if (daysUntilExpiry === 0) {
          reminderType = ReminderType.DAY_OF
        } else if (daysUntilExpiry < 0) {
          // Quote expired - send after_expiry reminder only once
          reminderType = ReminderType.AFTER_EXPIRY
        }

        if (reminderType) {
          // Check if this reminder has already been sent
          const alreadySent = await QuoteReminder.hasBeenSent(quote.id, reminderType)

          if (!alreadySent) {
            console.log(
              `Sending ${reminderType} reminder for quote ${quote.quoteNumber} (${daysUntilExpiry} days until expiry)`
            )
            const result = await this.sendReminderForQuote(quote, reminderType)
            results.push(result)
          }
        }
      }

      console.log(`Sent ${results.filter((r) => r.success).length} reminders`)
      return results
    } catch (error) {
      console.error("Error checking and sending reminders:", error)
      throw error
    }
  }

  /**
   * Send a specific reminder for a quote
   */
  static async sendReminderForQuote(
    quote: Quote,
    reminderType: ReminderType,
    customMessage?: string
  ): Promise<ReminderResult> {
    try {
      // Get the appropriate template
      const template = await ReminderTemplate.getTemplateForQuote(reminderType, {
        institutionType: quote.institution?.type,
        amount: quote.total,
        teamId: quote.assignedUser?.teamId,
      })

      if (!template) {
        return {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          reminderType,
          success: false,
          actionTaken: ReminderAction.NO_ACTION,
          error: "No template found for this reminder type",
        }
      }

      // Prepare template variables
      const variables = {
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        validUntil: quote.validUntil.toLocaleDateString("fr-FR"),
        total: quote.total.toFixed(2),
        institutionName: quote.institution?.name || "Client",
        assignedUserName: quote.assignedUser
          ? `${quote.assignedUser.firstName} ${quote.assignedUser.lastName}`
          : "Équipe commerciale",
        companyName: process.env.COMPANY_NAME || "Notre société",
      }

      // Render the template
      const rendered = template.render(variables)

      let actionTaken = ReminderAction.NO_ACTION

      // Send email if configured
      // Get recipient email from assigned user
      const recipientEmail = quote.assignedUser?.email

      if (recipientEmail) {
        try {
          const emailService = new EmailService()
          await emailService.sendEmail({
            to: recipientEmail,
            subject: rendered.subject,
            html: customMessage
              ? `<p>${customMessage}</p><hr>${rendered.body}`
              : rendered.body,
          })
          actionTaken = ReminderAction.EMAIL_SENT
        } catch (emailError) {
          console.error(`Failed to send email for quote ${quote.quoteNumber}:`, emailError)
          // Continue with other actions even if email fails
        }
      }

      // Create in-app notification
      if (rendered.notificationTitle && quote.assignedUserId) {
        try {
          const notificationService = NotificationService.getInstance()
          await notificationService.notifyUser(quote.assignedUserId, {
            type: NotificationType.QUOTE_REMINDER,
            priority: NotificationPriority.MEDIUM,
            title: rendered.notificationTitle,
            message: rendered.notificationMessage || rendered.subject,
            data: {
              quoteId: quote.id,
              quoteNumber: quote.quoteNumber,
              reminderType,
            },
            actionUrl: `/quotes/${quote.id}`,
            actionText: "Voir le devis",
          })
          if (actionTaken === ReminderAction.NO_ACTION) {
            actionTaken = ReminderAction.NOTIFICATION_CREATED
          }
        } catch (notifError) {
          console.error(
            `Failed to create notification for quote ${quote.quoteNumber}:`,
            notifError
          )
        }
      }

      // Create task if configured
      let taskId: string | undefined
      if (template.createTask && rendered.taskTitle && quote.assignedUserId) {
        try {
          const task = await Task.create({
            title: rendered.taskTitle,
            description: `Relance automatique pour le devis ${quote.quoteNumber}`,
            assigneeId: quote.assignedUserId,
            creatorId: quote.assignedUserId, // System-created task
            institutionId: quote.institutionId,
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
            priority: template.taskPriority || TaskPriority.MEDIUM,
            status: TaskStatus.TODO,
          })
          taskId = task.id
          actionTaken = ReminderAction.TASK_CREATED
        } catch (taskError) {
          console.error(`Failed to create task for quote ${quote.quoteNumber}:`, taskError)
        }
      }

      // Record the reminder
      await QuoteReminder.create({
        quoteId: quote.id,
        reminderType,
        sentAt: new Date(),
        recipientEmail,
        message: customMessage,
        actionTaken,
        metadata: {
          templateId: template.id,
          taskId,
        },
      })

      // Update quote's lastReminderSent
      await quote.update({ lastReminderSent: new Date() })

      return {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        reminderType,
        success: true,
        actionTaken,
      }
    } catch (error) {
      console.error(`Error sending reminder for quote ${quote.quoteNumber}:`, error)
      return {
        quoteId: quote.id,
        quoteNumber: quote.quoteNumber,
        reminderType,
        success: false,
        actionTaken: ReminderAction.NO_ACTION,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Manually send a reminder for a quote
   */
  static async sendManualReminder(
    quoteId: string,
    reminderType: ReminderType,
    userId: string,
    customMessage?: string
  ): Promise<ReminderResult> {
    const quote = await Quote.findByPk(quoteId, {
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
        },
        {
          model: User,
          as: "assignedUser",
        },
      ],
    })

    if (!quote) {
      throw new Error(`Quote not found: ${quoteId}`)
    }

    const result = await this.sendReminderForQuote(quote, reminderType, customMessage)

    // Update the reminder record to include the user who sent it manually
    if (result.success) {
      const latestReminder = await QuoteReminder.findOne({
        where: {
          quoteId,
          reminderType,
        },
        order: [["sentAt", "DESC"]],
      })

      if (latestReminder) {
        await latestReminder.update({ sentByUserId: userId })
      }
    }

    return result
  }

  /**
   * Get quotes that need reminders soon
   */
  static async getQuotesNeedingAttention(): Promise<Quote[]> {
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    return Quote.findAll({
      where: {
        status: QuoteStatus.SENT,
        validUntil: {
          [Op.lte]: sevenDaysFromNow,
        },
      },
      include: [
        {
          model: MedicalInstitution,
          as: "institution",
          attributes: ["id", "name", "type", "email"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: QuoteReminder,
          as: "reminders",
        },
      ],
      order: [["validUntil", "ASC"]],
    })
  }

  /**
   * Get reminder statistics for a date range
   */
  static async getReminderStatistics(startDate?: Date, endDate?: Date) {
    return QuoteReminder.getStatistics(startDate, endDate)
  }

  /**
   * Get all reminders for a specific quote
   */
  static async getRemindersForQuote(quoteId: string): Promise<QuoteReminder[]> {
    return QuoteReminder.getForQuote(quoteId)
  }
}
