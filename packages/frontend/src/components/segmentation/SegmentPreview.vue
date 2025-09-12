<template>
  <div class="segment-preview">
    <v-row>
      <v-col cols="12" md="4">
        <v-card outlined class="text-center">
          <v-card-text class="pa-4">
            <div class="text-h4 font-weight-bold primary--text">
              {{ loading ? '...' : formatNumber(previewData.count) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ $t('segmentation.preview.totalRecords') }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card outlined class="text-center">
          <v-card-text class="pa-4">
            <div class="text-h4 font-weight-bold success--text">
              {{ loading ? '...' : formatNumber(activeCount) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ $t('segmentation.preview.activeRecords') }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card outlined class="text-center">
          <v-card-text class="pa-4">
            <div class="text-h4 font-weight-bold info--text">
              {{ loading ? '...' : formatPercentage(matchPercentage) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ $t('segmentation.preview.matchPercentage') }}
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Sample Records -->
    <v-card outlined class="mt-4" v-if="!loading && previewData.sampleRecords.length > 0">
      <v-card-title class="text-h6">
        {{ $t('segmentation.preview.sampleRecords') }}
        <v-spacer />
        <v-btn
          icon
          small
          @click="refreshPreview"
          :loading="loading"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="tableHeaders"
          :items="previewData.sampleRecords"
          :items-per-page="5"
          hide-default-footer
          dense
        >
          <template v-slot:item.name="{ item }">
            <div class="d-flex align-center">
              <v-icon
                v-if="segmentType === 'institution'"
                left
                small
                color="primary"
              >
                mdi-hospital-building
              </v-icon>
              <v-icon
                v-else
                left
                small
                color="secondary"
              >
                mdi-account
              </v-icon>
              {{ item.name }}
            </div>
          </template>

          <template v-slot:item.type="{ item }">
            <v-chip
              small
              :color="getTypeColor(item.type)"
              dark
            >
              {{ getTypeLabel(item.type) }}
            </v-chip>
          </template>

          <template v-slot:item.status="{ item }">
            <v-chip
              small
              :color="item.isActive ? 'success' : 'grey'"
              dark
            >
              {{ item.isActive ? $t('common.active') : $t('common.inactive') }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

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

const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'hospital': 'error',
    'clinic': 'warning',
    'medical_center': 'info',
    'specialty_clinic': 'success'
  }
  return colors[type] || 'grey'
}

const getTypeLabel = (type: string): string => {
  return t(`institution.types.${type}`) || type
}

const refreshPreview = async () => {
  await loadPreview()
}

const loadPreview = async () => {
  try {
    // Simulate API call to get preview data
    // In real implementation, this would call the backend API
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock data for demonstration
    if (hasFilters()) {
      previewData.value = {
        count: Math.floor(Math.random() * 1000) + 100,
        sampleRecords: generateSampleRecords(),
        lastUpdated: new Date()
      }
      activeCount.value = Math.floor(previewData.value.count * 0.8)
      totalCount.value = 5000 // Mock total records in database
    } else {
      previewData.value = {
        count: 0,
        sampleRecords: [],
        lastUpdated: new Date()
      }
      activeCount.value = 0
      totalCount.value = 0
    }

    emit('preview-updated', previewData.value)
  } catch (error) {
    console.error('Error loading preview:', error)
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

const generateSampleRecords = () => {
  const records = []
  const count = Math.min(5, previewData.value.count)

  for (let i = 0; i < count; i++) {
    if (props.segmentType === 'institution') {
      records.push({
        id: `inst_${i + 1}`,
        name: `Hospital ${i + 1}`,
        type: ['hospital', 'clinic', 'medical_center'][Math.floor(Math.random() * 3)],
        address: {
          city: ['Paris', 'Lyon', 'Marseille', 'Toulouse'][Math.floor(Math.random() * 4)]
        },
        isActive: Math.random() > 0.2
      })
    } else {
      records.push({
        id: `contact_${i + 1}`,
        name: `Dr. Smith ${i + 1}`,
        title: ['Director', 'Manager', 'Coordinator'][Math.floor(Math.random() * 3)],
        department: ['Surgery', 'Emergency', 'Administration'][Math.floor(Math.random() * 3)],
        isActive: Math.random() > 0.2
      })
    }
  }

  return records
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
  min-height: 200px;
}
</style>