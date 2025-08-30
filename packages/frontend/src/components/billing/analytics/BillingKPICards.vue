<template>
  <div class="grid">
    <div class="col-12 md:col-6 lg:col-3">
      <Card class="kpi-card">
        <template #content>
          <div class="flex align-items-center">
            <div class="flex-1">
              <div class="text-500 font-medium mb-1">Active Invoices</div>
              <div class="text-2xl font-bold text-900">
                {{ formatNumber(kpis.totalActiveInvoices) }}
              </div>
            </div>
            <div class="kpi-icon bg-blue-100 text-blue-600">
              <i class="pi pi-file-o text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-6 lg:col-3">
      <Card class="kpi-card">
        <template #content>
          <div class="flex align-items-center">
            <div class="flex-1">
              <div class="text-500 font-medium mb-1">Avg Collection Time</div>
              <div class="text-2xl font-bold text-900">
                {{ formatDays(kpis.averageCollectionTime) }}
              </div>
              <div class="text-sm text-500">days</div>
            </div>
            <div class="kpi-icon bg-green-100 text-green-600">
              <i class="pi pi-clock text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-6 lg:col-3">
      <Card class="kpi-card">
        <template #content>
          <div class="flex align-items-center">
            <div class="flex-1">
              <div class="text-500 font-medium mb-1">Collection Rate</div>
              <div class="text-2xl font-bold text-900">
                {{ formatPercentage(kpis.collectionRate) }}
              </div>
              <div class="flex align-items-center mt-1">
                <i :class="collectionRateIcon" class="text-sm mr-1"></i>
                <span :class="collectionRateColor" class="text-sm font-medium">
                  {{ getCollectionRateStatus(kpis.collectionRate) }}
                </span>
              </div>
            </div>
            <div class="kpi-icon bg-purple-100 text-purple-600">
              <i class="pi pi-percentage text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-6 lg:col-3">
      <Card class="kpi-card">
        <template #content>
          <div class="flex align-items-center">
            <div class="flex-1">
              <div class="text-500 font-medium mb-1">Overdue Rate</div>
              <div class="text-2xl font-bold text-900">
                {{ formatPercentage(kpis.overdueRate) }}
              </div>
              <div class="flex align-items-center mt-1">
                <i :class="overdueRateIcon" class="text-sm mr-1"></i>
                <span :class="overdueRateColor" class="text-sm font-medium">
                  {{ getOverdueRateStatus(kpis.overdueRate) }}
                </span>
              </div>
            </div>
            <div class="kpi-icon bg-orange-100 text-orange-600">
              <i class="pi pi-exclamation-triangle text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-6 lg:col-4">
      <Card class="kpi-card">
        <template #content>
          <div class="flex align-items-center">
            <div class="flex-1">
              <div class="text-500 font-medium mb-1">Monthly Growth</div>
              <div class="text-2xl font-bold text-900">
                {{ formatPercentage(kpis.monthlyGrowthRate) }}
              </div>
              <div class="flex align-items-center mt-1">
                <i :class="growthRateIcon" class="text-sm mr-1"></i>
                <span :class="growthRateColor" class="text-sm font-medium">
                  {{ getGrowthRateStatus(kpis.monthlyGrowthRate) }}
                </span>
              </div>
            </div>
            <div class="kpi-icon bg-teal-100 text-teal-600">
              <i class="pi pi-chart-line text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-6 lg:col-4">
      <Card class="kpi-card">
        <template #content>
          <div class="flex align-items-center">
            <div class="flex-1">
              <div class="text-500 font-medium mb-1">Payment Score</div>
              <div class="text-2xl font-bold text-900">
                {{ Math.round(kpis.customerPaymentScore) }}/100
              </div>
              <div class="mt-2">
                <ProgressBar
                  :value="kpis.customerPaymentScore"
                  :show-value="false"
                  class="h-1rem"
                  :class="getPaymentScoreClass(kpis.customerPaymentScore)"
                />
              </div>
            </div>
            <div class="kpi-icon bg-indigo-100 text-indigo-600">
              <i class="pi pi-star text-2xl"></i>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="col-12 md:col-12 lg:col-4">
      <Card class="kpi-card h-full">
        <template #content>
          <div class="text-center">
            <div class="text-500 font-medium mb-2">Overall Health Score</div>
            <div class="relative inline-block">
              <svg width="120" height="120" class="circular-progress">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e5e7eb"
                  stroke-width="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  :stroke="getHealthScoreColor(overallHealthScore)"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="
                    circumference - (overallHealthScore / 100) * circumference
                  "
                  transform="rotate(-90 60 60)"
                  class="transition-all duration-1000"
                />
              </svg>
              <div
                class="absolute inset-0 flex align-items-center justify-content-center"
              >
                <div class="text-center">
                  <div class="text-2xl font-bold text-900">
                    {{ Math.round(overallHealthScore) }}
                  </div>
                  <div class="text-sm text-500">Score</div>
                </div>
              </div>
            </div>
            <div
              class="mt-2 text-sm"
              :class="getHealthScoreTextColor(overallHealthScore)"
            >
              {{ getHealthScoreLabel(overallHealthScore) }}
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
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
const circumference = computed(() => 2 * Math.PI * 50)

