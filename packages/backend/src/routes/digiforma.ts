import Router from "@koa/router"
import { DigiformaController } from "../controllers/DigiformaController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/digiforma" })

// Apply authentication middleware to all routes
router.use(authenticate)

// GET /api/digiforma/settings - Get Digiforma configuration
router.get(
  "/settings",
  requirePermission("canManageSystemSettings"),
  DigiformaController.getSettings
)

// POST /api/digiforma/settings - Update Digiforma configuration
router.post(
  "/settings",
  requirePermission("canManageSystemSettings"),
  DigiformaController.updateSettings
)

// POST /api/digiforma/test-connection - Test connection to Digiforma API
router.post(
  "/test-connection",
  requirePermission("canManageSystemSettings"),
  DigiformaController.testConnection
)

// POST /api/digiforma/sync - Trigger manual synchronization
router.post(
  "/sync",
  requirePermission("canManageSystemSettings"),
  DigiformaController.triggerSync
)

// GET /api/digiforma/sync/status - Get current sync status
router.get(
  "/sync/status",
  requirePermission("canViewInstitutionAnalytics"),
  DigiformaController.getSyncStatus
)

// GET /api/digiforma/sync/history - Get sync history
router.get(
  "/sync/history",
  requirePermission("canViewInstitutionAnalytics"),
  DigiformaController.getSyncHistory
)

// GET /api/digiforma/institutions/:id/quotes - Get Digiforma quotes for an institution
router.get(
  "/institutions/:id/quotes",
  requirePermission("canViewAllInstitutions"),
  DigiformaController.getInstitutionQuotes
)

// GET /api/digiforma/institutions/:id/invoices - Get Digiforma invoices for an institution
router.get(
  "/institutions/:id/invoices",
  requirePermission("canViewAllInstitutions"),
  DigiformaController.getInstitutionInvoices
)

export default router
