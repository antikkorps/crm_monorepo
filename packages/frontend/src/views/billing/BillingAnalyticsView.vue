<template>
  <AppLayout>
    <v-container class="billing-analytics">
      <div class="d-flex justify-space-between align-center mb-4">
        <h1 class="text-h3 font-weight-bold">Billing Analytics & Reports</h1>

        <div class="d-flex ga-2">
          <v-btn
            prepend-icon="mdi-refresh"
            variant="outlined"
            @click="refreshData"
            :loading="loading"
          >
            Refresh
          </v-btn>
          <v-btn
            prepend-icon="mdi-download"
            variant="outlined"
            @click="showExportDialog = true"
          >
            Export
          </v-btn>
        </div>
      </div>

      <!-- Date Range Filter -->
      <v-card class="mb-4">
        <v-card-text>
          <div class="d-flex flex-wrap ga-4 align-center">
            <div>
              <label class="text-body-2 font-weight-medium mb-1 d-block">Date Range</label>
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
                    label="Select date range"
                    prepend-icon="mdi-calendar"
                    readonly
                    variant="outlined"
                  ></v-text-field>
                </template>
                <v-date-picker
                  v-model="dateRange"
                  range
                  @update:model-value="onDateRangeChange"
                ></v-date-picker>
              </v-menu>
            </div>

            <div v-if="canViewAllBilling">
              <label class="text-body-2 font-weight-medium mb-1 d-block">User Filter</label>
              <v-select
                v-model="selectedUserId"
                :items="userOptions"
                item-title="label"
                item-value="value"
                placeholder="All Users"
                @update:model-value="onUserFilterChange"
                variant="outlined"
                style="width: 200px"
              ></v-select>
            </div>

            <v-btn
              prepend-icon="mdi-filter-remove"
              variant="text"
              @click="clearFilters"
              style="margin-top: 1.5rem"
            >
              Clear Filters
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Loading State -->
      <div v-if="loading" class="d-flex justify-center pa-4">
        <v-progress-circular indeterminate size="64"></v-progress-circular>
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
      <div
        v-else-if="error"
        class="d-flex flex-column align-center justify-center pa-6"
      >
        <v-icon icon="mdi-alert-triangle" size="96" color="orange" class="mb-3"></v-icon>
        <h3 class="text-h5 font-weight-medium mb-2">Failed to Load Analytics</h3>
        <p class="text-medium-emphasis mb-4 text-center">{{ error }}</p>
        <v-btn @click="loadDashboardData">Try Again</v-btn>
      </div>

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
            Close
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
  { label: "All Users", value: null },
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
    error.value = err.message || "Failed to load billing analytics"
    showSnackbar("Failed to load billing analytics data", "error")
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

    showSnackbar("Analytics data exported successfully", "success")
  } catch (err: any) {
    showSnackbar(err.message || "Failed to export analytics data", "error")
  }
}

const loadUserOptions = async () => {
  if (canViewAllBilling.value) {
    try {
      // Load users for filtering - this would come from a users API
      // For now, we'll use a placeholder
      userOptions.value = [
        { label: "All Users", value: null },
        // Add actual users here when API is available
      ]
    } catch (err) {
      console.error("Failed to load user options:", err)
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
