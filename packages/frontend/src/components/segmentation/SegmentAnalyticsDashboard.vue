<template>
  <div class="segment-analytics-dashboard">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon left>mdi-chart-bar</v-icon>
            {{ $t('segmentation.analytics.title') }}
            <v-spacer />
            <v-select
              v-model="selectedTimeRange"
              :items="timeRangeOptions"
              item-title="text"
              item-value="value"
              outlined
              dense
              style="max-width: 200px"
            />
          </v-card-title>

          <v-card-text>
            <!-- Loading skeletons -->
            <div v-if="loading">
              <v-row class="mb-6">
                <v-col v-for="i in 4" :key="i" cols="12" md="3">
                  <v-skeleton-loader type="card" />
                </v-col>
              </v-row>
              <v-row class="mb-6">
                <v-col cols="12" md="6">
                  <v-skeleton-loader type="image" height="300" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-skeleton-loader type="image" height="300" />
                </v-col>
              </v-row>
            </div>

            <!-- Error state -->
            <v-alert v-else-if="error" type="error" class="mb-4">
              {{ error }}
            </v-alert>

            <!-- Content -->
            <div v-else>
            <!-- Key Metrics -->
            <v-row class="mb-6">
              <v-col cols="12" md="3">
                <v-card outlined class="text-center metric-card">
                  <v-card-text class="pa-4">
                    <div class="metric-value primary--text">
                      {{ formatNumber(analyticsData.totalRecords) }}
                    </div>
                    <div class="metric-label">
                      {{ $t('segmentation.analytics.totalRecords') }}
                    </div>
                    <div class="metric-change" :class="getChangeClass(analyticsData.totalRecordsChange)">
                      <v-icon small>{{ getChangeIcon(analyticsData.totalRecordsChange) }}</v-icon>
                      {{ Math.abs(analyticsData.totalRecordsChange) }}%
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="3">
                <v-card outlined class="text-center metric-card">
                  <v-card-text class="pa-4">
                    <div class="metric-value success--text">
                      {{ formatNumber(analyticsData.activeRecords) }}
                    </div>
                    <div class="metric-label">
                      {{ $t('segmentation.analytics.activeRecords') }}
                    </div>
                    <div class="metric-change" :class="getChangeClass(analyticsData.activeRecordsChange)">
                      <v-icon small>{{ getChangeIcon(analyticsData.activeRecordsChange) }}</v-icon>
                      {{ Math.abs(analyticsData.activeRecordsChange) }}%
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="3">
                <v-card outlined class="text-center metric-card">
                  <v-card-text class="pa-4">
                    <div class="metric-value info--text">
                      {{ formatPercentage(analyticsData.engagementRate) }}
                    </div>
                    <div class="metric-label">
                      {{ $t('segmentation.analytics.engagementRate') }}
                    </div>
                    <div class="metric-change" :class="getChangeClass(analyticsData.engagementRateChange)">
                      <v-icon small>{{ getChangeIcon(analyticsData.engagementRateChange) }}</v-icon>
                      {{ Math.abs(analyticsData.engagementRateChange) }}%
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col cols="12" md="3">
                <v-card outlined class="text-center metric-card">
                  <v-card-text class="pa-4">
                    <div class="metric-value warning--text">
                      {{ formatNumber(analyticsData.avgInteractions) }}
                    </div>
                    <div class="metric-label">
                      {{ $t('segmentation.analytics.avgInteractions') }}
                    </div>
                    <div class="metric-change" :class="getChangeClass(analyticsData.interactionsChange)">
                      <v-icon small>{{ getChangeIcon(analyticsData.interactionsChange) }}</v-icon>
                      {{ Math.abs(analyticsData.interactionsChange) }}%
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Charts Row -->
            <v-row class="mb-6">
              <!-- Distribution Chart -->
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title>
                    {{ $t('segmentation.analytics.distribution.title') }}
                  </v-card-title>
                  <v-card-text>
                    <div class="chart-container">
                      <canvas ref="distributionChartRef" height="300"></canvas>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Trend Chart -->
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title>
                    {{ $t('segmentation.analytics.trend.title') }}
                  </v-card-title>
                  <v-card-text>
                    <div class="chart-container">
                      <canvas ref="trendChartRef" height="300"></canvas>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Engagement Metrics -->
            <v-row class="mb-6">
              <v-col cols="12">
                <v-card outlined>
                  <v-card-title>
                    {{ $t('segmentation.analytics.engagement.title') }}
                  </v-card-title>
                  <v-card-text>
                    <v-row>
                      <v-col cols="12" md="4">
                        <div class="engagement-metric">
                          <div class="metric-title">{{ $t('segmentation.analytics.engagement.tasksCompleted') }}</div>
                          <div class="metric-value-large">{{ formatNumber(analyticsData.tasksCompleted) }}</div>
                          <v-progress-linear
                            :value="analyticsData.tasksCompletionRate"
                            color="primary"
                            height="8"
                            class="mt-2"
                          />
                          <div class="metric-subtitle">{{ formatPercentage(analyticsData.tasksCompletionRate) }} completion rate</div>
                        </div>
                      </v-col>

                      <v-col cols="12" md="4">
                        <div class="engagement-metric">
                          <div class="metric-title">{{ $t('segmentation.analytics.engagement.communicationsSent') }}</div>
                          <div class="metric-value-large">{{ formatNumber(analyticsData.communicationsSent) }}</div>
                          <v-progress-linear
                            :value="analyticsData.communicationsResponseRate"
                            color="success"
                            height="8"
                            class="mt-2"
                          />
                          <div class="metric-subtitle">{{ formatPercentage(analyticsData.communicationsResponseRate) }} response rate</div>
                        </div>
                      </v-col>

                      <v-col cols="12" md="4">
                        <div class="engagement-metric">
                          <div class="metric-title">{{ $t('segmentation.analytics.engagement.meetingsScheduled') }}</div>
                          <div class="metric-value-large">{{ formatNumber(analyticsData.meetingsScheduled) }}</div>
                          <v-progress-linear
                            :value="analyticsData.meetingsAttendanceRate"
                            color="info"
                            height="8"
                            class="mt-2"
                          />
                          <div class="metric-subtitle">{{ formatPercentage(analyticsData.meetingsAttendanceRate) }} attendance rate</div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Top Performers -->
            <v-row>
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title>
                    {{ $t('segmentation.analytics.topPerformers.title') }}
                  </v-card-title>
                  <v-card-text>
                    <v-list dense>
                      <v-list-item
                        v-for="(performer, index) in analyticsData.topPerformers"
                        :key="index"
                        class="px-0"
                      >
                        <template v-slot:prepend>
                          <v-avatar size="32">
                            <v-img :src="performer.avatar" />
                          </v-avatar>
                        </template>
                        <v-list-item-title>{{ performer.name }}</v-list-item-title>
                        <v-list-item-subtitle>{{ performer.role }}</v-list-item-subtitle>
                        <template v-slot:append>
                          <v-chip size="small" color="primary">
                            {{ formatNumber(performer.score) }}
                          </v-chip>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Recent Activity -->
              <v-col cols="12" md="6">
                <v-card outlined>
                  <v-card-title>
                    {{ $t('segmentation.analytics.recentActivity.title') }}
                  </v-card-title>
                  <v-card-text>
                    <v-timeline dense>
                      <v-timeline-item
                        v-for="(activity, index) in analyticsData.recentActivity"
                        :key="index"
                        small
                        :color="getActivityColor(activity.type)"
                      >
                        <div class="text-caption">
                          <strong>{{ activity.user }}</strong> {{ activity.action }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ formatDate(activity.timestamp) }}
                        </div>
                      </v-timeline-item>
                    </v-timeline>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, DoughnutController, BarController } from 'chart.js'
