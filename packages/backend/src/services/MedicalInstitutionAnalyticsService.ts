import { Op } from "sequelize"
import { User } from "../models"
import { TaskStatus } from "../models/Task"
import { logger } from "../utils/logger"

/**
 * Medical Institution Analytics Service
 * Handles collaboration data and timeline analytics for institutions
 */
export class MedicalInstitutionAnalyticsService {
  /**
   * Get collaboration data for an institution
   * Returns statistics and recent activities
   */
  static async getCollaborationData(institutionId: string, userId: string): Promise<{
    stats: {
      totalNotes: number
      totalMeetings: number
      totalCalls: number
      totalReminders: number
      totalTasks: number
      totalQuotes: number
      totalInvoices: number
      totalEngagementLetters: number
      upcomingMeetings: number
      pendingReminders: number
      openTasks: number
      pendingQuotes: number
      unpaidInvoices: number
    }
    recentNotes: any[]
    upcomingMeetings: any[]
    recentCalls: any[]
    pendingReminders: any[]
    openTasks: any[]
    recentQuotes: any[]
    recentInvoices: any[]
    recentEngagementLetters: any[]
  }> {
    try {
      // Helper function to safely execute queries - returns empty array on error
      const safeQuery = async <T>(queryFn: () => Promise<T[]>, queryName: string): Promise<T[]> => {
        try {
          return await queryFn()
        } catch (error) {
          logger.warn(`Collaboration query failed for ${queryName}`, {
            institutionId,
            error: (error as Error).message,
          })
          return []
        }
      }

      // Get all collaboration data in parallel for performance
      const [notes, meetings, calls, reminders, tasks, quotes, invoices, engagementLetters] = await Promise.all([
        // Get notes related to this institution
        safeQuery(async () => {
          const { Note } = await import("../models/Note")
          return Note.findByInstitution(institutionId)
        }, 'notes'),
        // Get meetings related to this institution
        safeQuery(async () => {
          const { Meeting } = await import("../models/Meeting")
          return Meeting.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "organizer",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        }, 'meetings'),
        // Get calls related to this institution
        safeQuery(async () => {
          const { Call } = await import("../models/Call")
          return Call.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        }, 'calls'),
        // Get reminders related to this institution
        safeQuery(async () => {
          const { Reminder } = await import("../models/Reminder")
          return Reminder.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["reminderDate", "ASC"]],
          })
        }, 'reminders'),
        // Get tasks related to this institution
        safeQuery(async () => {
          const { Task } = await import("../models/Task")
          return Task.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "assignee",
                attributes: ["id", "firstName", "lastName", "email"],
              },
              {
                model: User,
                as: "creator",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        }, 'tasks'),
        // Get quotes related to this institution
        safeQuery(async () => {
          const { Quote } = await import("../models/Quote")
          return Quote.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        }, 'quotes'),
        // Get invoices related to this institution
        safeQuery(async () => {
          const { Invoice } = await import("../models/Invoice")
          return Invoice.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        }, 'invoices'),
        // Get engagement letters related to this institution
        safeQuery(async () => {
          const { EngagementLetter } = await import("../models/EngagementLetter")
          return EngagementLetter.findAll({
            where: { institutionId },
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
            order: [["createdAt", "DESC"]],
          })
        }, 'engagementLetters'),
      ])

      // Calculate summary statistics
      const pendingQuoteStatuses = ['draft', 'pending', 'sent']
      const unpaidInvoiceStatuses = ['draft', 'pending', 'sent', 'partial', 'overdue']
      const stats = {
        totalNotes: notes.length,
        totalMeetings: meetings.length,
        totalCalls: calls.length,
        totalReminders: reminders.length,
        totalTasks: tasks.length,
        totalQuotes: quotes.length,
        totalInvoices: invoices.length,
        totalEngagementLetters: engagementLetters.length,
        upcomingMeetings: meetings.filter(m => new Date(m.startDate) > new Date()).length,
        pendingReminders: reminders.filter(r => !r.isCompleted && new Date(r.reminderDate) > new Date()).length,
        openTasks: tasks.filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED).length,
        pendingQuotes: quotes.filter(q => pendingQuoteStatuses.includes(q.status)).length,
        unpaidInvoices: invoices.filter(i => unpaidInvoiceStatuses.includes(i.status)).length,
      }

      const result = {
        stats,
        recentNotes: notes.slice(0, 5),
        upcomingMeetings: meetings
          .filter(m => new Date(m.startDate) > new Date())
          .slice(0, 5),
        recentCalls: calls.slice(0, 5),
        pendingReminders: reminders
          .filter(r => !r.isCompleted)
          .slice(0, 5),
        openTasks: tasks
          .filter(t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED)
          .slice(0, 10),
        recentQuotes: quotes.slice(0, 5),
        recentInvoices: invoices.slice(0, 5),
        recentEngagementLetters: engagementLetters.slice(0, 5),
      }

      logger.info("Collaboration data retrieved", {
        userId,
        institutionId,
        stats,
      })

      return result
    } catch (error) {
      logger.error("Failed to get collaboration data", {
        userId,
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Get timeline of all interactions for an institution
   * Returns a chronological list of activities
   */
  static async getTimeline(params: {
    institutionId: string
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
    userId: string
  }): Promise<{
    items: any[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
  }> {
    const {
      institutionId,
      limit = 50,
      offset = 0,
      startDate,
      endDate,
      userId
    } = params

    try {
      const whereClause: any = { institutionId }

      // Add date filtering if provided
      if (startDate || endDate) {
        whereClause.createdAt = {}
        if (startDate) {
          whereClause.createdAt[Op.gte] = startDate
        }
        if (endDate) {
          whereClause.createdAt[Op.lte] = endDate
        }
      }

      // Helper function to safely execute queries - returns empty array on error
      const safeQuery = async <T>(queryFn: () => Promise<T[]>, queryName: string): Promise<T[]> => {
        try {
          return await queryFn()
        } catch (error) {
          logger.warn(`Timeline query failed for ${queryName}`, {
            institutionId,
            error: (error as Error).message,
          })
          return []
        }
      }

      // Get all interactions for this institution in parallel
      const [notes, meetings, calls, reminders, tasks, quotes, invoices, engagementLetters] = await Promise.all([
        safeQuery(async () => {
          const { Note } = await import("../models/Note")
          return Note.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "creator",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'notes'),
        safeQuery(async () => {
          const { Meeting } = await import("../models/Meeting")
          return Meeting.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "organizer",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'meetings'),
        safeQuery(async () => {
          const { Call } = await import("../models/Call")
          return Call.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'calls'),
        safeQuery(async () => {
          const { Reminder } = await import("../models/Reminder")
          return Reminder.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'reminders'),
        safeQuery(async () => {
          const { Task } = await import("../models/Task")
          return Task.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "assignee",
                attributes: ["id", "firstName", "lastName", "email"],
              },
              {
                model: User,
                as: "creator",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'tasks'),
        safeQuery(async () => {
          const { Quote } = await import("../models/Quote")
          return Quote.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'quotes'),
        safeQuery(async () => {
          const { Invoice } = await import("../models/Invoice")
          return Invoice.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'invoices'),
        safeQuery(async () => {
          const { EngagementLetter } = await import("../models/EngagementLetter")
          return EngagementLetter.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        }, 'engagementLetters'),
      ])

      // Combine all interactions into a timeline
      const timelineItems: any[] = []

      // Add notes to timeline
      notes.forEach(note => {
        timelineItems.push({
          id: note.id,
          type: 'note',
          title: note.title,
          description: note.content.slice(0, 200) + (note.content.length > 200 ? '...' : ''),
          user: note.creator,
          createdAt: note.createdAt,
          metadata: {
            tags: note.tags,
            isPrivate: note.isPrivate,
          },
        })
      })

      // Add meetings to timeline
      meetings.forEach(meeting => {
        timelineItems.push({
          id: meeting.id,
          type: 'meeting',
          title: meeting.title,
          description: meeting.description || '',
          user: meeting.organizer,
          createdAt: meeting.createdAt,
          metadata: {
            startDate: meeting.startDate,
            endDate: meeting.endDate,
            location: meeting.location,
            status: meeting.status,
          },
        })
      })

      // Add calls to timeline
      calls.forEach(call => {
        timelineItems.push({
          id: call.id,
          type: 'call',
          title: call.phoneNumber, // Title is just the phone number, frontend formats based on callType
          description: call.summary || '',
          user: call.user,
          createdAt: call.createdAt,
          metadata: {
            phoneNumber: call.phoneNumber,
            duration: call.duration,
            callType: call.callType,
          },
        })
      })

      // Add reminders to timeline
      reminders.forEach(reminder => {
        timelineItems.push({
          id: reminder.id,
          type: 'reminder',
          title: reminder.title,
          description: reminder.description || '',
          user: reminder.user,
          createdAt: reminder.createdAt,
          metadata: {
            dueDate: reminder.reminderDate,
            priority: reminder.priority,
            isCompleted: reminder.isCompleted,
          },
        })
      })

      // Add tasks to timeline
      tasks.forEach(task => {
        timelineItems.push({
          id: task.id,
          type: 'task',
          title: task.title,
          description: task.description || '',
          user: task.creator,
          assignee: task.assignee,
          createdAt: task.createdAt,
          metadata: {
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
          },
        })
      })

      // Add quotes to timeline
      quotes.forEach(quote => {
        timelineItems.push({
          id: quote.id,
          type: 'quote',
          title: `${quote.quoteNumber} - ${quote.title}`,
          description: quote.description || '',
          user: quote.assignedUser,
          createdAt: quote.createdAt,
          metadata: {
            quoteNumber: quote.quoteNumber,
            status: quote.status,
            total: quote.total,
            validUntil: quote.validUntil,
            acceptedAt: quote.acceptedAt,
            rejectedAt: quote.rejectedAt,
            orderedAt: quote.orderedAt,
            orderNumber: quote.orderNumber,
          },
        })
      })

      // Add invoices to timeline
      invoices.forEach(invoice => {
        timelineItems.push({
          id: invoice.id,
          type: 'invoice',
          title: `${invoice.invoiceNumber} - ${invoice.title}`,
          description: '',
          user: invoice.assignedUser,
          createdAt: invoice.createdAt,
          metadata: {
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            total: invoice.total,
            dueDate: invoice.dueDate,
            paidAt: invoice.paidAt,
            totalPaid: invoice.totalPaid,
            remainingAmount: invoice.remainingAmount,
          },
        })
      })

      // Add engagement letters to timeline
      engagementLetters.forEach(letter => {
        const scopeText = typeof letter.scope === 'string'
          ? letter.scope
          : (letter.scope ? JSON.stringify(letter.scope).slice(0, 200) : '')
        timelineItems.push({
          id: letter.id,
          type: 'engagement_letter',
          title: `${letter.letterNumber} - ${letter.title}`,
          description: scopeText.slice(0, 200) + (scopeText.length > 200 ? '...' : ''),
          user: letter.assignedUser,
          createdAt: letter.createdAt,
          metadata: {
            letterNumber: letter.letterNumber,
            status: letter.status,
            missionType: letter.missionType,
            estimatedTotal: letter.estimatedTotal,
            validUntil: letter.validUntil,
            sentAt: letter.sentAt,
            acceptedAt: letter.acceptedAt,
            rejectedAt: letter.rejectedAt,
            completedAt: letter.completedAt,
          },
        })
      })

      // Sort by creation date (most recent first)
      timelineItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Apply pagination
      const total = timelineItems.length
      const paginatedItems = timelineItems.slice(Number(offset), Number(offset) + Number(limit))

      const result = {
        items: paginatedItems,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total,
        },
      }

      logger.info("Timeline retrieved", {
        userId,
        institutionId,
        totalItems: total,
        itemsReturned: paginatedItems.length,
      })

      return result
    } catch (error) {
      logger.error("Failed to get timeline", {
        userId,
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }
}
