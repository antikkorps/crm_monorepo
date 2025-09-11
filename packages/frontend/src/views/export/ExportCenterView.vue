<template>
  <div class="export-center">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <i class="pi pi-download"></i>
          Export Center
        </h1>
        <p class="page-subtitle">
          Export your CRM data in various formats for analysis and reporting
        </p>
      </div>
    </div>

    <div class="export-content">
      <!-- Export Types Grid -->
      <div class="export-types-section">
        <h2>Available Exports</h2>
        <div class="export-types-grid">
          <div
            v-for="exportType in availableExports"
            :key="exportType.type"
            class="export-type-card"
            :class="{ disabled: !exportType.permissions }"
          >
            <div class="card-header">
              <div class="card-icon">
                <i :class="getExportIcon(exportType.type)"></i>
              </div>
              <div class="card-title">
                <h3>{{ exportType.name }}</h3>
                <span class="export-count" v-if="exportType.permissions">
                  {{ getRecordCount(exportType.type) }} records
                </span>
              </div>
            </div>
            <p class="card-description">{{ exportType.description }}</p>
            <div class="card-actions">
              <v-btn
                v-if="exportType.permissions"
                color="primary"
                prepend-icon="mdi-download"
                class="export-btn"
                @click="openExportDialog(exportType)"
              >
                Export {{ exportType.name }}
              </v-btn>
              <v-btn v-else color="secondary" prepend-icon="mdi-lock" disabled>
                No Permission
              </v-btn>
            </div>
          </div>
        </div>
      </div>

      <!-- Export History -->
      <div class="export-history-section">
        <h2>Export History</h2>
        <v-data-table
          :items="exportHistory"
          :loading="loadingHistory"
          class="export-history-table"
          :items-per-page="10"
          :items-per-page-options="[5, 10, 25]"
          density="compact"
        >
          <template #top>
            <div class="table-header">
              <v-text-field
                v-model="historyFilters.global.value"
                placeholder="Search exports..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                class="search-field"
              />
            </div>
          </template>

           <template #item.exportType="{ item }">
             <span class="export-type-badge" :class="item.exportType || 'unknown'">
               {{ getExportTypeName(item.exportType || 'unknown') }}
             </span>
           </template>

          <template #item.createdAt="{ item }">
            {{ formatDate(item.createdAt) }}
          </template>

           <template #item.format="{ item }">
             <span class="format-badge">{{ (item.format || 'unknown').toUpperCase() }}</span>
           </template>

          <template #item.status="{ item }">
            <span class="status-badge" :class="item.status">
              {{ item.status }}
            </span>
          </template>

          <template #item.recordCount="{ item }">
            {{ item.recordCount?.toLocaleString() || "N/A" }}
          </template>

          <template #item.actions="{ item }">
            <div class="action-buttons">
              <v-btn
                v-if="item.status === 'completed' && item.downloadUrl"
                icon="mdi-download"
                variant="text"
                size="small"
                @click="downloadExport(item)"
              />
              <v-btn
                v-if="item.status === 'failed'"
                icon="mdi-alert-circle"
                variant="text"
                color="error"
                size="small"
                @click="showErrorDetails(item)"
              />
              <v-btn
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                @click="deleteExport(item)"
              />
            </div>
          </template>
        </v-data-table>
      </div>
    </div>

     <!-- Export Configuration Dialog -->
     <v-dialog
       v-model="showExportDialog"
       persistent
       width="600"
       class="export-dialog"
     >
       <v-card>
         <v-card-title>{{ `Export ${selectedExportType?.name || ''}` }}</v-card-title>
         <v-card-text>
           <div class="export-form" v-if="selectedExportType">
         <div class="form-section">
           <h3>Export Options</h3>

           <!-- Format Selection -->
           <div class="field">
             <v-select
               v-model="exportOptions.format"
               :items="formatOptions"
               item-title="name"
               item-value="value"
               label="Export Format *"
               placeholder="Select format"
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
                 label="Start Date"
                 density="compact"
                 variant="outlined"
                 class="date-input"
               />
               <span class="date-separator">to</span>
               <v-text-field
                 v-model="dateRangeEnd"
                 type="date"
                 label="End Date"
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
               label="Search Query (Optional)"
               placeholder="Filter results..."
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
               label="Institution Type"
               placeholder="All types"
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
               label="Task Status"
               placeholder="All statuses"
               clearable
               density="compact"
               variant="outlined"
             />
           </div>

           <!-- Include Headers -->
           <div class="field-checkbox">
             <v-checkbox
               v-model="exportOptions.includeHeaders"
               label="Include column headers"
               density="compact"
             />
           </div>

           <!-- Use Queue for Large Exports -->
           <div class="field-checkbox">
             <v-checkbox
               v-model="exportOptions.useQueue"
               label="Use background processing for large exports"
               density="compact"
             />
           </div>
         </div>

         <!-- Data Preview -->
         <div class="preview-section" v-if="previewData.length > 0">
           <h3>Data Preview</h3>
           <ExportPreview
             :data="previewData"
             :total-records="estimatedRecordCount"
             :format="exportOptions.format"
             :available-fields="availableFields"
             :selected-fields="selectedFields"
             @update:selected-fields="selectedFields = $event"
           />
         </div>

         <v-card-actions class="form-actions">
           <v-spacer></v-spacer>
           <v-btn
             variant="text"
             prepend-icon="mdi-close"
             @click="closeExportDialog"
           >
             Cancel
           </v-btn>
           <v-btn
             color="primary"
             prepend-icon="mdi-download"
             :loading="exporting"
             @click="performExport"
           >
             Export
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
       width="500"
       class="error-dialog"
     >
       <v-card>
         <v-card-title>Export Error Details</v-card-title>
          <v-card-text>
            <div class="error-content" v-if="selectedErrorExport">
              <div class="error-message">
                <i class="pi pi-exclamation-triangle error-icon"></i>
                <div>
                  <h4>Export Failed</h4>
                  <p>{{ selectedErrorExport.error }}</p>
                </div>
              </div>
              <div class="error-details">
                <h5>Details:</h5>
                <ul>
                  <li>
                    <strong>Type:</strong>
                    {{ getExportTypeName(selectedErrorExport.exportType || 'unknown') }}
                  </li>
                  <li>
                    <strong>Format:</strong> {{ (selectedErrorExport.format || 'unknown').toUpperCase() }}
                  </li>
                  <li>
                    <strong>Date:</strong> {{ formatDate(selectedErrorExport.createdAt) }}
                  </li>
                </ul>
              </div>
            </div>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn variant="text" @click="showErrorDialog = false">Close</v-btn>
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
        <v-btn variant="text" @click="snackbar.visible = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type { FieldDefinition, PreviewData } from "@/components/export/ExportPreview.vue"
