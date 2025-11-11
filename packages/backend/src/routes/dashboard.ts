import Router from "koa-router";
import { DashboardController } from "../controllers/DashboardController";
import { authenticate } from "../middleware/auth";

const router = new Router({
  prefix: "/api/dashboard",
});

/**
 * Dashboard Routes
 * All routes require authentication
 */

// Apply authentication to all dashboard routes
router.use(authenticate);

/**
 * GET /api/dashboard/metrics
 * Get aggregated dashboard metrics with role-based filtering
 * Query params:
 *  - period: 'week' | 'month' | 'quarter' | 'year' (default: 'month')
 */
router.get("/metrics", DashboardController.getMetrics);

/**
 * GET /api/dashboard/activities
 * Get recent activities timeline
 * Query params:
 *  - limit: number of activities (default: 20)
 *  - offset: pagination offset (default: 0)
 *  - type: filter by activity type (optional)
 */
router.get("/activities", DashboardController.getActivities);

/**
 * GET /api/dashboard/alerts
 * Get smart alerts for the current user
 */
router.get("/alerts", DashboardController.getAlerts);

/**
 * GET /api/dashboard/quick-actions
 * Get personalized quick actions based on user context
 */
router.get("/quick-actions", DashboardController.getQuickActions);

export default router;
