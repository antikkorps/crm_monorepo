import Router from "@koa/router"
import { UserController } from "../controllers/UserController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/users" })

// Apply authentication to all routes
router.use(authenticate)

// Current user profile management (no special permissions needed)
router.get("/profile/me", UserController.getCurrentUserProfile)
router.put("/profile/me", UserController.updateCurrentUserProfile)
router.post("/profile/password", UserController.changePassword)

// User management
router.post("/", UserController.createUser) // Super admin only (checked in controller)
router.get("/", requirePermission("canViewAllTasks"), UserController.getUsers)
router.get(
  "/without-team",
  requirePermission("canManageTeamUsers"),
  UserController.getUsersWithoutTeam
)
router.get("/:id", requirePermission("canViewAllTasks"), UserController.getUser)
router.put("/:id", requirePermission("canManageTeamUsers"), UserController.updateUser)
router.post("/:id/reset-password", UserController.resetUserPassword) // Super admin only (checked in controller)
router.post("/:id/send-invitation", UserController.sendInvitation) // Super admin only (checked in controller)

// Avatar management
router.get("/:id/avatar", UserController.getUserAvatar) // No special permission needed for avatar viewing
router.put(
  "/:id/avatar",
  requirePermission("canManageTeamUsers"),
  UserController.updateUserAvatar
)

// Territory assignment (medical institutions)
router.get(
  "/:id/institutions",
  requirePermission("canViewAssignedInstitutions"),
  UserController.getUserInstitutions
)
router.post(
  "/:id/institutions",
  requirePermission("canEditAssignedInstitutions"),
  UserController.assignInstitutions
)
router.delete(
  "/:id/institutions",
  requirePermission("canEditAssignedInstitutions"),
  UserController.removeInstitutionAssignments
)

export default router
