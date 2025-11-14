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
            <v-col cols="12" md="3" sm="6">
              <v-select
                v-model="archivageFilter"
                :items="archivageOptions"
                item-title="label"
                item-value="value"
                label="Archivage"
                variant="outlined"
                density="compact"
                hide-details
                @update:model-value="onArchivageChange"
              />
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
        <TableSkeleton
          v-if="loading && invoices.length === 0"
          :rows="pagination.rowsPerPage"
          :columns="7"
          toolbar
          pagination
        />
        <v-data-table
          v-else
          :headers="tableHeaders"
          :items="invoices"
          :loading="loading && invoices.length > 0"
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
            <div class="d-flex gap-1 action-buttons">
              <v-btn icon="mdi-eye" variant="text" size="small" @click="viewInvoice(item.id)" title="Voir"></v-btn>
              <v-btn :class="!canModifyInvoice(item) ? 'invisible-placeholder' : ''" :disabled="!canModifyInvoice(item)" icon="mdi-pencil" variant="text" size="small" @click="editInvoice(item.id)" title="Modifier"></v-btn>
              <v-btn :class="!canSend(item) ? 'invisible-placeholder' : ''" :disabled="!canSend(item)" :icon="'mdi-send'" variant="text" size="small" color="primary" @click="openSendDialog(item)" :title="item.status === 'draft' ? 'Envoyer' : 'Renvoyer'"></v-btn>
              <v-btn :class="'invisible-placeholder'" v-if="!item.archived" icon="mdi-archive-outline" variant="text" size="small" color="secondary" @click="archiveInvoice(item)" title="Archiver"></v-btn>
              <v-btn :class="'invisible-placeholder'" v-else icon="mdi-archive-arrow-up-outline" variant="text" size="small" color="secondary" @click="unarchiveInvoice(item)" title="Désarchiver"></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <InvoiceForm v-model:visible="showCreateDialog" @invoice-created="onInvoiceCreated" @notify="({ message, color }) => showSnackbar(message, color)" />
      
      <!-- Send/Rsend Dialog -->
      <v-dialog v-model="sendDialog.visible" max-width="560">
        <v-card>
          <v-card-title class="text-h6">{{ sendDialog.context?.status === 'draft' ? 'Envoyer la facture' : 'Renvoyer la facture' }}</v-card-title>
          <v-card-text>
            <div class="d-flex flex-column gap-4">
              <div>
                <div class="text-subtitle-2 mb-1">Destinataires</div>
                <v-combobox
                  v-model="sendDialog.recipients"
                  :items="contactOptions"
                  item-title="label"
                  item-value="value"
                  chips
                  multiple
                  closable-chips
                  :disabled="sendDialog.loading"
                  variant="outlined"
                  density="comfortable"
                  placeholder="Sélectionnez un ou plusieurs contacts"
                />
                <div class="mt-3">
                  <div class="text-subtitle-2 mb-1">Message (optionnel)</div>
                  <v-textarea v-model="sendDialog.message" :disabled="sendDialog.loading" variant="outlined" rows="4" placeholder="Ajoutez un message personnalisé" />
                </div>
                <div class="d-flex align-center mt-2">
                  <v-checkbox v-model="sendDialog.sendCopyToSelf" :disabled="sendDialog.loading" density="compact" hide-details class="mr-2" />
                  <span>M'envoyer une copie ({{ authStore.user?.email || '—' }})</span>
                </div>
              </div>
              
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="sendDialog.visible = false" :disabled="sendDialog.loading">Annuler</v-btn>
            <v-btn color="primary" @click="confirmSend" :loading="sendDialog.loading" :disabled="!sendDialog.recipients.length">Envoyer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <PaymentForm v-model:visible="showPaymentDialog" :invoice="selectedInvoice" @payment-recorded="onPaymentRecorded" />
      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">{{ snackbar.message }}</v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import InvoiceForm from "@/components/billing/InvoiceForm.vue"
