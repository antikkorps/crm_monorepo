<template>
  <AppLayout>
    <div class="invoices-view">
      <div class="d-flex justify-space-between align-center mb-4 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold">Factures</h1>
          <p class="text-medium-emphasis">Gérez vos factures et paiements</p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">Nouvelle Facture</v-btn>
      </div>

      <!-- Filters -->
      <v-card class="mb-6" variant="outlined">
        <v-card-text>
          <v-row dense>
            <v-col cols="12" md="4" sm="12">
              <v-text-field v-model="filters.search" label="Rechercher..." prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details @input="debouncedSearch" />
            </v-col>
            <v-col cols="12" md="3" sm="6">
              <v-select v-model="filters.status" :items="statusOptions" label="Statut" variant="outlined" density="compact" clearable hide-details @update:model-value="loadInvoices" />
            </v-col>
            <v-col cols="12" md="3" sm="6">
              <v-select v-model="filters.institutionId" :items="institutions" item-title="name" item-value="id" label="Institution" variant="outlined" density="compact" clearable hide-details @update:model-value="loadInvoices" />
            </v-col>
            <v-col cols="12" md="2" sm="12" class="d-flex justify-end">
              <v-btn variant="text" @click="clearFilters" :disabled="!hasActiveFilters">Effacer</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Statistics Cards -->
      <v-row>
        <v-col v-for="(stat, i) in statisticsCards" :key="i" cols="12" sm="6" md="3">
          <v-card :color="stat.color" variant="tonal" class="fill-height">
            <v-card-text>
              <div class="d-flex align-center gap-4">
                <v-avatar :icon="stat.icon" :color="stat.color" variant="flat" size="40"></v-avatar>
                <div>
                  <div class="text-h5 font-weight-bold">{{ stat.value }}</div>
                  <div class="text-body-2">{{ stat.label }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Invoices Table -->
      <v-card class="mt-6">
        <v-data-table
          :headers="tableHeaders"
          :items="invoices"
          :loading="loading"
          :items-per-page="pagination.rowsPerPage"
          :page="pagination.currentPage"
          :items-length="totalRecords"
          @update:options="onTableUpdate"
          class="elevation-0"
        >
          <template #item.invoiceNumber="{ item }">
            <router-link :to="`/invoices/${item.id}`" class="font-weight-bold text-decoration-none">{{ item.invoiceNumber }}</router-link>
          </template>
          <template #item.institution.name="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.institution?.name }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.institution?.type }}</div>
            </div>
          </template>
          <template #item.status="{ item }">
            <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">{{ getStatusLabel(item.status) }}</v-chip>
          </template>
          <template #item.total="{ item }">
            <div class="font-weight-medium">{{ formatCurrency(item.total) }}</div>
          </template>
          <template #item.dueDate="{ item }">
            <div :class="getDueDateClass(item)">{{ formatDate(item.dueDate) }}</div>
          </template>
          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn icon="mdi-eye" variant="text" size="small" @click="viewInvoice(item.id)" title="Voir"></v-btn>
              <v-btn v-if="item.canBeModified" icon="mdi-pencil" variant="text" size="small" @click="editInvoice(item.id)" title="Modifier"></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <InvoiceForm v-model:visible="showCreateDialog" @invoice-created="onInvoiceCreated" @notify="({ message, color }) => showSnackbar(message, color)" />
      <PaymentForm v-model:visible="showPaymentDialog" :invoice="selectedInvoice" @payment-recorded="onPaymentRecorded" />
      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">{{ snackbar.message }}</v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import InvoiceForm from "@/components/billing/InvoiceForm.vue"
import PaymentForm from "@/components/billing/PaymentForm.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { institutionsApi, invoicesApi } from "@/services/api"
import type { Invoice, InvoiceStatus } from "@medical-crm/shared"
import { onMounted, ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const router = useRouter()
const { t } = useI18n()

const invoices = ref<Invoice[]>([])
const institutions = ref<any[]>([])
const statistics = ref<any>({})
const loading = ref(false)
const totalRecords = ref(0)
const showCreateDialog = ref(false)
const showPaymentDialog = ref(false)
const selectedInvoice = ref<Invoice | null>(null)
const snackbar = ref({ visible: false, message: '', color: 'info' })

const filters = ref<{ status: InvoiceStatus | null; institutionId: string | null; search: string }>({ status: null, institutionId: null, search: "" })
const pagination = ref({ currentPage: 1, rowsPerPage: 10 })

const statusOptions = [
  { label: "Brouillon", value: "draft" },
  { label: "Envoyé", value: "sent" },
  { label: "Partiellement Payé", value: "partially_paid" },
  { label: "Payé", value: "paid" },
  { label: "En Retard", value: "overdue" },
  { label: "Annulé", value: "cancelled" },
]

const statisticsCards = computed(() => [
  { label: "Factures Totales", value: statistics.value.totalInvoices || 0, icon: "mdi-file-document-outline", color: "primary" },
  { label: "En Attente", value: statistics.value.pendingInvoices || 0, icon: "mdi-clock-outline", color: "warning" },
  { label: "En Retard", value: statistics.value.overdueInvoices || 0, icon: "mdi-alert-circle-outline", color: "error" },
  { label: "Revenu Total", value: formatCurrency(statistics.value.totalRevenue || 0), icon: "mdi-cash-multiple", color: "success" },
])

const tableHeaders = computed(() => [
  { title: t('invoices.table.invoiceNumber'), value: 'invoiceNumber', sortable: true },
  { title: t('invoices.table.institution'), value: 'institution.name', sortable: true },
  { title: t('invoices.table.title'), value: 'title', sortable: true },
  { title: t('invoices.table.status'), value: 'status', sortable: true },
  { title: t('invoices.table.amount'), value: 'total', align: 'end', sortable: true },
  { title: t('invoices.table.dueDate'), value: 'dueDate', align: 'end', sortable: true },
  { title: t('invoices.table.actions'), value: 'actions', align: 'end', sortable: false },
])

const hasActiveFilters = computed(() => !!(filters.value.status || filters.value.institutionId || filters.value.search))

let searchTimeout: any
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadInvoices, 500)
}

