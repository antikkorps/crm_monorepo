import Router from "@koa/router"
// import { QuoteController } from "../controllers/QuoteController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/quotes" })

// All quote routes require authentication
router.use(authenticate)

// Temporary stub routes for testing - these will return 501 (Not Implemented)
const notImplementedHandler = async (ctx: any) => {
  ctx.status = 501
  ctx.body = {
    error: {
      code: "NOT_IMPLEMENTED",
      message: "This endpoint is not yet implemented",
      timestamp: new Date().toISOString(),
    },
  }
}

// GET /api/quotes - Get all quotes with filtering
router.get("/", notImplementedHandler)

// GET /api/quotes/statistics - Get quote statistics
router.get("/statistics", notImplementedHandler)

// GET /api/quotes/:id - Get a specific quote
router.get("/:id", notImplementedHandler)

// POST /api/quotes - Create a new quote
router.post("/", notImplementedHandler)

// PUT /api/quotes/:id - Update a quote
router.put("/:id", notImplementedHandler)

// DELETE /api/quotes/:id - Delete a quote
router.delete("/:id", notImplementedHandler)

// Quote status workflow endpoints
// PUT /api/quotes/:id/send - Send quote to client
router.put("/:id/send", notImplementedHandler)

// PUT /api/quotes/:id/accept - Accept quote (client action)
router.put("/:id/accept", notImplementedHandler)

// PUT /api/quotes/:id/reject - Reject quote (client action)
router.put("/:id/reject", notImplementedHandler)

// PUT /api/quotes/:id/cancel - Cancel quote
router.put("/:id/cancel", notImplementedHandler)

// Quote line management endpoints
// POST /api/quotes/:id/lines - Add line to quote
router.post("/:id/lines", notImplementedHandler)

// PUT /api/quotes/:id/lines/:lineId - Update quote line
router.put("/:id/lines/:lineId", notImplementedHandler)

// DELETE /api/quotes/:id/lines/:lineId - Delete quote line
router.delete("/:id/lines/:lineId", notImplementedHandler)

// PUT /api/quotes/:id/lines/reorder - Reorder quote lines
router.put("/:id/lines/reorder", notImplementedHandler)

export default router
