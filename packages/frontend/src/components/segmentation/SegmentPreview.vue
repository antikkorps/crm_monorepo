<template>
  <div class="segment-preview">
    <!-- Stats Cards - Horizontal on mobile -->
    <div class="stats-row">
      <div class="stat-card stat-total">
        <div class="stat-value primary--text">
          {{ loading ? '...' : formatNumber(previewData.count) }}
        </div>
        <div class="stat-label">
          {{ $t('segmentation.preview.totalRecords') }}
        </div>
      </div>

      <div class="stat-card stat-active">
        <div class="stat-value success--text">
          {{ loading ? '...' : formatNumber(activeCount) }}
        </div>
        <div class="stat-label">
          {{ $t('segmentation.preview.activeRecords') }}
        </div>
      </div>

      <div class="stat-card stat-percent">
        <div class="stat-value info--text">
          {{ loading ? '...' : formatPercentage(matchPercentage) }}
        </div>
        <div class="stat-label">
          {{ $t('segmentation.preview.matchPercentage') }}
        </div>
      </div>
    </div>

    <!-- Sample Records -->
    <div class="sample-records mt-4" v-if="!loading && previewData.sampleRecords.length > 0">
      <div class="sample-header">
        <span class="sample-title">{{ $t('segmentation.preview.sampleRecords') }}</span>
        <v-btn
          variant="text"
          size="small"
          color="primary"
          @click="refreshPreview"
          :loading="loading"
          class="refresh-btn"
        >
          <v-icon start size="small">mdi-refresh</v-icon>
          <span class="d-none d-sm-inline">{{ $t('segmentation.preview.refresh') }}</span>
        </v-btn>
      </div>

      <!-- Mobile: Card list view -->
      <div class="sample-list d-md-none">
        <div
          v-for="(item, index) in previewData.sampleRecords.slice(0, 5)"
          :key="index"
          class="sample-item"
        >
          <div class="sample-item-header">
            <v-icon
              v-if="segmentType === 'institution'"
              size="small"
              color="primary"
              class="mr-2"
            >
              mdi-hospital-building
            </v-icon>
            <v-icon
              v-else
              size="small"
              color="secondary"
              class="mr-2"
            >
              mdi-account
            </v-icon>
            <span class="sample-item-name">{{ item.name }}</span>
            <v-chip
              size="x-small"
              :color="item.isActive ? 'success' : 'grey'"
              class="ml-auto"
            >
              {{ item.isActive ? $t('common.active') : $t('common.inactive') }}
            </v-chip>
          </div>
          <div class="sample-item-details">
            <v-chip size="x-small" :color="getTypeColor(item.type)" class="mr-1">
              {{ getTypeLabel(item.type) }}
            </v-chip>
            <span v-if="segmentType === 'institution' && item.address?.city" class="text-caption">
              {{ item.address.city }}
            </span>
            <span v-else-if="item.department" class="text-caption">
              {{ item.department }}
            </span>
          </div>
        </div>
      </div>

      <!-- Desktop: Table view -->
      <v-data-table
        class="d-none d-md-block"
        :headers="tableHeaders"
        :items="previewData.sampleRecords"
        :items-per-page="5"
        hide-default-footer
        density="compact"
      >
        <template v-slot:item.name="{ item }">
          <div class="d-flex align-center">
            <v-icon
              v-if="segmentType === 'institution'"
              start
              size="small"
              color="primary"
            >
              mdi-hospital-building
            </v-icon>
            <v-icon
              v-else
              start
              size="small"
              color="secondary"
            >
              mdi-account
            </v-icon>
            {{ item.name }}
          </div>
        </template>

        <template v-slot:item.type="{ item }">
          <v-chip
            size="small"
            :color="getTypeColor(item.type)"
          >
            {{ getTypeLabel(item.type) }}
          </v-chip>
        </template>

        <template v-slot:item.status="{ item }">
          <v-chip
            size="small"
            :color="item.isActive ? 'success' : 'grey'"
          >
            {{ item.isActive ? $t('common.active') : $t('common.inactive') }}
          </v-chip>
        </template>
      </v-data-table>
    </div>

    <!-- Loading State -->
    <v-card outlined class="mt-4" v-else-if="loading">
      <v-card-text class="text-center pa-8">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        />
        <div class="mt-4 text-body-1">
          {{ $t('segmentation.preview.loading') }}
        </div>
      </v-card-text>
    </v-card>

    <!-- Empty State -->
    <v-card outlined class="mt-4" v-else>
      <v-card-text class="text-center pa-8">
        <v-icon size="64" color="grey lighten-1">mdi-database-off</v-icon>
        <div class="mt-4 text-body-1 text-medium-emphasis">
          {{ $t('segmentation.preview.noData') }}
        </div>
        <div class="text-caption">
          {{ $t('segmentation.preview.addFilters') }}
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SegmentType, SegmentCriteria, SegmentPreviewData } from '@medical-crm/shared'
import { segmentationApi } from '@/services/api/segmentation'

const { t } = useI18n()

// Props
interface Props {
  segmentType: SegmentType
  criteria: SegmentCriteria
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  'preview-updated': [data: SegmentPreviewData]
}>()

// Reactive data
const previewData = ref<SegmentPreviewData>({
  count: 0,
  sampleRecords: [],
  lastUpdated: new Date()
})

const activeCount = ref(0)
const totalCount = ref(0)

