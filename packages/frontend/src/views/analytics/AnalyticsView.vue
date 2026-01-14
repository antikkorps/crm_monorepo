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
          <v-col cols="12" md="3">
            <v-card color="success" variant="tonal">
              <v-card-text class="text-center">
                <v-icon size="32" class="mb-2">mdi-trophy</v-icon>
                <div class="text-h4 font-weight-bold">{{ analytics.conversionRates.overall.winRate }}%</div>
                <div class="text-body-2">Taux de réussite</div>
                <div class="text-caption text-medium-emphasis">
                  {{ analytics.conversionRates.overall.won }} / {{ analytics.conversionRates.overall.won + analytics.conversionRates.overall.lost }} deals
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="3">
            <v-card color="primary" variant="tonal">
              <v-card-text class="text-center">
                <v-icon size="32" class="mb-2">mdi-cash-multiple</v-icon>
                <div class="text-h4 font-weight-bold">{{ formatCurrency(forecast.summary.expectedRevenue) }}</div>
                <div class="text-body-2">Revenu prévu</div>
                <div class="text-caption text-medium-emphasis">
                  Confiance: {{ formatConfidence(forecast.summary.confidence) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="3">
            <v-card color="warning" variant="tonal">
              <v-card-text class="text-center">
                <v-icon size="32" class="mb-2">mdi-clock-outline</v-icon>
                <div class="text-h4 font-weight-bold">{{ analytics.salesCycle.averageDaysToClose }}</div>
                <div class="text-body-2">Jours cycle de vente</div>
                <div class="text-caption text-medium-emphasis">Moyenne</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="3">
            <v-card color="info" variant="tonal">
              <v-card-text class="text-center">
                <v-icon size="32" class="mb-2">mdi-chart-line</v-icon>
                <div class="text-h4 font-weight-bold">{{ formatCurrency(analytics.revenue.pipeline) }}</div>
                <div class="text-body-2">Pipeline actuel</div>
                <div class="text-caption text-medium-emphasis">Opportunités ouvertes</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Revenue Breakdown -->
        <v-row class="mb-6">
          <v-col cols="12" md="8">
            <v-card id="tour-analytics-revenue">
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-currency-eur</v-icon>
                Répartition des revenus
              </v-card-title>
              <v-card-text>
                <v-row>
                  <v-col cols="4">
                    <div class="text-center">
                      <div class="text-h6 font-weight-bold" style="color: #4CAF50">
                        {{ formatCurrency(analytics.revenue.won) }}
                      </div>
                      <div class="text-caption">Gagné</div>
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <div class="text-center">
                      <div class="text-h6 font-weight-bold" style="color: #2196F3">
                        {{ formatCurrency(analytics.revenue.pipeline) }}
                      </div>
                      <div class="text-caption">Pipeline</div>
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <div class="text-center">
                      <div class="text-h6 font-weight-bold" style="color: #F44336">
                        {{ formatCurrency(analytics.revenue.lost) }}
                      </div>
                      <div class="text-caption">Perdu</div>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-speedometer</v-icon>
                Records
              </v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item v-if="analytics.salesCycle.fastestDeal">
                    <template v-slot:prepend>
                      <v-icon color="success" size="small">mdi-lightning-bolt</v-icon>
                    </template>
                    <v-list-item-title class="text-caption">Plus rapide</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ analytics.salesCycle.fastestDeal.days }} jours
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="analytics.salesCycle.slowestDeal">
                    <template v-slot:prepend>
                      <v-icon color="warning" size="small">mdi-tortoise</v-icon>
                    </template>
                    <v-list-item-title class="text-caption">Plus lent</v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ analytics.salesCycle.slowestDeal.days }} jours
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Win/Loss Analysis -->
        <v-row id="tour-analytics-winloss" class="mb-6">
          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
                Top raisons de victoire
              </v-card-title>
              <v-card-text>
                <v-list v-if="analytics.winLossAnalysis.wonDeals.topReasons.length > 0">
                  <v-list-item
                    v-for="(reason, index) in analytics.winLossAnalysis.wonDeals.topReasons"
                    :key="index"
                    density="compact"
                  >
                    <v-list-item-title>{{ reason.reason }}</v-list-item-title>
                    <template v-slot:append>
                      <v-chip size="small" color="success" variant="tonal">{{ reason.count }}</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
                <p v-else class="text-medium-emphasis">Aucune donnée disponible</p>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2" color="error">mdi-close-circle</v-icon>
                Top raisons de perte
              </v-card-title>
              <v-card-text>
                <v-list v-if="analytics.winLossAnalysis.lostDeals.topReasons.length > 0">
                  <v-list-item
                    v-for="(reason, index) in analytics.winLossAnalysis.lostDeals.topReasons"
                    :key="index"
                    density="compact"
                  >
                    <v-list-item-title>{{ reason.reason }}</v-list-item-title>
                    <template v-slot:append>
                      <v-chip size="small" color="error" variant="tonal">{{ reason.count }}</v-chip>
                    </template>
                  </v-list-item>
                </v-list>
                <p v-else class="text-medium-emphasis">Aucune donnée disponible</p>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Competitor Analysis -->
        <v-row id="tour-analytics-competitors" v-if="analytics.winLossAnalysis.competitorAnalysis.length > 0">
          <v-col cols="12">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon class="mr-2">mdi-account-group</v-icon>
                Analyse concurrentielle
              </v-card-title>
              <v-card-text>
                <v-table density="compact">
                  <thead>
                    <tr>
                      <th>Concurrent</th>
                      <th class="text-right">Deals perdus</th>
                      <th class="text-right">Valeur perdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="comp in analytics.winLossAnalysis.competitorAnalysis.slice(0, 5)" :key="comp.competitor">
                      <td>{{ comp.competitor }}</td>
                      <td class="text-right">{{ comp.lostDealsCount }}</td>
                      <td class="text-right">{{ formatCurrency(comp.lostValue) }}</td>
                    </tr>
                  </tbody>
                </v-table>
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
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { analyticsApi } from "@/services/api"
import type { PipelineAnalytics, RevenueForecast } from "@/services/api/analytics"
import AppLayout from "@/components/layout/AppLayout.vue"

const analytics = ref<PipelineAnalytics | null>(null)
const forecast = ref<RevenueForecast | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const loadAnalytics = async () => {
  loading.value = true
  error.value = null

  try {
    const [analyticsResponse, forecastResponse] = await Promise.all([
      analyticsApi.getPipelineAnalytics(),
      analyticsApi.getRevenueForecast({ months: 6 }),
    ])

    analytics.value = analyticsResponse.data.data
    forecast.value = forecastResponse.data.data
  } catch (err: any) {
    error.value = err.message || "Impossible de charger les analytics"
    console.error("Failed to load analytics:", err)
  } finally {
    loading.value = false
  }
}

const formatCurrency = (amount: number): string => {
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
</style>
