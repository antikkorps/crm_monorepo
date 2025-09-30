import Router from "@koa/router"
import { DigiformaController } from "../controllers/DigiformaController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api" })

// Apply authentication middleware to all routes
router.use(authenticate)

// GET /api/institutions/:id/revenue/consolidated - Get consolidated revenue for an institution
router.get(
  "/institutions/:id/revenue/consolidated",
  requirePermission("canViewAllInstitutions"),
  DigiformaController.getInstitutionConsolidatedRevenue
)

// GET /api/dashboard/revenue/consolidated - Get global consolidated revenue
router.get(
  "/dashboard/revenue/consolidated",
  requirePermission("canViewInstitutionAnalytics"),
  DigiformaController.getGlobalConsolidatedRevenue
)

// GET /api/dashboard/revenue/evolution - Get revenue evolution by month
router.get(
  "/dashboard/revenue/evolution",
  requirePermission("canViewInstitutionAnalytics"),
  DigiformaController.getRevenueEvolution
)

export default router