const loadInvoices = async () => {
  loading.value = true
  try {
    const params = { ...filters.value, page: pagination.value.currentPage, limit: pagination.value.rowsPerPage }
    const response = await invoicesApi.getAll(params)
    invoices.value = response.data
    totalRecords.value = response.meta?.total || 0
  } catch (e) {
    showSnackbar("Erreur lors du chargement des factures", "error")
  } finally {
    loading.value = false
  }
}

const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll()
    institutions.value = response.data
  } catch (error) {
    console.error("Error loading institutions:", error)
  }
}

const loadStatistics = async () => {
  try {
    const response = await invoicesApi.getStatistics()
    statistics.value = response.data
  } catch (error) {
    console.error("Error loading statistics:", error)
  }
}

const onTableUpdate = (options: any) => {
  pagination.value.currentPage = options.page
  pagination.value.rowsPerPage = options.itemsPerPage
  loadInvoices()
}

const clearFilters = () => {
  filters.value = { status: null, institutionId: null, search: "" }
  loadInvoices()
}

const viewInvoice = (id: string) => router.push(`/invoices/${id}`)
const editInvoice = (id: string) => router.push(`/invoices/${id}/edit`)

const sendInvoice = async (id: string) => {
  try {
    await invoicesApi.send(id)
    showSnackbar("Facture envoyée avec succès", "success")
    loadInvoices()
  } catch (error) {
    showSnackbar("Erreur lors de l'envoi de la facture", "error")
  }
}

const onInvoiceCreated = () => {
  showCreateDialog.value = false
  loadInvoices()
  loadStatistics()
}

const onPaymentRecorded = () => {
  showPaymentDialog.value = false
  selectedInvoice.value = null
  loadInvoices()
  loadStatistics()
}

const showSnackbar = (message: string, color: string = 'info') => {
  snackbar.value = { visible: true, message, color }
}

const formatCurrency = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount || 0)
const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('fr-FR')
const getStatusLabel = (status: InvoiceStatus) => ({ draft: "Brouillon", sent: "Envoyé", partially_paid: "Partiellement Payé", paid: "Payé", overdue: "En Retard", cancelled: "Annulé" }[status] || status)
const getStatusColor = (status: InvoiceStatus) => ({ draft: "grey", sent: "info", partially_paid: "warning", paid: "success", overdue: "error", cancelled: "secondary" }[status] || "secondary")
const getDueDateClass = (invoice: Invoice) => {
  if (invoice.status === "paid") return "text-success"
  if (invoice.daysOverdue && invoice.daysOverdue > 0) return "text-error font-weight-bold"
  if (invoice.daysUntilDue !== null && invoice.daysUntilDue <= 7) return "text-warning"
  return ""
}

onMounted(() => {
  loadInvoices()
  loadInstitutions()
  loadStatistics()
})
</script>

<style scoped>
.invoices-view {
  padding: 1.5rem;
}
.gap-4 { gap: 1rem; }
</style>