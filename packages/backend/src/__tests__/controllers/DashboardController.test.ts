import { describe, it, expect, beforeEach } from "vitest"
import supertest from "supertest"
import Koa from "koa"
import Router from "@koa/router"
import bodyParser from "koa-bodyparser"
import { DashboardController } from "../../controllers/DashboardController"
import { createMockUser, createMockTask, createMockMedicalInstitution, cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"
import { UserRole } from "../../models/User"
import { TaskStatus, TaskPriority } from "../../models/Task"

describe("DashboardController", () => {
  let app: Koa
  let router: Router

  beforeEach(async () => {
    await cleanDatabase(sequelize)

    app = new Koa()
    router = new Router()

    // Setup routes
    router.get("/api/dashboard/metrics", DashboardController.getMetrics)
    router.get("/api/dashboard/activities", DashboardController.getActivities)
    router.get("/api/dashboard/alerts", DashboardController.getAlerts)
    router.get("/api/dashboard/quick-actions", DashboardController.getQuickActions)

    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
  })

  describe("GET /api/dashboard/metrics - Dashboard metrics", () => {
    it("should return dashboard metrics for super admin", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()
      const institution = await createMockMedicalInstitution()

      // Create some data
      await createMockTask(assignee.id, admin.id, {
        status: TaskStatus.TODO,
        institutionId: institution.id
      })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/metrics")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty("institutions")
      expect(response.body.data).toHaveProperty("tasks")
      expect(response.body.data).toHaveProperty("team")
      expect(response.body.data).toHaveProperty("billing")
      expect(response.body.data).toHaveProperty("period")
    })

    it("should return metrics filtered by period", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/metrics?period=week")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.period.type).toBe("week")
      expect(response.body.data.period).toHaveProperty("startDate")
      expect(response.body.data.period).toHaveProperty("endDate")
    })

    it("should include institutions metrics", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      await createMockMedicalInstitution({ isActive: true })
      await createMockMedicalInstitution({ isActive: true })
      await createMockMedicalInstitution({ isActive: false })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/metrics")
        .expect(200)

      expect(response.body.data.institutions).toHaveProperty("total")
      expect(response.body.data.institutions).toHaveProperty("active")
      expect(response.body.data.institutions.active).toBe(2)
    })

    it("should include tasks metrics", async () => {
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
        .get("/api/dashboard/metrics")
        .expect(200)

      expect(response.body.data.tasks).toHaveProperty("total")
      expect(response.body.data.tasks).toHaveProperty("todo")
      expect(response.body.data.tasks).toHaveProperty("inProgress")
      expect(response.body.data.tasks).toHaveProperty("done")
    })

    it("should return user-specific metrics for regular users", async () => {
      const user = await createMockUser({ role: UserRole.USER })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/metrics")
        .expect(200)

      expect(response.body.success).toBe(true)
      // Regular users should see metrics but potentially filtered
      expect(response.body.data).toHaveProperty("tasks")
    })

    it("should handle errors gracefully", async () => {
      const testApp = new Koa()
      testApp.use((ctx, next) => {
        // No user in state - should cause error
        ctx.state.user = null
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/metrics")
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body).toHaveProperty("message")
    })
  })

  describe("GET /api/dashboard/activities - Recent activities", () => {
    it("should return recent activities", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      // Create some activities
      await createMockTask(assignee.id, admin.id, { title: "Test Task 1" })
      await createMockTask(assignee.id, admin.id, { title: "Test Task 2" })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/activities")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it("should support pagination with limit and offset", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/activities?limit=10&offset=0")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it("should filter activities by type", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/activities?type=task")
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it("should handle errors gracefully", async () => {
      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = null
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/activities")
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe("GET /api/dashboard/alerts - Smart alerts", () => {
    it("should return smart alerts for user", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/alerts")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it("should detect overdue tasks", async () => {
      const user = await createMockUser({ role: UserRole.USER })
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)

      await createMockTask(user.id, user.id, {
        status: TaskStatus.TODO,
        dueDate: yesterday,
        priority: TaskPriority.HIGH,
      })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = user
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/alerts")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      // Should have at least one alert for the overdue task
      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it("should handle errors gracefully", async () => {
      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = null
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/alerts")
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe("GET /api/dashboard/quick-actions - Quick actions", () => {
    it("should return personalized quick actions", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/quick-actions")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(Array.isArray(response.body.data)).toBe(true)
    })

    it("should provide different actions for different roles", async () => {
      const regularUser = await createMockUser({ role: UserRole.USER })
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      // Test regular user
      const userApp = new Koa()
      userApp.use((ctx, next) => {
        ctx.state.user = regularUser
        return next()
      })
      userApp.use(bodyParser())
      userApp.use(router.routes())

      const userResponse = await supertest(userApp.callback())
        .get("/api/dashboard/quick-actions")
        .expect(200)

      // Test admin
      const adminApp = new Koa()
      adminApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      adminApp.use(bodyParser())
      adminApp.use(router.routes())

      const adminResponse = await supertest(adminApp.callback())
        .get("/api/dashboard/quick-actions")
        .expect(200)

      expect(userResponse.body.success).toBe(true)
      expect(adminResponse.body.success).toBe(true)
      expect(Array.isArray(userResponse.body.data)).toBe(true)
      expect(Array.isArray(adminResponse.body.data)).toBe(true)
    })

    it("should handle errors gracefully", async () => {
      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = null
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/quick-actions")
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe("Dashboard Performance", () => {
    it("should execute metrics queries in parallel", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })

      // Create test data
      await createMockMedicalInstitution()
      const assignee = await createMockUser()
      await createMockTask(assignee.id, admin.id)

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const startTime = Date.now()
      await supertest(testApp.callback())
        .get("/api/dashboard/metrics")
        .expect(200)
      const duration = Date.now() - startTime

      // Metrics should load relatively quickly (< 2 seconds)
      expect(duration).toBeLessThan(2000)
    })

    it("should handle large datasets efficiently", async () => {
      const admin = await createMockUser({ role: UserRole.SUPER_ADMIN })
      const assignee = await createMockUser()

      // Create multiple records
      for (let i = 0; i < 10; i++) {
        await createMockTask(assignee.id, admin.id, {
          title: `Task ${i}`,
          status: i % 2 === 0 ? TaskStatus.TODO : TaskStatus.DONE
        })
      }

      const testApp = new Koa()
      testApp.use((ctx, next) => {
        ctx.state.user = admin
        return next()
      })
      testApp.use(bodyParser())
      testApp.use(router.routes())

      const response = await supertest(testApp.callback())
        .get("/api/dashboard/metrics")
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.tasks.total).toBe(10)
    })
  })
})
