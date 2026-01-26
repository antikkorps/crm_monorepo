<template>
  <AppLayout>
    <div class="quotes-view">
      <div v-if="!showBuilder">
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <h1 class="text-h4 font-weight-bold">{{ t("quotes.title") }}</h1>
            <p class="text-medium-emphasis">{{ t("quotes.subtitle") }}</p>
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="createNewQuote">{{
            t("quotes.createNew")
          }}</v-btn>
        </div>

        <v-card class="mb-6" variant="outlined">
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="4" sm="6">
                <v-text-field
                  v-model="filters.search"
                  label="Rechercher..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @input="debouncedSearch"
                />
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <v-select
                  v-model="filters.status"
                  :items="statusOptions"
                  item-title="label"
                  item-value="value"
                  :label="t('quotes.filters.status')"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                  @update:model-value="loadQuotes"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-if="loading && quotes.length === 0">
          <TableSkeleton :rows="10" :columns="6" toolbar pagination />
        </v-card>

        <div v-else-if="!loading && quotes.length === 0" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2">mdi-file-document-outline</v-icon>
          <h3 class="text-h6 mt-4">{{ t("quotes.noQuotesFound") }}</h3>
          <p class="text-medium-emphasis">{{ t("quotes.noQuotesMessage") }}</p>
          <v-btn color="primary" @click="createNewQuote">{{
            t("quotes.createQuote")
          }}</v-btn>
        </div>

        <v-card v-else>
          <v-data-table
            :headers="tableHeaders"
            :items="quotes"
            :loading="loading && quotes.length > 0"
            :items-per-page="10"
            class="elevation-0"
          >
            <template #item.quoteNumber="{ item }">
              <span class="font-weight-bold">{{ item.quoteNumber }}</span>
            </template>
            <template #item.title="{ item }">
              <div>
                <div class="font-weight-medium">{{ item.title }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.institution?.name }}
                </div>
              </div>
            </template>
            <template #item.total="{ item }">{{ formatCurrency(item.total) }}</template>
            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small">{{
                getStatusLabel(item.status)
              }}</v-chip>
            </template>
            <template #item.validUntil="{ item }">
              <QuoteExpiryBadge
                :valid-until="item.validUntil"
                :status="item.status"
                :days-until-expiry="getDaysUntilExpiry(item.validUntil)"
              />
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-eye"
                  variant="text"
                  size="small"
                  @click="viewQuote(item)"
                  title="Voir"
                ></v-btn>
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="editQuote(item)"
                  title="Modifier"
                ></v-btn>
                <v-btn
                  icon="mdi-download"
                  variant="text"
                  size="small"
                  @click="downloadQuotePDF(item)"
                  title="Télécharger le devis"
                ></v-btn>
                <v-btn
                  v-if="String((item as any).status || '') === 'ordered'"
                  icon="mdi-clipboard-text"
                  variant="text"
                  size="small"
                  @click="downloadOrderPDF(item)"
                  title="Télécharger le bon de commande"
                />
                <v-btn
                  v-if="canDeleteQuote(item)"
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  size="small"
                  @click="deleteQuote(item)"
                  title="Supprimer"
                />
              </div>
            </template>
          </v-data-table>
        </v-card>
      </div>

      <div v-else>
        <QuoteBuilder
          :quote="selectedQuote"
          @saved="handleQuoteSaved"
          @cancelled="handleBuilderCancelled"
        />
      </div>

      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">{{
        snackbar.message
      }}</v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import QuoteBuilder from "@/components/billing/QuoteBuilder.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import QuoteExpiryBadge from "@/components/quotes/QuoteExpiryBadge.vue"
import { TableSkeleton } from "@/components/skeletons"
import { quotesApi } from "@/services/api"
import { useAuthStore } from "@/stores/auth"
import type { ApiResponse, Quote, QuoteStatus } from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const quotes = ref<Quote[]>([])
const loading = ref(false)
const showBuilder = ref(false)
const selectedQuote = ref<Quote | null>(null)
const filters = ref({ status: null as QuoteStatus | null, search: "" })
const snackbar = ref({ visible: false, message: "", color: "info" })
const authStore = useAuthStore()

const statusOptions = computed(() => [
  { label: t("quotes.status.draft"), value: "draft" },
  { label: t("quotes.status.sent"), value: "sent" },
  { label: t("quotes.status.ordered"), value: "ordered" },
  { label: t("quotes.status.accepted"), value: "accepted" },
  { label: t("quotes.status.rejected"), value: "rejected" },
  { label: t("quotes.status.expired"), value: "expired" },
  { label: t("quotes.status.cancelled"), value: "cancelled" },
])

const tableHeaders = computed(() => [
  { title: t("quotes.table.quoteNumber"), value: "quoteNumber" },
  { title: t("quotes.table.title"), value: "title" },
  { title: t("quotes.table.amount"), value: "total", align: "end" as const },
  { title: t("quotes.table.status"), value: "status" },
  { title: t("quotes.table.validUntil"), value: "validUntil", align: "end" as const },
  {
    title: t("quotes.table.actions"),
    value: "actions",
    align: "end" as const,
    sortable: false,
  },
])

let searchTimeout: any
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadQuotes, 300)
}

const loadQuotes = async () => {
  loading.value = true
  try {
    const response = (await quotesApi.getAll(filters.value)) as ApiResponse<Quote[]>
    quotes.value = response.data || []
  } catch (error) {
    showSnackbar(t("quotes.messages.loadError"), "error")
  } finally {
    loading.value = false
  }
}

