<template>
  <Card>
    <template #title>
      <div class="flex justify-content-between align-items-center">
        <span>Payment Analytics</span>
        <div class="flex gap-2">
          <Button
            :label="chartView === 'methods' ? 'Methods' : 'Trends'"
            icon="pi pi-chart-pie"
            @click="toggleChartView"
            class="p-button-sm p-button-outlined"
          />
        </div>
      </div>
    </template>

    <template #content>
      <!-- Summary Stats -->
      <div class="grid mb-4">
        <div class="col-12 md:col-4">
          <div class="text-center p-3 border-round bg-blue-50">
            <div class="text-blue-600 font-medium mb-1">Total Payments</div>
            <div class="text-2xl font-bold text-blue-900">
              {{ formatCurrency(data.totalPayments) }}
            </div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div class="text-center p-3 border-round bg-green-50">
            <div class="text-green-600 font-medium mb-1">Average Payment</div>
            <div class="text-2xl font-bold text-green-900">
              {{ formatCurrency(data.averagePaymentAmount) }}
            </div>
          </div>
        </div>
        <div class="col-12 md:col-4">
          <div class="text-center p-3 border-round bg-purple-50">
            <div class="text-purple-600 font-medium mb-1">Payment Count</div>
            <div class="text-2xl font-bold text-purple-900">
              {{ getTotalPaymentCount() }}
            </div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-container mb-4">
        <Chart
          v-if="chartView === 'methods'"
          type="doughnut"
          :data="paymentMethodChartData"
          :options="paymentMethodChartOptions"
          class="h-16rem"
        />
        <Chart
          v-else
          type="line"
          :data="paymentTrendChartData"
          :options="paymentTrendChartOptions"
          class="h-16rem"
        />
      </div>

      <!-- Payment Method Breakdown -->
      <div v-if="chartView === 'methods'" class="mb-4">
        <h4 class="text-lg font-semibold mb-3">Payment Method Breakdown</h4>
        <div class="grid">
          <div
            v-for="method in data.paymentsByMethod"
            :key="method.method"
            class="col-12 md:col-6"
          >
            <div
              class="flex align-items-center justify-content-between p-3 border-1 border-200 border-round"
            >
              <div class="flex align-items-center gap-2">
                <div
                  class="w-1rem h-1rem border-round"
                  :style="{ backgroundColor: getMethodColor(method.method) }"
                ></div>
                <div>
                  <div class="font-medium">{{ formatMethodName(method.method) }}</div>
                  <div class="text-sm text-600">{{ method.count }} payments</div>
                </div>
              </div>
              <div class="text-right">
                <div class="font-bold">{{ formatCurrency(method.amount) }}</div>
                <div class="text-sm text-600">{{ method.percentage.toFixed(1) }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Partial Payment Stats -->
      <div v-if="data.partialPaymentStats" class="mb-4">
        <h4 class="text-lg font-semibold mb-3">Partial Payment Analysis</h4>
        <div class="grid">
          <div class="col-12 md:col-6">
            <div class="text-center p-3 border-round bg-orange-50">
              <div class="text-orange-600 font-medium mb-1">
                Invoices with Partial Payments
              </div>
              <div class="text-xl font-bold text-orange-900">
                {{ data.partialPaymentStats.invoicesWithPartialPayments }}
              </div>
            </div>
          </div>
          <div class="col-12 md:col-6">
            <div class="text-center p-3 border-round bg-teal-50">
              <div class="text-teal-600 font-medium mb-1">Avg. Partial Payment Ratio</div>
              <div class="text-xl font-bold text-teal-900">
                {{
                  (data.partialPaymentStats.averagePartialPaymentRatio * 100).toFixed(1)
                }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Status Breakdown -->
      <div v-if="data.paymentsByStatus && data.paymentsByStatus.length > 0">
        <h4 class="text-lg font-semibold mb-3">Payment Status</h4>
        <div class="grid">
          <div
            v-for="status in data.paymentsByStatus"
            :key="status.status"
            class="col-12 md:col-6 lg:col-3"
          >
            <div
              class="text-center p-3 border-round"
              :class="getStatusBackgroundClass(status.status)"
            >
              <div :class="getStatusTextClass(status.status)" class="font-medium mb-1">
                {{ formatStatusName(status.status) }}
              </div>
              <div :class="getStatusTextClass(status.status)" class="text-lg font-bold">
                {{ formatCurrency(status.amount) }}
              </div>
              <div :class="getStatusTextClass(status.status)" class="text-sm">
                {{ status.count }} payments
              </div>
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

interface PaymentMethodAnalytics {
  method: string
  amount: number
  count: number
  percentage: number
  averageAmount: number
}

interface PaymentStatusAnalytics {
  status: string
  amount: number
  count: number
  percentage: number
}

interface PaymentTrend {
  date: string
  amount: number
  count: number
}

interface PartialPaymentStats {
  invoicesWithPartialPayments: number
  averagePartialPaymentRatio: number
  totalPartiallyPaidAmount: number
  averageTimeToFullPayment: number
}

interface PaymentAnalytics {
  totalPayments: number
  paymentsByMethod: PaymentMethodAnalytics[]
  paymentsByStatus: PaymentStatusAnalytics[]
  averagePaymentAmount: number
  paymentTrends: PaymentTrend[]
  partialPaymentStats: PartialPaymentStats
}

interface Props {
  data: PaymentAnalytics
}

const props = defineProps<Props>()

const chartView = ref<"methods" | "trends">("methods")

// Computed properties
const paymentMethodChartData = computed(() => {
  const methodColors = {
    bank_transfer: "#3b82f6",
    credit_card: "#10b981",
    check: "#f59e0b",
    cash: "#ef4444",
    other: "#6b7280",
  }

  return {
    labels: props.data.paymentsByMethod.map((method) => formatMethodName(method.method)),
    datasets: [
      {
        data: props.data.paymentsByMethod.map((method) => method.amount),
        backgroundColor: props.data.paymentsByMethod.map(
          (method) =>
            methodColors[method.method as keyof typeof methodColors] || "#6b7280"
        ),
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  }
})

const paymentTrendChartData = computed(() => {
  const sortedTrends = [...props.data.paymentTrends].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return {
    labels: sortedTrends.map((trend) => new Date(trend.date).toLocaleDateString()),
    datasets: [
      {
        label: "Payment Amount",
        data: sortedTrends.map((trend) => trend.amount),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
        yAxisID: "y",
      },
      {
        label: "Payment Count",
        data: sortedTrends.map((trend) => trend.count),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: false,
        yAxisID: "y1",
      },
    ],
  }
})

const paymentMethodChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const method = props.data.paymentsByMethod[context.dataIndex]
          return `${context.label}: ${formatCurrency(
            context.parsed
          )} (${method.percentage.toFixed(1)}%)`
        },
      },
    },
  },
}))

const paymentTrendChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          if (context.datasetIndex === 0) {
            return `Amount: ${formatCurrency(context.parsed.y)}`
          } else {
            return `Count: ${context.parsed.y} payments`
          }
        },
      },
    },
  },
  scales: {
    y: {
      type: "linear" as const,
      display: true,
      position: "left" as const,
      ticks: {
        callback: (value: any) => formatCurrency(value),
      },
    },
    y1: {
      type: "linear" as const,
      display: true,
      position: "right" as const,
      grid: {
        drawOnChartArea: false,
      },
      ticks: {
        callback: (value: any) => `${value}`,
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

const formatMethodName = (method: string): string => {
  return method
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const formatStatusName = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

const getMethodColor = (method: string): string => {
  const colors = {
    bank_transfer: "#3b82f6",
    credit_card: "#10b981",
    check: "#f59e0b",
    cash: "#ef4444",
    other: "#6b7280",
  }
  return colors[method as keyof typeof colors] || "#6b7280"
}

const getStatusBackgroundClass = (status: string): string => {
  const classes = {
    confirmed: "bg-green-50",
    pending: "bg-yellow-50",
    failed: "bg-red-50",
    cancelled: "bg-gray-50",
  }
  return classes[status as keyof typeof classes] || "bg-gray-50"
}

const getStatusTextClass = (status: string): string => {
  const classes = {
    confirmed: "text-green-600",
    pending: "text-yellow-600",
    failed: "text-red-600",
    cancelled: "text-gray-600",
  }
  return classes[status as keyof typeof classes] || "text-gray-600"
}

const getTotalPaymentCount = (): number => {
  return props.data.paymentsByMethod.reduce((sum, method) => sum + method.count, 0)
}

const toggleChartView = () => {
  chartView.value = chartView.value === "methods" ? "trends" : "methods"
}
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 16rem;
}

@media (max-width: 768px) {
  .chart-container {
    height: 14rem;
  }
}
</style>
