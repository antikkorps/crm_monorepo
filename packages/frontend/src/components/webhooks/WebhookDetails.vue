<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="`Webhook: ${webhook?.name || 'Details'}`"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="webhook-details-dialog"
    :style="{ width: '90vw', maxWidth: '1000px' }"
  >
    <div v-if="webhook" class="webhook-details">
      <!-- Header Actions -->
      <div class="details-header">
        <div class="status-info">
          <Tag
            :value="webhook.status"
            :severity="getStatusSeverity(webhook.status)"
            class="status-tag"
          />
          <span v-if="webhook.failureCount > 0" class="failure-count">
            {{ webhook.failureCount }} failures
          </span>
        </div>
        <div class="header-actions">
          <Button
            label="Test"
            icon="pi pi-play"
            severity="success"
            @click="$emit('test', webhook)"
            :loading="testing"
          />
          <Button
            label="Edit"
            icon="pi pi-pencil"
            severity="warning"
            @click="$emit('edit', webhook)"
          />
          <Button
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            @click="$emit('delete', webhook)"
          />
        </div>
      </div>

      <!-- Basic Information -->
      <Card class="info-card">
        <template #title>Basic Information</template>
        <template #content>
          <div class="info-grid">
            <div class="info-item">
              <label>Name</label>
              <span>{{ webhook.name }}</span>
            </div>
            <div class="info-item">
              <label>URL</label>
              <span class="url-text">{{ webhook.url }}</span>
            </div>
            <div class="info-item">
              <label>Created By</label>
              <span v-if="webhook.creator">
                {{ webhook.creator.firstName }} {{ webhook.creator.lastName }} ({{
                  webhook.creator.email
                }})
              </span>
            </div>
            <div class="info-item">
              <label>Created At</label>
              <span>{{ formatDate(webhook.createdAt) }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Events -->
      <Card class="info-card">
        <template #title>Subscribed Events</template>
        <template #content>
          <div class="events-list">
            <Tag
              v-for="event in webhook.events"
              :key="event"
              :value="formatEventName(event)"
              severity="info"
              class="event-tag"
            />
          </div>
        </template>
      </Card>

      <!-- Configuration -->
      <Card class="info-card">
        <template #title>Configuration</template>
        <template #content>
          <div class="info-grid">
            <div class="info-item">
              <label>Timeout</label>
              <span>{{ webhook.timeout }}ms</span>
            </div>
            <div class="info-item">
              <label>Max Retries</label>
              <span>{{ webhook.maxRetries }}</span>
            </div>
            <div class="info-item">
              <label>Retry Delay</label>
              <span>{{ webhook.retryDelay }}ms</span>
            </div>
            <div class="info-item">
              <label>Secret Configured</label>
              <span>{{ webhook.secret ? "Yes" : "No" }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Custom Headers -->
      <Card
        v-if="webhook.headers && Object.keys(webhook.headers).length > 0"
        class="info-card"
      >
        <template #title>Custom Headers</template>
        <template #content>
          <div class="headers-list">
            <div v-for="(value, key) in webhook.headers" :key="key" class="header-item">
              <code class="header-key">{{ key }}</code>
              <span class="header-separator">:</span>
              <code class="header-value">{{ value }}</code>
            </div>
          </div>
        </template>
      </Card>

      <!-- Statistics -->
      <Card v-if="webhook.stats" class="info-card">
        <template #title>Statistics</template>
        <template #content>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{ webhook.stats.totalDeliveries }}</div>
              <div class="stat-label">Total Deliveries</div>
            </div>
            <div class="stat-card">
              <div class="stat-value success">
                {{ webhook.stats.successfulDeliveries }}
              </div>
              <div class="stat-label">Successful</div>
            </div>
            <div class="stat-card">
              <div class="stat-value error">{{ webhook.stats.failedDeliveries }}</div>
              <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ webhook.stats.successRate }}%</div>
              <div class="stat-label">Success Rate</div>
            </div>
          </div>

          <div class="timestamps-grid">
            <div class="timestamp-item">
              <label>Last Triggered</label>
              <span>{{
                webhook.stats.lastDelivery
                  ? formatDate(webhook.stats.lastDelivery)
                  : "Never"
              }}</span>
            </div>
            <div class="timestamp-item">
              <label>Last Success</label>
              <span>{{
                webhook.stats.lastSuccess
                  ? formatDate(webhook.stats.lastSuccess)
                  : "Never"
              }}</span>
            </div>
            <div class="timestamp-item">
              <label>Last Failure</label>
              <span>{{
                webhook.stats.lastFailure
                  ? formatDate(webhook.stats.lastFailure)
                  : "Never"
              }}</span>
            </div>
          </div>
        </template>
      </Card>

      <!-- Recent Logs -->
      <Card class="info-card">
        <template #title>
          <div class="card-title-with-action">
            <span>Recent Delivery Logs</span>
            <Button
              label="View All Logs"
              icon="pi pi-external-link"
              severity="secondary"
              text
              @click="viewAllLogs"
            />
          </div>
        </template>
        <template #content>
          <DataTable
            :value="logs"
            :loading="loadingLogs"
            responsive-layout="scroll"
            :empty-message="loadingLogs ? 'Loading...' : 'No delivery logs found'"
          >
            <Column field="event" header="Event">
              <template #body="{ data }">
                <Tag
                  :value="formatEventName(data.event)"
                  severity="info"
                  class="event-tag-small"
                />
              </template>
            </Column>

            <Column field="status" header="Status">
              <template #body="{ data }">
                <Tag :value="data.status" :severity="getLogStatusSeverity(data.status)" />
              </template>
            </Column>

            <Column field="httpStatus" header="HTTP Status">
              <template #body="{ data }">
                <span v-if="data.httpStatus">{{ data.httpStatus }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </Column>

            <Column field="attemptCount" header="Attempts">
              <template #body="{ data }">
                {{ data.attemptCount }}/{{ data.maxAttempts }}
              </template>
            </Column>

            <Column field="duration" header="Duration">
              <template #body="{ data }">
                <span v-if="data.duration">{{ data.duration }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </Column>

            <Column field="createdAt" header="Time">
              <template #body="{ data }">
                {{ formatDate(data.createdAt) }}
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>

    <!-- Webhook Logs Dialog -->
    <WebhookLogs v-model:visible="showLogsDialog" :webhook="webhook" />
  </Dialog>
</template>

<script setup lang="ts">
import { webhooksApi, type Webhook, type WebhookLog } from "@/services/api/webhooks"
import { computed, ref, watch } from "vue"
import WebhookLogs from "./WebhookLogs.vue"

// Props
interface Props {
  visible: boolean
  webhook?: Webhook | null
}

const props = withDefaults(defineProps<Props>(), {
  webhook: null,
})

// Emits
const emit = defineEmits<{
  "update:visible": [value: boolean]
  edit: [webhook: Webhook]
  test: [webhook: Webhook]
  delete: [webhook: Webhook]
}>()

// State
const testing = ref(false)
const loadingLogs = ref(false)
const logs = ref<WebhookLog[]>([])
const showLogsDialog = ref(false)

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
})

