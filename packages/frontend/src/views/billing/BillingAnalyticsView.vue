<template>
  <AppLayout>
    <v-container fluid class="billing-analytics">
      <!-- Header -->
      <div class="d-flex justify-space-between align-center mb-6">
        <div class="d-flex align-center">
          <v-avatar color="primary" size="48" class="mr-3">
            <v-icon icon="mdi-chart-line" color="white" size="32" />
          </v-avatar>
          <div>
            <h1 class="text-h4 font-weight-bold">Analytique Facturation</h1>
            <p class="text-body-2 text-medium-emphasis ma-0">
              Vue d'ensemble des revenus et performances
            </p>
          </div>
        </div>

        <div class="d-flex ga-2">
          <v-btn
            prepend-icon="mdi-refresh"
            variant="tonal"
            color="primary"
            @click="refreshData"
            :loading="loading"
          >
            Actualiser
          </v-btn>
          <v-btn
            prepend-icon="mdi-download"
            variant="tonal"
            color="secondary"
            @click="showExportDialog = true"
          >
            Exporter
          </v-btn>
        </div>
      </div>

      <!-- Filters Card -->
      <v-card elevation="2" class="mb-6">
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-filter-variant" class="mr-2" />
          Filtres
        </v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <v-menu
                v-model="dateRangeMenu"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                min-width="auto"
              >
                <template v-slot:activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="dateRangeText"
                    label="Période"
                    prepend-inner-icon="mdi-calendar"
                    readonly
                    variant="outlined"
                    density="comfortable"
                  />
                </template>
                <v-date-picker
                  v-model="dateRange"
                  range
                  @update:model-value="onDateRangeChange"
                />
              </v-menu>
            </v-col>

            <v-col v-if="canViewAllBilling" cols="12" md="4">
              <v-select
                v-model="selectedUserId"
                :items="userOptions"
                item-title="label"
                item-value="value"
                label="Utilisateur"
                prepend-inner-icon="mdi-account"
                placeholder="Tous les utilisateurs"
                clearable
                @update:model-value="onUserFilterChange"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" :md="canViewAllBilling ? 4 : 8" class="d-flex align-end">
              <v-btn
                prepend-icon="mdi-filter-remove"
                variant="text"
                color="error"
                @click="clearFilters"
                block
              >
                Réinitialiser les filtres
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Loading State -->
      <div v-if="loading">
        <v-row>
          <!-- KPI Cards Skeleton -->
          <v-col cols="12" md="6" lg="3" v-for="i in 4" :key="`kpi-${i}`">
            <v-skeleton-loader type="card" />
          </v-col>

          <!-- Revenue Chart Skeleton -->
          <v-col cols="12" lg="8">
            <v-skeleton-loader type="image, article" />
          </v-col>

          <!-- Outstanding Summary Skeleton -->
          <v-col cols="12" lg="4">
            <v-skeleton-loader type="article, list-item-three-line" />
          </v-col>

          <!-- Payment & Cash Flow Skeleton -->
          <v-col cols="12" lg="6">
            <v-skeleton-loader type="image, article" />
          </v-col>
          <v-col cols="12" lg="6">
            <v-skeleton-loader type="image, article" />
          </v-col>

          <!-- Segments Skeleton -->
          <v-col cols="12">
            <v-skeleton-loader type="table" />
          </v-col>
        </v-row>
      </div>

      <!-- Dashboard Content -->
      <v-row v-else-if="dashboardData">
        <!-- KPI Cards -->
        <v-col cols="12">
          <BillingKPICards :kpis="dashboardData.kpis" />
        </v-col>

        <!-- Revenue Analytics -->
        <v-col cols="12" lg="8">
          <RevenueAnalyticsChart :data="dashboardData.revenueAnalytics" />
        </v-col>

        <!-- Outstanding Summary -->
        <v-col cols="12" lg="4">
          <OutstandingSummaryCard :data="dashboardData.outstandingAnalytics" />
        </v-col>

        <!-- Payment Analytics -->
        <v-col cols="12" lg="6">
          <PaymentMethodChart :data="dashboardData.paymentAnalytics" />
        </v-col>

        <!-- Cash Flow Projections -->
        <v-col cols="12" lg="6">
          <CashFlowProjectionChart :data="dashboardData.cashFlowProjections" />
        </v-col>

        <!-- Medical Institution Segments -->
        <v-col cols="12">
          <MedicalSegmentAnalytics :data="dashboardData.segmentAnalytics" />
        </v-col>

        <!-- Outstanding Invoices Table -->
        <v-col cols="12">
          <OutstandingInvoicesTable :data="dashboardData.outstandingAnalytics" />
        </v-col>
      </v-row>

      <!-- Error State -->
      <v-card v-else-if="error" elevation="2" class="text-center pa-12">
        <v-avatar size="96" color="error-lighten-4" class="mb-4">
          <v-icon icon="mdi-alert-circle-outline" size="64" color="error" />
        </v-avatar>
        <h3 class="text-h5 font-weight-bold mb-2">Erreur de chargement</h3>
        <p class="text-body-1 text-medium-emphasis mb-6">{{ error }}</p>
        <v-btn
          color="primary"
          size="large"
          prepend-icon="mdi-refresh"
          @click="loadDashboardData"
        >
          Réessayer
        </v-btn>
      </v-card>

      <!-- Export Dialog -->
      <ExportDialog
        v-model:visible="showExportDialog"
        :date-range="dateRange"
        :selected-user-id="selectedUserId"
        @export="handleExport"
      />

      <!-- Snackbar -->
      <v-snackbar
        v-model="snackbar"
        :color="snackbarColor"
        timeout="4000"
        location="top"
      >
        {{ snackbarText }}
        <template v-slot:actions>
          <v-btn
            color="white"
            variant="text"
            @click="snackbar = false"
          >
            Fermer
          </v-btn>
        </template>
      </v-snackbar>
    </v-container>
  </AppLayout>
