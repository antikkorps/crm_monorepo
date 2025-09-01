import type { Server } from "http"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../app"

describe("Koa.js Application", () => {
  let server: Server
  let app: any

  beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = "test"
    process.env.DB_NAME = "medical_crm_test"
    process.env.DB_USER = "postgres"
    process.env.DB_PASSWORD = "password"
    process.env.JWT_SECRET = "test-jwt-secret"
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret"

    app = createApp()
    server = app.listen()
  })

  afterAll(async () => {
    if (server) {
      server.close()
    }
  })

  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(server).get("/health")

      // Health check should return either 200 (if DB is available) or 503 (if DB is unavailable)
      expect([200, 503]).toContain(response.status)

      expect(response.body).toMatchObject({
        version: "1.0.0",
        environment: "test",
      })
      expect(response.body.timestamp).toBeDefined()
      expect(response.body.database).toBeDefined()

      // Status should be 'ok' if 200, 'degraded' if 503
      if (response.status === 200) {
        expect(response.body.status).toBe("ok")
        expect(response.body.database).toBe("connected")
      } else {
        expect(response.body.status).toBe("degraded")
        expect(response.body.database).toBe("disconnected")
      }
    })
  })

  describe("API Info", () => {
    it("should return API information", async () => {
      const response = await request(server).get("/api").expect(200)

      expect(response.body).toMatchObject({
        name: "Medical CRM Backend API",
        version: "1.0.0",
        environment: "test",
      })
      expect(response.body.timestamp).toBeDefined()
    })
  })

  describe("Error Handling", () => {
    it("should return 404 for unknown routes", async () => {
      // Test both root-level and API-level unknown routes
      const responses = await Promise.all([
        request(server).get("/unknown-route"),
        request(server).get("/api/unknown-endpoint"),
        request(server).get("/completely/unknown/path"),
      ])

      // All should return 404 or 401, but not other error codes
      responses.forEach((response, index) => {
        expect([401, 404]).toContain(response.status, 
          `Response ${index} returned unexpected status: ${response.status}`)
        
        if (response.status === 404) {
          expect(response.body.error).toMatchObject({
            code: "NOT_FOUND",
            message: "The requested resource was not found",
          })
          expect(response.body.error.timestamp).toBeDefined()
          expect(response.body.error.requestId).toBeDefined()
        }
      })
    })
  })

  describe("CORS", () => {
    it("should include CORS headers", async () => {
      const response = await request(server).get("/health")

      expect([200, 503]).toContain(response.status)
      expect(response.headers["access-control-allow-origin"]).toBeDefined()
    })
  })

  describe("Security Headers", () => {
    it("should include security headers", async () => {
      const response = await request(server).get("/health")

      expect([200, 503]).toContain(response.status)
      // Check for helmet security headers
      expect(response.headers["x-dns-prefetch-control"]).toBeDefined()
      expect(response.headers["x-frame-options"]).toBeDefined()
      expect(response.headers["x-download-options"]).toBeDefined()
    })
  })

  describe("Request ID", () => {
    it("should include request ID in response headers", async () => {
      const response = await request(server).get("/health")

      expect([200, 503]).toContain(response.status)
      expect(response.headers["x-request-id"]).toBeDefined()
      expect(typeof response.headers["x-request-id"]).toBe("string")
    })
  })
})
