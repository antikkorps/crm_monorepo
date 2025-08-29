import Router from "koa-router"
import { TeamController } from "../controllers/TeamController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/teams" })

// Apply authentication to all routes
router.use(authenticate)

// Team CRUD operations
router.get("/", requirePermission("canViewAllTasks"), TeamController.getTeams)
router.get("/:id", requirePermission("canViewAllTasks"), TeamController.getTeam)
router.post("/", requirePermission("canManageTeam"), TeamController.createTeam)
router.put("/:id", requirePermission("canManageTeam"), TeamController.updateTeam)
router.delete("/:id", requirePermission("canManageTeam"), TeamController.deleteTeam)

// Team member management
router.get(
  "/:id/members",
  requirePermission("canViewAllTasks"),
  TeamController.getTeamMembers
)
router.post(
  "/:id/members",
  requirePermission("canManageTeamUsers"),
  TeamController.addTeamMember
)
router.delete(
  "/:id/members/:userId",
  requirePermission("canManageTeamUsers"),
  TeamController.removeTeamMember
)

export default router
