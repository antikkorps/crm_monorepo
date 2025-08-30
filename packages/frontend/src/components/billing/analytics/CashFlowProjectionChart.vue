<template>
  <Card>
    <template #title>
      <div class="flex justify-content-between align-items-center">
        <span>Cash Flow Projections</span>
        <div class="flex gap-2">
          <Dropdown
            v-model="projectionDays"
            :options="projectionOptions"
            option-label="label"
            option-value="value"
            @change="$emit('update-projection-days', projectionDays)"
            class="p-dropdown-sm"
          />
        </div>
      </div>
    </template>

    <template #content>
      <!-- Summary Cards -->
      <div class="grid mb-4">
        <div class="col-12 md:col-4">
          <div class="text-center p-3 border-round bg-blue-50">
            <div class="text-blue-600 font-medium mb-1">Expected Inflow</div>
            <div class="text-xl font-bold text-blue-900">
              {{ formatCurrency(totalExpectedInflow) }}
            </div>
            <div class="text-sm text-blue-600">Next {{ projectionDays }} days</div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div class="text-center p-3 border-round bg-green-50">
            <div class="text-green-600 font-medium mb-1">Pending Inflow</div>
            <div class="text-xl font-bold text-green-900">
              {{ formatCurrency(totalPendingInflow) }}
            </div>
            <div class="text-sm text-green-600">{{ totalPendingCount }} invoices</div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div class="text-center p-3 border-round bg-red-50">
            <div class="text-red-600 font-medium mb-1">Overdue Inflow</div>
            <div class="text-xl font-bold text-red-900">
              {{ formatCurrency(totalOverdueInflow) }}
            </div>
            <div class="text-sm text-red-600">{{ totalOverdueCount }} invoices</div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-container mb-4">
        <Chart
          type="bar"
          :data="cashFlowChartData"
          :options="cashFlowChartOptions"
          class="h-20rem"
        />
      </div>

      <!-- Weekly Breakdown -->
      <div class="mb-4">
        <h4 class="text-lg font-semibold mb-3">Weekly Breakdown</h4>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-bottom-1 border-200">
                <th class="text-left p-2 font-semibold">Week</th>
                <th class="text-right p-2 font-semibold">Expected</th>
                <th class="text-right p-2 font-semibold">Pending</th>
                <th class="text-right p-2 font-semibold">Overdue</th>
                <th class="text-right p-2 font-semibold">Invoices</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(projection, index) in data.slice(0, 6)"
                :key="index"
                class="border-bottom-1 border-100 hover:bg-gray-50"
              >
                <td class="p-2">
                  <div class="font-medium">
                    {{ formatWeekLabel(projection.projectionDate) }}
                  </div>
                  <div class="text-sm text-600">
                    {{ formatDate(projection.projectionDate) }}
                  </div>
                </td>
                <td class="p-2 text-right font-medium">
                  {{ formatCurrency(projection.expectedInflow) }}
                </td>
                <td class="p-2 text-right text-green-600">
                  {{ formatCurrency(projection.pendingInflow) }}
                </td>
                <td class="p-2 text-right text-red-600">
                  {{ formatCurrency(projection.overdueInflow) }}
                </td>
                <td class="p-2 text-right">
                  <Badge
                    :value="projection.projectionDetails.length"
                    :severity="
                      projection.projectionDetails.length > 0 ? 'info' : 'secondary'
                    "
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top Upcoming Payments -->
      <div v-if="upcomingPayments.length > 0">
        <h4 class="text-lg font-semibold mb-3">Top Upcoming Payments</h4>
        <div class="space-y-2">
          <div
            v-for="payment in upcomingPayments.slice(0, 5)"
            :key="payment.invoiceId"
            class="flex align-items-center justify-content-between p-3 border-1 border-200 border-round hover:bg-gray-50 cursor-pointer"
            @click="$emit('view-invoice', payment.invoiceId)"
          >
            <div class="flex-1">
              <div class="font-medium">{{ payment.invoiceNumber }}</div>
              <div class="text-sm text-600">{{ payment.institutionName }}</div>
              <div class="text-xs text-500">
                Due: {{ formatDate(payment.dueDate) }} | Projected:
                {{ formatDate(payment.projectedPaymentDate) }}
              </div>
            </div>
            <div class="text-right">
              <div class="font-bold">{{ formatCurrency(payment.remainingAmount) }}</div>
              <div class="text-sm text-600">
                <i class="pi pi-chart-line mr-1"></i>
                {{ (payment.probability * 100).toFixed(0) }}% likely
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Risk Analysis -->
      <div class="mt-4 p-3 border-round bg-yellow-50">
        <h5 class="text-lg font-semibold mb-2 text-yellow-800">Risk Analysis</h5>
        <div class="grid">
          <div class="col-12 md:col-6">
            <div class="text-sm text-yellow-700">
              <strong>High Risk Invoices:</strong> {{ highRiskCount }}
            </div>
            <div class="text-xs text-yellow-600 mt-1">
              Invoices with &lt;50% payment probability
            </div>
          </div>
          <div class="col-12 md:col-6">
            <div class="text-sm text-yellow-700">
              <strong>Confidence Level:</strong> {{ overallConfidence }}%
            </div>
            <div class="text-xs text-yellow-600 mt-1">
              Based on historical payment patterns
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Chart from "primevue/chart"
import { computed, ref } from "vue"