import type { Chart as ChartType } from 'chart.js'
import { segmentationApi } from '../../services/api/segmentation'

const { t } = useI18n()

// Props
interface Props {
  segmentId?: string
}

const props = withDefaults(defineProps<Props>(), {
  segmentId: ''
})

// Reactive data
const selectedTimeRange = ref('30d')
const distributionChartRef = ref<HTMLCanvasElement>()
const trendChartRef = ref<HTMLCanvasElement>()
let distributionChart: ChartType | null = null
let trendChart: ChartType | null = null
const loading = ref(false)
const error = ref<string | null>(null)

// Analytics data structure
const analyticsData = ref({
  totalRecords: 0,
  totalRecordsChange: 0,
  activeRecords: 0,
  activeRecordsChange: 0,
  engagementRate: 0,
  engagementRateChange: 0,
  avgInteractions: 0,
  interactionsChange: 0,
  tasksCompleted: 0,
  tasksCompletionRate: 0,
  communicationsSent: 0,
  communicationsResponseRate: 0,
  meetingsScheduled: 0,
  meetingsAttendanceRate: 0,
  topPerformers: [] as Array<{ name: string, role: string, avatar: string, score: number }>,
  recentActivity: [] as Array<{ user: string, action: string, type: string, timestamp: Date }>,
  distributionData: {} as Record<string, number>,
  trendData: [] as Array<{ label: string, value: number }>
})

