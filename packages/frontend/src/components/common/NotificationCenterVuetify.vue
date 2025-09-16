<template>
  <div class="notification-center">
    <!-- Notification Button -->
    <v-btn
      icon
      @click="toggleNotifications"
      :color="hasUnreadNotifications ? 'warning' : 'default'"
      size="small"
      class="notification-button"
    >
      <v-badge
        v-if="unreadCount > 0"
        :content="unreadCount > 99 ? '99+' : unreadCount"
        color="error"
        overlap
      >
        <v-icon :class="{ 'notification-pulse': hasUnreadNotifications }">
          mdi-bell
        </v-icon>
      </v-badge>
      <v-icon v-else :class="{ 'notification-pulse': hasUnreadNotifications }">
        mdi-bell
      </v-icon>
    </v-btn>

    <!-- Notifications Dropdown -->
    <transition name="dropdown">
      <div v-if="menuVisible" class="notification-dropdown" @click.stop>
        <v-card>
        <!-- Header -->
        <v-card-title class="d-flex justify-space-between align-center">
          <div class="d-flex align-center">
            <span class="text-h6">{{ $t('notifications.title') }}</span>
            <v-chip
              v-if="isConnected"
              color="success"
              size="x-small"
              class="ml-2"
              variant="flat"
            >
              <v-icon start size="x-small">mdi-circle</v-icon>
              {{ $t('notifications.connected') }}
            </v-chip>
            <v-chip
              v-else
              color="error"
              size="x-small"
              class="ml-2"
              variant="flat"
            >
              <v-icon start size="x-small">mdi-circle</v-icon>
              {{ $t('notifications.disconnected') }}
            </v-chip>
          </div>
          <div class="d-flex">
            <v-btn
              v-if="displayNotifications.length > 0"
              icon="mdi-check-all"
              size="small"
              variant="text"
              @click="markAllAsRead"
              :title="$t('notifications.markAllRead')"
            />
            <v-btn
              v-if="displayNotifications.length > 0"
              icon="mdi-delete-sweep"
              size="small"
              variant="text"
              @click="clearAllNotifications"
              :title="$t('notifications.clearAll')"
            />
          </div>
        </v-card-title>

        <v-divider />

        <!-- Content Container with fixed width -->
        <div class="notification-content" style="min-width: 400px;">
          <!-- Notifications List Container - Always present -->
          <div class="notification-list" style="max-height: 300px; overflow-y: auto; width: 100%;">
            <!-- Empty State -->
            <div v-if="displayNotifications.length === 0" class="text-center pa-8">
              <v-icon size="48" color="grey-lighten-2" class="mb-4">
                mdi-bell-off
              </v-icon>
              <p class="text-body-2 text-medium-emphasis">{{ $t('notifications.empty') }}</p>
            </div>

            <!-- Notifications with transition-group -->
            <transition-group v-else name="notification" tag="div" class="notification-container">
              <div
                v-for="notification in displayNotifications"
                :key="notification.id"
                class="notification-wrapper"
              >
                <v-list-item
                  :class="{ 'notification-unread': !notification.read }"
                  @click="handleNotificationClick(notification)"
                  class="notification-item"
                >
                  <template #prepend>
                    <v-icon :color="getNotificationColor(notification.type)">
                      {{ getNotificationIcon(notification.type) }}
                    </v-icon>
                  </template>

                  <v-list-item-title class="notification-message">
                    {{ notification.message }}
                  </v-list-item-title>

                  <v-list-item-subtitle class="notification-time">
                    {{ formatTime(notification.timestamp) }}
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      variant="text"
                      @click.stop="removeNotification(notification.id)"
                      :title="$t('notifications.dismiss')"
                    />
                  </template>
                </v-list-item>
              </div>
            </transition-group>
          </div>
        </div>

        <v-divider v-if="displayNotifications.length > 0" />

        <!-- Footer -->
        <v-card-actions v-if="displayNotifications.length > 0">
          <v-btn
            variant="text"
            block
            @click="viewAllNotifications"
          >
            {{ $t('notifications.viewAll') }}
          </v-btn>
        </v-card-actions>
        </v-card>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { useSocket, type SocketNotification } from "@/composables/useSocket"
import { useAuthStore } from "@/stores/auth"
import { useNotificationStore } from "@/stores/notifications"
import { taskNotificationService } from "@/services/taskNotificationService"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { useI18n } from "vue-i18n"

interface ExtendedNotification extends SocketNotification {
  read?: boolean
  id?: string
}

const router = useRouter()
const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const { t } = useI18n()
const {
  notifications,
  isConnected,
  connect,
  disconnect,
  clearNotifications: clearSocketNotifications,
} = useSocket()

// Reactive state
const menuVisible = ref(false)

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
      taskNotificationService.startMonitoring()
    } else {
      disconnect()
      taskNotificationService.stopMonitoring()
    }
  },
  { immediate: true }
)

