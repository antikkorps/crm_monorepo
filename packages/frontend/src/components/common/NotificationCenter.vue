<template>
  <div class="notification-center">
    <Button
      type="button"
      class="p-button-text notification-button"
      @click="toggleNotifications"
      aria-haspopup="true"
      aria-controls="notifications-menu"
    >
      <i class="pi pi-bell" :class="{ 'notification-pulse': hasUnreadNotifications }"></i>
      <Badge
        v-if="unreadCount > 0"
        :value="unreadCount > 99 ? '99+' : unreadCount"
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
        <div class="notification-title">
          <h4 class="m-0">Notifications</h4>
          <div class="connection-status">
            <i
              :class="
                isConnected
                  ? 'pi pi-circle-fill text-green-500'
                  : 'pi pi-circle-fill text-red-500'
              "
              :title="isConnected ? 'Connected' : 'Disconnected'"
            ></i>
          </div>
        </div>
        <div class="notification-actions">
          <Button
            v-if="displayNotifications.length > 0"
            icon="pi pi-check"
            text
            size="small"
            @click="markAllAsRead"
            title="Mark all as read"
          />
          <Button
            v-if="displayNotifications.length > 0"
            icon="pi pi-trash"
            text
            size="small"
            @click="clearAllNotifications"
            title="Clear all"
          />
        </div>
      </div>

      <Divider class="my-2" />

      <div v-if="displayNotifications.length === 0" class="notification-empty">
        <i class="pi pi-bell-slash text-4xl text-400 mb-3"></i>
        <p class="text-600 m-0">No notifications</p>
      </div>

      <div v-else class="notification-list">
        <div
          v-for="(notification, index) in displayNotifications"
          :key="`${notification.timestamp}-${index}`"
          class="notification-item"
          :class="{ 'notification-unread': !notification.read }"
          @click="handleNotificationClick(notification)"
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
              @click.stop="removeNotification(index)"
              title="Dismiss"
            />
          </div>
        </div>
      </div>

      <Divider v-if="displayNotifications.length > 0" class="my-2" />

      <div v-if="displayNotifications.length > 0" class="notification-footer">
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
import { useSocket, type SocketNotification } from "@/composables/useSocket"
import { useAuthStore } from "@/stores/auth"
import { useNotificationStore } from "@/stores/notifications"
import Badge from "primevue/badge"
import Button from "primevue/button"
import Divider from "primevue/divider"
import OverlayPanel from "primevue/overlaypanel"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

interface ExtendedNotification extends SocketNotification {
  read?: boolean
  id?: string
}

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const {
  notifications,
  isConnected,
  connect,
  disconnect,
  clearNotifications: clearSocketNotifications,
} = useSocket()

const notificationPanel = ref<InstanceType<typeof OverlayPanel>>()

// Use notification store for display
const displayNotifications = computed(() => {
  return notificationStore.recentNotifications.map((notification) => ({
    type: notification.type,
    message: notification.message,
    data: notification.data,
    timestamp: notification.timestamp,
    read: notification.read,
    id: notification.id,
  }))
})

const unreadCount = computed(() => notificationStore.unreadCount)
const hasUnreadNotifications = computed(() => unreadCount.value > 0)

// Watch for new socket notifications and add them to the store
watch(
  notifications,
  (newNotifications, oldNotifications) => {
    // Only process new notifications
    const newCount = newNotifications.length - (oldNotifications?.length || 0)
    if (newCount > 0) {
      // Add the newest notifications to the store
      for (let i = 0; i < newCount; i++) {
        const notification = newNotifications[i]
        notificationStore.addNotification({
          type: notification.type,
          message: notification.message,
          data: notification.data,
          timestamp: notification.timestamp,
        })
      }

      // Play notification sound for new notifications
      notificationStore.playNotificationSound()
    }
  },
  { deep: true }
)

// Connect to socket when authenticated
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      connect()
    } else {
      disconnect()
    }
  },
  { immediate: true }
)

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
  displayNotifications.value.forEach((notification) => {
    if (!notification.read) {
      notificationStore.markAsRead(notification.id)
    }
  })
}

const markAllAsRead = () => {
  notificationStore.markAllAsRead()
}

const clearAllNotifications = () => {
  notificationStore.clearAllNotifications()
  clearSocketNotifications()
}

const removeNotification = (index: number) => {
  const notification = displayNotifications.value[index]
  if (notification) {
    notificationStore.removeNotification(notification.id)
  }
}

const handleNotificationClick = (notification: ExtendedNotification) => {
  // Mark as read
  if (!notification.read) {
    notificationStore.markAsRead(notification.id)
  }

  // Navigate based on notification type
  navigateFromNotification(notification)
  notificationPanel.value?.hide()
}

const navigateFromNotification = (notification: ExtendedNotification) => {
  switch (notification.type) {
    case "task-assigned":
      if (notification.data?.task?.id) {
        router.push(`/tasks?taskId=${notification.data.task.id}`)
      } else {
        router.push("/tasks")
      }
      break
    case "institution-updated":
      if (notification.data?.institution?.id) {
        router.push(`/institutions/${notification.data.institution.id}`)
      } else {
        router.push("/institutions")
      }
      break
    case "team-activity":
      router.push("/team")
      break
    case "webhook-triggered":
      // Could navigate to webhooks management if available
      console.log("Webhook notification clicked:", notification.data)
      break
    default:
      console.log("Unknown notification type:", notification.type)
  }
}

const viewAllNotifications = () => {
  // Navigate to notifications history page
  router.push("/notifications")
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

// Initialize notification store and connection on mount
onMounted(async () => {
  await notificationStore.initializePreferences()
  if (authStore.isAuthenticated) {
    connect()
  }
})

// Clean up on unmount
onUnmounted(() => {
  disconnect()
})
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

.notification-pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
    color: #1976d2;
  }
  100% {
    transform: scale(1);
  }
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 1.2rem;
  height: 1.2rem;
  font-size: 0.7rem;
  animation: bounce 0.5s ease-in-out;
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-3px);
  }
  60% {
    transform: translateY(-1px);
  }
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.notification-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.connection-status {
  font-size: 0.6rem;
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
  transition: all 0.2s;
  cursor: pointer;
}

.notification-item:hover {
  background-color: #f8f9fa;
  transform: translateX(2px);
}

.notification-unread {
  background-color: #e3f2fd;
  border-left: 3px solid #1976d2;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notification-icon {
  margin-right: 0.75rem;
  margin-top: 0.25rem;
  font-size: 1rem;
}

.notification-content {
  flex: 1;
}

.notification-message {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  line-height: 1.4;
  font-weight: 500;
}

.notification-unread .notification-message {
  font-weight: 600;
}

.notification-time {
  color: #6b7280;
  font-size: 0.75rem;
}

.notification-item .notification-actions {
  margin-left: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.notification-item:hover .notification-actions {
  opacity: 1;
}

.notification-footer {
  padding: 0.5rem 0;
}

/* Scrollbar styling */
.notification-list::-webkit-scrollbar {
  width: 4px;
}

.notification-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.notification-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.notification-list::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style>
