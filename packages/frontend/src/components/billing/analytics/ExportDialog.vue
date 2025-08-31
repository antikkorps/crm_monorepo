<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title class="text-h5 pa-4">
        <v-icon icon="mdi-download" class="mr-2" />
        Export Analytics Data
      </v-card-title>

      <v-card-text class="pa-4">
        <div class="d-flex flex-column ga-4">
          <!-- Export Type Selection -->
          <div>
            <label class="text-body-2 font-weight-medium mb-2 d-block">Export Type</label>
            <v-radio-group v-model="selectedType" class="mt-2">
              <v-radio label="Revenue Analytics" value="revenue" />
              <v-radio label="Payment Analytics" value="payments" />
              <v-radio label="Outstanding Invoices" value="outstanding" />
              <v-radio label="Medical Institution Segments" value="segments" />
            </v-radio-group>
          </div>

          <!-- Export Description -->
          <v-alert
            v-if="selectedType"
            type="info"
            variant="tonal"
            class="mb-2"
          >
            <v-alert-title class="text-body-1 font-weight-medium">
              {{ getExportTitle(selectedType) }}
            </v-alert-title>
            <div class="text-body-2">{{ getExportDescription(selectedType) }}</div>
          </v-alert>

          <!-- Date Range (for applicable exports) -->
          <div v-if="showDateRange">
            <label class="text-body-2 font-weight-medium mb-2 d-block">Date Range</label>
            <div class="text-body-2 text-medium-emphasis mb-2">
              Current selection: {{ formatDateRange() }}
            </div>
            <v-checkbox
              v-model="useCustomDateRange"
              label="Use custom date range"
              density="compact"
            />
            <v-menu
              v-if="useCustomDateRange"
              v-model="customDateMenu"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="customDateRangeText"
                  label="Select custom date range"
                  prepend-icon="mdi-calendar"
                  readonly
                  variant="outlined"
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="customDateRange"
                range
                @update:model-value="customDateMenu = false"
              ></v-date-picker>
            </v-menu>
          </div>

          <!-- User Filter (if applicable) -->
          <div v-if="showUserFilter && selectedUserId">
            <label class="text-body-2 font-weight-medium mb-2 d-block">User Filter</label>
            <div class="text-body-2 text-medium-emphasis mb-2">
              Current selection: {{ selectedUserId ? "Specific User" : "All Users" }}
            </div>
            <v-checkbox
              v-model="includeUserFilter"
              label="Include current user filter"
              density="compact"
            />
          </div>

          <!-- Export Format -->
          <div>
            <label class="text-body-2 font-weight-medium mb-2 d-block">Export Format</label>
            <v-select
              v-model="exportFormat"
              :items="formatOptions"
              item-title="label"
              item-value="value"
              placeholder="Select format"
              variant="outlined"
            />
          </div>

          <!-- File Name Preview -->
          <div>
            <label class="text-body-2 font-weight-medium mb-2 d-block">File Name</label>
            <v-text-field
              v-model="fileName"
              placeholder="Enter file name"
              variant="outlined"
            />
            <div class="text-body-2 text-medium-emphasis">Full name: {{ fileName }}.{{ exportFormat }}</div>
          </div>

          <!-- Export Options -->
          <div>
            <label class="text-body-2 font-weight-medium mb-2 d-block">Options</label>
            <div class="d-flex flex-column ga-1">
              <v-checkbox
                v-model="includeHeaders"
                label="Include column headers"
                density="compact"
              />
              <v-checkbox
                v-model="includeSummary"
                label="Include summary statistics"
                density="compact"
              />
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="dialogVisible = false"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-download"
          @click="handleExport"
          :disabled="!selectedType || exporting"
          :loading="exporting"
        >
          Export
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"

interface Props {
  visible: boolean
  dateRange: Date[] | null
  selectedUserId: string | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  "update:visible": [value: boolean]
  export: [type: string, options: ExportOptions]
}>()

interface ExportOptions {
  type: string
  dateRange?: Date[]
  userId?: string
  format: string
  fileName: string
  includeHeaders: boolean
  includeSummary: boolean
}

// Reactive data
const selectedType = ref<string>("")
const exportFormat = ref("csv")
const fileName = ref("")
const includeHeaders = ref(true)
const includeSummary = ref(true)
const useCustomDateRange = ref(false)
const customDateRange = ref<Date[] | null>(null)
const customDateMenu = ref(false)
const includeUserFilter = ref(true)
const exporting = ref(false)

