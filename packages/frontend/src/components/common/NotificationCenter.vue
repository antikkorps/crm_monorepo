<template>
  <div class="notification-center">
    <Button
      type="button"
      class="p-button-text notification-button"
      @click="toggleNotifications"
      aria-haspopup="true"
      aria-controls="notifications-menu"
    >
      <i class="pi pi-bell"></i>
      <Badge
        v-if="unreadCount > 0"
        :value="unreadCount"
        severity="danger"
        class="notification-badge"
      />
    </Button>

    <OverlayPanel
      ref="notificationPanel"
      :pt="{ root: { style: 'width: 400px; max-height: 500px' } }"
      :show-close-icon="false"
    >
      <div class="notification-header">
        <h4 class="m-0">Notifications</h4>
        <div class="notification-actions">
          <Button
            v-if="notifications.length > 0"
            icon="pi pi-check"
            text
            size="small"
            @click="markAllAsRead"
            title="Mark all as read"
          />
          <Button
            v-if="notifications.length > 0"
            icon="pi pi-trash"
            text
            size="small"
            @click="clearAllNotifications"
            title="Clear all"
          />
        </div>
      </div>

      <Divider class="my-2" />

      <div v-if="notifications.length === 0" class="notification-empty">
        <i class="pi pi-bell-slash text-4xl text-400 mb-3"></i>
        <p class="text-600 m-0">No notifications</p>
      </div>

      <div v-else class="notification-list">
        <div
          v-for="(notification, index) in notifications"
          :key="index"
          class="notification-item"
          :class="{ 'notification-unread': !notification.read }"
        >
          <div class="notification-icon">
            <i :class="getNotificationIcon(notification.type)"></i>
          </div>
          <div class="notification-content">
            <p class="notification-message">{{ notification.message }}</p>
            <small class="notification-time">{{
              formatTime(notification.timestamp)
            }}</small>
          </div>
          <div class="notification-actions">
            <Button
              icon="pi pi-times"
              text
              size="small"
              @click="removeNotification(index)"
              title="Dismiss"
            />
          </div>
        </div>
      </div>

      <Divider v-if="notifications.length > 0" class="my-2" />

      <div v-if="notifications.length > 0" class="notification-footer">
        <Button
          label="View All"
          text
          size="small"
          class="w-full"
          @click="viewAllNotifications"
        />
      </div>
    </OverlayPanel>
  </div>
</template>

<script setup lang="ts">
import Badge from "primevue/badge"
import Button from "primevue/button"
import Divider from "primevue/divider"
import OverlayPanel from "primevue/overlaypanel"
import { computed, ref } from "vue"

interface Notification {
  type: string
  message: string
  timestamp: Date
  read?: boolean
}

// Mock notifications for now since useSocket might not be fully implemented
const notifications = ref<Notification[]>([
  {
    type: "task-assigned",
    message: "You have been assigned a new task",
    timestamp: new Date(),
    read: false,
  },
  {
    type: "institution-updated",
    message: "Medical institution has been updated",
    timestamp: new Date(Date.now() - 3600000), // 1 hour ago
    read: false,
  },
])

const notificationPanel = ref<InstanceType<typeof OverlayPanel>>()

const unreadCount = computed(() => {
  return notifications.value.filter((notification) => !notification.read).length
})

const toggleNotifications = (event: Event) => {
  notificationPanel.value?.toggle(event)

  // Mark visible notifications as read when panel opens
  setTimeout(() => {
    if ((notificationPanel.value as any)?.visible) {
      markVisibleAsRead()
    }
  }, 100)
}

const markVisibleAsRead = () => {
  notifications.value.forEach((notification) => {
    notification.read = true
  })
}

const markAllAsRead = () => {
  notifications.value.forEach((notification) => {
    notification.read = true
  })
}

const clearAllNotifications = () => {
  notifications.value = []
}

const removeNotification = (index: number) => {
  notifications.value.splice(index, 1)
}

const viewAllNotifications = () => {
  // This could navigate to a dedicated notifications page
  console.log("View all notifications")
  notificationPanel.value?.hide()
}

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case "task-assigned":
      return "pi pi-check-square text-blue-500"
    case "institution-updated":
      return "pi pi-building text-green-500"
    case "team-activity":
      return "pi pi-users text-purple-500"
    case "webhook-triggered":
      return "pi pi-link text-orange-500"
    case "success":
      return "pi pi-check-circle text-green-500"
    case "warning":
      return "pi pi-exclamation-triangle text-yellow-500"
    case "error":
      return "pi pi-times-circle text-red-500"
    default:
      return "pi pi-info-circle text-blue-500"
  }
}

const formatTime = (timestamp: Date): string => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) {
    return "Just now"
  } else if (minutes < 60) {
    return `${minutes}m ago`
  } else if (hours < 24) {
    return `${hours}h ago`
  } else if (days < 7) {
    return `${days}d ago`
  } else {
    return timestamp.toLocaleDateString()
  }
}

// Future: Connect to real-time notifications via WebSocket
// const { socket } = useSocket()
//
// onMounted(() => {
//   socket?.on('notification', (notification: Notification) => {
//     notifications.value.unshift(notification)
//   })
// })
//
// onUnmounted(() => {
//   socket?.off('notification')
// })
</script>

<style scoped>
.notification-center {
  position: relative;
}

.notification-button {
  position: relative;
  padding: 0.5rem;
  border-radius: 50%;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-button:hover {
  background-color: #f8f9fa;
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 1.2rem;
  height: 1.2rem;
  font-size: 0.7rem;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.notification-actions {
  display: flex;
  gap: 0.25rem;
}

.notification-empty {
  text-align: center;
  padding: 2rem 1rem;
}

.notification-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-unread {
  background-color: #e3f2fd;
  border-left: 3px solid #1976d2;
}

.notification-icon {
  margin-right: 0.75rem;
  margin-top: 0.25rem;
}

.notification-content {
  flex: 1;
}

.notification-message {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.notification-time {
  color: #6b7280;
  font-size: 0.75rem;
}

.notification-item .notification-actions {
  margin-left: 0.5rem;
}

.notification-footer {
  padding: 0.5rem 0;
}
</style>
