<template>
  <div class="export-scheduler">
    <div class="scheduler-header">
      <h3>Scheduled Exports</h3>
      <p class="scheduler-description">
        Automate your data exports with scheduled jobs
      </p>
    </div>

    <!-- Create New Schedule Button -->
    <div class="scheduler-actions">
      <Button
        label="Create Scheduled Export"
        icon="pi pi-plus"
        class="p-button-primary"
        @click="openScheduleDialog"
      />
    </div>

    <!-- Scheduled Exports List -->
    <div class="scheduled-exports">
      <DataTable
        :value="scheduledExports"
        :loading="loading"
        class="scheduler-table"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[5, 10, 25]"
        responsiveLayout="scroll"
        :globalFilterFields="['name', 'exportType', 'frequency']"
      >
        <template #header>
          <div class="table-header">
            <span class="p-input-icon-left">
              <i class="pi pi-search"></i>
              <InputText
                v-model="filters.global.value"
                placeholder="Search scheduled exports..."
                style="width: 100%"
              />
            </span>
          </div>
        </template>

        <Column field="name" header="Name" :sortable="true">
          <template #body="slotProps">
            <div class="schedule-name">
              <strong>{{ slotProps.data.name }}</strong>
              <div class="schedule-description">{{ slotProps.data.description }}</div>
            </div>
          </template>
        </Column>

        <Column field="exportType" header="Export Type" :sortable="true">
          <template #body="slotProps">
            <span class="export-type-badge" :class="slotProps.data.exportType">
              {{ getExportTypeName(slotProps.data.exportType) }}
            </span>
          </template>
        </Column>

        <Column field="frequency" header="Frequency" :sortable="true">
          <template #body="slotProps">
            <span class="frequency-badge" :class="slotProps.data.frequency">
              {{ getFrequencyLabel(slotProps.data.frequency) }}
            </span>
          </template>
        </Column>

        <Column field="nextRun" header="Next Run" :sortable="true">
          <template #body="slotProps">
            {{ formatDateTime(slotProps.data.nextRun) }}
          </template>
        </Column>

        <Column field="lastRun" header="Last Run" :sortable="true">
            <template #body="slotProps">
              <span v-if="slotProps.data.lastRun" class="last-run">
                {{ formatDateTime(slotProps.data.lastRun) }}
                <span class="run-status" :class="slotProps.data.lastStatus">
                  ({{ slotProps.data.lastStatus }})
                </span>
              </span>
              <span v-else class="no-run">Never</span>
            </template>
          </Column>

        <Column field="status" header="Status" :sortable="true">
          <template #body="slotProps">
            <span class="status-badge" :class="slotProps.data.status">
              {{ slotProps.data.status }}
            </span>
          </template>
        </Column>

        <Column header="Actions">
          <template #body="slotProps">
            <div class="action-buttons">
              <Button
                v-if="slotProps.data.status === 'active'"
                icon="pi pi-pause"
                class="p-button-text p-button-warning p-button-sm"
                @click="pauseSchedule(slotProps.data)"
                v-tooltip="'Pause schedule'"
              />
              <Button
                v-else-if="slotProps.data.status === 'paused'"
                icon="pi pi-play"
                class="p-button-text p-button-success p-button-sm"
                @click="resumeSchedule(slotProps.data)"
                v-tooltip="'Resume schedule'"
              />

              <Button
                icon="pi pi-pencil"
                class="p-button-text p-button-sm"
                @click="editSchedule(slotProps.data)"
                v-tooltip="'Edit schedule'"
              />

              <Button
                icon="pi pi-copy"
                class="p-button-text p-button-sm"
                @click="duplicateSchedule(slotProps.data)"
                v-tooltip="'Duplicate schedule'"
              />

              <Button
                icon="pi pi-trash"
                class="p-button-text p-button-danger p-button-sm"
                @click="deleteSchedule(slotProps.data)"
                v-tooltip="'Delete schedule'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Schedule Creation/Edit Dialog -->
    <Dialog
      v-model:visible="showScheduleDialog"
      :header="isEditing ? 'Edit Scheduled Export' : 'Create Scheduled Export'"
      :modal="true"
      class="schedule-dialog"
      :style="{ width: '700px' }"
    >
      <div class="schedule-form" v-if="currentSchedule">
        <div class="form-section">
          <h4>Basic Information</h4>

          <!-- Schedule Name -->
          <div class="field">
            <label for="scheduleName">Schedule Name *</label>
            <InputText
              id="scheduleName"
              v-model="currentSchedule.name"
              placeholder="e.g., Weekly Institution Report"
              class="w-full"
              :class="{ 'p-invalid': errors.name }"
            />
            <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
          </div>

          <!-- Description -->
          <div class="field">
            <label for="scheduleDescription">Description</label>
            <Textarea
              id="scheduleDescription"
              v-model="currentSchedule.description"
              placeholder="Optional description for this scheduled export"
              class="w-full"
              rows="3"
            />
          </div>

          <!-- Export Type -->
          <div class="field">
            <label for="exportType">Export Type *</label>
            <Dropdown
              id="exportType"
              v-model="currentSchedule.exportType"
              :options="exportTypeOptions"
              option-label="name"
              option-value="value"
              placeholder="Select export type"
              class="w-full"
              :class="{ 'p-invalid': errors.exportType }"
            />
            <small v-if="errors.exportType" class="p-error">{{ errors.exportType }}</small>
          </div>
        </div>

        <div class="form-section">
          <h4>Schedule Configuration</h4>

          <!-- Frequency -->
          <div class="field">
            <label for="frequency">Frequency *</label>
            <Dropdown
              id="frequency"
              v-model="currentSchedule.frequency"
              :options="frequencyOptions"
              option-label="name"
              option-value="value"
              placeholder="Select frequency"
              class="w-full"
              :class="{ 'p-invalid': errors.frequency }"
            />
            <small v-if="errors.frequency" class="p-error">{{ errors.frequency }}</small>
          </div>

          <!-- Time Configuration -->
          <div class="time-config" v-if="currentSchedule.frequency">
            <!-- Daily -->
            <div v-if="currentSchedule.frequency === 'daily'" class="field">
              <label for="dailyTime">Time of Day</label>
              <InputMask
                id="dailyTime"
                v-model="currentSchedule.timeConfig.dailyTime"
                mask="99:99"
                placeholder="HH:MM"
                class="w-full"
              />
            </div>

            <!-- Weekly -->
            <div v-if="currentSchedule.frequency === 'weekly'" class="field-grid">
              <div class="field">
                <label for="weeklyDay">Day of Week</label>
                <Dropdown
                  id="weeklyDay"
                  v-model="currentSchedule.timeConfig.weeklyDay"
                  :options="dayOfWeekOptions"
                  option-label="name"
                  option-value="value"
                  placeholder="Select day"
                  class="w-full"
                />
              </div>
              <div class="field">
                <label for="weeklyTime">Time</label>
                <InputMask
                  id="weeklyTime"
                  v-model="currentSchedule.timeConfig.weeklyTime"
                  mask="99:99"
                  placeholder="HH:MM"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Monthly -->
            <div v-if="currentSchedule.frequency === 'monthly'" class="field-grid">
              <div class="field">
                <label for="monthlyDay">Day of Month</label>
                <Dropdown
                  id="monthlyDay"
                  v-model="currentSchedule.timeConfig.monthlyDay"
                  :options="dayOfMonthOptions"
                  option-label="name"
                  option-value="value"
                  placeholder="Select day"
                  class="w-full"
                />
              </div>
              <div class="field">
                <label for="monthlyTime">Time</label>
                <InputMask
                  id="monthlyTime"
                  v-model="currentSchedule.timeConfig.monthlyTime"
                  mask="99:99"
                  placeholder="HH:MM"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>Export Options</h4>

          <!-- Format -->
          <div class="field">
            <label for="format">Export Format</label>
            <Dropdown
              id="format"
              v-model="currentSchedule.format"
              :options="formatOptions"
              option-label="name"
              option-value="value"
              placeholder="Select format"
              class="w-full"
            />
          </div>

          <!-- Email Delivery -->
          <div class="field">
            <label for="emailEnabled">Email Delivery</label>
            <div class="email-config">
              <div class="field-checkbox">
                <Checkbox
                  id="emailEnabled"
                  v-model="currentSchedule.emailEnabled"
                />
                <label for="emailEnabled">Send export via email</label>
              </div>

              <div v-if="currentSchedule.emailEnabled" class="email-fields">
                <InputText
                  v-model="currentSchedule.emailRecipients"
                  placeholder="email@example.com, another@example.com"
                  class="w-full"
                />
                <small class="help-text">Separate multiple emails with commas</small>
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <Button
            label="Cancel"
            icon="pi pi-times"
            class="p-button-text"
            @click="closeScheduleDialog"
          />
          <Button
            :label="isEditing ? 'Update Schedule' : 'Create Schedule'"
            icon="pi pi-check"
            class="p-button-primary"
            :loading="saving"
            @click="saveSchedule"
          />
        </div>
      </div>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirm Delete"
      :modal="true"
      class="delete-dialog"
      :style="{ width: '400px' }"
    >
      <div class="delete-content" v-if="scheduleToDelete">
        <i class="pi pi-exclamation-triangle warning-icon"></i>
        <div>
          <h4>Delete Scheduled Export</h4>
          <p>Are you sure you want to delete the schedule "{{ scheduleToDelete.name }}"?</p>
          <p class="warning-text">This action cannot be undone.</p>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="closeDeleteDialog"
        />
        <Button
          label="Delete"
          icon="pi pi-trash"
          class="p-button-danger"
          :loading="deleting"
          @click="confirmDelete"
        />
      </template>
    </Dialog>

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
        <v-btn
          variant="text"
          @click="snackbar.visible = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
