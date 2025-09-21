<template>
  <AppLayout>
    <div class="quotes-view">
      <div v-if="!showBuilder">
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <h1 class="text-h4 font-weight-bold">Devis</h1>
            <p class="text-medium-emphasis">Gérez vos devis et propositions pour les institutions médicales</p>
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="createNewQuote">Nouveau Devis</v-btn>
        </div>

        <v-card class="mb-6" variant="outlined">
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="4" sm="6">
                <v-text-field v-model="filters.search" label="Rechercher..." prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details @input="debouncedSearch" />
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <v-select
                  v-model="filters.status"
                  :items="statusOptions"
                  item-title="label"
                  item-value="value"
                  label="Statut"
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

        <div v-if="loading" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="mt-4">Chargement des devis...</p>
        </div>

        <div v-else-if="quotes.length === 0" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2">mdi-file-document-outline</v-icon>
          <h3 class="text-h6 mt-4">Aucun devis trouvé</h3>
          <p class="text-medium-emphasis">Créez votre premier devis pour commencer.</p>
          <v-btn color="primary" @click="createNewQuote">Créer un devis</v-btn>
        </div>

        <v-card v-else>
          <v-data-table
            :headers="tableHeaders"
            :items="quotes"
            :loading="loading"
            :items-per-page="10"
            class="elevation-0"
          >
            <template #item.quoteNumber="{ item }">
              <span class="font-weight-bold">{{ item.quoteNumber }}</span>
            </template>
            <template #item.title="{ item }">
              <div>
                <div class="font-weight-medium">{{ item.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.institution?.name }}</div>
              </div>
            </template>
            <template #item.total="{ item }">{{ formatCurrency(item.total) }}</template>
            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small">{{ getStatusLabel(item.status) }}</v-chip>
            </template>
            <template #item.validUntil="{ item }">{{ formatDate(item.validUntil) }}</template>
            <template #item.actions="{ item }">
              <div class="d-flex gap-1">
                <v-btn icon="mdi-eye" variant="text" size="small" @click="viewQuote(item)" title="Voir"></v-btn>
                <v-btn icon="mdi-pencil" variant="text" size="small" @click="editQuote(item)" title="Modifier"></v-btn>
                <v-btn icon="mdi-download" variant="text" size="small" @click="downloadQuotePDF(item)" title="Télécharger le devis"></v-btn>
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
        <QuoteBuilder :quote="selectedQuote" @saved="handleQuoteSaved" @cancelled="handleBuilderCancelled" />
      </div>

      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">{{ snackbar.message }}</v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import type { Quote, QuoteStatus } from "@medical-crm/shared"
import { onMounted, ref } from "vue"
import QuoteBuilder from "@/components/billing/QuoteBuilder.vue"
import { quotesApi } from "@/services/api"
import AppLayout from "@/components/layout/AppLayout.vue"
import { useAuthStore } from "@/stores/auth"

const quotes = ref<Quote[]>([])
const loading = ref(false)
const showBuilder = ref(false)
const selectedQuote = ref<Quote | null>(null)
const filters = ref({ status: null as QuoteStatus | null, search: "" })
const snackbar = ref({ visible: false, message: '', color: 'info' })
const authStore = useAuthStore()

const statusOptions = [
  { label: "Brouillon", value: "draft" },
  { label: "Envoyé", value: "sent" },
  { label: "Bon de commande", value: "ordered" },
  { label: "Accepté", value: "accepted" },
  { label: "Rejeté", value: "rejected" },
  { label: "Expiré", value: "expired" },
  { label: "Annulé", value: "cancelled" },
]

const tableHeaders = [
  { title: 'Devis #', value: 'quoteNumber' },
  { title: 'Titre', value: 'title' },
  { title: 'Montant', value: 'total', align: 'end' },
  { title: 'Statut', value: 'status' },
  { title: 'Valide Jusqu\'au', value: 'validUntil', align: 'end' },
  { title: 'Actions', value: 'actions', align: 'end', sortable: false },
]

let searchTimeout: any
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadQuotes, 300)
}

const loadQuotes = async () => {
  loading.value = true
  try {
    const response = await quotesApi.getAll(filters.value)
    quotes.value = response.data || []
  } catch (error) {
    showSnackbar("Erreur lors du chargement des devis", "error")
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
      console.warn('Failed to fetch quote lines separately:', e)
    }
    selectedQuote.value = fullQuote
    showBuilder.value = true
  } catch (error) {
    console.error('Error loading quote for viewing:', error)
    showSnackbar('Erreur lors du chargement du devis', 'error')
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
      console.warn('Failed to fetch quote lines separately:', e)
    }
    selectedQuote.value = fullQuote
    showBuilder.value = true
  } catch (error) {
    console.error('Error loading quote for editing:', error)
    showSnackbar('Erreur lors du chargement du devis', 'error')
  }
}

const downloadQuotePDF = async (quote: Quote) => {
  try {
    const response = await quotesApi.generatePdf(quote.id)
    const blob = await response.blob()

    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Quote-${quote.quoteNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSnackbar("PDF du devis téléchargé", "success")
  } catch (error) {
    console.error("Error downloading quote PDF:", error)
    showSnackbar("Erreur lors du téléchargement du PDF", "error")
  }
}

const downloadOrderPDF = async (quote: Quote) => {
  try {
    const response = await quotesApi.generateOrderPdf(quote.id, (quote as any).templateId)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Order-${(quote as any).orderNumber || quote.quoteNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showSnackbar("Bon de commande téléchargé", "success")
  } catch (error) {
    console.error("Error downloading order PDF:", error)
    showSnackbar("Erreur lors du téléchargement du bon de commande", "error")
  }
}

const canDeleteQuote = (quote: Quote) => {
  const role = authStore.userRole
  const isPrivileged = role === 'super_admin' || role === 'team_admin' || role === 'manager'
  // Backend only allows deleting drafts; mirror that for UX
  return isPrivileged && quote.status === 'draft'
}

const deleteQuote = async (quote: Quote) => {
  if (!canDeleteQuote(quote)) return
  if (!confirm(`Supprimer le devis ${quote.quoteNumber} ?`)) return
  try {
    await quotesApi.delete(quote.id)
    showSnackbar('Devis supprimé', 'success')
    loadQuotes()
  } catch (e) {
    console.error('Delete quote failed:', e)
    showSnackbar("Impossible de supprimer le devis", 'error')
  }
}

const handleQuoteSaved = (quote: Quote) => {
  showBuilder.value = false
  selectedQuote.value = null
  loadQuotes()
  showSnackbar("Devis sauvegardé avec succès", "success")
}

const handleBuilderCancelled = () => {
  showBuilder.value = false
  selectedQuote.value = null
}

const formatCurrency = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount || 0)
const formatDate = (date: Date | string) => new Date(date).toLocaleDateString('fr-FR')
const getStatusLabel = (status: QuoteStatus) => ({ draft: "Brouillon", sent: "Envoyé", ordered: "Bon de commande", accepted: "Accepté", rejected: "Rejeté", expired: "Expiré", cancelled: "Annulé" }[status] || "Inconnu")
const getStatusColor = (status: QuoteStatus) => ({ draft: "grey", sent: "info", ordered: "purple", accepted: "success", rejected: "error", expired: "warning", cancelled: "secondary" }[status] || "secondary")

const showSnackbar = (message: string, color: string = 'info') => {
  snackbar.value = { visible: true, message, color }
}

onMounted(loadQuotes)
</script>

<style scoped>
.quotes-view {
  padding: 1.5rem;
}
</style>
