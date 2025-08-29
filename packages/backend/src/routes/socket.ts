import Router from "koa-router"
import { SocketController } from "../controllers/SocketController"
import { authenticate, authorize } from "../middleware/auth"
import { UserRole } from "../models/User"

const router = new Router({ prefix: "/api/socket" })

// All socket routes require authentication
router.use(authenticate)

// Get connection status
router.get("/status", SocketController.getConnectionStatus)

// Get team connection status
router.get("/team/status", SocketController.getTeamConnectionStatus)

// Send test notification to self
router.post("/test-notification", SocketController.sendTestNotification)

// Send notification to team (team admin or higher)
router.post(
  "/team/notification",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEAM_ADMIN]),
  SocketController.sendTeamNotification
)

// Get server statistics (admin only)
router.get(
  "/stats",
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  SocketController.getServerStats
)

export default router
