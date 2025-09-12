<template>
  <div class="segment-comparison-tool">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-chart-scatter-plot</v-icon>
        {{ $t('segmentation.comparison.title') }}
        <v-spacer />
        <v-btn
          icon
          @click="refreshComparison"
          :loading="loading"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Segment Selection -->
        <v-row class="mb-4">
          <v-col cols="12">
            <v-card outlined>
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
                  outlined
                  dense
                  item-text="name"
                  item-value="id"
                  :rules="segmentSelectionRules"
                >
                  <template v-slot:selection="{ attrs, item, select, selected }">
                    <v-chip
                      v-bind="attrs"
                      :input-value="selected"
                      close
                      @click="select"
                      @click:close="removeSegment(item)"
                      small
                      :color="getSegmentColor(item)"
                    >
                      <v-icon left small>{{ getSegmentIcon(item.type) }}</v-icon>
                      {{ item.name }}
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

        <!-- Comparison Results -->
        <div v-if="selectedSegments.length >= 2">
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
                    left
                    small
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
              <v-card outlined>
                <v-card-title class="text-h6">
                  {{ $t('segmentation.comparison.overlap.title') }}
                </v-card-title>
                <v-card-text>
                  <div class="overlap-matrix">
                    <table class="overlap-table">
                      <thead>
                        <tr>
                          <th></th>
                          <th
                            v-for="segment in comparisonData.segments"
                            :key="segment.id"
                            class="segment-header"
                          >
                            {{ segment.name }}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(segmentA, indexA) in comparisonData.segments"
                          :key="segmentA.id"
                        >
                          <td class="segment-label">{{ segmentA.name }}</td>
                          <td
                            v-for="(segmentB, indexB) in comparisonData.segments"
                            :key="segmentB.id"
                            :class="getOverlapCellClass(indexA, indexB)"
                          >
                            <div v-if="indexA === indexB" class="diagonal-cell">
                              {{ formatNumber(segmentA.count) }}
                            </div>
                            <div v-else class="overlap-cell">
                              <div class="overlap-count">
                                {{ formatNumber(getOverlapCount(segmentA.id, segmentB.id)) }}
                              </div>
                              <div class="overlap-percentage">
                                {{ getOverlapPercentage(segmentA.id, segmentB.id).toFixed(1) }}%
                              </div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Venn Diagram Visualization -->
          <v-row class="mb-4">
            <v-col cols="12" md="8">
              <v-card outlined>
                <v-card-title class="text-h6">
                  {{ $t('segmentation.comparison.visualization.title') }}
                </v-card-title>
                <v-card-text>
                  <div class="venn-diagram-container">
                    <canvas ref="vennDiagramRef" width="600" height="400"></canvas>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card outlined>
                <v-card-title class="text-h6">
                  {{ $t('segmentation.comparison.insights.title') }}
                </v-card-title>
                <v-card-text>
                  <div class="insights-list">
                    <v-alert
                      v-for="insight in comparisonData.insights"
                      :key="insight.id"
                      :type="insight.type"
                      outlined
                      dense
                      class="mb-2"
                    >
                      <div class="insight-content">
                        <div class="insight-title">{{ insight.title }}</div>
                        <div class="insight-description">{{ insight.description }}</div>
                      </div>
                    </v-alert>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Detailed Overlap Analysis -->
          <v-row>
            <v-col cols="12">
              <v-card outlined>
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
                        <v-simple-table dense>
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
                        </v-simple-table>
                      </div>
                    </v-window-item>

                    <!-- Shared Records -->
                    <v-window-item value="shared">
                      <div class="mt-4">
                        <v-simple-table dense>
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
                        </v-simple-table>
                      </div>
                    </v-window-item>

                    <!-- Attribute Breakdown -->
                    <v-window-item value="breakdown">
                      <div class="mt-4">
                        <v-select
                          v-model="selectedAttribute"
                          :items="attributeOptions"
                          :label="$t('segmentation.comparison.details.selectAttribute')"
                          outlined
                          dense
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

        <!-- Empty State -->
        <v-card v-else outlined class="text-center pa-8">
          <v-icon size="64" color="grey lighten-1">mdi-chart-scatter-plot</v-icon>
          <div class="mt-4 text-h6">{{ $t('segmentation.comparison.empty.title') }}</div>
          <div class="text-body-1 text-medium-emphasis mb-4">
            {{ $t('segmentation.comparison.empty.message') }}
          </div>
          <v-alert type="info" outlined dense>
            {{ $t('segmentation.comparison.empty.hint') }}
          </v-alert>
        </v-card>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Segment, SegmentType } from '@medical-crm/shared'

const { t } = useI18n()

// Props
interface Props {
  segments: Segment[]
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'segments-selected': [segmentIds: string[]]
}>()

// Reactive data
const selectedSegments = ref<string[]>([])
const loading = ref(false)
const activeDetailTab = ref('unique')
const selectedAttribute = ref('')
const vennDiagramRef = ref<HTMLCanvasElement>()
const attributeChartRef = ref<HTMLCanvasElement>()

