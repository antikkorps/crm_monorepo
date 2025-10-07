import Router from "@koa/router"
import { SecurityLogController } from "../controllers/SecurityLogController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/security-logs" })

// Apply authentication to all routes
router.use(authenticate)

// All security log routes require admin permission
router.use(requirePermission("canManageTeamUsers"))

// Get security logs with filtering and pagination
router.get("/", SecurityLogController.getSecurityLogs)

// Get security log statistics
router.get("/stats", SecurityLogController.getStats)

// Get security logs for a specific user
router.get("/user/:userId", SecurityLogController.getUserLogs)

// Manually trigger log cleanup (admin only)
router.post("/cleanup", SecurityLogController.triggerCleanup)

export default router