const createNewQuote = () => {
  selectedQuote.value = null
  showBuilder.value = true
}

const viewQuote = async (quote: Quote) => {
  try {
    // Load the complete quote with lines
    const response = await quotesApi.getById(quote.id)
    const fullQuote = ((response as any).data || (response as any)) as Quote
    // Ensure lines are populated (fallback to lines endpoint)
    try {
      const linesResp = await quotesApi.lines.getAll(quote.id)
      const lines = (linesResp as any).data || []
      ;(fullQuote as any).lines = lines
    } catch (e) {
      // ignore; use whatever came back
      console.warn("Failed to fetch quote lines separately:", e)
    }
    selectedQuote.value = fullQuote
    showBuilder.value = true
  } catch (error) {
    console.error("Error loading quote for viewing:", error)
    showSnackbar("Erreur lors du chargement du devis", "error")
  }
}

const editQuote = async (quote: Quote) => {
  try {
    // Load the complete quote with lines
    const response = await quotesApi.getById(quote.id)
    const fullQuote = ((response as any).data || (response as any)) as Quote
    try {
      const linesResp = await quotesApi.lines.getAll(quote.id)
      const lines = (linesResp as any).data || []
      ;(fullQuote as any).lines = lines
    } catch (e) {
      console.warn("Failed to fetch quote lines separately:", e)
    }
    selectedQuote.value = fullQuote
    showBuilder.value = true
  } catch (error) {
    console.error("Error loading quote for editing:", error)
    showSnackbar("Erreur lors du chargement du devis", "error")
  }
}

const downloadQuotePDF = async (quote: Quote) => {
  try {
    // Pass the selected templateId so the backend applies the custom template
    const response = await quotesApi.generatePdf(quote.id, (quote as any).templateId)

    // Check if the response is an error
    if (!response.ok) {
      // Try to extract error message from JSON response
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        const errorData = await response.json()
        const errorMessage = errorData?.error?.message || t("quotes.messages.quotePdfError")
        showSnackbar(errorMessage, "error")
        return
      }
      showSnackbar(t("quotes.messages.quotePdfError"), "error")
      return
    }

    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Quote-${quote.quoteNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSnackbar(t("quotes.messages.quotePdfDownloaded"), "success")
  } catch (error) {
    console.error("Error downloading quote PDF:", error)
    showSnackbar(t("quotes.messages.quotePdfError"), "error")
  }
}

const downloadOrderPDF = async (quote: Quote) => {
  try {
    const response = await quotesApi.generateOrderPdf(quote.id, (quote as any).templateId)

    // Check if the response is an error
    if (!response.ok) {
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        const errorData = await response.json()
        const errorMessage = errorData?.error?.message || t("quotes.messages.orderPdfError")
        showSnackbar(errorMessage, "error")
        return
      }
      showSnackbar(t("quotes.messages.orderPdfError"), "error")
      return
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Order-${(quote as any).orderNumber || quote.quoteNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showSnackbar(t("quotes.messages.orderPdfDownloaded"), "success")
  } catch (error) {
    console.error("Error downloading order PDF:", error)
    showSnackbar(t("quotes.messages.orderPdfError"), "error")
  }
}

const canDeleteQuote = (quote: Quote) => {
  const role = authStore.userRole
  const isPrivileged =
    role === "super_admin" || role === "team_admin" || role === "manager"
  // Backend only allows deleting drafts; mirror that for UX
  return isPrivileged && quote.status === "draft"
}

const deleteQuote = async (quote: Quote) => {
  if (!canDeleteQuote(quote)) return
  if (!confirm(t("quotes.confirmDelete", { number: quote.quoteNumber }))) return
  try {
    await quotesApi.delete(quote.id)
    showSnackbar(t("quotes.messages.deleted"), "success")
    loadQuotes()
  } catch (e) {
    console.error("Delete quote failed:", e)
    showSnackbar(t("quotes.messages.deleteError"), "error")
  }
}

const handleQuoteSaved = (quote: Quote) => {
  showBuilder.value = false
  selectedQuote.value = null
  loadQuotes()
  showSnackbar(t("quotes.messages.saved"), "success")
}

const handleBuilderCancelled = () => {
  showBuilder.value = false
  selectedQuote.value = null
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    amount || 0
  )
const getStatusLabel = (status: QuoteStatus) => {
  const labels: Record<QuoteStatus, string> = {
    draft: t("quotes.status.draft"),
    sent: t("quotes.status.sent"),
    ordered: t("quotes.status.ordered"),
    accepted: t("quotes.status.accepted"),
    rejected: t("quotes.status.rejected"),
    expired: t("quotes.status.expired"),
    cancelled: t("quotes.status.cancelled"),
  }
  return labels[status] || status
}
const getStatusColor = (status: QuoteStatus) =>
  ({
    draft: "grey",
    sent: "info",
    ordered: "purple",
    accepted: "success",
    rejected: "error",
    expired: "warning",
    cancelled: "secondary",
  }[status] || "secondary")

const getDaysUntilExpiry = (validUntil: Date | string): number => {
  const today = new Date()
  const expiryDate = new Date(validUntil)
  const diffTime = expiryDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, message, color }
}

onMounted(loadQuotes)
</script>

<style scoped>
.quotes-view {
  padding: 1.5rem;
}
</style>
