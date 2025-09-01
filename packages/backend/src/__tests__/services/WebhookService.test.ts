import axios from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { User } from "../../models/User"
import { Webhook, WebhookEvent, WebhookStatus } from "../../models/Webhook"
import { WebhookLog, WebhookLogStatus } from "../../models/WebhookLog"
import { WebhookService } from "../../services/WebhookService"

// Mock axios
vi.mock("axios")
const mockedAxios = axios as any

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe("WebhookService", () => {
  let mockWebhook: Webhook
  let mockUser: User

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock user
    mockUser = {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    } as User

    // Mock webhook
    mockWebhook = {
      id: "webhook-123",
      name: "Test Webhook",
      url: "https://example.com/webhook",
      events: [WebhookEvent.INSTITUTION_CREATED],
      status: WebhookStatus.ACTIVE,
      secret: "test-secret",
      headers: { "X-Custom": "header" },
      timeout: 30000,
      maxRetries: 3,
      retryDelay: 5000,
      isActive: true,
      shouldTrigger: vi.fn().mockReturnValue(true),
      recordTrigger: vi.fn(),
      recordSuccess: vi.fn(),
      recordFailure: vi.fn(),
    } as any

    // Mock Webhook.findAll
    vi.spyOn(Webhook, "findAll").mockResolvedValue([mockWebhook])

    // Mock WebhookLog.create
    vi.spyOn(WebhookLog, "create").mockResolvedValue({
      id: "log-123",
      webhookId: mockWebhook.id,
      event: WebhookEvent.INSTITUTION_CREATED,
      payload: {},
      status: WebhookLogStatus.PENDING,
      markSuccess: vi.fn(),
      markFailed: vi.fn(),
    } as any)
  })

  describe("triggerEvent", () => {
    it("should trigger webhooks for matching events", async () => {
      const eventData = {
        institution: {
          id: "inst-123",
          name: "Test Hospital",
        },
      }

      await WebhookService.triggerEvent(
        WebhookEvent.INSTITUTION_CREATED,
        eventData,
        mockUser.id
      )

      expect(Webhook.findAll).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: WebhookStatus.ACTIVE,
        },
        include: expect.any(Array),
      })

      expect(mockWebhook.shouldTrigger).toHaveBeenCalledWith(
        WebhookEvent.INSTITUTION_CREATED
      )
      expect(WebhookLog.create).toHaveBeenCalledWith({
        webhookId: mockWebhook.id,
        event: WebhookEvent.INSTITUTION_CREATED,
        payload: eventData,
        status: WebhookLogStatus.PENDING,
        maxAttempts: 4, // maxRetries + 1
        attemptCount: 0,
      })
      expect(mockWebhook.recordTrigger).toHaveBeenCalled()
    })

    it("should not trigger webhooks when no matching webhooks exist", async () => {
      mockWebhook.shouldTrigger = vi.fn().mockReturnValue(false)

      const eventData = { test: "data" }

      await WebhookService.triggerEvent(
        WebhookEvent.INSTITUTION_CREATED,
        eventData,
        mockUser.id
      )

      expect(WebhookLog.create).not.toHaveBeenCalled()
    })
  })

  describe("deliverWebhook", () => {
    let mockWebhookLog: WebhookLog

    beforeEach(() => {
      mockWebhookLog = {
        id: "log-123",
        webhookId: mockWebhook.id,
        event: WebhookEvent.INSTITUTION_CREATED,
        payload: { test: "data" },
        markSuccess: vi.fn(),
        markFailed: vi.fn(),
      } as any
    })

    it("should deliver webhook successfully", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: { success: true },
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await WebhookService.deliverWebhook(mockWebhook, mockWebhookLog)

      expect(mockedAxios.post).toHaveBeenCalledWith(
        mockWebhook.url,
        expect.objectContaining({
          event: WebhookEvent.INSTITUTION_CREATED,
          data: { test: "data" },
          webhook_id: mockWebhook.id,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "User-Agent": "Medical-CRM-Webhook/1.0",
            "X-Webhook-Event": WebhookEvent.INSTITUTION_CREATED,
            "X-Webhook-ID": mockWebhook.id,
            "X-Webhook-Signature": expect.any(String),
            "X-Custom": "header",
          }),
          timeout: 30000,
        })
      )

      expect(result.success).toBe(true)
      expect(result.httpStatus).toBe(200)
      expect(mockWebhookLog.markSuccess).toHaveBeenCalledWith(200, '{"success":true}')
      expect(mockWebhook.recordSuccess).toHaveBeenCalled()
    })

    it("should handle HTTP error responses", async () => {
      const mockResponse = {
        status: 400,
        statusText: "Bad Request",
        data: { error: "Invalid payload" },
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      const result = await WebhookService.deliverWebhook(mockWebhook, mockWebhookLog)

      expect(result.success).toBe(false)
      expect(result.httpStatus).toBe(400)
      expect(mockWebhookLog.markFailed).toHaveBeenCalledWith(
        "HTTP 400: Bad Request",
        400,
        '{"error":"Invalid payload"}'
      )
      expect(mockWebhook.recordFailure).toHaveBeenCalled()
    })

    it("should handle network errors", async () => {
      const networkError = new Error("Network timeout")
      mockedAxios.post.mockRejectedValue(networkError)

      const result = await WebhookService.deliverWebhook(mockWebhook, mockWebhookLog)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toBe("Network timeout")
      expect(mockWebhookLog.markFailed).toHaveBeenCalledWith("Network timeout")
      expect(mockWebhook.recordFailure).toHaveBeenCalled()
    })
  })

  describe("testWebhook", () => {
    it("should test webhook delivery", async () => {
      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: { received: true },
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      vi.spyOn(Webhook, "findByPk").mockResolvedValue(mockWebhook)

      const result = await WebhookService.testWebhook(mockWebhook.id, mockUser.id)

      expect(result.success).toBe(true)
      expect(result.httpStatus).toBe(200)
      expect(WebhookLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          webhookId: mockWebhook.id,
          event: WebhookEvent.USER_UPDATED,
          maxAttempts: 1,
        })
      )
    })

    it("should throw error for non-existent webhook", async () => {
      vi.spyOn(Webhook, "findByPk").mockResolvedValue(null)

      await expect(
        WebhookService.testWebhook("non-existent", mockUser.id)
      ).rejects.toThrow("Webhook not found")
    })
  })

  describe("verifySignature", () => {
    it("should verify correct signature", () => {
      const payload = '{"test":"data"}'
      const secret = "test-secret"
      const signature =
        "sha256=e914119c41a12d9a06ed4306f9f3c1ce32ee6618cbb06f54f00a280ba2dc7985"

      const isValid = WebhookService.verifySignature(payload, signature, secret)

      expect(isValid).toBe(true)
    })

    it("should reject incorrect signature", () => {
      const payload = '{"test":"data"}'
      const secret = "test-secret"
      const signature = "sha256=0000000000000000000000000000000000000000000000000000000000000000"

      const isValid = WebhookService.verifySignature(payload, signature, secret)

      expect(isValid).toBe(false)
    })
  })

  describe("processRetries", () => {
    it("should process retryable webhook logs", async () => {
      const mockRetryableLog = {
        id: "log-retry-123",
        webhookId: mockWebhook.id,
        webhook: mockWebhook,
        markRetrying: vi.fn(),
      } as any

      vi.spyOn(WebhookLog, "getRetryableLogs").mockResolvedValue([mockRetryableLog])

      const mockResponse = {
        status: 200,
        statusText: "OK",
        data: { success: true },
      }
      mockedAxios.post.mockResolvedValue(mockResponse)

      await WebhookService.processRetries()

      expect(WebhookLog.getRetryableLogs).toHaveBeenCalled()
      expect(mockRetryableLog.markRetrying).toHaveBeenCalled()
    })

    it("should handle empty retry queue", async () => {
      vi.spyOn(WebhookLog, "getRetryableLogs").mockResolvedValue([])

      await WebhookService.processRetries()

      expect(WebhookLog.getRetryableLogs).toHaveBeenCalled()
      // Should not throw any errors
    })
  })
})