interface CashFlowDetail {
  invoiceId: string
  invoiceNumber: string
  institutionName: string
  dueDate: Date
  amount: number
  remainingAmount: number
  probability: number
  projectedPaymentDate: Date
}

interface CashFlowProjection {
  projectionDate: Date
  expectedInflow: number
  confirmedInflow: number
  pendingInflow: number
  overdueInflow: number
  projectionDetails: CashFlowDetail[]
}

interface Props {
  data: CashFlowProjection[]
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  "update-projection-days": [days: number]
  "view-invoice": [id: string]
}>()

const projectionDays = ref(90)

const projectionOptions = [
  { label: "30 Days", value: 30 },
  { label: "60 Days", value: 60 },
  { label: "90 Days", value: 90 },
  { label: "120 Days", value: 120 },
]

// Computed properties
const totalExpectedInflow = computed(() => {
  return props.data.reduce((sum, projection) => sum + projection.expectedInflow, 0)
})

const totalPendingInflow = computed(() => {
  return props.data.reduce((sum, projection) => sum + projection.pendingInflow, 0)
})

const totalOverdueInflow = computed(() => {
  return props.data.reduce((sum, projection) => sum + projection.overdueInflow, 0)
})

const totalPendingCount = computed(() => {
  return props.data.reduce((sum, projection) => {
    return (
      sum +
      projection.projectionDetails.filter(
        (detail) => new Date(detail.dueDate) >= new Date()
      ).length
    )
  }, 0)
})

const totalOverdueCount = computed(() => {
  return props.data.reduce((sum, projection) => {
    return (
      sum +
      projection.projectionDetails.filter(
        (detail) => new Date(detail.dueDate) < new Date()
      ).length
    )
  }, 0)
})

const upcomingPayments = computed(() => {
  const allPayments = props.data.flatMap((projection) => projection.projectionDetails)
  return allPayments.sort((a, b) => b.remainingAmount - a.remainingAmount).slice(0, 10)
})

const highRiskCount = computed(() => {
  const allPayments = props.data.flatMap((projection) => projection.projectionDetails)
  return allPayments.filter((payment) => payment.probability < 0.5).length
})

const overallConfidence = computed(() => {
  const allPayments = props.data.flatMap((projection) => projection.projectionDetails)
  if (allPayments.length === 0) return 0

  const totalWeightedProbability = allPayments.reduce((sum, payment) => {
    return sum + payment.probability * payment.remainingAmount
  }, 0)

  const totalAmount = allPayments.reduce(
    (sum, payment) => sum + payment.remainingAmount,
    0
  )

  return totalAmount > 0 ? Math.round((totalWeightedProbability / totalAmount) * 100) : 0
})

const cashFlowChartData = computed(() => {
  const sortedData = [...props.data].sort(
    (a, b) => new Date(a.projectionDate).getTime() - new Date(b.projectionDate).getTime()
  )

  return {
    labels: sortedData.map((projection) => formatWeekLabel(projection.projectionDate)),
    datasets: [
      {
        label: "Expected Inflow",
        data: sortedData.map((projection) => projection.expectedInflow),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "#3b82f6",
        borderWidth: 1,
      },
      {
        label: "Pending Inflow",
        data: sortedData.map((projection) => projection.pendingInflow),
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "#10b981",
        borderWidth: 1,
      },
      {
        label: "Overdue Inflow",
        data: sortedData.map((projection) => projection.overdueInflow),
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderColor: "#ef4444",
        borderWidth: 1,
      },
    ],
  }
})

const cashFlowChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        callback: (value: any) => formatCurrency(value),
      },
    },
  },
}))

// Methods
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

const formatWeekLabel = (date: Date): string => {
  const weekStart = new Date(date)
  const weekEnd = new Date(date)
  weekEnd.setDate(weekStart.getDate() + 6)

  return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
}
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 20rem;
}

.space-y-2 > * + * {
  margin-top: 0.5rem;
}

.hover\:bg-gray-50:hover {
  background-color: #f9fafb;
}

.cursor-pointer {
  cursor: pointer;
}

.overflow-x-auto {
  overflow-x: auto;
}

@media (max-width: 768px) {
  .chart-container {
    height: 16rem;
  }
}
</style>
