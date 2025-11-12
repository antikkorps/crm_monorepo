<template>
  <div class="notification-history">
    <div class="history-header mb-4">
      <div class="header-content">
        <h3 class="text-h5 font-weight-bold mb-2">Notification History</h3>
        <p class="text-body-2 text-medium-emphasis">View and manage all your notifications</p>
      </div>
    </div>

    <!-- Filters and Actions -->
    <v-row class="mb-4" align="center">
      <v-col cols="12" md="6">
        <v-row dense>
          <v-col cols="6">
            <v-select
              v-model="selectedType"
              :items="typeOptions"
              label="Filter by Type"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
          <v-col cols="6">
            <v-select
              v-model="selectedStatus"
              :items="statusOptions"
              label="Filter by Status"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="12" md="6" class="d-flex justify-end flex-wrap ga-2">
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-check-all"
          @click="markAllAsRead"
          :disabled="unreadCount === 0"
        >
          Mark All Read
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          prepend-icon="mdi-delete-sweep"
          @click="clearReadNotifications"
          :disabled="readCount === 0"
        >
          Clear Read
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          color="error"
          prepend-icon="mdi-delete"
          @click="confirmClearAll = true"
        >
          Clear All
        </v-btn>
      </v-col>
    </v-row>

    <!-- Notification List -->
    <div class="history-content">
      <!-- Empty State -->
      <div v-if="filteredNotifications.length === 0" class="text-center py-12">
        <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-bell-off</v-icon>
        <h4 class="text-h6 text-medium-emphasis mb-2">No notifications found</h4>
        <p class="text-body-2 text-medium-emphasis">
          {{ hasFilters ? "Try adjusting your filters" : "You have no notifications yet" }}
        </p>
      </div>

      <!-- Notifications List -->
      <v-list v-else class="pa-0">
        <template v-for="notification in paginatedNotifications" :key="notification.id">
          <v-list-item
            :class="{
              'notification-unread': !notification.read,
              'notification-dismissed': notification.dismissed,
            }"
            class="notification-item"
          >
            <template #prepend>
              <v-icon :color="getNotificationColor(notification.type)">
                {{ getNotificationIcon(notification.type) }}
              </v-icon>
            </template>

            <v-list-item-title class="mb-1">
              <v-chip
                :color="getNotificationColor(notification.type)"
                size="x-small"
                variant="flat"
                class="mr-2"
              >
                {{ getTypeLabel(notification.type) }}
              </v-chip>
              <span class="text-caption text-medium-emphasis">
                {{ formatTime(notification.timestamp) }}
              </span>
            </v-list-item-title>

            <v-list-item-subtitle class="text-wrap">
              {{ notification.message }}
            </v-list-item-subtitle>

            <template #append>
              <div class="d-flex ga-1">
                <v-btn
                  v-if="!notification.read"
                  icon="mdi-check"
                  size="x-small"
                  variant="text"
                  @click="markAsRead(notification.id)"
                  title="Mark as read"
                />
                <v-btn
                  icon="mdi-eye"
                  size="x-small"
                  variant="text"
                  @click="viewNotification(notification)"
                  title="View details"
                />
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  color="error"
                  @click="removeNotification(notification.id)"
                  title="Remove"
                />
              </div>
            </template>
          </v-list-item>
          <v-divider />
        </template>
      </v-list>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex justify-center mt-6">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          size="small"
        />
      </div>
    </div>

    <!-- Notification Details Dialog -->
    <v-dialog v-model="showDetails" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Notification Details</span>
          <v-btn icon="mdi-close" variant="text" @click="showDetails = false" />
        </v-card-title>

        <v-divider />

        <v-card-text v-if="selectedNotification" class="pa-4">
          <v-row dense>
            <v-col cols="12">
              <div class="text-subtitle-2 mb-1">Type</div>
              <v-chip
                :color="getNotificationColor(selectedNotification.type)"
                size="small"
                variant="flat"
              >
                {{ getTypeLabel(selectedNotification.type) }}
              </v-chip>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-1">Time</div>
              <div class="text-body-2">{{ formatFullTime(selectedNotification.timestamp) }}</div>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-1">Status</div>
              <v-chip
                :color="selectedNotification.read ? 'success' : 'info'"
                size="small"
                variant="flat"
              >
                {{ selectedNotification.read ? "Read" : "Unread" }}
              </v-chip>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-1">Message</div>
              <div class="text-body-2">{{ selectedNotification.message }}</div>
            </v-col>

            <v-col v-if="selectedNotification.data" cols="12">
              <div class="text-subtitle-2 mb-1">Additional Data</div>
              <v-sheet color="grey-lighten-4" rounded class="pa-3">
                <pre class="text-caption">{{ JSON.stringify(selectedNotification.data, null, 2) }}</pre>
              </v-sheet>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDetails = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Clear All Confirmation -->
    <v-dialog v-model="confirmClearAll" max-width="400">
      <v-card>
        <v-card-title>Clear All Notifications</v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          Are you sure you want to clear all notifications? This action cannot be undone.
        </v-card-text>

        <v-divider />

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmClearAll = false">Cancel</v-btn>
          <v-btn variant="text" color="error" @click="clearAllNotifications">Clear All</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Settings Dialog -->
    <v-dialog v-model="showSettings" max-width="800" scrollable>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Notification Settings</span>
          <v-btn icon="mdi-close" variant="text" @click="showSettings = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-0">
          <NotificationSettings @close="showSettings = false" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import NotificationSettings from "@/components/common/NotificationSettings.vue"
