<template>
  <v-card elevation="2" class="h-100">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-chart-box" color="primary" class="mr-2" />
        Indicateurs clés (KPIs)
      </div>
      <v-btn-group variant="outlined" density="compact">
        <v-btn
          :color="period === 'week' ? 'primary' : undefined"
          size="x-small"
          @click="setPeriod('week')"
        >
          7j
        </v-btn>
        <v-btn
          :color="period === 'month' ? 'primary' : undefined"
          size="x-small"
          @click="setPeriod('month')"
        >
          30j
        </v-btn>
        <v-btn
          :color="period === 'quarter' ? 'primary' : undefined"
          size="x-small"
          @click="setPeriod('quarter')"
        >
          90j
        </v-btn>
      </v-btn-group>
    </v-card-title>

    <!-- Loading State -->
    <v-card-text v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement...</p>
    </v-card-text>

    <!-- Charts Content -->
    <v-card-text v-else-if="metrics">
      <v-row>
        <!-- Revenue Chart -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="kpi-chart-card">
            <v-card-subtitle class="d-flex align-center justify-space-between pb-2">
              <span class="text-body-2 font-weight-bold">Chiffre d'affaires</span>
              <v-icon icon="mdi-currency-eur" size="16" color="success" />
            </v-card-subtitle>
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-h5 font-weight-bold text-success">
                    {{ formatCurrency(metrics.billing.totalRevenue) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    <span :class="metrics.growth.revenueGrowth >= 0 ? 'text-success' : 'text-error'">
                      {{ metrics.growth.revenueGrowth > 0 ? '+' : '' }}{{ metrics.growth.revenueGrowth.toFixed(1) }}%
                    </span> vs période précédente
                  </div>
                </div>
              </div>
              <div class="chart-container-mini">
                <canvas ref="revenueChart" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Clients Chart -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="kpi-chart-card">
            <v-card-subtitle class="d-flex align-center justify-space-between pb-2">
              <span class="text-body-2 font-weight-bold">Nouveaux clients</span>
              <v-icon icon="mdi-account-multiple-plus" size="16" color="blue" />
            </v-card-subtitle>
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-h5 font-weight-bold text-blue">
                    {{ metrics.newClients.count }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    <span :class="metrics.newClients.percentageChange >= 0 ? 'text-success' : 'text-error'">
                      {{ metrics.newClients.percentageChange > 0 ? '+' : '' }}{{ metrics.newClients.percentageChange.toFixed(1) }}%
                    </span> vs période précédente
                  </div>
                </div>
              </div>
              <div class="chart-container-mini">
                <canvas ref="clientsChart" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Conversion Rate Gauge -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="kpi-chart-card">
            <v-card-subtitle class="d-flex align-center justify-space-between pb-2">
              <span class="text-body-2 font-weight-bold">Taux de conversion</span>
              <v-icon icon="mdi-percent" size="16" color="orange" />
            </v-card-subtitle>
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-h5 font-weight-bold text-orange">
                    {{ metrics.conversionRate.rate.toFixed(1) }}%
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ metrics.conversionRate.quotesAccepted }} / {{ metrics.conversionRate.quotesTotal }} devis
                  </div>
                </div>
              </div>
              <div class="chart-container-mini">
                <canvas ref="conversionChart" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Tasks Completed Chart -->
        <v-col cols="12" md="6">
          <v-card variant="outlined" class="kpi-chart-card">
            <v-card-subtitle class="d-flex align-center justify-space-between pb-2">
              <span class="text-body-2 font-weight-bold">Tâches complétées</span>
              <v-icon icon="mdi-check-circle" size="16" color="success" />
            </v-card-subtitle>
            <v-card-text>
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-h5 font-weight-bold text-success">
                    {{ metrics.tasks.completed }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    <span :class="metrics.growth.tasksCompletedGrowth >= 0 ? 'text-success' : 'text-error'">
                      {{ metrics.growth.tasksCompletedGrowth > 0 ? '+' : '' }}{{ metrics.growth.tasksCompletedGrowth.toFixed(1) }}%
                    </span> vs période précédente
                  </div>
                </div>
              </div>
              <div class="chart-container-mini">
                <canvas ref="tasksChart" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { dashboardApi, type DashboardMetrics } from '@/services/api/dashboard'
import Chart from 'chart.js/auto'

// State
const metrics = ref<DashboardMetrics | null>(null)
const loading = ref(false)
const period = ref<'week' | 'month' | 'quarter'>('month')

// Chart refs
const revenueChart = ref<HTMLCanvasElement>()
const clientsChart = ref<HTMLCanvasElement>()
const conversionChart = ref<HTMLCanvasElement>()
const tasksChart = ref<HTMLCanvasElement>()

// Chart instances
const revenueChartInstance = ref<Chart | null>(null)
const clientsChartInstance = ref<Chart | null>(null)
const conversionChartInstance = ref<Chart | null>(null)
const tasksChartInstance = ref<Chart | null>(null)

// Load metrics
async function loadMetrics() {
  loading.value = true

  try {
    metrics.value = await dashboardApi.getMetrics({ period: period.value })
    // Wait for next tick to ensure canvases are rendered
    setTimeout(() => {
      updateCharts()
    }, 100)
  } catch (error) {
    console.error('Error loading KPI metrics:', error)
  } finally {
    loading.value = false
  }
}

// Set period
function setPeriod(newPeriod: 'week' | 'month' | 'quarter') {
  period.value = newPeriod
  loadMetrics()
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Update all charts
function updateCharts() {
  if (!metrics.value) return

  updateRevenueChart()
  updateClientsChart()
  updateConversionChart()
  updateTasksChart()
}

// Update revenue chart (mini sparkline)
function updateRevenueChart() {
  if (!revenueChart.value || !metrics.value) return

  if (revenueChartInstance.value) {
    revenueChartInstance.value.destroy()
  }

  const ctx = revenueChart.value.getContext('2d')
  if (!ctx) return

  // Simulate data points (in real scenario, you'd get historical data)
  const dataPoints = generateTrendData(
    metrics.value.billing.totalRevenue,
    metrics.value.growth.revenueGrowth
  )

  revenueChartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataPoints.map((_, i) => `${i + 1}`),
      datasets: [
        {
          data: dataPoints,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    },
  })
}

// Update clients chart
function updateClientsChart() {
  if (!clientsChart.value || !metrics.value) return

  if (clientsChartInstance.value) {
    clientsChartInstance.value.destroy()
  }

  const ctx = clientsChart.value.getContext('2d')
  if (!ctx) return

  const dataPoints = generateTrendData(
    metrics.value.newClients.count,
    metrics.value.newClients.percentageChange
  )

  clientsChartInstance.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dataPoints.map((_, i) => `${i + 1}`),
      datasets: [
        {
          data: dataPoints,
          backgroundColor: 'rgba(33, 150, 243, 0.6)',
          borderColor: '#2196F3',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    },
  })
}

// Update conversion chart (doughnut)
function updateConversionChart() {
  if (!conversionChart.value || !metrics.value) return

  if (conversionChartInstance.value) {
    conversionChartInstance.value.destroy()
  }

  const ctx = conversionChart.value.getContext('2d')
  if (!ctx) return

  conversionChartInstance.value = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Acceptés', 'Autres'],
      datasets: [
        {
          data: [
            metrics.value.conversionRate.quotesAccepted,
            metrics.value.conversionRate.quotesTotal -
              metrics.value.conversionRate.quotesAccepted,
          ],
          backgroundColor: ['#FF9800', 'rgba(255, 152, 0, 0.2)'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      cutout: '70%',
    },
  })
}

// Update tasks chart
function updateTasksChart() {
  if (!tasksChart.value || !metrics.value) return

  if (tasksChartInstance.value) {
    tasksChartInstance.value.destroy()
  }

  const ctx = tasksChart.value.getContext('2d')
  if (!ctx) return

  const dataPoints = generateTrendData(
    metrics.value.tasks.completed,
    metrics.value.growth.tasksCompletedGrowth
  )

  tasksChartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataPoints.map((_, i) => `${i + 1}`),
      datasets: [
        {
          data: dataPoints,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    },
  })
}

