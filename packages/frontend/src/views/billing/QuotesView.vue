<template>
  <div class="quotes-view">
    <div class="quotes-header">
      <div class="header-content">
        <h1>Quotes</h1>
        <p class="header-description">
          Manage your quotes and proposals for medical institutions
        </p>
      </div>
      <div class="header-actions">
        <Button
          label="Create Quote"
          icon="pi pi-plus"
          @click="createNewQuote"
          class="p-button-primary"
        />
      </div>
    </div>

    <!-- Quotes List -->
    <div v-if="!showBuilder" class="quotes-content">
      <div class="quotes-filters">
        <div class="filter-row">
          <div class="filter-group">
            <label for="status-filter">Status:</label>
            <Dropdown
              id="status-filter"
              v-model="filters.status"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="All Statuses"
              show-clear
              @change="loadQuotes"
            />
          </div>
          <div class="filter-group">
            <label for="search-filter">Search:</label>
            <InputText
              id="search-filter"
              v-model="filters.search"
              placeholder="Search quotes..."
              @input="debouncedSearch"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <ProgressSpinner />
        <p>Loading quotes...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="quotes.length === 0" class="empty-state">
        <i class="pi pi-file-edit empty-icon"></i>
        <h3>No Quotes Found</h3>
        <p>Create your first quote to get started with proposals.</p>
        <Button
          label="Create Quote"
          icon="pi pi-plus"
          @click="createNewQuote"
          class="p-button-primary"
        />
      </div>

      <!-- Quotes Table -->
      <div v-else class="quotes-table-container">
        <DataTable
          :value="quotes"
          :paginator="true"
          :rows="10"
          :rows-per-page-options="[10, 25, 50]"
          paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown"
          class="quotes-table"
          responsive-layout="scroll"
        >
          <Column field="quoteNumber" header="Quote #" sortable>
            <template #body="{ data }">
              <span class="quote-number">{{ data.quoteNumber }}</span>
            </template>
          </Column>

          <Column field="title" header="Title" sortable>
            <template #body="{ data }">
              <div class="quote-title">
                <div class="title">{{ data.title }}</div>
                <div class="institution">{{ data.institution?.name }}</div>
              </div>
            </template>
          </Column>

          <Column field="total" header="Amount" sortable>
            <template #body="{ data }">
              <span class="amount">{{ formatCurrency(data.total) }}</span>
            </template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Badge
                :value="getStatusLabel(data.status)"
                :severity="getStatusSeverity(data.status)"
              />
            </template>
          </Column>

          <Column field="validUntil" header="Valid Until" sortable>
            <template #body="{ data }">
              <span class="date">{{ formatDate(data.validUntil) }}</span>
            </template>
          </Column>

          <Column header="Actions">
            <template #body="{ data }">
              <div class="quote-actions">
                <Button
                  icon="pi pi-eye"
                  text
                  rounded
                  severity="info"
                  @click="viewQuote(data)"
                  v-tooltip.top="'View'"
                />
                <Button
                  icon="pi pi-pencil"
                  text
                  rounded
                  severity="secondary"
                  @click="editQuote(data)"
                  v-tooltip.top="'Edit'"
                />
                <Button
                  icon="pi pi-download"
                  text
                  rounded
                  severity="secondary"
                  @click="downloadQuotePDF(data)"
                  v-tooltip.top="'Download PDF'"
                />
                <Button
                  icon="pi pi-send"
                  text
                  rounded
                  severity="success"
                  @click="emailQuote(data)"
                  v-tooltip.top="'Email to Client'"
                />
                <Button
                  icon="pi pi-print"
                  text
                  rounded
                  severity="secondary"
                  @click="printQuote(data)"
                  v-tooltip.top="'Print'"
                />
                <Button
                  icon="pi pi-history"
                  text
                  rounded
                  severity="info"
                  @click="viewQuoteHistory(data)"
                  v-tooltip.top="'Document History'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Quote Builder -->
    <div v-else class="quote-builder-container">
      <QuoteBuilder
        :quote="selectedQuote"
        @saved="handleQuoteSaved"
        @cancelled="handleBuilderCancelled"
      />
    </div>

    <!-- Toast for notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import type { Quote, QuoteStatus } from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { onMounted, ref } from "vue"
import { QuoteBuilder } from "../../components/billing"
import { quotesApi } from "../../services/api"

// Reactive state
const quotes = ref<Quote[]>([])
const loading = ref(false)
const showBuilder = ref(false)
const selectedQuote = ref<Quote | null>(null)

// Filters
const filters = ref({
  status: null as QuoteStatus | null,
  search: "",
})

// Status options for dropdown
const statusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
  { label: "Cancelled", value: "cancelled" },
]

// Toast for notifications
const toast = useToast()

