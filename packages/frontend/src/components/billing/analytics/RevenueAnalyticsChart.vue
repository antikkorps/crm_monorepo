<template>
  <v-card elevation="2" v-if="data">
    <v-card-title class="d-flex align-center justify-space-between flex-wrap card-title-responsive">
      <div class="d-flex align-center">
        <v-icon icon="mdi-chart-line" color="primary" class="mr-2" size="small" />
        <span>Analyse des revenus</span>
      </div>
      <v-btn-toggle
        v-model="chartType"
        mandatory
        density="compact"
        variant="outlined"
        class="mt-2 mt-sm-0"
      >
        <v-btn value="monthly" size="small">Mensuel</v-btn>
        <v-btn value="status" size="small">Par statut</v-btn>
      </v-btn-toggle>
    </v-card-title>

    <v-card-text class="pa-2 pa-md-4">
      <!-- Summary Cards -->
      <v-row dense class="mb-4">
        <v-col cols="6" md="3">
          <v-sheet rounded color="blue-lighten-5" class="text-center pa-2 pa-md-3">
            <div class="text-blue-darken-2 font-weight-medium text-caption text-md-body-2 mb-1">Total</div>
            <div class="text-h6 text-md-h5 font-weight-bold text-blue-darken-4">
              {{ formatCurrency(data.totalRevenue) }}
            </div>
          </v-sheet>
        </v-col>
        <v-col cols="6" md="3">
          <v-sheet rounded color="green-lighten-5" class="text-center pa-2 pa-md-3">
            <div class="text-green-darken-2 font-weight-medium text-caption text-md-body-2 mb-1">Payé</div>
            <div class="text-h6 text-md-h5 font-weight-bold text-green-darken-4">
              {{ formatCurrency(data.paidRevenue) }}
            </div>
          </v-sheet>
        </v-col>
        <v-col cols="6" md="3">
          <v-sheet rounded color="orange-lighten-5" class="text-center pa-2 pa-md-3">
            <div class="text-orange-darken-2 font-weight-medium text-caption text-md-body-2 mb-1">En attente</div>
            <div class="text-h6 text-md-h5 font-weight-bold text-orange-darken-4">
              {{ formatCurrency(data.pendingRevenue) }}
            </div>
          </v-sheet>
        </v-col>
        <v-col cols="6" md="3">
          <v-sheet rounded color="red-lighten-5" class="text-center pa-2 pa-md-3">
            <div class="text-red-darken-2 font-weight-medium text-caption text-md-body-2 mb-1">En retard</div>
            <div class="text-h6 text-md-h5 font-weight-bold text-red-darken-4">
              {{ formatCurrency(data.overdueRevenue) }}
            </div>
          </v-sheet>
        </v-col>
      </v-row>

      <!-- Chart -->
      <div class="mb-4">
        <BaseAreaChart
          v-if="chartType === 'monthly'"
          :categories="monthlyCategories"
          :series="monthlySeries"
          :height="320"
          :show-legend="true"
          :gradient="true"
        />
        <BaseDonutChart
          v-else
          :data="statusChartData"
          :height="320"
          :show-legend="true"
          :show-labels="true"
        />
      </div>

      <!-- Additional Metrics -->
      <v-row dense>
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-text class="d-flex align-center justify-space-between pa-3">
              <div>
                <div class="text-medium-emphasis font-weight-medium text-body-2">
                  Valeur moyenne facture
                </div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(data.averageInvoiceValue) }}
                </div>
              </div>
              <v-icon icon="mdi-calculator" size="large" color="info" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-text class="d-flex align-center justify-space-between pa-3">
              <div>
                <div class="text-medium-emphasis font-weight-medium text-body-2">
                  Délai moyen paiement
                </div>
                <div class="text-h6 font-weight-bold">
                  {{ Math.round(data.averagePaymentTime) }} jours
                </div>
              </div>
              <v-icon icon="mdi-clock-fast" size="large" color="success" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>

  <!-- Empty State -->
  <v-card v-else elevation="2">
    <v-card-title class="d-flex align-center card-title-responsive">
      <v-icon icon="mdi-chart-line" color="primary" class="mr-2" size="small" />
      Analyse des revenus
    </v-card-title>
    <v-card-text>
      <div class="d-flex flex-column align-center justify-center pa-8 text-center">
        <v-icon icon="mdi-chart-line" size="64" color="grey-lighten-1" class="mb-4" />
        <div class="text-h6 mb-2">Aucune donnée disponible</div>
        <div class="text-body-2 text-medium-emphasis">
          Les analyses de revenus s'afficheront ici une fois les données disponibles.
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { BaseAreaChart, BaseDonutChart, useChartColors } from "@/components/charts"

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

const { chartColors } = useChartColors()
const chartType = ref<"monthly" | "status">("monthly")

// Monthly chart data
const monthlyCategories = computed(() => {
  if (!props.data) return []

  const sortedData = [...props.data.monthlyRevenue].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    const monthA = new Date(Date.parse(a.month + " 1, 2012")).getMonth()
    const monthB = new Date(Date.parse(b.month + " 1, 2012")).getMonth()
    return monthA - monthB
  })

  return sortedData.map(
    (item) => `${item.month.substring(0, 3)} ${String(item.year).slice(-2)}`
  )
})

const monthlySeries = computed(() => {
  if (!props.data) return []

  const sortedData = [...props.data.monthlyRevenue].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    const monthA = new Date(Date.parse(a.month + " 1, 2012")).getMonth()
    const monthB = new Date(Date.parse(b.month + " 1, 2012")).getMonth()
    return monthA - monthB
  })

  return [
    {
      name: "Total facturé",
      data: sortedData.map((item) => item.totalInvoiced),
      color: chartColors.value.info,
    },
    {
      name: "Total payé",
      data: sortedData.map((item) => item.totalPaid),
      color: chartColors.value.success,
    },
  ]
})

// Status chart data
const statusChartData = computed(() => {
  if (!props.data) return []

  const statusColors: Record<string, string> = {
    paid: chartColors.value.success,
    sent: chartColors.value.info,
    partially_paid: chartColors.value.warning,
    overdue: chartColors.value.error,
    draft: chartColors.value.secondary,
  }

  return props.data.revenueByStatus.map((item) => ({
    label: formatStatusLabel(item.status),
    value: item.amount,
    color: statusColors[item.status] || statusColors.draft,
  }))
})

// Methods
const formatCurrency = (value: number): string => {
  if (value === null || value === undefined) return "0 €"
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value)
}

const formatStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    paid: "Payé",
    sent: "Envoyé",
    partially_paid: "Partiellement payé",
    overdue: "En retard",
    draft: "Brouillon",
  }
  return labels[status] || status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
</script>

<style scoped>
.card-title-responsive {
  font-size: 1rem;
  padding: 12px 16px;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .card-title-responsive {
    font-size: 0.875rem;
    padding: 8px 12px;
  }
}
</style>
