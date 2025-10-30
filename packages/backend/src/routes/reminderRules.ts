import Router from "@koa/router"
import { ReminderRuleController } from "../controllers/ReminderRuleController"
import { authenticate } from "../middleware/auth"
import { requireAdmin } from "../middleware/auth"

const router = new Router()
const reminderRuleController = new ReminderRuleController()

// Apply authentication middleware to all routes
router.use(authenticate)

// GET /api/reminder-rules - Get all reminder rules (with optional filters)
router.get("/", reminderRuleController.getReminderRules.bind(reminderRuleController))

// GET /api/reminder-rules/stats - Get reminder statistics
router.get("/stats", reminderRuleController.getReminderStats.bind(reminderRuleController))

// POST /api/reminder-rules/process - Manually trigger reminder processing (SUPER_ADMIN only)
router.post("/process", requireAdmin, reminderRuleController.processReminders.bind(reminderRuleController))

// GET /api/reminder-rules/:id - Get reminder rule by ID
router.get("/:id", reminderRuleController.getReminderRule.bind(reminderRuleController))

// POST /api/reminder-rules - Create new reminder rule
router.post("/", reminderRuleController.createReminderRule.bind(reminderRuleController))

// PUT /api/reminder-rules/:id - Update reminder rule
router.put("/:id", reminderRuleController.updateReminderRule.bind(reminderRuleController))

// DELETE /api/reminder-rules/:id - Delete reminder rule
router.delete("/:id", reminderRuleController.deleteReminderRule.bind(reminderRuleController))

// PATCH /api/reminder-rules/:id/toggle - Toggle reminder rule active status
router.patch("/:id/toggle", reminderRuleController.toggleReminderRule.bind(reminderRuleController))

export default router