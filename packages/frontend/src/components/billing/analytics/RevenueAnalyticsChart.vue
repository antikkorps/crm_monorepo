<template>
  <v-card elevation="2" v-if="data">
    <v-card-title class="d-flex align-center justify-space-between flex-wrap">
      <div class="d-flex align-center">
        <v-icon icon="mdi-chart-line" color="primary" class="mr-2"></v-icon>
        <span>Revenue Analytics</span>
      </div>
      <v-btn-toggle
        v-model="chartType"
        mandatory
        density="compact"
        variant="outlined"
        class="mt-2 mt-sm-0"
      >
        <v-btn value="monthly" size="small">Monthly</v-btn>
        <v-btn value="status" size="small">By Status</v-btn>
      </v-btn-toggle>
    </v-card-title>

    <v-card-text>
      <!-- Summary Cards -->
      <v-row class="mb-4">
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded color="blue-lighten-5" class="text-center pa-3">
            <div class="text-blue-darken-2 font-weight-medium mb-1">Total Revenue</div>
            <div class="text-h5 font-weight-bold text-blue-darken-4">
              {{ formatCurrency(data.totalRevenue) }}
            </div>
          </v-sheet>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded color="green-lighten-5" class="text-center pa-3">
            <div class="text-green-darken-2 font-weight-medium mb-1">Paid Revenue</div>
            <div class="text-h5 font-weight-bold text-green-darken-4">
              {{ formatCurrency(data.paidRevenue) }}
            </div>
          </v-sheet>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded color="orange-lighten-5" class="text-center pa-3">
            <div class="text-orange-darken-2 font-weight-medium mb-1">
              Pending Revenue
            </div>
            <div class="text-h5 font-weight-bold text-orange-darken-4">
              {{ formatCurrency(data.pendingRevenue) }}
            </div>
          </v-sheet>
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-sheet rounded color="red-lighten-5" class="text-center pa-3">
            <div class="text-red-darken-2 font-weight-medium mb-1">Overdue Revenue</div>
            <div class="text-h5 font-weight-bold text-red-darken-4">
              {{ formatCurrency(data.overdueRevenue) }}
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <!-- Chart -->
      <div class="chart-container mb-4">
        <Line
          v-if="chartType === 'monthly'"
          :data="monthlyChartData"
          :options="monthlyChartOptions"
        />
        <Doughnut v-else :data="statusChartData" :options="statusChartOptions" />
      </div>

      <!-- Additional Metrics -->
      <v-row>
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-medium-emphasis font-weight-medium">
                  Average Invoice Value
                </div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(data.averageInvoiceValue) }}
                </div>
              </div>
              <v-icon icon="mdi-calculator" size="x-large" color="info"></v-icon>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-text class="d-flex align-center justify-space-between">
              <div>
                <div class="text-medium-emphasis font-weight-medium">
                  Average Payment Time
                </div>
                <div class="text-h6 font-weight-bold">
                  {{ Math.round(data.averagePaymentTime) }} days
                </div>
              </div>
              <v-icon icon="mdi-clock-fast" size="x-large" color="success"></v-icon>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
  <v-card v-else elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-chart-line" color="primary" class="mr-2" />
      Revenue Analytics
    </v-card-title>
    <v-card-text>
      <div class="d-flex flex-column align-center justify-center pa-8 text-center">
        <v-icon icon="mdi-chart-line" size="64" color="grey-lighten-1" class="mb-4" />
        <div class="text-h6 mb-2">No Data Available</div>
        <div class="text-body-2 text-medium-emphasis">
          Revenue analytics will be displayed here once data is available.
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js"
import { computed, ref } from "vue"
import { Doughnut, Line } from "vue-chartjs"
import { useTheme } from "vuetify"

// Register Chart.js components
ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Filler
)

// Interfaces
interface MonthlyRevenue {
  month: string
  year: number
  totalInvoiced: number
  totalPaid: number
}