// Using Vuetify snackbar instead of PrimeVue toast
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import InputMask from 'primevue/inputmask'
import Checkbox from 'primevue/checkbox'

const toast = useToast()

export interface ScheduledExport {
  id: string
  name: string
  description: string
  exportType: string
  frequency: 'daily' | 'weekly' | 'monthly'
  format: 'csv' | 'xlsx' | 'json'
  status: 'active' | 'paused' | 'error'
  nextRun: string
  lastRun?: string
  lastStatus?: 'success' | 'failed'
  emailEnabled: boolean
  emailRecipients: string
  timeConfig: {
    dailyTime?: string
    weeklyDay?: number
    weeklyTime?: string
    monthlyDay?: number
    monthlyTime?: string
  }
  createdAt: string
  updatedAt: string
}

// Reactive data
const scheduledExports = ref<ScheduledExport[]>([])
const loading = ref(false)
const showScheduleDialog = ref(false)
const showDeleteDialog = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const currentSchedule = ref<ScheduledExport | null>(null)
const scheduleToDelete = ref<ScheduledExport | null>(null)
const errors = reactive<Record<string, string>>({})

// Vuetify snackbar state
const snackbar = ref({
  visible: false,
  color: 'success',
  message: '',
  icon: 'mdi-check-circle'
})