// Computed properties
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
})

const showDateRange = computed(() => {
  return ["revenue", "payments"].includes(selectedType.value)
})

const showUserFilter = computed(() => {
  return props.selectedUserId !== null
})

const customDateRangeText = computed(() => {
  if (!customDateRange.value || customDateRange.value.length !== 2) return ""
  const start = new Date(customDateRange.value[0]).toLocaleDateString()
  const end = new Date(customDateRange.value[1]).toLocaleDateString()
  return `${start} - ${end}`
})

const formatOptions = [
  { label: "CSV (Comma Separated)", value: "csv" },
  { label: "Excel (XLSX)", value: "xlsx" },
  { label: "JSON", value: "json" },
]

// Methods
const getExportTitle = (type: string): string => {
  const titles = {
    revenue: "Revenue Analytics Export",
    payments: "Payment Analytics Export",
    outstanding: "Outstanding Invoices Export",
    segments: "Medical Institution Segments Export",
  }
  return titles[type as keyof typeof titles] || "Analytics Export"
}

const getExportDescription = (type: string): string => {
  const descriptions = {
    revenue:
      "Includes total revenue, monthly breakdown, status distribution, and key metrics.",
    payments:
      "Includes payment methods, trends, partial payment statistics, and reconciliation data.",
    outstanding:
      "Includes all outstanding invoices with aging analysis and institution details.",
    segments:
      "Includes medical institution segments with revenue and performance metrics by type.",
  }
  return descriptions[type as keyof typeof descriptions] || "Export analytics data"
}

const formatDateRange = (): string => {
  if (!props.dateRange || props.dateRange.length !== 2) {
    return "All time"
  }

  const start = props.dateRange[0].toLocaleDateString()
  const end = props.dateRange[1].toLocaleDateString()
  return `${start} - ${end}`
}

const generateFileName = (): string => {
  const type = selectedType.value
  const date = new Date().toISOString().split("T")[0]

  let baseName = `${type}-analytics-${date}`

  if (
    useCustomDateRange.value &&
    customDateRange.value &&
    customDateRange.value.length === 2
  ) {
    const start = customDateRange.value[0].toISOString().split("T")[0]
    const end = customDateRange.value[1].toISOString().split("T")[0]
    baseName = `${type}-analytics-${start}-to-${end}`
  } else if (props.dateRange && props.dateRange.length === 2) {
    const start = props.dateRange[0].toISOString().split("T")[0]
    const end = props.dateRange[1].toISOString().split("T")[0]
    baseName = `${type}-analytics-${start}-to-${end}`
  }

  if (includeUserFilter.value && props.selectedUserId) {
    baseName += "-filtered"
  }

  return baseName
}

const handleExport = async () => {
  if (!selectedType.value) return

  exporting.value = true

  try {
    const options: ExportOptions = {
      type: selectedType.value,
      format: exportFormat.value,
      fileName: fileName.value,
      includeHeaders: includeHeaders.value,
      includeSummary: includeSummary.value,
    }

    // Add date range if applicable
    if (showDateRange.value) {
      if (
        useCustomDateRange.value &&
        customDateRange.value &&
        customDateRange.value.length === 2
      ) {
        options.dateRange = customDateRange.value
      } else if (props.dateRange && props.dateRange.length === 2) {
        options.dateRange = props.dateRange
      }
    }

    // Add user filter if applicable
    if (includeUserFilter.value && props.selectedUserId) {
      options.userId = props.selectedUserId
    }

    emit("export", selectedType.value, options)
    dialogVisible.value = false
  } catch (error) {
    console.error("Export failed:", error)
  } finally {
    exporting.value = false
  }
}

const resetForm = () => {
  selectedType.value = ""
  exportFormat.value = "csv"
  fileName.value = ""
  includeHeaders.value = true
  includeSummary.value = true
  useCustomDateRange.value = false
  customDateRange.value = null
  customDateMenu.value = false
  includeUserFilter.value = true
  exporting.value = false
}

// Watchers
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
    }
  }
)

watch(selectedType, (type) => {
  if (type) {
    fileName.value = generateFileName()
  }
})

watch([useCustomDateRange, customDateRange, includeUserFilter], () => {
  if (selectedType.value) {
    fileName.value = generateFileName()
  }
})
</script>

<style scoped>
/* Vuetify styles - no custom styles needed */
</style>
