<template>
  <AppLayout>
    <div class="export-center">
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title">
            <v-icon class="mr-2">mdi-download</v-icon>
            {{ $t('export.title') }}
          </h1>
          <p class="page-subtitle">
            {{ $t('export.description') }}
          </p>
        </div>
      </div>

      <div class="export-content">
        <!-- Export Types Grid -->
        <div class="export-types-section">
          <h2>{{ $t('export.availableExports') }}</h2>
          <div class="export-types-grid">
            <div
              v-for="exportType in availableExports"
              :key="exportType.type"
              class="export-type-card"
              :class="{ disabled: !exportType.permissions }"
            >
              <div class="card-header">
                <div class="card-icon">
                  <v-icon>{{ getExportIcon(exportType.type) }}</v-icon>
                </div>
                <div class="card-title">
                  <h3>{{ getExportTypeName(exportType.type) }}</h3>
                  <span class="export-count" v-if="exportType.permissions">
                    {{ getRecordCount(exportType.type) }} {{ $t('export.records') }}
                  </span>
                </div>
              </div>
              <p class="card-description">{{ $t(`export.descriptions.${exportType.type}`) }}</p>
              <div class="card-actions">
                <v-btn
                  v-if="exportType.permissions"
                  color="primary"
                  prepend-icon="mdi-download"
                  class="export-btn"
                  @click="openExportDialog(exportType)"
                >
                  <span class="d-none d-sm-inline">{{ $t('export.exportButton') }}&nbsp;</span>{{ getExportTypeName(exportType.type) }}
                </v-btn>
                <v-btn v-else color="secondary" prepend-icon="mdi-lock" disabled class="export-btn">
                  {{ $t('export.noPermission') }}
                </v-btn>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Export Configuration Dialog -->
      <v-dialog
        v-model="showExportDialog"
        persistent
        :width="isMobile ? '100%' : 600"
        :fullscreen="isMobile"
        class="export-dialog"
      >
        <v-card>
          <v-card-title>{{ $t('export.dialog.title', { type: getExportTypeName(selectedExportType?.type || '') }) }}</v-card-title>
          <v-card-text>
            <div class="export-form" v-if="selectedExportType">
              <div class="form-section">
                <h3>{{ $t('export.dialog.options') }}</h3>

                <!-- Format Selection -->
                <div class="field">
                  <v-select
                    v-model="exportOptions.format"
                    :items="formatOptions"
                    item-title="name"
                    item-value="value"
                    :label="$t('export.dialog.formatLabel')"
                    :placeholder="$t('export.dialog.selectFormat')"
                    density="compact"
                    variant="outlined"
                  />
                </div>

                <!-- Date Range -->
                <div class="field">
                  <div class="date-range">
                    <v-text-field
                      v-model="dateRangeStart"
                      type="date"
                      :label="$t('export.dialog.startDate')"
                      density="compact"
                      variant="outlined"
                      class="date-input"
                    />
                    <span class="date-separator">{{ $t('export.dialog.to') }}</span>
                    <v-text-field
                      v-model="dateRangeEnd"
                      type="date"
                      :label="$t('export.dialog.endDate')"
                      density="compact"
                      variant="outlined"
                      class="date-input"
                    />
                  </div>
                </div>

                <!-- Search Query -->
                <div class="field">
                  <v-text-field
                    v-model="exportOptions.searchQuery"
                    :label="$t('export.dialog.searchQuery')"
                    :placeholder="$t('export.dialog.searchPlaceholder')"
                    density="compact"
                    variant="outlined"
                  />
                </div>

                <!-- Additional Options based on export type -->
                <div class="field" v-if="selectedExportType.type === 'institutions'">
                  <v-select
                    v-model="exportOptions.institutionType"
                    :items="institutionTypeOptions"
                    item-title="name"
                    item-value="value"
                    :label="$t('export.dialog.institutionType')"
                    :placeholder="$t('export.dialog.allTypes')"
                    clearable
                    density="compact"
                    variant="outlined"
                  />
                </div>

                <div class="field" v-if="selectedExportType.type === 'tasks'">
                  <v-select
                    v-model="exportOptions.taskStatus"
                    :items="taskStatusOptions"
                    item-title="name"
                    item-value="value"
                    :label="$t('export.dialog.taskStatus')"
                    :placeholder="$t('export.dialog.allStatuses')"
                    clearable
                    density="compact"
                    variant="outlined"
                  />
                </div>

                <div class="field" v-if="selectedExportType.type === 'engagement_letters'">
                  <v-select
                    v-model="exportOptions.engagementLetterStatus"
                    :items="engagementLetterStatusOptions"
                    item-title="name"
                    item-value="value"
                    :label="$t('export.dialog.engagementLetterStatus')"
                    :placeholder="$t('export.dialog.allStatuses')"
                    clearable
                    density="compact"
                    variant="outlined"
                  />
                </div>

                <!-- Include Headers -->
                <div class="field-checkbox">
                  <v-checkbox
                    v-model="exportOptions.includeHeaders"
                    :label="$t('export.dialog.includeHeaders')"
                    density="compact"
                  />
                </div>

                <!-- Use Queue for Large Exports -->
                <div class="field-checkbox">
                  <v-checkbox
                    v-model="exportOptions.useQueue"
                    :label="$t('export.dialog.useQueue')"
                    density="compact"
                  />
                </div>
              </div>

              <!-- Data Preview -->
              <div class="preview-section" v-if="previewData.length > 0">
                <h3>{{ $t('export.dialog.dataPreview') }}</h3>
                <ExportPreview
                  :data="previewData"
                  :total-records="estimatedRecordCount"
                  :format="exportOptions.format"
                  :available-fields="availableFields"
                  :selected-fields="selectedFields"
                  @update:selected-fields="selectedFields = $event"
                />
              </div>

              <v-card-actions class="form-actions" :class="{ 'flex-column-reverse': isMobile }">
                <v-spacer v-if="!isMobile"></v-spacer>
                <v-btn
                  variant="text"
                  prepend-icon="mdi-close"
                  @click="closeExportDialog"
                  :block="isMobile"
                >
                  {{ $t('export.dialog.cancel') }}
                </v-btn>
                <v-btn
                  color="primary"
                  prepend-icon="mdi-download"
                  :loading="exporting"
                  @click="performExport"
                  :block="isMobile"
                >
                  {{ $t('export.dialog.export') }}
                </v-btn>
              </v-card-actions>
            </div>
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Error Details Dialog -->
      <v-dialog
        v-model="showErrorDialog"
        persistent
        :width="isMobile ? '100%' : 500"
        :fullscreen="isMobile"
        class="error-dialog"
      >
        <v-card>
          <v-card-title>{{ $t('export.errorDialog.title') }}</v-card-title>
          <v-card-text>
            <div class="error-content" v-if="selectedErrorExport">
              <div class="error-message">
                <v-icon color="error" class="error-icon">mdi-alert-circle</v-icon>
                <div>
                  <h4>{{ $t('export.errorDialog.exportFailed') }}</h4>
                  <p>{{ selectedErrorExport.error }}</p>
                </div>
              </div>
              <div class="error-details">
                <h5>{{ $t('export.errorDialog.details') }}</h5>
                <ul>
                  <li>
                    <strong>{{ $t('export.errorDialog.type') }}</strong>
                    {{ getExportTypeName(selectedErrorExport.exportType || "unknown") }}
                  </li>
                  <li>
                    <strong>{{ $t('export.errorDialog.format') }}</strong>
                    {{ (selectedErrorExport.format || "unknown").toUpperCase() }}
                  </li>
                  <li>
                    <strong>{{ $t('export.errorDialog.date') }}</strong> {{ formatDate(selectedErrorExport.createdAt) }}
                  </li>
                </ul>
              </div>
            </div>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn variant="text" @click="showErrorDialog = false">{{ $t('export.errorDialog.close') }}</v-btn>
            </v-card-actions>
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Vuetify Snackbar for notifications -->
      <v-snackbar
        v-model="snackbar.visible"
        :color="snackbar.color"
        timeout="5000"
        location="top"
      >
        <div class="d-flex align-center">
          <v-icon class="mr-2">{{ snackbar.icon }}</v-icon>
          <span>{{ snackbar.message }}</span>
        </div>

        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar.visible = false">{{ $t('common.close') }}</v-btn>
        </template>
      </v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import type { FieldDefinition, PreviewData } from "@/components/export/ExportPreview.vue"