// Filters
const filters = ref({
  global: { value: null }
})

// Options for dropdowns
const exportTypeOptions = [
  { name: 'Medical Institutions', value: 'institutions' },
  { name: 'Contacts', value: 'contacts' },
  { name: 'Tasks', value: 'tasks' },
  { name: 'Quotes', value: 'quotes' },
  { name: 'Invoices', value: 'invoices' }
]

const frequencyOptions = [
  { name: 'Daily', value: 'daily' },
  { name: 'Weekly', value: 'weekly' },
  { name: 'Monthly', value: 'monthly' }
]

const formatOptions = [
  { name: 'CSV (Comma Separated Values)', value: 'csv' },
  { name: 'Excel (XLSX)', value: 'xlsx' },
  { name: 'JSON (Structured Data)', value: 'json' }
]

const dayOfWeekOptions = [
  { name: 'Monday', value: 1 },
  { name: 'Tuesday', value: 2 },
  { name: 'Wednesday', value: 3 },
  { name: 'Thursday', value: 4 },
  { name: 'Friday', value: 5 },
  { name: 'Saturday', value: 6 },
  { name: 'Sunday', value: 0 }
]

const dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({
  name: `${i + 1}${getOrdinalSuffix(i + 1)}`,
  value: i + 1
}))

// Methods
const showNotification = (message: string, color: string = 'success', icon: string = 'mdi-check-circle') => {
  snackbar.value = {
    visible: true,
    color,
    message,
    icon
  }
}

const getExportTypeName = (type: string) => {
  const names = {
    institutions: 'Medical Institutions',
    contacts: 'Contacts',
    tasks: 'Tasks',
    quotes: 'Quotes',
    invoices: 'Invoices'
  }
  return names[type as keyof typeof names] || type
}

const getFrequencyLabel = (frequency: string) => {
  const labels = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly'
  }
  return labels[frequency as keyof typeof labels] || frequency
}

const getOrdinalSuffix = (num: number) => {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

const formatDateTime = (date: string) => {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return String(date)
  }
}

