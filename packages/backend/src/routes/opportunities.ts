import Router from "@koa/router"
import { OpportunityController } from "../controllers/OpportunityController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"
import { validateUUID } from "../middleware/validation"

const router = new Router({ prefix: "/api/opportunities" })

// All opportunity routes require authentication
router.use(authenticate)

// GET /api/opportunities - List opportunities with filtering
router.get(
  "/",
  requirePermission("canViewAllOpportunities"),
  OpportunityController.getOpportunities
)

// GET /api/opportunities/pipeline - Get pipeline view (grouped by stage)
router.get(
  "/pipeline",
  requirePermission("canManagePipeline"),
  OpportunityController.getPipeline
)

// GET /api/opportunities/forecast - Get revenue forecast
router.get(
  "/forecast",
  requirePermission("canViewForecast"),
  OpportunityController.getForecast
)

// GET /api/opportunities/:id - Get single opportunity
router.get(
  "/:id",
  validateUUID,
  requirePermission("canViewOwnOpportunities"),
  OpportunityController.getOpportunity
)

// POST /api/opportunities - Create new opportunity
router.post(
  "/",
  requirePermission("canCreateOpportunities"),
  OpportunityController.createOpportunity
)

// PUT /api/opportunities/:id - Update opportunity
router.put(
  "/:id",
  validateUUID,
  requirePermission("canEditOwnOpportunities"),
  OpportunityController.updateOpportunity
)

// PUT /api/opportunities/:id/stage - Update opportunity stage (move in pipeline)
router.put(
  "/:id/stage",
  validateUUID,
  requirePermission("canEditOwnOpportunities"),
  OpportunityController.updateStage
)

// DELETE /api/opportunities/:id - Delete opportunity
router.delete(
  "/:id",
  validateUUID,
  requirePermission("canDeleteOpportunities"),
  OpportunityController.deleteOpportunity
)

export default router
