<template>
  <v-card elevation="2" class="h-100">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-chart-line" color="primary" class="mr-2" />
        Chiffre d'affaires consolidé
      </div>
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="loading"
        @click="loadRevenue"
      />
    </v-card-title>

    <!-- Loading State -->
    <v-card-text v-if="loading && !revenue" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement...</p>
    </v-card-text>

    <!-- Content -->
    <v-card-text v-else-if="revenue">
      <!-- Total Revenue -->
      <div class="mb-6 text-center">
        <div class="text-h3 font-weight-bold mb-2" style="color: var(--v-theme-primary)">
          {{ formatCurrency(revenue.total.totalRevenue) }}
        </div>
        <div class="text-body-2 text-medium-emphasis">
          CA Total
        </div>
      </div>

      <!-- Revenue Breakdown -->
      <v-row class="mb-4">
        <!-- Audit Revenue -->
        <v-col cols="12" sm="4">
          <div class="revenue-card audit-card">
            <div class="d-flex align-center mb-2">
              <v-icon icon="mdi-stethoscope" color="blue" size="20" class="mr-2" />
              <span class="text-subtitle-2">Audit</span>
            </div>
            <div class="text-h5 font-weight-bold mb-1" style="color: #2196F3">
              {{ formatCurrency(revenue.audit.totalRevenue) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ revenue.audit.invoiceCount }} facture(s)
            </div>
          </div>
        </v-col>

        <!-- Formation Revenue -->
        <v-col cols="12" sm="4">
          <div class="revenue-card formation-card">
            <div class="d-flex align-center mb-2">
              <v-icon icon="mdi-school" color="green" size="20" class="mr-2" />
              <span class="text-subtitle-2">Formation</span>
            </div>
            <div class="text-h5 font-weight-bold mb-1" style="color: #4CAF50">
              {{ formatCurrency(revenue.formation.totalRevenue) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ revenue.formation.invoiceCount }} facture(s)
            </div>
          </div>
        </v-col>

        <!-- Other Revenue -->
        <v-col cols="12" sm="4">
          <div class="revenue-card other-card">
            <div class="d-flex align-center mb-2">
              <v-icon icon="mdi-dots-horizontal" color="orange" size="20" class="mr-2" />
              <span class="text-subtitle-2">Autre</span>
            </div>
            <div class="text-h5 font-weight-bold mb-1" style="color: #FF9800">
              {{ formatCurrency(revenue.other.totalRevenue) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ revenue.other.invoiceCount }} facture(s)
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Payment Status -->
      <v-row class="mb-4">
        <v-col cols="6">
          <div class="text-center">
            <div class="text-h6 font-weight-bold" style="color: #4CAF50">
              {{ formatCurrency(revenue.total.paidRevenue) }}
            </div>
            <div class="text-caption text-medium-emphasis">Payé</div>
          </div>
        </v-col>
        <v-col cols="6">
          <div class="text-center">
            <div class="text-h6 font-weight-bold" style="color: #F44336">
              {{ formatCurrency(revenue.total.unpaidRevenue) }}
            </div>
            <div class="text-caption text-medium-emphasis">Impayé</div>
          </div>
        </v-col>
      </v-row>

      <!-- Revenue Evolution Chart -->
      <div v-if="evolution.length > 0" class="mb-4">
        <h4 class="text-subtitle-2 mb-3">Évolution (12 derniers mois)</h4>
        <div class="chart-container">
          <canvas ref="chartCanvas" />
        </div>
      </div>

      <!-- Period Selector -->
      <v-divider class="my-4" />

      <div class="d-flex align-center justify-space-between">
        <v-btn-group variant="outlined" density="compact">
          <v-btn
            :color="period === 'month' ? 'primary' : undefined"
            @click="setPeriod('month')"
          >
            Mois
          </v-btn>
          <v-btn
            :color="period === 'quarter' ? 'primary' : undefined"
            @click="setPeriod('quarter')"
          >
            Trimestre
          </v-btn>
          <v-btn
            :color="period === 'year' ? 'primary' : undefined"
            @click="setPeriod('year')"
          >
            Année
          </v-btn>
        </v-btn-group>

        <v-btn
          variant="text"
          color="primary"
          size="small"
          append-icon="mdi-arrow-right"
          @click="$router.push('/settings/digiforma')"
        >
          Configuration
        </v-btn>
      </div>
    </v-card-text>

    <!-- Error State -->
    <v-card-text v-else class="text-center py-12">
      <v-icon icon="mdi-alert-circle" size="64" color="error" class="mb-4" />
      <p class="text-body-1">Impossible de charger les données</p>
      <v-btn
        color="primary"
        variant="text"
        prepend-icon="mdi-refresh"
        @click="loadRevenue"
      >
        Réessayer
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { digiformaApi } from '@/services/api'
import type { ConsolidatedRevenue, RevenueEvolution } from '@/services/api/digiforma'
import Chart from 'chart.js/auto'

// Refs
const revenue = ref<ConsolidatedRevenue | null>(null)
const evolution = ref<RevenueEvolution[]>([])
const loading = ref(false)
const period = ref<'month' | 'quarter' | 'year'>('month')
const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)

// Load revenue data
async function loadRevenue() {
  loading.value = true
  try {
    const [revenueData, evolutionData] = await Promise.all([
      digiformaApi.revenue.getGlobalRevenue(...getPeriodDates()),
      digiformaApi.revenue.getRevenueEvolution(12)
    ])

    revenue.value = revenueData
    evolution.value = evolutionData

    // Update chart
    if (chartCanvas.value) {
      updateChart()
    }
  } catch (error) {
    console.error('Failed to load revenue:', error)
    revenue.value = null
  } finally {
    loading.value = false
  }
}

// Get period dates
function getPeriodDates(): [string?, string?] {
  const now = new Date()
  let startDate: Date

  switch (period.value) {
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), quarterStartMonth, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
  }

  return [startDate.toISOString(), now.toISOString()]
}

// Set period
function setPeriod(newPeriod: 'month' | 'quarter' | 'year') {
  period.value = newPeriod
  loadRevenue()
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Update chart
function updateChart() {
  if (!chartCanvas.value || evolution.value.length === 0) return

  // Destroy existing chart
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return

  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: evolution.value.map(e => {
        const date = new Date(e.month)
        return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      }),
      datasets: [
        {
          label: 'Audit',
          data: evolution.value.map(e => e.audit),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Formation',
          data: evolution.value.map(e => e.formation),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Autre',
          data: evolution.value.map(e => e.other),
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || ''
              const value = formatCurrency(context.parsed.y)
              return `${label}: ${value}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => {
              return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
                notation: 'compact'
              }).format(value as number)
            }
          }
        }
      }
    }
  })
}

// Lifecycle
onMounted(() => {
  loadRevenue()
})

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }
})

watch(chartCanvas, () => {
  if (chartCanvas.value && evolution.value.length > 0) {
    updateChart()
  }
})
</script>

<style scoped>
.revenue-card {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-surface), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  transition: all 0.3s ease;
}

.revenue-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.audit-card {
  border-left: 4px solid #2196F3;
}

.formation-card {
  border-left: 4px solid #4CAF50;
}

.other-card {
  border-left: 4px solid #FF9800;
}

.chart-container {
  height: 200px;
  position: relative;
}

.h-100 {
  height: 100%;
}
</style>
