<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="isEditing ? 'Edit Webhook' : 'Create Webhook'"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="webhook-form-dialog"
    :style="{ width: '90vw', maxWidth: '800px' }"
  >
    <form @submit.prevent="handleSubmit" class="webhook-form">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Basic Information</h3>
        <div class="form-grid">
          <div class="field">
            <label for="name">Name *</label>
            <InputText
              id="name"
              v-model="form.name"
              placeholder="Enter webhook name"
              :class="{ 'p-invalid': errors.name }"
            />
            <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
          </div>

          <div class="field">
            <label for="url">URL *</label>
            <InputText
              id="url"
              v-model="form.url"
              placeholder="https://example.com/webhook"
              :class="{ 'p-invalid': errors.url }"
            />
            <small v-if="errors.url" class="p-error">{{ errors.url }}</small>
          </div>
        </div>
      </div>

      <!-- Events -->
      <div class="form-section">
        <h3>Events</h3>
        <div class="field">
          <label>Select Events *</label>
          <div class="events-selection">
            <div
              v-for="(events, category) in groupedEvents"
              :key="category"
              class="event-category"
            >
              <h4>{{ formatCategoryName(category) }}</h4>
              <div class="event-checkboxes">
                <div v-for="event in events" :key="event.value" class="event-checkbox">
                  <Checkbox
                    :id="event.value"
                    v-model="form.events"
                    :value="event.value"
                  />
                  <label :for="event.value">{{ event.label }}</label>
                </div>
              </div>
            </div>
          </div>
          <small v-if="errors.events" class="p-error">{{ errors.events }}</small>
        </div>
      </div>

      <!-- Configuration -->
      <div class="form-section">
        <h3>Configuration</h3>
        <div class="form-grid">
          <div class="field">
            <label for="timeout">Timeout (ms)</label>
            <InputNumber
              id="timeout"
              v-model="form.timeout"
              :min="1000"
              :max="300000"
              :step="1000"
              placeholder="30000"
            />
            <small class="field-help"
              >Request timeout in milliseconds (1-300 seconds)</small
            >
          </div>

          <div class="field">
            <label for="maxRetries">Max Retries</label>
            <InputNumber
              id="maxRetries"
              v-model="form.maxRetries"
              :min="0"
              :max="10"
              placeholder="3"
            />
            <small class="field-help">Maximum number of retry attempts</small>
          </div>

          <div class="field">
            <label for="retryDelay">Retry Delay (ms)</label>
            <InputNumber
              id="retryDelay"
              v-model="form.retryDelay"
              :min="1000"
              :max="300000"
              :step="1000"
              placeholder="5000"
            />
            <small class="field-help">Delay between retry attempts</small>
          </div>
        </div>
      </div>

      <!-- Security -->
      <div class="form-section">
        <h3>Security</h3>
        <div class="field">
          <label for="secret">Secret Key</label>
          <div class="secret-input">
            <InputText
              id="secret"
              v-model="form.secret"
              :type="showSecret ? 'text' : 'password'"
              placeholder="Optional webhook secret for signature verification"
            />
            <Button
              type="button"
              :icon="showSecret ? 'pi pi-eye-slash' : 'pi pi-eye'"
              severity="secondary"
              text
              @click="showSecret = !showSecret"
            />
            <Button
              type="button"
              icon="pi pi-refresh"
              severity="secondary"
              text
              @click="generateSecret"
              v-tooltip="'Generate Random Secret'"
            />
          </div>
          <small class="field-help">
            Used to generate HMAC-SHA256 signatures for request verification
          </small>
        </div>
      </div>

      <!-- Custom Headers -->
      <div class="form-section">
        <h3>Custom Headers</h3>
        <div class="headers-section">
          <div v-for="(header, index) in form.headers" :key="index" class="header-row">
            <InputText
              v-model="header.key"
              placeholder="Header Name"
              class="header-key"
            />
            <InputText
              v-model="header.value"
              placeholder="Header Value"
              class="header-value"
            />
            <Button
              type="button"
              icon="pi pi-trash"
              severity="danger"
              text
              @click="removeHeader(index)"
            />
          </div>
          <Button
            type="button"
            label="Add Header"
            icon="pi pi-plus"
            severity="secondary"
            outlined
            @click="addHeader"
          />
        </div>
      </div>

      <!-- Status -->
      <div class="form-section" v-if="isEditing">
        <h3>Status</h3>
        <div class="form-grid">
          <div class="field">
            <label for="status">Status</label>
            <Dropdown
              id="status"
              v-model="form.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
            />
          </div>

          <div class="field">
            <div class="checkbox-field">
              <Checkbox id="isActive" v-model="form.isActive" :binary="true" />
              <label for="isActive">Active</label>
            </div>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="dialogVisible = false"
        />
        <Button
          :label="isEditing ? 'Update' : 'Create'"
          @click="handleSubmit"
          :loading="saving"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import {
  webhooksApi,
  type CreateWebhookData,
  type UpdateWebhookData,
  type Webhook,
} from "@/services/api/webhooks"
import { computed, ref, watch } from "vue"
import { useNotificationStore } from "@/stores/notification"

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
  saved: []
}>()

