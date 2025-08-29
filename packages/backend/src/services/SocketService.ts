import { Server as HttpServer } from "http"
import { Socket, Server as SocketIOServer } from "socket.io"
import config from "../config/environment"
import { User } from "../models/User"
import { logger } from "../utils/logger"
import { AuthService } from "./AuthService"

export interface AuthenticatedSocket extends Socket {
  user?: User
}

export interface SocketRoomData {
  userId: string
  teamId?: string
  rooms: Set<string>
}

export class SocketService {
  private static instance: SocketService
  private io: SocketIOServer | null = null
  private connectedUsers = new Map<string, SocketRoomData>()

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService()
    }
    return SocketService.instance
  }

  /**
   * Initialize Socket.io server with HTTP server
   */
  public initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      transports: ["websocket", "polling"],
    })

    this.setupMiddleware()
    this.setupEventHandlers()

    logger.info("Socket.io server initialized")
  }

  /**
   * Setup authentication middleware for Socket.io
   */
  private setupMiddleware(): void {
    if (!this.io) return

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        // Extract token from handshake auth or query
        const token =
          socket.handshake.auth?.token || (socket.handshake.query?.token as string)

        if (!token) {
          logger.warn("Socket connection attempt without token", {
            socketId: socket.id,
            ip: socket.handshake.address,
          })
          return next(new Error("Authentication token required"))
        }

        // Verify token and get user
        const user = await AuthService.getUserFromToken(token)

        // Attach user to socket
        socket.user = user

        logger.info("Socket authenticated successfully", {
          socketId: socket.id,
          userId: user.id,
          email: user.email,
        })

        next()
      } catch (error) {
        logger.warn("Socket authentication failed", {
          socketId: socket.id,
          error: (error as Error).message,
          ip: socket.handshake.address,
        })
        next(new Error("Authentication failed"))
      }
    })
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return

    this.io.on("connection", (socket: AuthenticatedSocket) => {
      this.handleConnection(socket)
    })
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: AuthenticatedSocket): void {
    const user = socket.user!

    logger.info("User connected via Socket.io", {
      socketId: socket.id,
      userId: user.id,
      email: user.email,
    })

    // Store user connection data
    const rooms = new Set<string>()
    this.connectedUsers.set(socket.id, {
      userId: user.id,
      teamId: user.teamId,
      rooms,
    })

    // Join user-specific room
    const userRoom = `user:${user.id}`
    socket.join(userRoom)
    rooms.add(userRoom)

    // Join team room if user has a team
    if (user.teamId) {
      const teamRoom = `team:${user.teamId}`
      socket.join(teamRoom)
      rooms.add(teamRoom)
    }

    // Setup event handlers for this socket
    this.setupSocketEventHandlers(socket)

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      this.handleDisconnection(socket, reason)
    })

    // Send welcome message
    socket.emit("connected", {
      message: "Successfully connected to Medical CRM",
      userId: user.id,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Setup event handlers for individual socket
   */
  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    const user = socket.user!

    // Handle joining custom rooms
    socket.on("join-room", (data: { room: string }) => {
      try {
        const { room } = data

        // Validate room format and permissions
        if (this.canJoinRoom(user, room)) {
          socket.join(room)

          const userData = this.connectedUsers.get(socket.id)
          if (userData) {
            userData.rooms.add(room)
          }

          logger.info("User joined room", {
            userId: user.id,
            room,
            socketId: socket.id,
          })

          socket.emit("room-joined", { room, timestamp: new Date().toISOString() })
        } else {
          socket.emit("error", {
            message: "Not authorized to join this room",
            code: "ROOM_ACCESS_DENIED",
          })
        }
      } catch (error) {
        logger.error("Error joining room", {
          userId: user.id,
          error: (error as Error).message,
          socketId: socket.id,
        })
        socket.emit("error", {
          message: "Failed to join room",
          code: "ROOM_JOIN_ERROR",
        })
      }
    })

    // Handle leaving rooms
    socket.on("leave-room", (data: { room: string }) => {
      try {
        const { room } = data
        socket.leave(room)

        const userData = this.connectedUsers.get(socket.id)
        if (userData) {
          userData.rooms.delete(room)
        }

        logger.info("User left room", {
          userId: user.id,
          room,
          socketId: socket.id,
        })

        socket.emit("room-left", { room, timestamp: new Date().toISOString() })
      } catch (error) {
        logger.error("Error leaving room", {
          userId: user.id,
          error: (error as Error).message,
          socketId: socket.id,
        })
      }
    })

    // Handle ping for connection health check
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() })
    })
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    const user = socket.user!

    logger.info("User disconnected from Socket.io", {
      socketId: socket.id,
      userId: user.id,
      reason,
    })

    // Clean up user connection data
    this.connectedUsers.delete(socket.id)
  }

  /**
   * Check if user can join a specific room
   */
  private canJoinRoom(user: User, room: string): boolean {
    // User can always join their own room
    if (room === `user:${user.id}`) {
      return true
    }

    // User can join their team room
    if (user.teamId && room === `team:${user.teamId}`) {
      return true
    }

    // Institution rooms - format: institution:${institutionId}
    if (room.startsWith("institution:")) {
      // For now, allow all authenticated users to join institution rooms
      // This can be enhanced with more granular permissions later
      return true
    }

    // Task rooms - format: task:${taskId}
    if (room.startsWith("task:")) {
      // For now, allow all authenticated users to join task rooms
      // This can be enhanced with task assignment validation later
      return true
    }

    // Deny access to other rooms by default
    return false
  }

  /**
   * Send notification to a specific user
   */
  public notifyUser(userId: string, event: string, data: any): void {
    if (!this.io) return

    const room = `user:${userId}`
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    })

    logger.debug("Notification sent to user", {
      userId,
      event,
      room,
    })
  }

  /**
   * Send notification to a team
   */
  public notifyTeam(teamId: string, event: string, data: any): void {
    if (!this.io) return

    const room = `team:${teamId}`
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    })

    logger.debug("Notification sent to team", {
      teamId,
      event,
      room,
    })
  }

  /**
   * Send notification to all users in a room
   */
  public notifyRoom(room: string, event: string, data: any): void {
    if (!this.io) return

    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    })

    logger.debug("Notification sent to room", {
      room,
      event,
    })
  }

  /**
   * Broadcast notification to all connected users
   */
  public broadcast(event: string, data: any): void {
    if (!this.io) return

    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    })

    logger.debug("Notification broadcasted", { event })
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size
  }

  /**
   * Get connected users for a team
   */
  public getTeamConnectedUsers(teamId: string): string[] {
    const teamUsers: string[] = []

    for (const [socketId, userData] of this.connectedUsers) {
      if (userData.teamId === teamId) {
        teamUsers.push(userData.userId)
      }
    }

    return teamUsers
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    for (const userData of this.connectedUsers.values()) {
      if (userData.userId === userId) {
        return true
      }
    }
    return false
  }

  /**
   * Get Socket.io server instance
   */
  public getIO(): SocketIOServer | null {
    return this.io
  }
}

export default SocketService