import ExportPreview from "@/components/export/ExportPreview.vue"
import {
  ExportApiService,
  ExportJob,
  ExportMetadata,
  ExportOptions,
} from "@/services/api/export"
import { computed, onMounted, ref } from "vue"

// Reactive data
const availableExports = ref<ExportMetadata["availableExports"]>([])
const exportHistory = ref<ExportJob[]>([])
const loadingHistory = ref(false)
const showExportDialog = ref(false)
const showErrorDialog = ref(false)
const selectedExportType = ref<ExportMetadata["availableExports"][0] | null>(null)
const selectedErrorExport = ref<ExportJob | null>(null)
const exporting = ref(false)
const historyFilters = ref({
  global: { value: null },
})

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

// Options for dropdowns
const formatOptions = [
  { name: "CSV (Comma Separated Values)", value: "csv" },
  { name: "Excel (XLSX)", value: "xlsx" },
  { name: "JSON (Structured Data)", value: "json" },
]

const institutionTypeOptions = [
  { name: "Hospital", value: "hospital" },
  { name: "Clinic", value: "clinic" },
  { name: "Medical Center", value: "medical_center" },
  { name: "Specialty Center", value: "specialty_center" },
]

const taskStatusOptions = [
  { name: "Pending", value: "pending" },
  { name: "In Progress", value: "in_progress" },
  { name: "Completed", value: "completed" },
  { name: "Cancelled", value: "cancelled" },
]

