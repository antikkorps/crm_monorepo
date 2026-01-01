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

// GET /api/digiforma/institutions/:id/company - Get Digiforma company info for an institution
router.get(
  "/institutions/:id/company",
  requirePermission("canViewAllInstitutions"),
  DigiformaController.getInstitutionCompany
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

// GET /api/digiforma/unmatched-companies - Get unmatched Digiforma companies
router.get(
  "/unmatched-companies",
  requirePermission("canManageSystemSettings"),
  DigiformaController.getUnmatchedCompanies
)

// GET /api/digiforma/suggested-matches/:companyId - Get suggested matches for a company
router.get(
  "/suggested-matches/:companyId",
  requirePermission("canManageSystemSettings"),
  DigiformaController.getSuggestedMatches
)

// POST /api/digiforma/mappings - Create manual mapping
router.post(
  "/mappings",
  requirePermission("canManageSystemSettings"),
  DigiformaController.createManualMapping
)

// DELETE /api/digiforma/mappings/:id - Delete a mapping
router.delete(
  "/mappings/:id",
  requirePermission("canManageSystemSettings"),
  DigiformaController.deleteMapping
)

// GET /api/digiforma/fuzzy-matches - Get fuzzy matches needing review
router.get(
  "/fuzzy-matches",
  requirePermission("canManageSystemSettings"),
  DigiformaController.getFuzzyMatches
)

// POST /api/digiforma/mappings/:id/confirm - Confirm a fuzzy match
router.post(
  "/mappings/:id/confirm",
  requirePermission("canManageSystemSettings"),
  DigiformaController.confirmMapping
)

export default router