// Debounced search
let searchTimeout: NodeJS.Timeout
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadQuotes()
  }, 300)
}

// Load quotes from API
const loadQuotes = async () => {
  try {
    loading.value = true
    const response = await quotesApi.getAll(filters.value)
    quotes.value = response.data || []
  } catch (error) {
    console.error("Failed to load quotes:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load quotes",
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

// Create new quote
const createNewQuote = () => {
  selectedQuote.value = null
  showBuilder.value = true
}

// View quote
const viewQuote = (quote: Quote) => {
  selectedQuote.value = quote
  showBuilder.value = true
}

// Edit quote
const editQuote = (quote: Quote) => {
  selectedQuote.value = quote
  showBuilder.value = true
}

// Download quote PDF
const downloadQuotePDF = async (quote: Quote) => {
  try {
    const { documentsApi } = await import("../../services/api")
    const blob = (await documentsApi.generateQuotePdf(quote.id)) as Blob

    const filename = `Quote-${quote.quoteNumber}.pdf`
    documentsApi.downloadBlob(blob, filename)

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Quote PDF downloaded successfully",
      life: 3000,
    })
  } catch (error) {
    console.error("Failed to download PDF:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to download PDF",
      life: 3000,
    })
  }
}

// Email quote to client
const emailQuote = async (quote: Quote) => {
  try {
    const { documentsApi } = await import("../../services/api")
    const result = await documentsApi.generateQuotePdf(quote.id, {
      email: true,
      customMessage: `Please find attached our quote ${quote.quoteNumber} for your review.`,
    })

    if (typeof result === "object" && result.data?.emailSent) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Quote emailed to client successfully",
        life: 3000,
      })
    } else {
      toast.add({
        severity: "error",
        summary: "Email Failed",
        detail: "Failed to send quote email",
        life: 3000,
      })
    }

    await loadQuotes()
  } catch (error) {
    console.error("Failed to email quote:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to email quote",
      life: 3000,
    })
  }
}

// Print quote
const printQuote = async (quote: Quote) => {
  try {
    const { documentsApi } = await import("../../services/api")
    const blob = (await documentsApi.generateQuotePdf(quote.id)) as Blob

    documentsApi.openBlobInNewTab(blob)
  } catch (error) {
    console.error("Failed to print quote:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to open quote for printing",
      life: 3000,
    })
  }
}

// View quote history
const viewQuoteHistory = (quote: Quote) => {
  // This would open a dialog or navigate to a history view
  toast.add({
    severity: "info",
    summary: "Document History",
    detail: `Viewing history for quote ${quote.quoteNumber}`,
    life: 3000,
  })
}

// Handle quote saved
const handleQuoteSaved = (quote: Quote) => {
  showBuilder.value = false
  selectedQuote.value = null
  loadQuotes()

  toast.add({
    severity: "success",
    summary: "Success",
    detail: "Quote saved successfully",
    life: 3000,
  })
}

// Handle builder cancelled
const handleBuilderCancelled = () => {
  showBuilder.value = false
  selectedQuote.value = null
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0)
}

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

const getStatusLabel = (status: QuoteStatus) => {
  const labels: Record<QuoteStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
    cancelled: "Cancelled",
  }
  return labels[status] || "Unknown"
}

const getStatusSeverity = (status: QuoteStatus) => {
  const severities: Record<QuoteStatus, string> = {
    draft: "secondary",
    sent: "info",
    accepted: "success",
    rejected: "danger",
    expired: "warning",
    cancelled: "secondary",
  }
  return severities[status] || "secondary"
}

// Load quotes on mount
onMounted(() => {
  loadQuotes()
})
</script>

<style scoped>
.quotes-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.quotes-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header-content h1 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.75rem;
  font-weight: 600;
}

.header-description {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 1rem;
}

.header-actions {
  flex-shrink: 0;
}

.quotes-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.quotes-filters {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.5rem;
}

.filter-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.5rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-state p {
  color: var(--text-color-secondary);
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.25rem;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: var(--text-color-secondary);
}

.quotes-table-container {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.quote-number {
  font-family: "Courier New", monospace;
  font-weight: 600;
  color: var(--primary-color);
}

.quote-title .title {
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 0.25rem;
}

.quote-title .institution {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.amount {
  font-family: "Courier New", monospace;
  font-weight: 600;
  color: var(--text-color);
}

.date {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.quote-actions {
  display: flex;
  gap: 0.25rem;
}

.quote-builder-container {
  background: var(--surface-ground);
  margin: -1.5rem;
  padding: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .quotes-view {
    padding: 1rem;
  }

  .quotes-header {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .quote-actions {
    flex-wrap: wrap;
  }

  .quote-builder-container {
    margin: -1rem;
  }
}
</style>