</template>

<script setup lang="ts">
import BillingKPICards from "@/components/billing/analytics/BillingKPICards.vue"
import CashFlowProjectionChart from "@/components/billing/analytics/CashFlowProjectionChart.vue"
import ExportDialog from "@/components/billing/analytics/ExportDialog.vue"
import MedicalSegmentAnalytics from "@/components/billing/analytics/MedicalSegmentAnalytics.vue"
import OutstandingInvoicesTable from "@/components/billing/analytics/OutstandingInvoicesTable.vue"
import OutstandingSummaryCard from "@/components/billing/analytics/OutstandingSummaryCard.vue"
import PaymentMethodChart from "@/components/billing/analytics/PaymentMethodChart.vue"
import RevenueAnalyticsChart from "@/components/billing/analytics/RevenueAnalyticsChart.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { billingAnalyticsApi } from "@/services/api/billing-analytics"
import { useAuthStore } from "@/stores/auth"
import { computed, onMounted, ref, watch } from "vue"

const authStore = useAuthStore()

// Reactive data
const loading = ref(false)
const error = ref<string | null>(null)
const dashboardData = ref<any>(null)
const dateRange = ref<Date[] | null>(null)
const selectedUserId = ref<string | null>(null)
const showExportDialog = ref(false)
const dateRangeMenu = ref(false)

// Snackbar state
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

// User options for filtering
const userOptions = ref([
  { label: "Tous les utilisateurs", value: null },
  // Will be populated from API
])

// Computed properties
const canViewAllBilling = computed(() => {
  return authStore.userRole === "super_admin" || authStore.userRole === "team_admin"
})

const dateRangeText = computed(() => {
  if (!dateRange.value || dateRange.value.length !== 2) return ""
  const start = new Date(dateRange.value[0]).toLocaleDateString()
  const end = new Date(dateRange.value[1]).toLocaleDateString()
  return `${start} - ${end}`
})

// Snackbar helper function
const showSnackbar = (text: string, color: string = 'success') => {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

// Methods
const loadDashboardData = async () => {
  try {
    loading.value = true
    error.value = null

    const params: any = {}

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0].toISOString()
      params.endDate = dateRange.value[1].toISOString()
    }

    if (selectedUserId.value) {
      params.userId = selectedUserId.value
    }

    const response = await billingAnalyticsApi.getDashboard(params)
    dashboardData.value = response.data
  } catch (err: any) {
    // Reset dashboardData to null on error to prevent Chart.js from trying to render with stale/null data
    dashboardData.value = null
    error.value = err.message || "Échec du chargement des données d'analyse"
    showSnackbar("Échec du chargement des données d'analyse", "error")
    console.error("Erreur de chargement du tableau de bord:", err)
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadDashboardData()
}

const onDateRangeChange = () => {
  dateRangeMenu.value = false
  if (dateRange.value && dateRange.value.length === 2) {
    loadDashboardData()
  }
}

const onUserFilterChange = () => {
  loadDashboardData()
}

const clearFilters = () => {
  dateRange.value = null
  selectedUserId.value = null
  loadDashboardData()
}

const handleExport = async (exportType: string) => {
  try {
    const params: any = { type: exportType }

    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0].toISOString()
      params.endDate = dateRange.value[1].toISOString()
    }

    if (selectedUserId.value) {
      params.userId = selectedUserId.value
    }

    const response = await billingAnalyticsApi.exportData(params)

    // Create download link
    const blob = new Blob([response.data], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${exportType}-analytics-${
      new Date().toISOString().split("T")[0]
    }.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSnackbar("Données d'analyse exportées avec succès", "success")
  } catch (err: any) {
    showSnackbar(err.message || "Échec de l'export des données d'analyse", "error")
  }
}

const loadUserOptions = async () => {
  if (canViewAllBilling.value) {
    try {
      // Load users for filtering - this would come from a users API
      // For now, we'll use a placeholder
      userOptions.value = [
        { label: "Tous les utilisateurs", value: null },
        // Add actual users here when API is available
      ]
    } catch (err) {
      console.error("Échec du chargement des options utilisateur:", err)
    }
  }
}

// Lifecycle
onMounted(() => {
  loadDashboardData()
  loadUserOptions()
})

// Watch for auth changes
watch(
  () => authStore.user,
  () => {
    if (authStore.user) {
      loadDashboardData()
      loadUserOptions()
    }
  }
)
</script>

<style scoped>
.billing-analytics {
  max-width: 100%;
}
</style>
