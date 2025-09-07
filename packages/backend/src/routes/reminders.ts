import Router from "@koa/router"
import { ReminderController } from "../controllers/ReminderController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"
import { validateUUID, validatePagination } from "../middleware/validation"
import { collaborationErrorHandler, addCollaborationErrorContext } from "../middleware/collaborationErrorHandler"
import {
  validateReminderCreation,
  validateReminderUpdate,
  validateReminderSnooze,
  validateReminderReschedule,
  validateReminderSearch,
} from "../middleware/collaborationValidation"

const router = new Router({ prefix: "/api/reminders" })

// Apply authentication and error handling to all routes
router.use(authenticate)
router.use(addCollaborationErrorContext)
router.use(collaborationErrorHandler)

// Reminder CRUD operations
router.get("/", requirePermission("canViewAllTasks"), validateReminderSearch, ReminderController.getReminders)
router.post("/", requirePermission("canCreateTasks"), validateReminderCreation, ReminderController.createReminder)
router.get("/:id", requirePermission("canViewAllTasks"), validateUUID, ReminderController.getReminder)
router.put("/:id", requirePermission("canEditAllTasks"), validateUUID, validateReminderUpdate, ReminderController.updateReminder)
router.delete("/:id", requirePermission("canDeleteTasks"), validateUUID, ReminderController.deleteReminder)

// Reminder status operations
router.patch("/:id/complete", requirePermission("canEditAllTasks"), validateUUID, ReminderController.markCompleted)
router.patch("/:id/incomplete", requirePermission("canEditAllTasks"), validateUUID, ReminderController.markIncomplete)
router.patch("/:id/snooze", requirePermission("canEditAllTasks"), validateUUID, validateReminderSnooze, ReminderController.snoozeReminder)
router.patch("/:id/reschedule", requirePermission("canEditAllTasks"), validateUUID, validateReminderReschedule, ReminderController.rescheduleReminder)

// Specialized endpoints for reminder retrieval
router.get("/user/:userId", requirePermission("canViewAllTasks"), ReminderController.getRemindersByUser)
router.get("/institution/:institutionId", requirePermission("canViewAllTasks"), ReminderController.getRemindersByInstitution)
router.get("/priority/:priority", requirePermission("canViewAllTasks"), ReminderController.getRemindersByPriority)

// Status-based reminder retrieval
router.get("/status/completed", requirePermission("canViewAllTasks"), ReminderController.getCompletedReminders)
router.get("/status/pending", requirePermission("canViewAllTasks"), ReminderController.getPendingReminders)
router.get("/status/overdue", requirePermission("canViewAllTasks"), ReminderController.getOverdueReminders)
router.get("/status/upcoming", requirePermission("canViewAllTasks"), ReminderController.getUpcomingReminders)

// Date-based reminder retrieval
router.get("/date-range", requirePermission("canViewAllTasks"), ReminderController.getRemindersByDateRange)

export default router
