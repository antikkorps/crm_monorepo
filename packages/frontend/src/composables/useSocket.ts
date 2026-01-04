import { useAuthStore } from "@/stores/auth"
import { io, type Socket } from "socket.io-client"
import { onMounted, onUnmounted, ref, watch, type Ref } from "vue"

export interface SocketNotification {
  type: string
  message: string
  data?: any
  timestamp: Date
}

export interface UseSocketReturn {
  socket: Ref<any>
  isConnected: Ref<boolean>
  isConnecting: Ref<boolean>
  connect: () => void
  disconnect: () => void
  emit: (event: string, data?: any) => boolean
}

export function useSocket(): UseSocketReturn {
  const authStore = useAuthStore()
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    // Get token directly from localStorage as backup
    const storeToken = authStore.accessToken
    const localToken = localStorage.getItem("token")
    const token = storeToken || localToken
    
    console.log("Connect attempt - token details:", {
      storeToken: storeToken ? storeToken.substring(0, 20) + '...' : 'null',
      localToken: localToken ? localToken.substring(0, 20) + '...' : 'null',
      finalToken: token ? token.substring(0, 20) + '...' : 'null'
    })
    
    if (!token || socket.value?.connected || isConnecting.value) {
      console.log("Socket connection blocked:", {
        isAuthenticated: authStore.isAuthenticated,
        hasStoreToken: !!storeToken,
        hasLocalStorageToken: !!localToken,
        finalToken: !!token,
        connected: socket.value?.connected,
        isConnecting: isConnecting.value
      })
      return
    }

    isConnecting.value = true
    console.log("Attempting to connect to Socket.io server...")
    console.log("Auth token available:", !!token, "Token preview:", token ? token.substring(0, 20) + '...' : 'none')

    // Determine the socket URL based on environment
    // Remove /api from the URL if present since Socket.io connects to the root
    let socketUrl = import.meta.env.VITE_API_URL || "http://localhost:3001"
    if (socketUrl.endsWith("/api")) {
      socketUrl = socketUrl.slice(0, -4)
    }

    socket.value = io(socketUrl, {
      auth: {
        token: token,
      },
      transports: ["websocket"],
      rememberUpgrade: false,
      upgrade: false,
      timeout: 20000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      forceNew: false,
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
    })

    // Specific event handlers for different notification types
    socket.value.on("task-assigned", (data: any) => {
      console.log("Task assigned notification:", data)
    })

    socket.value.on("institution-updated", (data: any) => {
      console.log("Institution updated notification:", data)

    })

    socket.value.on("team-activity", (data: any) => {
      console.log("Team activity notification:", data)
    })

    socket.value.on("webhook-triggered", (data: any) => {
      console.log("Webhook triggered notification:", data)

    })

    socket.value.on("task-overdue", (data: any) => {
      console.log("Task overdue notification:", data)

    })

    socket.value.on("task-due-soon", (data: any) => {
      console.log("Task due soon notification:", data)

    })

    socket.value.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error)
      console.error("Socket URL used:", socketUrl)
      console.error("Auth token present:", !!token)
      isConnected.value = false
      isConnecting.value = false

      // Add user-friendly error notification
    })

    socket.value.on("error", (error: any) => {
      console.error("Socket error:", error)
      // Add error notification
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





  // Watch for authentication changes
  watch(
    () => [authStore.accessToken, localStorage.getItem("token")],
    ([storeToken, localToken]) => {
      const token = storeToken || localToken
      console.log("Auth state changed:", { 
        hasStoreToken: !!storeToken,
        hasLocalToken: !!localToken, 
        finalToken: !!token,
        isAuthenticated: authStore.isAuthenticated
      })
      if (token) {
        setTimeout(() => connect(), 100) // Small delay to ensure token is fully available
      } else {
        disconnect()
      }
    },
    { immediate: true }
  )

  // Auto-connect when authenticated
  onMounted(() => {
    const token = authStore.accessToken || localStorage.getItem("token")
    if (token) {
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
    connect,
    disconnect,
    emit,
  }
}