// Computed
const timeRangeOptions = computed(() => [
  { text: t('analytics.timeRange.7d'), value: '7d' },
  { text: t('analytics.timeRange.30d'), value: '30d' },
  { text: t('analytics.timeRange.90d'), value: '90d' },
  { text: t('analytics.timeRange.1y'), value: '1y' }
])

// Methods
const formatNumber = (num: number): string => {
  const detected = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'fr-FR'
  return new Intl.NumberFormat(detected).format(num)
}

const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`
}

const formatDate = (date: Date | string): string => {
  const detected = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'fr-FR'
  return new Date(date).toLocaleString(detected)
}

const getChangeClass = (change: number): string => {
  return change >= 0 ? 'positive' : 'negative'
}

const getChangeIcon = (change: number): string => {
  return change >= 0 ? 'mdi-trending-up' : 'mdi-trending-down'
}

const getActivityColor = (type: string): string => {
  const colors: Record<string, string> = {
    'task': 'primary',
    'communication': 'success',
    'meeting': 'info',
    'update': 'warning'
  }
  return colors[type] || 'grey'
}

const generateAvatarUrl = (seed: string, style: string = 'avataaars', size: number = 200): string => {
  const params = new URLSearchParams({
    seed,
    size: size.toString()
  })
  return `https://api.dicebear.com/7.x/${style}/svg?${params.toString()}`
}

const createDistributionChart = () => {
  if (!distributionChartRef.value) return

  const ctx = distributionChartRef.value.getContext('2d')
  if (!ctx) return

  // Register Chart.js components
  ChartJS.register(DoughnutController, ArcElement, Tooltip, Legend)

  const labels = Object.keys(analyticsData.value.distributionData)
  const values = Object.values(analyticsData.value.distributionData)

  const colors = [
    '#1976D2', '#388E3C', '#FBC02D', '#E53935',
    '#7B1FA2', '#00796B', '#F57C00', '#C2185B'
  ]

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors.slice(0, labels.length),
      borderWidth: 1
    }]
  }

  distributionChart = new ChartJS(ctx, {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  })
}

const createTrendChart = () => {
  if (!trendChartRef.value) return

  const ctx = trendChartRef.value.getContext('2d')
  if (!ctx) return

  // Register Chart.js components
  ChartJS.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

  const labels = analyticsData.value.trendData.map(d => d.label)
  const values = analyticsData.value.trendData.map(d => d.value)

  const data = {
    labels,
    datasets: [{
      label: 'Records',
      data: values,
      backgroundColor: '#1976D2',
      borderColor: '#1976D2',
      borderWidth: 1
    }]
  }

  trendChart = new ChartJS(ctx, {
    type: 'bar',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  })
}

