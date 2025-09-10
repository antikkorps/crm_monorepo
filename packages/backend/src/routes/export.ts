import Router from "@koa/router"
import { ExportController } from "../controllers/ExportController"
import { requireAuth } from "../middleware/auth"

const router = new Router({ prefix: "/api/export" })

// Apply authentication middleware to all export routes
router.use(requireAuth)

// Export endpoints
router.get("/institutions", ExportController.exportMedicalInstitutions)
router.get("/contacts", ExportController.exportContacts)
router.get("/tasks", ExportController.exportTasks)
router.get("/quotes", ExportController.exportQuotes)
router.get("/invoices", ExportController.exportInvoices)

// Metadata endpoint
router.get("/metadata", ExportController.getExportMetadata)

export default router