// Composables
const notificationStore = useNotificationStore()

// State
const saving = ref(false)
const showSecret = ref(false)
const groupedEvents = ref<Record<string, Array<{ value: string; label: string }>>>({})

// Form data
const form = ref({
  name: "",
  url: "",
  events: [] as string[],
  secret: "",
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 5000,
  status: "active",
  isActive: true,
  headers: [] as Array<{ key: string; value: string }>,
})

// Validation errors
const errors = ref<Record<string, string>>({})

// Options
const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Disabled", value: "disabled" },
]

// Computed
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
})

const isEditing = computed(() => !!props.webhook)

// Methods
const loadEvents = async () => {
  try {
    const response = await webhooksApi.getEvents()
    groupedEvents.value = response.data.groupedEvents
  } catch (error) {
    console.error("Failed to load webhook events:", error)
  }
}

const resetForm = () => {
  form.value = {
    name: "",
    url: "",
    events: [],
    secret: "",
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 5000,
    status: "active",
    isActive: true,
    headers: [],
  }
  errors.value = {}
}

const populateForm = (webhook: Webhook) => {
  form.value = {
    name: webhook.name,
    url: webhook.url,
    events: [...webhook.events],
    secret: webhook.secret || "",
    timeout: webhook.timeout,
    maxRetries: webhook.maxRetries,
    retryDelay: webhook.retryDelay,
    status: webhook.status,
    isActive: webhook.isActive,
    headers: webhook.headers
      ? Object.entries(webhook.headers).map(([key, value]) => ({ key, value }))
      : [],
  }
}

const validateForm = () => {
  errors.value = {}

  if (!form.value.name.trim()) {
    errors.value.name = "Name is required"
  }

  if (!form.value.url.trim()) {
    errors.value.url = "URL is required"
  } else if (!isValidUrl(form.value.url)) {
    errors.value.url = "Please enter a valid HTTP or HTTPS URL"
  }

  if (form.value.events.length === 0) {
    errors.value.events = "At least one event must be selected"
  }

  return Object.keys(errors.value).length === 0
}

const isValidUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
  } catch {
    return false
  }
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  saving.value = true
  try {
    const headers = form.value.headers.reduce((acc, header) => {
      if (header.key.trim() && header.value.trim()) {
        acc[header.key.trim()] = header.value.trim()
      }
      return acc
    }, {} as Record<string, string>)

    if (isEditing.value && props.webhook) {
      const updateData: UpdateWebhookData = {
        name: form.value.name,
        url: form.value.url,
        events: form.value.events,
        secret: form.value.secret || undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        timeout: form.value.timeout,
        maxRetries: form.value.maxRetries,
        retryDelay: form.value.retryDelay,
        status: form.value.status,
        isActive: form.value.isActive,
      }

      await webhooksApi.update(props.webhook.id, updateData)
      notificationStore.showSuccess("Webhook updated successfully")
    } else {
      const createData: CreateWebhookData = {
        name: form.value.name,
        url: form.value.url,
        events: form.value.events,
        secret: form.value.secret || undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        timeout: form.value.timeout,
        maxRetries: form.value.maxRetries,
        retryDelay: form.value.retryDelay,
      }

      await webhooksApi.create(createData)
      notificationStore.showSuccess("Webhook created successfully")
    }

    emit("saved")
  } catch (error: any) {
    notificationStore.showError(error.message || "Failed to save webhook")
  } finally {
    saving.value = false
  }
}

const generateSecret = () => {
  // Generate a random 32-character hex string
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  form.value.secret = Array.from(array, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

const addHeader = () => {
  form.value.headers.push({ key: "", value: "" })
}

const removeHeader = (index: number) => {
  form.value.headers.splice(index, 1)
}

const formatCategoryName = (category: string) => {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

// Watchers
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      loadEvents()
      if (props.webhook) {
        populateForm(props.webhook)
      } else {
        resetForm()
      }
    }
  }
)
</script>

<style scoped>
.webhook-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section h3 {
  margin: 0;
  color: var(--text-color);
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.form-grid {
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

.field-help {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.events-selection {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
}

.event-category h4 {
  margin: 0 0 0.5rem 0;
  color: var(--primary-color);
  font-size: 1rem;
}

.event-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.event-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.event-checkbox label {
  font-weight: normal;
  cursor: pointer;
}

.secret-input {
  display: flex;
  gap: 0.5rem;
}

.secret-input .p-inputtext {
  flex: 1;
}

.headers-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.header-key,
.header-value {
  flex: 1;
}

.checkbox-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.checkbox-field label {
  font-weight: normal;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .event-checkboxes {
    grid-template-columns: 1fr;
  }

  .header-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
