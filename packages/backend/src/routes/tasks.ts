import Router from "@koa/router"
import { TaskController } from "../controllers/TaskController"
import { authenticate } from "../middleware/auth"
import { requirePermission } from "../middleware/permissions"

const router = new Router({ prefix: "/api/tasks" })

// All task routes require authentication
router.use(authenticate)

// GET /api/tasks - Get all tasks with filtering
router.get("/", requirePermission("canViewAllTasks"), TaskController.getTasks)

// GET /api/tasks/:id - Get a specific task
router.get("/:id", TaskController.getTask)

// POST /api/tasks - Create a new task
router.post("/", requirePermission("canCreateTasks"), TaskController.createTask)

// PUT /api/tasks/:id - Update a task
router.put("/:id", TaskController.updateTask)

// DELETE /api/tasks/:id - Delete a task
router.delete("/:id", TaskController.deleteTask)

// GET /api/tasks/assigned/:userId - Get tasks assigned to a specific user
router.get("/assigned/:userId", TaskController.getAssignedTasks)

export default router
