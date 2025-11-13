import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import supertest from "supertest"
import Koa from "koa"
import Router from "@koa/router"
import bodyParser from "koa-bodyparser"
import { HealthController } from "../../controllers/HealthController"
import { sequelize } from "../../config/database"

describe("HealthController", () => {
  let app: Koa
  let router: Router

  beforeEach(() => {
    app = new Koa()
    router = new Router()

    // Setup routes
    router.get("/api/health", HealthController.basic)
    router.get("/api/health/detailed", HealthController.detailed)
    router.get("/api/health/ready", HealthController.ready)
    router.get("/api/health/live", HealthController.live)

    app.use(bodyParser())
    app.use(router.routes())
    app.use(router.allowedMethods())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("GET /api/health - Basic health check", () => {
    it("should return 200 with status ok", async () => {
      const response = await supertest(app.callback())
        .get("/api/health")
        .expect(200)

      expect(response.body).toHaveProperty("status", "ok")
      expect(response.body).toHaveProperty("timestamp")
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
    })

    it("should return current timestamp", async () => {
      const beforeRequest = new Date().getTime()
      const response = await supertest(app.callback()).get("/api/health")
      const afterRequest = new Date().getTime()

      const timestamp = new Date(response.body.timestamp).getTime()
      expect(timestamp).toBeGreaterThanOrEqual(beforeRequest)
      expect(timestamp).toBeLessThanOrEqual(afterRequest)
    })
  })

  describe("GET /api/health/detailed - Detailed health check", () => {
    it("should return 200 with healthy status when all services are operational", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(200)

      expect(response.body).toHaveProperty("status")
      expect(["healthy", "degraded", "unhealthy"]).toContain(response.body.status)
      expect(response.body).toHaveProperty("timestamp")
      expect(response.body).toHaveProperty("uptime")
      expect(response.body).toHaveProperty("environment")
      expect(response.body).toHaveProperty("version")
      expect(response.body).toHaveProperty("services")
    })

    it("should include database status with latency", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(200)

      expect(response.body.services).toHaveProperty("database")
      expect(response.body.services.database).toHaveProperty("status")
      expect(["healthy", "unhealthy"]).toContain(response.body.services.database.status)
      expect(response.body.services.database).toHaveProperty("message")

      if (response.body.services.database.status === "healthy") {
        expect(response.body.services.database).toHaveProperty("latency")
        expect(typeof response.body.services.database.latency).toBe("number")
        expect(response.body.services.database.latency).toBeGreaterThanOrEqual(0)
      }
    })

    it("should include memory usage statistics", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(200)

      expect(response.body.services).toHaveProperty("memory")
      expect(response.body.services.memory).toHaveProperty("status")
      expect(["healthy", "degraded", "unhealthy"]).toContain(
        response.body.services.memory.status
      )
      expect(response.body.services.memory).toHaveProperty("usage")
      expect(response.body.services.memory.usage).toHaveProperty("heapUsedMB")
      expect(response.body.services.memory.usage).toHaveProperty("heapTotalMB")
      expect(response.body.services.memory.usage).toHaveProperty("rssMB")
      expect(response.body.services.memory.usage).toHaveProperty("heapUsagePercent")
    })

    it("should return 503 when database is unhealthy", async () => {
      // Mock database authentication failure
      vi.spyOn(sequelize, "authenticate").mockRejectedValueOnce(
        new Error("Database connection failed")
      )

      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(503)

      expect(response.body.status).toBe("unhealthy")
      expect(response.body.services.database.status).toBe("unhealthy")
      expect(response.body.services.database.message).toBe("Database connection failed")
    })

    it("should mark memory as degraded when heap usage is between 75-90%", async () => {
      // Mock high memory usage
      const mockMemoryUsage = {
        heapUsed: 80 * 1024 * 1024, // 80MB
        heapTotal: 100 * 1024 * 1024, // 100MB (80% usage)
        rss: 120 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      }
      vi.spyOn(process, "memoryUsage").mockReturnValue(mockMemoryUsage)

      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(200)

      expect(response.body.status).toBe("degraded")
      expect(response.body.services.memory.status).toBe("degraded")
      expect(parseFloat(response.body.services.memory.usage.heapUsagePercent)).toBeGreaterThan(75)
      expect(parseFloat(response.body.services.memory.usage.heapUsagePercent)).toBeLessThan(90)
    })

    it("should mark memory as unhealthy when heap usage is above 90%", async () => {
      // Mock critical memory usage
      const mockMemoryUsage = {
        heapUsed: 95 * 1024 * 1024, // 95MB
        heapTotal: 100 * 1024 * 1024, // 100MB (95% usage)
        rss: 120 * 1024 * 1024,
        external: 0,
        arrayBuffers: 0,
      }
      vi.spyOn(process, "memoryUsage").mockReturnValue(mockMemoryUsage)

      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(503)

      expect(response.body.status).toBe("unhealthy")
      expect(response.body.services.memory.status).toBe("unhealthy")
      expect(parseFloat(response.body.services.memory.usage.heapUsagePercent)).toBeGreaterThan(90)
    })

    it("should handle unexpected errors gracefully", async () => {
      // Mock unexpected error
      vi.spyOn(sequelize, "authenticate").mockImplementationOnce(() => {
        throw new Error("Unexpected error")
      })

      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(503)

      expect(response.body.status).toBe("unhealthy")
      expect(response.body).toHaveProperty("error")
    })

    it("should include uptime in seconds", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(200)

      expect(typeof response.body.uptime).toBe("number")
      expect(response.body.uptime).toBeGreaterThan(0)
    })

    it("should include environment information", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/detailed")
        .expect(200)

      expect(response.body.environment).toBeDefined()
      expect(typeof response.body.environment).toBe("string")
    })
  })

  describe("GET /api/health/ready - Readiness probe", () => {
    it("should return 200 with ready:true when database is accessible", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/ready")
        .expect(200)

      expect(response.body).toHaveProperty("ready", true)
      expect(response.body).toHaveProperty("timestamp")
    })

    it("should return 503 with ready:false when database is not accessible", async () => {
      // Mock database authentication failure
      vi.spyOn(sequelize, "authenticate").mockRejectedValueOnce(
        new Error("Database not ready")
      )

      const response = await supertest(app.callback())
        .get("/api/health/ready")
        .expect(503)

      expect(response.body).toHaveProperty("ready", false)
      expect(response.body).toHaveProperty("error")
      expect(response.body.error).toBe("Database not ready")
    })

    it("should include timestamp in response", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/ready")
        .expect(200)

      expect(response.body.timestamp).toBeDefined()
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date)
    })
  })

  describe("GET /api/health/live - Liveness probe", () => {
    it("should always return 200 with alive:true", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/live")
        .expect(200)

      expect(response.body).toHaveProperty("alive", true)
      expect(response.body).toHaveProperty("timestamp")
      expect(response.body).toHaveProperty("uptime")
    })

    it("should include uptime in response", async () => {
      const response = await supertest(app.callback())
        .get("/api/health/live")
        .expect(200)

      expect(typeof response.body.uptime).toBe("number")
      expect(response.body.uptime).toBeGreaterThan(0)
    })

    it("should respond quickly without database checks", async () => {
      const startTime = Date.now()
      await supertest(app.callback()).get("/api/health/live").expect(200)
      const duration = Date.now() - startTime

      // Liveness check should be very fast (< 100ms)
      expect(duration).toBeLessThan(100)
    })
  })

  describe("Health check endpoints comparison", () => {
    it("basic endpoint should be faster than detailed", async () => {
      const basicStart = Date.now()
      await supertest(app.callback()).get("/api/health")
      const basicDuration = Date.now() - basicStart

      const detailedStart = Date.now()
      await supertest(app.callback()).get("/api/health/detailed")
      const detailedDuration = Date.now() - detailedStart

      // Detailed should take longer due to database checks
      expect(detailedDuration).toBeGreaterThanOrEqual(basicDuration - 10) // Allow 10ms margin
    })

    it("all endpoints should return ISO timestamp format", async () => {
      const endpoints = ["/api/health", "/api/health/detailed", "/api/health/ready", "/api/health/live"]

      for (const endpoint of endpoints) {
        const response = await supertest(app.callback()).get(endpoint)
        expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      }
    })
  })
})
