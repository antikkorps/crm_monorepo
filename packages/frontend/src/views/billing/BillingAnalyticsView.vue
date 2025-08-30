<template>
  <AppLayout>
    <div class="billing-analytics">
      <div class="flex justify-content-between align-items-center mb-4">
        <h1 class="text-3xl font-bold text-900">Billing Analytics & Reports</h1>

        <div class="flex gap-2">
          <Button
            icon="pi pi-refresh"
            label="Refresh"
            @click="refreshData"
            :loading="loading"
            class="p-button-outlined"
          />
          <Button
            icon="pi pi-download"
            label="Export"
            @click="showExportDialog = true"
            class="p-button-outlined"
          />
        </div>
      </div>

      <!-- Date Range Filter -->
      <Card class="mb-4">
        <template #content>
          <div class="flex flex-wrap gap-3 align-items-center">
            <div class="flex flex-column">
              <label class="text-sm font-medium mb-1">Date Range</label>
              <Calendar
                v-model="dateRange"
                selection-mode="range"
                :manual-input="false"
                date-format="mm/dd/yy"
                placeholder="Select date range"
                @date-select="onDateRangeChange"
              />
            </div>

            <div class="flex flex-column" v-if="canViewAllBilling">
              <label class="text-sm font-medium mb-1">User Filter</label>
              <Dropdown
                v-model="selectedUserId"
                :options="userOptions"
                option-label="label"
                option-value="value"
                placeholder="All Users"
                @change="onUserFilterChange"
                class="w-12rem"
              />
            </div>

            <Button
              icon="pi pi-filter-slash"
              label="Clear Filters"
              @click="clearFilters"
              class="p-button-text"
              style="margin-top: 1.5rem"
            />
          </div>
        </template>
      </Card>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-content-center p-4">
        <ProgressSpinner />
      </div>

      <!-- Dashboard Content -->
      <div v-else-if="dashboardData" class="grid">
        <!-- KPI Cards -->
        <div class="col-12">
          <BillingKPICards :kpis="dashboardData.kpis" />
        </div>

        <!-- Revenue Analytics -->
        <div class="col-12 lg:col-8">
          <RevenueAnalyticsChart :data="dashboardData.revenueAnalytics" />
        </div>

        <!-- Outstanding Summary -->
        <div class="col-12 lg:col-4">
          <OutstandingSummaryCard :data="dashboardData.outstandingAnalytics" />
        </div>

        <!-- Payment Analytics -->
        <div class="col-12 lg:col-6">
          <PaymentMethodChart :data="dashboardData.paymentAnalytics" />
        </div>

        <!-- Cash Flow Projections -->
        <div class="col-12 lg:col-6">
          <CashFlowProjectionChart :data="dashboardData.cashFlowProjections" />
        </div>

        <!-- Medical Institution Segments -->
        <div class="col-12">
          <MedicalSegmentAnalytics :data="dashboardData.segmentAnalytics" />
        </div>

        <!-- Outstanding Invoices Table -->
        <div class="col-12">
          <OutstandingInvoicesTable :data="dashboardData.outstandingAnalytics" />
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex flex-column align-items-center justify-content-center p-6"
      >
        <i class="pi pi-exclamation-triangle text-6xl text-orange-500 mb-3"></i>
        <h3 class="text-xl font-semibold mb-2">Failed to Load Analytics</h3>
        <p class="text-600 mb-4 text-center">{{ error }}</p>
        <Button label="Try Again" @click="loadDashboardData" />
      </div>

      <!-- Export Dialog -->
      <ExportDialog
        v-model:visible="showExportDialog"
        :date-range="dateRange"
        :selected-user-id="selectedUserId"
        @export="handleExport"
      />
    </div>
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
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref, watch } from "vue"

const toast = useToast()
const authStore = useAuthStore()

// Reactive data
const loading = ref(false)
const error = ref<string | null>(null)
const dashboardData = ref<any>(null)
const dateRange = ref<Date[] | null>(null)
const selectedUserId = ref<string | null>(null)
const showExportDialog = ref(false)

// User options for filtering
const userOptions = ref([
  { label: "All Users", value: null },
  // Will be populated from API
])

// Computed properties
const canViewAllBilling = computed(() => {
  return authStore.userRole === "super_admin" || authStore.userRole === "team_admin"
})

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
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load billing analytics data",
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

const refreshData = () => {
  loadDashboardData()
}

const onDateRangeChange = () => {
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

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Analytics data exported successfully",
      life: 3000,
    })
  } catch (err: any) {
    toast.add({
      severity: "error",
      summary: "Export Failed",
      detail: err.message || "Failed to export analytics data",
      life: 5000,
    })
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
  padding: 1rem;
}

@media (max-width: 768px) {
  .billing-analytics {
    padding: 0.5rem;
  }
}
</style>