// Computed
const tableHeaders = computed(() => {
  if (props.segmentType === 'institution') {
    return [
      { text: t('segmentation.preview.name'), value: 'name', width: '40%' },
      { text: t('segmentation.preview.type'), value: 'type', width: '30%' },
      { text: t('segmentation.preview.city'), value: 'address.city', width: '20%' },
      { text: t('segmentation.preview.status'), value: 'status', width: '10%' }
    ]
  } else {
    return [
      { text: t('segmentation.preview.name'), value: 'name', width: '40%' },
      { text: t('segmentation.preview.title'), value: 'title', width: '30%' },
      { text: t('segmentation.preview.department'), value: 'department', width: '20%' },
      { text: t('segmentation.preview.status'), value: 'status', width: '10%' }
    ]
  }
})

const matchPercentage = computed(() => {
  if (totalCount.value === 0) return 0
  return (previewData.value.count / totalCount.value) * 100
})

// Methods
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num)
}

const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`
}

const getTypeColor = (type: string | undefined): string => {
  if (!type) return 'grey'
  const colors: Record<string, string> = {
    'hospital': 'error',
    'clinic': 'warning',
    'medical_center': 'info',
    'specialty_clinic': 'success'
  }
  return colors[type] || 'grey'
}

const getTypeLabel = (type: string | undefined): string => {
  if (!type) return '-'
  const translationKey = `institution.types.${type}`
  const translated = t(translationKey)
  // If translation key is returned (not found), use original value
  return translated !== translationKey ? translated : type
}

const refreshPreview = async () => {
  await loadPreview()
}

const loadPreview = async () => {
  try {
    if (!hasFilters()) {
      // Reset to empty state when no filters
      previewData.value = {
        count: 0,
        sampleRecords: [],
        lastUpdated: new Date()
      }
      activeCount.value = 0
      totalCount.value = 0
      emit('preview-updated', previewData.value)
      return
    }

    // Call real backend API
    const response = await segmentationApi.previewSegment(props.segmentType, props.criteria)

    if (response.data) {
      previewData.value = {
        count: response.data.total || 0,
        sampleRecords: response.data.sample || [],
        lastUpdated: new Date()
      }
      activeCount.value = response.data.activeCount || 0
      totalCount.value = response.data.summary?.totalRecords || response.data.total || 0
    }

    emit('preview-updated', previewData.value)
  } catch (error) {
    console.error('Error loading preview:', error)
    // Reset to empty on error
    previewData.value = {
      count: 0,
      sampleRecords: [],
      lastUpdated: new Date()
    }
    activeCount.value = 0
    totalCount.value = 0
    emit('preview-updated', previewData.value)
  }
}

const hasFilters = (): boolean => {
  const criteria = props.criteria
  return !!(
    (criteria.institutionFilters && Object.keys(criteria.institutionFilters).length > 0) ||
    (criteria.contactFilters && Object.keys(criteria.contactFilters).length > 0) ||
    (criteria.combinedFilters && Object.keys(criteria.combinedFilters).length > 0)
  )
}

// Watchers
watch(() => props.criteria, () => {
  loadPreview()
}, { deep: true })

watch(() => props.segmentType, () => {
  loadPreview()
})

// Initialize
onMounted(() => {
  loadPreview()
})
</script>

<style scoped>
.segment-preview {
  min-height: 100px;
}

/* Stats Row - Horizontal layout */
.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 16px 12px;
  background: var(--p-surface-0, #fff);
  border: 1px solid var(--p-surface-border, rgba(0,0,0,0.12));
  border-radius: 8px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color, rgba(0,0,0,0.6));
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sample Records Section */
.sample-records {
  background: var(--p-surface-0, #fff);
  border: 1px solid var(--p-surface-border, rgba(0,0,0,0.12));
  border-radius: 8px;
  overflow: hidden;
}

.sample-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--p-surface-border, rgba(0,0,0,0.08));
  background: var(--p-surface-50, #fafafa);
}

.sample-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color, rgba(0,0,0,0.87));
}

.refresh-btn {
  min-width: auto;
}

/* Mobile Card List */
.sample-list {
  padding: 8px;
}

.sample-item {
  padding: 10px 12px;
  background: var(--p-surface-50, #fafafa);
  border-radius: 6px;
  margin-bottom: 8px;
}

.sample-item:last-child {
  margin-bottom: 0;
}

.sample-item-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.sample-item-name {
  font-weight: 500;
  font-size: 0.875rem;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
}

.sample-item-details {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 28px;
}

/* Desktop Table */
.sample-records :deep(.v-data-table) {
  background: transparent;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .stats-row {
    gap: 8px;
  }

  .stat-card {
    padding: 10px 8px;
    border-radius: 6px;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.6875rem;
  }

  .sample-header {
    padding: 10px 12px;
  }

  .sample-title {
    font-size: 0.875rem;
  }

  .sample-list {
    padding: 6px;
  }

  .sample-item {
    padding: 8px 10px;
  }

  .sample-item-name {
    font-size: 0.8125rem;
  }

  .sample-item-details {
    padding-left: 24px;
  }
}

/* Loading and Empty states */
.segment-preview :deep(.v-card.mt-4) {
  border-radius: 8px;
}

@media (max-width: 600px) {
  .segment-preview :deep(.v-card.mt-4 .v-card-text) {
    padding: 1.5rem 1rem;
  }

  .segment-preview :deep(.v-card.mt-4 .v-icon) {
    font-size: 48px !important;
  }
}
</style>