// Computed properties for date range handling
const dateRangeStart = computed({
  get: () => exportOptions.value.dateRange?.start || "",
  set: (value: string) => {
    if (!exportOptions.value.dateRange) {
      exportOptions.value.dateRange = { start: "", end: "" }
    }
    exportOptions.value.dateRange.start = value || ""
  }
})

const dateRangeEnd = computed({
  get: () => exportOptions.value.dateRange?.end || "",
  set: (value: string) => {
    if (!exportOptions.value.dateRange) {
      exportOptions.value.dateRange = { start: "", end: "" }
    }
    exportOptions.value.dateRange.end = value || ""
  }
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
    institutions: "pi pi-building",
    contacts: "pi pi-users",
    tasks: "pi pi-check-square",
    quotes: "pi pi-file-pdf",
    invoices: "pi pi-receipt",
  }
  return icons[type as keyof typeof icons] || "pi pi-file"
}

const getExportTypeName = (type: string) => {
  const names = {
    institutions: "Medical Institutions",
    contacts: "Contacts",
    tasks: "Tasks",
    quotes: "Quotes",
    invoices: "Invoices",
  }
  return names[type as keyof typeof names] || type
}

const getRecordCount = (type: string) => {
  if (!availableExports.value) return "0"
  
  const exportType = availableExports.value.find(exp => exp.type === type)
  if (!exportType) return "0"
  
  return exportType.recordCount.toLocaleString()
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("en-US", {
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
      options.dateRange.start = new Date(options.dateRange.start).toISOString().split("T")[0]
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
      `${selectedExportType.value.name} exported successfully`,
      "success",
      "mdi-check-circle"
    )

    closeExportDialog()
    loadExportHistory() // Refresh history
  } catch (error) {
    console.error("Export error:", error)
    showNotification(
      "An error occurred during export. Please try again.",
      "error",
      "mdi-alert-circle"
    )
  } finally {
    exporting.value = false
  }
}

const downloadExport = (exportJob: ExportJob) => {
  if (exportJob.downloadUrl) {
    window.open(exportJob.downloadUrl, "_blank")
  }
}

const showErrorDetails = (exportJob: ExportJob) => {
  selectedErrorExport.value = exportJob
  showErrorDialog.value = true
}

const deleteExport = (exportJob: ExportJob) => {
  // Implement delete functionality
  console.log("Delete export:", exportJob)
  showNotification("Delete functionality not yet implemented", "info", "mdi-information")
}

const loadExportMetadata = async () => {
  try {
    const metadata = await ExportApiService.getExportMetadata()
    availableExports.value = metadata.availableExports
  } catch (error) {
    console.error("Failed to load export metadata:", error)
    showNotification("Failed to load export options", "error", "mdi-alert-circle")
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
          { key: "name", label: "Institution Name", type: "string" as const, required: true },
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
          { key: "firstName", label: "First Name", type: "string" as const, required: true },
          { key: "lastName", label: "Last Name", type: "string" as const, required: true },
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

    default:
      return {
        totalCount: 0,
        fields: [],
        data: [],
      }
  }
}

const loadExportHistory = async () => {
  loadingHistory.value = true
  try {
    // For now, load mock data. In real implementation, this would come from backend
    exportHistory.value = [
      {
        jobId: "job-001",
        exportType: "institutions",
        format: "csv",
        status: "completed",
        recordCount: 1234,
        createdAt: new Date().toISOString(),
        downloadUrl: "#",
      },
      {
        jobId: "job-002",
        exportType: "tasks",
        format: "xlsx",
        status: "completed",
        recordCount: 567,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        downloadUrl: "#",
      },
    ] as ExportJob[]
  } catch (error) {
    console.error("Failed to load export history:", error)
  } finally {
    loadingHistory.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadExportMetadata()
  loadExportHistory()
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
  gap: 0.75rem;
}

.page-title i {
  color: #3b82f6;
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
}

.card-actions {
  display: flex;
  justify-content: flex-end;
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

/* Responsive design */
@media (max-width: 768px) {
  .export-center {
    padding: 1rem;
  }

  .export-types-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .date-range {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .date-separator {
    align-self: center;
  }
}
</style>