const openScheduleDialog = () => {
  isEditing.value = false
  currentSchedule.value = {
    id: '',
    name: '',
    description: '',
    exportType: '',
    frequency: 'daily',
    format: 'csv',
    status: 'active',
    nextRun: '',
    emailEnabled: false,
    emailRecipients: '',
    timeConfig: {},
    createdAt: '',
    updatedAt: ''
  }
  errors.value = {}
  showScheduleDialog.value = true
}

const editSchedule = (schedule: ScheduledExport) => {
  isEditing.value = true
  currentSchedule.value = { ...schedule }
  errors.value = {}
  showScheduleDialog.value = true
}

const duplicateSchedule = (schedule: ScheduledExport) => {
  isEditing.value = false
  currentSchedule.value = {
    ...schedule,
    id: '',
    name: `${schedule.name} (Copy)`,
    status: 'active',
    createdAt: '',
    updatedAt: ''
  }
  errors.value = {}
  showScheduleDialog.value = true
}

const closeScheduleDialog = () => {
  showScheduleDialog.value = false
  currentSchedule.value = null
  errors.value = {}
}

const validateSchedule = () => {
  errors.value = {}

  if (!currentSchedule.value?.name?.trim()) {
    errors.value.name = 'Schedule name is required'
  }

  if (!currentSchedule.value?.exportType) {
    errors.value.exportType = 'Export type is required'
  }

  if (!currentSchedule.value?.frequency) {
    errors.value.frequency = 'Frequency is required'
  }

  return Object.keys(errors.value).length === 0
}

