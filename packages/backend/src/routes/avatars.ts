import Router from "@koa/router"
import { AvatarController } from "../controllers/AvatarController"

const router = new Router()

// Public route - no authentication required
router.get("/avatars/:filename", AvatarController.getAvatar)

// Protected route - authentication required (handled by parent router)
router.post("/avatars/:userId/regenerate", AvatarController.regenerateAvatar)

export default router
