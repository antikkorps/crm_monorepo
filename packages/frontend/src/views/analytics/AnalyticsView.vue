<template>
  <AppLayout>
    <div class="analytics-view pa-4">
      <div class="page-header mb-6">
        <h1 class="text-h4 font-weight-bold">Analytics & Intelligence</h1>
        <p class="text-body-1 text-medium-emphasis">Vue d'ensemble des performances commerciales</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Chargement des analytics...</p>
      </div>

      <!-- Content -->
      <div v-else-if="analytics && forecast">
        <!-- Top KPIs -->
        <v-row id="tour-analytics-kpis" class="mb-6">
          <v-col cols="6" md="3">
            <v-card color="success" variant="tonal" class="kpi-card">
              <v-card-text class="text-center pa-3 pa-md-4">
                <v-icon size="28" class="mb-1 d-none d-sm-inline-flex">mdi-trophy</v-icon>
                <div class="text-h5 text-md-h4 font-weight-bold">{{ analytics.conversionRates.overall.winRate }}%</div>
                <div class="text-body-2 text-caption-mobile">Taux de réussite</div>
                <div class="text-caption text-medium-emphasis d-none d-sm-block">
                  {{ analytics.conversionRates.overall.won }} / {{ analytics.conversionRates.overall.won + analytics.conversionRates.overall.lost }} deals
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="6" md="3">
            <v-card color="primary" variant="tonal" class="kpi-card">
              <v-card-text class="text-center pa-3 pa-md-4">
                <v-icon size="28" class="mb-1 d-none d-sm-inline-flex">mdi-cash-multiple</v-icon>
                <div class="text-h5 text-md-h4 font-weight-bold">{{ formatCurrencyCompact(forecast.summary.expectedRevenue) }}</div>
                <div class="text-body-2 text-caption-mobile">Revenu prévu</div>
                <div class="text-caption text-medium-emphasis d-none d-sm-block">
                  Confiance: {{ formatConfidence(forecast.summary.confidence) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="6" md="3">
            <v-card color="warning" variant="tonal" class="kpi-card">
              <v-card-text class="text-center pa-3 pa-md-4">
                <v-icon size="28" class="mb-1 d-none d-sm-inline-flex">mdi-clock-outline</v-icon>
                <div class="text-h5 text-md-h4 font-weight-bold">{{ analytics.salesCycle.averageDaysToClose }}</div>
                <div class="text-body-2 text-caption-mobile">Jours cycle</div>
                <div class="text-caption text-medium-emphasis d-none d-sm-block">Moyenne</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="6" md="3">
            <v-card color="info" variant="tonal" class="kpi-card">
              <v-card-text class="text-center pa-3 pa-md-4">
                <v-icon size="28" class="mb-1 d-none d-sm-inline-flex">mdi-chart-line</v-icon>
                <div class="text-h5 text-md-h4 font-weight-bold">{{ formatCurrencyCompact(analytics.revenue.pipeline) }}</div>
                <div class="text-body-2 text-caption-mobile">Pipeline</div>
                <div class="text-caption text-medium-emphasis d-none d-sm-block">Opportunités ouvertes</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Revenue Breakdown with Donut Chart -->
        <v-row class="mb-6">
          <v-col cols="12" md="8">
            <v-card id="tour-analytics-revenue">
              <v-card-title class="d-flex align-center card-title-responsive">
                <v-icon class="mr-2" size="small">mdi-currency-eur</v-icon>
                {{ t('charts.revenue.title') }}
              </v-card-title>
              <v-card-text class="pa-2 pa-md-4">
                <BaseDonutChart
                  :data="revenueChartData"
                  :height="320"
                  :center-text="t('charts.revenue.total')"
                  :show-legend="true"
                  :show-labels="true"
                />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card class="h-100">
              <v-card-title class="d-flex align-center card-title-responsive">
                <v-icon class="mr-2" size="small">mdi-speedometer</v-icon>
                Records
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item v-if="analytics.salesCycle.fastestDeal">
                    <template v-slot:prepend>
                      <v-icon color="success" size="small">mdi-lightning-bolt</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">Plus rapide</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ analytics.salesCycle.fastestDeal.days }} jours
                      <span class="d-none d-sm-inline">- {{ analytics.salesCycle.fastestDeal.name }}</span>
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="analytics.salesCycle.slowestDeal">
                    <template v-slot:prepend>
                      <v-icon color="warning" size="small">mdi-tortoise</v-icon>
                    </template>
                    <v-list-item-title class="text-body-2">Plus lent</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ analytics.salesCycle.slowestDeal.days }} jours
                      <span class="d-none d-sm-inline">- {{ analytics.salesCycle.slowestDeal.name }}</span>
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="!analytics.salesCycle.fastestDeal && !analytics.salesCycle.slowestDeal">
                    <v-list-item-title class="text-body-2 text-medium-emphasis">
                      Aucun record enregistré
                    </v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Win/Loss Analysis with Bar Charts -->
        <v-row id="tour-analytics-winloss" class="mb-6">
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center card-title-responsive">
                <v-icon class="mr-2" color="success" size="small">mdi-check-circle</v-icon>
                {{ t('charts.winLoss.winReasons') }}
              </v-card-title>
              <v-card-text class="pa-2 pa-md-4">
                <BaseBarChart
                  v-if="winReasonsChartData.categories.length > 0"
                  :categories="winReasonsChartData.categories"
                  :series="winReasonsChartData.series"
                  :horizontal="true"
                  :height="250"
                  :colors="['#4CAF50']"
                  :show-data-labels="true"
                />
                <div v-else class="text-center py-8">
                  <v-icon size="48" color="grey-lighten-1">mdi-chart-bar</v-icon>
                  <p class="text-body-2 text-medium-emphasis mt-2">{{ t('charts.winLoss.noReasons') }}</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center card-title-responsive">
                <v-icon class="mr-2" color="error" size="small">mdi-close-circle</v-icon>
                {{ t('charts.winLoss.lossReasons') }}
              </v-card-title>
              <v-card-text class="pa-2 pa-md-4">
                <BaseBarChart
                  v-if="lossReasonsChartData.categories.length > 0"
                  :categories="lossReasonsChartData.categories"
                  :series="lossReasonsChartData.series"
                  :horizontal="true"
                  :height="250"
                  :colors="['#F44336']"
                  :show-data-labels="true"
                />
                <div v-else class="text-center py-8">
                  <v-icon size="48" color="grey-lighten-1">mdi-chart-bar</v-icon>
                  <p class="text-body-2 text-medium-emphasis mt-2">{{ t('charts.winLoss.noReasons') }}</p>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Competitor Analysis with Bar Chart -->
        <v-row id="tour-analytics-competitors" v-if="analytics.winLossAnalysis.competitorAnalysis.length > 0">
          <v-col cols="12">
            <v-card>
              <v-card-title class="d-flex align-center card-title-responsive">
                <v-icon class="mr-2" size="small">mdi-account-group</v-icon>
                {{ t('charts.competitors.title') }}
              </v-card-title>
              <v-card-text class="pa-2 pa-md-4">
                <BaseBarChart
                  :categories="competitorChartData.categories"
                  :series="competitorChartData.series"
                  :horizontal="true"
                  :height="300"
                  :show-legend="true"
                />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Error State -->
      <v-alert v-else-if="error" type="error" variant="tonal">
        <v-alert-title>Erreur</v-alert-title>
        {{ error }}
        <template v-slot:append>
          <v-btn variant="text" @click="loadAnalytics">Réessayer</v-btn>
        </template>
      </v-alert>

      <!-- Fallback State (no data loaded) -->
      <v-card v-else class="text-center pa-8">
        <v-icon size="64" color="grey-lighten-1">mdi-chart-line</v-icon>
        <div class="mt-4 text-h6">Aucune donnée disponible</div>
        <div class="text-body-1 text-medium-emphasis mb-4">
          Impossible de charger les analytics. Vérifiez que des opportunités existent.
        </div>
        <v-btn color="primary" @click="loadAnalytics">
          <v-icon start>mdi-refresh</v-icon>
          Réessayer
        </v-btn>
      </v-card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { useI18n } from "vue-i18n"