import ExportPreview from "@/components/export/ExportPreview.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import {
  ExportApiService,
  ExportJob,
  ExportMetadata,
  ExportOptions,
} from "@/services/api/export"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useDisplay } from "vuetify"

const { t } = useI18n()
const { smAndDown } = useDisplay()
const isMobile = smAndDown

// Reactive data
const availableExports = ref<ExportMetadata["availableExports"]>([])
const showExportDialog = ref(false)
const showErrorDialog = ref(false)
const selectedExportType = ref<ExportMetadata["availableExports"][0] | null>(null)
const selectedErrorExport = ref<ExportJob | null>(null)
const exporting = ref(false)

// Vuetify snackbar state
const snackbar = ref({
  visible: false,
  color: "success",
  message: "",
  icon: "mdi-check-circle",
})

// Preview data
const previewData = ref<PreviewData[]>([])
const estimatedRecordCount = ref(0)
const availableFields = ref<FieldDefinition[]>([])
const selectedFields = ref<string[]>([])

// Export options
const exportOptions = ref<ExportOptions>({
  format: "csv",
  includeHeaders: true,
  searchQuery: "",
  useQueue: false,
})

// Options for dropdowns (computed for i18n reactivity)
const formatOptions = computed(() => [
  { name: t('export.format.csv'), value: "csv" },
  { name: t('export.format.xlsx'), value: "xlsx" },
  { name: t('export.format.json'), value: "json" },
])