import PaymentForm from "@/components/billing/PaymentForm.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { TableSkeleton } from "@/components/skeletons"
import { institutionsApi, invoicesApi, documentsApi } from "@/services/api"
import { useAuthStore } from "@/stores/auth"
import type { Invoice, InvoiceStatus } from "@medical-crm/shared"
import { onMounted, ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const router = useRouter()
const authStore = useAuthStore()
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
const sendDialog = ref({ visible: false, recipients: [] as string[], message: '', loading: false, sendCopyToSelf: true, context: null as Invoice | null })
const contacts = ref<{ id: string; firstName: string; lastName: string; email: string; isPrimary: boolean }[]>([])
const contactOptions = computed(() => contacts.value
  .filter(c => !!c.email)
  .map(c => ({ label: `${c.firstName} ${c.lastName} <${c.email}>`, value: c.email }))
)

const filters = ref<{ status: InvoiceStatus | null; institutionId: string | null; search: string; includeArchived?: boolean; archived?: boolean | null }>({ status: null, institutionId: null, search: "", includeArchived: false, archived: null })
const archivageOptions = [
  { label: 'Actives', value: 'active' },
  { label: 'Archivées', value: 'archived' },
  { label: 'Toutes', value: 'all' },
]
const archivageFilter = ref<'active' | 'archived' | 'all'>('active')

const onArchivageChange = () => {
  if (archivageFilter.value === 'active') {
    filters.value.includeArchived = false
    filters.value.archived = false
  } else if (archivageFilter.value === 'archived') {
    // Explicitly request only archived
    filters.value.includeArchived = false
    filters.value.archived = true
  } else {
    // all
    filters.value.includeArchived = true
    filters.value.archived = null
  }
  loadInvoices()
}
const pagination = ref({ currentPage: 1, rowsPerPage: 10 })

const statusOptions = [
  { label: "Brouillon", value: "draft" },
  { label: "Envoyé", value: "sent" },
  { label: "Partiellement Payé", value: "partially_paid" },
  { label: "Payé", value: "paid" },
  { label: "En Retard", value: "overdue" },
  { label: "Annulé", value: "cancelled" },
]

// Map backend stats to cards (backend returns amounts + counts)
// Backend fields: totalInvoices, totalAmount, paidAmount, pendingAmount, overdueAmount
const statisticsCards = computed(() => [
  { label: "Factures Totales", value: statistics.value.totalInvoices || 0, icon: "mdi-file-document-outline", color: "primary" },
  { label: "Montant en attente", value: formatCurrency(statistics.value.pendingAmount || 0), icon: "mdi-clock-outline", color: "warning" },
  { label: "Montant en retard", value: formatCurrency(statistics.value.overdueAmount || 0), icon: "mdi-alert-circle-outline", color: "error" },
  { label: "Montant payé", value: formatCurrency(statistics.value.paidAmount || 0), icon: "mdi-cash-multiple", color: "success" },
])

const tableHeaders = computed(() => [
  { title: t('invoices.table.invoiceNumber'), value: 'invoiceNumber', sortable: true },
  { title: t('invoices.table.institution'), value: 'institution.name', sortable: true },
  { title: t('invoices.table.title'), value: 'title', sortable: true },
  { title: t('invoices.table.status'), value: 'status', sortable: true },
  { title: t('invoices.table.amount'), value: 'total', align: 'end' as const, sortable: true },
  { title: t('invoices.table.dueDate'), value: 'dueDate', align: 'end' as const, sortable: true },
  { title: t('invoices.table.actions'), value: 'actions', align: 'end' as const, sortable: false },
])

const hasActiveFilters = computed(() => !!(filters.value.status || filters.value.institutionId || filters.value.search || archivageFilter.value !== 'active'))

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
    const data = (response as any).data
    const meta = (response as any).meta
    invoices.value = data
    totalRecords.value = meta?.total || 0
  } catch (e) {
    showSnackbar("Erreur lors du chargement des factures", "error")
  } finally {
    loading.value = false
  }
}

const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll()
    const data = (response as any).data
    institutions.value = data?.institutions || data || []
  } catch (error) {
    console.error("Error loading institutions:", error)
  }
}

