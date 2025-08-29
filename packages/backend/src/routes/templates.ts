import multer from "@koa/multer"
import Router from "@koa/router"
import { DocumentTemplateController } from "../controllers/DocumentTemplateController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/templates" })

// Configure multer for logo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml"]
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new Error("Invalid file type. Only JPEG, PNG, GIF, and SVG files are allowed."),
        false
      )
    }
  },
})

// Create controller instance
const templateController = new DocumentTemplateController()

// All template routes require authentication
router.use(authenticate)

// GET /api/templates - Get all templates with optional type filter
router.get("/", templateController.getTemplates.bind(templateController))

// GET /api/templates/:id - Get a specific template
router.get("/:id", templateController.getTemplate.bind(templateController))

// POST /api/templates - Create a new template
router.post(
  "/",
  requirePermission("canManageSystem"),
  templateController.createTemplate.bind(templateController)
)

// PUT /api/templates/:id - Update a template
router.put(
  "/:id",
  requirePermission("canManageSystem"),
  templateController.updateTemplate.bind(templateController)
)

// DELETE /api/templates/:id - Delete a template
router.delete(
  "/:id",
  requirePermission("canManageSystem"),
  templateController.deleteTemplate.bind(templateController)
)

// PUT /api/templates/:id/set-default - Set template as default
router.put(
  "/:id/set-default",
  requirePermission("canManageSystem"),
  templateController.setDefaultTemplate.bind(templateController)
)

// POST /api/templates/:id/duplicate - Duplicate a template
router.post(
  "/:id/duplicate",
  requirePermission("canManageSystem"),
  templateController.duplicateTemplate.bind(templateController)
)

// POST /api/templates/upload-logo - Upload logo (without template association)
router.post(
  "/upload-logo",
  requirePermission("canManageSystem"),
  upload.single("logo"),
  templateController.uploadLogo.bind(templateController)
)

// POST /api/templates/:id/upload-logo - Upload logo for specific template
router.post(
  "/:id/upload-logo",
  requirePermission("canManageSystem"),
  upload.single("logo"),
  templateController.uploadLogo.bind(templateController)
)

// GET /api/templates/:id/preview - Preview template with sample data
router.get("/:id/preview", templateController.previewTemplate.bind(templateController))

// POST /api/templates/:id/preview - Preview template with custom data
router.post("/:id/preview", templateController.previewTemplate.bind(templateController))

export default router
