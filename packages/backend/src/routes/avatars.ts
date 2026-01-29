import Router from "@koa/router"
import { AvatarController } from "../controllers/AvatarController"
import { authenticate } from "../middleware/auth"

const router = new Router({ prefix: "/api" })

// Public route - no authentication required
router.get("/avatars/:filename", AvatarController.getAvatar)

// Protected route - authentication required
router.post("/avatars/:userId/regenerate", authenticate, AvatarController.regenerateAvatar)

export default router