import { analyticsApi } from "@/services/api"
import type { PipelineAnalytics, RevenueForecast } from "@/services/api/analytics"
import AppLayout from "@/components/layout/AppLayout.vue"
import { BaseDonutChart, BaseBarChart, useChartColors } from "@/components/charts"

const { t } = useI18n()
const colors = useChartColors()

const analytics = ref<PipelineAnalytics | null>(null)
const forecast = ref<RevenueForecast | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Computed chart data
const revenueChartData = computed(() => {
  if (!analytics.value) return []
  return [
    {
      label: t('charts.revenue.won'),
      value: analytics.value.revenue.won,
      color: colors.chartColors.value.success,
    },
    {
      label: t('charts.revenue.pipeline'),
      value: analytics.value.revenue.pipeline,
      color: colors.chartColors.value.primary,
    },
    {
      label: t('charts.revenue.lost'),
      value: analytics.value.revenue.lost,
      color: colors.chartColors.value.error,
    },
  ]
})

const winReasonsChartData = computed(() => {
  if (!analytics.value) return { categories: [], series: [] }
  const reasons = analytics.value.winLossAnalysis.wonDeals.topReasons.slice(0, 5)
  return {
    categories: reasons.map(r => r.reason),
    series: [{
      name: t('charts.tooltips.count'),
      data: reasons.map(r => r.count),
    }],
  }
})