interface RevenueByStatus {
  status: string
  amount: number
  percentage: number
}

interface RevenueAnalytics {
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  overdueRevenue: number
  averageInvoiceValue: number
  averagePaymentTime: number
  monthlyRevenue: MonthlyRevenue[]
  revenueByStatus: RevenueByStatus[]
}

interface Props {
  data: RevenueAnalytics | null
}

const props = defineProps<Props>()

const theme = useTheme()
const chartType = ref<"monthly" | "status">("monthly")

// Computed properties for chart data
const monthlyChartData = computed(() => {
  if (!props.data) return { labels: [], datasets: [] }

  const sortedData = [...props.data.monthlyRevenue].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    const monthA = new Date(Date.parse(a.month + " 1, 2012")).getMonth()
    const monthB = new Date(Date.parse(b.month + " 1, 2012")).getMonth()
    return monthA - monthB
  })

  return {
    labels: sortedData.map(
      (item) => `${item.month.substring(0, 3)} ${String(item.year).slice(-2)}`
    ),
    datasets: [
      {
        label: "Total Invoiced",
        data: sortedData.map((item) => item.totalInvoiced),
        borderColor: theme.current.value.colors.info,
        backgroundColor: `${theme.current.value.colors.info}33`, // with alpha
        tension: 0.4,
        fill: true,
      },
      {
        label: "Total Paid",
        data: sortedData.map((item) => item.totalPaid),
        borderColor: theme.current.value.colors.success,
        backgroundColor: `${theme.current.value.colors.success}33`, // with alpha
        tension: 0.4,
        fill: true,
      },
    ],
  }
})

const statusChartData = computed(() => {
  if (!props.data) return { labels: [], datasets: [] }

  const statusColors = {
    paid: theme.current.value.colors.success,
    sent: theme.current.value.colors.info,
    partially_paid: theme.current.value.colors.warning,
    overdue: theme.current.value.colors.error,
    draft: theme.current.value.colors.secondary,
  }

  return {
    labels: props.data.revenueByStatus.map((item) => formatStatusLabel(item.status)),
    datasets: [
      {
        data: props.data.revenueByStatus.map((item) => item.amount),
        backgroundColor: props.data.revenueByStatus.map(
          (item) =>
            statusColors[item.status as keyof typeof statusColors] || statusColors.draft
        ),
        borderWidth: 2,
        borderColor: theme.current.value.colors.surface,
      },
    ],
  }
})

const chartOptionsBase = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
      labels: {
        color: theme.current.value.dark ? "white" : "black",
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          return `${context.dataset.label || context.label}: ${formatCurrency(
            context.parsed.y || context.parsed
          )}`
        },
      },
    },
  },
  interaction: {
    intersect: false,
    mode: "index" as const,
  },
}))

const monthlyChartOptions = computed(() => ({
  ...chartOptionsBase.value,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: any) => formatCurrency(value),
        color: theme.current.value.dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
      },
      grid: {
        color: theme.current.value.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      },
    },
    x: {
      ticks: {
        color: theme.current.value.dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
      },
      grid: {
        display: false,
      },
    },
  },
}))

const statusChartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "right" as const,
      labels: {
        color: theme.current.value.dark ? "white" : "black",
      },
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          const label = context.label || ""
          const value = formatCurrency(context.parsed)
          if (!props.data) return `${label}: ${value}`
          const percentage =
            props.data.revenueByStatus[context.dataIndex]?.percentage || 0
          return `${label}: ${value} (${percentage.toFixed(1)}%)`
        },
      },
      displayColors: false,
    },
  },
  interaction: {
    intersect: false,
    mode: "index" as const,
  },
}))

// Methods
const formatCurrency = (value: number): string => {
  if (value === null || value === undefined) return "$0"
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
</script>

<style scoped>
.chart-container {
  position: relative;
  height: 22rem;
}

@media (max-width: 768px) {
  .chart-container {
    height: 18rem;
  }
}
</style>
