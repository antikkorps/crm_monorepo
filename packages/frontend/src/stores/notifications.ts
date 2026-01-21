import { defineStore } from "pinia"

export interface NotificationPreferences {
  enableSound: boolean
  enableDesktop: boolean
  enableTaskAssignments: boolean
  enableTaskOverdue: boolean
  enableInstitutionUpdates: boolean
  enableTeamActivity: boolean
  enableWebhookEvents: boolean
  soundVolume: number
  desktopDuration: number
}

export interface NotificationHistory {
  id: string
  type: string
  message: string
  data?: any
  timestamp: Date
  read: boolean
  dismissed: boolean
}

export const useNotificationStore = defineStore("notifications", {
  state: () => ({
    preferences: {
      enableSound: true,
      enableDesktop: false,
      enableTaskAssignments: true,
      enableTaskOverdue: true,
      enableInstitutionUpdates: true,
      enableTeamActivity: true,
      enableWebhookEvents: false,
      soundVolume: 0.5,
      desktopDuration: 5000,
    } as NotificationPreferences,
    history: [] as NotificationHistory[],
    isDesktopPermissionGranted: false,
    isOnline: navigator.onLine,
    offlineQueue: [] as NotificationHistory[],
  }),

  getters: {
    unreadCount: (state) => state.history.filter((n) => !n.read).length,
    recentNotifications: (state) => state.history.slice(0, 50),
    notificationsByType: (state) => (type: string) =>
      state.history.filter((n) => n.type === type),
  },

  actions: {
    async initializePreferences() {
      // Load preferences from localStorage
      const saved = localStorage.getItem("notification-preferences")
      if (saved) {
        try {
          this.preferences = { ...this.preferences, ...JSON.parse(saved) }
        } catch (error) {
          console.error("Failed to load notification preferences:", error)
        }
      }

      // Load notification history from localStorage
      const savedHistory = localStorage.getItem("notification-history")
      if (savedHistory) {
        try {
          const parsedHistory = JSON.parse(savedHistory)
          this.history = parsedHistory.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
        } catch (error) {
          console.error("Failed to load notification history:", error)
        }
      }

      // Load offline queue from localStorage
      const savedQueue = localStorage.getItem("notification-offline-queue")
      if (savedQueue) {
        try {
          const parsedQueue = JSON.parse(savedQueue)
          this.offlineQueue = parsedQueue.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
        } catch (error) {
          console.error("Failed to load offline notification queue:", error)
        }
      }

      // Check desktop notification permission
      if ("Notification" in window) {
        this.isDesktopPermissionGranted = Notification.permission === "granted"
      }

      // Set up online/offline event listeners
      this.setupOnlineOfflineListeners()

      // Process offline queue if we're online
      if (this.isOnline && this.offlineQueue.length > 0) {
        this.processOfflineQueue()
      }
    },

    async updatePreferences(newPreferences: Partial<NotificationPreferences>) {
      this.preferences = { ...this.preferences, ...newPreferences }

      // Save to localStorage
      localStorage.setItem("notification-preferences", JSON.stringify(this.preferences))

      // Request desktop permission if enabled
      if (newPreferences.enableDesktop && "Notification" in window) {
        await this.requestDesktopPermission()
      }
    },

    async requestDesktopPermission(): Promise<boolean> {
      if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notifications")
        return false
      }

      if (Notification.permission === "granted") {
        this.isDesktopPermissionGranted = true
        return true
      }

      if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission()
        this.isDesktopPermissionGranted = permission === "granted"
        return this.isDesktopPermissionGranted
      }

      return false
    },

    addNotification(
      notification: Omit<NotificationHistory, "id" | "read" | "dismissed">,
    ) {
      const newNotification: NotificationHistory = {
        ...notification,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        read: false,
        dismissed: false,
      }

      if (this.isOnline) {
        // Add to history immediately if online
        this.history.unshift(newNotification)

        // Keep only last 500 notifications
        if (this.history.length > 500) {
          this.history = this.history.slice(0, 500)
        }

        // Save to localStorage
        this.saveHistoryToStorage()

        // Show desktop notification if enabled and permission granted
        if (this.shouldShowNotification(notification.type)) {
          this.showDesktopNotification(newNotification)
        }
      } else {
        // Add to offline queue if offline
        this.offlineQueue.unshift(newNotification)
        this.saveOfflineQueueToStorage()

        // Still show desktop notification if enabled (works offline)
        if (this.shouldShowNotification(notification.type)) {
          this.showDesktopNotification(newNotification)
        }
      }

      return newNotification.id
    },

    markAsRead(notificationId: string) {
      const notification = this.history.find((n) => n.id === notificationId)
      if (notification) {
        notification.read = true
        this.saveHistoryToStorage()
      }
    },

    markAllAsRead() {
      this.history.forEach((notification) => {
        notification.read = true
      })
      this.saveHistoryToStorage()
    },

    dismissNotification(notificationId: string) {
      const notification = this.history.find((n) => n.id === notificationId)
      if (notification) {
        notification.dismissed = true
      }
    },

    removeNotification(notificationId: string) {
      const index = this.history.findIndex((n) => n.id === notificationId)
      if (index >= 0) {
        this.history.splice(index, 1)
        this.saveHistoryToStorage()
      }
    },

    clearAllNotifications() {
      this.history = []
      this.saveHistoryToStorage()
    },

    clearReadNotifications() {
      this.history = this.history.filter((n) => !n.read)
      this.saveHistoryToStorage()
    },

    shouldShowNotification(type: string): boolean {
      switch (type) {
        case "task-assigned":
          return this.preferences.enableTaskAssignments
        case "task-overdue":
          return this.preferences.enableTaskOverdue
        case "institution-updated":
          return this.preferences.enableInstitutionUpdates
        case "team-activity":
          return this.preferences.enableTeamActivity
        case "webhook-triggered":
          return this.preferences.enableWebhookEvents
        default:
          return true
      }
    },

    showDesktopNotification(notification: NotificationHistory) {
      if (!this.preferences.enableDesktop || !this.isDesktopPermissionGranted) {
        return
      }

      try {
        const desktopNotification = new Notification("OPEx_CRM", {
          body: notification.message,
          icon: "/favicon.ico",
          tag: notification.id,
          requireInteraction: false,
        })

        // Auto-close after specified duration
        setTimeout(() => {
          desktopNotification.close()
        }, this.preferences.desktopDuration)

        // Handle click to focus window
        desktopNotification.onclick = () => {
          window.focus()
          desktopNotification.close()
        }
      } catch (error) {
        console.error("Failed to show desktop notification:", error)
      }
    },

    playNotificationSound() {
      if (!this.preferences.enableSound) {
        return
      }

      try {
        const audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)

        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(
          this.preferences.soundVolume * 0.1,
          audioContext.currentTime + 0.01,
        )
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.2)
      } catch (error) {
        console.debug("Could not play notification sound:", error)
      }
    },

    getNotificationStats() {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

      return {
        total: this.history.length,
        unread: this.unreadCount,
        today: this.history.filter((n) => n.timestamp >= today).length,
        thisWeek: this.history.filter((n) => n.timestamp >= thisWeek).length,
        byType: {
          taskAssigned: this.history.filter((n) => n.type === "task-assigned").length,
          taskOverdue: this.history.filter((n) => n.type === "task-overdue").length,
          institutionUpdated: this.history.filter((n) => n.type === "institution-updated")
            .length,
          teamActivity: this.history.filter((n) => n.type === "team-activity").length,
          webhookTriggered: this.history.filter((n) => n.type === "webhook-triggered")
            .length,
        },
      }
    },

    // Offline support methods
    setupOnlineOfflineListeners() {
      window.addEventListener("online", () => {
        this.isOnline = true
        this.processOfflineQueue()
      })

      window.addEventListener("offline", () => {
        this.isOnline = false
      })
    },

    processOfflineQueue() {
      if (this.offlineQueue.length === 0) return

      // Move all offline notifications to history
      this.history.unshift(...this.offlineQueue)
      this.offlineQueue = []

      // Keep only last 500 notifications
      if (this.history.length > 500) {
        this.history = this.history.slice(0, 500)
      }

      // Save updated history and clear offline queue
      this.saveHistoryToStorage()
      this.saveOfflineQueueToStorage()

      // Show a notification that offline notifications were processed
      this.addNotification({
        type: "success",
        message: `${this.offlineQueue.length} offline notifications have been processed`,
        timestamp: new Date(),
      })
    },

    saveHistoryToStorage() {
      try {
        localStorage.setItem("notification-history", JSON.stringify(this.history))
      } catch (error) {
        console.error("Failed to save notification history:", error)
      }
    },

    saveOfflineQueueToStorage() {
      try {
        localStorage.setItem(
          "notification-offline-queue",
          JSON.stringify(this.offlineQueue),
        )
      } catch (error) {
        console.error("Failed to save offline notification queue:", error)
      }
    },

    getOfflineQueueCount() {
      return this.offlineQueue.length
    },
  },
})
