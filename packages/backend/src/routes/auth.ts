import Router from "koa-router"
import { AuthController } from "../controllers/AuthController"
import { authenticate, optionalAuth } from "../middleware/auth"

const router = new Router({
  prefix: "/api/auth",
})

// Public routes
router.post("/login", AuthController.login)
router.post("/refresh", AuthController.refresh)

// Protected routes
router.post("/logout", optionalAuth, AuthController.logout)
router.get("/me", authenticate, AuthController.me)
router.post("/change-password", authenticate, AuthController.changePassword)

export default router