import { useNotificationStore, type NotificationHistory } from "@/stores/notifications"
import { computed, ref, watch } from "vue"

const notificationStore = useNotificationStore()

// Filters and pagination
const selectedType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = 25

// Dialog states
const showDetails = ref(false)
const showSettings = ref(false)
const confirmClearAll = ref(false)
const selectedNotification = ref<NotificationHistory | null>(null)

const typeOptions = [
  { title: "Task Assignments", value: "task-assigned" },
  { title: "Overdue Tasks", value: "task-overdue" },
  { title: "Institution Updates", value: "institution-updated" },
  { title: "Team Activity", value: "team-activity" },
  { title: "Webhook Events", value: "webhook-triggered" },
  { title: "Success", value: "success" },
  { title: "Warning", value: "warning" },
  { title: "Error", value: "error" },
]

const statusOptions = [
  { title: "Unread", value: "unread" },
  { title: "Read", value: "read" },
  { title: "Dismissed", value: "dismissed" },
]

const filteredNotifications = computed(() => {
  let notifications = [...notificationStore.history]

  if (selectedType.value) {
    notifications = notifications.filter((n) => n.type === selectedType.value)
  }

  if (selectedStatus.value) {
    switch (selectedStatus.value) {
      case "unread":
        notifications = notifications.filter((n) => !n.read)
        break
      case "read":
        notifications = notifications.filter((n) => n.read)
        break
      case "dismissed":
        notifications = notifications.filter((n) => n.dismissed)
        break
    }
  }

  return notifications
})

const paginatedNotifications = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredNotifications.value.slice(start, end)
})

const totalPages = computed(() =>
  Math.ceil(filteredNotifications.value.length / pageSize)
)

const hasFilters = computed(() => selectedType.value || selectedStatus.value)

const unreadCount = computed(
  () => filteredNotifications.value.filter((n) => !n.read).length
)

const readCount = computed(() => filteredNotifications.value.filter((n) => n.read).length)

// Reset to first page when filters change
watch([selectedType, selectedStatus], () => {
  currentPage.value = 1
})

const markAsRead = (notificationId: string) => {
  notificationStore.markAsRead(notificationId)
}

const markAllAsRead = () => {
  filteredNotifications.value.forEach((notification) => {
    if (!notification.read) {
      notificationStore.markAsRead(notification.id)
    }
  })
}

const removeNotification = (notificationId: string) => {
  notificationStore.removeNotification(notificationId)
}

const clearReadNotifications = () => {
  notificationStore.clearReadNotifications()
}

const clearAllNotifications = () => {
  notificationStore.clearAllNotifications()
  confirmClearAll.value = false
}

const viewNotification = (notification: NotificationHistory) => {
  selectedNotification.value = notification
  showDetails.value = true

  // Mark as read when viewing
  if (!notification.read) {
    markAsRead(notification.id)
  }
}

const getTypeLabel = (type: string): string => {
  const option = typeOptions.find((opt) => opt.value === type)
  return option?.title || type.charAt(0).toUpperCase() + type.slice(1)
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
      return "mdi-alert"
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

const formatFullTime = (timestamp: Date): string => {
  return timestamp.toLocaleString()
}
</script>

<style scoped>
.notification-history {
  max-width: 100%;
}

.notification-item {
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

.notification-unread {
  background-color: rgba(25, 118, 210, 0.08);
  border-left-color: #1976d2;
}

.notification-dismissed {
  opacity: 0.6;
}

pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}
</style>
