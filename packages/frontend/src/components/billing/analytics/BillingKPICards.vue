<template>
  <v-row class="kpi-row">
    <!-- First row: 4 cards -->
    <v-col cols="6" md="6" lg="3">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="d-flex flex-column h-100">
          <div class="d-flex align-center flex-grow-1">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Factures Actives</div>
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatNumber(kpis?.totalActiveInvoices || 0) }}
              </div>
              <div class="kpi-status-placeholder"></div>
            </div>
            <v-avatar color="blue-lighten-4" size="48" class="d-none d-sm-flex">
              <v-icon icon="mdi-file-document-outline" color="blue" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="6" md="6" lg="3">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="d-flex flex-column h-100">
          <div class="d-flex align-center flex-grow-1">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Temps Recouvrement</div>
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatDays(kpis?.averageCollectionTime || 0) }}
              </div>
              <div class="text-body-2 text-medium-emphasis">jours</div>
            </div>
            <v-avatar color="green-lighten-4" size="48" class="d-none d-sm-flex">
              <v-icon icon="mdi-clock-outline" color="green" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="6" md="6" lg="3">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="d-flex flex-column h-100">
          <div class="d-flex align-center flex-grow-1">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Taux Recouvrement</div>
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatPercentage(kpis?.collectionRate || 0) }}
              </div>
              <div class="d-flex align-center mt-1">
                <v-icon :icon="collectionRateIcon" :color="collectionRateIconColor" size="small" class="mr-1" />
                <span :class="collectionRateColor" class="text-body-2 font-weight-medium">
                  {{ getCollectionRateStatus(kpis?.collectionRate || 0) }}
                </span>
              </div>
            </div>
            <v-avatar color="purple-lighten-4" size="48" class="d-none d-sm-flex">
              <v-icon icon="mdi-percent" color="purple" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="6" md="6" lg="3">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="d-flex flex-column h-100">
          <div class="d-flex align-center flex-grow-1">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Taux d'Impayés</div>
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatPercentage(kpis?.overdueRate || 0) }}
              </div>
              <div class="d-flex align-center mt-1">
                <v-icon :icon="overdueRateIcon" :color="overdueRateIconColor" size="small" class="mr-1" />
                <span :class="overdueRateColor" class="text-body-2 font-weight-medium">
                  {{ getOverdueRateStatus(kpis?.overdueRate || 0) }}
                </span>
              </div>
            </div>
            <v-avatar color="orange-lighten-4" size="48" class="d-none d-sm-flex">
              <v-icon icon="mdi-alert-triangle" color="orange" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- Second row: 3 cards -->
    <v-col cols="6" md="4" lg="4">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="d-flex flex-column h-100">
          <div class="d-flex align-center flex-grow-1">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Croissance Mensuelle</div>
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ formatPercentage(kpis?.monthlyGrowthRate || 0) }}
              </div>
              <div class="d-flex align-center mt-1">
                <v-icon :icon="growthRateIcon" :color="growthRateIconColor" size="small" class="mr-1" />
                <span :class="growthRateColor" class="text-body-2 font-weight-medium">
                  {{ getGrowthRateStatus(kpis?.monthlyGrowthRate || 0) }}
                </span>
              </div>
            </div>
            <v-avatar color="teal-lighten-4" size="48" class="d-none d-sm-flex">
              <v-icon icon="mdi-chart-line" color="teal" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="6" md="4" lg="4">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="d-flex flex-column h-100">
          <div class="d-flex align-center flex-grow-1">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Score de Paiement</div>
              <div class="text-h5 text-md-h4 font-weight-bold">
                {{ Math.round(kpis?.customerPaymentScore || 0) }}/100
              </div>
              <div class="mt-1">
                <v-progress-linear
                  :model-value="kpis?.customerPaymentScore || 0"
                  height="8"
                  :color="getPaymentScoreColor(kpis?.customerPaymentScore || 0)"
                  rounded
                />
              </div>
            </div>
            <v-avatar color="indigo-lighten-4" size="48" class="d-none d-sm-flex">
              <v-icon icon="mdi-star" color="indigo" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="4" lg="4">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="text-center d-flex flex-column justify-center h-100">
          <div class="text-medium-emphasis text-body-2 mb-2">Score de Santé Global</div>
          <div class="d-flex justify-center mb-2">
            <v-progress-circular
              :model-value="overallHealthScore"
              :size="100"
              :width="8"
              :color="getHealthScoreColor(overallHealthScore)"
            >
              <div class="text-center">
                <div class="text-h5 text-md-h4 font-weight-bold">
                  {{ Math.round(overallHealthScore) }}
                </div>
                <div class="text-caption text-medium-emphasis">Score</div>
              </div>
            </v-progress-circular>
          </div>
          <div
            class="text-body-2"
            :class="getHealthScoreTextColor(overallHealthScore)"
          >
            {{ getHealthScoreLabel(overallHealthScore) }}
          </div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed } from "vue"

