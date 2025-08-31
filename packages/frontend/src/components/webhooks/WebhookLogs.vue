<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="`Delivery Logs: ${webhook?.name || 'Webhook'}`"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="webhook-logs-dialog"
    :style="{ width: '95vw', maxWidth: '1200px' }"
  >
    <div class="webhook-logs">
      <!-- Filters -->
      <Card class="filters-card">
        <template #content>
          <div class="filters-grid">
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
                @change="loadLogs"
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
                @change="loadLogs"
              />
            </div>
            <div class="field">
              <label for="from">From Date</label>
              <Calendar
                id="from"
                v-model="filters.from"
                show-time
                hour-format="24"
                @date-select="loadLogs"
              />
            </div>
            <div class="field">
              <label for="to">To Date</label>
              <Calendar
                id="to"
                v-model="filters.to"
                show-time
                hour-format="24"
                @date-select="loadLogs"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Logs Table -->
      <Card class="logs-table-card">
        <template #content>
          <DataTable
            :value="logs"
            :loading="loading"
            paginator
            :rows="filters.limit"
            :total-records="totalRecords"
            :lazy="true"
            @page="onPageChange"
            data-key="id"
            responsive-layout="scroll"
            :empty-message="loading ? 'Loading...' : 'No delivery logs found'"
            :expandedRows="expandedRows"
            v-model:expandedRows="expandedRows"
          >
            <Column expander style="width: 3rem" />

            <Column field="event" header="Event" sortable>
              <template #body="{ data }">
                <Tag
                  :value="formatEventName(data.event)"
                  severity="info"
                  class="event-tag"
                />
              </template>
            </Column>

            <Column field="status" header="Status" sortable>
              <template #body="{ data }">
                <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
              </template>
            </Column>

            <Column field="httpStatus" header="HTTP Status" sortable>
              <template #body="{ data }">
                <span v-if="data.httpStatus" :class="getHttpStatusClass(data.httpStatus)">
                  {{ data.httpStatus }}
                </span>
                <span v-else class="text-muted">-</span>
              </template>
            </Column>

            <Column field="attemptCount" header="Attempts">
              <template #body="{ data }">
                <div class="attempts-info">
                  <span>{{ data.attemptCount }}/{{ data.maxAttempts }}</span>
                  <ProgressBar
                    :value="(data.attemptCount / data.maxAttempts) * 100"
                    :show-value="false"
                    class="attempt-progress"
                  />
                </div>
              </template>
            </Column>

            <Column field="duration" header="Duration" sortable>
              <template #body="{ data }">
                <span v-if="data.duration">{{ data.duration }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </Column>

            <Column field="nextRetryAt" header="Next Retry">
              <template #body="{ data }">
                <span v-if="data.nextRetryAt && data.status === 'retrying'">
                  {{ formatDate(data.nextRetryAt) }}
                </span>
                <span v-else class="text-muted">-</span>
              </template>
            </Column>

            <Column field="createdAt" header="Created" sortable>
              <template #body="{ data }">
                {{ formatDate(data.createdAt) }}
              </template>
            </Column>

            <template #expansion="{ data }">
              <div class="log-expansion">
                <div class="expansion-section">
                  <h4>Payload</h4>
                  <pre class="json-display">{{
                    JSON.stringify(data.payload, null, 2)
                  }}</pre>
                </div>

                <div v-if="data.responseBody" class="expansion-section">
                  <h4>Response Body</h4>
                  <pre class="response-display">{{ data.responseBody }}</pre>
                </div>

                <div v-if="data.errorMessage" class="expansion-section">
                  <h4>Error Message</h4>
                  <div class="error-message">{{ data.errorMessage }}</div>
                </div>

                <div class="expansion-section">
                  <h4>Delivery Details</h4>
                  <div class="details-grid">
                    <div class="detail-item">
                      <label>Delivered At</label>
                      <span>{{
                        data.deliveredAt ? formatDate(data.deliveredAt) : "Not delivered"
                      }}</span>
                    </div>
                    <div class="detail-item">
                      <label>Updated At</label>
                      <span>{{ formatDate(data.updatedAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </DataTable>
        </template>
      </Card>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import {
  webhooksApi,
  type Webhook,
  type WebhookLog,
  type WebhookLogFilters,
} from "@/services/api/webhooks"
import { computed, ref, watch } from "vue"

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
}>()

// State
const loading = ref(false)
const logs = ref<WebhookLog[]>([])
const totalRecords = ref(0)
const expandedRows = ref<WebhookLog[]>([])
const eventOptions = ref<Array<{ label: string; value: string }>>([])

// Filters
const filters = ref<WebhookLogFilters>({
  page: 1,
  limit: 20,
  status: "",
  event: "",
  from: undefined,
  to: undefined,
})

// Options
const statusOptions = [
  { label: "Success", value: "success" },
  { label: "Failed", value: "failed" },
  { label: "Retrying", value: "retrying" },
  { label: "Pending", value: "pending" },
]

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
})

// Methods
const loadLogs = async () => {
  if (!props.webhook) return

  loading.value = true
  try {
    const filterParams = {
      ...filters.value,
      from: filters.value.from ? filters.value.from.toISOString() : undefined,
      to: filters.value.to ? filters.value.to.toISOString() : undefined,
    }

    const response = await webhooksApi.getLogs(props.webhook.id, filterParams)
    logs.value = response.data.logs
    totalRecords.value = response.data.pagination.total
  } catch (error) {
    console.error("Failed to load webhook logs:", error)
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

const onPageChange = (event: any) => {
  filters.value.page = event.page + 1
  loadLogs()
}

// Utility functions
const formatEventName = (event: string) => {
  return event.replace(/\./g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const getStatusSeverity = (status: string) => {
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

const getHttpStatusClass = (status: number) => {
  if (status >= 200 && status < 300) {
    return "http-success"
  } else if (status >= 400 && status < 500) {
    return "http-client-error"
  } else if (status >= 500) {
    return "http-server-error"
  }
  return ""
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

// Watchers
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.webhook) {
      loadLogs()
      loadEvents()
    }
  }
)
</script>

<style scoped>
.webhook-logs {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.filters-card {
  margin-bottom: 0;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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

.logs-table-card {
  margin-bottom: 0;
}

.event-tag {
  font-size: 0.75rem;
}

.attempts-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.attempt-progress {
  height: 4px;
}

.text-muted {
  color: var(--text-color-secondary);
  font-style: italic;
}

.http-success {
  color: var(--green-500);
  font-weight: 600;
}

.http-client-error {
  color: var(--orange-500);
  font-weight: 600;
}

.http-server-error {
  color: var(--red-500);
  font-weight: 600;
}

.log-expansion {
  padding: 1rem;
  background: var(--surface-50);
  border-radius: var(--border-radius);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.expansion-section h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.json-display,
.response-display {
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  font-family: monospace;
  font-size: 0.875rem;
  overflow-x: auto;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-message {
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: var(--border-radius);
  padding: 1rem;
  color: var(--red-700);
  font-family: monospace;
  font-size: 0.875rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-item label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.detail-item span {
  color: var(--text-color);
}

@media (max-width: 768px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
