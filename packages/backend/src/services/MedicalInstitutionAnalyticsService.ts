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
  }> {
    try {
      // Get all collaboration data in parallel for performance
      const [notes, meetings, calls, reminders, tasks, quotes, invoices] = await Promise.all([
        // Get notes related to this institution
        import("../models/Note").then(({ Note }) =>
          Note.findByInstitution(institutionId)
        ),
        // Get meetings related to this institution
        import("../models/Meeting").then(({ Meeting }) =>
          Meeting.findAll({
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
        ),
        // Get calls related to this institution
        import("../models/Call").then(({ Call }) =>
          Call.findAll({
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
        ),
        // Get reminders related to this institution
        import("../models/Reminder").then(({ Reminder }) =>
          Reminder.findAll({
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
        ),
        // Get tasks related to this institution
        import("../models/Task").then(({ Task }) =>
          Task.findAll({
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
        ),
        // Get quotes related to this institution
        import("../models/Quote").then(({ Quote }) =>
          Quote.findAll({
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
        ),
        // Get invoices related to this institution
        import("../models/Invoice").then(({ Invoice }) =>
          Invoice.findAll({
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
        ),
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

      // Get all interactions for this institution in parallel
      const [notes, meetings, calls, reminders, tasks, quotes, invoices] = await Promise.all([
        import("../models/Note").then(({ Note }) =>
          Note.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "creator",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Meeting").then(({ Meeting }) =>
          Meeting.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "organizer",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Call").then(({ Call }) =>
          Call.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Reminder").then(({ Reminder }) =>
          Reminder.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        import("../models/Task").then(({ Task }) =>
          Task.findAll({
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
        ),
        // Get quotes for this institution
        import("../models/Quote").then(({ Quote }) =>
          Quote.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
        // Get invoices for this institution
        import("../models/Invoice").then(({ Invoice }) =>
          Invoice.findAll({
            where: whereClause,
            include: [
              {
                model: User,
                as: "assignedUser",
                attributes: ["id", "firstName", "lastName", "email"],
              },
            ],
          })
        ),
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