const institutionTypeOptions = computed(() => [
  { name: t('export.institutionTypes.hospital'), value: "hospital" },
  { name: t('export.institutionTypes.clinic'), value: "clinic" },
  { name: t('export.institutionTypes.medical_center'), value: "medical_center" },
  { name: t('export.institutionTypes.specialty_center'), value: "specialty_center" },
])

const taskStatusOptions = computed(() => [
  { name: t('export.taskStatuses.pending'), value: "pending" },
  { name: t('export.taskStatuses.in_progress'), value: "in_progress" },
  { name: t('export.taskStatuses.completed'), value: "completed" },
  { name: t('export.taskStatuses.cancelled'), value: "cancelled" },
])

const engagementLetterStatusOptions = computed(() => [
  { name: t('export.engagementLetterStatuses.draft'), value: "draft" },
  { name: t('export.engagementLetterStatuses.sent'), value: "sent" },
  { name: t('export.engagementLetterStatuses.accepted'), value: "accepted" },
  { name: t('export.engagementLetterStatuses.rejected'), value: "rejected" },
  { name: t('export.engagementLetterStatuses.completed'), value: "completed" },
  { name: t('export.engagementLetterStatuses.cancelled'), value: "cancelled" },
])

// Computed properties for date range handling
const dateRangeStart = computed({
  get: () => exportOptions.value.dateRange?.start || "",
  set: (value: string) => {
    if (!exportOptions.value.dateRange) {
      exportOptions.value.dateRange = { start: "", end: "" }
    }
    exportOptions.value.dateRange.start = value || ""
  },
})

const dateRangeEnd = computed({
  get: () => exportOptions.value.dateRange?.end || "",
  set: (value: string) => {
    if (!exportOptions.value.dateRange) {
      exportOptions.value.dateRange = { start: "", end: "" }
    }
    exportOptions.value.dateRange.end = value || ""
  },
})

// Methods
const showNotification = (
  message: string,
  color: string = "success",
  icon: string = "mdi-check-circle"
) => {
  snackbar.value = {
    visible: true,
    color,
    message,
    icon,
  }
}

