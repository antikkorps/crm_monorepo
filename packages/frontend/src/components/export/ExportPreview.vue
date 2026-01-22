<template>
  <div class="export-preview">
    <div class="preview-header">
      <div class="header-info">
        <h3>{{ $t('export.preview.title') }}</h3>
        <p class="preview-description">
          {{ $t('export.preview.description', { count: data.length }) }}
        </p>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-label">{{ $t('export.preview.totalRecords') }}</span>
          <span class="stat-value">{{ totalRecords.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('export.preview.format') }}</span>
          <span class="stat-value">{{ format.toUpperCase() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">{{ $t('export.preview.estimatedSize') }}</span>
          <span class="stat-value">{{ estimatedSize }}</span>
        </div>
      </div>
    </div>

    <div class="preview-content">
      <!-- Table Preview -->
      <div class="table-container" v-if="data.length > 0">
        <v-data-table
          :items="data"
          :headers="tableHeaders"
          class="preview-table"
          density="compact"
          height="400"
          fixed-header
        >
          <template #item="{ item, index }">
            <tr>
              <td
                v-for="column in columns"
                :key="column.field"
                :style="column.style"
                class="text-body-2"
              >
                <span v-if="column.type === 'date'">
                  {{ formatDate(item[column.field]) }}
                </span>
                <span v-else-if="column.type === 'currency'">
                  {{ formatCurrency(item[column.field]) }}
                </span>
                <span v-else-if="column.type === 'boolean'">
                  <v-icon
                    :color="item[column.field] ? 'success' : 'error'"
                    size="small"
                  >
                    {{ item[column.field] ? 'mdi-check' : 'mdi-close' }}
                  </v-icon>
                </span>
                <span v-else>
                  {{ item[column.field] || '-' }}
                </span>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>

      <!-- JSON Preview -->
      <div class="json-container" v-else-if="format === 'json' && data.length > 0">
        <pre class="json-preview">{{ JSON.stringify(data.slice(0, 3), null, 2) }}</pre>
        <p class="json-note">
          <v-icon size="small" class="mr-1">mdi-information</v-icon>
          {{ $t('export.preview.jsonNote', { count: totalRecords }) }}
        </p>
      </div>

      <!-- CSV Preview -->
      <div class="csv-container" v-else-if="format === 'csv' && data.length > 0">
        <pre class="csv-preview">{{ generateCSVPreview() }}</pre>
        <p class="csv-note">
          <v-icon size="small" class="mr-1">mdi-information</v-icon>
          {{ $t('export.preview.csvNote', { columns: columns.length, count: totalRecords }) }}
        </p>
      </div>

      <!-- No Data -->
      <div class="no-data" v-if="data.length === 0">
        <div class="no-data-content">
          <v-icon size="3rem" color="grey" class="mb-3">mdi-inbox</v-icon>
          <h4>{{ $t('export.preview.noData') }}</h4>
          <p>{{ $t('export.preview.noDataDescription') }}</p>
        </div>
      </div>
    </div>

    <!-- Field Selection -->
    <div class="field-selection" v-if="availableFields.length > 0">
      <div class="field-selection-header">
        <div>
          <h4>{{ $t('export.preview.fieldSelection') }}</h4>
          <p class="field-description">
            {{ $t('export.preview.fieldSelectionDescription') }}
          </p>
        </div>
        <div class="field-actions">
          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-checkbox-multiple-marked"
            @click="selectAllFields"
          >
            {{ $t('export.preview.selectAll') }}
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            color="error"
            prepend-icon="mdi-checkbox-multiple-blank"
            @click="deselectAllFields"
          >
            {{ $t('export.preview.deselectAll') }}
          </v-btn>
          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-refresh"
            @click="resetToDefault"
          >
            {{ $t('export.preview.resetDefault') }}
          </v-btn>
        </div>
      </div>

      <div class="field-grid">
        <div
          v-for="field in availableFields"
          :key="field.key"
          class="field-item"
        >
          <v-checkbox
            v-model="selectedFields"
            :value="field.key"
            :disabled="field.required"
            :label="field.label + (field.type ? ` (${field.type})` : '')"
            density="compact"
            hide-details
          />
          <v-icon
            v-if="field.required"
            color="warning"
            size="small"
            class="ml-1"
            :title="$t('export.preview.requiredField')"
          >
            mdi-star
          </v-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

export interface PreviewData {
  [key: string]: any
}

export interface FieldDefinition {
  key: string
  label: string
  type?: 'string' | 'number' | 'date' | 'currency' | 'boolean'
  required?: boolean
  width?: string
}

interface Props {
  data: PreviewData[]
  totalRecords: number
  format: 'csv' | 'xlsx' | 'json'
  availableFields?: FieldDefinition[]
  selectedFields?: string[]
}

interface Emits {
  (e: 'update:selectedFields', value: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  availableFields: () => [],
  selectedFields: () => []
})

const emit = defineEmits<Emits>()

// Reactive data
const selectedFields = ref<string[]>([...props.selectedFields])

// Computed properties
const columns = computed(() => {
  if (props.availableFields.length === 0) {
    // Auto-generate columns from data
    if (props.data.length === 0) return []

    const firstRow = props.data[0]
    return Object.keys(firstRow).map(key => ({
      field: key,
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      type: inferType(firstRow[key]),
      style: 'min-width: 120px'
    }))
  }

  // Use provided field definitions
  return props.availableFields
    .filter(field => selectedFields.value.includes(field.key))
    .map(field => ({
      field: field.key,
      header: field.label,
      type: field.type,
      style: field.width ? `width: ${field.width}` : 'min-width: 120px'
    }))
})

const tableHeaders = computed(() => {
  return columns.value.map(col => ({
    title: col.header,
    key: col.field,
    width: col.style?.includes('width') ? col.style : undefined,
    sortable: false
  }))
})

const estimatedSize = computed(() => {
  if (props.totalRecords === 0) return '0 KB'

  // Rough estimation based on format and record count
  const avgRecordSize = props.format === 'json' ? 500 : 200
  const totalBytes = props.totalRecords * avgRecordSize
  const sizeInKB = Math.round(totalBytes / 1024)

  if (sizeInKB < 1024) {
    return `${sizeInKB} KB`
  } else {
    return `${Math.round(sizeInKB / 1024)} MB`
  }
})

// Methods
const inferType = (value: any): string => {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (Date.parse(value)) return 'date'
  return 'string'
}

const formatDate = (date: string | Date) => {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return String(date)
  }
}

const formatCurrency = (amount: number) => {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

const generateCSVPreview = (): string => {
  if (props.data.length === 0) return ''

  const headers = columns.value.map(col => col.header)
  const rows = props.data.slice(0, 5).map(row =>
    columns.value.map(col => {
      const value = row[col.field]
      if (col.type === 'date') return formatDate(value)
      if (col.type === 'currency') return formatCurrency(value)
      return value || ''
    })
  )

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  return csvContent
}

const selectAllFields = () => {
  selectedFields.value = props.availableFields.map(field => field.key)
  emit('update:selectedFields', selectedFields.value)
}

const deselectAllFields = () => {
  selectedFields.value = props.availableFields
    .filter(field => field.required)
    .map(field => field.key)
  emit('update:selectedFields', selectedFields.value)
}

const resetToDefault = () => {
  selectedFields.value = props.availableFields
    .filter(field => field.required !== false)
    .map(field => field.key)
  emit('update:selectedFields', selectedFields.value)
}

// Watchers
watch(() => props.selectedFields, (newValue) => {
  selectedFields.value = [...newValue]
})

watch(selectedFields, (newValue) => {
  emit('update:selectedFields', newValue)
}, { deep: true })

// Lifecycle
onMounted(() => {
  if (selectedFields.value.length === 0 && props.availableFields.length > 0) {
    // Initialize with all fields selected by default
    selectedFields.value = props.availableFields.map(field => field.key)
    emit('update:selectedFields', selectedFields.value)
  }
})
</script>

<style scoped>
.export-preview {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
}

.header-info h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
}

.preview-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.header-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.preview-content {
  border: 1px solid #e9ecef;
  border-radius: 0.5rem;
  overflow: hidden;
}

.table-container {
  max-height: 400px;
  overflow: auto;
}

.preview-table {
  font-size: 0.875rem;
}

.preview-table :deep(.v-data-table__thead > tr > th) {
  background: #f8f9fa;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e9ecef;
  padding: 0.75rem;
  position: sticky;
  top: 0;
  z-index: 1;
}

.preview-table :deep(.v-data-table__tbody > tr > td) {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.preview-table :deep(.v-data-table__tbody > tr:nth-child(even)) {
  background: #f8f9fa;
}

.preview-table :deep(.v-data-table__tbody > tr:hover) {
  background: #e3f2fd;
}

.json-container,
.csv-container {
  padding: 1rem;
  background: #f8f9fa;
}

.json-preview,
.csv-preview {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 0.25rem;
  padding: 1rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.75rem;
  line-height: 1.5;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.json-note,
.csv-note {
  margin: 0.75rem 0 0 0;
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.json-note i,
.csv-note i {
  color: #3b82f6;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  background: #f8f9fa;
}

.no-data-content {
  text-align: center;
}

.no-data-icon {
  font-size: 3rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.no-data-content h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
}

.no-data-content p {
  margin: 0;
  color: #6b7280;
}

.field-selection {
  padding: 1.5rem;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 0.5rem;
}

.field-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.field-selection h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.field-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border: 1px solid #e9ecef;
  border-radius: 0.25rem;
  background: #f8f9fa;
}

.field-item:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  cursor: pointer;
  font-size: 0.875rem;
}

.field-name {
  font-weight: 500;
  color: #374151;
}

.field-type {
  color: #6b7280;
  font-size: 0.75rem;
}

.field-required {
  color: #dc2626;
  font-size: 0.75rem;
}

.field-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* Responsive design */
@media (max-width: 768px) {
  .preview-header {
    flex-direction: column;
    gap: 1rem;
  }

  .header-stats {
    justify-content: center;
    flex-wrap: wrap;
  }

  .field-selection-header {
    flex-direction: column;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .field-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>