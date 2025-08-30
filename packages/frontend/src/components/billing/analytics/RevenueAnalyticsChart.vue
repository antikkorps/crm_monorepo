<template>
  <Card>
    <template #title>
      <div class="flex justify-content-between align-items-center">
        <span>Revenue Analytics</span>
        <div class="flex gap-2">
          <Button
            :label="chartType === 'monthly' ? 'Monthly' : 'Status'"
            icon="pi pi-chart-bar"
            @click="toggleChartType"
            class="p-button-sm p-button-outlined"
          />
        </div>
      </div>
    </template>

    <template #content>
      <!-- Summary Cards -->
      <div class="grid mb-4">
        <div class="col-12 md:col-3">
          <div class="text-center p-3 border-round bg-blue-50">
            <div class="text-blue-600 font-medium mb-1">Total Revenue</div>
            <div class="text-2xl font-bold text-blue-900">
              {{ formatCurrency(data.totalRevenue) }}
            </div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="text-center p-3 border-round bg-green-50">
            <div class="text-green-600 font-medium mb-1">Paid Revenue</div>
            <div class="text-2xl font-bold text-green-900">
              {{ formatCurrency(data.paidRevenue) }}
            </div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="text-center p-3 border-round bg-orange-50">
            <div class="text-orange-600 font-medium mb-1">Pending Revenue</div>
            <div class="text-2xl font-bold text-orange-900">
              {{ formatCurrency(data.pendingRevenue) }}
            </div>
          </div>
        </div>
        <div class="col-12 md:col-3">
          <div class="text-center p-3 border-round bg-red-50">
            <div class="text-red-600 font-medium mb-1">Overdue Revenue</div>
            <div class="text-2xl font-bold text-red-900">
              {{ formatCurrency(data.overdueRevenue) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-container">
        <Chart
          v-if="chartType === 'monthly'"
          type="line"
          :data="monthlyChartData"
          :options="monthlyChartOptions"
          class="h-20rem"
        />
        <Chart
          v-else
          type="doughnut"
          :data="statusChartData"
          :options="statusChartOptions"
          class="h-20rem"
        />
      </div>

      <!-- Additional Metrics -->
      <div class="grid mt-4">
        <div class="col-12 md:col-6">
          <div
            class="flex align-items-center justify-content-between p-3 border-1 border-200 border-round"
          >
            <div>
              <div class="text-600 font-medium">Average Invoice Value</div>
              <div class="text-xl font-bold text-900">
                {{ formatCurrency(data.averageInvoiceValue) }}
              </div>
            </div>
            <i class="pi pi-calculator text-2xl text-blue-500"></i>
          </div>
        </div>
        <div class="col-12 md:col-6">
          <div
            class="flex align-items-center justify-content-between p-3 border-1 border-200 border-round"
          >
            <div>
              <div class="text-600 font-medium">Average Payment Time</div>
              <div class="text-xl font-bold text-900">
                {{ Math.round(data.averagePaymentTime) }} days
              </div>
            </div>
            <i class="pi pi-clock text-2xl text-green-500"></i>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Chart from "primevue/chart"
import { computed, ref } from "vue"

interface MonthlyRevenue {
  month: string
  year: number
  totalInvoiced: number
  totalPaid: number
  invoiceCount: number
  paymentCount: number
}

interface RevenueByStatus {
  status: string
  amount: number
  count: number
  percentage: number
}

interface RevenueAnalytics {
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  overdueRevenue: number
  monthlyRevenue: MonthlyRevenue[]
  revenueByStatus: RevenueByStatus[]
  averageInvoiceValue: number
  averagePaymentTime: number
}

interface Props {
  data: RevenueAnalytics
}

const props = defineProps<Props>()

const chartType = ref<"monthly" | "status">("monthly")

// Computed properties for chart data
const monthlyChartData = computed(() => {
  const sortedData = [...props.data.monthlyRevenue].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return (
      new Date(`${a.month} 1, ${a.year}`).getMonth() -
      new Date(`${b.month} 1, ${b.year}`).getMonth()
    )
  })

  return {
    labels: sortedData.map((item) => `${item.month} ${item.year}`),
    datasets: [
      {
        label: "Total Invoiced",
        data: sortedData.map((item) => item.totalInvoiced),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Total Paid",
        data: sortedData.map((item) => item.totalPaid),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  }
})

const statusChartData = computed(() => {
  const statusColors = {
    paid: "#10b981",
    sent: "#3b82f6",
    partially_paid: "#f59e0b",
    overdue: "#ef4444",
    draft: "#6b7280",
  }

  return {
    labels: props.data.revenueByStatus.map((item) => formatStatusLabel(item.status)),
    datasets: [
      {
        data: props.data.revenueByStatus.map((item) => item.amount),
        backgroundColor: props.data.revenueByStatus.map(
          (item) => statusColors[item.status as keyof typeof statusColors] || "#6b7280"
        ),
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  }
})

const monthlyChartOptions = computed(() => ({
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
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) => formatCurrency(value),
      },
    },
  },
  interaction: {
    intersect: false,
    mode: "index" as const,
  },
}))

const statusChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right" as const,
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || ""
          const value = formatCurrency(context.parsed)
          const percentage =
            props.data.revenueByStatus[context.dataIndex]?.percentage || 0
          return `${label}: ${value} (${percentage.toFixed(1)}%)`
        },
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

const formatStatusLabel = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const toggleChartType = () => {
  chartType.value = chartType.value === "monthly" ? "status" : "monthly"
}
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 20rem;
}

@media (max-width: 768px) {
  .chart-container {
    height: 16rem;
  }
}
</style>
