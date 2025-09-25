import Router from "@koa/router"
import { InvoiceController } from "../controllers/InvoiceController"
import { authenticate } from "../middleware/auth"
import { requirePermission, requireTeamPermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/invoices" })

// All invoice routes require authentication
router.use(authenticate)

// GET /api/invoices - Get all invoices with filtering
router.get("/", requirePermission("canViewAllBilling"), InvoiceController.getInvoices)

// GET /api/invoices/statistics - Get invoice statistics
router.get(
  "/statistics",
  requirePermission("canViewAllBilling"),
  InvoiceController.getInvoiceStatistics
)

// GET /api/invoices/institution/:institutionId - Get invoices by institution
router.get(
  "/institution/:institutionId",
  requirePermission("canViewAllBilling"),
  InvoiceController.getInvoicesByInstitution
)

// GET /api/invoices/user/:userId - Get invoices by user
router.get(
  "/user/:userId",
  requirePermission("canViewAllBilling"),
  InvoiceController.getInvoicesByUser
)

// GET /api/invoices/status/:status - Get invoices by status
router.get(
  "/status/:status",
  requirePermission("canViewAllBilling"),
  InvoiceController.getInvoicesByStatus
)

// GET /api/invoices/:id - Get a specific invoice
router.get("/:id", InvoiceController.getInvoice)

// POST /api/invoices - Create a new invoice
router.post("/", requirePermission("canCreateInvoices"), InvoiceController.createInvoice)

// POST /api/invoices/from-quote/:quoteId - Create invoice from quote
router.post(
  "/from-quote/:quoteId",
  requirePermission("canConvertQuotesToInvoices"),
  InvoiceController.createInvoiceFromQuote
)

// PUT /api/invoices/:id - Update an invoice
router.put("/:id", InvoiceController.updateInvoice)

// DELETE /api/invoices/:id - Delete an invoice
router.delete(
  "/:id",
  requirePermission("canDeleteInvoices"),
  InvoiceController.deleteInvoice
)

// Invoice status workflow endpoints
// PUT /api/invoices/:id/send - Send invoice to client
// Align with quotes: allow users with invoice-edit permission; service enforces ownership
router.put("/:id/send", requireTeamPermission("canEditOwnInvoices"), InvoiceController.sendInvoice)

// PUT /api/invoices/:id/cancel - Cancel invoice
router.put("/:id/cancel", InvoiceController.cancelInvoice)

// Invoice line management endpoints
// GET /api/invoices/:id/lines - Get invoice lines
router.get("/:id/lines", InvoiceController.getInvoiceLines)

// POST /api/invoices/:id/lines - Add line to invoice
router.post("/:id/lines", InvoiceController.addInvoiceLine)

// PUT /api/invoices/:id/lines/:lineId - Update invoice line
router.put("/:id/lines/:lineId", InvoiceController.updateInvoiceLine)

// DELETE /api/invoices/:id/lines/:lineId - Delete invoice line
router.delete("/:id/lines/:lineId", InvoiceController.deleteInvoiceLine)

// PUT /api/invoices/:id/lines/reorder - Reorder invoice lines
router.put("/:id/lines/reorder", InvoiceController.reorderInvoiceLines)

// Payment management endpoints
// GET /api/invoices/:id/payments - Get invoice payments
router.get("/:id/payments", InvoiceController.getInvoicePayments)

// POST /api/invoices/:id/payments - Record payment for invoice
router.post(
  "/:id/payments",
  requirePermission("canRecordPayments"),
  InvoiceController.recordPayment
)

// PUT /api/invoices/payments/:paymentId/confirm - Confirm payment
router.put(
  "/payments/:paymentId/confirm",
  requirePermission("canRecordPayments"),
  InvoiceController.confirmPayment
)

// PUT /api/invoices/payments/:paymentId/cancel - Cancel payment
router.put(
  "/payments/:paymentId/cancel",
  requirePermission("canRecordPayments"),
  InvoiceController.cancelPayment
)

// PUT /api/invoices/:id/reconcile - Reconcile payments for invoice
router.put(
  "/:id/reconcile",
  requirePermission("canRecordPayments"),
  InvoiceController.reconcilePayments
)

// GET /api/invoices/payments/history - Get payment history with filtering
router.get(
  "/payments/history",
  requirePermission("canViewAllBilling"),
  InvoiceController.getPaymentHistory
)

// GET /api/invoices/payments/summary - Get payment summary and analytics
router.get(
  "/payments/summary",
  requirePermission("canViewAllBilling"),
  InvoiceController.getPaymentSummary
)

// PDF generation and document management endpoints
// GET /api/invoices/:id/pdf - Generate and download invoice PDF
router.get("/:id/pdf", InvoiceController.generateInvoicePdf)

// POST /api/invoices/:id/pdf - Generate invoice PDF with email options
router.post("/:id/pdf", InvoiceController.generateInvoicePdf)

// GET /api/invoices/:id/versions - Get document versions for invoice
router.get("/:id/versions", InvoiceController.getInvoiceVersions)

// POST /api/invoices/:id/payment-reminder - Send payment reminder email
router.post(
  "/:id/payment-reminder",
  requirePermission("canViewAllBilling"),
  InvoiceController.sendPaymentReminder
)

export default router