// Methods
const loadRecentLogs = async () => {
  if (!props.webhook) return

  loadingLogs.value = true
  try {
    const response = await webhooksApi.getLogs(props.webhook.id, {
      page: 1,
      limit: 10,
    })
    logs.value = response.data.logs
  } catch (error) {
    console.error("Failed to load webhook logs:", error)
  } finally {
    loadingLogs.value = false
  }
}

const viewAllLogs = () => {
  showLogsDialog.value = true
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

const getLogStatusSeverity = (status: string) => {
  switch (status) {
    case "success":
      return "success"
    case "failed":
      return "danger"
    case "retrying":
      return "warning"
    case "pending":
      return "info"
    default:
      return "info"
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

// Watchers
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.webhook) {
      loadRecentLogs()
    }
  }
)
</script>

<style scoped>
.webhook-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.failure-count {
  color: var(--red-500);
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.info-card {
  margin-bottom: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.info-item span {
  color: var(--text-color);
}

.url-text {
  font-family: monospace;
  word-break: break-all;
}

.events-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.event-tag {
  font-size: 0.875rem;
}

.event-tag-small {
  font-size: 0.75rem;
}

.headers-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.header-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;
}

.header-key {
  color: var(--blue-500);
  font-weight: 600;
}

.header-separator {
  color: var(--text-color-secondary);
}

.header-value {
  color: var(--green-500);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  text-align: center;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  background: var(--surface-50);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-color);
}

.stat-value.success {
  color: var(--green-500);
}

.stat-value.error {
  color: var(--red-500);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-top: 0.5rem;
}

.timestamps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.timestamp-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.timestamp-item label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.card-title-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.text-muted {
  color: var(--text-color-secondary);
  font-style: italic;
}

@media (max-width: 768px) {
  .details-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .info-grid,
  .stats-grid,
  .timestamps-grid {
    grid-template-columns: 1fr;
  }

  .card-title-with-action {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
</style>
