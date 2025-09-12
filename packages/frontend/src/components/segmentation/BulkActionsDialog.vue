<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon left>mdi-playlist-check</v-icon>
      {{ $t('segmentation.bulk.title') }}
      <v-spacer />
      <v-btn icon @click="$emit('close')">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text>
      <div class="mb-4">
        <div class="text-h6 mb-2">{{ segment.name }}</div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          {{ $t('segmentation.bulk.description', { count: segment.stats?.totalCount || 0 }) }}
        </div>
      </div>

      <!-- Action Type Selection -->
      <v-row class="mb-4">
        <v-col cols="12">
          <v-select
            v-model="selectedAction"
            :items="availableActions"
            :label="$t('segmentation.bulk.selectAction')"
            outlined
            dense
            item-text="text"
            item-value="value"
          />
        </v-col>
      </v-row>

      <!-- Action Configuration -->
      <v-card outlined class="mb-4" v-if="selectedAction">
        <v-card-text>
          <!-- Assign Tasks -->
          <div v-if="selectedAction === 'assign_tasks'">
            <v-text-field
              v-model="taskConfig.title"
              :label="$t('segmentation.bulk.taskTitle')"
              outlined
              dense
              class="mb-3"
            />
            <v-textarea
              v-model="taskConfig.description"
              :label="$t('segmentation.bulk.taskDescription')"
              outlined
              dense
              rows="3"
              class="mb-3"
            />
            <v-row>
              <v-col cols="6">
                <v-select
                  v-model="taskConfig.priority"
                  :items="priorityOptions"
                  :label="$t('segmentation.bulk.taskPriority')"
                  outlined
                  dense
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="taskConfig.dueDate"
                  :label="$t('segmentation.bulk.taskDueDate')"
                  type="date"
                  outlined
                  dense
                />
              </v-col>
            </v-row>
            <v-select
              v-model="taskConfig.assignedUserId"
              :items="userOptions"
              :label="$t('segmentation.bulk.assignTo')"
              outlined
              dense
              class="mt-3"
              item-text="name"
              item-value="id"
            />
          </div>

          <!-- Send Communications -->
          <div v-if="selectedAction === 'send_communications'">
            <v-select
              v-model="communicationConfig.type"
              :items="communicationTypeOptions"
              :label="$t('segmentation.bulk.communicationType')"
              outlined
              dense
              class="mb-3"
            />
            <v-text-field
              v-model="communicationConfig.subject"
              :label="$t('segmentation.bulk.communicationSubject')"
              outlined
              dense
              class="mb-3"
            />
            <v-textarea
              v-model="communicationConfig.message"
              :label="$t('segmentation.bulk.communicationMessage')"
              outlined
              dense
              rows="5"
              class="mb-3"
            />
            <v-checkbox
              v-model="communicationConfig.includeAttachments"
              :label="$t('segmentation.bulk.includeAttachments')"
              dense
            />
          </div>

          <!-- Update Status -->
          <div v-if="selectedAction === 'update_status'">
            <v-select
              v-model="statusConfig.field"
              :items="statusFieldOptions"
              :label="$t('segmentation.bulk.statusField')"
              outlined
              dense
              class="mb-3"
            />
            <v-text-field
              v-if="statusConfig.field === 'custom_field'"
              v-model="statusConfig.customField"
              :label="$t('segmentation.bulk.customFieldName')"
              outlined
              dense
              class="mb-3"
            />
            <v-text-field
              v-model="statusConfig.value"
              :label="$t('segmentation.bulk.newValue')"
              outlined
              dense
              class="mb-3"
            />
          </div>

          <!-- Export Data -->
          <div v-if="selectedAction === 'export_data'">
            <v-select
              v-model="exportConfig.format"
              :items="exportFormatOptions"
              :label="$t('segmentation.bulk.exportFormat')"
              outlined
              dense
              class="mb-3"
            />
            <v-select
              v-model="exportConfig.fields"
              :items="availableFields"
              :label="$t('segmentation.bulk.exportFields')"
              multiple
              chips
              outlined
              dense
              class="mb-3"
            />
            <v-checkbox
              v-if="segment.type === 'institution'"
              v-model="exportConfig.includeContacts"
              :label="$t('segmentation.bulk.includeContacts')"
              dense
            />
          </div>
        </v-card-text>
      </v-card>

      <!-- Preview -->
      <v-card outlined v-if="selectedAction" class="mb-4">
        <v-card-title class="text-h6">
          {{ $t('segmentation.bulk.preview.title') }}
        </v-card-title>
        <v-card-text>
          <v-alert type="info" outlined dense class="mb-3">
            {{ $t('segmentation.bulk.preview.description', { count: segment.stats?.totalCount || 0 }) }}
          </v-alert>

          <v-row>
            <v-col cols="6">
              <v-text-field
                :value="previewData.affectedCount"
                :label="$t('segmentation.bulk.preview.affectedRecords')"
                readonly
                outlined
                dense
              />
            </v-col>
            <v-col cols="6">
              <v-text-field
                :value="previewData.estimatedTime"
                :label="$t('segmentation.bulk.preview.estimatedTime')"
                readonly
                outlined
                dense
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Confirmation -->
      <v-alert
        v-if="selectedAction"
        type="warning"
        outlined
        class="mb-4"
      >
        <div class="d-flex align-center">
          <v-icon left>mdi-alert</v-icon>
          <div>
            <div class="font-weight-medium">
              {{ $t('segmentation.bulk.confirmation.title') }}
            </div>
            <div class="text-body-2">
              {{ getConfirmationMessage() }}
            </div>
          </div>
        </div>
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn @click="$emit('close')">
        {{ $t('common.cancel') }}
      </v-btn>
      <v-btn
        color="primary"
        @click="executeAction"
        :loading="executing"
        :disabled="!canExecute"
      >
        <v-icon left>mdi-play</v-icon>
        {{ $t('segmentation.bulk.execute') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Segment, BulkOperationOptions } from '@medical-crm/shared'

const { t } = useI18n()

// Props
interface Props {
  segment: Segment
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'close': []
  'action-completed': [result: any]
}>()

// Reactive data
const selectedAction = ref('')
const executing = ref(false)

// Task configuration
const taskConfig = ref({
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  assignedUserId: ''
})

// Communication configuration
const communicationConfig = ref({
  type: 'email',
  subject: '',
  message: '',
  includeAttachments: false
})

// Status update configuration
const statusConfig = ref({
  field: '',
  customField: '',
  value: ''
})

// Export configuration
const exportConfig = ref({
  format: 'csv',
  fields: [] as string[],
  includeContacts: false
})

// Preview data
const previewData = ref({
  affectedCount: 0,
  estimatedTime: '2-3 minutes'
})

// Mock data
const userOptions = ref([
  { id: 'user-1', name: 'John Doe' },
  { id: 'user-2', name: 'Jane Smith' },
  { id: 'user-3', name: 'Bob Johnson' }
])

// Computed
const availableActions = computed(() => [
  { text: t('segmentation.bulk.actions.assignTasks'), value: 'assign_tasks' },
  { text: t('segmentation.bulk.actions.sendCommunications'), value: 'send_communications' },
  { text: t('segmentation.bulk.actions.updateStatus'), value: 'update_status' },
  { text: t('segmentation.bulk.actions.exportData'), value: 'export_data' }
])

const priorityOptions = computed(() => [
  { text: t('task.priority.low'), value: 'low' },
  { text: t('task.priority.medium'), value: 'medium' },
  { text: t('task.priority.high'), value: 'high' }
])

const communicationTypeOptions = computed(() => [
  { text: t('communication.type.email'), value: 'email' },
  { text: t('communication.type.sms'), value: 'sms' }
])

const statusFieldOptions = computed(() => [
  { text: t('segmentation.bulk.statusFields.status'), value: 'status' },
  { text: t('segmentation.bulk.statusFields.priority'), value: 'priority' },
  { text: t('segmentation.bulk.statusFields.category'), value: 'category' },
  { text: t('segmentation.bulk.statusFields.custom'), value: 'custom_field' }
])

const exportFormatOptions = computed(() => [
  { text: 'CSV', value: 'csv' },
  { text: 'Excel', value: 'excel' },
  { text: 'JSON', value: 'json' }
])

const availableFields = computed(() => {
  if (props.segment.type === 'institution') {
    return [
      { text: t('institution.name'), value: 'name' },
      { text: t('institution.type'), value: 'type' },
      { text: t('institution.address'), value: 'address' },
      { text: t('institution.phone'), value: 'phone' },
      { text: t('institution.email'), value: 'email' },
      { text: t('institution.specialties'), value: 'specialties' },
      { text: t('institution.bedCapacity'), value: 'bedCapacity' }
    ]
  } else {
    return [
      { text: t('contact.firstName'), value: 'firstName' },
      { text: t('contact.lastName'), value: 'lastName' },
      { text: t('contact.email'), value: 'email' },
      { text: t('contact.phone'), value: 'phone' },
      { text: t('contact.title'), value: 'title' },
      { text: t('contact.department'), value: 'department' }
    ]
  }
})

const canExecute = computed(() => {
  if (!selectedAction.value) return false

  switch (selectedAction.value) {
    case 'assign_tasks':
      return taskConfig.value.title.trim() && taskConfig.value.assignedUserId
    case 'send_communications':
      return communicationConfig.value.subject.trim() && communicationConfig.value.message.trim()
    case 'update_status':
      return statusConfig.value.field && statusConfig.value.value.trim()
    case 'export_data':
      return exportConfig.value.fields.length > 0
    default:
      return false
  }
})

// Methods
const getConfirmationMessage = (): string => {
  const count = props.segment.stats?.totalCount || 0

  switch (selectedAction.value) {
    case 'assign_tasks':
      return t('segmentation.bulk.confirmation.assignTasks', { count })
    case 'send_communications':
      return t('segmentation.bulk.confirmation.sendCommunications', { count })
    case 'update_status':
      return t('segmentation.bulk.confirmation.updateStatus', { count })
    case 'export_data':
      return t('segmentation.bulk.confirmation.exportData', { count })
    default:
      return ''
  }
}

const executeAction = async () => {
  if (!canExecute.value) return

  executing.value = true

  try {
    let options: BulkOperationOptions

    switch (selectedAction.value) {
      case 'assign_tasks':
        options = {
          operation: 'assign_tasks',
          taskTemplate: {
            title: taskConfig.value.title,
            description: taskConfig.value.description,
            priority: taskConfig.value.priority as 'low' | 'medium' | 'high',
            dueDate: taskConfig.value.dueDate ? new Date(taskConfig.value.dueDate) : undefined
          }
        }
        break

      case 'send_communications':
        options = {
          operation: 'send_communications',
          communicationTemplate: {
            subject: communicationConfig.value.subject,
            message: communicationConfig.value.message,
            type: communicationConfig.value.type as 'email' | 'sms'
          }
        }
        break

      case 'update_status':
        options = {
          operation: 'update_status',
          statusUpdate: {
            field: statusConfig.value.field,
            value: statusConfig.value.value
          }
        }
        break

      case 'export_data':
        options = {
          operation: 'export_data',
          exportOptions: {
            format: exportConfig.value.format as 'csv' | 'excel',
            fields: exportConfig.value.fields,
            includeContacts: exportConfig.value.includeContacts
          }
        }
        break

      default:
        throw new Error('Invalid action')
    }

    // TODO: Call API to execute bulk operation
    console.log('Executing bulk action:', selectedAction.value, options)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    const result = {
      success: true,
      processedCount: props.segment.stats?.totalCount || 0,
      operation: selectedAction.value
    }

    emit('action-completed', result)
  } catch (error) {
    console.error('Error executing bulk action:', error)
  } finally {
    executing.value = false
  }
}

// Watchers
watch(() => selectedAction.value, () => {
  // Reset configurations when action changes
  taskConfig.value = {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedUserId: ''
  }

  communicationConfig.value = {
    type: 'email',
    subject: '',
    message: '',
    includeAttachments: false
  }

  statusConfig.value = {
    field: '',
    customField: '',
    value: ''
  }

  exportConfig.value = {
    format: 'csv',
    fields: [],
    includeContacts: false
  }

  // Update preview data
  previewData.value = {
    affectedCount: props.segment.stats?.totalCount || 0,
    estimatedTime: selectedAction.value === 'export_data' ? '1-2 minutes' : '2-3 minutes'
  }
})
</script>