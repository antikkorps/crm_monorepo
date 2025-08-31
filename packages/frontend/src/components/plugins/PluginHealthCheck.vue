<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="pluginName ? `Health Check - ${pluginName}` : 'Plugin Health Check'"
    modal
    :style="{ width: '600px' }"
  >
    <div class="flex flex-column gap-4">
      <!-- Health Status -->
      <div
        v-if="healthData"
        class="flex align-items-center gap-3 p-3 border-round"
        :class="getHealthStatusClass(healthData.status)"
      >
        <i :class="getHealthStatusIcon(healthData.status)" class="text-2xl"></i>
        <div class="flex-1">
          <div class="font-medium text-lg">
            {{ getHealthStatusText(healthData.status) }}
          </div>
          <div class="text-sm opacity-80">
            {{ healthData.message || "No additional information" }}
          </div>
        </div>
      </div>

      <!-- Health Details -->
      <div v-if="healthData && healthData.details">
        <h4 class="text-lg font-medium text-900 mb-3">Health Details</h4>

        <div class="surface-100 p-3 border-round">
          <div v-if="typeof healthData.details === 'object'">
            <div
              v-for="(value, key) in healthData.details"
              :key="key"
              class="flex justify-content-between align-items-center py-2"
              :class="{
                'border-bottom-1 surface-border': !isLastItem(key, healthData.details),
              }"
            >
              <span class="font-medium text-900">{{ formatKey(key) }}</span>
              <span class="text-600">{{ formatValue(value) }}</span>
            </div>
          </div>
          <div v-else class="text-600">
            {{ healthData.details }}
          </div>
        </div>
      </div>

      <!-- Timestamp -->
      <div v-if="healthData && healthData.lastCheck">
        <div class="text-600 text-sm">
          <i class="pi pi-clock mr-2"></i>
          Last checked: {{ formatTimestamp(healthData.lastCheck) }}
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <ProgressSpinner style="width: 50px; height: 50px" />
        <div class="text-600 mt-3">Performing health check...</div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="surface-red-50 p-3 border-round border-1 border-red-200">
        <div class="flex align-items-center gap-2 mb-2">
          <i class="pi pi-exclamation-triangle text-red-500"></i>
          <span class="font-medium text-red-900">Health Check Failed</span>
        </div>
        <div class="text-red-800 text-sm">{{ error }}</div>
      </div>

      <!-- No Data State -->
      <div v-if="!healthData && !loading && !error" class="text-center py-4">
        <i class="pi pi-heart text-4xl text-400 mb-3"></i>
        <div class="text-900 font-medium mb-2">No Health Data</div>
        <div class="text-600">Click "Run Health Check" to check plugin status</div>
      </div>

      <!-- Health Check History (if available) -->
      <div v-if="healthHistory && healthHistory.length > 0">
        <h4 class="text-lg font-medium text-900 mb-3">Recent Health Checks</h4>

        <div class="border-1 surface-border border-round">
          <div
            v-for="(check, index) in healthHistory"
            :key="index"
            class="flex justify-content-between align-items-center p-3"
            :class="{
              'border-bottom-1 surface-border': index < healthHistory.length - 1,
            }"
          >
            <div class="flex align-items-center gap-2">
              <i
                :class="getHealthStatusIcon(check.status)"
                :class="getHealthStatusColor(check.status)"
              ></i>
              <span class="font-medium">{{ getHealthStatusText(check.status) }}</span>
            </div>
            <div class="text-600 text-sm">{{ formatTimestamp(check.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- Health Recommendations -->
      <div v-if="healthRecommendations && healthRecommendations.length > 0">
        <h4 class="text-lg font-medium text-900 mb-3">Recommendations</h4>

        <div class="flex flex-column gap-2">
          <div
            v-for="(recommendation, index) in healthRecommendations"
            :key="index"
            class="surface-yellow-50 p-3 border-round border-1 border-yellow-200"
          >
            <div class="flex align-items-start gap-2">
              <i class="pi pi-lightbulb text-yellow-600 mt-1"></i>
              <div class="text-yellow-900 text-sm">{{ recommendation }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-between w-full">
        <Button
          icon="pi pi-refresh"
          label="Run Health Check"
          @click="runHealthCheck"
          :loading="loading"
        />
        <Button
          label="Close"
          icon="pi pi-times"
          outlined
          @click="$emit('update:visible', false)"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast"
import { computed, ref, watch } from "vue"
import { usePluginStore } from "../../stores/plugins"

// Props & Emits
interface Props {
  visible: boolean
  pluginName: string | null
  healthData?: any
}

interface HealthCheck {
  status: string
  message?: string
  timestamp: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
}>()

// Composables
const pluginStore = usePluginStore()
const toast = useToast()

// State
const loading = ref(false)
const error = ref<string | null>(null)
const healthHistory = ref<HealthCheck[]>([])

// Computed
const healthRecommendations = computed(() => {
  if (!props.healthData) return []

  const recommendations: string[] = []

  if (props.healthData.status === "unhealthy") {
    recommendations.push("Check plugin configuration and dependencies")
    recommendations.push("Review plugin logs for error details")
    recommendations.push("Consider restarting the plugin")
  }

  if (props.healthData.status === "degraded") {
    recommendations.push("Monitor plugin performance closely")
    recommendations.push("Check system resources and network connectivity")
  }

  if (props.healthData.details?.lastError) {
    recommendations.push("Review the last error message and take corrective action")
  }

  return recommendations
})

// Methods
const runHealthCheck = async () => {
  if (!props.pluginName) return

  try {
    loading.value = true
    error.value = null

    const health = await pluginStore.healthCheck(props.pluginName)

    // Add to history
    healthHistory.value.unshift({
      status: health.status,
      message: health.message,
      timestamp: new Date().toISOString(),
    })

    // Keep only last 5 checks
    if (healthHistory.value.length > 5) {
      healthHistory.value = healthHistory.value.slice(0, 5)
    }

    const severity = health.status === "healthy" ? "success" : "warn"
    toast.add({
      severity,
      summary: "Health Check Complete",
      detail: health.message || `Plugin is ${health.status}`,
      life: 3000,
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Health check failed"
    toast.add({
      severity: "error",
      summary: "Health Check Failed",
      detail: error.value,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

const getHealthStatusClass = (status: string) => {
  switch (status) {
    case "healthy":
      return "surface-green-50 border-1 border-green-200"
    case "unhealthy":
      return "surface-red-50 border-1 border-red-200"
    case "degraded":
      return "surface-yellow-50 border-1 border-yellow-200"
    default:
      return "surface-100 border-1 surface-border"
  }
}

const getHealthStatusIcon = (status: string) => {
  switch (status) {
    case "healthy":
      return "pi pi-check-circle"
    case "unhealthy":
      return "pi pi-times-circle"
    case "degraded":
      return "pi pi-exclamation-triangle"
    default:
      return "pi pi-question-circle"
  }
}

const getHealthStatusColor = (status: string) => {
  switch (status) {
    case "healthy":
      return "text-green-600"
    case "unhealthy":
      return "text-red-600"
    case "degraded":
      return "text-yellow-600"
    default:
      return "text-600"
  }
}

const getHealthStatusText = (status: string) => {
  switch (status) {
    case "healthy":
      return "Healthy"
    case "unhealthy":
      return "Unhealthy"
    case "degraded":
      return "Degraded"
    default:
      return "Unknown"
  }
}

const formatKey = (key: string) => {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (str: string) => str.toUpperCase())
}

const formatValue = (value: any) => {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No"
  }
  if (typeof value === "object") {
    return JSON.stringify(value)
  }
  return String(value)
}

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString()
}

const isLastItem = (key: string, obj: any) => {
  const keys = Object.keys(obj)
  return keys[keys.length - 1] === key
}

// Watchers
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      error.value = null
      // Auto-run health check if no data is provided
      if (!props.healthData && props.pluginName) {
        runHealthCheck()
      }
    }
  }
)
</script>

<style scoped>
:deep(.p-progressspinner-circle) {
  stroke: var(--primary-color);
}
</style>
