import { describe, it, expect, beforeEach } from "vitest"
import { SecurityLogService } from "../../services/SecurityLogService"
import {
  SecurityLog,
  SecurityLogAction,
  SecurityLogResource,
  SecurityLogStatus,
} from "../../models/SecurityLog"
import { createMockUser, cleanDatabase } from "../helpers/db-mock"
import { sequelize } from "../../config/database"
import { Context } from "koa"

describe("SecurityLogService", () => {
  beforeEach(async () => {
    await cleanDatabase(sequelize)
  })

  // Helper to create mock Koa context
  const createMockContext = (overrides: Partial<Context> = {}): Context => {
    return {
      request: {
        ip: "127.0.0.1",
        headers: {
          "user-agent": "Test User Agent",
        },
        ...overrides.request,
      },
      state: {
        user: null,
        ...overrides.state,
      },
      ...overrides,
    } as unknown as Context
  }

  describe("IP Address Extraction", () => {
    it("should extract IP from x-forwarded-for header", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        request: {
          ip: "127.0.0.1",
          headers: {
            "x-forwarded-for": "192.168.1.100, 10.0.0.1",
            "user-agent": "Test Agent",
          },
        } as any,
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.ipAddress).toBe("192.168.1.100")
    })

    it("should extract IP from x-real-ip header", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        request: {
          ip: "127.0.0.1",
          headers: {
            "x-real-ip": "192.168.1.200",
            "user-agent": "Test Agent",
          },
        } as any,
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.ipAddress).toBe("192.168.1.200")
    })

    it("should fallback to connection IP", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        request: {
          ip: "127.0.0.1",
          headers: {
            "user-agent": "Test Agent",
          },
        } as any,
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.ipAddress).toBe("127.0.0.1")
    })

    it("should handle array values in x-forwarded-for", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        request: {
          ip: "127.0.0.1",
          headers: {
            "x-forwarded-for": ["192.168.1.100", "10.0.0.1"],
            "user-agent": "Test Agent",
          },
        } as any,
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.ipAddress).toBe("192.168.1.100")
    })
  })

  describe("User Agent Extraction", () => {
    it("should extract user agent from headers", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        request: {
          ip: "127.0.0.1",
          headers: {
            "user-agent": "Mozilla/5.0 (Test Browser)",
          },
        } as any,
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.userAgent).toBe("Mozilla/5.0 (Test Browser)")
    })

    it("should handle missing user agent", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        request: {
          ip: "127.0.0.1",
          headers: {},
        } as any,
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.userAgent).toBe("unknown")
    })

    it("should handle array values in user agent", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        request: {
          ip: "127.0.0.1",
          headers: {
            "user-agent": ["Mozilla/5.0", "Other Agent"],
          },
        } as any,
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.userAgent).toBe("Mozilla/5.0")
    })
  })

  describe("logAuthSuccess", () => {
    it("should log successful authentication", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      const log = await SecurityLogService.logAuthSuccess(ctx, user.id)

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.AUTH_LOGIN)
      expect(log.resource).toBe(SecurityLogResource.USER)
      expect(log.resourceId).toBe(user.id)
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
      expect(log.details).toBe("User logged in successfully")
      expect(log.ipAddress).toBeDefined()
      expect(log.userAgent).toBeDefined()
    })
  })

  describe("logAuthFailure", () => {
    it("should log failed authentication", async () => {
      const ctx = createMockContext()
      const email = "test@example.com"
      const reason = "Invalid password"

      const log = await SecurityLogService.logAuthFailure(ctx, email, reason)

      expect(log.userId).toBeNull()
      expect(log.action).toBe(SecurityLogAction.AUTH_FAILED)
      expect(log.resource).toBe(SecurityLogResource.USER)
      expect(log.status).toBe(SecurityLogStatus.FAILURE)
      expect(log.details).toContain(email)
      expect(log.details).toContain(reason)
    })
  })

  describe("logPermissionDenied", () => {
    it("should log permission denied event", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })
      const resourceId = "institution-123"
      const reason = "User lacks required role"

      const log = await SecurityLogService.logPermissionDenied(
        ctx,
        SecurityLogResource.INSTITUTION,
        resourceId,
        reason
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.PERMISSION_DENIED)
      expect(log.resource).toBe(SecurityLogResource.INSTITUTION)
      expect(log.resourceId).toBe(resourceId)
      expect(log.status).toBe(SecurityLogStatus.FAILURE)
      expect(log.details).toBe(reason)
    })

    it("should use default reason if not provided", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      const log = await SecurityLogService.logPermissionDenied(
        ctx,
        SecurityLogResource.TASK
      )

      expect(log.details).toBe("Permission denied")
    })
  })

  describe("logDataRead", () => {
    it("should log data read access", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })
      const resourceId = "patient-456"

      const log = await SecurityLogService.logDataRead(
        ctx,
        SecurityLogResource.INSTITUTION,
        resourceId
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.DATA_READ)
      expect(log.resource).toBe(SecurityLogResource.INSTITUTION)
      expect(log.resourceId).toBe(resourceId)
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
    })
  })

  describe("logDataCreate", () => {
    it("should log data creation", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })
      const resourceId = "quote-789"

      const log = await SecurityLogService.logDataCreate(
        ctx,
        SecurityLogResource.QUOTE,
        resourceId
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.DATA_CREATE)
      expect(log.resource).toBe(SecurityLogResource.QUOTE)
      expect(log.resourceId).toBe(resourceId)
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
      expect(log.details).toContain(resourceId)
    })
  })

  describe("logDataUpdate", () => {
    it("should log data update with changes", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })
      const resourceId = "task-101"
      const changes = "status: TODO -> IN_PROGRESS"

      const log = await SecurityLogService.logDataUpdate(
        ctx,
        SecurityLogResource.TASK,
        resourceId,
        changes
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.DATA_UPDATE)
      expect(log.resource).toBe(SecurityLogResource.TASK)
      expect(log.resourceId).toBe(resourceId)
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
      expect(log.details).toContain(changes)
    })

    it("should log data update without changes description", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })
      const resourceId = "task-102"

      const log = await SecurityLogService.logDataUpdate(
        ctx,
        SecurityLogResource.TASK,
        resourceId
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.DATA_UPDATE)
      expect(log.resourceId).toBe(resourceId)
    })
  })

  describe("logDataDelete", () => {
    it("should log data deletion", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })
      const resourceId = "meeting-202"

      const log = await SecurityLogService.logDataDelete(
        ctx,
        SecurityLogResource.MEETING,
        resourceId
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.DATA_DELETE)
      expect(log.resource).toBe(SecurityLogResource.MEETING)
      expect(log.resourceId).toBe(resourceId)
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
      expect(log.details).toContain(resourceId)
    })
  })

  describe("logDataExport", () => {
    it("should log data export with details", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })
      const details = "Exported 100 institutions to CSV"

      const log = await SecurityLogService.logDataExport(
        ctx,
        SecurityLogResource.INSTITUTION,
        details
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.DATA_EXPORT)
      expect(log.resource).toBe(SecurityLogResource.INSTITUTION)
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
      expect(log.details).toBe(details)
    })

    it("should log data export with default details", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      const log = await SecurityLogService.logDataExport(
        ctx,
        SecurityLogResource.INVOICE
      )

      expect(log.details).toContain("Exported")
      expect(log.details).toContain("INVOICE")
    })
  })

  describe("logLogout", () => {
    it("should log user logout", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      const log = await SecurityLogService.logLogout(ctx)

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.AUTH_LOGOUT)
      expect(log.resource).toBe(SecurityLogResource.USER)
      expect(log.resourceId).toBe(user.id)
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
      expect(log.details).toBe("User logged out")
    })
  })

  describe("logFromContext - Generic logging", () => {
    it("should create log entry with all parameters", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
        request: {
          ip: "192.168.1.1",
          headers: {
            "user-agent": "Custom Agent",
          },
        } as any,
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.QUOTE,
        "quote-123",
        SecurityLogStatus.SUCCESS,
        "Viewed quote details"
      )

      expect(log.userId).toBe(user.id)
      expect(log.action).toBe(SecurityLogAction.DATA_READ)
      expect(log.resource).toBe(SecurityLogResource.QUOTE)
      expect(log.resourceId).toBe("quote-123")
      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
      expect(log.details).toBe("Viewed quote details")
      expect(log.ipAddress).toBe("192.168.1.1")
      expect(log.userAgent).toBe("Custom Agent")
    })

    it("should handle missing user in context", async () => {
      const ctx = createMockContext({
        state: {},
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.USER
      )

      expect(log.userId).toBeNull()
      expect(log.action).toBe(SecurityLogAction.DATA_READ)
    })

    it("should use default status if not provided", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      const log = await SecurityLogService.logFromContext(
        ctx,
        SecurityLogAction.DATA_READ,
        SecurityLogResource.TASK
      )

      expect(log.status).toBe(SecurityLogStatus.SUCCESS)
    })
  })

  describe("Security Log Persistence", () => {
    it("should persist log entries to database", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      await SecurityLogService.logAuthSuccess(ctx, user.id)

      const logs = await SecurityLog.findAll({
        where: { userId: user.id },
      })

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].action).toBe(SecurityLogAction.AUTH_LOGIN)
    })

    it("should create multiple log entries", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      await SecurityLogService.logAuthSuccess(ctx, user.id)
      await SecurityLogService.logDataRead(ctx, SecurityLogResource.INSTITUTION, "inst-1")
      await SecurityLogService.logLogout(ctx)

      const logs = await SecurityLog.findAll({
        where: { userId: user.id },
      })

      expect(logs.length).toBe(3)
    })
  })

  describe("Security Compliance Scenarios", () => {
    it("should track complete user session lifecycle", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      // Login
      await SecurityLogService.logAuthSuccess(ctx, user.id)

      // Data access
      await SecurityLogService.logDataRead(ctx, SecurityLogResource.INSTITUTION, "inst-1")
      await SecurityLogService.logDataCreate(ctx, SecurityLogResource.TASK, "task-1")
      await SecurityLogService.logDataUpdate(ctx, SecurityLogResource.TASK, "task-1", "status updated")

      // Logout
      await SecurityLogService.logLogout(ctx)

      const logs = await SecurityLog.findAll({
        where: { userId: user.id },
        order: [["createdAt", "ASC"]],
      })

      expect(logs).toHaveLength(5)
      expect(logs[0].action).toBe(SecurityLogAction.AUTH_LOGIN)
      expect(logs[1].action).toBe(SecurityLogAction.DATA_READ)
      expect(logs[2].action).toBe(SecurityLogAction.DATA_CREATE)
      expect(logs[3].action).toBe(SecurityLogAction.DATA_UPDATE)
      expect(logs[4].action).toBe(SecurityLogAction.AUTH_LOGOUT)
    })

    it("should track failed access attempts", async () => {
      const user = await createMockUser()
      const ctx = createMockContext({
        state: { user },
      })

      // Multiple permission denied events
      await SecurityLogService.logPermissionDenied(ctx, SecurityLogResource.INSTITUTION, "inst-1")
      await SecurityLogService.logPermissionDenied(ctx, SecurityLogResource.QUOTE, "quote-1")

      const logs = await SecurityLog.findAll({
        where: {
          userId: user.id,
          status: SecurityLogStatus.FAILURE,
        },
      })

      expect(logs).toHaveLength(2)
      expect(logs.every((log) => log.action === SecurityLogAction.PERMISSION_DENIED)).toBe(true)
    })

    it("should differentiate between different IP addresses", async () => {
      const user = await createMockUser()
      const ctx1 = createMockContext({
        state: { user },
        request: {
          ip: "192.168.1.1",
          headers: { "user-agent": "Agent 1" },
        } as any,
      })
      const ctx2 = createMockContext({
        state: { user },
        request: {
          ip: "10.0.0.1",
          headers: { "user-agent": "Agent 2" },
        } as any,
      })

      await SecurityLogService.logDataRead(ctx1, SecurityLogResource.TASK)
      await SecurityLogService.logDataRead(ctx2, SecurityLogResource.TASK)

      const logs = await SecurityLog.findAll({
        where: { userId: user.id },
      })

      const ips = logs.map((log) => log.ipAddress)
      expect(ips).toContain("192.168.1.1")
      expect(ips).toContain("10.0.0.1")
    })
  })
})
