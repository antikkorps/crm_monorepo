import Router from "@koa/router"
import { SageController } from "../controllers/SageController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/sage" })

// Apply authentication middleware to all routes
router.use(authenticate)

// GET /api/sage/settings - Get Sage configuration
router.get(
  "/settings",
  requirePermission("canManageSystemSettings"),
  SageController.getSettings
)

// POST /api/sage/settings - Update Sage configuration
router.post(
  "/settings",
  requirePermission("canManageSystemSettings"),
  SageController.updateSettings
)

// POST /api/sage/test-connection - Test connection to Sage API
router.post(
  "/test-connection",
  requirePermission("canManageSystemSettings"),
  SageController.testConnection
)

// POST /api/sage/sync/customers - Trigger customer sync
router.post(
  "/sync/customers",
  requirePermission("canManageSystemSettings"),
  SageController.syncCustomers
)

// POST /api/sage/sync/invoices - Trigger invoice sync
router.post(
  "/sync/invoices",
  requirePermission("canManageSystemSettings"),
  SageController.syncInvoices
)

// POST /api/sage/sync/payments - Trigger payment sync
router.post(
  "/sync/payments",
  requirePermission("canManageSystemSettings"),
  SageController.syncPayments
)

// POST /api/sage/sync/all - Trigger complete sync (all entities)
router.post(
  "/sync/all",
  requirePermission("canManageSystemSettings"),
  SageController.syncAll
)

export default router
