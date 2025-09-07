import Router from "@koa/router"
import { CallController } from "../controllers/CallController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"
import { validateUUID, validatePagination } from "../middleware/validation"
import { collaborationErrorHandler, addCollaborationErrorContext } from "../middleware/collaborationErrorHandler"
import {
  validateCallCreation,
  validateCallUpdate,
  validateCallSearch,
} from "../middleware/collaborationValidation"

const router = new Router({ prefix: "/api/calls" })

// Apply authentication and error handling to all routes
router.use(authenticate)
router.use(addCollaborationErrorContext)
router.use(collaborationErrorHandler)

// Call CRUD operations
router.get("/", requirePermission("canViewAllTasks"), validateCallSearch, CallController.getCalls)
router.post("/", requirePermission("canCreateTasks"), validateCallCreation, CallController.createCall)
router.get("/:id", requirePermission("canViewAllTasks"), validateUUID, CallController.getCall)
router.put("/:id", requirePermission("canEditAllTasks"), validateUUID, validateCallUpdate, CallController.updateCall)
router.delete("/:id", requirePermission("canDeleteTasks"), validateUUID, CallController.deleteCall)

// Specialized endpoints for call retrieval
router.get("/user/:userId", requirePermission("canViewAllTasks"), validateUUID, validatePagination, CallController.getCallsByUser)
router.get("/institution/:institutionId", requirePermission("canViewAllTasks"), validateUUID, validatePagination, CallController.getCallsByInstitution)
router.get("/phone/:phoneNumber", requirePermission("canViewAllTasks"), validatePagination, CallController.getCallsByPhoneNumber)
router.get("/type/:callType", requirePermission("canViewAllTasks"), validatePagination, CallController.getCallsByType)
router.get("/date-range", requirePermission("canViewAllTasks"), validateCallSearch, CallController.getCallsByDateRange)

export default router
