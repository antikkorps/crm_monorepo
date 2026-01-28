import { formatCurrency, SimplifiedTransactionType, SimplifiedTransactionStatus } from "@medical-crm/shared";
import { Op } from "sequelize";
import { sequelize } from "../config/database";
import { Invoice } from "../models/Invoice";
import { MedicalInstitution } from "../models/MedicalInstitution";
import { Quote } from "../models/Quote";
import { SimplifiedTransaction } from "../models/SimplifiedTransaction";
import { Task } from "../models/Task";
import { Team } from "../models/Team";
import { User, UserRole } from "../models/User";
import { Context } from "../types/koa";

/**
 * DashboardController
 * Provides aggregated metrics and statistics for the dashboard
 * with role-based filtering
 */
export class DashboardController {
  /**
   * Get recent activities timeline
   * GET /api/dashboard/activities
   */
  static async getActivities(ctx: Context): Promise<void> {
    const user = ctx.state.user as User;

    const { limit = 20, offset = 0, type } = ctx.query;

    const activities = await DashboardController.getRecentActivities(
      user,
      Number.parseInt(limit as string),
      Number.parseInt(offset as string),
      type as string | undefined
    );

    ctx.body = {
      success: true,
      data: activities,
    };
  }

  /**
   * Get smart alerts for the user
   * GET /api/dashboard/alerts
   */
  static async getAlerts(ctx: Context): Promise<void> {
    const user = ctx.state.user as User;

    const alerts = await DashboardController.getSmartAlerts(user);

    ctx.body = {
      success: true,
      data: alerts,
    };
  }

  /**
   * Get personalized quick actions
   * GET /api/dashboard/quick-actions
   */
  static async getQuickActions(ctx: Context): Promise<void> {
    const user = ctx.state.user as User;

    const actions = await DashboardController.getPersonalizedQuickActions(
      user
    );

    ctx.body = {
      success: true,
      data: actions,
    };
  }