const lossReasonsChartData = computed(() => {
  if (!analytics.value) return { categories: [], series: [] }
  const reasons = analytics.value.winLossAnalysis.lostDeals.topReasons.slice(0, 5)
  return {
    categories: reasons.map(r => r.reason),
    series: [{
      name: t('charts.tooltips.count'),
      data: reasons.map(r => r.count),
    }],
  }
})

const competitorChartData = computed(() => {
  if (!analytics.value) return { categories: [], series: [] }
  const competitors = analytics.value.winLossAnalysis.competitorAnalysis.slice(0, 5)
  return {
    categories: competitors.map(c => c.competitor),
    series: [
      {
        name: t('charts.competitors.lostDeals'),
        data: competitors.map(c => c.lostDealsCount),
        color: colors.chartColors.value.warning,
      },
      {
        name: t('charts.competitors.lostValue'),
        data: competitors.map(c => Math.round(c.lostValue / 1000)), // In K€
        color: colors.chartColors.value.error,
      },
    ],
  }
})

const loadAnalytics = async () => {
  loading.value = true
  error.value = null

  try {
    const [analyticsResponse, forecastResponse] = await Promise.all([
      analyticsApi.getPipelineAnalytics(),
      analyticsApi.getRevenueForecast({ months: 6 }),
    ])

    analytics.value = analyticsResponse.data
    forecast.value = forecastResponse.data

    if (!analytics.value && !forecast.value) {
      error.value = "Les données analytics n'ont pas pu être récupérées"
    }
  } catch (err: any) {
    const message = err.response?.data?.error?.message || err.message || "Impossible de charger les analytics"
    error.value = message
    console.error("Failed to load analytics:", err)
  } finally {
    loading.value = false
  }
}

const formatCurrencyCompact = (amount: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(amount)
}

const formatConfidence = (confidence: "high" | "medium" | "low"): string => {
  const labels = {
    high: "Élevée",
    medium: "Moyenne",
    low: "Faible",
  }
  return labels[confidence]
}

onMounted(() => {
  loadAnalytics()
})
</script>

<style scoped>
.analytics-view {
  max-width: 1400px;
  margin: 0 auto;
}

.kpi-card {
  height: 100%;
}

.h-100 {
  height: 100%;
}

.card-title-responsive {
  font-size: 1rem;
  padding: 12px 16px;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .analytics-view {
    padding: 8px !important;
  }

  .page-header h1 {
    font-size: 1.25rem !important;
  }

  .page-header p {
    font-size: 0.875rem;
  }

  .text-caption-mobile {
    font-size: 0.75rem !important;
  }

  .card-title-responsive {
    font-size: 0.875rem;
    padding: 8px 12px;
  }

  .kpi-card :deep(.v-card-text) {
    padding: 8px !important;
  }
}

/* Tablet optimizations */
@media (min-width: 601px) and (max-width: 960px) {
  .card-title-responsive {
    font-size: 0.9375rem;
  }
}
</style>