interface BillingKPIs {
  totalActiveInvoices: number
  averageCollectionTime: number
  collectionRate: number
  overdueRate: number
  monthlyGrowthRate: number
  customerPaymentScore: number
}

interface Props {
  kpis: BillingKPIs
}

const props = defineProps<Props>()

// Computed properties
const overallHealthScore = computed(() => {
  // Calculate overall health score based on KPIs
  const collectionScore = Math.min(props.kpis.collectionRate, 100)
  const overdueScore = Math.max(0, 100 - props.kpis.overdueRate * 2) // Penalize overdue rate
  const paymentScore = props.kpis.customerPaymentScore
  const growthScore = Math.min(100, Math.max(0, 50 + props.kpis.monthlyGrowthRate))

  return (collectionScore + overdueScore + paymentScore + growthScore) / 4
})

const collectionRateIcon = computed(() => {
  const rate = props.kpis?.collectionRate || 0
  return rate >= 80
    ? "mdi-arrow-up"
    : rate >= 60
    ? "mdi-minus"
    : "mdi-arrow-down"
})

const collectionRateIconColor = computed(() => {
  const rate = props.kpis?.collectionRate || 0
  return rate >= 80
    ? "success"
    : rate >= 60
    ? "warning"
    : "error"
})

const collectionRateColor = computed(() => {
  const rate = props.kpis?.collectionRate || 0
  return rate >= 80
    ? "text-success"
    : rate >= 60
    ? "text-warning"
    : "text-error"
})

const overdueRateIcon = computed(() => {
  const rate = props.kpis?.overdueRate || 0
  return rate <= 10
    ? "mdi-check"
    : rate <= 20
    ? "mdi-exclamation"
    : "mdi-close"
})

const overdueRateIconColor = computed(() => {
  const rate = props.kpis?.overdueRate || 0
  return rate <= 10
    ? "success"
    : rate <= 20
    ? "warning"
    : "error"
})

const overdueRateColor = computed(() => {
  const rate = props.kpis?.overdueRate || 0
  return rate <= 10
    ? "text-success"
    : rate <= 20
    ? "text-warning"
    : "text-error"
})

const growthRateIcon = computed(() => {
  const rate = props.kpis?.monthlyGrowthRate || 0
  return rate > 0
    ? "mdi-arrow-up"
    : rate === 0
    ? "mdi-minus"
    : "mdi-arrow-down"
})

const growthRateIconColor = computed(() => {
  const rate = props.kpis?.monthlyGrowthRate || 0
  return rate > 0
    ? "success"
    : rate === 0
    ? "warning"
    : "error"
})

const growthRateColor = computed(() => {
  const rate = props.kpis?.monthlyGrowthRate || 0
  return rate > 0
    ? "text-success"
    : rate === 0
    ? "text-warning"
    : "text-error"
})

// Methods
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat().format(value)
}

const formatDays = (value: number): string => {
  return Math.round(value).toString()
}

const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`
}

const getCollectionRateStatus = (rate: number): string => {
  if (rate >= 80) return "Excellent"
  if (rate >= 60) return "Bon"
  return "À Améliorer"
}

const getOverdueRateStatus = (rate: number): string => {
  if (rate <= 10) return "Excellent"
  if (rate <= 20) return "Acceptable"
  return "Risque Élevé"
}

const getGrowthRateStatus = (rate: number): string => {
  if (rate > 5) return "Forte Croissance"
  if (rate > 0) return "En Croissance"
  if (rate === 0) return "Stable"
  return "En Déclin"
}

const getPaymentScoreColor = (score: number): string => {
  if (score >= 80) return "success"
  if (score >= 60) return "warning"
  return "error"
}

const getHealthScoreColor = (score: number): string => {
  if (score >= 80) return "success"
  if (score >= 60) return "warning"
  return "error"
}

const getHealthScoreTextColor = (score: number): string => {
  if (score >= 80) return "text-success"
  if (score >= 60) return "text-warning"
  return "text-error"
}

const getHealthScoreLabel = (score: number): string => {
  if (score >= 80) return "Santé Excellente"
  if (score >= 60) return "Bonne Santé"
  if (score >= 40) return "Santé Correcte"
  return "Santé Faible"
}
</script>

<style scoped>
.kpi-row {
  align-items: stretch;
}

.kpi-card {
  transition: transform 0.2s ease-in-out;
  height: 100%;
}

.kpi-card:hover {
  transform: translateY(-2px);
}

.h-100 {
  height: 100%;
}

/* Placeholder to maintain consistent card height */
.kpi-status-placeholder {
  height: 20px;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .kpi-card :deep(.v-card-text) {
    padding: 12px !important;
  }
}
</style>