const toggleNotifications = () => {
  menuVisible.value = !menuVisible.value

  // Mark visible notifications as read when panel opens
  if (menuVisible.value) {
    setTimeout(() => {
      markVisibleAsRead()
    }, 100)
  }
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

const removeNotification = (notificationId: string) => {
  if (notificationId) {
    notificationStore.removeNotification(notificationId)
  }
}

const handleNotificationClick = (notification: ExtendedNotification) => {
  // Mark as read
  if (!notification.read) {
    notificationStore.markAsRead(notification.id)
  }

  // Navigate based on notification type
  navigateFromNotification(notification)
  menuVisible.value = false
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
    case "task-overdue":
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
      console.log("Webhook notification clicked:", notification.data)
      break
    default:
      console.log("Unknown notification type:", notification.type)
  }
}

const viewAllNotifications = () => {
  router.push("/notifications")
  menuVisible.value = false
}

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case "task-assigned":
      return "mdi-check-circle"
    case "task-overdue":
      return "mdi-clock-alert"
    case "institution-updated":
      return "mdi-domain"
    case "team-activity":
      return "mdi-account-group"
    case "webhook-triggered":
      return "mdi-webhook"
    case "success":
      return "mdi-check-circle"
    case "warning":
      return "mdi-alert-circle"
    case "error":
      return "mdi-close-circle"
    default:
      return "mdi-information"
  }
}

const getNotificationColor = (type: string): string => {
  switch (type) {
    case "task-assigned":
      return "blue"
    case "task-overdue":
      return "red"
    case "institution-updated":
      return "green"
    case "team-activity":
      return "purple"
    case "webhook-triggered":
      return "orange"
    case "success":
      return "green"
    case "warning":
      return "amber"
    case "error":
      return "red"
    default:
      return "blue"
  }
}

const formatTime = (timestamp: Date): string => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) {
    return t('notifications.justNow')
  } else if (minutes < 60) {
    return t('notifications.minutesAgo', { count: minutes })
  } else if (hours < 24) {
    return t('notifications.hoursAgo', { count: hours })
  } else if (days < 7) {
    return t('notifications.daysAgo', { count: days })
  } else {
    return timestamp.toLocaleDateString()
  }
}

// Click outside handler
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  const notificationCenter = document.querySelector('.notification-center')

  if (notificationCenter && !notificationCenter.contains(target)) {
    menuVisible.value = false
  }
}

// Initialize notification store and connection on mount
onMounted(async () => {
  await notificationStore.initializePreferences()
  if (authStore.isAuthenticated) {
    connect()
    // Start monitoring for overdue tasks
    taskNotificationService.startMonitoring()
  }
})

// Watch menu visibility to add/remove click outside listener
watch(menuVisible, (isVisible) => {
  if (isVisible) {
    // Add click outside listener after a short delay
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
  } else {
    // Remove click outside listener
    document.removeEventListener('click', handleClickOutside)
  }
})

// Clean up on unmount
onUnmounted(() => {
  disconnect()
  taskNotificationService.stopMonitoring()
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.notification-center {
  position: relative;
}

.notification-dropdown {
  position: fixed;
  top: 60px;
  right: 20px;
  z-index: 9999;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
  background: white;
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
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
  }
}

.notification-list {
  overflow-y: auto;
}

.notification-item {
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
  transform: translateX(2px);
}

.notification-unread {
  background-color: rgba(25, 118, 210, 0.08);
  border-left-color: #1976d2;
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

.notification-unread .notification-message {
  font-weight: 600;
}

.notification-message {
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 0.25rem;
}

.notification-time {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Notification container */
.notification-container {
  width: 100%;
  position: relative;
  min-height: 0;
}

.notification-wrapper {
  width: 100%;
  overflow: hidden;
  will-change: transform, opacity, max-height;
}

/* Notification animations */
.notification-enter-active {
  transition: all 0.4s ease-out;
}

.notification-leave-active {
  transition: all 0.4s ease-in;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(-30px);
  max-height: 0;
}

.notification-enter-to {
  opacity: 1;
  transform: translateX(0);
  max-height: 200px;
}

.notification-leave-from {
  opacity: 1;
  transform: translateX(0);
  max-height: 200px;
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(30px);
  max-height: 0;
}

.notification-move {
  transition: transform 0.4s ease;
}

/* Dropdown animations */
.dropdown-enter-active {
  transition: all 0.3s ease-out;
}

.dropdown-leave-active {
  transition: all 0.2s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.dropdown-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .notification-dropdown {
    top: 60px;
    left: 8px;
    right: 8px;
    width: auto;
    max-width: none;
  }

  .notification-content {
    min-width: unset !important;
  }

  .notification-list {
    max-height: 60vh !important;
  }
}
</style>