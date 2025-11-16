import multer from "@koa/multer"
import Router from "@koa/router"
import { MedicalInstitutionController } from "../controllers/MedicalInstitutionController"
import { authenticate } from "../middleware/auth"
import {
  addPermissionsToContext,
  canEditInstitution,
  canViewInstitutionsFiltered,
  requirePermission,
  validateInstitutionOwnership,
} from "../middleware/permissions"

const router = new Router({ prefix: "/api/institutions" })

// Apply authentication middleware to all routes
router.use(authenticate)

// Add user permissions to context for all routes
router.use(addPermissionsToContext())

// Configure multer for CSV uploads
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["text/csv", "application/vnd.ms-excel"]
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only CSV files are allowed."), false)
    }
  },
})

// GET /api/institutions - Get all medical institutions with filtering and pagination
router.get(
  "/",
  canViewInstitutionsFiltered(),
  MedicalInstitutionController.getInstitutions
)

// GET /api/institutions/search - Advanced search for medical institutions
router.get(
  "/search",
  canViewInstitutionsFiltered(),
  MedicalInstitutionController.searchInstitutions
)

// GET /api/institutions/import/template - Download CSV template
router.get(
  "/import/template",
  requirePermission("canImportInstitutions"),
  MedicalInstitutionController.downloadCsvTemplate
)

// POST /api/institutions/import/validate - Validate CSV without importing
router.post(
  "/import/validate",
  requirePermission("canImportInstitutions"),
  uploadCsv.single("file"),
  MedicalInstitutionController.validateCsv
)

// POST /api/institutions/import/preview - Preview CSV with matching details
router.post(
  "/import/preview",
  requirePermission("canImportInstitutions"),
  uploadCsv.single("file"),
  MedicalInstitutionController.previewCsv
)

// POST /api/institutions/import - Import from CSV
router.post(
  "/import",
  requirePermission("canImportInstitutions"),
  uploadCsv.single("file"),
  MedicalInstitutionController.importFromCsv
)

// GET /api/institutions/hot-leads - Get list of hot leads
router.get(
  "/hot-leads",
  canViewInstitutionsFiltered(),
  MedicalInstitutionController.getHotLeads
)

// GET /api/institutions/search/unified - Unified search across institutions, tasks, and collaboration features
router.get(
  "/search/unified",
  canViewInstitutionsFiltered(),
  MedicalInstitutionController.unifiedSearch
)

// GET /api/institutions/:id - Get a specific medical institution
router.get(
  "/:id",
  canViewInstitutionsFiltered(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.getInstitution
)

// POST /api/institutions - Create a new medical institution
router.post(
  "/",
  requirePermission("canCreateInstitutions"),
  MedicalInstitutionController.createInstitution
)

// PUT /api/institutions/:id - Update a medical institution
router.put(
  "/:id",
  canEditInstitution(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.updateInstitution
)

// PUT /api/institutions/:id/medical-profile - Update medical profile
router.put(
  "/:id/medical-profile",
  canEditInstitution(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.updateMedicalProfile
)

// DELETE /api/institutions/:id - Soft delete a medical institution
router.delete(
  "/:id",
  requirePermission("canDeleteInstitutions"),
  validateInstitutionOwnership(),
  MedicalInstitutionController.deleteInstitution
)

// POST /api/institutions/:id/contacts - Add a contact person
router.post(
  "/:id/contacts",
  canEditInstitution(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.addContactPerson
)

// GET /api/institutions/:id/collaboration - Get collaboration data for institution
router.get(
  "/:id/collaboration",
  canViewInstitutionsFiltered(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.getCollaborationData
)

// GET /api/institutions/:id/timeline - Get timeline of all interactions
router.get(
  "/:id/timeline",
  canViewInstitutionsFiltered(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.getTimeline
)

// GET /api/institutions/:id/revenue - Get revenue analytics for institution
router.get(
  "/:id/revenue",
  canViewInstitutionsFiltered(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.getRevenueAnalytics
)

// GET /api/institutions/:id/health-score - Get health score for institution
router.get(
  "/:id/health-score",
  canViewInstitutionsFiltered(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.getHealthScore
)

// GET /api/institutions/:id/lead-score - Get lead score for institution
router.get(
  "/:id/lead-score",
  canViewInstitutionsFiltered(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.getLeadScore
)

// GET /api/institutions/:id/next-actions - Get recommended next actions for institution
router.get(
  "/:id/next-actions",
  canViewInstitutionsFiltered(),
  validateInstitutionOwnership(),
  MedicalInstitutionController.getNextActions
)

export default router
