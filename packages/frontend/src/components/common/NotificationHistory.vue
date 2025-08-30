<template>
  <div class="notification-history">
    <div class="history-header">
      <div class="header-content">
        <h3 class="m-0">Notification History</h3>
        <p class="text-600 mt-2 mb-0">View and manage all your notifications</p>
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-cog"
          text
          rounded
          @click="showSettings = true"
          title="Notification Settings"
        />
      </div>
    </div>

    <!-- Filters and Actions -->
    <div class="history-controls">
      <div class="filter-controls">
        <Dropdown
          v-model="selectedType"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          placeholder="All Types"
          class="filter-dropdown"
          show-clear
        />
        <Dropdown
          v-model="selectedStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="All Status"
          class="filter-dropdown"
          show-clear
        />
      </div>

      <div class="action-controls">
        <Button
          label="Mark All Read"
          icon="pi pi-check"
          text
          size="small"
          @click="markAllAsRead"
          :disabled="unreadCount === 0"
        />
        <Button
          label="Clear Read"
          icon="pi pi-trash"
          text
          size="small"
          @click="clearReadNotifications"
          :disabled="readCount === 0"
        />
        <Button
          label="Clear All"
          icon="pi pi-times"
          text
          size="small"
          severity="danger"
          @click="confirmClearAll = true"
        />
      </div>
    </div>

    <!-- Notification List -->
    <div class="history-content">
      <div v-if="filteredNotifications.length === 0" class="empty-state">
        <i class="pi pi-bell-slash text-4xl text-400 mb-3"></i>
        <h4 class="text-600 mb-2">No notifications found</h4>
        <p class="text-500 m-0">
          {{
            hasFilters ? "Try adjusting your filters" : "You have no notifications yet"
          }}
        </p>
      </div>

      <div v-else class="notification-list">
        <div
          v-for="notification in paginatedNotifications"
          :key="notification.id"
          class="history-item"
          :class="{
            'history-item-unread': !notification.read,
            'history-item-dismissed': notification.dismissed,
          }"
        >
          <div class="item-icon">
            <i :class="getNotificationIcon(notification.type)"></i>
          </div>

          <div class="item-content">
            <div class="item-header">
              <span class="item-type">{{ getTypeLabel(notification.type) }}</span>
              <span class="item-time">{{ formatTime(notification.timestamp) }}</span>
            </div>
            <p class="item-message">{{ notification.message }}</p>
            <div v-if="notification.data" class="item-data">
              <small class="text-500"> Additional data available </small>
            </div>
          </div>

          <div class="item-actions">
            <Button
              v-if="!notification.read"
              icon="pi pi-check"
              text
              rounded
              size="small"
              @click="markAsRead(notification.id)"
              title="Mark as read"
            />
            <Button
              icon="pi pi-eye"
              text
              rounded
              size="small"
              @click="viewNotification(notification)"
              title="View details"
            />
            <Button
              icon="pi pi-times"
              text
              rounded
              size="small"
              severity="danger"
              @click="removeNotification(notification.id)"
              title="Remove"
            />
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-container">
        <Paginator
          v-model:first="first"
          :rows="pageSize"
          :total-records="filteredNotifications.length"
          :rows-per-page-options="[10, 25, 50]"
          template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
        />
      </div>
    </div>

    <!-- Notification Details Dialog -->
    <Dialog
      v-model:visible="showDetails"
      modal
      header="Notification Details"
      :style="{ width: '500px' }"
    >
      <div v-if="selectedNotification" class="notification-details">
        <div class="detail-row">
          <strong>Type:</strong>
          <span>{{ getTypeLabel(selectedNotification.type) }}</span>
        </div>
        <div class="detail-row">
          <strong>Time:</strong>
          <span>{{ formatFullTime(selectedNotification.timestamp) }}</span>
        </div>
        <div class="detail-row">
          <strong>Status:</strong>
          <Tag
            :value="selectedNotification.read ? 'Read' : 'Unread'"
            :severity="selectedNotification.read ? 'success' : 'info'"
          />
        </div>
        <div class="detail-row">
          <strong>Message:</strong>
          <p class="m-0">{{ selectedNotification.message }}</p>
        </div>
        <div v-if="selectedNotification.data" class="detail-row">
          <strong>Additional Data:</strong>
          <pre class="data-preview">{{
            JSON.stringify(selectedNotification.data, null, 2)
          }}</pre>
        </div>
      </div>

      <template #footer>
        <Button label="Close" text @click="showDetails = false" />
      </template>
    </Dialog>

    <!-- Clear All Confirmation -->
    <Dialog
      v-model:visible="confirmClearAll"
      modal
      header="Clear All Notifications"
      :style="{ width: '400px' }"
    >
      <p>
        Are you sure you want to clear all notifications? This action cannot be undone.
      </p>

      <template #footer>
        <Button label="Cancel" text @click="confirmClearAll = false" />
        <Button label="Clear All" severity="danger" @click="clearAllNotifications" />
      </template>
    </Dialog>

    <!-- Settings Dialog -->
    <Dialog
      v-model:visible="showSettings"
      modal
      header="Notification Settings"
      :style="{ width: '700px', maxHeight: '80vh' }"
    >
      <NotificationSettings @close="showSettings = false" />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import NotificationSettings from "@/components/common/NotificationSettings.vue"
