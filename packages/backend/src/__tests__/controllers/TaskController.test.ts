import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import supertest from "supertest"
import Koa from "koa"
import Router from "@koa/router"
import bodyParser from "koa-bodyparser"
import { TaskController } from "../../controllers/TaskController"
import { createMockUser, createMockTask, createMockMedicalInstitution, cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"
import { UserRole } from "../../models/User"
import { TaskStatus, TaskPriority } from "../../models/Task"
import { NotificationService } from "../../services/NotificationService"

describe("TaskController", () => {
  let app: Koa
  let router: Router

  beforeEach(async () => {
    await cleanDatabase(sequelize)

    app = new Koa()
    router = new Router()

    // Mock authentication middleware
    app.use(async (ctx, next) => {
      // ctx.state.user will be set by individual tests
      await next()
    })

    // Setup routes
    router.get("/api/tasks", TaskController.getTasks)
    router.get("/api/tasks/:id", TaskController.getTask)
    router.post("/api/tasks", TaskController.createTask)
    router.put("/api/tasks/:id", TaskController.updateTask)
    router.delete("/api/tasks/:id", TaskController.deleteTask)
    router.get("/api/tasks/assigned/:userId", TaskController.getAssignedTasks)

    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())

    // Mock NotificationService
    vi.spyOn(NotificationService.prototype, "notifyTaskAssigned").mockResolvedValue(undefined)
    vi.spyOn(NotificationService.prototype, "notifyTaskStatusChanged").mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("GET /api/tasks - Get all tasks", () => {
    it("should return all tasks for super_admin", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      await createMockTask(assignee.id, admin.id, { title: "Task 1" })
      await createMockTask(assignee.id, admin.id, { title: "Task 2" })

      // Mock ctx.state.user
      app.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })

      const response = await supertest(app.callback())
        .get("/api/tasks")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta).toHaveProperty("total", 2)
      expect(response.body.meta).toHaveProperty("page", 1)
      expect(response.body.meta).toHaveProperty("limit", 50)
    })

    it("should return only user's tasks for regular user", async () => {
      const user1 = await createMockUser({ role: UserRole.USER })
      const user2 = await createMockUser({ role: UserRole.USER })

      await createMockTask(user1.id, user1.id, { title: "My Task" })
      await createMockTask(user2.id, user2.id, { title: "Other User Task" })

      // Create new app with user1 authenticated
      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user1
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/tasks")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.length).toBeGreaterThan(0)
      // Regular users should only see their own tasks
      response.body.data.forEach((task: any) => {
        expect([user1.id]).toContain(task.assigneeId || task.creatorId)
      })
    })

    it("should filter tasks by status", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      await createMockTask(assignee.id, admin.id, { status: TaskStatus.TODO })
      await createMockTask(assignee.id, admin.id, { status: TaskStatus.IN_PROGRESS })
      await createMockTask(assignee.id, admin.id, { status: TaskStatus.DONE })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/tasks?status=todo")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((task: any) => task.status === TaskStatus.TODO)).toBe(true)
    })

    it("should filter tasks by priority", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      await createMockTask(assignee.id, admin.id, { priority: TaskPriority.HIGH })
      await createMockTask(assignee.id, admin.id, { priority: TaskPriority.LOW })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/tasks?priority=high")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.every((task: any) => task.priority === TaskPriority.HIGH)).toBe(true)
    })

    it("should paginate results", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      // Create 5 tasks
      for (let i = 0; i < 5; i++) {
        await createMockTask(assignee.id, admin.id, { title: `Task ${i}` })
      }

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/tasks?page=1&limit=2")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.meta.total).toBe(5)
      expect(response.body.meta.totalPages).toBe(3)
    })
  })

  describe("GET /api/tasks/:id - Get specific task", () => {
    it("should return task for authorized user", async () => {
      const user = await createMockUser({ role: UserRole.USER })
      const task = await createMockTask(user.id, user.id, { title: "My Task" })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get(`/api/tasks/${task.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(task.id)
      expect(response.body.data.title).toBe("My Task")
    })

    it("should return 404 for non-existent task", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/tasks/00000000-0000-0000-0000-000000000000")
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("TASK_NOT_FOUND")
    })

    it("should return 403 when user lacks permission", async () => {
      const user1 = await createMockUser({ role: UserRole.USER })
      const user2 = await createMockUser({ role: UserRole.USER })
      const task = await createMockTask(user2.id, user2.id, { title: "Other User Task" })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user1
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get(`/api/tasks/${task.id}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })
  })

  describe("POST /api/tasks - Create task", () => {
    it("should create task successfully", async () => {
      const creator = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()
      const institution = await createMockMedicalInstitution()

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = creator
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const taskData = {
        title: "New Task",
        description: "Task description",
        assigneeId: assignee.id,
        institutionId: institution.id,
        priority: TaskPriority.HIGH,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      }

      const response = await supertest(testApp.callback())
        .post("/api/tasks")
        .send(taskData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe("New Task")
      expect(response.body.data.assigneeId).toBe(assignee.id)
      expect(response.body.data.creatorId).toBe(creator.id)
      expect(response.body.data.status).toBe(TaskStatus.TODO)
    })

    it("should send notification to assignee", async () => {
      const creator = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = creator
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const notifySpy = vi.spyOn(NotificationService.prototype, "notifyTaskAssigned")

      await supertest(testApp.callback())
        .post("/api/tasks")
        .send({
          title: "New Task",
          assigneeId: assignee.id,
        })
        .expect(201)

      expect(notifySpy).toHaveBeenCalledWith(
        assignee.id,
        expect.objectContaining({ title: "New Task" }),
        creator
      )
    })

    it("should return 400 when title is missing", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .post("/api/tasks")
        .send({
          assigneeId: user.id,
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("VALIDATION_ERROR")
    })

    it("should return 400 when assignee not found", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .post("/api/tasks")
        .send({
          title: "Task",
          assigneeId: "00000000-0000-0000-0000-000000000000",
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVALID_ASSIGNEE")
    })

    it("should return 403 when user cannot assign to target user", async () => {
      const user1 = await createMockUser({ role: UserRole.USER })
      const user2 = await createMockUser({ role: UserRole.USER })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user1
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .post("/api/tasks")
        .send({
          title: "Task",
          assigneeId: user2.id,
        })
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should return 400 when institution not found", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .post("/api/tasks")
        .send({
          title: "Task",
          assigneeId: user.id,
          institutionId: "00000000-0000-0000-0000-000000000000",
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INVALID_INSTITUTION")
    })
  })

  describe("PUT /api/tasks/:id - Update task", () => {
    it("should update task successfully", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()
      const task = await createMockTask(assignee.id, user.id, { title: "Old Title" })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .put(`/api/tasks/${task.id}`)
        .send({
          title: "Updated Title",
          description: "Updated description",
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.title).toBe("Updated Title")
      expect(response.body.data.description).toBe("Updated description")
    })

    it("should send notification on status change", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()
      const task = await createMockTask(assignee.id, user.id, { status: TaskStatus.TODO })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const notifySpy = vi.spyOn(NotificationService.prototype, "notifyTaskStatusChanged")

      await supertest(testApp.callback())
        .put(`/api/tasks/${task.id}`)
        .send({
          status: TaskStatus.IN_PROGRESS,
        })
        .expect(200)

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS,
        user
      )
    })

    it("should send notification on assignee change", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee1 = await createMockUser()
      const assignee2 = await createMockUser()
      const task = await createMockTask(assignee1.id, user.id)

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const notifySpy = vi.spyOn(NotificationService.prototype, "notifyTaskAssigned")

      await supertest(testApp.callback())
        .put(`/api/tasks/${task.id}`)
        .send({
          assigneeId: assignee2.id,
        })
        .expect(200)

      expect(notifySpy).toHaveBeenCalledWith(
        assignee2.id,
        expect.any(Object),
        user
      )
    })

    it("should return 404 for non-existent task", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .put("/api/tasks/00000000-0000-0000-0000-000000000000")
        .send({ title: "Updated" })
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("TASK_NOT_FOUND")
    })

    it("should return 403 when user cannot edit task", async () => {
      const user1 = await createMockUser({ role: UserRole.USER })
      const user2 = await createMockUser({ role: UserRole.USER })
      const task = await createMockTask(user2.id, user2.id)

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user1
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .put(`/api/tasks/${task.id}`)
        .send({ title: "Updated" })
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })
  })

  describe("DELETE /api/tasks/:id - Delete task", () => {
    it("should delete task successfully", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const task = await createMockTask(user.id, user.id)

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .delete(`/api/tasks/${task.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe("Task deleted successfully")
    })

    it("should return 404 for non-existent task", async () => {
      const user = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .delete("/api/tasks/00000000-0000-0000-0000-000000000000")
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("TASK_NOT_FOUND")
    })

    it("should return 403 when user cannot delete task", async () => {
      const user1 = await createMockUser({ role: UserRole.USER })
      const user2 = await createMockUser({ role: UserRole.USER })
      const task = await createMockTask(user2.id, user2.id)

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user1
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .delete(`/api/tasks/${task.id}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should allow creator to delete task even if not assignee", async () => {
      const creator = await createMockUser({ role: UserRole.USER })
      const assignee = await createMockUser({ role: UserRole.USER })
      const task = await createMockTask(assignee.id, creator.id)

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = creator
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .delete(`/api/tasks/${task.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })

  describe("GET /api/tasks/assigned/:userId - Get assigned tasks", () => {
    it("should return tasks assigned to user", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      await createMockTask(assignee.id, admin.id, { title: "Task 1" })
      await createMockTask(assignee.id, admin.id, { title: "Task 2" })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get(`/api/tasks/assigned/${assignee.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveLength(2)
      expect(response.body.data.every((task: any) => task.assigneeId === assignee.id)).toBe(true)
    })

    it("should return 404 when user not found", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/tasks/assigned/00000000-0000-0000-0000-000000000000")
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("USER_NOT_FOUND")
    })

    it("should return 403 when user cannot view target user tasks", async () => {
      const user1 = await createMockUser({ role: UserRole.USER })
      const user2 = await createMockUser({ role: UserRole.USER })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user1
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get(`/api/tasks/assigned/${user2.id}`)
        .expect(403)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe("INSUFFICIENT_PERMISSIONS")
    })

    it("should allow user to view their own tasks", async () => {
      const user = await createMockUser({ role: UserRole.USER })
      await createMockTask(user.id, user.id)

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get(`/api/tasks/assigned/${user.id}`)
        .expect(200)

      expect(response.body.success).toBe(true)
    })
  })
})
