import { defineStore } from 'pinia'

export interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timeout?: number
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [] as ToastNotification[],
  }),

  actions: {
    showNotification(message: string, type: ToastNotification['type'] = 'info', timeout = 5000) {
      const id = Date.now().toString()
      const notification: ToastNotification = {
        id,
        message,
        type,
        timeout,
      }

      this.notifications.push(notification)

      if (timeout > 0) {
        setTimeout(() => {
          this.removeNotification(id)
        }, timeout)
      }

      return id
    },

    showSuccess(message: string, timeout = 5000) {
      return this.showNotification(message, 'success', timeout)
    },

    showError(message: string, timeout = 7000) {
      return this.showNotification(message, 'error', timeout)
    },

    showWarning(message: string, timeout = 6000) {
      return this.showNotification(message, 'warning', timeout)
    },

    showInfo(message: string, timeout = 5000) {
      return this.showNotification(message, 'info', timeout)
    },

    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index > -1) {
        this.notifications.splice(index, 1)
      }
    },

    clearAll() {
      this.notifications = []
    },
  },
})