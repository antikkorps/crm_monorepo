<template>
  <div class="webhooks-view">
    <div class="page-header">
      <div class="header-content">
        <h1>Webhook Management</h1>
        <p>Configure and monitor webhook endpoints for real-time integrations</p>
      </div>
      <div class="header-actions">
        <v-btn
          @click="retryFailedWebhooks"
          :loading="retryingFailed"
          :disabled="!hasFailedWebhooks"
          color="secondary"
          variant="outlined"
        >
          <v-icon start>mdi-refresh</v-icon>
          Retry Failed
        </v-btn>
        <v-btn @click="showCreateDialog = true" color="primary">
          <v-icon start>mdi-plus</v-icon>
          Create Webhook
        </v-btn>
      </div>
    </div>

    <!-- Filters -->
    <v-card class="filters-card">
      <v-card-text>
        <div class="filters-grid">
          <div class="field">
            <label for="search">Search</label>
            <v-text-field
              id="search"
              v-model="filters.search"
              placeholder="Search webhooks..."
              @update:model-value="debouncedSearch"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </div>
          <div class="field">
            <label for="status">Status</label>
            <v-select
              id="status"
              v-model="filters.status"
              :items="statusOptions"
              item-title="label"
              item-value="value"
              placeholder="All Statuses"
              clearable
              @update:model-value="loadWebhooks"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </div>
          <div class="field">
            <label for="event">Event</label>
            <v-select
              id="event"
              v-model="filters.event"
              :items="eventOptions"
              item-title="label"
              item-value="value"
              placeholder="All Events"
              clearable
              @update:model-value="loadWebhooks"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Webhooks Table -->
    <v-card class="webhooks-table-card">
      <v-data-table
        :items="webhooks"
        :loading="loading"
        :items-per-page="filters.limit"
        :items-length="totalRecords"
        @update:options="onTableUpdate"
        :headers="tableHeaders"
        item-value="id"
        :no-data-text="loading ? 'Loading...' : 'No webhooks found'"
      >
        <template #item.name="{ item }">
          <div class="webhook-name">
            <strong>{{ item.name }}</strong>
            <div class="webhook-url">{{ item.url }}</div>
          </div>
        </template>

        <template #item.events="{ item }">
          <div class="webhook-events">
            <v-chip
              v-for="event in item.events.slice(0, 2)"
              :key="event"
              size="small"
              color="info"
              class="event-tag"
            >
              {{ formatEventName(event) }}
            </v-chip>
            <v-chip
              v-if="item.events.length > 2"
              size="small"
              color="secondary"
              class="event-tag"
            >
              +{{ item.events.length - 2 }} more
            </v-chip>
          </div>
        </template>

        <template #item.status="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small">
            {{ item.status }}
          </v-chip>
        </template>

        <template #item.stats="{ item }">
          <div class="webhook-stats" v-if="item.stats">
            <div class="stat-item">
              <span class="stat-label">Success Rate:</span>
              <span class="stat-value">{{ item.stats.successRate }}%</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total:</span>
              <span class="stat-value">{{ item.stats.totalDeliveries }}</span>
            </div>
          </div>
        </template>

        <template #item.lastTriggeredAt="{ item }">
          <span v-if="item.lastTriggeredAt">
            {{ formatDate(item.lastTriggeredAt) }}
          </span>
          <span v-else class="text-muted">Never</span>
        </template>

        <template #item.actions="{ item }">
          <div class="action-buttons">
            <v-btn
              icon="mdi-eye"
              size="small"
              variant="text"
              color="info"
              @click="viewWebhook(item)"
              title="View Details"
            />
            <v-btn
              icon="mdi-play"
              size="small"
              variant="text"
              color="success"
              @click="testWebhook(item)"
              :loading="testingWebhooks.has(item.id)"
              title="Test Webhook"
            />
            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              color="warning"
              @click="editWebhook(item)"
              title="Edit"
            />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="confirmDelete(item)"
              title="Delete"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Create/Edit Dialog -->
    <WebhookForm
      v-model:visible="showCreateDialog"
      :webhook="selectedWebhook"
      @saved="onWebhookSaved"
    />

    <!-- Details Dialog -->
    <WebhookDetails
      v-model:visible="showDetailsDialog"
      :webhook="selectedWebhook"
      @edit="editWebhook"
      @test="testWebhook"
      @delete="confirmDelete"
    />

    <!-- Delete Confirmation -->
    <v-dialog v-model="showConfirmDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h5">{{ confirmHeader }}</v-card-title>
        <v-card-text>{{ confirmMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showConfirmDialog = false"
            >Cancel</v-btn
          >
          <v-btn color="error" variant="flat" @click="executeConfirm">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import WebhookDetails from "@/components/webhooks/WebhookDetails.vue"
import WebhookForm from "@/components/webhooks/WebhookForm.vue"
import { webhooksApi, type Webhook, type WebhookFilters } from "@/services/api/webhooks"
import { useNotificationStore } from "@/stores/notification"
import { debounce } from "@/utils/debounce"
import { computed, onMounted, ref } from "vue"

// Composables
const notificationStore = useNotificationStore()
const showConfirmDialog = ref(false)
const confirmMessage = ref("")
const confirmHeader = ref("Confirm")
const confirmCallback = ref<(() => void) | null>(null)

// State
const loading = ref(false)
const retryingFailed = ref(false)
const webhooks = ref<Webhook[]>([])
const totalRecords = ref(0)
const selectedWebhook = ref<Webhook | null>(null)
const showCreateDialog = ref(false)
const showDetailsDialog = ref(false)
const testingWebhooks = ref(new Set<string>())
const eventOptions = ref<Array<{ label: string; value: string }>>([])

// Filters
const filters = ref<WebhookFilters>({
  page: 1,
  limit: 20,
  search: "",
  status: "",
  event: "",
})

// Options
const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Disabled", value: "disabled" },
]

const tableHeaders = [
  { title: "Name", key: "name" },
  { title: "Events", key: "events" },
  { title: "Status", key: "status" },
  { title: "Statistics", key: "stats" },
  { title: "Last Triggered", key: "lastTriggeredAt" },
  { title: "Actions", key: "actions", sortable: false },
]

// Computed
const hasFailedWebhooks = computed(() =>
  webhooks.value.some((w) => w.status === "disabled" || w.failureCount > 0)
)

// Methods
const loadWebhooks = async () => {
  loading.value = true
  try {
    const response = await webhooksApi.getAll(filters.value)
    webhooks.value = response.data.webhooks
    totalRecords.value = response.data.pagination.total
  } catch (error) {
    notificationStore.showError("Failed to load webhooks")
  } finally {
    loading.value = false
  }
}

const loadEvents = async () => {
  try {
    const response = await webhooksApi.getEvents()
    eventOptions.value = response.data.events.map((event) => ({
      label: event.label,
      value: event.value,
    }))
  } catch (error) {
    console.error("Failed to load webhook events:", error)
  }
}

const debouncedSearch = debounce(() => {
  filters.value.page = 1
  loadWebhooks()
}, 300)

const onTableUpdate = (options: any) => {
  if (options.page !== undefined) {
    filters.value.page = options.page + 1
  }
  if (options.itemsPerPage !== undefined) {
    filters.value.limit = options.itemsPerPage
  }
  loadWebhooks()
}

const viewWebhook = (webhook: Webhook) => {
  selectedWebhook.value = webhook
  showDetailsDialog.value = true
}

const editWebhook = (webhook: Webhook) => {
  selectedWebhook.value = webhook
  showCreateDialog.value = true
}

const testWebhook = async (webhook: Webhook) => {
  testingWebhooks.value.add(webhook.id)
  try {
    const response = await webhooksApi.test(webhook.id)
    const result = response.data.result

    if (result.success) {
      notificationStore.showSuccess(`Webhook responded with status ${result.httpStatus}`)
    } else {
      notificationStore.showError(result.errorMessage || "Webhook test failed")
    }
  } catch (error) {
    notificationStore.showError("Failed to test webhook")
  } finally {
    testingWebhooks.value.delete(webhook.id)
  }
}

const confirmDelete = (webhook: Webhook) => {
  confirmMessage.value = `Are you sure you want to delete the webhook "${webhook.name}"?`
  confirmHeader.value = "Confirm Deletion"
  confirmCallback.value = () => deleteWebhook(webhook)
  showConfirmDialog.value = true
}

const executeConfirm = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  showConfirmDialog.value = false
}

