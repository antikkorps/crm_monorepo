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
  requirePermission("canViewAllTasks"),
  OpportunityController.getOpportunities
)

// GET /api/opportunities/pipeline - Get pipeline view (grouped by stage)
router.get(
  "/pipeline",
  requirePermission("canViewAllTasks"),
  OpportunityController.getPipeline
)

// GET /api/opportunities/forecast - Get revenue forecast
router.get(
  "/forecast",
  requirePermission("canViewAllTasks"),
  OpportunityController.getForecast
)

// GET /api/opportunities/:id - Get single opportunity
router.get(
  "/:id",
  validateUUID,
  OpportunityController.getOpportunity
)

// POST /api/opportunities - Create new opportunity
router.post(
  "/",
  requirePermission("canCreateTasks"),
  OpportunityController.createOpportunity
)

// PUT /api/opportunities/:id - Update opportunity
router.put(
  "/:id",
  validateUUID,
  requirePermission("canEditOwnTasks"),
  OpportunityController.updateOpportunity
)

// PUT /api/opportunities/:id/stage - Update opportunity stage (move in pipeline)
router.put(
  "/:id/stage",
  validateUUID,
  requirePermission("canEditOwnTasks"),
  OpportunityController.updateStage
)

// DELETE /api/opportunities/:id - Delete opportunity
router.delete(
  "/:id",
  validateUUID,
  requirePermission("canDeleteTasks"),
  OpportunityController.deleteOpportunity
)

export default router