// Simple seeded PRNG (mulberry32)
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Generate trend data based on current value and growth, deterministic
function generateTrendData(currentValue: number, growthPercent: number): number[] {
  const points = 7
  const data: number[] = []
  const trend = growthPercent / 100
  // Derive seed from input parameters for determinism
  const seed = Math.floor(currentValue * 1000 + growthPercent * 100)
  const rand = mulberry32(seed)

  for (let i = 0; i < points; i++) {
    const variation = rand() * 0.2 - 0.1 // ±10% variation, deterministic
    const value = currentValue * (1 - ((points - i - 1) / points) * trend + variation)
    data.push(Math.max(0, Math.round(value)))
  }

  return data
}

// Lifecycle
onMounted(() => {
  loadMetrics()
})

onUnmounted(() => {
  if (revenueChartInstance.value) revenueChartInstance.value.destroy()
  if (clientsChartInstance.value) clientsChartInstance.value.destroy()
  if (conversionChartInstance.value) conversionChartInstance.value.destroy()
  if (tasksChartInstance.value) tasksChartInstance.value.destroy()
})

watch([revenueChart, clientsChart, conversionChart, tasksChart], () => {
  if (metrics.value) {
    updateCharts()
  }
})
</script>

<style scoped>
.kpi-chart-card {
  height: 100%;
  transition: all 0.2s ease-in-out;
}

.kpi-chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.chart-container-mini {
  height: 80px;
  position: relative;
}

.h-100 {
  height: 100%;
}
</style>
