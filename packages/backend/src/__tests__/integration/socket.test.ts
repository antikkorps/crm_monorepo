import { createServer } from "http"
import Koa from "koa"
import bodyParser from "koa-bodyparser"
import Router from "@koa/router"
import { AddressInfo } from "net"
import { io as Client, Socket as ClientSocket } from "socket.io-client"
import supertest from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SocketController } from "../../controllers/SocketController"
import { AuthService } from "../../services/AuthService"
import { SocketService } from "../../services/SocketService"

// Mock logger
vi.mock("../../utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock AuthService
vi.mock("../../services/AuthService", () => ({
  AuthService: {
    getUserFromToken: vi.fn(),
  },
}))

// Define UserRole enum for tests
enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  TEAM_ADMIN = "team_admin",
  MANAGER = "manager",
  USER = "user",
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  teamId?: string
  isActive: boolean
  getFullName(): string
}

// Create a simple test app without full model dependencies
function createTestApp(): Koa {
  const app = new Koa()
  const router = new Router({ prefix: "/api/socket" })

  app.use(bodyParser())

  // Mock authentication middleware
  const authenticate = async (ctx: any, next: any) => {
    const authHeader = ctx.get("Authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      ctx.status = 401
      ctx.body = { error: { message: "Authentication required" } }
      return
    }

    try {
      const user = await AuthService.getUserFromToken(token)
      ctx.state.user = user
      await next()
    } catch (error) {
      ctx.status = 401
      ctx.body = { error: { message: "Invalid token" } }
    }
  }

  // Mock authorization middleware
  const authorize = (roles: UserRole[]) => {
    return async (ctx: any, next: any) => {
      const user = ctx.state.user as User
      if (!user || !roles.includes(user.role)) {
        ctx.status = 403
        ctx.body = { error: { message: "Insufficient permissions" } }
        return
      }
      await next()
    }
  }

  // Apply routes with middleware
  router.get("/status", authenticate, SocketController.getConnectionStatus)
  router.get("/team/status", authenticate, SocketController.getTeamConnectionStatus)
  router.post("/test-notification", authenticate, SocketController.sendTestNotification)
  router.post(
    "/team/notification",
    authenticate,
    authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEAM_ADMIN]),
    SocketController.sendTeamNotification
  )
  router.get(
    "/stats",
    authenticate,
    authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
    SocketController.getServerStats
  )

  app.use(router.routes())
  app.use(router.allowedMethods())

  return app
}

