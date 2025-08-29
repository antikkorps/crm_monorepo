import Router from "koa-router"
import { MedicalInstitutionController } from "../controllers/MedicalInstitutionController"
import { authenticate } from "../middleware/auth"
import {
  addPermissionsToContext,
  canEditInstitution,
  canViewInstitutionsFiltered,
  requirePermission,
  validateInstitutionOwnership,
} from "../middleware/permissions"

const router = new Router()

// Apply authentication middleware to all routes
router.use(authenticate)

// Add user permissions to context for all routes
router.use(addPermissionsToContext())

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
  MedicalInstitutionController.validateCsv
)

// POST /api/institutions/import - Import from CSV
router.post(
  "/import",
  requirePermission("canImportInstitutions"),
  MedicalInstitutionController.importFromCsv
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

export default router