const getExportIcon = (type: string) => {
  const icons = {
    institutions: "mdi-domain",
    contacts: "mdi-account-group",
    tasks: "mdi-checkbox-marked-outline",
    quotes: "mdi-file-document-outline",
    invoices: "mdi-receipt",
    opportunities: "mdi-chart-line",
    engagement_letters: "mdi-file-sign",
  }
  return icons[type as keyof typeof icons] || "mdi-file"
}

const getExportTypeName = (type: string) => {
  const key = `export.types.${type}`
  const translated = t(key)
  // Return the translated value, or fallback to the type if not found
  return translated !== key ? translated : type
}

const getRecordCount = (type: string) => {
  if (!availableExports.value) return "0"

  const exportType = availableExports.value.find((exp) => exp.type === type)
  if (!exportType) return "0"

  return exportType.recordCount.toLocaleString()
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const openExportDialog = async (exportType: ExportMetadata["availableExports"][0]) => {
  selectedExportType.value = exportType
  exportOptions.value = {
    format: "csv",
    includeHeaders: true,
    searchQuery: "",
    useQueue: false,
  }

  // Load preview data
  await loadPreviewData(exportType.type)

  showExportDialog.value = true
}

const closeExportDialog = () => {
  showExportDialog.value = false
  selectedExportType.value = null
}

const performExport = async () => {
  if (!selectedExportType.value) return

  exporting.value = true

  try {
    const options = { ...exportOptions.value }

    // Convert date objects to ISO strings
    if (options.dateRange?.start) {
      options.dateRange.start = new Date(options.dateRange.start)
        .toISOString()
        .split("T")[0]
    }
    if (options.dateRange?.end) {
      options.dateRange.end = new Date(options.dateRange.end).toISOString().split("T")[0]
    }

    let blob: Blob

    // Call appropriate export method based on type
    switch (selectedExportType.value.type) {
      case "institutions":
        blob = await ExportApiService.exportMedicalInstitutions(options)
        break
      case "contacts":
        blob = await ExportApiService.exportContacts(options)
        break
      case "tasks":
        blob = await ExportApiService.exportTasks(options)
        break
      case "quotes":
        blob = await ExportApiService.exportQuotes(options)
        break
      case "invoices":
        blob = await ExportApiService.exportInvoices(options)
        break
      case "opportunities":
        blob = await ExportApiService.exportOpportunities(options)
        break
      case "engagement_letters":
        blob = await ExportApiService.exportEngagementLetters(options)
        break
      default:
        throw new Error("Unsupported export type")
    }

    // Generate filename and download
    const filename = ExportApiService.generateFilename(
      selectedExportType.value.type,
      options.format
    )
    ExportApiService.downloadBlob(blob, filename)

    showNotification(
      t('export.success.exportedType', { type: getExportTypeName(selectedExportType.value.type) }),
      "success",
      "mdi-check-circle"
    )

    closeExportDialog()
  } catch (error) {
    console.error("Export error:", error)
    showNotification(
      t('export.notifications.exportError'),
      "error",
      "mdi-alert-circle"
    )
  } finally {
    exporting.value = false
  }
}

const loadExportMetadata = async () => {
  try {
    const metadata = await ExportApiService.getExportMetadata()
    availableExports.value = metadata.availableExports
  } catch (error) {
    console.error("Failed to load export metadata:", error)
    showNotification(t('export.notifications.loadError'), "error", "mdi-alert-circle")
  }
}

const loadPreviewData = async (exportType: string) => {
  try {
    // Mock preview data - in real implementation, this would call a preview endpoint
    const mockData = generateMockPreviewData(exportType)
    previewData.value = mockData.data
    estimatedRecordCount.value = mockData.totalCount
    availableFields.value = mockData.fields
    selectedFields.value = mockData.fields.map((field) => field.key)
  } catch (error) {
    console.error("Failed to load preview data:", error)
    previewData.value = []
    estimatedRecordCount.value = 0
    availableFields.value = []
    selectedFields.value = []
  }
}

const generateMockPreviewData = (exportType: string) => {
  switch (exportType) {
    case "institutions":
      return {
        totalCount: 1250,
        fields: [
          { key: "id", label: "ID", type: "string" as const, required: true },
          {
            key: "name",
            label: "Institution Name",
            type: "string" as const,
            required: true,
          },
          { key: "type", label: "Type", type: "string" as const },
          { key: "address", label: "Address", type: "string" as const },
          { key: "phone", label: "Phone", type: "string" as const },
          { key: "email", label: "Email", type: "string" as const },
          { key: "bedCapacity", label: "Bed Capacity", type: "number" as const },
          { key: "surgicalRooms", label: "Surgical Rooms", type: "number" as const },
          { key: "createdAt", label: "Created Date", type: "date" as const },
        ],
        data: [
          {
            id: "1",
            name: "City General Hospital",
            type: "hospital",
            address: "123 Main St, City, State",
            phone: "+1-555-0123",
            email: "info@citygeneral.com",
            bedCapacity: 250,
            surgicalRooms: 8,
            createdAt: "2024-01-15T10:30:00Z",
          },
          {
            id: "2",
            name: "Medical Center Plus",
            type: "medical_center",
            address: "456 Health Ave, City, State",
            phone: "+1-555-0456",
            email: "contact@medicalcenter.com",
            bedCapacity: 150,
            surgicalRooms: 5,
            createdAt: "2024-02-20T14:15:00Z",
          },
          {
            id: "3",
            name: "Downtown Clinic",
            type: "clinic",
            address: "789 Care Blvd, City, State",
            phone: "+1-555-0789",
            email: "appointments@downtownclinic.com",
            bedCapacity: 0,
            surgicalRooms: 2,
            createdAt: "2024-03-10T09:45:00Z",
          },
        ],
      }

    case "contacts":
      return {
        totalCount: 850,
        fields: [
          { key: "id", label: "ID", type: "string" as const, required: true },
          {
            key: "firstName",
            label: "First Name",
            type: "string" as const,
            required: true,
          },
          {
            key: "lastName",
            label: "Last Name",
            type: "string" as const,
            required: true,
          },
          { key: "email", label: "Email", type: "string" as const },
          { key: "phone", label: "Phone", type: "string" as const },
          { key: "role", label: "Role", type: "string" as const },
          { key: "institutionName", label: "Institution", type: "string" as const },
          { key: "createdAt", label: "Created Date", type: "date" as const },
        ],
        data: [
          {
            id: "1",
            firstName: "John",
            lastName: "Smith",
            email: "john.smith@citygeneral.com",
            phone: "+1-555-1111",
            role: "Chief of Surgery",
            institutionName: "City General Hospital",
            createdAt: "2024-01-15T10:30:00Z",
          },
          {
            id: "2",
            firstName: "Sarah",
            lastName: "Johnson",
            email: "sarah.johnson@medicalcenter.com",
            phone: "+1-555-2222",
            role: "Medical Director",
            institutionName: "Medical Center Plus",
            createdAt: "2024-02-20T14:15:00Z",
          },
        ],
      }

    case "tasks":
      return {
        totalCount: 320,
        fields: [
          { key: "id", label: "ID", type: "string" as const, required: true },
          { key: "title", label: "Title", type: "string" as const, required: true },
          { key: "description", label: "Description", type: "string" as const },
          { key: "status", label: "Status", type: "string" as const },
          { key: "priority", label: "Priority", type: "string" as const },
          { key: "assigneeName", label: "Assignee", type: "string" as const },
          { key: "dueDate", label: "Due Date", type: "date" as const },
          { key: "createdAt", label: "Created Date", type: "date" as const },
        ],
        data: [
          {
            id: "1",
            title: "Follow up with City General Hospital",
            description: "Schedule meeting to discuss partnership opportunities",
            status: "pending",
            priority: "high",
            assigneeName: "John Doe",
            dueDate: "2024-12-15T00:00:00Z",
            createdAt: "2024-12-01T10:30:00Z",
          },
          {
            id: "2",
            title: "Update contact information",
            description: "Verify and update contact details for Medical Center Plus",
            status: "in_progress",
            priority: "medium",
            assigneeName: "Jane Smith",
            dueDate: "2024-12-20T00:00:00Z",
            createdAt: "2024-12-05T14:15:00Z",
          },
        ],
      }

    case "opportunities":
      return {
        totalCount: 150,
        fields: [
          { key: "id", label: "ID", type: "string" as const, required: true },
          { key: "name", label: "Opportunity Name", type: "string" as const, required: true },
          { key: "stage", label: "Stage", type: "string" as const },
          { key: "value", label: "Value", type: "number" as const },
          { key: "probability", label: "Probability (%)", type: "number" as const },
          { key: "expectedCloseDate", label: "Expected Close", type: "date" as const },
          { key: "institutionName", label: "Institution", type: "string" as const },
          { key: "contactPersonName", label: "Contact", type: "string" as const },
          { key: "assignedUser", label: "Assigned To", type: "string" as const },
          { key: "tags", label: "Tags", type: "string" as const },
          { key: "source", label: "Source", type: "string" as const },
          { key: "createdAt", label: "Created Date", type: "date" as const },
        ],
        data: [
          {
            id: "1",
            name: "Hospital Equipment Deal",
            stage: "proposal",
            value: 50000,
            probability: 75,
            expectedCloseDate: "2025-02-15T00:00:00Z",
            institutionName: "City General Hospital",
            contactPersonName: "John Smith",
            assignedUser: "Jane Doe",
            tags: "medical, equipment",
            source: "referral",
            createdAt: "2024-12-01T10:30:00Z",
          },
          {
            id: "2",
            name: "Training Program",
            stage: "negotiation",
            value: 25000,
            probability: 60,
            expectedCloseDate: "2025-03-01T00:00:00Z",
            institutionName: "Medical Center Plus",
            contactPersonName: "Sarah Johnson",
            assignedUser: "Bob Wilson",
            tags: "training, services",
            source: "web",
            createdAt: "2024-12-05T14:15:00Z",
          },
        ],
      }

    case "engagement_letters":
      return {
        totalCount: 45,
        fields: [
          { key: "id", label: "ID", type: "string" as const, required: true },
          { key: "letterNumber", label: "Numéro", type: "string" as const, required: true },
          { key: "title", label: "Titre", type: "string" as const, required: true },
          { key: "missionType", label: "Type de mission", type: "string" as const },
          { key: "status", label: "Statut", type: "string" as const },
          { key: "estimatedTotal", label: "Total estimé", type: "number" as const },
          { key: "startDate", label: "Date de début", type: "date" as const },
          { key: "endDate", label: "Date de fin", type: "date" as const },
          { key: "institutionName", label: "Établissement", type: "string" as const },
          { key: "assignedUser", label: "Assigné à", type: "string" as const },
          { key: "createdAt", label: "Date de création", type: "date" as const },
        ],
        data: [
          {
            id: "1",
            letterNumber: "LM2025010001",
            title: "Mission d'accompagnement RH",
            missionType: "consulting",
            status: "accepted",
            estimatedTotal: 15000,
            startDate: "2025-01-15T00:00:00Z",
            endDate: "2025-03-15T00:00:00Z",
            institutionName: "Hôpital Central",
            assignedUser: "Jean Dupont",
            createdAt: "2025-01-05T10:30:00Z",
          },
          {
            id: "2",
            letterNumber: "LM2025010002",
            title: "Audit qualité",
            missionType: "audit",
            status: "sent",
            estimatedTotal: 8500,
            startDate: "2025-02-01T00:00:00Z",
            endDate: "2025-02-28T00:00:00Z",
            institutionName: "Centre Médical Plus",
            assignedUser: "Marie Martin",
            createdAt: "2025-01-10T14:15:00Z",
          },
        ],
      }

    default:
      return {
        totalCount: 0,
        fields: [],
        data: [],
      }
  }
}

// Lifecycle
onMounted(() => {
  loadExportMetadata()
})
</script>

<style scoped>
.export-center {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
  margin: 0;
}

.page-subtitle {
  color: #6b7280;
  font-size: 1rem;
}

.export-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.export-types-section h2,
.export-history-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1.5rem;
}

