<template>
  <v-card elevation="2" class="h-100">
    <v-card-title class="d-flex align-center card-title-responsive">
      <v-icon icon="mdi-chart-box" color="primary" class="mr-2" size="small" />
      <span>Indicateurs clés (KPIs)</span>
    </v-card-title>

    <!-- Loading State -->
    <v-card-text v-if="loading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement...</p>
    </v-card-text>

    <!-- Charts Content -->
    <v-card-text v-else-if="metrics" class="pa-2 pa-md-4">
      <v-row dense>
        <!-- Revenue Chart -->
        <v-col cols="12" sm="6">
          <v-card variant="tonal" class="kpi-chart-card">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-body-2 font-weight-medium">Chiffre d'affaires</span>
                <v-icon icon="mdi-currency-eur" size="16" color="success" />
              </div>
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h6 text-md-h5 font-weight-bold text-success">
                    {{ formatCurrency(metrics.billing.totalRevenue) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    <span :class="metrics.growth.revenueGrowth >= 0 ? 'text-success' : 'text-error'">
                      {{ metrics.growth.revenueGrowth > 0 ? '+' : '' }}{{ metrics.growth.revenueGrowth.toFixed(1) }}%
                    </span>
                    <span class="d-none d-sm-inline"> vs précédent</span>
                  </div>
                </div>
              </div>
              <BaseSparkline
                :data="revenueSparklineData"
                :color="chartColors.success"
                :height="60"
                type="area"
              />
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Clients Chart -->
        <v-col cols="12" sm="6">
          <v-card variant="tonal" class="kpi-chart-card">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-body-2 font-weight-medium">Nouveaux clients</span>
                <v-icon icon="mdi-account-multiple-plus" size="16" color="blue" />
              </div>
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h6 text-md-h5 font-weight-bold text-blue">
                    {{ metrics.newClients.count }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    <span :class="metrics.newClients.percentageChange >= 0 ? 'text-success' : 'text-error'">
                      {{ metrics.newClients.percentageChange > 0 ? '+' : '' }}{{ metrics.newClients.percentageChange.toFixed(1) }}%
                    </span>
                    <span class="d-none d-sm-inline"> vs précédent</span>
                  </div>
                </div>
              </div>
              <BaseSparkline
                :data="clientsSparklineData"
                :color="chartColors.primary"
                :height="60"
                type="bar"
              />
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Conversion Rate -->
        <v-col cols="12" sm="6">
          <v-card variant="tonal" class="kpi-chart-card">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-body-2 font-weight-medium">Taux de conversion</span>
                <v-icon icon="mdi-percent" size="16" color="orange" />
              </div>
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h6 text-md-h5 font-weight-bold text-orange">
                    {{ metrics.conversionRate.rate.toFixed(1) }}%
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ metrics.conversionRate.quotesAccepted }} / {{ metrics.conversionRate.quotesTotal }} devis
                  </div>
                </div>
              </div>
              <div class="conversion-gauge">
                <v-progress-linear
                  :model-value="metrics.conversionRate.rate"
                  color="orange"
                  height="8"
                  rounded
                  bg-color="orange-lighten-4"
                />
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Tasks Completed Chart -->
        <v-col cols="12" sm="6">
          <v-card variant="tonal" class="kpi-chart-card">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-body-2 font-weight-medium">Tâches complétées</span>
                <v-icon icon="mdi-check-circle" size="16" color="success" />
              </div>
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-h6 text-md-h5 font-weight-bold text-success">
                    {{ metrics.tasks.completed }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    <span :class="metrics.growth.tasksCompletedGrowth >= 0 ? 'text-success' : 'text-error'">
                      {{ metrics.growth.tasksCompletedGrowth > 0 ? '+' : '' }}{{ metrics.growth.tasksCompletedGrowth.toFixed(1) }}%
                    </span>
                    <span class="d-none d-sm-inline"> vs précédent</span>
                  </div>
                </div>
              </div>
              <BaseSparkline
                :data="tasksSparklineData"
                :color="chartColors.success"
                :height="60"
                type="line"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { dashboardApi, type DashboardMetrics } from '@/services/api/dashboard'
import { BaseSparkline, useChartColors } from '@/components/charts'

// Props
const props = defineProps<{
  period: 'week' | 'month' | 'quarter'
}>()

// State
const metrics = ref<DashboardMetrics | null>(null)
const loading = ref(false)

// Chart colors from theme
const { chartColors } = useChartColors()

// Generate trend data based on current value and growth
function generateTrendData(currentValue: number, growthPercent: number): number[] {
  const points = 7
  const data: number[] = []
  const trend = growthPercent / 100

  // Simple seeded PRNG for deterministic results
  const seed = Math.floor(currentValue * 1000 + growthPercent * 100)
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }

  for (let i = 0; i < points; i++) {
    const variation = rand() * 0.2 - 0.1
    const value = currentValue * (1 - ((points - i - 1) / points) * trend + variation)
    data.push(Math.max(0, Math.round(value)))
  }

  return data
}

// Computed sparkline data
const revenueSparklineData = computed(() => {
  if (!metrics.value) return []
  return generateTrendData(
    metrics.value.billing.totalRevenue,
    metrics.value.growth.revenueGrowth
  )
})

const clientsSparklineData = computed(() => {
  if (!metrics.value) return []
  return generateTrendData(
    metrics.value.newClients.count,
    metrics.value.newClients.percentageChange
  )
})

const tasksSparklineData = computed(() => {
  if (!metrics.value) return []
  return generateTrendData(
    metrics.value.tasks.completed,
    metrics.value.growth.tasksCompletedGrowth
  )
})

// Load metrics
async function loadMetrics() {
  loading.value = true

  try {
    metrics.value = await dashboardApi.getMetrics({ period: props.period })
  } catch (error) {
    console.error('Error loading KPI metrics:', error)
  } finally {
    loading.value = false
  }
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(amount)
}

// Lifecycle
onMounted(() => {
  loadMetrics()
})

// Watch for period changes
watch(() => props.period, () => {
  loadMetrics()
})
</script>

<style scoped>
.kpi-chart-card {
  height: 100%;
  transition: all 0.2s ease-in-out;
  border-radius: 12px;
}

.kpi-chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.h-100 {
  height: 100%;
}

.card-title-responsive {
  font-size: 1rem;
  padding: 12px 16px;
}

.conversion-gauge {
  margin-top: 8px;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .card-title-responsive {
    font-size: 0.875rem;
    padding: 8px 12px;
  }

  .kpi-chart-card :deep(.v-card-text) {
    padding: 8px !important;
  }
}
</style>