  /**
   * Get dashboard metrics
   * GET /api/dashboard/metrics
   */
  static async getMetrics(ctx: Context): Promise<void> {
    const user = ctx.state.user as User;

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
    externalQuotesCount: number;
    externalInvoicesCount: number;
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

    // Simplified transactions use 'date' field instead of 'createdAt'
    const simplifiedWhereClause: any = {
      date: {
        [Op.between]: [startDate, endDate],
      },
    };

    // Get invoice metrics
    const invoices = await Invoice.findAll({
      where: whereClause,
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("total")), "totalRevenue"],
        [sequelize.fn("SUM", sequelize.col("paid_amount")), "paidRevenue"],
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

    // Get simplified transaction metrics (external references)
    const simplifiedInvoices = await SimplifiedTransaction.findAll({
      where: {
        ...simplifiedWhereClause,
        type: SimplifiedTransactionType.INVOICE,
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("amount_ttc")), "totalRevenue"],
      ],
      raw: true,
    });

    const simplifiedPaidInvoices = await SimplifiedTransaction.findAll({
      where: {
        ...simplifiedWhereClause,
        type: SimplifiedTransactionType.INVOICE,
        [Op.or]: [
          { status: SimplifiedTransactionStatus.PAID },
          { paymentStatus: "paid" },
        ],
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("amount_ttc")), "paidRevenue"],
      ],
      raw: true,
    });

    const simplifiedQuotes = await SimplifiedTransaction.findAll({
      where: {
        ...simplifiedWhereClause,
        type: SimplifiedTransactionType.QUOTE,
      },
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      raw: true,
    });

    const invoiceData = invoices[0] as any;
    const quoteData = quotes[0] as any;
    const simplifiedInvoiceData = simplifiedInvoices[0] as any;
    const simplifiedPaidInvoiceData = simplifiedPaidInvoices[0] as any;
    const simplifiedQuoteData = simplifiedQuotes[0] as any;

    // Combine internal and external metrics
    const internalTotalRevenue = parseFloat(invoiceData?.totalRevenue || "0");
    const internalPaidRevenue = parseFloat(invoiceData?.paidRevenue || "0");
    const externalTotalRevenue = parseFloat(simplifiedInvoiceData?.totalRevenue || "0");
    const externalPaidRevenue = parseFloat(simplifiedPaidInvoiceData?.paidRevenue || "0");

    const totalRevenue = internalTotalRevenue + externalTotalRevenue;
    const paidRevenue = internalPaidRevenue + externalPaidRevenue;

    const internalQuotesCount = Number.parseInt(quoteData?.count || "0");
    const externalQuotesCount = Number.parseInt(simplifiedQuoteData?.count || "0");
    const internalInvoicesCount = Number.parseInt(invoiceData?.count || "0");
    const externalInvoicesCount = Number.parseInt(simplifiedInvoiceData?.count || "0");

    return {
      totalRevenue,
      paidRevenue,
      unpaidRevenue: totalRevenue - paidRevenue,
      quotesCount: internalQuotesCount + externalQuotesCount,
      invoicesCount: internalInvoicesCount + externalInvoicesCount,
      avgQuoteValue: parseFloat(quoteData?.avgValue || "0"),
      avgInvoiceValue: parseFloat(invoiceData?.avgValue || "0"),
      externalQuotesCount,
      externalInvoicesCount,
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

    // Calculate percentage change, handling division by zero
    let percentageChange: number;
    if (previousPeriodCount === 0) {
      // If there were no items in the previous period
      if (currentPeriodCount > 0) {
        percentageChange = 100;
      } else {
        percentageChange = 0;
      }
    } else {
      percentageChange =
        ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100;
    }

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

    // Simplified transactions use 'date' field instead of 'createdAt'
    const simplifiedWhereClause: any = {
      date: {
        [Op.between]: [startDate, endDate],
      },
      type: SimplifiedTransactionType.QUOTE,
    };

    const [quotesTotal, quotesAccepted, externalQuotesTotal, externalQuotesAccepted] = await Promise.all([
      Quote.count({ where: whereClause }),
      Quote.count({ where: { ...whereClause, status: "accepted" } }),
      SimplifiedTransaction.count({ where: simplifiedWhereClause }),
      SimplifiedTransaction.count({
        where: {
          ...simplifiedWhereClause,
          status: SimplifiedTransactionStatus.ACCEPTED
        }
      }),
    ]);

    // Combine internal and external quotes
    const totalQuotes = quotesTotal + externalQuotesTotal;
    const totalAccepted = quotesAccepted + externalQuotesAccepted;

    const rate = totalQuotes === 0 ? 0 : (totalAccepted / totalQuotes) * 100;

    return {
      rate: Math.round(rate * 10) / 10,
      quotesAccepted: totalAccepted,
      quotesTotal: totalQuotes,
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

    // Current period metrics (internal + external invoices)
    const [
      currentInternalRevenue,
      currentExternalRevenue,
      currentClients,
      currentTasksCompleted
    ] = await Promise.all([
        Invoice.sum("total", {
          where: {
            ...whereClause,
            createdAt: { [Op.between]: [startDate, endDate] },
          },
        }),
        SimplifiedTransaction.sum("amountTtc", {
          where: {
            type: SimplifiedTransactionType.INVOICE,
            date: { [Op.between]: [startDate, endDate] },
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

    // Previous period metrics (internal + external invoices)
    const [
      previousInternalRevenue,
      previousExternalRevenue,
      previousClients,
      previousTasksCompleted
    ] = await Promise.all([
        Invoice.sum("total", {
          where: {
            ...whereClause,
            createdAt: { [Op.between]: [previousStartDate, previousEndDate] },
          },
        }),
        SimplifiedTransaction.sum("amountTtc", {
          where: {
            type: SimplifiedTransactionType.INVOICE,
            date: { [Op.between]: [previousStartDate, previousEndDate] },
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

    const currentRevenue = (currentInternalRevenue || 0) + (currentExternalRevenue || 0);
    const previousRevenue = (previousInternalRevenue || 0) + (previousExternalRevenue || 0);

    const calculateGrowth = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    };

    return {
      revenueGrowth: calculateGrowth(currentRevenue, previousRevenue),
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

  /**
   * Get recent activities timeline
   */
  private static async getRecentActivities(
    user: User,
    limit: number,
    offset: number,
    type?: string
  ): Promise<any[]> {
    const whereClause: any = {};

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    const activities: any[] = [];

    // Fetch recent institutions (if type filter allows)
    if (!type || type === "institution") {
      const institutions = await MedicalInstitution.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: Math.ceil(limit / 4),
        attributes: ["id", "name", "createdAt"],
        include: [
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });

      activities.push(
        ...institutions.map((inst: any) => ({
          id: `institution-${inst.id}`,
          type: "institution",
          action: "created",
          title: `Nouvelle institution : ${inst.name}`,
          description: `Institution ${inst.name} ajoutée`,
          entityId: inst.id,
          entityType: "institution",
          timestamp: inst.createdAt,
          user: inst.assignedUser
            ? {
                id: inst.assignedUser.id,
                name: `${inst.assignedUser.firstName} ${inst.assignedUser.lastName}`,
              }
            : null,
          icon: "mdi-domain",
          color: "blue",
        }))
      );
    }

    // Fetch recent tasks (if type filter allows)
    if (!type || type === "task") {
      const taskWhereClause = { ...whereClause };
      if (user.role === UserRole.USER) {
        taskWhereClause.assigneeId = user.id;
      }

      const tasks = await Task.findAll({
        where: taskWhereClause,
        order: [["createdAt", "DESC"]],
        limit: Math.ceil(limit / 4),
        attributes: ["id", "title", "status", "createdAt", "updatedAt"],
        include: [
          {
            model: User,
            as: "assignee",
            attributes: ["id", "firstName", "lastName"],
          },
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name"],
          },
        ],
      });

      activities.push(
        ...tasks.map((task: any) => ({
          id: `task-${task.id}`,
          type: "task",
          action: task.status === "completed" ? "completed" : "created",
          title:
            task.status === "completed"
              ? `Tâche complétée : ${task.title}`
              : `Nouvelle tâche : ${task.title}`,
          description: task.institution
            ? `${task.institution.name}`
            : "Aucune institution",
          entityId: task.id,
          entityType: "task",
          timestamp:
            task.status === "completed" ? task.updatedAt : task.createdAt,
          user: task.assignee
            ? {
                id: task.assignee.id,
                name: `${task.assignee.firstName} ${task.assignee.lastName}`,
              }
            : null,
          icon:
            task.status === "completed"
              ? "mdi-check-circle"
              : "mdi-clipboard-text",
          color: task.status === "completed" ? "success" : "info",
        }))
      );
    }

    // Fetch recent quotes (if type filter allows)
    if (!type || type === "quote") {
      const quotes = await Quote.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: Math.ceil(limit / 4),
        attributes: ["id", "quoteNumber", "total", "status", "createdAt"],
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });

      activities.push(
        ...quotes.map((quote: any) => ({
          id: `quote-${quote.id}`,
          type: "quote",
          action: "created",
          title: `Nouveau devis : ${quote.quoteNumber}`,
          description: `${formatCurrency(quote.total)} - ${quote.institution?.name || "N/A"}`,
          entityId: quote.id,
          entityType: "quote",
          timestamp: quote.createdAt,
          user: quote.assignedUser
            ? {
                id: quote.assignedUser.id,
                name: `${quote.assignedUser.firstName} ${quote.assignedUser.lastName}`,
              }
            : null,
          icon: "mdi-file-document",
          color: "orange",
        }))
      );
    }

    // Fetch recent invoices (if type filter allows)
    if (!type || type === "invoice") {
      const invoices = await Invoice.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: Math.ceil(limit / 4),
        attributes: [
          "id",
          "invoiceNumber",
          "total",
          "status",
          "createdAt",
        ],
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name"],
          },
          {
            model: User,
            as: "assignedUser",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });

      activities.push(
        ...invoices.map((invoice: any) => ({
          id: `invoice-${invoice.id}`,
          type: "invoice",
          action: "created",
          title: `Nouvelle facture : ${invoice.invoiceNumber}`,
          description: `${formatCurrency(invoice.total)} - ${invoice.institution?.name || "N/A"}`,
          entityId: invoice.id,
          entityType: "invoice",
          timestamp: invoice.createdAt,
          user: invoice.assignedUser
            ? {
                id: invoice.assignedUser.id,
                name: `${invoice.assignedUser.firstName} ${invoice.assignedUser.lastName}`,
              }
            : null,
          icon: "mdi-receipt",
          color: "green",
        }))
      );
    }

    // Fetch recent simplified transactions / external references (if type filter allows)
    if (!type || type === "external" || type === "simplified") {
      const simplifiedTransactions = await SimplifiedTransaction.findAll({
        order: [["date", "DESC"]],
        limit: Math.ceil(limit / 4),
        attributes: ["id", "type", "title", "referenceNumber", "amountTtc", "status", "date", "createdAt"],
        include: [
          {
            model: MedicalInstitution,
            as: "institution",
            attributes: ["id", "name"],
          },
          {
            model: User,
            as: "createdBy",
            attributes: ["id", "firstName", "lastName"],
          },
        ],
      });

      const getTypeLabel = (txType: string): string => {
        const labels: Record<string, string> = {
          quote: "Devis externe",
          invoice: "Facture externe",
          engagement_letter: "Lettre de mission externe",
          contract: "Contrat externe",
        };
        return labels[txType] || "Référence externe";
      };

      const getTypeIcon = (txType: string): string => {
        const icons: Record<string, string> = {
          quote: "mdi-file-document-outline",
          invoice: "mdi-receipt-text-outline",
          engagement_letter: "mdi-file-sign",
          contract: "mdi-file-document-edit-outline",
        };
        return icons[txType] || "mdi-link-variant";
      };

      const getTypeColor = (txType: string): string => {
        const colors: Record<string, string> = {
          quote: "orange",
          invoice: "teal",
          engagement_letter: "indigo",
          contract: "deep-purple",
        };
        return colors[txType] || "grey";
      };

      activities.push(
        ...simplifiedTransactions.map((tx: any) => ({
          id: `simplified-${tx.id}`,
          type: "external",
          action: "created",
          title: `${getTypeLabel(tx.type)} : ${tx.referenceNumber || tx.title}`,
          description: `${formatCurrency(tx.amountTtc)} - ${tx.institution?.name || "N/A"}`,
          entityId: tx.id,
          entityType: "simplified_transaction",
          timestamp: tx.date, // Use document date for chronological ordering
          user: tx.createdBy
            ? {
                id: tx.createdBy.id,
                name: `${tx.createdBy.firstName} ${tx.createdBy.lastName}`,
              }
            : null,
          icon: getTypeIcon(tx.type),
          color: getTypeColor(tx.type),
          isExternal: true,
          metadata: {
            transactionType: tx.type,
            referenceNumber: tx.referenceNumber,
            status: tx.status,
          },
        }))
      );
    }

    // Sort all activities by timestamp descending
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    return activities.slice(offset, offset + limit);
  }

  /**
   * Get smart alerts for the user
   */
  private static async getSmartAlerts(user: User): Promise<any[]> {
    const alerts: any[] = [];
    const whereClause: any = {};

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    if (user.role === UserRole.USER) {
      whereClause.assigneeId = user.id;
    }

    const now = new Date();

    // Alert: Overdue tasks
    const overdueTasks = await Task.count({
      where: {
        ...whereClause,
        status: { [Op.notIn]: ["completed", "cancelled"] },
        dueDate: { [Op.lt]: now },
      },
    });

    if (overdueTasks > 0) {
      alerts.push({
        id: "alert-overdue-tasks",
        type: "critical",
        title: "Tâches en retard",
        message: `Vous avez ${overdueTasks} tâche(s) en retard`,
        count: overdueTasks,
        icon: "mdi-alert-circle",
        color: "error",
        action: {
          label: "Voir les tâches",
          route: "/tasks?filter=overdue",
        },
        priority: 10,
      });
    }

    // Alert: Unpaid invoices (overdue 30+ days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const unpaidInvoices = await Invoice.count({
      where: {
        ...whereClause,
        status: { [Op.notIn]: ["paid", "cancelled"] },
        dueDate: { [Op.lt]: thirtyDaysAgo },
      },
    });

    if (unpaidInvoices > 0) {
      alerts.push({
        id: "alert-unpaid-invoices",
        type: "critical",
        title: "Factures impayées",
        message: `${unpaidInvoices} facture(s) impayée(s) depuis plus de 30 jours`,
        count: unpaidInvoices,
        icon: "mdi-currency-usd-off",
        color: "error",
        action: {
          label: "Voir les factures",
          route: "/invoices?filter=overdue",
        },
        priority: 9,
      });
    }

    // Alert: Quotes expiring soon (within 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const expiringQuotes = await Quote.count({
      where: {
        ...whereClause,
        status: "sent",
        validUntil: {
          [Op.between]: [now, sevenDaysFromNow],
        },
      },
    });

    if (expiringQuotes > 0) {
      alerts.push({
        id: "alert-expiring-quotes",
        type: "warning",
        title: "Devis à échéance proche",
        message: `${expiringQuotes} devis expire(nt) dans les 7 prochains jours`,
        count: expiringQuotes,
        icon: "mdi-clock-alert",
        color: "warning",
        action: {
          label: "Voir les devis",
          route: "/quotes?filter=expiring",
        },
        priority: 7,
      });
    }

    // Alert: Tasks due soon (within 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const tasksDueSoon = await Task.count({
      where: {
        ...whereClause,
        status: { [Op.notIn]: ["completed", "cancelled"] },
        dueDate: {
          [Op.between]: [now, threeDaysFromNow],
        },
      },
    });

    if (tasksDueSoon > 0) {
      alerts.push({
        id: "alert-tasks-due-soon",
        type: "info",
        title: "Tâches à venir",
        message: `${tasksDueSoon} tâche(s) à échéance dans les 3 prochains jours`,
        count: tasksDueSoon,
        icon: "mdi-calendar-clock",
        color: "info",
        action: {
          label: "Voir les tâches",
          route: "/tasks?filter=due-soon",
        },
        priority: 5,
      });
    }

    // Sort alerts by priority (descending)
    alerts.sort((a, b) => b.priority - a.priority);

    return alerts;
  }

  /**
   * Get personalized quick actions based on user context and behavior
   */
  private static async getPersonalizedQuickActions(
    user: User
  ): Promise<any[]> {
    const actions: any[] = [];
    const whereClause: any = {};

    // Apply team filtering for non-SUPER_ADMIN users
    if (user.role !== UserRole.SUPER_ADMIN && user.teamId) {
      whereClause.teamId = user.teamId;
    }

    if (user.role === UserRole.USER) {
      whereClause.assigneeId = user.id;
    }

    const now = new Date();

    // Action 1: Complete overdue tasks
    const overdueTasks = await Task.count({
      where: {
        ...whereClause,
        status: { [Op.notIn]: ["completed", "cancelled"] },
        dueDate: { [Op.lt]: now },
      },
    });

    if (overdueTasks > 0) {
      actions.push({
        id: "action-complete-overdue-tasks",
        title: "Compléter les tâches en retard",
        description: `${overdueTasks} tâche(s) en retard nécessitent votre attention`,
        icon: "mdi-clock-alert",
        color: "error",
        route: "/tasks?filter=overdue",
        priority: 10,
        category: "urgent",
      });
    }

    // Action 2: Follow up on unpaid invoices
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const unpaidInvoices = await Invoice.count({
      where: {
        ...whereClause,
        status: { [Op.notIn]: ["paid", "cancelled"] },
        dueDate: { [Op.lt]: thirtyDaysAgo },
      },
    });

    if (unpaidInvoices > 0) {
      actions.push({
        id: "action-follow-unpaid-invoices",
        title: "Relancer les factures impayées",
        description: `${unpaidInvoices} facture(s) impayée(s) depuis plus de 30 jours`,
        icon: "mdi-currency-usd-off",
        color: "warning",
        route: "/invoices?filter=overdue",
        priority: 9,
        category: "finance",
      });
    }

    // Action 3: Review pending quotes
    const pendingQuotes = await Quote.count({
      where: {
        ...whereClause,
        status: "sent",
      },
    });

    if (pendingQuotes > 0) {
      actions.push({
        id: "action-review-pending-quotes",
        title: "Suivre les devis envoyés",
        description: `${pendingQuotes} devis en attente de réponse`,
        icon: "mdi-file-clock",
        color: "info",
        route: "/quotes?filter=sent",
        priority: 7,
        category: "sales",
      });
    }

    // Action 4: Create quote for recent institutions without tasks
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const recentInstitutions = await MedicalInstitution.count({
      where: {
        ...whereClause,
        createdAt: { [Op.gte]: sevenDaysAgo },
      },
    });

    if (recentInstitutions > 0) {
      actions.push({
        id: "action-create-quote-new-clients",
        title: "Créer des devis pour nouveaux clients",
        description: `${recentInstitutions} nouveau(x) client(s) cette semaine`,
        icon: "mdi-file-plus",
        color: "success",
        route: "/quotes/new",
        priority: 6,
        category: "sales",
      });
    }

    // Action 5: Plan upcoming tasks (for next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    const upcomingTasks = await Task.count({
      where: {
        ...whereClause,
        status: { [Op.notIn]: ["completed", "cancelled"] },
        dueDate: {
          [Op.between]: [now, threeDaysFromNow],
        },
      },
    });

    if (upcomingTasks > 0) {
      actions.push({
        id: "action-plan-upcoming-tasks",
        title: "Planifier les tâches à venir",
        description: `${upcomingTasks} tâche(s) prévues dans les 3 prochains jours`,
        icon: "mdi-calendar-check",
        color: "primary",
        route: "/tasks?filter=upcoming",
        priority: 5,
        category: "planning",
      });
    }

    // Action 6: Add new institution (always available)
    actions.push({
      id: "action-add-institution",
      title: "Ajouter une institution",
      description: "Créer une nouvelle institution dans le CRM",
      icon: "mdi-domain-plus",
      color: "blue",
      route: "/institutions/new",
      priority: 3,
      category: "general",
    });

    // Action 7: View analytics (if SUPER_ADMIN or TEAM_ADMIN)
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.TEAM_ADMIN
    ) {
      actions.push({
        id: "action-view-analytics",
        title: "Consulter les analytics",
        description: "Analyser les performances et KPIs",
        icon: "mdi-chart-line",
        color: "purple",
        route: "/billing/analytics",
        priority: 4,
        category: "analytics",
      });
    }

    // Sort actions by priority (descending)
    actions.sort((a, b) => b.priority - a.priority);

    // Return top 6 actions
    return actions.slice(0, 6);
  }
}