.export-types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.export-type-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.export-type-card:hover:not(.disabled) {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
}

.export-type-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.card-icon {
  width: 3rem;
  height: 3rem;
  background: #f3f4f6;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: #6b7280;
}

.card-title {
  flex: 1;
}

.card-title h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.25rem 0;
}

.export-count {
  font-size: 0.875rem;
  color: #6b7280;
}

.card-description {
  color: #6b7280;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}

.export-btn {
  min-width: 140px;
}

.export-history-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.export-type-badge,
.format-badge,
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.export-type-badge.institutions {
  background: #dbeafe;
  color: #1e40af;
}
.export-type-badge.contacts {
  background: #dcfce7;
  color: #166534;
}
.export-type-badge.tasks {
  background: #fef3c7;
  color: #92400e;
}
.export-type-badge.quotes {
  background: #fce7f3;
  color: #be185d;
}
.export-type-badge.invoices {
  background: #e0e7ff;
  color: #3730a3;
}
.export-type-badge.engagement_letters {
  background: #fef3c7;
  color: #d97706;
}

.format-badge {
  background: #f3f4f6;
  color: #374151;
}

.status-badge.completed {
  background: #dcfce7;
  color: #166534;
}
.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}
.status-badge.processing {
  background: #dbeafe;
  color: #1e40af;
}
.status-badge.failed {
  background: #fee2e2;
  color: #dc2626;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.export-dialog {
  max-height: 90vh;
  overflow-y: auto;
}