const loadAnalyticsData = async () => {
  if (!props.segmentId) {
    console.log('SegmentAnalyticsDashboard: No segmentId provided')
    return
  }

  try {
    loading.value = true
    error.value = null

    console.log('SegmentAnalyticsDashboard: Loading analytics for segment:', props.segmentId)

    // Fetch analytics data from API
    const response = await segmentationApi.getSegmentAnalytics(props.segmentId)
    const data = response.data

    console.log('SegmentAnalyticsDashboard: Received data:', data)

    // Update basic metrics
    analyticsData.value.totalRecords = data.totalCount || 0
    analyticsData.value.activeRecords = data.totalCount || 0

    // Process institution or contact stats
    if (data.institutionStats) {
      // Institution analytics
      analyticsData.value.distributionData = data.institutionStats.byType || {}

      // Calculate engagement metrics from institution data
      const totalInstitutions = data.totalCount || 1
      const specialtyCount = Object.keys(data.institutionStats.bySpecialty || {}).length
      analyticsData.value.engagementRate = (specialtyCount / totalInstitutions) * 100

      // Use bed capacity as a metric
      analyticsData.value.avgInteractions = data.institutionStats.averageBedCapacity || 0

      // Mock trend data (could be enhanced with real time-series data)
      const typeData = data.institutionStats.byType || {}
      analyticsData.value.trendData = Object.entries(typeData).map(([label, value]) => ({
        label,
        value: value as number
      }))
    } else if (data.contactStats) {
      // Contact analytics
      analyticsData.value.distributionData = data.contactStats.byRole || data.contactStats.byDepartment || {}

      // Calculate engagement metrics from contact data
      const totalContacts = data.totalCount || 1
      analyticsData.value.engagementRate = ((data.contactStats.withEmail || 0) / totalContacts) * 100
      analyticsData.value.avgInteractions = ((data.contactStats.withPhone || 0) / totalContacts) * 100

      // Mock trend data
      const roleData = data.contactStats.byRole || {}
      analyticsData.value.trendData = Object.entries(roleData).map(([label, value]) => ({
        label,
        value: value as number
      }))
    }

    // Process engagement metrics
    if (data.tasks) {
      analyticsData.value.tasksCompleted = data.tasks.completed || 0
      analyticsData.value.tasksCompletionRate = data.tasks.completionRate || 0
    }

    if (data.meetings) {
      analyticsData.value.meetingsScheduled = data.meetings.total || 0
      analyticsData.value.meetingsAttendanceRate = data.meetings.attendanceRate || 0
    }

    // Process top performers with avatar URLs
    if (data.topPerformers && Array.isArray(data.topPerformers)) {
      analyticsData.value.topPerformers = data.topPerformers.map((performer: any) => ({
        name: `${performer.firstName} ${performer.lastName}`,
        role: performer.email,
        avatar: generateAvatarUrl(performer.avatarSeed || `${performer.firstName}-${performer.lastName}`),
        score: performer.tasksCompleted
      }))
    }

    // Process recent activity
    if (data.recentActivity && Array.isArray(data.recentActivity)) {
      analyticsData.value.recentActivity = data.recentActivity.map((activity: any) => ({
        user: `${activity.user.firstName} ${activity.user.lastName}`,
        action: activity.action,
        type: activity.type,
        timestamp: new Date(activity.timestamp)
      }))
    }

    // Mock communication data (no communication model yet)
    analyticsData.value.communicationsSent = 0
    analyticsData.value.communicationsResponseRate = 0

    // Mock change percentages (would need historical data)
    analyticsData.value.totalRecordsChange = 0
    analyticsData.value.activeRecordsChange = 0
    analyticsData.value.engagementRateChange = 0
    analyticsData.value.interactionsChange = 0

    // Update charts
    if (distributionChart) {
      distributionChart.destroy()
    }
    if (trendChart) {
      trendChart.destroy()
    }

    // Recreate charts with new data
    createDistributionChart()
    createTrendChart()
  } catch (err) {
    console.error('Error loading analytics data:', err)
    error.value = (err as Error).message
  } finally {
    loading.value = false
  }
}

// Watchers
watch(() => selectedTimeRange.value, () => {
  loadAnalyticsData()
})

watch(() => props.segmentId, () => {
  loadAnalyticsData()
})

// Lifecycle
onMounted(() => {
  loadAnalyticsData()
})
</script>

<style scoped>
.segment-analytics-dashboard {
  min-height: 600px;
}

.metric-card {
  height: 120px;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 4px;
}

.metric-value-large {
  font-size: 2.5rem;
  font-weight: bold;
  color: #1976D2;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 4px;
}

.metric-subtitle {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.5);
}

.metric-change {
  font-size: 0.75rem;
  font-weight: 500;
}

.metric-change.positive {
  color: #4CAF50;
}

.metric-change.negative {
  color: #F44336;
}

.engagement-metric {
  text-align: center;
  padding: 16px;
}

.metric-title {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  margin-bottom: 8px;
}

.chart-container {
  position: relative;
  height: 300px;
}
</style>