describe("Socket API Integration", () => {
  let app: Koa
  let httpServer: ReturnType<typeof createServer>
  let request: ReturnType<typeof supertest>
  let socketService: SocketService
  let serverAddress: string
  let clientSocket: ClientSocket
  let mockUser: User
  let mockAdmin: User
  let validToken: string
  let adminToken: string

  beforeEach(async () => {
    // Create mock users
    mockUser = {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER,
      teamId: "team-456",
      isActive: true,
      getFullName: () => "Test User",
    }

    mockAdmin = {
      id: "admin-123",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      role: UserRole.ADMIN,
      teamId: "team-456",
      isActive: true,
      getFullName: () => "Admin User",
    }

    // Generate mock tokens
    validToken = "valid-user-token"
    adminToken = "valid-admin-token"

    // Setup AuthService mocks (cast to any to avoid type conflicts with mock User)
    vi.mocked(AuthService.getUserFromToken).mockImplementation((token) => {
      if (token === validToken) return Promise.resolve(mockUser as any)
      if (token === adminToken) return Promise.resolve(mockAdmin as any)
      return Promise.reject(new Error("Invalid token"))
    })

    // Create app and server
    app = createTestApp()
    httpServer = createServer(app.callback())

    // Initialize Socket.io
    socketService = SocketService.getInstance()
    socketService.initialize(httpServer)

    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const port = (httpServer.address() as AddressInfo).port
        serverAddress = `http://localhost:${port}`
        resolve()
      })
    })

    request = supertest(httpServer)
  })

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.disconnect()
    }

    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve())
    })

    vi.clearAllMocks()
  })

  describe("GET /api/socket/status", () => {
    it("should return connection status for authenticated user", async () => {
      const response = await request
        .get("/api/socket/status")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        connected: false,
        totalConnections: 0,
        timestamp: expect.any(String),
      })
    })

    it("should require authentication", async () => {
      await request.get("/api/socket/status").expect(401)
    })

    it("should show connected status when user is connected", async () => {
      // Connect user via Socket.io
      clientSocket = Client(serverAddress, {
        auth: { token: validToken },
      })

      await new Promise<void>((resolve) => {
        clientSocket.on("connect", () => resolve())
      })

      const response = await request
        .get("/api/socket/status")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        connected: true,
        totalConnections: 1,
      })
    })
  })

  describe("GET /api/socket/team/status", () => {
    it("should return team connection status", async () => {
      const response = await request
        .get("/api/socket/team/status")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        teamId: mockUser.teamId,
        connectedUsers: [],
        totalConnections: 0,
        timestamp: expect.any(String),
      })
    })

    it("should handle user without team", async () => {
      // Mock user without team (cast to any to avoid type conflicts)
      const userWithoutTeam = { ...mockUser, teamId: undefined }
      vi.mocked(AuthService.getUserFromToken).mockResolvedValue(userWithoutTeam as any)

      const response = await request
        .get("/api/socket/team/status")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        teamId: null,
        connectedUsers: [],
        totalConnections: 0,
      })
    })
  })

  describe("POST /api/socket/test-notification", () => {
    beforeEach(async () => {
      // Connect user for notifications
      clientSocket = Client(serverAddress, {
        auth: { token: validToken },
      })

      await new Promise<void>((resolve) => {
        clientSocket.on("connect", () => resolve())
      })
    })

    it("should send test notification to user", async () => {
      const testMessage = "This is a test notification"

      // Listen for notification
      const notificationPromise = new Promise<any>((resolve) => {
        clientSocket.on("test-notification", resolve)
      })

      // Send test notification
      const response = await request
        .post("/api/socket/test-notification")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ message: testMessage, type: "info" })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: "Test notification sent successfully",
        timestamp: expect.any(String),
      })

      // Verify notification was received
      const notification = await notificationPromise
      expect(notification).toMatchObject({
        type: "info",
        message: testMessage,
        sender: "System",
        timestamp: expect.any(String),
      })
    })

    it("should require message in request body", async () => {
      const response = await request
        .post("/api/socket/test-notification")
        .set("Authorization", `Bearer ${validToken}`)
        .send({})
        .expect(400)

      expect(response.body.error).toMatchObject({
        code: "MISSING_MESSAGE",
        message: "Message is required for test notification",
      })
    })
  })

  describe("POST /api/socket/team/notification", () => {
    beforeEach(async () => {
      // Connect admin user for notifications
      clientSocket = Client(serverAddress, {
        auth: { token: adminToken },
      })

      await new Promise<void>((resolve) => {
        clientSocket.on("connect", () => resolve())
      })
    })

    it("should send team notification as admin", async () => {
      const testMessage = "Team notification message"

      // Listen for notification
      const notificationPromise = new Promise<any>((resolve) => {
        clientSocket.on("team-notification", resolve)
      })

      // Send team notification
      const response = await request
        .post("/api/socket/team/notification")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ message: testMessage, type: "info" })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        message: "Team notification sent successfully",
        teamId: mockAdmin.teamId,
        timestamp: expect.any(String),
      })

      // Verify notification was received
      const notification = await notificationPromise
      expect(notification).toMatchObject({
        type: "info",
        message: testMessage,
        sender: mockAdmin.getFullName(),
        senderId: mockAdmin.id,
        timestamp: expect.any(String),
      })
    })

    it("should reject regular user from sending team notifications", async () => {
      await request
        .post("/api/socket/team/notification")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ message: "Test message" })
        .expect(403)
    })

    it("should require message in request body", async () => {
      const response = await request
        .post("/api/socket/team/notification")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({})
        .expect(400)

      expect(response.body.error).toMatchObject({
        code: "MISSING_MESSAGE",
        message: "Message is required for team notification",
      })
    })
  })

  describe("GET /api/socket/stats", () => {
    it("should return server statistics for admin", async () => {
      const response = await request
        .get("/api/socket/stats")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)

      expect(response.body).toMatchObject({
        totalConnections: expect.any(Number),
        totalSockets: expect.any(Number),
        rooms: {
          total: expect.any(Number),
          userRooms: expect.any(Number),
          teamRooms: expect.any(Number),
          institutionRooms: expect.any(Number),
          taskRooms: expect.any(Number),
          other: expect.any(Number),
        },
        timestamp: expect.any(String),
      })
    })

    it("should reject regular user from accessing stats", async () => {
      await request
        .get("/api/socket/stats")
        .set("Authorization", `Bearer ${validToken}`)
        .expect(403)
    })

    it("should require authentication", async () => {
      await request.get("/api/socket/stats").expect(401)
    })
  })

  describe("Socket.io Integration", () => {
    it("should authenticate and connect successfully", async () => {
      clientSocket = Client(serverAddress, {
        auth: { token: validToken },
      })

      const connectPromise = new Promise<void>((resolve, reject) => {
        clientSocket.on("connect", () => resolve())
        clientSocket.on("connect_error", reject)
      })

      await connectPromise
      expect(clientSocket.connected).toBe(true)
    })

    it("should reject invalid authentication", async () => {
      clientSocket = Client(serverAddress, {
        auth: { token: "invalid-token" },
      })

      const errorPromise = new Promise<Error>((resolve) => {
        clientSocket.on("connect_error", resolve)
      })

      const error = await errorPromise
      expect(error.message).toBe("Authentication failed")
    })

    it("should handle room joining and leaving", async () => {
      clientSocket = Client(serverAddress, {
        auth: { token: validToken },
      })

      await new Promise<void>((resolve) => {
        clientSocket.on("connect", () => resolve())
      })

      // Join room
      const joinPromise = new Promise<any>((resolve) => {
        clientSocket.on("room-joined", resolve)
      })

      clientSocket.emit("join-room", { room: "task:task-123" })
      const joinData = await joinPromise
      expect(joinData.room).toBe("task:task-123")

      // Leave room
      const leavePromise = new Promise<any>((resolve) => {
        clientSocket.on("room-left", resolve)
      })

      clientSocket.emit("leave-room", { room: "task:task-123" })
      const leaveData = await leavePromise
      expect(leaveData.room).toBe("task:task-123")
    })
  })
})
