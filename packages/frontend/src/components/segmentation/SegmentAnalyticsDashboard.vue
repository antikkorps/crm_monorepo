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
                        <v-list-item-avatar size="32">
                          <v-img :src="performer.avatar" />
                        </v-list-item-avatar>
                        <v-list-item-content>
                          <v-list-item-title>{{ performer.name }}</v-list-item-title>
                          <v-list-item-subtitle>{{ performer.role }}</v-list-item-subtitle>
                        </v-list-item-content>
                        <v-list-item-action>
                          <v-chip small color="primary">
                            {{ formatNumber(performer.score) }}
                          </v-chip>
                        </v-list-item-action>
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
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title } from 'chart.js'
import { Doughnut, Bar, Line } from 'vue-chartjs'

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
let distributionChart: ChartJS | null = null
let trendChart: ChartJS | null = null

// Mock analytics data
const analyticsData = ref({
  totalRecords: 1250,
  totalRecordsChange: 12.5,
  activeRecords: 980,
  activeRecordsChange: 8.3,
  engagementRate: 78.5,
  engagementRateChange: -2.1,
  avgInteractions: 4.2,
  interactionsChange: 15.7,
  tasksCompleted: 245,
  tasksCompletionRate: 89.2,
  communicationsSent: 567,
  communicationsResponseRate: 34.8,
  meetingsScheduled: 89,
  meetingsAttendanceRate: 76.3,
  topPerformers: [
    { name: 'John Doe', role: 'Sales Rep', avatar: '/avatars/john.jpg', score: 95 },
    { name: 'Jane Smith', role: 'Account Manager', avatar: '/avatars/jane.jpg', score: 87 },
    { name: 'Bob Johnson', role: 'Sales Rep', avatar: '/avatars/bob.jpg', score: 82 }
  ],
  recentActivity: [
    { user: 'John Doe', action: 'completed task for Hospital A', type: 'task', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
    { user: 'Jane Smith', action: 'sent email to 15 contacts', type: 'communication', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    { user: 'Bob Johnson', action: 'scheduled meeting with Clinic B', type: 'meeting', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4) }
  ]
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
  return new Intl.NumberFormat().format(num)
}

const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`
}

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleString()
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

const createDistributionChart = () => {
  if (!distributionChartRef.value) return

  const ctx = distributionChartRef.value.getContext('2d')
  if (!ctx) return

  // Register Chart.js components
  ChartJS.register(ArcElement, Tooltip, Legend)

  const data = {
    labels: ['Hospitals', 'Clinics', 'Medical Centers', 'Specialty Clinics'],
    datasets: [{
      data: [450, 320, 280, 200],
      backgroundColor: [
        '#1976D2',
        '#388E3C',
        '#FBC02D',
        '#E53935'
      ],
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
  ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

  const data = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Records Added',
      data: [120, 150, 180, 200, 170, 190],
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
  try {
    // TODO: Load actual analytics data from API
    console.log('Loading analytics for segment:', props.segmentId)

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
  } catch (error) {
    console.error('Error loading analytics data:', error)
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
