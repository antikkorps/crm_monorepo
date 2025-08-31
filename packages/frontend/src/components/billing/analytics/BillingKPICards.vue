<template>
  <v-row>
    <v-col cols="12" md="6" lg="3">
      <v-card class="kpi-card" elevation="2" hover>
        <v-card-text>
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Active Invoices</div>
              <div class="text-h4 font-weight-bold">
                {{ formatNumber(kpis?.totalActiveInvoices || 0) }}
              </div>
            </div>
            <v-avatar color="blue-lighten-4" size="48">
              <v-icon icon="mdi-file-document-outline" color="blue" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="3">
      <v-card class="kpi-card" elevation="2" hover>
        <v-card-text>
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Avg Collection Time</div>
              <div class="text-h4 font-weight-bold">
                {{ formatDays(kpis?.averageCollectionTime || 0) }}
              </div>
              <div class="text-body-2 text-medium-emphasis">days</div>
            </div>
            <v-avatar color="green-lighten-4" size="48">
              <v-icon icon="mdi-clock-outline" color="green" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="3">
      <v-card class="kpi-card" elevation="2" hover>
        <v-card-text>
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Collection Rate</div>
              <div class="text-h4 font-weight-bold">
                {{ formatPercentage(kpis?.collectionRate || 0) }}
              </div>
              <div class="d-flex align-center mt-1">
                <v-icon :icon="collectionRateIcon" :color="collectionRateIconColor" size="small" class="mr-1" />
                <span :class="collectionRateColor" class="text-body-2 font-weight-medium">
                  {{ getCollectionRateStatus(kpis?.collectionRate || 0) }}
                </span>
              </div>
            </div>
            <v-avatar color="purple-lighten-4" size="48">
              <v-icon icon="mdi-percent" color="purple" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="3">
      <v-card class="kpi-card" elevation="2" hover>
        <v-card-text>
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Overdue Rate</div>
              <div class="text-h4 font-weight-bold">
                {{ formatPercentage(kpis?.overdueRate || 0) }}
              </div>
              <div class="d-flex align-center mt-1">
                <v-icon :icon="overdueRateIcon" :color="overdueRateIconColor" size="small" class="mr-1" />
                <span :class="overdueRateColor" class="text-body-2 font-weight-medium">
                  {{ getOverdueRateStatus(kpis?.overdueRate || 0) }}
                </span>
              </div>
            </div>
            <v-avatar color="orange-lighten-4" size="48">
              <v-icon icon="mdi-alert-triangle" color="orange" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="4">
      <v-card class="kpi-card" elevation="2" hover>
        <v-card-text>
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Monthly Growth</div>
              <div class="text-h4 font-weight-bold">
                {{ formatPercentage(kpis?.monthlyGrowthRate || 0) }}
              </div>
              <div class="d-flex align-center mt-1">
                <v-icon :icon="growthRateIcon" :color="growthRateIconColor" size="small" class="mr-1" />
                <span :class="growthRateColor" class="text-body-2 font-weight-medium">
                  {{ getGrowthRateStatus(kpis?.monthlyGrowthRate || 0) }}
                </span>
              </div>
            </div>
            <v-avatar color="teal-lighten-4" size="48">
              <v-icon icon="mdi-chart-line" color="teal" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="6" lg="4">
      <v-card class="kpi-card" elevation="2" hover>
        <v-card-text>
          <div class="d-flex align-center">
            <div class="flex-grow-1">
              <div class="text-medium-emphasis text-body-2 mb-1">Payment Score</div>
              <div class="text-h4 font-weight-bold">
                {{ Math.round(kpis?.customerPaymentScore || 0) }}/100
              </div>
              <div class="mt-2">
                <v-progress-linear
                  :model-value="kpis?.customerPaymentScore || 0"
                  height="8"
                  :color="getPaymentScoreColor(kpis?.customerPaymentScore || 0)"
                  rounded
                />
              </div>
            </div>
            <v-avatar color="indigo-lighten-4" size="48">
              <v-icon icon="mdi-star" color="indigo" />
            </v-avatar>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="12" lg="4">
      <v-card class="kpi-card fill-height" elevation="2" hover>
        <v-card-text class="text-center">
          <div class="text-medium-emphasis text-body-2 mb-2">Overall Health Score</div>
          <div class="d-flex justify-center mb-3">
            <v-progress-circular
              :model-value="overallHealthScore"
              :size="120"
              :width="8"
              :color="getHealthScoreColor(overallHealthScore)"
            >
              <div class="text-center">
                <div class="text-h4 font-weight-bold">
                  {{ Math.round(overallHealthScore) }}
                </div>
                <div class="text-body-2 text-medium-emphasis">Score</div>
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
  if (rate >= 60) return "Good"
  return "Needs Improvement"
}

const getOverdueRateStatus = (rate: number): string => {
  if (rate <= 10) return "Excellent"
  if (rate <= 20) return "Acceptable"
  return "High Risk"
}

const getGrowthRateStatus = (rate: number): string => {
  if (rate > 5) return "Strong Growth"
  if (rate > 0) return "Growing"
  if (rate === 0) return "Stable"
  return "Declining"
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
  if (score >= 80) return "Excellent Health"
  if (score >= 60) return "Good Health"
  if (score >= 40) return "Fair Health"
  return "Poor Health"
}
</script>

<style scoped>
.kpi-card {
  transition: transform 0.2s ease-in-out;
}

.kpi-card:hover {
  transform: translateY(-2px);
}
</style>
