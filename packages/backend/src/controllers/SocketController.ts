import { Context } from "koa"
import { User } from "../models/User"
import { SocketService } from "../services/SocketService"
import { logger } from "../utils/logger"

export class SocketController {
  /**
   * Get Socket.io connection status
   */
  static async getConnectionStatus(ctx: Context): Promise<void> {
    const socketService = SocketService.getInstance()
    const user = ctx.state.user as User

    ctx.body = {
      connected: socketService.isUserConnected(user.id),
      totalConnections: socketService.getConnectedUsersCount(),
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get team connection status
   */
  static async getTeamConnectionStatus(ctx: Context): Promise<void> {
    const socketService = SocketService.getInstance()
    const user = ctx.state.user as User

    if (!user.teamId) {
      ctx.body = {
        teamId: null,
        connectedUsers: [],
        totalConnections: 0,
      }
      return
    }

    const connectedUsers = socketService.getTeamConnectedUsers(user.teamId)

    ctx.body = {
      teamId: user.teamId,
      connectedUsers,
      totalConnections: connectedUsers.length,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Send test notification to user
   */
  static async sendTestNotification(ctx: Context): Promise<void> {
    const socketService = SocketService.getInstance()
    const user = ctx.state.user as User
    const { message, type = "info" } = ctx.request.body as any

    if (!message) {
      ctx.status = 400
      ctx.body = {
        error: {
          code: "MISSING_MESSAGE",
          message: "Message is required for test notification",
        },
      }
      return
    }

    // Send test notification
    socketService.notifyUser(user.id, "test-notification", {
      type,
      message,
      sender: "System",
    })

    logger.info("Test notification sent", {
      userId: user.id,
      message,
      type,
    })

    ctx.body = {
      success: true,
      message: "Test notification sent successfully",
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Send notification to team (admin only)
   */
  static async sendTeamNotification(ctx: Context): Promise<void> {
    const socketService = SocketService.getInstance()
    const user = ctx.state.user as User
    const { message, type = "info", teamId } = ctx.request.body as any

    if (!message) {
      ctx.status = 400
      ctx.body = {
        error: {
          code: "MISSING_MESSAGE",
          message: "Message is required for team notification",
        },
      }
      return
    }

    // Use user's team if no teamId provided
    const targetTeamId = teamId || user.teamId

    if (!targetTeamId) {
      ctx.status = 400
      ctx.body = {
        error: {
          code: "NO_TEAM",
          message: "No team specified for notification",
        },
      }
      return
    }

    // Send team notification
    socketService.notifyTeam(targetTeamId, "team-notification", {
      type,
      message,
      sender: user.getFullName(),
      senderId: user.id,
    })

    logger.info("Team notification sent", {
      userId: user.id,
      teamId: targetTeamId,
      message,
      type,
    })

    ctx.body = {
      success: true,
      message: "Team notification sent successfully",
      teamId: targetTeamId,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get Socket.io server statistics (admin only)
   */
  static async getServerStats(ctx: Context): Promise<void> {
    const socketService = SocketService.getInstance()
    const io = socketService.getIO()

    if (!io) {
      ctx.status = 503
      ctx.body = {
        error: {
          code: "SOCKET_NOT_INITIALIZED",
          message: "Socket.io server not initialized",
        },
      }
      return
    }

    // Get basic stats
    const totalConnections = socketService.getConnectedUsersCount()
    const sockets = await io.fetchSockets()
    const rooms = io.sockets.adapter.rooms

    // Count rooms by type
    const roomStats = {
      total: rooms.size,
      userRooms: 0,
      teamRooms: 0,
      institutionRooms: 0,
      taskRooms: 0,
      other: 0,
    }

    for (const [roomName] of rooms) {
      if (roomName.startsWith("user:")) {
        roomStats.userRooms++
      } else if (roomName.startsWith("team:")) {
        roomStats.teamRooms++
      } else if (roomName.startsWith("institution:")) {
        roomStats.institutionRooms++
      } else if (roomName.startsWith("task:")) {
        roomStats.taskRooms++
      } else {
        roomStats.other++
      }
    }

    ctx.body = {
      totalConnections,
      totalSockets: sockets.length,
      rooms: roomStats,
      timestamp: new Date().toISOString(),
    }
  }
}
