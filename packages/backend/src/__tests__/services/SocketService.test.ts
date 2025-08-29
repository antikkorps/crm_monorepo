import { createServer } from "http"
import { AddressInfo } from "net"
import { io as Client, Socket as ClientSocket } from "socket.io-client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { User, UserRole } from "../../models/User"
import { AuthService } from "../../services/AuthService"
import { SocketService } from "../../services/SocketService"

// Mock logger to avoid console output during tests
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

describe("SocketService", () => {
  let httpServer: ReturnType<typeof createServer>
  let socketService: SocketService
  let serverAddress: string
  let clientSocket: ClientSocket
  let mockUser: User

  beforeEach(async () => {
    // Create mock user
    mockUser = {
      id: "user-123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      role: UserRole.USER,
      teamId: "team-456",
      isActive: true,
      getFullName: () => "Test User",
    } as User

    // Setup AuthService mock
    vi.mocked(AuthService.getUserFromToken).mockResolvedValue(mockUser)

    // Create HTTP server
    httpServer = createServer()

    // Initialize Socket.io service
    socketService = SocketService.getInstance()
    socketService.initialize(httpServer)

    // Start server on random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const port = (httpServer.address() as AddressInfo).port
        serverAddress = `http://localhost:${port}`
        resolve()
      })
    })
  })

  afterEach(async () => {
    // Clean up client socket
    if (clientSocket) {
      clientSocket.disconnect()
    }

    // Close server
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve())
    })

    // Clear mocks
    vi.clearAllMocks()
  })

  describe("Authentication", () => {
    it("should reject connection without token", (done) => {
      clientSocket = Client(serverAddress)

      clientSocket.on("connect_error", (error) => {
        expect(error.message).toBe("Authentication token required")
        done()
      })

      clientSocket.on("connect", () => {
        done(new Error("Should not connect without token"))
      })
    })

    it("should reject connection with invalid token", (done) => {
      vi.mocked(AuthService.getUserFromToken).mockRejectedValue(
        new Error("Invalid token")
      )

      clientSocket = Client(serverAddress, {
        auth: { token: "invalid-token" },
      })

      clientSocket.on("connect_error", (error) => {
        expect(error.message).toBe("Authentication failed")
        done()
      })

      clientSocket.on("connect", () => {
        done(new Error("Should not connect with invalid token"))
      })
    })

    it("should accept connection with valid token", (done) => {
      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connect", () => {
        expect(clientSocket.connected).toBe(true)
        done()
      })

      clientSocket.on("connect_error", (error) => {
        done(error)
      })
    })

    it("should send welcome message on successful connection", (done) => {
      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connected", (data) => {
        expect(data.message).toBe("Successfully connected to Medical CRM")
        expect(data.userId).toBe(mockUser.id)
        expect(data.timestamp).toBeDefined()
        done()
      })

      clientSocket.on("connect_error", done)
    })
  })

  describe("Room Management", () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connect", () => done())
      clientSocket.on("connect_error", done)
    })

    it("should allow joining authorized rooms", (done) => {
      const room = "institution:inst-123"

      clientSocket.emit("join-room", { room })

      clientSocket.on("room-joined", (data) => {
        expect(data.room).toBe(room)
        expect(data.timestamp).toBeDefined()
        done()
      })

      clientSocket.on("error", (error) => {
        done(new Error(`Should not error: ${error.message}`))
      })
    })

    it("should reject joining unauthorized rooms", (done) => {
      const room = "admin:secret-room"

      clientSocket.emit("join-room", { room })

      clientSocket.on("error", (error) => {
        expect(error.code).toBe("ROOM_ACCESS_DENIED")
        expect(error.message).toBe("Not authorized to join this room")
        done()
      })

      clientSocket.on("room-joined", () => {
        done(new Error("Should not join unauthorized room"))
      })
    })

    it("should allow leaving rooms", (done) => {
      const room = "task:task-123"

      // First join the room
      clientSocket.emit("join-room", { room })

      clientSocket.on("room-joined", () => {
        // Then leave the room
        clientSocket.emit("leave-room", { room })
      })

      clientSocket.on("room-left", (data) => {
        expect(data.room).toBe(room)
        expect(data.timestamp).toBeDefined()
        done()
      })

      clientSocket.on("error", done)
    })
  })

  describe("Ping/Pong", () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connect", () => done())
      clientSocket.on("connect_error", done)
    })

    it("should respond to ping with pong", (done) => {
      clientSocket.emit("ping")

      clientSocket.on("pong", (data) => {
        expect(data.timestamp).toBeDefined()
        done()
      })
    })
  })

  describe("Notification Methods", () => {
    beforeEach((done) => {
      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connect", () => done())
      clientSocket.on("connect_error", done)
    })

    it("should send notification to specific user", (done) => {
      const testData = { message: "Test notification" }

      clientSocket.on("test-event", (data) => {
        expect(data.message).toBe(testData.message)
        expect(data.timestamp).toBeDefined()
        done()
      })

      // Send notification to user
      socketService.notifyUser(mockUser.id, "test-event", testData)
    })

    it("should send notification to team", (done) => {
      const testData = { message: "Team notification" }

      clientSocket.on("team-event", (data) => {
        expect(data.message).toBe(testData.message)
        expect(data.timestamp).toBeDefined()
        done()
      })

      // Send notification to team
      socketService.notifyTeam(mockUser.teamId!, "team-event", testData)
    })

    it("should broadcast notification to all users", (done) => {
      const testData = { message: "Broadcast notification" }

      clientSocket.on("broadcast-event", (data) => {
        expect(data.message).toBe(testData.message)
        expect(data.timestamp).toBeDefined()
        done()
      })

      // Broadcast notification
      socketService.broadcast("broadcast-event", testData)
    })
  })

  describe("Connection Tracking", () => {
    it("should track connected users", (done) => {
      expect(socketService.getConnectedUsersCount()).toBe(0)

      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connect", () => {
        expect(socketService.getConnectedUsersCount()).toBe(1)
        expect(socketService.isUserConnected(mockUser.id)).toBe(true)
        done()
      })

      clientSocket.on("connect_error", done)
    })

    it("should track team connected users", (done) => {
      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connect", () => {
        const teamUsers = socketService.getTeamConnectedUsers(mockUser.teamId!)
        expect(teamUsers).toContain(mockUser.id)
        expect(teamUsers.length).toBe(1)
        done()
      })

      clientSocket.on("connect_error", done)
    })

    it("should clean up on disconnect", (done) => {
      clientSocket = Client(serverAddress, {
        auth: { token: "valid-token" },
      })

      clientSocket.on("connect", () => {
        expect(socketService.getConnectedUsersCount()).toBe(1)
        clientSocket.disconnect()
      })

      clientSocket.on("disconnect", () => {
        // Give a small delay for cleanup
        setTimeout(() => {
          expect(socketService.getConnectedUsersCount()).toBe(0)
          expect(socketService.isUserConnected(mockUser.id)).toBe(false)
          done()
        }, 10)
      })

      clientSocket.on("connect_error", done)
    })
  })
})
