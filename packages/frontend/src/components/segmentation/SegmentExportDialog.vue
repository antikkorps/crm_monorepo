<template>
  <v-dialog
    v-model="dialog"
    max-width="800px"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-download</v-icon>
        {{ $t('segmentation.export.title') }}
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div class="mb-4">
          <div class="text-h6 mb-2">{{ segment?.name }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ $t('segmentation.export.description', { count: segment?.stats?.totalCount || 0 }) }}
          </div>
        </div>

        <!-- Export Format -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-select
              v-model="exportConfig.format"
              :items="formatOptions"
              :label="$t('segmentation.export.format')"
              outlined
              dense
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="exportConfig.filename"
              :label="$t('segmentation.export.filename')"
              :placeholder="getDefaultFilename()"
              outlined
              dense
            />
          </v-col>
        </v-row>

        <!-- Field Selection -->
        <v-card outlined class="mb-4">
          <v-card-title class="text-h6 pb-2">
            {{ $t('segmentation.export.fields.title') }}
          </v-card-title>
          <v-card-text>
            <!-- Quick Select Buttons -->
            <v-row class="mb-3">
              <v-col cols="12">
                <div class="d-flex flex-wrap gap-2">
                  <v-btn
                    small
                    outlined
                    @click="selectAllFields"
                  >
                    {{ $t('segmentation.export.fields.selectAll') }}
                  </v-btn>
                  <v-btn
                    small
                    outlined
                    @click="selectBasicFields"
                  >
                    {{ $t('segmentation.export.fields.selectBasic') }}
                  </v-btn>
                  <v-btn
                    small
                    outlined
                    @click="clearSelection"
                  >
                    {{ $t('segmentation.export.fields.clear') }}
                  </v-btn>
                </div>
              </v-col>
            </v-row>

            <!-- Field Groups -->
            <v-expansion-panels v-model="expandedPanels" multiple>
              <!-- Basic Information -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon left>mdi-information</v-icon>
                  {{ $t('segmentation.export.fields.basicInfo') }}
                  <v-chip small class="ml-2">
                    {{ getSelectedCount('basic') }}/{{ basicFields.length }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col
                      v-for="field in basicFields"
                      :key="field.value"
                      cols="12"
                      md="6"
                    >
                      <v-checkbox
                        v-model="exportConfig.selectedFields"
                        :value="field.value"
                        :label="field.text"
                        dense
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Contact Information -->
              <v-expansion-panel v-if="segment?.type === 'institution'">
                <v-expansion-panel-title>
                  <v-icon left>mdi-account-multiple</v-icon>
                  {{ $t('segmentation.export.fields.contactInfo') }}
                  <v-chip small class="ml-2">
                    {{ getSelectedCount('contact') }}/{{ contactFields.length }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col
                      v-for="field in contactFields"
                      :key="field.value"
                      cols="12"
                      md="6"
                    >
                      <v-checkbox
                        v-model="exportConfig.selectedFields"
                        :value="field.value"
                        :label="field.text"
                        dense
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Medical Information -->
              <v-expansion-panel v-if="segment?.type === 'institution'">
                <v-expansion-panel-title>
                  <v-icon left>mdi-stethoscope</v-icon>
                  {{ $t('segmentation.export.fields.medicalInfo') }}
                  <v-chip small class="ml-2">
                    {{ getSelectedCount('medical') }}/{{ medicalFields.length }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col
                      v-for="field in medicalFields"
                      :key="field.value"
                      cols="12"
                      md="6"
                    >
                      <v-checkbox
                        v-model="exportConfig.selectedFields"
                        :value="field.value"
                        :label="field.text"
                        dense
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Activity Information -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon left>mdi-chart-line</v-icon>
                  {{ $t('segmentation.export.fields.activityInfo') }}
                  <v-chip small class="ml-2">
                    {{ getSelectedCount('activity') }}/{{ activityFields.length }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col
                      v-for="field in activityFields"
                      :key="field.value"
                      cols="12"
                      md="6"
                    >
                      <v-checkbox
                        v-model="exportConfig.selectedFields"
                        :value="field.value"
                        :label="field.text"
                        dense
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Custom Fields -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon left>mdi-cog</v-icon>
                  {{ $t('segmentation.export.fields.customFields') }}
                  <v-chip small class="ml-2">
                    {{ getSelectedCount('custom') }}/{{ customFields.length }}
                  </v-chip>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-row>
                    <v-col
                      v-for="field in customFields"
                      :key="field.value"
                      cols="12"
                      md="6"
                    >
                      <v-checkbox
                        v-model="exportConfig.selectedFields"
                        :value="field.value"
                        :label="field.text"
                        dense
                        hide-details
                      />
                    </v-col>
                  </v-row>
                  <v-alert
                    v-if="customFields.length === 0"
                    type="info"
                    outlined
                    dense
                    class="mt-3"
                  >
                    {{ $t('segmentation.export.fields.noCustomFields') }}
                  </v-alert>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>

        <!-- Export Options -->
        <v-card outlined class="mb-4">
          <v-card-title class="text-h6 pb-2">
            {{ $t('segmentation.export.options.title') }}
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-checkbox
                  v-model="exportConfig.includeHeaders"
                  :label="$t('segmentation.export.options.includeHeaders')"
                  dense
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-checkbox
                  v-model="exportConfig.includeFilters"
                  :label="$t('segmentation.export.options.includeFilters')"
                  dense
                />
              </v-col>
            </v-row>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="exportConfig.dateFormat"
                  :items="dateFormatOptions"
                  :label="$t('segmentation.export.options.dateFormat')"
                  outlined
                  dense
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="exportConfig.delimiter"
                  :label="$t('segmentation.export.options.delimiter')"
                  placeholder=","
                  outlined
                  dense
                  :disabled="exportConfig.format !== 'csv'"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Export Summary -->
        <v-card outlined class="mb-4">
          <v-card-title class="text-h6 pb-2">
            {{ $t('segmentation.export.summary.title') }}
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="6">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold primary--text">
                    {{ exportConfig.selectedFields.length }}
                  </div>
                  <div class="text-caption">{{ $t('segmentation.export.summary.fieldsSelected') }}</div>
                </div>
              </v-col>
              <v-col cols="6">
                <div class="text-center">
                  <div class="text-h6 font-weight-bold success--text">
                    {{ segment?.stats?.totalCount || 0 }}
                  </div>
                  <div class="text-caption">{{ $t('segmentation.export.summary.recordsToExport') }}</div>
                </div>
              </v-col>
            </v-row>
            <v-alert
              type="info"
              outlined
              dense
              class="mt-3"
            >
              {{ $t('segmentation.export.summary.estimatedSize', { size: estimatedFileSize }) }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="close">
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          @click="startExport"
          :loading="exporting"
          :disabled="!canExport"
        >
          <v-icon left>mdi-download</v-icon>
          {{ $t('segmentation.export.startExport') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Segment } from '@medical-crm/shared'

const { t } = useI18n()

// Props
interface Props {
  modelValue: boolean
  segment: Segment | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'export-started': [config: any]
}>()

// Reactive data
const dialog = ref(false)
const expandedPanels = ref([0])
const exporting = ref(false)

const exportConfig = ref({
  format: 'csv',
  filename: '',
  selectedFields: [] as string[],
  includeHeaders: true,
  includeFilters: false,
  dateFormat: 'YYYY-MM-DD',
  delimiter: ','
})

// Mock field data
const basicFields = ref([
  { text: 'Name', value: 'name', group: 'basic' },
  { text: 'Type', value: 'type', group: 'basic' },
  { text: 'Created Date', value: 'createdAt', group: 'basic' },
  { text: 'Updated Date', value: 'updatedAt', group: 'basic' },
  { text: 'Status', value: 'isActive', group: 'basic' }
])

const contactFields = ref([
  { text: 'Primary Contact Name', value: 'primaryContact.name', group: 'contact' },
  { text: 'Primary Contact Email', value: 'primaryContact.email', group: 'contact' },
  { text: 'Primary Contact Phone', value: 'primaryContact.phone', group: 'contact' },
  { text: 'Contact Count', value: 'contactCount', group: 'contact' }
])

const medicalFields = ref([
  { text: 'Bed Capacity', value: 'bedCapacity', group: 'medical' },
  { text: 'Surgical Rooms', value: 'surgicalRooms', group: 'medical' },
  { text: 'Specialties', value: 'specialties', group: 'medical' },
  { text: 'Compliance Status', value: 'complianceStatus', group: 'medical' }
])

const activityFields = ref([
  { text: 'Last Activity Date', value: 'lastActivityDate', group: 'activity' },
  { text: 'Activity Count', value: 'activityCount', group: 'activity' },
  { text: 'Task Count', value: 'taskCount', group: 'activity' },
  { text: 'Meeting Count', value: 'meetingCount', group: 'activity' }
])

const customFields = ref([
  // This would be populated from API
])

// Computed
const formatOptions = computed(() => [
  { text: 'CSV', value: 'csv' },
  { text: 'Excel (XLSX)', value: 'xlsx' },
  { text: 'JSON', value: 'json' }
])

const dateFormatOptions = computed(() => [
  { text: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
  { text: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { text: 'DD/MM/YYYY', value: 'DD/MM/YYYY' }
])

const canExport = computed(() => {
  return exportConfig.value.selectedFields.length > 0 &&
         exportConfig.value.filename.trim().length > 0
})

const estimatedFileSize = computed(() => {
  const recordCount = props.segment?.stats?.totalCount || 0
  const fieldCount = exportConfig.value.selectedFields.length
  const estimatedBytesPerRecord = fieldCount * 50 // Rough estimate
  const totalBytes = recordCount * estimatedBytesPerRecord

  if (totalBytes < 1024) return `${totalBytes} B`
  if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} KB`
  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
})

// Methods
const getDefaultFilename = (): string => {
  const timestamp = new Date().toISOString().split('T')[0]
  return `${props.segment?.name?.toLowerCase().replace(/\s+/g, '_') || 'segment'}_export_${timestamp}`
}

const getSelectedCount = (group: string): number => {
  const groupFields = getFieldsByGroup(group)
  return exportConfig.value.selectedFields.filter(field =>
    groupFields.some(f => f.value === field)
  ).length
}

const getFieldsByGroup = (group: string) => {
  switch (group) {
    case 'basic': return basicFields.value
    case 'contact': return contactFields.value
    case 'medical': return medicalFields.value
    case 'activity': return activityFields.value
    case 'custom': return customFields.value
    default: return []
  }
}

const selectAllFields = () => {
  const allFields = [
    ...basicFields.value,
    ...contactFields.value,
    ...medicalFields.value,
    ...activityFields.value,
    ...customFields.value
  ]
  exportConfig.value.selectedFields = allFields.map(f => f.value)
}

const selectBasicFields = () => {
  exportConfig.value.selectedFields = basicFields.value.map(f => f.value)
}

const clearSelection = () => {
  exportConfig.value.selectedFields = []
}

const startExport = async () => {
  if (!canExport.value) return

  exporting.value = true

  try {
    const config = {
      ...exportConfig.value,
      segmentId: props.segment?.id,
      filename: exportConfig.value.filename || getDefaultFilename()
    }

    emit('export-started', config)
    close()
  } catch (error) {
    console.error('Error starting export:', error)
  } finally {
    exporting.value = false
  }
}

const close = () => {
  dialog.value = false
  emit('update:modelValue', false)
}

// Watchers
watch(() => props.modelValue, (newValue) => {
  dialog.value = newValue
  if (newValue && props.segment) {
    exportConfig.value.filename = getDefaultFilename()
    exportConfig.value.selectedFields = basicFields.value.map(f => f.value)
  }
})

watch(dialog, (newValue) => {
  if (!newValue) {
    emit('update:modelValue', false)
  }
})

// Initialize
onMounted(() => {
  dialog.value = props.modelValue
})
</script>
