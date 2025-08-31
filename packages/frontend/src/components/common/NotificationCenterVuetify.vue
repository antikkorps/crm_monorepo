<template>
  <div class="notification-center">
    <!-- Notification Button -->
    <v-btn
      icon
      @click="toggleNotifications"
      :color="hasUnreadNotifications ? 'warning' : 'default'"
      size="small"
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

    <!-- Notifications Menu -->
    <v-menu
      v-model="menuVisible"
      :close-on-content-click="false"
      location="bottom end"
      offset="8"
      max-width="400"
      max-height="500"
    >
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

        <!-- Empty State -->
        <div v-if="displayNotifications.length === 0" class="text-center pa-8">
          <v-icon size="48" color="grey-lighten-2" class="mb-4">
            mdi-bell-off
          </v-icon>
          <p class="text-body-2 text-medium-emphasis">{{ $t('notifications.empty') }}</p>
        </div>

        <!-- Notifications List -->
        <v-list v-else class="notification-list" max-height="300">
          <v-list-item
            v-for="(notification, index) in displayNotifications"
            :key="`${notification.timestamp}-${index}`"
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
                @click.stop="removeNotification(index)"
                :title="$t('notifications.dismiss')"
              />
            </template>
          </v-list-item>
        </v-list>

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
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { useSocket, type SocketNotification } from "@/composables/useSocket"
import { useAuthStore } from "@/stores/auth"
import { useNotificationStore } from "@/stores/notifications"
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
    } else {
      disconnect()
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
</style>