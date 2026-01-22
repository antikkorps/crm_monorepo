import { Op } from "sequelize"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { Opportunity } from "../models/Opportunity"
import { Quote } from "../models/Quote"
import { Invoice } from "../models/Invoice"
import { Meeting } from "../models/Meeting"
import { Call } from "../models/Call"
import { Note } from "../models/Note"
import { Task } from "../models/Task"
import { InvoiceStatus, QuoteStatus } from "@medical-crm/shared"
import { logger } from "../utils/logger"

/**
 * Lead Score Interface
 */
export interface LeadScore {
  institutionId: string
  institutionName: string
  score: number // 0-100
  level: "hot" | "warm" | "cold"
  factors: {
    sizeScore: number // Based on bed capacity
    specialtyMatchScore: number // Based on specialty alignment
    engagementScore: number // Based on interactions
    budgetScore: number // Based on historical revenue
    responseScore: number // Based on quote response time
  }
  signals: Array<{
    type: "positive" | "negative" | "neutral"
    signalKey: string // i18n key for translation
    signalParams?: Record<string, string | number> // Parameters for interpolation
    impact: number
  }>
  recommendations: Array<{
    key: string // i18n key for translation
    params?: Record<string, string | number> // Parameters for interpolation
  }>
}

/**
 * Next Best Action Interface
 */
export interface NextBestAction {
  institutionId: string
  institutionName: string
  priority: "urgent" | "high" | "medium" | "low"
  action: string
  reason: string
  category: "follow_up" | "upsell" | "retention" | "reactivation" | "closing"
  dueDate?: Date
  relatedData?: {
    type: string
    id: string
    details: any
  }
}

/**
 * Institution Insights Service
 * Provides lead scoring and action recommendations
 */
