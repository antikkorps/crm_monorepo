import Router from "@koa/router"
import { CallController } from "../controllers/CallController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/calls" })

// Apply authentication to all routes
router.use(authenticate)

// Call CRUD operations
router.get("/", requirePermission("canViewAllTasks"), CallController.getCalls)
router.post("/", requirePermission("canCreateTasks"), CallController.createCall)
router.get("/:id", requirePermission("canViewAllTasks"), CallController.getCall)
router.put("/:id", requirePermission("canEditAllTasks"), CallController.updateCall)
router.delete("/:id", requirePermission("canDeleteTasks"), CallController.deleteCall)

// Specialized endpoints for call retrieval
router.get("/user/:userId", requirePermission("canViewAllTasks"), CallController.getCallsByUser)
router.get("/institution/:institutionId", requirePermission("canViewAllTasks"), CallController.getCallsByInstitution)
router.get("/phone/:phoneNumber", requirePermission("canViewAllTasks"), CallController.getCallsByPhoneNumber)
router.get("/type/:callType", requirePermission("canViewAllTasks"), CallController.getCallsByType)
router.get("/date-range", requirePermission("canViewAllTasks"), CallController.getCallsByDateRange)

export default router
