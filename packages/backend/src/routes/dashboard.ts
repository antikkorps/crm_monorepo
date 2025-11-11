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

export default router;
