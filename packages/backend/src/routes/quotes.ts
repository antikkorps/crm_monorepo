import Router from "koa-router"
import { QuoteController } from "../controllers/QuoteController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/quotes" })

// All quote routes require authentication
router.use(authenticate)

// GET /api/quotes - Get all quotes with filtering
router.get("/", requirePermission("canViewAllBilling"), QuoteController.getQuotes)

// GET /api/quotes/statistics - Get quote statistics
router.get(
  "/statistics",
  requirePermission("canViewAllBilling"),
  QuoteController.getQuoteStatistics
)

// GET /api/quotes/institution/:institutionId - Get quotes by institution
router.get(
  "/institution/:institutionId",
  requirePermission("canViewAllBilling"),
  QuoteController.getQuotesByInstitution
)

// GET /api/quotes/user/:userId - Get quotes by user
router.get(
  "/user/:userId",
  requirePermission("canViewAllBilling"),
  QuoteController.getQuotesByUser
)

// GET /api/quotes/status/:status - Get quotes by status
router.get(
  "/status/:status",
  requirePermission("canViewAllBilling"),
  QuoteController.getQuotesByStatus
)

// GET /api/quotes/:id - Get a specific quote
router.get("/:id", QuoteController.getQuote)

// POST /api/quotes - Create a new quote
router.post("/", requirePermission("canCreateQuotes"), QuoteController.createQuote)

// PUT /api/quotes/:id - Update a quote
router.put("/:id", QuoteController.updateQuote)

// DELETE /api/quotes/:id - Delete a quote
router.delete("/:id", requirePermission("canDeleteQuotes"), QuoteController.deleteQuote)

// Quote status workflow endpoints
// PUT /api/quotes/:id/send - Send quote to client
router.put("/:id/send", QuoteController.sendQuote)

// PUT /api/quotes/:id/accept - Accept quote (client action)
router.put("/:id/accept", QuoteController.acceptQuote)

// PUT /api/quotes/:id/reject - Reject quote (client action)
router.put("/:id/reject", QuoteController.rejectQuote)

// PUT /api/quotes/:id/cancel - Cancel quote
router.put("/:id/cancel", QuoteController.cancelQuote)

// POST /api/quotes/:id/convert-to-invoice - Convert quote to invoice
router.post(
  "/:id/convert-to-invoice",
  requirePermission("canConvertQuotesToInvoices"),
  QuoteController.convertToInvoice
)

// Quote line management endpoints
// GET /api/quotes/:id/lines - Get quote lines
router.get("/:id/lines", QuoteController.getQuoteLines)

// POST /api/quotes/:id/lines - Add line to quote
router.post("/:id/lines", QuoteController.addQuoteLine)

// PUT /api/quotes/:id/lines/:lineId - Update quote line
router.put("/:id/lines/:lineId", QuoteController.updateQuoteLine)

// DELETE /api/quotes/:id/lines/:lineId - Delete quote line
router.delete("/:id/lines/:lineId", QuoteController.deleteQuoteLine)

// PUT /api/quotes/:id/lines/reorder - Reorder quote lines
router.put("/:id/lines/reorder", QuoteController.reorderQuoteLines)

// PDF generation and document management endpoints
// GET /api/quotes/:id/pdf - Generate and download quote PDF
router.get("/:id/pdf", QuoteController.generateQuotePdf)

// GET /api/quotes/:id/versions - Get document versions for quote
router.get("/:id/versions", QuoteController.getQuoteVersions)

export default router
