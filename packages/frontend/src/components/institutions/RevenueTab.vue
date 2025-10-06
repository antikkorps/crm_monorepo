<template>
  <div class="revenue-tab">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="text-body-1 mt-4">Chargement des revenus...</p>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Period Selector -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div class="d-flex align-center justify-space-between flex-wrap ga-4">
            <div class="d-flex align-center">
              <v-icon icon="mdi-calendar-range" size="small" class="mr-2 text-medium-emphasis" />
              <span class="text-subtitle-1 text-medium-emphasis">Période d'analyse</span>
            </div>
            <v-chip-group
              v-model="period"
              mandatory
              selected-class="text-primary"
              color="primary"
            >
              <v-chip value="month" variant="outlined">
                Ce mois
              </v-chip>
              <v-chip value="quarter" variant="outlined">
                Ce trimestre
              </v-chip>
              <v-chip value="year" variant="outlined">
                Cette année
              </v-chip>
              <v-chip value="all" variant="outlined">
                Total
              </v-chip>
            </v-chip-group>
          </div>
        </v-col>
      </v-row>

      <!-- Total Revenue Card -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2" color="primary" variant="tonal">
            <v-card-text class="text-center py-8">
              <div class="text-h3 font-weight-bold mb-2">
                {{ formatCurrency(revenue?.total.totalRevenue || 0) }}
              </div>
              <div class="text-h6 text-medium-emphasis">
                Chiffre d'affaires total
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Revenue Breakdown -->
      <v-row class="mb-6">
        <!-- Audit Revenue -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="h-100 audit-card">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-stethoscope" color="blue" class="mr-2" />
              CA Audit
            </v-card-title>
            <v-card-text>
              <div class="text-h4 font-weight-bold mb-3" style="color: #2196F3">
                {{ formatCurrency(revenue?.audit.totalRevenue || 0) }}
              </div>

              <v-divider class="my-3" />

              <v-row class="mb-3">
                <v-col cols="6">
                  <div class="text-subtitle-2 font-weight-bold" style="color: #4CAF50">
                    {{ formatCurrency(revenue?.audit.paidRevenue || 0) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Payé</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-subtitle-2 font-weight-bold" style="color: #F44336">
                    {{ formatCurrency(revenue?.audit.unpaidRevenue || 0) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Impayé</div>
                </v-col>
              </v-row>

              <div class="text-body-2 text-medium-emphasis">
                <v-icon icon="mdi-file-document" size="small" class="mr-1" />
                {{ revenue?.audit.invoiceCount || 0 }} facture(s)
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Formation Revenue -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="h-100 formation-card">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-school" color="green" class="mr-2" />
              CA Formation
            </v-card-title>
            <v-card-text>
              <div class="text-h4 font-weight-bold mb-3" style="color: #4CAF50">
                {{ formatCurrency(revenue?.formation.totalRevenue || 0) }}
              </div>

              <v-divider class="my-3" />

              <!-- TODO: Réactiver payé/impayé quand la connexion Sage sera mise en place -->
              <!-- <v-row class="mb-3">
                <v-col cols="6">
                  <div class="text-subtitle-2 font-weight-bold" style="color: #4CAF50">
                    {{ formatCurrency(revenue?.formation.paidRevenue || 0) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Payé</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-subtitle-2 font-weight-bold" style="color: #F44336">
                    {{ formatCurrency(revenue?.formation.unpaidRevenue || 0) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Impayé</div>
                </v-col>
              </v-row> -->

              <div class="text-body-2 text-medium-emphasis">
                <v-icon icon="mdi-file-document" size="small" class="mr-1" />
                {{ revenue?.formation.invoiceCount || 0 }} facture(s) (statut WON)
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Other Revenue -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="h-100 other-card">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-dots-horizontal" color="orange" class="mr-2" />
              CA Autre
            </v-card-title>
            <v-card-text>
              <div class="text-h4 font-weight-bold mb-3" style="color: #FF9800">
                {{ formatCurrency(revenue?.other.totalRevenue || 0) }}
              </div>

              <v-divider class="my-3" />

              <v-row class="mb-3">
                <v-col cols="6">
                  <div class="text-subtitle-2 font-weight-bold" style="color: #4CAF50">
                    {{ formatCurrency(revenue?.other.paidRevenue || 0) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Payé</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-subtitle-2 font-weight-bold" style="color: #F44336">
                    {{ formatCurrency(revenue?.other.unpaidRevenue || 0) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Impayé</div>
                </v-col>
              </v-row>

              <div class="text-body-2 text-medium-emphasis">
                <v-icon icon="mdi-file-document" size="small" class="mr-1" />
                {{ revenue?.other.invoiceCount || 0 }} facture(s)
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Comparison Chart -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-chart-bar" color="primary" class="mr-2" />
                Répartition des revenus
              </div>
              <v-btn-group variant="outlined" density="compact">
                <v-btn
                  :color="chartType === 'bar' ? 'primary' : undefined"
                  @click="chartType = 'bar'"
                  icon="mdi-chart-bar"
                />
                <v-btn
                  :color="chartType === 'pie' ? 'primary' : undefined"
                  @click="chartType = 'pie'"
                  icon="mdi-chart-pie"
                />
              </v-btn-group>
            </v-card-title>
            <v-card-text>
              <div class="chart-container">
                <canvas ref="revenueChart" />
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Error State -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      <v-alert-title>Erreur de chargement</v-alert-title>
      {{ error }}
      <template v-slot:append>
        <v-btn
          variant="text"
          color="error"
          size="small"
          @click="loadRevenue"
        >
          Réessayer
        </v-btn>
      </template>
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { digiformaApi } from '@/services/api'
import type { ConsolidatedRevenue } from '@/services/api/digiforma'
import Chart from 'chart.js/auto'

// Props
const props = defineProps<{
  institutionId: string
}>()

// Refs
const revenue = ref<ConsolidatedRevenue | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const period = ref<'month' | 'quarter' | 'year' | 'all'>('year')
const chartType = ref<'bar' | 'pie'>('bar')
const revenueChart = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)

// Load revenue
async function loadRevenue() {
  loading.value = true
  error.value = null

  try {
    const [startDate, endDate] = getPeriodDates()
    revenue.value = await digiformaApi.revenue.getInstitutionRevenue(
      props.institutionId,
      startDate,
      endDate
    )

    // Update chart
    if (revenueChart.value) {
      updateChart()
    }
  } catch (err: any) {
    error.value = err.message || 'Impossible de charger les revenus'
    console.error('Failed to load revenue:', err)
  } finally {
    loading.value = false
  }
}

// Get period dates
function getPeriodDates(): [string?, string?] {
  if (period.value === 'all') {
    return [undefined, undefined]
  }

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

// Update chart
function updateChart() {
  if (!revenueChart.value || !revenue.value) return

  // Destroy existing chart
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }

  const ctx = revenueChart.value.getContext('2d')
  if (!ctx) return

  if (chartType.value === 'bar') {
    chartInstance.value = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Audit', 'Formation', 'Autre'],
        datasets: [
          {
            label: 'Total',
            data: [
              revenue.value.audit.totalRevenue,
              revenue.value.formation.totalRevenue,
              revenue.value.other.totalRevenue
            ],
            backgroundColor: ['rgba(33, 150, 243, 0.7)', 'rgba(76, 175, 80, 0.7)', 'rgba(255, 152, 0, 0.7)'],
            borderColor: ['#2196F3', '#4CAF50', '#FF9800'],
            borderWidth: 2
          },
          {
            label: 'Payé',
            data: [
              revenue.value.audit.paidRevenue,
              revenue.value.formation.paidRevenue,
              revenue.value.other.paidRevenue
            ],
            backgroundColor: ['rgba(33, 150, 243, 0.5)', 'rgba(76, 175, 80, 0.5)', 'rgba(255, 152, 0, 0.5)'],
            borderColor: ['#2196F3', '#4CAF50', '#FF9800'],
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => new Intl.NumberFormat('fr-FR', {
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
    })
  } else {
    chartInstance.value = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Audit', 'Formation', 'Autre'],
        datasets: [{
          data: [
            revenue.value.audit.totalRevenue,
            revenue.value.formation.totalRevenue,
            revenue.value.other.totalRevenue
          ],
          backgroundColor: ['rgba(33, 150, 243, 0.7)', 'rgba(76, 175, 80, 0.7)', 'rgba(255, 152, 0, 0.7)'],
          borderColor: ['#2196F3', '#4CAF50', '#FF9800'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'right' },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || ''
                const value = formatCurrency(context.parsed)
                const total = revenue.value?.total.totalRevenue || 0
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0'
                return `${label}: ${value} (${percentage}%)`
              }
            }
          }
        }
      }
    })
  }
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

// Lifecycle
onMounted(() => {
  loadRevenue()
})

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }
})

watch([chartType, revenueChart], () => {
  if (revenueChart.value && revenue.value) {
    updateChart()
  }
})

watch(period, () => {
  loadRevenue()
})
</script>

<style scoped>
.h-100 {
  height: 100%;
}

.chart-container {
  height: 400px;
  position: relative;
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
</style>
