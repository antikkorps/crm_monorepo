<template>
  <Dialog
    v-model:visible="dialogVisible"
    header="Export Analytics Data"
    modal
    class="w-11 md:w-6 lg:w-4"
  >
    <div class="flex flex-column gap-4">
      <!-- Export Type Selection -->
      <div class="flex flex-column gap-2">
        <label class="font-medium">Export Type</label>
        <div class="flex flex-column gap-2">
          <div class="flex align-items-center">
            <RadioButton v-model="selectedType" input-id="revenue" value="revenue" />
            <label for="revenue" class="ml-2">Revenue Analytics</label>
          </div>
          <div class="flex align-items-center">
            <RadioButton v-model="selectedType" input-id="payments" value="payments" />
            <label for="payments" class="ml-2">Payment Analytics</label>
          </div>
          <div class="flex align-items-center">
            <RadioButton
              v-model="selectedType"
              input-id="outstanding"
              value="outstanding"
            />
            <label for="outstanding" class="ml-2">Outstanding Invoices</label>
          </div>
          <div class="flex align-items-center">
            <RadioButton v-model="selectedType" input-id="segments" value="segments" />
            <label for="segments" class="ml-2">Medical Institution Segments</label>
          </div>
        </div>
      </div>

      <!-- Export Description -->
      <div v-if="selectedType" class="p-3 border-round bg-blue-50">
        <div class="text-blue-800 font-medium mb-1">
          {{ getExportTitle(selectedType) }}
        </div>
        <div class="text-blue-600 text-sm">{{ getExportDescription(selectedType) }}</div>
      </div>

      <!-- Date Range (for applicable exports) -->
      <div v-if="showDateRange" class="flex flex-column gap-2">
        <label class="font-medium">Date Range</label>
        <div class="text-sm text-600 mb-2">
          Current selection: {{ formatDateRange() }}
        </div>
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="useCustomDateRange" input-id="customDate" />
          <label for="customDate" class="text-sm">Use custom date range</label>
        </div>
        <Calendar
          v-if="useCustomDateRange"
          v-model="customDateRange"
          selection-mode="range"
          :manual-input="false"
          date-format="mm/dd/yy"
          placeholder="Select custom date range"
          class="w-full"
        />
      </div>

      <!-- User Filter (if applicable) -->
      <div v-if="showUserFilter && selectedUserId" class="flex flex-column gap-2">
        <label class="font-medium">User Filter</label>
        <div class="text-sm text-600">
          Current selection: {{ selectedUserId ? "Specific User" : "All Users" }}
        </div>
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="includeUserFilter" input-id="includeUser" />
          <label for="includeUser" class="text-sm">Include current user filter</label>
        </div>
      </div>

      <!-- Export Format -->
      <div class="flex flex-column gap-2">
        <label class="font-medium">Export Format</label>
        <Dropdown
          v-model="exportFormat"
          :options="formatOptions"
          option-label="label"
          option-value="value"
          placeholder="Select format"
          class="w-full"
        />
      </div>

      <!-- File Name Preview -->
      <div class="flex flex-column gap-2">
        <label class="font-medium">File Name</label>
        <InputText v-model="fileName" placeholder="Enter file name" class="w-full" />
        <div class="text-sm text-600">Full name: {{ fileName }}.{{ exportFormat }}</div>
      </div>

      <!-- Export Options -->
      <div class="flex flex-column gap-2">
        <label class="font-medium">Options</label>
        <div class="flex flex-column gap-2">
          <div class="flex align-items-center">
            <Checkbox v-model="includeHeaders" input-id="headers" />
            <label for="headers" class="ml-2 text-sm">Include column headers</label>
          </div>
          <div class="flex align-items-center">
            <Checkbox v-model="includeSummary" input-id="summary" />
            <label for="summary" class="ml-2 text-sm">Include summary statistics</label>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button label="Cancel" @click="dialogVisible = false" class="p-button-text" />
        <Button
          label="Export"
          icon="pi pi-download"
          @click="handleExport"
          :disabled="!selectedType || exporting"
          :loading="exporting"
        />
      </div>
    </template>
  </Dialog>
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
.p-dialog .p-dialog-content {
  padding: 1.5rem;
}
</style>