.export-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field label {
  font-weight: 500;
  color: #374151;
}

.w-full {
  width: 100%;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.date-input {
  flex: 1;
}

.date-separator {
  color: #6b7280;
  font-weight: 500;
}

.field-checkbox {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.field-checkbox label {
  margin: 0;
  font-weight: 500;
  color: #374151;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.error-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
}

.error-icon {
  color: #dc2626;
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.error-message h4 {
  margin: 0 0 0.5rem 0;
  color: #dc2626;
  font-weight: 600;
}

.error-message p {
  margin: 0;
  color: #7f1d1d;
}

.error-details h5 {
  margin: 0 0 0.75rem 0;
  font-weight: 600;
  color: #374151;
}

.error-details ul {
  margin: 0;
  padding-left: 1.5rem;
}

.error-details li {
  margin-bottom: 0.5rem;
  color: #6b7280;
}

.error-details strong {
  color: #374151;
}

/* Responsive design - Tablet */
@media (max-width: 960px) {
  .export-types-grid {
    grid-template-columns: 1fr;
  }
}

/* Responsive design - Mobile */
@media (max-width: 600px) {
  .export-center {
    padding: 0.75rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-subtitle {
    font-size: 0.875rem;
  }

  .export-types-section h2 {
    font-size: 1.25rem;
    margin-bottom: 1rem;
  }

  .export-types-grid {
    gap: 1rem;
  }

  .export-type-card {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .card-icon {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }

  .card-title h3 {
    font-size: 1rem;
  }

  .card-description {
    font-size: 0.8125rem;
    margin-bottom: 1rem;
  }

  .export-btn {
    width: 100%;
    min-width: unset;
  }

  /* Dialog form optimizations */
  .export-form {
    gap: 1rem;
  }

  .form-section h3 {
    font-size: 1rem;
  }

  .date-range {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .date-separator {
    align-self: center;
  }

  .form-actions {
    gap: 0.5rem;
    padding-top: 0.75rem;
  }

  /* Preview section */
  .preview-section h3 {
    font-size: 1rem;
  }

  /* Error dialog */
  .error-message {
    flex-direction: column;
    gap: 0.75rem;
  }

  .error-details ul {
    padding-left: 1rem;
  }
}
</style>