export class InstitutionInsightsService {
  /**
   * Calculate lead score for an institution
   */
  static async calculateLeadScore(institutionId: string): Promise<LeadScore> {
    try {
      const institution = await MedicalInstitution.findByPk(institutionId, {
        include: [{ association: "medicalProfile" }],
      })

      if (!institution) {
        throw new Error("Institution not found")
      }

      const now = new Date()
      const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      // Fetch data in parallel using Promise.allSettled for graceful error handling
      const results = await Promise.allSettled([
        Quote.findAll({ where: { institutionId }, attributes: ["id", "status", "total", "createdAt", "updatedAt"] }),
        Invoice.findAll({ where: { institutionId }, attributes: ["id", "status", "total", "totalPaid", "createdAt"] }),
        Meeting.findAll({ where: { institutionId, createdAt: { [Op.gte]: threeMonthsAgo } }, attributes: ["id", "createdAt"] }),
        Call.findAll({ where: { institutionId, createdAt: { [Op.gte]: threeMonthsAgo } }, attributes: ["id", "createdAt"] }),
        Note.findAll({ where: { institutionId, createdAt: { [Op.gte]: threeMonthsAgo } }, attributes: ["id", "createdAt"] }),
        Opportunity.findAll({ where: { institutionId }, attributes: ["id", "stage", "value", "createdAt"] }),
      ])

      // Extract successful results or use empty arrays as defaults
      const quotes = results[0].status === 'fulfilled' ? results[0].value : []
      const invoices = results[1].status === 'fulfilled' ? results[1].value : []
      const meetings = results[2].status === 'fulfilled' ? results[2].value : []
      const calls = results[3].status === 'fulfilled' ? results[3].value : []
      const notes = results[4].status === 'fulfilled' ? results[4].value : []
      const opportunities = results[5].status === 'fulfilled' ? results[5].value : []

      // Log any errors for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const queryNames = ['Quote.findAll', 'Invoice.findAll', 'Meeting.findAll', 'Call.findAll', 'Note.findAll', 'Opportunity.findAll']
          logger.error(`Error in calculateLeadScore - ${queryNames[index]} for institution ${institutionId}:`, result.reason)
        }
      })

      const signals: Array<{ type: "positive" | "negative" | "neutral"; signalKey: string; signalParams?: Record<string, string | number>; impact: number }> = []
      const recommendations: Array<{ key: string; params?: Record<string, string | number> }> = []

      // 1. SIZE SCORE (0-20 points) - Based on bed capacity
      let sizeScore = 0
      if (institution.medicalProfile?.bedCapacity) {
        const capacity = institution.medicalProfile.bedCapacity
        if (capacity >= 500) {
          sizeScore = 20
          signals.push({ type: "positive", signalKey: "sizeLarge", signalParams: { beds: 500 }, impact: 20 })
        } else if (capacity >= 200) {
          sizeScore = 15
          signals.push({ type: "positive", signalKey: "sizeMediumLarge", signalParams: { minBeds: 200, maxBeds: 499 }, impact: 15 })
        } else if (capacity >= 100) {
          sizeScore = 10
          signals.push({ type: "neutral", signalKey: "sizeMedium", signalParams: { minBeds: 100, maxBeds: 199 }, impact: 10 })
        } else {
          sizeScore = 5
          signals.push({ type: "neutral", signalKey: "sizeSmall", signalParams: { beds: 100 }, impact: 5 })
        }
      }

      // 2. SPECIALTY MATCH SCORE (0-20 points)
      // TODO: Configure target specialties in settings
      const targetSpecialties = ["Cardiology", "Oncology", "Neurology", "Surgery"]
      let specialtyMatchScore = 0
      if (institution.medicalProfile?.specialties && institution.medicalProfile.specialties.length > 0) {
        const matchingSpecialties = institution.medicalProfile.specialties.filter((s) =>
          targetSpecialties.some((target) => s.toLowerCase().includes(target.toLowerCase()))
        )
        if (matchingSpecialties.length >= 3) {
          specialtyMatchScore = 20
          signals.push({ type: "positive", signalKey: "specialtyHigh", signalParams: { count: matchingSpecialties.length }, impact: 20 })
        } else if (matchingSpecialties.length >= 2) {
          specialtyMatchScore = 15
          signals.push({ type: "positive", signalKey: "specialtyGood", signalParams: { count: matchingSpecialties.length }, impact: 15 })
        } else if (matchingSpecialties.length >= 1) {
          specialtyMatchScore = 10
          signals.push({ type: "neutral", signalKey: "specialtySome", signalParams: { count: matchingSpecialties.length }, impact: 10 })
        } else {
          specialtyMatchScore = 5
          signals.push({ type: "neutral", signalKey: "specialtyLow", impact: 5 })
        }
      }

      // 3. ENGAGEMENT SCORE (0-30 points) - Interaction frequency
      const recentInteractions = meetings.length + calls.length + notes.length
      let engagementScore = 0
      if (recentInteractions >= 20) {
        engagementScore = 30
        signals.push({ type: "positive", signalKey: "engagementHigh", signalParams: { count: recentInteractions, months: 3 }, impact: 30 })
      } else if (recentInteractions >= 10) {
        engagementScore = 20
        signals.push({ type: "positive", signalKey: "engagementGood", signalParams: { count: recentInteractions, months: 3 }, impact: 20 })
        recommendations.push({ key: "maintainEngagement" })
      } else if (recentInteractions >= 5) {
        engagementScore = 10
        signals.push({ type: "neutral", signalKey: "engagementModerate", signalParams: { count: recentInteractions, months: 3 }, impact: 10 })
        recommendations.push({ key: "increaseInteraction" })
      } else {
        engagementScore = 5
        signals.push({ type: "negative", signalKey: "engagementLow", signalParams: { count: recentInteractions, months: 3 }, impact: 5 })
        recommendations.push({ key: "scheduleDiscoveryCall" })
      }

      // 4. BUDGET SCORE (0-20 points) - Historical revenue
      const historicalRevenue = invoices
        .filter((inv) => inv.status === InvoiceStatus.PAID)
        .reduce((sum, inv) => sum + parseFloat(inv.totalPaid.toString()), 0)

      let budgetScore = 0
      if (historicalRevenue >= 50000) {
        budgetScore = 20
        signals.push({ type: "positive", signalKey: "budgetHigh", signalParams: { amount: Math.round(historicalRevenue) }, impact: 20 })
      } else if (historicalRevenue >= 20000) {
        budgetScore = 15
        signals.push({ type: "positive", signalKey: "budgetGood", signalParams: { amount: Math.round(historicalRevenue) }, impact: 15 })
      } else if (historicalRevenue >= 5000) {
        budgetScore = 10
        signals.push({ type: "neutral", signalKey: "budgetModerate", signalParams: { amount: Math.round(historicalRevenue) }, impact: 10 })
        recommendations.push({ key: "exploreUpsell" })
      } else if (historicalRevenue > 0) {
        budgetScore = 5
        signals.push({ type: "neutral", signalKey: "budgetLimited", signalParams: { amount: Math.round(historicalRevenue) }, impact: 5 })
        recommendations.push({ key: "buildRelationship" })
      } else {
        budgetScore = 0
        signals.push({ type: "neutral", signalKey: "budgetNone", impact: 0 })
        recommendations.push({ key: "qualifyBudget" })
      }

      // 5. RESPONSE SCORE (0-10 points) - Quote response time and acceptance
      const sentQuotes = quotes.filter((q) => q.status !== QuoteStatus.DRAFT)
      const acceptedQuotes = quotes.filter((q) => q.status === QuoteStatus.ACCEPTED)
      let responseScore = 0

      if (sentQuotes.length > 0) {
        const acceptanceRate = (acceptedQuotes.length / sentQuotes.length) * 100

        // Calculate average response time
        const responseTimes = sentQuotes
          .filter((q) => q.updatedAt && q.createdAt)
          .map((q) => {
            const sent = new Date(q.createdAt)
            const responded = new Date(q.updatedAt!)
            return Math.floor((responded.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24))
          })

        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
          : 999

        if (acceptanceRate >= 50 && avgResponseTime <= 7) {
          responseScore = 10
          signals.push({ type: "positive", signalKey: "responseQuick", signalParams: { rate: Math.round(acceptanceRate) }, impact: 10 })
        } else if (acceptanceRate >= 30 || avgResponseTime <= 14) {
          responseScore = 7
          signals.push({ type: "positive", signalKey: "responseGood", signalParams: { rate: Math.round(acceptanceRate) }, impact: 7 })
        } else {
          responseScore = 3
          signals.push({ type: "negative", signalKey: "responseSlow", signalParams: { rate: Math.round(acceptanceRate) }, impact: 3 })
          recommendations.push({ key: "followUpQuotes" })
        }
      }

      // Calculate total score
      const totalScore = sizeScore + specialtyMatchScore + engagementScore + budgetScore + responseScore

      // Determine lead level
      let level: "hot" | "warm" | "cold"
      if (totalScore >= 70) {
        level = "hot"
        recommendations.push({ key: "prioritizeImmediate" })
      } else if (totalScore >= 40) {
        level = "warm"
        recommendations.push({ key: "continueNurturing" })
      } else {
        level = "cold"
        recommendations.push({ key: "assessFitInterest" })
      }

      // Add opportunity-based signals
      const activeOpportunities = opportunities.filter(
        (o) => o.stage !== "closed_won" && o.stage !== "closed_lost"
      )
      if (activeOpportunities.length > 0) {
        signals.push({
          type: "positive",
          signalKey: "activeOpportunities",
          signalParams: { count: activeOpportunities.length },
          impact: 10,
        })
      }

      const leadScore: LeadScore = {
        institutionId,
        institutionName: institution.name,
        score: totalScore,
        level,
        factors: {
          sizeScore,
          specialtyMatchScore,
          engagementScore,
          budgetScore,
          responseScore,
        },
        signals: signals.sort((a, b) => b.impact - a.impact),
        recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      }

      logger.info("Lead score calculated", {
        institutionId,
        score: totalScore,
        level,
      })

      return leadScore
    } catch (error) {
      logger.error("Failed to calculate lead score", {
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Get next best actions for an institution
   */
  static async getNextBestActions(institutionId: string): Promise<NextBestAction[]> {
    try {
      const institution = await MedicalInstitution.findByPk(institutionId)
      if (!institution) {
        throw new Error("Institution not found")
      }

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const actions: NextBestAction[] = []

      // Fetch relevant data using Promise.allSettled for graceful error handling
      const results = await Promise.allSettled([
        Quote.findAll({
          where: { institutionId },
          order: [["createdAt", "DESC"]],
          limit: 10,
        }),
        Invoice.findAll({
          where: { institutionId },
          order: [["createdAt", "DESC"]],
          limit: 10,
        }),
        Opportunity.findAll({
          where: { institutionId },
          order: [["createdAt", "DESC"]],
        }),
        Meeting.findAll({
          where: { institutionId },
          order: [["startDate", "DESC"]],
          limit: 5,
        }),
        Call.findAll({
          where: { institutionId },
          order: [["callDate", "DESC"]],
          limit: 5,
        }),
      ])

      // Extract successful results or use empty arrays as defaults
      const quotes = results[0].status === 'fulfilled' ? results[0].value : []
      const invoices = results[1].status === 'fulfilled' ? results[1].value : []
      const opportunities = results[2].status === 'fulfilled' ? results[2].value : []
      const meetings = results[3].status === 'fulfilled' ? results[3].value : []
      const calls = results[4].status === 'fulfilled' ? results[4].value : []

      // Log any errors for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const queryNames = ['Quote.findAll', 'Invoice.findAll', 'Opportunity.findAll', 'Meeting.findAll', 'Call.findAll']
          logger.error(`Error in getNextBestActions - ${queryNames[index]} for institution ${institutionId}:`, result.reason)
        }
      })

      // 1. OVERDUE INVOICES - Highest priority
      const overdueInvoices = invoices.filter(
        (inv) =>
          (inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE || inv.status === InvoiceStatus.PARTIALLY_PAID) &&
          inv.dueDate &&
          new Date(inv.dueDate) < now
      )

      if (overdueInvoices.length > 0) {
        const totalOverdue = overdueInvoices.reduce(
          (sum, inv) => sum + (parseFloat(inv.total.toString()) - parseFloat(inv.totalPaid.toString())),
          0
        )

        actions.push({
          institutionId,
          institutionName: institution.name,
          priority: "urgent",
          action: `Follow up on ${overdueInvoices.length} overdue invoice(s)`,
          reason: `€${Math.round(totalOverdue)} in overdue payments`,
          category: "follow_up",
          dueDate: now,
          relatedData: {
            type: "invoices",
            id: overdueInvoices[0].id,
            details: { count: overdueInvoices.length, amount: totalOverdue },
          },
        })
      }

      // 2. PENDING QUOTES - High priority
      const pendingQuotes = quotes.filter((q) => q.status === QuoteStatus.SENT)
      if (pendingQuotes.length > 0) {
        const oldestPending = pendingQuotes[pendingQuotes.length - 1]
        const daysSinceSent = Math.floor((now.getTime() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60 * 24))

        if (daysSinceSent > 7) {
          actions.push({
            institutionId,
            institutionName: institution.name,
            priority: daysSinceSent > 14 ? "high" : "medium",
            action: `Follow up on pending quote`,
            reason: `Quote sent ${daysSinceSent} days ago with no response`,
            category: "follow_up",
            dueDate: now,
            relatedData: {
              type: "quote",
              id: oldestPending.id,
              details: { quoteNumber: oldestPending.quoteNumber, daysPending: daysSinceSent },
            },
          })
        }
      }

      // 3. STALLED OPPORTUNITIES
      const stalledOpportunities = opportunities.filter((opp) => {
        if (opp.stage === "closed_won" || opp.stage === "closed_lost") return false

        const daysSinceUpdate = Math.floor((now.getTime() - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 1000 * 24))
        return daysSinceUpdate > 14
      })

      if (stalledOpportunities.length > 0) {
        const stalled = stalledOpportunities[0]
        actions.push({
          institutionId,
          institutionName: institution.name,
          priority: "high",
          action: `Re-engage on stalled opportunity "${stalled.name}"`,
          reason: `No activity for ${Math.floor((now.getTime() - new Date(stalled.updatedAt).getTime()) / (1000 * 60 * 60 * 24))} days`,
          category: "closing",
          relatedData: {
            type: "opportunity",
            id: stalled.id,
            details: { stage: stalled.stage, value: stalled.value },
          },
        })
      }

      // 4. NO RECENT CONTACT - Retention risk
      const lastContact = [
        ...meetings.map((m) => new Date(m.startDate)),
        ...calls.map((c) => new Date(c.createdAt)),
      ].sort((a, b) => b.getTime() - a.getTime())[0]

      if (!lastContact || lastContact < thirtyDaysAgo) {
        const daysSinceContact = lastContact
          ? Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24))
          : 999

        actions.push({
          institutionId,
          institutionName: institution.name,
          priority: daysSinceContact > 60 ? "high" : "medium",
          action: "Schedule check-in call or meeting",
          reason: lastContact
            ? `No contact in ${daysSinceContact} days - risk of disengagement`
            : "No recorded interactions - establish contact",
          category: "retention",
          dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        })
      }

      // 5. ACCEPTED QUOTES WITHOUT INVOICES - Upsell/closing opportunity
      const recentAcceptedQuotes = quotes.filter(
        (q) => q.status === QuoteStatus.ACCEPTED && new Date(q.updatedAt!) > thirtyDaysAgo
      )

      if (recentAcceptedQuotes.length > 0) {
        const quote = recentAcceptedQuotes[0]
        // Check if invoice exists for this quote
        const hasInvoice = invoices.some((inv) => inv.quoteId === quote.id)

        if (!hasInvoice) {
          actions.push({
            institutionId,
            institutionName: institution.name,
            priority: "high",
            action: "Convert accepted quote to invoice",
            reason: "Quote accepted but not yet invoiced",
            category: "closing",
            relatedData: {
              type: "quote",
              id: quote.id,
              details: { quoteNumber: quote.quoteNumber },
            },
          })
        }
      }

      // 6. UPSELL OPPORTUNITIES - Based on successful deals
      const recentWonDeals = opportunities.filter(
        (opp) => opp.stage === "closed_won" && new Date(opp.actualCloseDate!) > thirtyDaysAgo
      )

      if (recentWonDeals.length > 0) {
        actions.push({
          institutionId,
          institutionName: institution.name,
          priority: "medium",
          action: "Explore upsell or cross-sell opportunities",
          reason: "Recent successful deal(s) - customer satisfaction likely high",
          category: "upsell",
          dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        })
      }

      // Sort by priority
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

      logger.info("Next best actions calculated", {
        institutionId,
        actionCount: actions.length,
      })

      return actions.slice(0, 5) // Return top 5 actions
    } catch (error) {
      logger.error("Failed to calculate next best actions", {
        institutionId,
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Get hot leads across all institutions
   */
  static async getHotLeads(limit = 20): Promise<LeadScore[]> {
    try {
      const institutions = await MedicalInstitution.findAll({
        where: { isActive: true },
        attributes: ["id", "name"],
        limit: 100, // Analyze top 100 active institutions
      })

      const scores = await Promise.all(
        institutions.map((inst) => this.calculateLeadScore(inst.id))
      )

      // Filter hot and warm leads, sort by score
      const hotLeads = scores
        .filter((score) => score.level === "hot" || score.level === "warm")
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)

      logger.info("Hot leads retrieved", {
        totalAnalyzed: institutions.length,
        hotLeadsCount: hotLeads.length,
      })

      return hotLeads
    } catch (error) {
      logger.error("Failed to get hot leads", {
        error: (error as Error).message,
      })
      throw error
    }
  }
}