// Mock data
const availableSegments = ref([
  {
    id: '1',
    name: 'Large Hospitals',
    type: 'institution' as SegmentType,
    count: 450,
    color: '#1976D2'
  },
  {
    id: '2',
    name: 'Active Clients',
    type: 'contact' as SegmentType,
    count: 320,
    color: '#388E3C'
  },
  {
    id: '3',
    name: 'High Priority',
    type: 'institution' as SegmentType,
    count: 280,
    color: '#FBC02D'
  },
  {
    id: '4',
    name: 'New Contacts',
    type: 'contact' as SegmentType,
    count: 200,
    color: '#E53935'
  }
])

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
  { text: 'Institution Type', value: 'type' },
  { text: 'Location', value: 'location' },
  { text: 'Size', value: 'size' },
  { text: 'Activity Level', value: 'activity' }
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

const getOverlapCellClass = (indexA: number, indexB: number): string => {
  if (indexA === indexB) return 'diagonal-cell'
  return 'overlap-cell'
}

const getOverlapCount = (segmentAId: string, segmentBId: string): number => {
  const overlap = comparisonData.value.overlaps.find(
    o => (o.segmentAId === segmentAId && o.segmentBId === segmentBId) ||
         (o.segmentAId === segmentBId && o.segmentBId === segmentAId)
  )
  return overlap?.count || 0
}

const getOverlapPercentage = (segmentAId: string, segmentBId: string): number => {
  const overlap = comparisonData.value.overlaps.find(
    o => (o.segmentAId === segmentAId && o.segmentBId === segmentBId) ||
         (o.segmentAId === segmentBId && o.segmentBId === segmentAId)
  )
  return overlap?.percentage || 0
}

const refreshComparison = async () => {
  if (selectedSegments.value.length < 2) return

  loading.value = true

  try {
    // TODO: Load actual comparison data from API
    console.log('Loading comparison for segments:', selectedSegments.value)

    // Mock comparison data
    comparisonData.value = {
      segments: selectedSegments.value.map(id => {
        const segment = availableSegments.value.find(s => s.id === id)
        return {
          ...segment,
          percentage: Math.random() * 100,
          uniqueCount: Math.floor(Math.random() * 100) + 50
        }
      }),
      overlaps: generateMockOverlaps(),
      insights: generateMockInsights()
    }

    // Update visualizations
    drawVennDiagram()
    drawAttributeChart()
  } catch (error) {
    console.error('Error loading comparison data:', error)
  } finally {
    loading.value = false
  }
}

const generateMockOverlaps = () => {
  const overlaps = []
  for (let i = 0; i < selectedSegments.value.length; i++) {
    for (let j = i + 1; j < selectedSegments.value.length; j++) {
      const segmentA = availableSegments.value.find(s => s.id === selectedSegments.value[i])
      const segmentB = availableSegments.value.find(s => s.id === selectedSegments.value[j])
      overlaps.push({
        id: `${segmentA.id}-${segmentB.id}`,
        segmentAId: segmentA.id,
        segmentBId: segmentB.id,
        segmentAName: segmentA.name,
        segmentBName: segmentB.name,
        count: Math.floor(Math.random() * 50) + 10,
        percentage: Math.random() * 30 + 5
      })
    }
  }
  return overlaps
}

const generateMockInsights = () => {
  return [
    {
      id: '1',
      type: 'info',
      title: 'High Overlap Detected',
      description: 'Two segments share 25% of their records, indicating potential redundancy.'
    },
    {
      id: '2',
      type: 'success',
      title: 'Good Segmentation',
      description: 'Segments show distinct characteristics with minimal overlap.'
    },
    {
      id: '3',
      type: 'warning',
      title: 'Consider Consolidation',
      description: 'Small segments with high overlap could be combined for efficiency.'
    }
  ]
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

// Initialize
onMounted(() => {
  // Pre-select first two segments for demonstration
  selectedSegments.value = availableSegments.value.slice(0, 2).map(s => s.id)
})
</script>

<style scoped>
.segment-comparison-tool {
  min-height: 600px;
}

.segment-summary-card {
  border-left: 4px solid;
}

.segment-1 { border-left-color: #1976D2; }
.segment-2 { border-left-color: #388E3C; }
.segment-3 { border-left-color: #FBC02D; }
.segment-4 { border-left-color: #E53935; }

.metric-large {
  font-size: 2rem;
  font-weight: bold;
  color: #1976D2;
}

.metric-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
}

.percentage-bar {
  position: relative;
}

.percentage-text {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.overlap-matrix {
  overflow-x: auto;
}

.overlap-table {
  width: 100%;
  border-collapse: collapse;
}

.overlap-table th,
.overlap-table td {
  padding: 12px;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.segment-header {
  font-weight: bold;
  background-color: #f5f5f5;
}

.segment-label {
  font-weight: bold;
  background-color: #f5f5f5;
  text-align: left;
}

.diagonal-cell {
  background-color: #e3f2fd;
  font-weight: bold;
}

.overlap-cell {
  background-color: #fff3e0;
}

.overlap-count {
  font-weight: bold;
  color: #1976D2;
}

.overlap-percentage {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
}

.venn-diagram-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.insights-list {
  max-height: 400px;
  overflow-y: auto;
}

.insight-content {
  font-size: 0.875rem;
}

.insight-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.attribute-breakdown {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}
</style>