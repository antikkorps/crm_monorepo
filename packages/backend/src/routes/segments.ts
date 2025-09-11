import Router from "@koa/router"
import { SegmentController } from "../controllers/SegmentController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/segments" })

// GET /api/segments - Get all segments visible to the current user
router.get(
  "/",
  authenticate,
  requirePermission("canViewAllTasks"),
  SegmentController.getSegments
)

// GET /api/segments/:id - Get a specific segment
router.get(
  "/:id",
  authenticate,
  requirePermission("canViewAllTasks"),
  SegmentController.getSegment
)

// POST /api/segments - Create a new segment
router.post(
  "/",
  authenticate,
  requirePermission("canCreateTasks"),
  SegmentController.createSegment
)

// PUT /api/segments/:id - Update a segment
router.put(
  "/:id",
  authenticate,
  requirePermission("canEditAllTasks"),
  SegmentController.updateSegment
)

// DELETE /api/segments/:id - Delete a segment
router.delete(
  "/:id",
  authenticate,
  requirePermission("canDeleteTasks"),
  SegmentController.deleteSegment
)

// GET /api/segments/:id/results - Get segment results (filtered data)
router.get(
  "/:id/results",
  authenticate,
  requirePermission("canViewAllTasks"),
  SegmentController.getSegmentResults
)

// POST /api/segments/:id/duplicate - Duplicate a segment
router.post(
  "/:id/duplicate",
  authenticate,
  requirePermission("canCreateTasks"),
  SegmentController.duplicateSegment
)

// GET /api/segments/:id/bulk/preview - Get bulk operation preview
router.get(
  "/:id/bulk/preview",
  authenticate,
  requirePermission("canViewAllTasks"),
  SegmentController.getBulkOperationPreview
)

// POST /api/segments/:id/bulk/execute - Execute bulk operation
router.post(
  "/:id/bulk/execute",
  authenticate,
  requirePermission("canEditAllTasks"),
  SegmentController.executeBulkOperation
)

// GET /api/segments/:id/analytics - Get segment analytics
router.get(
  "/:id/analytics",
  authenticate,
  requirePermission("canViewAllTasks"),
  SegmentController.getSegmentAnalytics
)

// GET /api/segments/compare - Compare multiple segments
router.get(
  "/compare",
  authenticate,
  requirePermission("canViewAllTasks"),
  SegmentController.compareSegments
)

export default router