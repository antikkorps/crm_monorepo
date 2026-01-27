import Router from "@koa/router"
import { EngagementLetterController } from "../controllers/EngagementLetterController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/engagement-letters" })

// All engagement letter routes require authentication
router.use(authenticate)

// GET /api/engagement-letters - Get all engagement letters with filtering
router.get(
  "/",
  requirePermission("canViewAllBilling"),
  EngagementLetterController.getLetters
)

// GET /api/engagement-letters/statistics - Get statistics
router.get(
  "/statistics",
  requirePermission("canViewAllBilling"),
  EngagementLetterController.getStatistics
)

// GET /api/engagement-letters/institution/:institutionId - Get letters by institution
router.get(
  "/institution/:institutionId",
  requirePermission("canViewAllBilling"),
  EngagementLetterController.getLettersByInstitution
)

// GET /api/engagement-letters/status/:status - Get letters by status
router.get(
  "/status/:status",
  requirePermission("canViewAllBilling"),
  EngagementLetterController.getLettersByStatus
)

// GET /api/engagement-letters/:id - Get a specific engagement letter
router.get("/:id", EngagementLetterController.getLetter)

// POST /api/engagement-letters - Create a new engagement letter
router.post(
  "/",
  requirePermission("canCreateQuotes"),
  EngagementLetterController.createLetter
)

// PUT /api/engagement-letters/:id - Update an engagement letter
router.put("/:id", EngagementLetterController.updateLetter)

// DELETE /api/engagement-letters/:id - Delete an engagement letter
router.delete(
  "/:id",
  requirePermission("canDeleteQuotes"),
  EngagementLetterController.deleteLetter
)

// Engagement letter status workflow endpoints
// PUT /api/engagement-letters/:id/send - Send to client
router.put("/:id/send", EngagementLetterController.sendLetter)

// PUT /api/engagement-letters/:id/accept - Accept (client action)
router.put("/:id/accept", EngagementLetterController.acceptLetter)

// PUT /api/engagement-letters/:id/reject - Reject (client action)
router.put("/:id/reject", EngagementLetterController.rejectLetter)

// PUT /api/engagement-letters/:id/complete - Mark as completed
router.put("/:id/complete", EngagementLetterController.completeLetter)

// PUT /api/engagement-letters/:id/cancel - Cancel
router.put("/:id/cancel", EngagementLetterController.cancelLetter)

// Member management endpoints
// GET /api/engagement-letters/:id/members - Get members
router.get("/:id/members", EngagementLetterController.getMembers)

// POST /api/engagement-letters/:id/members - Add member
router.post("/:id/members", EngagementLetterController.addMember)

// PUT /api/engagement-letters/:id/members/:memberId - Update member
router.put("/:id/members/:memberId", EngagementLetterController.updateMember)

// DELETE /api/engagement-letters/:id/members/:memberId - Remove member
router.delete("/:id/members/:memberId", EngagementLetterController.removeMember)

// PUT /api/engagement-letters/:id/members/reorder - Reorder members
router.put("/:id/members/reorder", EngagementLetterController.reorderMembers)

// PDF generation and document management endpoints
// GET /api/engagement-letters/:id/pdf - Generate and download PDF
router.get("/:id/pdf", EngagementLetterController.generatePdf)

// GET /api/engagement-letters/:id/versions - Get document versions
router.get("/:id/versions", EngagementLetterController.getVersions)

export default router
