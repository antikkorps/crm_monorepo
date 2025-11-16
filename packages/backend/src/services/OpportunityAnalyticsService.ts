import { Op } from "sequelize"
import { Opportunity } from "../models/Opportunity"
import { User } from "../models/User"
import { MedicalInstitution } from "../models/MedicalInstitution"
import { ContactPerson } from "../models/ContactPerson"
import { logger } from "../utils/logger"

/**
 * Pipeline Analytics Interface
 */
export interface PipelineAnalytics {
  conversionRates: {
    byStage: Array<{
      stage: string
      totalEntered: number
      converted: number
      conversionRate: number
    }>
    overall: {
      totalOpportunities: number
      won: number
      lost: number
      winRate: number
      lossRate: number
    }
  }
  salesCycle: {
    averageDaysToClose: number
    averageDaysByStage: Array<{
      stage: string
      averageDays: number
    }>
    fastestDeal: {
      id: string
      name: string
      days: number
    } | null
    slowestDeal: {
      id: string
      name: string
      days: number
    } | null
  }
  winLossAnalysis: {
    wonDeals: {
      count: number
      totalValue: number
      averageValue: number
      topReasons: Array<{ reason: string; count: number }>
    }
    lostDeals: {
      count: number
      totalValue: number
      averageValue: number
      topReasons: Array<{ reason: string; count: number }>
    }
    competitorAnalysis: Array<{
      competitor: string
      lostDealsCount: number
      lostValue: number
    }>
  }
  revenue: {
    total: number
    won: number
    lost: number
    pipeline: number
  }
}

/**
 * Revenue Forecast Interface
 */
export interface RevenueForecast {
  summary: {
    totalPipelineValue: number
    weightedPipelineValue: number
    expectedRevenue: number
    confidence: "high" | "medium" | "low"
  }
  byStage: Array<{
    stage: string
    count: number
    totalValue: number
    weightedValue: number
    averageProbability: number
  }>
  byMonth: Array<{
    month: string
    opportunitiesClosing: number
    expectedRevenue: number
    pessimistic: number
    optimistic: number
  }>
  topOpportunities: Array<{
    id: string
    name: string
    value: number
    probability: number
    expectedCloseDate: string
    stage: string
    institution: string
  }>
}

/**
 * Opportunity Analytics Service
 * Provides advanced analytics for sales pipeline and revenue forecasting
 */
