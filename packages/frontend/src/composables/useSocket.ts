import { useAuthStore } from "@/stores/auth"
import { io, type Socket } from "socket.io-client"
import { onMounted, onUnmounted, ref, watch } from "vue"

export interface SocketNotification {
  type: string
  message: string
  data?: any
  timestamp: Date
}

export function useSocket() {
  const authStore = useAuthStore()
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const notifications = ref<SocketNotification[]>([])
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    if (!authStore.isAuthenticated || socket.value?.connected || isConnecting.value) {
      return
    }

    isConnecting.value = true
    console.log("Attempting to connect to Socket.io server...")

    // Determine the socket URL based on environment
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"

    socket.value = io(socketUrl, {
      auth: {
        token: authStore.accessToken,
      },
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      forceNew: true,
      autoConnect: true,
    })

    socket.value.on("connect", () => {
      console.log("Socket connected successfully")
      isConnected.value = true
      isConnecting.value = false
      reconnectAttempts.value = 0

      // Join user-specific room for targeted notifications
      if (authStore.user?.id) {
        socket.value?.emit("join-room", { room: `user:${authStore.user.id}` })
        console.log(`Joined room for user: ${authStore.user.id}`)
      }
    })

    socket.value.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason)
      isConnected.value = false
      isConnecting.value = false
    })

    socket.value.on("reconnect", (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`)
      isConnected.value = true
      isConnecting.value = false
      reconnectAttempts.value = 0
    })

    socket.value.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`)
      reconnectAttempts.value = attemptNumber
      isConnecting.value = true
    })

    socket.value.on("reconnect_failed", () => {
      console.error("Socket reconnection failed after maximum attempts")
      isConnecting.value = false
    })

    // Generic notification handler
    socket.value.on("notification", (data: SocketNotification) => {
      console.log("Received generic notification:", data)
      addNotification({
        ...data,
        timestamp: new Date(data.timestamp || Date.now()),
      })
    })

    // Specific event handlers for different notification types
    socket.value.on("task-assigned", (data: any) => {
      console.log("Task assigned notification:", data)
      addNotification({
        type: "task-assigned",
        message: `You have been assigned a new task: ${
          data.task?.title || "Unknown Task"
        }`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("institution-updated", (data: any) => {
      console.log("Institution updated notification:", data)
      addNotification({
        type: "institution-updated",
        message: `Medical institution "${
          data.institution?.name || "Unknown Institution"
        }" has been updated`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("team-activity", (data: any) => {
      console.log("Team activity notification:", data)
      const userName = data.user
        ? `${data.user.firstName} ${data.user.lastName}`
        : "Someone"
      addNotification({
        type: "team-activity",
        message: `${userName} ${data.action || "performed an action"} ${
          data.target || ""
        }`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("webhook-triggered", (data: any) => {
      console.log("Webhook triggered notification:", data)
      addNotification({
        type: "webhook-triggered",
        message: `Webhook "${data.webhook?.name || "Unknown Webhook"}" was triggered`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error)
      isConnected.value = false
      isConnecting.value = false
    })

    socket.value.on("error", (error: any) => {
      console.error("Socket error:", error)
      // Add error notification
      addNotification({
        type: "error",
        message: "Connection error occurred. Some features may be unavailable.",
        data: { error },
        timestamp: new Date(),
      })
    })
  }

  const disconnect = () => {
    if (socket.value) {
      console.log("Disconnecting socket...")
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
      isConnecting.value = false
      reconnectAttempts.value = 0
    }
  }

  const emit = (event: string, data?: any) => {
    if (socket.value?.connected) {
      socket.value.emit(event, data)
      return true
    } else {
      console.warn(`Cannot emit event '${event}': socket not connected`)
      return false
    }
  }

  const addNotification = (notification: SocketNotification) => {
    notifications.value.unshift(notification)

    // Keep only last 100 notifications to prevent memory issues
    if (notifications.value.length > 100) {
      notifications.value = notifications.value.slice(0, 100)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  const removeNotification = (index: number) => {
    if (index >= 0 && index < notifications.value.length) {
      notifications.value.splice(index, 1)
    }
  }

  // Watch for authentication changes
  watch(
    () => authStore.isAuthenticated,
    (isAuth) => {
      if (isAuth && authStore.accessToken) {
        connect()
      } else {
        disconnect()
      }
    },
    { immediate: true }
  )

  // Auto-connect when authenticated
  onMounted(() => {
    if (authStore.isAuthenticated && authStore.accessToken) {
      connect()
    }
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    isConnected,
    isConnecting,
    notifications,
    reconnectAttempts,
    connect,
    disconnect,
    emit,
    clearNotifications,
    removeNotification,
  }
}
