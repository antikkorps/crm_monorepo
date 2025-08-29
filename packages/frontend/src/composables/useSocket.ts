import { useAuthStore } from "@/stores/auth"
import { io } from "socket.io-client"
import { onMounted, onUnmounted, ref } from "vue"

export interface SocketNotification {
  type: string
  message: string
  data?: any
  timestamp: Date
}

export function useSocket() {
  const authStore = useAuthStore()
  const socket = ref<any>(null)
  const isConnected = ref(false)
  const notifications = ref<SocketNotification[]>([])

  const connect = () => {
    if (!authStore.isAuthenticated || socket.value?.connected) {
      return
    }

    socket.value = io("/", {
      auth: {
        token: authStore.accessToken,
      },
      transports: ["websocket", "polling"],
    })

    socket.value.on("connect", () => {
      console.log("Socket connected")
      isConnected.value = true

      // Join user-specific room
      if (authStore.user?.id) {
        socket.value?.emit("join-room", { userId: authStore.user.id })
      }
    })

    socket.value.on("disconnect", () => {
      console.log("Socket disconnected")
      isConnected.value = false
    })

    socket.value.on("notification", (data: SocketNotification) => {
      console.log("Received notification:", data)
      notifications.value.unshift({
        ...data,
        timestamp: new Date(),
      })

      // Keep only last 50 notifications
      if (notifications.value.length > 50) {
        notifications.value = notifications.value.slice(0, 50)
      }
    })

    socket.value.on("task-assigned", (data: any) => {
      console.log("Task assigned:", data)
      notifications.value.unshift({
        type: "task-assigned",
        message: `You have been assigned a new task: ${data.task.title}`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("institution-updated", (data: any) => {
      console.log("Institution updated:", data)
      notifications.value.unshift({
        type: "institution-updated",
        message: `Medical institution "${data.institution.name}" has been updated`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("team-activity", (data: any) => {
      console.log("Team activity:", data)
      notifications.value.unshift({
        type: "team-activity",
        message: `${data.user.firstName} ${data.user.lastName} ${data.action} ${data.target}`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("webhook-triggered", (data: any) => {
      console.log("Webhook triggered:", data)
      notifications.value.unshift({
        type: "webhook-triggered",
        message: `Webhook "${data.webhook.name}" was triggered`,
        data,
        timestamp: new Date(),
      })
    })

    socket.value.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error)
      isConnected.value = false
    })
  }

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
      isConnected.value = false
    }
  }

  const emit = (event: string, data?: any) => {
    if (socket.value?.connected) {
      socket.value.emit(event, data)
    }
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  const removeNotification = (index: number) => {
    notifications.value.splice(index, 1)
  }

  // Auto-connect when authenticated
  onMounted(() => {
    if (authStore.isAuthenticated) {
      connect()
    }
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    socket,
    isConnected,
    notifications,
    connect,
    disconnect,
    emit,
    clearNotifications,
    removeNotification,
  }
}
