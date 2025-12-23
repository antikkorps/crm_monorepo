import multer from "@koa/multer"
import Router from "@koa/router"
import { ImportController } from "../controllers/ImportController"
import { authenticate } from "../middleware/auth"

const router = new Router({ prefix: "/api/import" })

// Configure multer for Excel/CSV uploads
const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
      "text/csv"
    ]

    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Please upload Excel (.xlsx, .xls) or CSV file."), false)
    }
  }
})

/**
 * POST /api/import/contacts
 * Import contacts from Excel/CSV file with intelligent merge
 *
 * Request:
 * - Content-Type: multipart/form-data
 * - Body: file (Excel or CSV)
 *
 * Response:
 * {
 *   success: true,
 *   message: "Import completed",
 *   data: {
 *     created: 45,
 *     merged: 23,
 *     skipped: 5,
 *     total: 73,
 *     errors: [...],
 *     warnings: [...]
 *   }
 * }
 */
router.post(
  "/contacts",
  authenticate,
  uploadFile.single("file"),
  ImportController.importContacts
)

/**
 * GET /api/import/contacts/template
 * Download Excel template for contacts import
 *
 * Response:
 * - Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 * - Body: Excel file buffer
 */
router.get(
  "/contacts/template",
  authenticate,
  ImportController.downloadTemplate
)

export default router
