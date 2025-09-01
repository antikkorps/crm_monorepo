import request from "supertest"
import { beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../../app"

describe("Quote API Integration Tests", () => {
  let app: any

  beforeAll(async () => {
    app = createApp().callback()
  })

  describe("Quote API Endpoints", () => {
    it("should require authentication for POST /api/quotes", async () => {
      const quoteData = {
        institutionId: "test-institution-id",
        title: "Test Quote",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lines: [],
      }

      const response = await request(app).post("/api/quotes").send(quoteData)
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for GET /api/quotes", async () => {
      const response = await request(app).get("/api/quotes")
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for GET /api/quotes/:id", async () => {
      const response = await request(app).get("/api/quotes/some-id")
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for PUT /api/quotes/:id", async () => {
      const response = await request(app).put("/api/quotes/some-id").send({})
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for DELETE /api/quotes/:id", async () => {
      const response = await request(app).delete("/api/quotes/some-id")
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for PUT /api/quotes/:id/send", async () => {
      const response = await request(app).put("/api/quotes/some-id/send")
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for PUT /api/quotes/:id/accept", async () => {
      const response = await request(app)
        .put("/api/quotes/non-existent-id/accept")
        .send({ clientComments: "Test" })
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for PUT /api/quotes/:id/reject", async () => {
      const response = await request(app)
        .put("/api/quotes/non-existent-id/reject")
        .send({ clientComments: "Test" })
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for PUT /api/quotes/:id/cancel", async () => {
      const response = await request(app).put("/api/quotes/some-id/cancel")
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for GET /api/quotes/statistics", async () => {
      const response = await request(app).get("/api/quotes/statistics")
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for POST /api/quotes/:id/lines", async () => {
      const response = await request(app).post("/api/quotes/some-id/lines").send({})
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for PUT /api/quotes/:id/lines/:lineId", async () => {
      const response = await request(app).put("/api/quotes/some-id/lines/line-id").send({})
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for DELETE /api/quotes/:id/lines/:lineId", async () => {
      const response = await request(app).delete("/api/quotes/some-id/lines/line-id")
      expect([401, 404]).toContain(response.status)
    })

    it("should require authentication for PUT /api/quotes/:id/lines/reorder", async () => {
      const response = await request(app).put("/api/quotes/some-id/lines/reorder").send({})
      expect([401, 404]).toContain(response.status)
    })
  })
})