export class OpportunityAnalyticsService {
  /**
   * Get comprehensive pipeline analytics
   */
  static async getPipelineAnalytics(filters: {
    startDate?: Date
    endDate?: Date
    assignedUserId?: string
    teamId?: string
  }): Promise<PipelineAnalytics> {
    try {
      const { startDate, endDate, assignedUserId, teamId } = filters

      // Build where clause
      const whereClause: any = {}
      if (startDate || endDate) {
        whereClause.createdAt = {}
        if (startDate) whereClause.createdAt[Op.gte] = startDate
        if (endDate) whereClause.createdAt[Op.lte] = endDate
      }
      if (assignedUserId) {
        whereClause.assignedUserId = assignedUserId
      }

      // Fetch opportunities
      let opportunities = await Opportunity.findAll({
        where: whereClause,
        include: [
          { model: User, as: "assignedUser", attributes: ["id", "firstName", "lastName", "teamId"] },
          { model: MedicalInstitution, as: "institution", attributes: ["id", "name"] },
        ],
      })

      // Filter by team if needed
      if (teamId) {
        opportunities = opportunities.filter((opp) => opp.assignedUser?.teamId === teamId)
      }

      // 1. CONVERSION RATES
      const stageOrder = ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]
      const stageTransitions: Map<string, { entered: number; converted: number }> = new Map()

      // Initialize stages
      stageOrder.forEach((stage) => {
        stageTransitions.set(stage, { entered: 0, converted: 0 })
      })

      // Count transitions (simplified: count current stage as entered)
      opportunities.forEach((opp) => {
        const currentStageIndex = stageOrder.indexOf(opp.stage)
        if (currentStageIndex >= 0) {
          stageTransitions.get(opp.stage)!.entered++

          // If opportunity progressed beyond this stage, count as converted
          if (opp.stage === "closed_won" || opp.stage === "closed_lost") {
            // Count all previous stages as converted
            for (let i = 0; i < currentStageIndex; i++) {
              stageTransitions.get(stageOrder[i])!.converted++
            }
          }
        }
      })

      const conversionByStage = Array.from(stageTransitions.entries()).map(([stage, data]) => ({
        stage,
        totalEntered: data.entered,
        converted: data.converted,
        conversionRate: data.entered > 0 ? Math.round((data.converted / data.entered) * 100 * 100) / 100 : 0,
      }))

      const wonOpps = opportunities.filter((o) => o.stage === "closed_won")
      const lostOpps = opportunities.filter((o) => o.stage === "closed_lost")
      const totalClosed = wonOpps.length + lostOpps.length

      const overallConversion = {
        totalOpportunities: opportunities.length,
        won: wonOpps.length,
        lost: lostOpps.length,
        winRate: totalClosed > 0 ? Math.round((wonOpps.length / totalClosed) * 100 * 100) / 100 : 0,
        lossRate: totalClosed > 0 ? Math.round((lostOpps.length / totalClosed) * 100 * 100) / 100 : 0,
      }

      // 2. SALES CYCLE ANALYSIS
      const closedOpps = opportunities.filter((o) => o.actualCloseDate)

      let averageDaysToClose = 0
      let fastestDeal = null
      let slowestDeal = null

      if (closedOpps.length > 0) {
        const daysToCloseArray = closedOpps.map((opp) => {
          const created = new Date(opp.createdAt)
          const closed = new Date(opp.actualCloseDate!)
          const days = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
          return { opp, days }
        })

        averageDaysToClose =
          Math.round(
            (daysToCloseArray.reduce((sum, item) => sum + item.days, 0) / daysToCloseArray.length) * 10
          ) / 10

        // Find fastest and slowest
        const sorted = daysToCloseArray.sort((a, b) => a.days - b.days)
        fastestDeal = {
          id: sorted[0].opp.id,
          name: sorted[0].opp.name,
          days: sorted[0].days,
        }
        slowestDeal = {
          id: sorted[sorted.length - 1].opp.id,
          name: sorted[sorted.length - 1].opp.name,
          days: sorted[sorted.length - 1].days,
        }
      }

      // Average days by stage (simplified - time from creation to current stage)
      const averageDaysByStage = stageOrder.map((stage) => {
        const oppsInStage = opportunities.filter((o) => o.stage === stage)
        if (oppsInStage.length === 0) {
          return { stage, averageDays: 0 }
        }

        const avgDays =
          oppsInStage.reduce((sum, opp) => {
            const days = Math.floor((Date.now() - new Date(opp.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            return sum + days
          }, 0) / oppsInStage.length

        return { stage, averageDays: Math.round(avgDays * 10) / 10 }
      })

      // 3. WIN/LOSS ANALYSIS
      const wonReasons = wonOpps
        .filter((o) => o.wonReason)
        .reduce((acc, o) => {
          acc[o.wonReason!] = (acc[o.wonReason!] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const lostReasons = lostOpps
        .filter((o) => o.lostReason)
        .reduce((acc, o) => {
          acc[o.lostReason!] = (acc[o.lostReason!] || 0) + 1
          return acc
        }, {} as Record<string, number>)

      const topWonReasons = Object.entries(wonReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      const topLostReasons = Object.entries(lostReasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Competitor analysis
      const competitorLosses = lostOpps
        .filter((o) => o.competitors && o.competitors.length > 0)
        .reduce((acc, o) => {
          o.competitors!.forEach((competitor) => {
            if (!acc[competitor]) {
              acc[competitor] = { count: 0, value: 0 }
            }
            acc[competitor].count++
            acc[competitor].value += parseFloat(o.value.toString())
          })
          return acc
        }, {} as Record<string, { count: number; value: number }>)

      const competitorAnalysis = Object.entries(competitorLosses)
        .map(([competitor, data]) => ({
          competitor,
          lostDealsCount: data.count,
          lostValue: Math.round(data.value * 100) / 100,
        }))
        .sort((a, b) => b.lostDealsCount - a.lostDealsCount)
        .slice(0, 10)

      const wonValue = wonOpps.reduce((sum, o) => sum + parseFloat(o.value.toString()), 0)
      const lostValue = lostOpps.reduce((sum, o) => sum + parseFloat(o.value.toString()), 0)

      const winLossAnalysis = {
        wonDeals: {
          count: wonOpps.length,
          totalValue: Math.round(wonValue * 100) / 100,
          averageValue: wonOpps.length > 0 ? Math.round((wonValue / wonOpps.length) * 100) / 100 : 0,
          topReasons: topWonReasons,
        },
        lostDeals: {
          count: lostOpps.length,
          totalValue: Math.round(lostValue * 100) / 100,
          averageValue: lostOpps.length > 0 ? Math.round((lostValue / lostOpps.length) * 100) / 100 : 0,
          topReasons: topLostReasons,
        },
        competitorAnalysis,
      }

      // 4. REVENUE SUMMARY
      const openOpps = opportunities.filter(
        (o) => o.stage !== "closed_won" && o.stage !== "closed_lost"
      )
      const pipelineValue = openOpps.reduce((sum, o) => sum + parseFloat(o.value.toString()), 0)

      const analytics: PipelineAnalytics = {
        conversionRates: {
          byStage: conversionByStage,
          overall: overallConversion,
        },
        salesCycle: {
          averageDaysToClose,
          averageDaysByStage,
          fastestDeal,
          slowestDeal,
        },
        winLossAnalysis,
        revenue: {
          total: Math.round((wonValue + lostValue + pipelineValue) * 100) / 100,
          won: Math.round(wonValue * 100) / 100,
          lost: Math.round(lostValue * 100) / 100,
          pipeline: Math.round(pipelineValue * 100) / 100,
        },
      }

      logger.info("Pipeline analytics calculated", {
        totalOpportunities: opportunities.length,
        wonDeals: wonOpps.length,
        lostDeals: lostOpps.length,
      })

      return analytics
    } catch (error) {
      logger.error("Failed to calculate pipeline analytics", {
        error: (error as Error).message,
      })
      throw error
    }
  }

  /**
   * Get revenue forecast based on open opportunities
   */
  static async getRevenueForecast(filters: {
    months?: number
    assignedUserId?: string
    teamId?: string
  }): Promise<RevenueForecast> {
    try {
      const { months = 6, assignedUserId, teamId } = filters

      // Fetch open opportunities
      const whereClause: any = {
        stage: { [Op.notIn]: ["closed_won", "closed_lost"] },
      }

      if (assignedUserId) {
        whereClause.assignedUserId = assignedUserId
      }

      let opportunities = await Opportunity.findAll({
        where: whereClause,
        include: [
          { model: User, as: "assignedUser", attributes: ["id", "firstName", "lastName", "teamId"] },
          { model: MedicalInstitution, as: "institution", attributes: ["id", "name"] },
        ],
      })

      // Filter by team
      if (teamId) {
        opportunities = opportunities.filter((opp) => opp.assignedUser?.teamId === teamId)
      }

      // Calculate weighted values
      const totalPipelineValue = opportunities.reduce((sum, o) => sum + parseFloat(o.value.toString()), 0)
      const weightedPipelineValue = opportunities.reduce(
        (sum, o) => sum + parseFloat(o.value.toString()) * (o.probability / 100),
        0
      )

      // Confidence based on number of opportunities and data quality
      let confidence: "high" | "medium" | "low" = "low"
      if (opportunities.length >= 20) confidence = "high"
      else if (opportunities.length >= 10) confidence = "medium"

      // By stage breakdown
      const stageGroups = opportunities.reduce((acc, opp) => {
        if (!acc[opp.stage]) {
          acc[opp.stage] = []
        }
        acc[opp.stage].push(opp)
        return acc
      }, {} as Record<string, typeof opportunities>)

      const byStage = Object.entries(stageGroups).map(([stage, opps]) => {
        const totalValue = opps.reduce((sum, o) => sum + parseFloat(o.value.toString()), 0)
        const weightedValue = opps.reduce(
          (sum, o) => sum + parseFloat(o.value.toString()) * (o.probability / 100),
          0
        )
        const avgProbability = opps.reduce((sum, o) => sum + o.probability, 0) / opps.length

        return {
          stage,
          count: opps.length,
          totalValue: Math.round(totalValue * 100) / 100,
          weightedValue: Math.round(weightedValue * 100) / 100,
          averageProbability: Math.round(avgProbability * 10) / 10,
        }
      })

      // By month forecast
      const now = new Date()
      const monthlyForecast: Map<
        string,
        { opps: typeof opportunities; expectedRevenue: number }
      > = new Map()

      // Initialize months
      for (let i = 0; i < months; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
        const key = date.toISOString().slice(0, 7) // YYYY-MM
        monthlyForecast.set(key, { opps: [], expectedRevenue: 0 })
      }

      // Group by expected close month
      opportunities.forEach((opp) => {
        if (opp.expectedCloseDate) {
          const closeDate = new Date(opp.expectedCloseDate)
          const key = closeDate.toISOString().slice(0, 7)
          if (monthlyForecast.has(key)) {
            const data = monthlyForecast.get(key)!
            data.opps.push(opp)
            data.expectedRevenue += parseFloat(opp.value.toString()) * (opp.probability / 100)
          }
        }
      })

      const byMonth = Array.from(monthlyForecast.entries()).map(([month, data]) => {
        const expected = data.expectedRevenue
        return {
          month,
          opportunitiesClosing: data.opps.length,
          expectedRevenue: Math.round(expected * 100) / 100,
          pessimistic: Math.round(expected * 0.7 * 100) / 100, // 70% of expected
          optimistic: Math.round(expected * 1.3 * 100) / 100, // 130% of expected
        }
      })

      // Top opportunities by weighted value
      const topOpportunities = opportunities
        .map((opp) => ({
          id: opp.id,
          name: opp.name,
          value: parseFloat(opp.value.toString()),
          probability: opp.probability,
          expectedCloseDate: opp.expectedCloseDate ? opp.expectedCloseDate.toISOString() : "",
          stage: opp.stage,
          institution: opp.institution?.name || "",
          weightedValue: parseFloat(opp.value.toString()) * (opp.probability / 100),
        }))
        .sort((a, b) => b.weightedValue - a.weightedValue)
        .slice(0, 10)
        .map(({ weightedValue, ...rest }) => rest) // Remove weightedValue from output

      const forecast: RevenueForecast = {
        summary: {
          totalPipelineValue: Math.round(totalPipelineValue * 100) / 100,
          weightedPipelineValue: Math.round(weightedPipelineValue * 100) / 100,
          expectedRevenue: Math.round(weightedPipelineValue * 100) / 100,
          confidence,
        },
        byStage,
        byMonth,
        topOpportunities,
      }

      logger.info("Revenue forecast calculated", {
        totalPipeline: totalPipelineValue,
        weightedPipeline: weightedPipelineValue,
        confidence,
      })

      return forecast
    } catch (error) {
      logger.error("Failed to calculate revenue forecast", {
        error: (error as Error).message,
      })
      throw error
    }
  }
}
