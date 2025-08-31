<template>
  <div class="webhooks-view">
    <div class="page-header">
      <div class="header-content">
        <h1>Webhook Management</h1>
        <p>Configure and monitor webhook endpoints for real-time integrations</p>
      </div>
      <div class="header-actions">
        <Button
          label="Retry Failed"
          icon="pi pi-refresh"
          severity="secondary"
          @click="retryFailedWebhooks"
          :loading="retryingFailed"
          :disabled="!hasFailedWebhooks"
        />
        <Button
          label="Create Webhook"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <!-- Filters -->
    <Card class="filters-card">
      <template #content>
        <div class="filters-grid">
          <div class="field">
            <label for="search">Search</label>
            <InputText
              id="search"
              v-model="filters.search"
              placeholder="Search webhooks..."
              @input="debouncedSearch"
            />
          </div>
          <div class="field">
            <label for="status">Status</label>
            <Dropdown
              id="status"
              v-model="filters.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="All Statuses"
              show-clear
              @change="loadWebhooks"
            />
          </div>
          <div class="field">
            <label for="event">Event</label>
            <Dropdown
              id="event"
              v-model="filters.event"
              :options="eventOptions"
              option-label="label"
              option-value="value"
              placeholder="All Events"
              show-clear
              @change="loadWebhooks"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Webhooks Table -->
    <Card class="webhooks-table-card">
      <template #content>
        <DataTable
          :value="webhooks"
          :loading="loading"
          paginator
          :rows="filters.limit"
          :total-records="totalRecords"
          :lazy="true"
          @page="onPageChange"
          data-key="id"
          responsive-layout="scroll"
          :empty-message="loading ? 'Loading...' : 'No webhooks found'"
        >
          <Column field="name" header="Name" sortable>
            <template #body="{ data }">
              <div class="webhook-name">
                <strong>{{ data.name }}</strong>
                <div class="webhook-url">{{ data.url }}</div>
              </div>
            </template>
          </Column>

          <Column field="events" header="Events">
            <template #body="{ data }">
              <div class="webhook-events">
                <Tag
                  v-for="event in data.events.slice(0, 2)"
                  :key="event"
                  :value="formatEventName(event)"
                  severity="info"
                  class="event-tag"
                />
                <Tag
                  v-if="data.events.length > 2"
                  :value="`+${data.events.length - 2} more`"
                  severity="secondary"
                  class="event-tag"
                />
              </div>
            </template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
            </template>
          </Column>

          <Column field="stats" header="Statistics">
            <template #body="{ data }">
              <div class="webhook-stats" v-if="data.stats">
                <div class="stat-item">
                  <span class="stat-label">Success Rate:</span>
                  <span class="stat-value">{{ data.stats.successRate }}%</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Total:</span>
                  <span class="stat-value">{{ data.stats.totalDeliveries }}</span>
                </div>
              </div>
            </template>
          </Column>

          <Column field="lastTriggeredAt" header="Last Triggered" sortable>
            <template #body="{ data }">
              <span v-if="data.lastTriggeredAt">
                {{ formatDate(data.lastTriggeredAt) }}
              </span>
              <span v-else class="text-muted">Never</span>
            </template>
          </Column>

          <Column header="Actions" :exportable="false">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  icon="pi pi-eye"
                  severity="info"
                  text
                  @click="viewWebhook(data)"
                  v-tooltip="'View Details'"
                />
                <Button
                  icon="pi pi-play"
                  severity="success"
                  text
                  @click="testWebhook(data)"
                  :loading="testingWebhooks.has(data.id)"
                  v-tooltip="'Test Webhook'"
                />
                <Button
                  icon="pi pi-pencil"
                  severity="warning"
                  text
                  @click="editWebhook(data)"
                  v-tooltip="'Edit'"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  @click="confirmDelete(data)"
                  v-tooltip="'Delete'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

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
    <ConfirmDialog />

    <!-- Toast Messages -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import WebhookDetails from "@/components/webhooks/WebhookDetails.vue"
import WebhookForm from "@/components/webhooks/WebhookForm.vue"
import { webhooksApi, type Webhook, type WebhookFilters } from "@/services/api/webhooks"
import { debounce } from "lodash-es"
import { useConfirm } from "primevue/useconfirm"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref } from "vue"

// Composables
const toast = useToast()
const confirm = useConfirm()

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
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load webhooks",
      life: 3000,
    })
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

const onPageChange = (event: any) => {
  filters.value.page = event.page + 1
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
      toast.add({
        severity: "success",
        summary: "Test Successful",
        detail: `Webhook responded with status ${result.httpStatus}`,
        life: 3000,
      })
    } else {
      toast.add({
        severity: "error",
        summary: "Test Failed",
        detail: result.errorMessage || "Webhook test failed",
        life: 5000,
      })
    }
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Test Error",
      detail: "Failed to test webhook",
      life: 3000,
    })
  } finally {
    testingWebhooks.value.delete(webhook.id)
  }
}

const confirmDelete = (webhook: Webhook) => {
  confirm.require({
    message: `Are you sure you want to delete the webhook "${webhook.name}"?`,
    header: "Confirm Deletion",
    icon: "pi pi-exclamation-triangle",
    rejectClass: "p-button-secondary p-button-outlined",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    accept: () => deleteWebhook(webhook),
  })
}

const deleteWebhook = async (webhook: Webhook) => {
  try {
    await webhooksApi.delete(webhook.id)
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Webhook deleted successfully",
      life: 3000,
    })
    loadWebhooks()
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete webhook",
      life: 3000,
    })
  }
}

const retryFailedWebhooks = async () => {
  retryingFailed.value = true
  try {
    await webhooksApi.retryFailed()
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Failed webhooks are being retried",
      life: 3000,
    })
    // Reload webhooks after a short delay to see updated stats
    setTimeout(loadWebhooks, 2000)
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to retry webhooks",
      life: 3000,
    })
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

const getStatusSeverity = (status: string) => {
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
