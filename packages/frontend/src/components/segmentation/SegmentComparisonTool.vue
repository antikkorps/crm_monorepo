<template>
  <div class="segment-comparison-tool">
    <v-card>
      <v-card-title class="comparison-header">
        <div class="header-title">
          <v-icon start>mdi-chart-scatter-plot</v-icon>
          <span>{{ $t('segmentation.comparison.title') }}</span>
        </div>
        <v-btn
          icon
          variant="text"
          size="small"
          @click="refreshComparison"
          :loading="loading"
          :disabled="selectedSegments.length < 2"
          class="refresh-btn"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Segment Selection -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title class="text-h6 pb-2">
                {{ $t('segmentation.comparison.selectSegments') }}
              </v-card-title>
              <v-card-text>
                <v-select
                  v-model="selectedSegments"
                  :items="availableSegments"
                  :label="$t('segmentation.comparison.chooseSegments')"
                  multiple
                  chips
                  variant="outlined"
                  density="compact"
                  item-title="name"
                  item-value="id"
                  :rules="segmentSelectionRules"
                >
                  <template v-slot:selection="{ item }">
                    <v-chip
                      closable
                      @click:close="removeSegment(item.raw)"
                      size="small"
                      :color="getSegmentColor(item.raw)"
                    >
                      <v-icon start size="small">{{ getSegmentIcon(item.raw.type) }}</v-icon>
                      {{ item.raw.name }}
                    </v-chip>
                  </template>
                </v-select>
                <div class="mt-2 text-caption text-medium-emphasis">
                  {{ $t('segmentation.comparison.selectedCount', { count: selectedSegments.length, max: 4 }) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Loading State -->
        <div v-if="loading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary" size="64" />
          <div class="mt-4 text-h6">{{ $t('common.loading') }}</div>
        </div>

        <!-- Comparison Results -->
        <div v-else-if="selectedSegments.length >= 2 && comparisonData.segments.length > 0">
          <!-- Summary Cards -->
          <v-row class="mb-4">
            <v-col
              v-for="(segment, index) in comparisonData.segments"
              :key="segment.id"
              cols="12"
              md="6"
              lg="3"
            >
              <v-card
                outlined
                :class="`segment-summary-card segment-${index + 1}`"
              >
                <v-card-title class="pb-2">
                  <v-icon
                    :color="getSegmentColor(segment)"
                    start
                    size="small"
                  >
                    {{ getSegmentIcon(segment.type) }}
                  </v-icon>
                  <span class="text-truncate">{{ segment.name }}</span>
                </v-card-title>
                <v-card-text class="pt-0">
                  <div class="metric-large">{{ formatNumber(segment.count) }}</div>
                  <div class="metric-label">{{ $t('segmentation.comparison.records') }}</div>
                  <div class="percentage-bar">
                    <v-progress-linear
                      :value="segment.percentage"
                      :color="getSegmentColor(segment)"
                      height="6"
                      class="mt-2"
                    />
                    <div class="percentage-text">{{ segment.percentage.toFixed(1) }}%</div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Overlap Analysis -->
          <v-row class="mb-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="overlap-header">
                  <v-icon start size="small">mdi-set-center</v-icon>
                  {{ $t('segmentation.comparison.overlap.title') }}
                </v-card-title>
                <v-card-text class="pa-0">
                  <!-- Mobile: List view -->
                  <div class="overlap-list d-md-none">
                    <div
                      v-for="overlap in comparisonData.overlaps"
                      :key="overlap.id"
                      class="overlap-item"
                    >
                      <div class="overlap-pair">
                        <span class="segment-name">{{ overlap.segmentAName }}</span>
                        <v-icon size="small" class="mx-2">mdi-arrow-left-right</v-icon>
                        <span class="segment-name">{{ overlap.segmentBName }}</span>
                      </div>
                      <div class="overlap-stats">
                        <div class="overlap-bar-container">
                          <div
                            class="overlap-bar"
                            :style="{ width: overlap.percentage + '%' }"
                          ></div>
                        </div>
                        <div class="overlap-values">
                          <span class="overlap-pct">{{ overlap.percentage.toFixed(0) }}%</span>
                          <span class="overlap-cnt">{{ formatNumber(overlap.count) }} {{ $t('segmentation.comparison.overlap.shared') }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-if="comparisonData.overlaps.length === 0" class="no-overlap">
                      {{ $t('segmentation.comparison.overlap.noData') }}
                    </div>
                  </div>

                  <!-- Desktop: Simple table -->
                  <div class="overlap-table-wrapper d-none d-md-block">
                    <table class="overlap-table">
                      <thead>
                        <tr>
                          <th>{{ $t('segmentation.comparison.overlap.segments') }}</th>
                          <th>{{ $t('segmentation.comparison.overlap.shared') }}</th>
                          <th>{{ $t('segmentation.comparison.overlap.percentage') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="overlap in comparisonData.overlaps" :key="overlap.id">
                          <td class="pair-cell">
                            <span>{{ overlap.segmentAName }}</span>
                            <v-icon size="x-small" class="mx-1">mdi-close</v-icon>
                            <span>{{ overlap.segmentBName }}</span>
                          </td>
                          <td class="count-cell">{{ formatNumber(overlap.count) }}</td>
                          <td class="pct-cell">
                            <div class="pct-bar-wrapper">
                              <div class="pct-bar" :style="{ width: overlap.percentage + '%' }"></div>
                              <span class="pct-value">{{ overlap.percentage.toFixed(1) }}%</span>
                            </div>
                          </td>
                        </tr>
                        <tr v-if="comparisonData.overlaps.length === 0">
                          <td colspan="3" class="text-center text-medium-emphasis pa-4">
                            {{ $t('segmentation.comparison.overlap.noData') }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Insights Section -->
          <v-row class="mb-4">
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="insights-header">
                  <v-icon start size="small">mdi-lightbulb-outline</v-icon>
                  {{ $t('segmentation.comparison.insights.title') }}
                </v-card-title>
                <v-card-text>
                  <div v-if="comparisonData.insights.length > 0" class="insights-grid">
                    <v-alert
                      v-for="insight in comparisonData.insights"
                      :key="insight.id"
                      :type="insight.type"
                      variant="tonal"
                      density="compact"
                      class="insight-alert"
                    >
                      <div class="insight-content">
                        <div class="insight-title">{{ insight.title }}</div>
                        <div class="insight-description">{{ insight.description }}</div>
                      </div>
                    </v-alert>
                  </div>
                  <div v-else class="no-insights">
                    <v-icon size="32" color="grey">mdi-information-outline</v-icon>
                    <span>{{ $t('segmentation.comparison.insights.empty') }}</span>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Detailed Overlap Analysis -->
          <v-row>
            <v-col cols="12">
              <v-card variant="outlined">
                <v-card-title class="text-h6">
                  {{ $t('segmentation.comparison.details.title') }}
                </v-card-title>
                <v-card-text>
                  <v-tabs v-model="activeDetailTab">
                    <v-tab value="unique">{{ $t('segmentation.comparison.details.unique') }}</v-tab>
                    <v-tab value="shared">{{ $t('segmentation.comparison.details.shared') }}</v-tab>
                    <v-tab value="breakdown">{{ $t('segmentation.comparison.details.breakdown') }}</v-tab>
                  </v-tabs>

                  <v-window v-model="activeDetailTab">
                    <!-- Unique Records -->
                    <v-window-item value="unique">
                      <div class="mt-4">
                        <v-table density="compact">
                          <thead>
                            <tr>
                              <th>{{ $t('segmentation.comparison.details.segment') }}</th>
                              <th>{{ $t('segmentation.comparison.details.uniqueCount') }}</th>
                              <th>{{ $t('segmentation.comparison.details.percentage') }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="segment in comparisonData.segments"
                              :key="segment.id"
                            >
                              <td>{{ segment.name }}</td>
                              <td>{{ formatNumber(segment.uniqueCount) }}</td>
                              <td>{{ ((segment.uniqueCount / segment.count) * 100).toFixed(1) }}%</td>
                            </tr>
                          </tbody>
                        </v-table>
                      </div>
                    </v-window-item>

                    <!-- Shared Records -->
                    <v-window-item value="shared">
                      <div class="mt-4">
                        <v-table density="compact">
                          <thead>
                            <tr>
                              <th>{{ $t('segmentation.comparison.details.segmentPair') }}</th>
                              <th>{{ $t('segmentation.comparison.details.sharedCount') }}</th>
                              <th>{{ $t('segmentation.comparison.details.overlapPercentage') }}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="overlap in comparisonData.overlaps"
                              :key="overlap.id"
                            >
                              <td>{{ overlap.segmentAName }} ∩ {{ overlap.segmentBName }}</td>
                              <td>{{ formatNumber(overlap.count) }}</td>
                              <td>{{ overlap.percentage.toFixed(1) }}%</td>
                            </tr>
                          </tbody>
                        </v-table>
                      </div>
                    </v-window-item>

                    <!-- Attribute Breakdown -->
                    <v-window-item value="breakdown">
                      <div class="mt-4">
                        <v-select
                          v-model="selectedAttribute"
                          :items="attributeOptions"
                          :label="$t('segmentation.comparison.details.selectAttribute')"
                          variant="outlined"
                          density="compact"
                          class="mb-4"
                        />
                        <div v-if="selectedAttribute" class="attribute-breakdown">
                          <canvas ref="attributeChartRef" width="800" height="400"></canvas>
                        </div>
                      </div>
                    </v-window-item>
                  </v-window>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Error State -->
        <v-alert v-else-if="error" type="error" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- No Segments Available State -->
        <v-card v-else-if="availableSegments.length === 0" outlined class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-folder-alert-outline</v-icon>
          <div class="mt-4 text-h6">{{ $t('segmentation.comparison.noSegments.title') }}</div>
          <div class="text-body-1 text-medium-emphasis mb-4">
            {{ $t('segmentation.comparison.noSegments.message') }}
          </div>
        </v-card>

        <!-- Not Enough Selected State -->
        <v-card v-else outlined class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1">mdi-chart-scatter-plot</v-icon>
          <div class="mt-4 text-h6">{{ $t('segmentation.comparison.empty.title') }}</div>
          <div class="text-body-1 text-medium-emphasis mb-4">
            {{ $t('segmentation.comparison.empty.message') }}
          </div>
          <v-alert type="info" variant="outlined" density="compact">
            {{ $t('segmentation.comparison.empty.hint') }}
          </v-alert>
        </v-card>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Segment, SegmentType } from '@medical-crm/shared'
import { segmentationApi } from '../../services/api/segmentation'

const { t } = useI18n()

// Segment colors for visualization
const SEGMENT_COLORS = ['#1976D2', '#388E3C', '#FBC02D', '#E53935']

// Props
interface Props {
  segments: Segment[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'segments-selected': [segmentIds: string[]]
}>()

// Reactive data
const selectedSegments = ref<string[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const activeDetailTab = ref('unique')
const selectedAttribute = ref('')
const vennDiagramRef = ref<HTMLCanvasElement>()
const attributeChartRef = ref<HTMLCanvasElement>()

// Use actual segments from props
const availableSegments = computed(() => {
  return props.segments.map((segment, index) => ({
    ...segment,
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length]
  }))
})

const comparisonData = ref({
  segments: [] as any[],
  overlaps: [] as any[],
  insights: [] as any[]
})

// Computed
const segmentSelectionRules = computed(() => [
  (v: string[]) => v.length >= 2 || t('segmentation.comparison.validation.minSegments'),
  (v: string[]) => v.length <= 4 || t('segmentation.comparison.validation.maxSegments')
])

const attributeOptions = computed(() => [
  { title: t('segmentation.comparison.attributes.type'), value: 'type' },
  { title: t('segmentation.comparison.attributes.location'), value: 'location' },
  { title: t('segmentation.comparison.attributes.size'), value: 'size' },
  { title: t('segmentation.comparison.attributes.activity'), value: 'activity' }
])

// Methods
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat().format(num)
}

const getSegmentColor = (segment: any): string => {
  return segment.color || '#1976D2'
}

const getSegmentIcon = (type: SegmentType): string => {
  return type === 'institution' ? 'mdi-hospital-building' : 'mdi-account-multiple'
}

const removeSegment = (segment: any) => {
  const index = selectedSegments.value.indexOf(segment.id)
  if (index > -1) {
    selectedSegments.value.splice(index, 1)
  }
}

const refreshComparison = async () => {
  if (selectedSegments.value.length < 2) return

  loading.value = true
  error.value = null

  try {
    console.log('Loading comparison for segments:', selectedSegments.value)

    // Call the real API to get comparison data
    const response = await segmentationApi.compareSegments(selectedSegments.value)
    const apiData = response.data

    // New API format: { segments: [...], overlaps: [...] }
    const segmentsData = apiData.segments || apiData
    const overlapsData = apiData.overlaps || []

    // Calculate total count for percentage calculation
    const totalCount = segmentsData.reduce((sum: number, seg: any) => sum + (seg.totalCount || 0), 0)

    // Process overlaps from backend (real data)
    const processedOverlaps = overlapsData.map((overlap: any) => ({
      id: `${overlap.segmentAId}-${overlap.segmentBId}`,
      segmentAId: overlap.segmentAId,
      segmentBId: overlap.segmentBId,
      segmentAName: overlap.segmentAName,
      segmentBName: overlap.segmentBName,
      count: overlap.overlapCount,
      percentage: overlap.overlapPercentage,
      segmentACount: overlap.segmentACount,
      segmentBCount: overlap.segmentBCount
    }))

    // Calculate unique counts for each segment based on real overlaps
    const segmentOverlapCounts = new Map<string, number>()
    for (const overlap of processedOverlaps) {
      segmentOverlapCounts.set(
        overlap.segmentAId,
        (segmentOverlapCounts.get(overlap.segmentAId) || 0) + overlap.count
      )
      segmentOverlapCounts.set(
        overlap.segmentBId,
        (segmentOverlapCounts.get(overlap.segmentBId) || 0) + overlap.count
      )
    }

    // Process API response into our comparison data structure
    comparisonData.value = {
      segments: segmentsData.map((segData: any, index: number) => {
        const localSegment = availableSegments.value.find(s => s.id === segData.id)
        const count = segData.totalCount || 0
        // Approximate unique count (records not shared with any other segment)
        const overlapSum = segmentOverlapCounts.get(segData.id) || 0
        const uniqueCount = Math.max(0, count - overlapSum)
        return {
          id: segData.id,
          name: segData.name,
          type: segData.type,
          count: count,
          color: localSegment?.color || SEGMENT_COLORS[index % SEGMENT_COLORS.length],
          percentage: totalCount > 0 ? (count / totalCount) * 100 : 0,
          uniqueCount: uniqueCount,
          // Additional stats from API
          institutionStats: segData.institutionStats,
          contactStats: segData.contactStats
        }
      }),
      overlaps: processedOverlaps,
      insights: generateInsights(segmentsData)
    }

    // Update visualizations
    drawVennDiagram()
    drawAttributeChart()
  } catch (err) {
    console.error('Error loading comparison data:', err)
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

// Generate insights based on comparison data
const generateInsights = (apiData: any[]) => {
  const insights = []

  if (apiData.length >= 2) {
    // Check for large size differences
    const counts = apiData.map(s => s.totalCount || 0)
    const maxCount = Math.max(...counts)
    const minCount = Math.min(...counts)

    if (maxCount > minCount * 3 && minCount > 0) {
      insights.push({
        id: 'size-diff',
        type: 'info',
        title: t('segmentation.comparison.insights.sizeDifference'),
        description: t('segmentation.comparison.insights.sizeDifferenceDesc')
      })
    }

    // Check for type diversity
    const types = new Set(apiData.map(s => s.type))
    if (types.size > 1) {
      insights.push({
        id: 'type-diversity',
        type: 'success',
        title: t('segmentation.comparison.insights.typeDiversity'),
        description: t('segmentation.comparison.insights.typeDiversityDesc')
      })
    }

    // Check for same type segments
    const sameTypeSegments = apiData.filter(s => s.type === apiData[0].type)
    if (sameTypeSegments.length === apiData.length) {
      insights.push({
        id: 'same-type',
        type: 'warning',
        title: t('segmentation.comparison.insights.sameType'),
        description: t('segmentation.comparison.insights.sameTypeDesc')
      })
    }

    // Always add a summary insight
    const totalRecords = counts.reduce((a, b) => a + b, 0)
    insights.push({
      id: 'summary',
      type: 'info',
      title: t('segmentation.comparison.insights.summary'),
      description: t('segmentation.comparison.insights.summaryDesc', {
        count: apiData.length,
        total: totalRecords
      })
    })
  }

  return insights
}

const drawVennDiagram = () => {
  if (!vennDiagramRef.value) return

  const canvas = vennDiagramRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Simple Venn diagram drawing (simplified for demonstration)
  const centerX = canvas.width / 2
  const centerY = canvas.height / 2
  const radius = 80

  // Draw circles for each segment
  comparisonData.value.segments.forEach((segment, index) => {
    const angle = (index / comparisonData.value.segments.length) * 2 * Math.PI
    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = segment.color + '20' // Add transparency
    ctx.fill()
    ctx.strokeStyle = segment.color
    ctx.lineWidth = 2
    ctx.stroke()

    // Add label
    ctx.fillStyle = '#000'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(segment.name, x, y + radius + 20)
  })
}

const drawAttributeChart = () => {
  if (!attributeChartRef.value || !selectedAttribute.value) return

  const canvas = attributeChartRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Simple bar chart (simplified for demonstration)
  const barWidth = 40
  const barSpacing = 20
  const startX = 50
  const startY = canvas.height - 50

  comparisonData.value.segments.forEach((segment, index) => {
    const x = startX + index * (barWidth + barSpacing)
    const height = Math.random() * 200 + 50

    // Draw bar
    ctx.fillStyle = segment.color
    ctx.fillRect(x, startY - height, barWidth, height)

    // Draw label
    ctx.fillStyle = '#000'
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(segment.name, x + barWidth / 2, startY + 20)
  })
}

// Watchers
watch(selectedSegments, (newValue) => {
  emit('segments-selected', newValue)
  if (newValue.length >= 2) {
    refreshComparison()
  }
}, { deep: true })

watch(selectedAttribute, () => {
  drawAttributeChart()
})
</script>

<style scoped>
.segment-comparison-tool {
  min-height: 400px;
}

/* Header */
.comparison-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  flex: 1;
  min-width: 0;
}

.header-title span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.refresh-btn {
  flex-shrink: 0;
}

/* Summary Cards */
.segment-summary-card {
  border-left: 4px solid;
  height: 100%;
}

.segment-summary-card :deep(.v-card-title) {
  font-size: 0.9375rem;
  padding: 12px 16px 8px;
}

.segment-1 { border-left-color: #1976D2; }
.segment-2 { border-left-color: #388E3C; }
.segment-3 { border-left-color: #FBC02D; }
.segment-4 { border-left-color: #E53935; }

.metric-large {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1976D2;
}

.metric-label {
  font-size: 0.8125rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
}

.percentage-bar {
  position: relative;
}

.percentage-text {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

/* Overlap Section */
.overlap-header {
  font-size: 1rem !important;
  padding: 12px 16px !important;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

/* Mobile: List view */
.overlap-list {
  padding: 12px;
}

.overlap-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.overlap-item:last-child {
  margin-bottom: 0;
}

.overlap-pair {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
}

.overlap-pair .segment-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: #1976D2;
  max-width: 40%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overlap-stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.overlap-bar-container {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.overlap-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff9800, #f57c00);
  border-radius: 4px;
  min-width: 2px;
  transition: width 0.3s ease;
}

.overlap-values {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.overlap-pct {
  font-weight: 700;
  font-size: 1.125rem;
  color: #e65100;
}

.overlap-cnt {
  font-size: 0.75rem;
  color: rgba(0,0,0,0.6);
}

.no-overlap {
  text-align: center;
  padding: 24px;
  color: rgba(0,0,0,0.5);
  font-size: 0.875rem;
}

/* Desktop: Table view */
.overlap-table-wrapper {
  padding: 16px;
}

.overlap-table {
  width: 100%;
  border-collapse: collapse;
}

.overlap-table th {
  text-align: left;
  padding: 10px 12px;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 0.8125rem;
  color: #424242;
  border-bottom: 2px solid #e0e0e0;
}

.overlap-table td {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.pair-cell {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.count-cell {
  font-weight: 600;
  color: #1976D2;
  text-align: center;
}

.pct-cell {
  width: 200px;
}

.pct-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pct-bar {
  flex: 1;
  height: 6px;
  background: linear-gradient(90deg, #ff9800, #f57c00);
  border-radius: 3px;
  min-width: 2px;
}

.pct-value {
  font-weight: 600;
  font-size: 0.875rem;
  color: #e65100;
  min-width: 50px;
  text-align: right;
}

/* Insights Section */
.insights-header {
  font-size: 1rem !important;
  padding: 12px 16px !important;
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.insights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.insight-alert {
  margin: 0 !important;
}

.insight-content {
  font-size: 0.8125rem;
}

.insight-title {
  font-weight: 600;
  margin-bottom: 2px;
}

.insight-description {
  opacity: 0.85;
}

.no-insights {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: rgba(0,0,0,0.5);
  font-size: 0.875rem;
}

/* Details Section */
.segment-comparison-tool :deep(.v-tabs) {
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

.segment-comparison-tool :deep(.v-tab) {
  text-transform: none;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Attribute Breakdown */
.attribute-breakdown {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: #f5f5f5;
  border-radius: 8px;
}

/* Mobile Optimizations */
@media (max-width: 600px) {
  .segment-comparison-tool {
    min-height: auto;
  }

  .comparison-header {
    padding: 8px 8px;
  }

  .header-title {
    font-size: 0.9375rem;
    gap: 6px;
  }

  .header-title .v-icon {
    font-size: 1.125rem;
  }

  .refresh-btn {
    width: 32px;
    height: 32px;
  }

  .segment-comparison-tool :deep(.v-card > .v-card-text) {
    padding: 0;
  }

  /* Summary cards */
  .segment-summary-card {
    min-height: auto;
  }

  .segment-summary-card :deep(.v-card-title) {
    padding: 10px 12px 6px;
    font-size: 0.8125rem;
  }

  .segment-summary-card :deep(.v-card-text) {
    padding: 6px 12px 12px;
  }

  .metric-large {
    font-size: 1.375rem;
  }

  .metric-label {
    font-size: 0.75rem;
  }

  /* Overlap mobile */
  .overlap-header {
    padding: 10px 12px !important;
    font-size: 0.9375rem !important;
  }

  .overlap-list {
    padding: 10px;
  }

  .overlap-item {
    padding: 10px;
  }

  .overlap-pair .segment-name {
    font-size: 0.8125rem;
  }

  .overlap-pct {
    font-size: 1rem;
  }

  /* Insights mobile */
  .insights-header {
    padding: 10px 12px !important;
    font-size: 0.9375rem !important;
  }

  .insights-grid {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 10px;
  }

  .insight-content {
    font-size: 0.75rem;
  }

  .no-insights {
    padding: 16px;
  }

  /* Tabs mobile */
  .segment-comparison-tool :deep(.v-tabs) {
    margin: 0 12px;
  }

  .segment-comparison-tool :deep(.v-tab) {
    font-size: 0.75rem;
    min-width: auto;
    padding: 0 10px;
  }

  /* Details tables */
  .segment-comparison-tool :deep(.v-window-item > .mt-4) {
    margin-top: 12px !important;
    padding: 0 12px;
  }

  .segment-comparison-tool :deep(.v-table) {
    font-size: 0.75rem;
  }

  .segment-comparison-tool :deep(.v-table th),
  .segment-comparison-tool :deep(.v-table td) {
    padding: 8px !important;
  }
}
</style>