import { useNotificationStore, type NotificationHistory } from "@/stores/notifications"
import Button from "primevue/button"
import Dialog from "primevue/dialog"
import Dropdown from "primevue/dropdown"
import Paginator from "primevue/paginator"
import Tag from "primevue/tag"
import { computed, ref } from "vue"

const notificationStore = useNotificationStore()

// Filters and pagination
const selectedType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)
const first = ref(0)
const pageSize = ref(25)

// Dialog states
const showDetails = ref(false)
const showSettings = ref(false)
const confirmClearAll = ref(false)
const selectedNotification = ref<NotificationHistory | null>(null)

const typeOptions = [
  { label: "Task Assignments", value: "task-assigned" },
  { label: "Institution Updates", value: "institution-updated" },
  { label: "Team Activity", value: "team-activity" },
  { label: "Webhook Events", value: "webhook-triggered" },
  { label: "Success", value: "success" },
  { label: "Warning", value: "warning" },
  { label: "Error", value: "error" },
]

const statusOptions = [
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
  { label: "Dismissed", value: "dismissed" },
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
  const start = first.value
  const end = start + pageSize.value
  return filteredNotifications.value.slice(start, end)
})

const totalPages = computed(() =>
  Math.ceil(filteredNotifications.value.length / pageSize.value)
)

const hasFilters = computed(() => selectedType.value || selectedStatus.value)

const unreadCount = computed(
  () => filteredNotifications.value.filter((n) => !n.read).length
)

const readCount = computed(() => filteredNotifications.value.filter((n) => n.read).length)

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
  return option?.label || type.charAt(0).toUpperCase() + type.slice(1)
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

const formatFullTime = (timestamp: Date): string => {
  return timestamp.toLocaleString()
}
</script>

<style scoped>
.notification-history {
  max-width: 800px;
  margin: 0 auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e9ecef;
  margin-bottom: 1.5rem;
}

.header-content {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.history-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.filter-controls {
  display: flex;
  gap: 0.75rem;
}

.filter-dropdown {
  min-width: 150px;
}

.action-controls {
  display: flex;
  gap: 0.5rem;
}

.history-content {
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: #dee2e6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.history-item-unread {
  background: #e3f2fd;
  border-left: 4px solid #1976d2;
}

.history-item-dismissed {
  opacity: 0.6;
}

.item-icon {
  margin-right: 1rem;
  margin-top: 0.25rem;
  font-size: 1.1rem;
}

.item-content {
  flex: 1;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.item-type {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
}

.item-time {
  color: #6c757d;
  font-size: 0.8rem;
}

.item-message {
  margin: 0 0 0.5rem 0;
  color: #495057;
  line-height: 1.4;
}

.item-data {
  margin-top: 0.5rem;
}

.item-actions {
  display: flex;
  gap: 0.25rem;
  margin-left: 1rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .item-actions {
  opacity: 1;
}

.pagination-container {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
}

.notification-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row strong {
  color: #495057;
  font-size: 0.9rem;
}

.data-preview {
  background: #f8f9fa;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Responsive Design */
@media (max-width: 768px) {
  .history-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .history-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filter-controls,
  .action-controls {
    flex-wrap: wrap;
  }

  .filter-dropdown {
    min-width: 120px;
    flex: 1;
  }

  .history-item {
    flex-direction: column;
    gap: 1rem;
  }

  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .item-actions {
    margin-left: 0;
    opacity: 1;
    align-self: flex-end;
  }
}
</style>
