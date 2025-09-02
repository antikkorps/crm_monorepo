import Router from "@koa/router"
import { ReminderController } from "../controllers/ReminderController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/reminders" })

// Apply authentication to all routes
router.use(authenticate)

// Reminder CRUD operations
router.get("/", requirePermission("canViewAllTasks"), ReminderController.getReminders)
router.post("/", requirePermission("canCreateTasks"), ReminderController.createReminder)
router.get("/:id", requirePermission("canViewAllTasks"), ReminderController.getReminder)
router.put("/:id", requirePermission("canEditAllTasks"), ReminderController.updateReminder)
router.delete("/:id", requirePermission("canDeleteTasks"), ReminderController.deleteReminder)

// Reminder status operations
router.patch("/:id/complete", requirePermission("canEditAllTasks"), ReminderController.markCompleted)
router.patch("/:id/incomplete", requirePermission("canEditAllTasks"), ReminderController.markIncomplete)
router.patch("/:id/snooze", requirePermission("canEditAllTasks"), ReminderController.snoozeReminder)
router.patch("/:id/reschedule", requirePermission("canEditAllTasks"), ReminderController.rescheduleReminder)

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
