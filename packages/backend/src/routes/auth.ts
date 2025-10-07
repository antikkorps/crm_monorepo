import Router from "@koa/router"
import { AuthController } from "../controllers/AuthController"
import { authenticate, optionalAuth } from "../middleware/auth"
import { authRateLimiter, sensitiveRateLimiter } from "../middleware/rateLimiting"

const router = new Router({
  prefix: "/api/auth",
})


// Public routes with strict rate limiting
router.post("/login", authRateLimiter, AuthController.login)
router.post("/refresh", authRateLimiter, AuthController.refresh)

// Protected routes
router.post("/logout", optionalAuth, AuthController.logout)
router.get("/me", authenticate, AuthController.me)
router.put("/me", authenticate, AuthController.updateProfile)
router.post("/change-password", authenticate, sensitiveRateLimiter, AuthController.changePassword)

export default router
