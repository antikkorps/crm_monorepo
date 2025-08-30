import Router from "@koa/router"
import { BillingAnalyticsController } from "../controllers/BillingAnalyticsController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/billing/analytics" })

// All billing analytics routes require authentication
router.use(authenticate)

// GET /api/billing/analytics/dashboard - Get comprehensive billing dashboard data
router.get(
  "/dashboard",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.getDashboard
)

// GET /api/billing/analytics/revenue - Get revenue analytics
router.get(
  "/revenue",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.getRevenueAnalytics
)

// GET /api/billing/analytics/payments - Get payment analytics
router.get(
  "/payments",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.getPaymentAnalytics
)

// GET /api/billing/analytics/outstanding - Get outstanding invoice analytics
router.get(
  "/outstanding",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.getOutstandingAnalytics
)

// GET /api/billing/analytics/segments - Get medical institution segment analytics
router.get(
  "/segments",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.getSegmentAnalytics
)

// GET /api/billing/analytics/cash-flow - Get cash flow projections
router.get(
  "/cash-flow",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.getCashFlowProjections
)

// GET /api/billing/analytics/kpis - Get billing KPIs
router.get(
  "/kpis",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.getBillingKPIs
)

// GET /api/billing/analytics/export - Export analytics data to CSV
router.get(
  "/export",
  requirePermission("canViewAllBilling"),
  BillingAnalyticsController.exportAnalytics
)

export default router