const saveSchedule = async () => {
  if (!currentSchedule.value || !validateSchedule()) return

  saving.value = true

  try {
    if (isEditing.value) {
      // Update existing schedule
      const index = scheduledExports.value.findIndex(s => s.id === currentSchedule.value!.id)
      if (index !== -1) {
        scheduledExports.value[index] = {
          ...currentSchedule.value,
          updatedAt: new Date().toISOString()
        }
      }
    } else {
      // Create new schedule
      const newSchedule: ScheduledExport = {
        ...currentSchedule.value,
        id: `schedule-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nextRun: calculateNextRun(currentSchedule.value)
      }
      scheduledExports.value.push(newSchedule)
    }

    showNotification(
      `Scheduled export "${currentSchedule.value.name}" has been ${isEditing.value ? 'updated' : 'created'}`,
      'success',
      'mdi-check-circle'
    )

    closeScheduleDialog()
    loadScheduledExports()

  } catch (error) {
    console.error('Error saving schedule:', error)
    showNotification(
      'Failed to save scheduled export',
      'error',
      'mdi-alert-circle'
    )
  } finally {
    saving.value = false
  }
}

const calculateNextRun = (schedule: ScheduledExport): string => {
  const now = new Date()
  let nextRun = new Date(now)

  switch (schedule.frequency) {
    case 'daily':
      if (schedule.timeConfig.dailyTime) {
        const [hours, minutes] = schedule.timeConfig.dailyTime.split(':').map(Number)
        nextRun.setHours(hours, minutes, 0, 0)
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
      }
      break

    case 'weekly':
      if (schedule.timeConfig.weeklyDay !== undefined && schedule.timeConfig.weeklyTime) {
        const [hours, minutes] = schedule.timeConfig.weeklyTime.split(':').map(Number)
        const daysUntilTarget = (schedule.timeConfig.weeklyDay - now.getDay() + 7) % 7
        nextRun.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))
        nextRun.setHours(hours, minutes, 0, 0)
      }
      break

    case 'monthly':
      if (schedule.timeConfig.monthlyDay && schedule.timeConfig.monthlyTime) {
        const [hours, minutes] = schedule.timeConfig.monthlyTime.split(':').map(Number)
        nextRun.setDate(schedule.timeConfig.monthlyDay)
        nextRun.setHours(hours, minutes, 0, 0)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
      }
      break
  }

  return nextRun.toISOString()
}

const pauseSchedule = (schedule: ScheduledExport) => {
  const index = scheduledExports.value.findIndex(s => s.id === schedule.id)
  if (index !== -1) {
    scheduledExports.value[index].status = 'paused'
    showNotification(
      `Scheduled export "${schedule.name}" has been paused`,
      'info',
      'mdi-pause-circle'
    )
  }
}

const resumeSchedule = (schedule: ScheduledExport) => {
  const index = scheduledExports.value.findIndex(s => s.id === schedule.id)
  if (index !== -1) {
    scheduledExports.value[index].status = 'active'
    scheduledExports.value[index].nextRun = calculateNextRun(schedule)
    showNotification(
      `Scheduled export "${schedule.name}" has been resumed`,
      'success',
      'mdi-play-circle'
    )
  }
}

const deleteSchedule = (schedule: ScheduledExport) => {
  scheduleToDelete.value = schedule
  showDeleteDialog.value = true
}

const closeDeleteDialog = () => {
  showDeleteDialog.value = false
  scheduleToDelete.value = null
}

const confirmDelete = async () => {
  if (!scheduleToDelete.value) return

  deleting.value = true

  try {
    const index = scheduledExports.value.findIndex(s => s.id === scheduleToDelete.value!.id)
    if (index !== -1) {
      scheduledExports.value.splice(index, 1)
    }

    showNotification(
      `Scheduled export "${scheduleToDelete.value.name}" has been deleted`,
      'success',
      'mdi-delete'
    )

    closeDeleteDialog()

  } catch (error) {
    console.error('Error deleting schedule:', error)
    showNotification(
      'Failed to delete scheduled export',
      'error',
      'mdi-alert-circle'
    )
  } finally {
    deleting.value = false
  }
}

const loadScheduledExports = async () => {
  loading.value = true
  try {
    // Mock data - in real implementation, this would come from backend
    scheduledExports.value = [
      {
        id: 'schedule-001',
        name: 'Weekly Institution Report',
        description: 'Weekly export of all medical institutions',
        exportType: 'institutions',
        frequency: 'weekly',
        format: 'xlsx',
        status: 'active',
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lastStatus: 'success',
        emailEnabled: true,
        emailRecipients: 'admin@example.com, manager@example.com',
        timeConfig: {
          weeklyDay: 1, // Monday
          weeklyTime: '09:00'
        },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'schedule-002',
        name: 'Monthly Task Summary',
        description: 'Monthly summary of all tasks',
        exportType: 'tasks',
        frequency: 'monthly',
        format: 'csv',
        status: 'active',
        nextRun: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        emailEnabled: false,
        emailRecipients: '',
        timeConfig: {
          monthlyDay: 1,
          monthlyTime: '08:00'
        },
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  } catch (error) {
    console.error('Failed to load scheduled exports:', error)
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadScheduledExports()
})
</script>

<style scoped>
.export-scheduler {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.scheduler-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
}

.scheduler-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.scheduler-actions {
  display: flex;
  justify-content: flex-end;
}

.scheduled-exports {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1rem;
}

.schedule-name strong {
  display: block;
  color: #374151;
}

.schedule-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.export-type-badge,
.frequency-badge,
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.export-type-badge.institutions { background: #dbeafe; color: #1e40af; }
.export-type-badge.contacts { background: #dcfce7; color: #166534; }
.export-type-badge.tasks { background: #fef3c7; color: #92400e; }
.export-type-badge.quotes { background: #fce7f3; color: #be185d; }
.export-type-badge.invoices { background: #e0e7ff; color: #3730a3; }

.frequency-badge.daily { background: #dbeafe; color: #1e40af; }
.frequency-badge.weekly { background: #dcfce7; color: #166534; }
.frequency-badge.monthly { background: #fef3c7; color: #92400e; }

.status-badge.active { background: #dcfce7; color: #166534; }
.status-badge.paused { background: #fef3c7; color: #92400e; }
.status-badge.error { background: #fee2e2; color: #dc2626; }

.last-run {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.run-status {
  font-size: 0.75rem;
  font-weight: 400;
}

.run-status.success { color: #166534; }
.run-status.failed { color: #dc2626; }

.no-run {
  color: #6b7280;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.schedule-dialog {
  max-height: 90vh;
  overflow-y: auto;
}

.schedule-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 0.5rem;
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

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.time-config {
  margin-top: 1rem;
}

.email-config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

.email-fields {
  margin-left: 1.75rem;
}

.help-text {
  color: #6b7280;
  font-size: 0.75rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.delete-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 0;
}

.warning-icon {
  color: #f59e0b;
  font-size: 1.5rem;
  margin-top: 0.125rem;
}

.delete-content h4 {
  margin: 0 0 0.5rem 0;
  color: #374151;
  font-weight: 600;
}

.delete-content p {
  margin: 0 0 0.5rem 0;
  color: #6b7280;
}

.warning-text {
  color: #dc2626;
  font-weight: 500;
}

/* Responsive design */
@media (max-width: 768px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .delete-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>