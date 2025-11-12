import Router from "@koa/router"
import { SegmentController } from "../controllers/SegmentController"
import { authenticate, requireAuth } from "../middleware/auth"

const router = new Router({ prefix: "/api/segments" })

// GET /api/segments - Get all segments visible to the current user
router.get("/", requireAuth, SegmentController.getSegments)

// POST /api/segments/preview - Preview segment results without saving
router.post("/preview", requireAuth, SegmentController.previewSegment)

// GET /api/segments/compare - Compare multiple segments
router.get("/compare", requireAuth, SegmentController.compareSegments)

// GET /api/segments/:id - Get a specific segment
router.get("/:id", requireAuth, SegmentController.getSegment)

// POST /api/segments - Create a new segment
router.post("/", requireAuth, SegmentController.createSegment)

// PUT /api/segments/:id - Update a segment
router.put("/:id", requireAuth, SegmentController.updateSegment)

// DELETE /api/segments/:id - Delete a segment
router.delete("/:id", requireAuth, SegmentController.deleteSegment)

// GET /api/segments/:id/results - Get segment results (filtered data)
router.get("/:id/results", requireAuth, SegmentController.getSegmentResults)

// POST /api/segments/:id/duplicate - Duplicate a segment
router.post("/:id/duplicate", requireAuth, SegmentController.duplicateSegment)

// GET /api/segments/:id/bulk/preview - Get bulk operation preview
router.get("/:id/bulk/preview", requireAuth, SegmentController.getBulkOperationPreview)

// POST /api/segments/:id/bulk/execute - Execute bulk operation
router.post("/:id/bulk/execute", requireAuth, SegmentController.executeBulkOperation)

// GET /api/segments/:id/analytics - Get segment analytics
router.get("/:id/analytics", requireAuth, SegmentController.getSegmentAnalytics)

export default router