const loadStatistics = async () => {
  try {
    const response = await invoicesApi.getStatistics()
    statistics.value = (response as any).data
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
  filters.value = { status: null, institutionId: null, search: "", includeArchived: false, archived: null }
  archivageFilter.value = 'active'
  loadInvoices()
}

const viewInvoice = (id: string) => router.push(`/invoices/${id}`)
const editInvoice = (id: string) => router.push(`/invoices/${id}/edit`)
const canSend = (item: Invoice) => ['draft','sent','overdue','partially_paid','paid'].includes(item.status)

const archiveInvoice = async (item: Invoice) => {
  try {
    await invoicesApi.archive(item.id)
    showSnackbar('Facture archivée', 'info')
    loadInvoices(); loadStatistics()
  } catch (e) {
    showSnackbar("Échec de l'archivage", 'error')
  }
}

const unarchiveInvoice = async (item: Invoice) => {
  try {
    await invoicesApi.unarchive(item.id)
    showSnackbar('Facture désarchivée', 'info')
    loadInvoices(); loadStatistics()
  } catch (e) {
    showSnackbar("Échec du désarchivage", 'error')
  }
}

const openSendDialog = async (item: Invoice) => {
  try {
    sendDialog.value.context = item
    const instId = (item as any).institutionId || (item.institution as any)?.id
    if (instId) {
      const resp = await institutionsApi.getById(instId)
      const payload = (resp as any).data || resp
      const inst = payload?.institution || payload
      contacts.value = inst?.contactPersons || []
    } else {
      contacts.value = []
    }
    sendDialog.value.visible = true
  } catch (e) {
    contacts.value = []
    sendDialog.value.visible = true
  }
}

const confirmSend = async () => {
  if (!sendDialog.value.context) return
  sendDialog.value.loading = true
  try {
    await invoicesApi.send(sendDialog.value.context.id)
    const rawRecipients = [
      ...sendDialog.value.recipients,
      ...(sendDialog.value.sendCopyToSelf && authStore.user?.email ? [authStore.user.email] : []),
    ] as any[]
    const normalizedRecipients = Array.from(new Set(
      rawRecipients
        .map((r: any) => (typeof r === 'string' ? r : r?.value || r?.email || ''))
        .filter((e: string) => !!e)
    ))
    const resp = await documentsApi.generateInvoicePdf(sendDialog.value.context.id, {
      email: true,
      recipients: normalizedRecipients,
      customMessage: sendDialog.value.message || undefined,
    }) as any
    const emailSent = resp?.data?.emailSent ?? false
    if (emailSent) {
      showSnackbar("Facture envoyée par email", "success")
    } else {
      const err = resp?.data?.emailError || 'Envoi non confirmé par le serveur'
      showSnackbar(`Envoi email non confirmé: ${err}` , "warning")
    }
    sendDialog.value.visible = false
    sendDialog.value.recipients = []
    sendDialog.value.message = ''
    sendDialog.value.sendCopyToSelf = false
    sendDialog.value.context = null
    loadInvoices()
  } catch (error: any) {
    const msg = error?.message ? `Erreur: ${error.message}` : "Échec de l'envoi de la facture"
    showSnackbar(msg, "error")
  } finally {
    sendDialog.value.loading = false
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

  const today = new Date()
  const dueDate = new Date(invoice.dueDate)
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "text-error font-weight-bold" // Overdue
  if (diffDays <= 7) return "text-warning" // Due soon
  return ""
}

const canModifyInvoice = (invoice: Invoice) => {
  // Une facture peut être modifiée si :
  // - elle est en brouillon (modification complète)
  // - elle est envoyée mais pas encore payée (modification limitée)
  // - elle est en retard mais pas encore payée (modification limitée)
  return ['draft', 'sent', 'overdue'].includes(invoice.status) &&
         (invoice.totalPaid === 0 || invoice.totalPaid < invoice.total)
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
.invisible-placeholder { visibility: hidden; }
.action-buttons { min-width: 120px; justify-content: flex-end; }
.gap-4 { gap: 1rem; }
</style>