const overallHealthScore = computed(() => {
  // Calculate overall health score based on KPIs
  const collectionScore = Math.min(props.kpis.collectionRate, 100)
  const overdueScore = Math.max(0, 100 - props.kpis.overdueRate * 2) // Penalize overdue rate
  const paymentScore = props.kpis.customerPaymentScore
  const growthScore = Math.min(100, Math.max(0, 50 + props.kpis.monthlyGrowthRate))

  return (collectionScore + overdueScore + paymentScore + growthScore) / 4
})

const collectionRateIcon = computed(() => {
  return props.kpis.collectionRate >= 80
    ? "pi pi-arrow-up text-green-500"
    : props.kpis.collectionRate >= 60
    ? "pi pi-minus text-orange-500"
    : "pi pi-arrow-down text-red-500"
})

const collectionRateColor = computed(() => {
  return props.kpis.collectionRate >= 80
    ? "text-green-500"
    : props.kpis.collectionRate >= 60
    ? "text-orange-500"
    : "text-red-500"
})

const overdueRateIcon = computed(() => {
  return props.kpis.overdueRate <= 10
    ? "pi pi-check text-green-500"
    : props.kpis.overdueRate <= 20
    ? "pi pi-exclamation text-orange-500"
    : "pi pi-times text-red-500"
})

const overdueRateColor = computed(() => {
  return props.kpis.overdueRate <= 10
    ? "text-green-500"
    : props.kpis.overdueRate <= 20
    ? "text-orange-500"
    : "text-red-500"
})

const growthRateIcon = computed(() => {
  return props.kpis.monthlyGrowthRate > 0
    ? "pi pi-arrow-up text-green-500"
    : props.kpis.monthlyGrowthRate === 0
    ? "pi pi-minus text-orange-500"
    : "pi pi-arrow-down text-red-500"
})

const growthRateColor = computed(() => {
  return props.kpis.monthlyGrowthRate > 0
    ? "text-green-500"
    : props.kpis.monthlyGrowthRate === 0
    ? "text-orange-500"
    : "text-red-500"
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

const getPaymentScoreClass = (score: number): string => {
  if (score >= 80) return "p-progressbar-success"
  if (score >= 60) return "p-progressbar-warning"
  return "p-progressbar-danger"
}

const getHealthScoreColor = (score: number): string => {
  if (score >= 80) return "#10b981"
  if (score >= 60) return "#f59e0b"
  return "#ef4444"
}

const getHealthScoreTextColor = (score: number): string => {
  if (score >= 80) return "text-green-600"
  if (score >= 60) return "text-orange-600"
  return "text-red-600"
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
  height: 100%;
  transition: transform 0.2s ease-in-out;
}

.kpi-card:hover {
  transform: translateY(-2px);
}

.kpi-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 1rem;
}

.circular-progress {
  transform: rotate(-90deg);
}

.transition-all {
  transition: all 0.3s ease-in-out;
}

.duration-1000 {
  transition-duration: 1s;
}
</style>
