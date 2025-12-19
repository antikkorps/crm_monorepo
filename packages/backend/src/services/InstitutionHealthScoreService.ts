import { MedicalInstitution } from "../models/MedicalInstitution"
import { Meeting } from "../models/Meeting"
import { Call } from "../models/Call"
import { Note } from "../models/Note"
import { Task, TaskStatus } from "../models/Task"
import { Reminder } from "../models/Reminder"
import { Quote } from "../models/Quote"
import { Invoice } from "../models/Invoice"
import { InvoiceStatus, QuoteStatus } from "@medical-crm/shared"
import { logger } from "../utils/logger"

/**
 * Health Score Breakdown Interface
 */
export interface HealthScoreBreakdown {
  total: number // 0-100
  activityScore: number // 0-30
  recencyScore: number // 0-20
  revenueScore: number // 0-30
  engagementScore: number // 0-20
  factors: {
    totalInteractions: number
    lastInteractionDays: number
    lifetimeValue: number
    conversionRate: number
    overdueAmount: number
    pendingTasks: number
    completionRate: number
  }
  level: "excellent" | "good" | "fair" | "poor" | "critical"
  color: string
}

/**
 * Institution Health Score Service
 * Calculates a 0-100 health score based on activity, recency, revenue, and engagement
 */
export class InstitutionHealthScoreService {
  /**
   * Calculate comprehensive health score for an institution
   */
  static async calculateHealthScore(institutionId: string): Promise<HealthScoreBreakdown> {
    try {
      const institution = await MedicalInstitution.findByPk(institutionId)
      if (!institution) {
        throw new Error("Institution not found")
      }

      // Get all data in parallel for performance
      const now = new Date()
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const whereClause = { institutionId }

      // Use Promise.allSettled to handle individual failures gracefully
      const results = await Promise.allSettled([
        Meeting.findAll({ where: whereClause, attributes: ["id", "createdAt", "startDate"] }),
        Call.findAll({ where: whereClause, attributes: ["id", "createdAt", "callDate"] }),
        Note.findAll({ where: whereClause, attributes: ["id", "createdAt"] }),
        Task.findAll({ where: whereClause, attributes: ["id", "status", "dueDate", "createdAt"] }),
        Reminder.findAll({ where: whereClause, attributes: ["id", "isCompleted", "createdAt"] }),
        Quote.findAll({ where: whereClause, attributes: ["id", "status", "total", "createdAt"] }),
        Invoice.findAll({
          where: whereClause,
          attributes: ["id", "status", "total", "totalPaid", "dueDate", "createdAt"],
        }),
      ])

      // Extract successful results or provide default values
      const queryNames = [
        'Meeting.findAll',
        'Call.findAll',
        'Note.findAll',
        'Task.findAll',
        'Reminder.findAll',
        'Quote.findAll',
        'Invoice.findAll',
      ]

      // Extract meetings
      const meetings: Meeting[] = results[0].status === 'fulfilled' 
        ? results[0].value 
        : (() => {
            logger.warn(`Failed to fetch ${queryNames[0]} for institution ${institutionId}`, {
              error: (results[0] as PromiseRejectedResult).reason?.message || String((results[0] as PromiseRejectedResult).reason),
              institutionId,
            })
            return []
          })()

      // Extract calls
      const calls: Call[] = results[1].status === 'fulfilled' 
        ? results[1].value 
        : (() => {
            logger.warn(`Failed to fetch ${queryNames[1]} for institution ${institutionId}`, {
              error: (results[1] as PromiseRejectedResult).reason?.message || String((results[1] as PromiseRejectedResult).reason),
              institutionId,
            })
            return []
          })()

      // Extract notes
      const notes: Note[] = results[2].status === 'fulfilled' 
        ? results[2].value 
        : (() => {
            logger.warn(`Failed to fetch ${queryNames[2]} for institution ${institutionId}`, {
              error: (results[2] as PromiseRejectedResult).reason?.message || String((results[2] as PromiseRejectedResult).reason),
              institutionId,
            })
            return []
          })()

      // Extract tasks
      const tasks: Task[] = results[3].status === 'fulfilled' 
        ? results[3].value 
        : (() => {
            logger.warn(`Failed to fetch ${queryNames[3]} for institution ${institutionId}`, {
              error: (results[3] as PromiseRejectedResult).reason?.message || String((results[3] as PromiseRejectedResult).reason),
              institutionId,
            })
            return []
          })()

      // Extract reminders
      const reminders: Reminder[] = results[4].status === 'fulfilled' 
        ? results[4].value 
        : (() => {
            logger.warn(`Failed to fetch ${queryNames[4]} for institution ${institutionId}`, {
              error: (results[4] as PromiseRejectedResult).reason?.message || String((results[4] as PromiseRejectedResult).reason),
              institutionId,
            })
            return []
          })()

      // Extract quotes
      const quotes: Quote[] = results[5].status === 'fulfilled' 
        ? results[5].value 
        : (() => {
            logger.warn(`Failed to fetch ${queryNames[5]} for institution ${institutionId}`, {
              error: (results[5] as PromiseRejectedResult).reason?.message || String((results[5] as PromiseRejectedResult).reason),
              institutionId,
            })
            return []
          })()

      // Extract invoices
      const invoices: Invoice[] = results[6].status === 'fulfilled' 
        ? results[6].value 
        : (() => {
            logger.warn(`Failed to fetch ${queryNames[6]} for institution ${institutionId}`, {
              error: (results[6] as PromiseRejectedResult).reason?.message || String((results[6] as PromiseRejectedResult).reason),
              institutionId,
            })
            return []
          })()

      // 1. ACTIVITY SCORE (30 points)
      // Based on frequency of interactions in the last 3 months
      const recentInteractions = [
        ...meetings.filter((m) => new Date(m.createdAt) >= threeMonthsAgo),
        ...calls.filter((c) => new Date(c.createdAt) >= threeMonthsAgo),
        ...notes.filter((n) => new Date(n.createdAt) >= threeMonthsAgo),
      ]
      const totalInteractions = meetings.length + calls.length + notes.length

      // Score based on recent interactions (0-30)
      // 0-5 interactions = 0-10 points
      // 6-15 interactions = 11-20 points
      // 16+ interactions = 21-30 points
      let activityScore = 0
      if (recentInteractions.length >= 16) {
        activityScore = 30
      } else if (recentInteractions.length >= 6) {
        activityScore = 10 + ((recentInteractions.length - 5) / 10) * 10
      } else {
        activityScore = (recentInteractions.length / 5) * 10
      }

      // 2. RECENCY SCORE (20 points)
      // Based on how recent the last interaction was
      const allInteractionDates = [
        ...meetings.map((m) => new Date(m.createdAt)),
        ...calls.map((c) => new Date(c.createdAt)),
        ...notes.map((n) => new Date(n.createdAt)),
      ]

      let recencyScore = 0
      let lastInteractionDays = 999

      if (allInteractionDates.length > 0) {
        const lastInteraction = new Date(Math.max(...allInteractionDates.map((d) => d.getTime())))
        lastInteractionDays = Math.floor((now.getTime() - lastInteraction.getTime()) / (24 * 60 * 60 * 1000))

        // Score based on recency (0-20)
        // 0-7 days = 20 points
        // 8-30 days = 10-19 points
        // 31-90 days = 1-9 points
        // 90+ days = 0 points
        if (lastInteractionDays <= 7) {
          recencyScore = 20
        } else if (lastInteractionDays <= 30) {
          recencyScore = 10 + ((30 - lastInteractionDays) / 23) * 10
        } else if (lastInteractionDays <= 90) {
          recencyScore = ((90 - lastInteractionDays) / 60) * 9
        } else {
          recencyScore = 0
        }
      }

      // 3. REVENUE SCORE (30 points)
      // Based on LTV, payment behavior, and conversion rate
      const paidInvoices = invoices.filter((i) => i.status === InvoiceStatus.PAID)
      const lifetimeValue = paidInvoices.reduce((sum, i) => sum + parseFloat(i.totalPaid.toString()), 0)

      const totalQuotes = quotes.length
      const acceptedQuotes = quotes.filter((q) => q.status === QuoteStatus.ACCEPTED).length
      const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0

      const overdueInvoices = invoices.filter(
        (i) =>
          (i.status === InvoiceStatus.SENT ||
            i.status === InvoiceStatus.OVERDUE ||
            i.status === InvoiceStatus.PARTIALLY_PAID) &&
          i.dueDate &&
          new Date(i.dueDate) < now
      )
      const overdueAmount = overdueInvoices.reduce(
        (sum, i) => sum + (parseFloat(i.total.toString()) - parseFloat(i.totalPaid.toString())),
        0
      )

      // Revenue score breakdown:
      // LTV > 10000€ = 15 points, 5000-10000€ = 10 points, 1000-5000€ = 5 points, <1000€ = 0 points
      // Conversion rate > 50% = 10 points, 30-50% = 5 points, <30% = 0 points
      // No overdue = 5 points, some overdue = 0 points
      let revenueScore = 0

      // LTV component (0-15 points)
      if (lifetimeValue >= 10000) {
        revenueScore += 15
      } else if (lifetimeValue >= 5000) {
        revenueScore += 10
      } else if (lifetimeValue >= 1000) {
        revenueScore += 5
      }

      // Conversion rate component (0-10 points)
      if (conversionRate >= 50) {
        revenueScore += 10
      } else if (conversionRate >= 30) {
        revenueScore += 5
      }

      // Payment behavior component (0-5 points)
      if (overdueAmount === 0) {
        revenueScore += 5
      }

      // 4. ENGAGEMENT SCORE (20 points)
      // Based on task completion, reminders, and responsiveness
      const openTasks = tasks.filter(
        (t) => t.status === TaskStatus.TODO || t.status === TaskStatus.IN_PROGRESS
      )
      const completedTasks = tasks.filter((t) => t.status === TaskStatus.COMPLETED)
      const completionRate = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0

      const pendingReminders = reminders.filter((r) => !r.isCompleted)

      // Engagement score breakdown:
      // Completion rate > 70% = 10 points, 40-70% = 5 points, <40% = 0 points
      // Few pending tasks (<5) = 5 points, moderate (5-10) = 2 points, many (>10) = 0 points
      // Few pending reminders (<3) = 5 points, moderate (3-5) = 2 points, many (>5) = 0 points
      let engagementScore = 0

      // Task completion component (0-10 points)
      if (completionRate >= 70) {
        engagementScore += 10
      } else if (completionRate >= 40) {
        engagementScore += 5
      }

      // Pending tasks component (0-5 points)
      if (openTasks.length < 5) {
        engagementScore += 5
      } else if (openTasks.length <= 10) {
        engagementScore += 2
      }

      // Pending reminders component (0-5 points)
      if (pendingReminders.length < 3) {
        engagementScore += 5
      } else if (pendingReminders.length <= 5) {
        engagementScore += 2
      }

      // TOTAL SCORE
      const totalScore = Math.round(activityScore + recencyScore + revenueScore + engagementScore)

      // Determine level and color
      let level: "excellent" | "good" | "fair" | "poor" | "critical"
      let color: string

      if (totalScore >= 80) {
        level = "excellent"
        color = "#4CAF50" // green
      } else if (totalScore >= 60) {
        level = "good"
        color = "#8BC34A" // light green
      } else if (totalScore >= 40) {
        level = "fair"
        color = "#FFC107" // amber
      } else if (totalScore >= 20) {
        level = "poor"
        color = "#FF9800" // orange
      } else {
        level = "critical"
        color = "#F44336" // red
      }

      const breakdown: HealthScoreBreakdown = {
        total: totalScore,
        activityScore: Math.round(activityScore),
        recencyScore: Math.round(recencyScore),
        revenueScore: Math.round(revenueScore),
        engagementScore: Math.round(engagementScore),
        factors: {
          totalInteractions,
          lastInteractionDays,
          lifetimeValue: Math.round(lifetimeValue * 100) / 100,
          conversionRate: Math.round(conversionRate * 100) / 100,
          overdueAmount: Math.round(overdueAmount * 100) / 100,
          pendingTasks: openTasks.length,
          completionRate: Math.round(completionRate * 100) / 100,
        },
        level,
        color,
      }

      logger.info("Health score calculated", {
        institutionId,
        score: totalScore,
        level,
      })

      return breakdown
    } catch (error) {
      logger.error("Failed to calculate health score", {
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }
}
