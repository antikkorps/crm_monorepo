import { Context } from "koa";
import { User, UserRole } from "../models/User";
import { MedicalInstitution } from "../models/MedicalInstitution";
import { Task } from "../models/Task";
import { Quote } from "../models/Quote";
import { Invoice } from "../models/Invoice";
import { Team } from "../models/Team";
import { Op } from "sequelize";
import { sequelize } from "../config/database";

/**
 * DashboardController
 * Provides aggregated metrics and statistics for the dashboard
 * with role-based filtering
 */
export class DashboardController {
  /**
   * Get dashboard metrics
   * GET /api/dashboard/metrics
   */
  static async getMetrics(ctx: Context): Promise<void> {
    const user = ctx.state.user as User;

    try {
      // Get period dates (default: current month)
      const { period = "month" } = ctx.query;
      const { startDate, endDate } = DashboardController.getPeriodDates(
        period as string
      );

      // Execute all metric queries in parallel for performance
      const [
        institutions,
        tasks,
        team,
        billing,
        newClients,
        conversionRate,
        growth,
      ] = await Promise.all([
        DashboardController.getInstitutionsMetrics(user),
        DashboardController.getTasksMetrics(user),
        DashboardController.getTeamMetrics(user),
        DashboardController.getBillingMetrics(user, startDate, endDate),
        DashboardController.getNewClientsMetrics(user, startDate, endDate),
        DashboardController.getConversionRate(user, startDate, endDate),
        DashboardController.getGrowthMetrics(user, startDate, endDate),
      ]);

      ctx.body = {
        success: true,
        data: {
          institutions,
          tasks,
          team,
          billing,
          newClients,
          conversionRate,
          growth,
          period: {
            type: period,
            startDate,
            endDate,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: "Failed to fetch dashboard metrics",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get institutions metrics with role-based filtering
   */
  private static async getInstitutionsMetrics(user: User): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const whereClause: any = {};

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    const [total, active] = await Promise.all([
      MedicalInstitution.count({ where: whereClause }),
      MedicalInstitution.count({
        where: { ...whereClause, isActive: true },
      }),
    ]);

    return {
      total,
      active,
      inactive: total - active,
    };
  }

  /**
   * Get tasks metrics with role-based filtering
   */
  private static async getTasksMetrics(user: User): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    overdue: number;
  }> {
    const whereClause: any = {};

    // Apply filtering based on role
    if (user.role === UserRole.USER) {
      // USER sees only their own tasks
      whereClause.assigneeId = user.id;
    } else if (user.role === UserRole.TEAM_ADMIN && user.teamId) {
      // TEAM_ADMIN sees team tasks
      whereClause.teamId = user.teamId;
    }
    // SUPER_ADMIN sees all tasks (no filter)

    const now = new Date();

    const [total, todo, inProgress, completed, cancelled, overdue] =
      await Promise.all([
        Task.count({ where: whereClause }),
        Task.count({ where: { ...whereClause, status: "todo" } }),
        Task.count({ where: { ...whereClause, status: "in_progress" } }),
        Task.count({ where: { ...whereClause, status: "completed" } }),
        Task.count({ where: { ...whereClause, status: "cancelled" } }),
        Task.count({
          where: {
            ...whereClause,
            status: { [Op.notIn]: ["completed", "cancelled"] },
            dueDate: { [Op.lt]: now },
          },
        }),
      ]);

    return {
      total,
      todo,
      inProgress,
      completed,
      cancelled,
      overdue,
    };
  }

  /**
   * Get team metrics
   */
  private static async getTeamMetrics(user: User): Promise<{
    totalMembers: number;
    activeMembers: number;
    teams: number;
  }> {
    if (user.role === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN sees all users and teams
      const [totalMembers, activeMembers, teams] = await Promise.all([
        User.count(),
        User.count({ where: { isActive: true } }),
        Team.count(),
      ]);

      return {
        totalMembers,
        activeMembers,
        teams,
      };
    } else if (user.teamId) {
      // TEAM_ADMIN and USER see their team members
      const [totalMembers, activeMembers] = await Promise.all([
        User.count({ where: { teamId: user.teamId } }),
        User.count({ where: { teamId: user.teamId, isActive: true } }),
      ]);

      return {
        totalMembers,
        activeMembers,
        teams: 1, // User's own team
      };
    }

    return {
      totalMembers: 1, // Just the user
      activeMembers: 1,
      teams: 0,
    };
  }

  /**
   * Get billing metrics for the period
   */
  private static async getBillingMetrics(
    user: User,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    quotesCount: number;
    invoicesCount: number;
    avgQuoteValue: number;
    avgInvoiceValue: number;
  }> {
    const whereClause: any = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    // Get invoice metrics
    const invoices = await Invoice.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("total")), "totalRevenue"],
        [sequelize.fn("SUM", sequelize.col("paidAmount")), "paidRevenue"],
        [sequelize.fn("AVG", sequelize.col("total")), "avgValue"],
      ],
      raw: true,
    });

    // Get quote metrics
    const quotes = await Quote.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("AVG", sequelize.col("total")), "avgValue"],
      ],
      raw: true,
    });

    const invoiceData = invoices[0] as any;
    const quoteData = quotes[0] as any;

    const totalRevenue = parseFloat(invoiceData?.totalRevenue || "0");
    const paidRevenue = parseFloat(invoiceData?.paidRevenue || "0");

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue: totalRevenue - paidRevenue,
      quotesCount: parseInt(quoteData?.count || "0"),
      invoicesCount: parseInt(invoiceData?.count || "0"),
      avgQuoteValue: parseFloat(quoteData?.avgValue || "0"),
      avgInvoiceValue: parseFloat(invoiceData?.avgValue || "0"),
    };
  }

  /**
   * Get new clients count for the period
   */
  private static async getNewClientsMetrics(
    user: User,
    startDate: Date,
    endDate: Date
  ): Promise<{
    count: number;
    percentageChange: number;
  }> {
    const whereClause: any = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    const currentPeriodCount = await MedicalInstitution.count({
      where: whereClause,
    });

    // Get previous period count for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate);

    const previousPeriodCount = await MedicalInstitution.count({
      where: {
        ...whereClause,
        createdAt: {
          [Op.between]: [previousStartDate, previousEndDate],
        },
      },
    });

    const percentageChange =
      previousPeriodCount === 0
        ? 100
        : ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) *
          100;

    return {
      count: currentPeriodCount,
      percentageChange: Math.round(percentageChange * 10) / 10,
    };
  }

  /**
   * Get conversion rate (quotes to invoices)
   */
  private static async getConversionRate(
    user: User,
    startDate: Date,
    endDate: Date
  ): Promise<{
    rate: number;
    quotesAccepted: number;
    quotesTotal: number;
  }> {
    const whereClause: any = {
      createdAt: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    const [quotesTotal, quotesAccepted] = await Promise.all([
      Quote.count({ where: whereClause }),
      Quote.count({ where: { ...whereClause, status: "accepted" } }),
    ]);

    const rate = quotesTotal === 0 ? 0 : (quotesAccepted / quotesTotal) * 100;

    return {
      rate: Math.round(rate * 10) / 10,
      quotesAccepted,
      quotesTotal,
    };
  }

  /**
   * Get growth metrics compared to previous period
   */
  private static async getGrowthMetrics(
    user: User,
    startDate: Date,
    endDate: Date
  ): Promise<{
    revenueGrowth: number;
    clientsGrowth: number;
    tasksCompletedGrowth: number;
  }> {
    const whereClause: any = {};

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate);

    // Current period metrics
    const [currentRevenue, currentClients, currentTasksCompleted] =
      await Promise.all([
        Invoice.sum("total", {
          where: {
            ...whereClause,
            createdAt: { [Op.between]: [startDate, endDate] },
          },
        }),
        MedicalInstitution.count({
          where: {
            ...whereClause,
            createdAt: { [Op.between]: [startDate, endDate] },
          },
        }),
        Task.count({
          where: {
            ...whereClause,
            status: "completed",
            updatedAt: { [Op.between]: [startDate, endDate] },
          },
        }),
      ]);

    // Previous period metrics
    const [previousRevenue, previousClients, previousTasksCompleted] =
      await Promise.all([
        Invoice.sum("total", {
          where: {
            ...whereClause,
            createdAt: { [Op.between]: [previousStartDate, previousEndDate] },
          },
        }),
        MedicalInstitution.count({
          where: {
            ...whereClause,
            createdAt: { [Op.between]: [previousStartDate, previousEndDate] },
          },
        }),
        Task.count({
          where: {
            ...whereClause,
            status: "completed",
            updatedAt: { [Op.between]: [previousStartDate, previousEndDate] },
          },
        }),
      ]);

    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 1000) / 10;
    };

    return {
      revenueGrowth: calculateGrowth(
        currentRevenue || 0,
        previousRevenue || 0
      ),
      clientsGrowth: calculateGrowth(currentClients, previousClients),
      tasksCompletedGrowth: calculateGrowth(
        currentTasksCompleted,
        previousTasksCompleted
      ),
    };
  }

  /**
   * Get period dates based on period type
   */
  private static getPeriodDates(period: string): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      startDate,
      endDate: now,
    };
  }
}