const deleteWebhook = async (webhook: Webhook) => {
  try {
    await webhooksApi.delete(webhook.id)
    notificationStore.showSuccess("Webhook deleted successfully")
    loadWebhooks()
  } catch (error) {
    notificationStore.showError("Failed to delete webhook")
  }
}

const retryFailedWebhooks = async () => {
  retryingFailed.value = true
  try {
    await webhooksApi.retryFailed()
    notificationStore.showSuccess("Failed webhooks are being retried")
    // Reload webhooks after a short delay to see updated stats
    setTimeout(loadWebhooks, 2000)
  } catch (error) {
    notificationStore.showError("Failed to retry webhooks")
  } finally {
    retryingFailed.value = false
  }
}

const onWebhookSaved = () => {
  showCreateDialog.value = false
  selectedWebhook.value = null
  loadWebhooks()
}

// Utility functions
const formatEventName = (event: string) => {
  return event.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "success"
    case "inactive":
      return "warning"
    case "disabled":
      return "danger"
    default:
      return "info"
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

// Lifecycle
onMounted(() => {
  loadWebhooks()
  loadEvents()
})
</script>

<style scoped>
.webhooks-view {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.header-content p {
  margin: 0;
  color: var(--text-color-secondary);
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.filters-card {
  margin-bottom: 1.5rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-weight: 600;
  color: var(--text-color);
}

.webhooks-table-card {
  margin-bottom: 1.5rem;
}

.webhook-name {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.webhook-url {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  font-family: monospace;
}

.webhook-events {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.event-tag {
  font-size: 0.75rem;
}

.webhook-stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.stat-label {
  color: var(--text-color-secondary);
}

.stat-value {
  font-weight: 600;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.text-muted {
  color: var(--text-color-secondary);
  font-style: italic;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
