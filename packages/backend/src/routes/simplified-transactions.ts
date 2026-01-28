import Router from "@koa/router"
import { SimplifiedTransactionController } from "../controllers/SimplifiedTransactionController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/simplified-transactions" })

// All simplified transaction routes require authentication
router.use(authenticate)

// GET /api/simplified-transactions - Get all simplified transactions with filtering
router.get(
  "/",
  requirePermission("canViewAllBilling"),
  SimplifiedTransactionController.getTransactions
)

// GET /api/simplified-transactions/statistics - Get statistics
router.get(
  "/statistics",
  requirePermission("canViewAllBilling"),
  SimplifiedTransactionController.getStatistics
)

// GET /api/simplified-transactions/institution/:institutionId - Get transactions by institution
router.get(
  "/institution/:institutionId",
  requirePermission("canViewAllBilling"),
  SimplifiedTransactionController.getTransactionsByInstitution
)

// GET /api/simplified-transactions/type/:type - Get transactions by type
router.get(
  "/type/:type",
  requirePermission("canViewAllBilling"),
  SimplifiedTransactionController.getTransactionsByType
)

// GET /api/simplified-transactions/timeline/:institutionId - Get transactions for timeline
router.get(
  "/timeline/:institutionId",
  requirePermission("canViewAllBilling"),
  SimplifiedTransactionController.getForTimeline
)

// GET /api/simplified-transactions/:id - Get a specific simplified transaction
router.get("/:id", SimplifiedTransactionController.getTransaction)

// POST /api/simplified-transactions - Create a new simplified transaction
router.post(
  "/",
  requirePermission("canCreateQuotes"),
  SimplifiedTransactionController.createTransaction
)

// PUT /api/simplified-transactions/:id - Update a simplified transaction
router.put("/:id", SimplifiedTransactionController.updateTransaction)

// DELETE /api/simplified-transactions/:id - Delete a simplified transaction (soft delete)
router.delete(
  "/:id",
  requirePermission("canDeleteQuotes"),
  SimplifiedTransactionController.deleteTransaction
)

export default router
