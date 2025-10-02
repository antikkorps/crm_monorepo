<template>
  <div class="digiforma-tab">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
      <p class="text-body-1 mt-4">Chargement des données Digiforma...</p>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Company Info -->
      <v-row v-if="company" class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-office-building" color="primary" class="mr-2" />
              Informations Digiforma
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6" v-if="company.metadata?.accountingNumber">
                  <div class="text-caption text-medium-emphasis">Numéro comptable</div>
                  <div class="text-h6">{{ company.metadata.accountingNumber }}</div>
                </v-col>
                <v-col cols="12" md="6" v-if="company.metadata?.code">
                  <div class="text-caption text-medium-emphasis">Code Digiforma</div>
                  <div class="text-h6">{{ company.metadata.code }}</div>
                </v-col>
                <v-col cols="12" md="6" v-if="company.metadata?.ape">
                  <div class="text-caption text-medium-emphasis">Code APE</div>
                  <div class="text-h6">{{ company.metadata.ape }}</div>
                </v-col>
                <v-col cols="12" md="6" v-if="company.metadata?.employeesCount">
                  <div class="text-caption text-medium-emphasis">Nombre d'employés</div>
                  <div class="text-h6">{{ company.metadata.employeesCount }}</div>
                </v-col>
                <v-col cols="12" v-if="company.metadata?.note">
                  <div class="text-caption text-medium-emphasis">Notes</div>
                  <div class="text-body-1">{{ company.metadata.note }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Formation Revenue Summary -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2" color="green" variant="tonal">
            <v-card-text class="text-center py-6">
              <div class="d-flex align-center justify-center mb-3">
                <v-icon icon="mdi-school" size="40" color="green" class="mr-3" />
                <div class="text-h3 font-weight-bold">
                  {{ formatCurrency(revenue?.formation.totalRevenue || 0) }}
                </div>
              </div>
              <div class="text-h6 text-medium-emphasis mb-4">
                Chiffre d'affaires Formation (Digiforma)
              </div>
              <v-row>
                <v-col cols="6">
                  <div class="text-h6 font-weight-bold" style="color: #4CAF50">
                    {{ formatCurrency(revenue?.formation.paidRevenue || 0) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis">Payé</div>
                </v-col>
                <v-col cols="6">
                  <div class="text-h6 font-weight-bold" style="color: #F44336">
                    {{ formatCurrency(revenue?.formation.unpaidRevenue || 0) }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis">Impayé</div>
                </v-col>
              </v-row>
              <v-divider class="my-3" />
              <div class="text-body-1">
                <v-icon icon="mdi-file-document" class="mr-1" />
                {{ revenue?.formation.invoiceCount || 0 }} facture(s) Formation
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quotes Section -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-file-document-outline" color="primary" class="mr-2" />
                Devis Digiforma
              </div>
              <v-chip :text="`${quotes.length} devis`" color="primary" variant="tonal" />
            </v-card-title>

            <v-card-text v-if="quotes.length > 0">
              <v-data-table
                :headers="quoteHeaders"
                :items="quotes"
                :items-per-page="10"
                :loading="loadingQuotes"
              >
                <template v-slot:item.quoteNumber="{ item }">
                  <span class="font-weight-medium">{{ item.quoteNumber }}</span>
                </template>

                <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="getQuoteStatusColor(item.status)"
                    :text="item.status"
                    size="small"
                    variant="tonal"
                  />
                </template>

                <template v-slot:item.totalAmount="{ item }">
                  {{ formatCurrency(item.totalAmount) }}
                </template>

                <template v-slot:item.createdDate="{ item }">
                  {{ formatDate(item.createdDate) }}
                </template>

                <template v-slot:item.validUntil="{ item }">
                  <span :class="{ 'text-error': isExpired(item.validUntil) }">
                    {{ formatDate(item.validUntil) }}
                  </span>
                </template>
              </v-data-table>
            </v-card-text>

            <v-card-text v-else class="text-center py-8">
              <v-icon icon="mdi-file-document-outline" size="48" color="grey-lighten-1" />
              <p class="mt-4 text-body-1 text-medium-emphasis">Aucun devis trouvé</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Invoices Section -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-receipt" color="primary" class="mr-2" />
                Factures Digiforma
              </div>
              <v-chip :text="`${invoices.length} facture(s)`" color="primary" variant="tonal" />
            </v-card-title>

            <v-card-text v-if="invoices.length > 0">
              <v-data-table
                :headers="invoiceHeaders"
                :items="invoices"
                :items-per-page="10"
                :loading="loadingInvoices"
              >
                <template v-slot:item.invoiceNumber="{ item }">
                  <span class="font-weight-medium">{{ item.invoiceNumber }}</span>
                </template>

                <template v-slot:item.status="{ item }">
                  <v-chip
                    :color="getInvoiceStatusColor(item.status)"
                    :text="item.status"
                    size="small"
                    variant="tonal"
                  />
                </template>

                <template v-slot:item.totalAmount="{ item }">
                  {{ formatCurrency(item.totalAmount) }}
                </template>

                <template v-slot:item.paidAmount="{ item }">
                  {{ formatCurrency(item.paidAmount) }}
                </template>

                <template v-slot:item.issueDate="{ item }">
                  {{ formatDate(item.issueDate) }}
                </template>

                <template v-slot:item.dueDate="{ item }">
                  <span :class="{ 'text-error': isOverdue(item) }">
                    {{ formatDate(item.dueDate) }}
                  </span>
                </template>
              </v-data-table>
            </v-card-text>

            <v-card-text v-else class="text-center py-8">
              <v-icon icon="mdi-receipt" size="48" color="grey-lighten-1" />
              <p class="mt-4 text-body-1 text-medium-emphasis">Aucune facture trouvée</p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Info Alert -->
      <v-alert
        type="info"
        variant="tonal"
        class="mb-6"
      >
        <v-alert-title>Données synchronisées depuis Digiforma</v-alert-title>
        Les données affichées proviennent de votre compte Digiforma et sont synchronisées automatiquement.
        <template v-slot:append>
          <v-btn
            variant="text"
            color="info"
            size="small"
            @click="$router.push('/settings/digiforma')"
          >
            Configuration
          </v-btn>
        </template>
      </v-alert>
    </div>

    <!-- Error State -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-6"
    >
      <v-alert-title>Erreur de chargement</v-alert-title>
      {{ error }}
      <template v-slot:append>
        <v-btn
          variant="text"
          color="error"
          size="small"
          @click="loadData"
        >
          Réessayer
        </v-btn>
      </template>
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { digiformaApi } from '@/services/api'
import type { ConsolidatedRevenue, DigiformaQuote, DigiformaInvoice, DigiformaCompany } from '@/services/api/digiforma'

// Props
const props = defineProps<{
  institutionId: string
}>()

// Refs
const company = ref<DigiformaCompany | null>(null)
const revenue = ref<ConsolidatedRevenue | null>(null)
const quotes = ref<DigiformaQuote[]>([])
const invoices = ref<DigiformaInvoice[]>([])
const loading = ref(false)
const loadingQuotes = ref(false)
const loadingInvoices = ref(false)
const error = ref<string | null>(null)

// Table headers
const quoteHeaders = [
  { title: 'N° Devis', key: 'quoteNumber', sortable: true },
  { title: 'Statut', key: 'status', sortable: true },
  { title: 'Montant', key: 'totalAmount', sortable: true },
  { title: 'Date création', key: 'createdDate', sortable: true },
  { title: 'Valide jusqu\'au', key: 'validUntil', sortable: true }
]

const invoiceHeaders = [
  { title: 'N° Facture', key: 'invoiceNumber', sortable: true },
  { title: 'Statut', key: 'status', sortable: true },
  { title: 'Montant total', key: 'totalAmount', sortable: true },
  { title: 'Montant payé', key: 'paidAmount', sortable: true },
  { title: 'Date émission', key: 'issueDate', sortable: true },
  { title: 'Date échéance', key: 'dueDate', sortable: true }
]

// Load all data
async function loadData() {
  loading.value = true
  error.value = null

  try {
    const [companyData, revenueData, quotesData, invoicesData] = await Promise.all([
      digiformaApi.data.getInstitutionCompany(props.institutionId),
      digiformaApi.revenue.getInstitutionRevenue(props.institutionId),
      digiformaApi.data.getInstitutionQuotes(props.institutionId),
      digiformaApi.data.getInstitutionInvoices(props.institutionId)
    ])

    company.value = companyData
    revenue.value = revenueData
    quotes.value = quotesData
    invoices.value = invoicesData
  } catch (err: any) {
    error.value = err.message || 'Impossible de charger les données Digiforma'
    console.error('Failed to load Digiforma data:', err)
  } finally {
    loading.value = false
  }
}


// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getQuoteStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'draft': 'grey',
    'sent': 'info',
    'accepted': 'success',
    'rejected': 'error',
    'expired': 'warning'
  }
  return colors[status.toLowerCase()] || 'grey'
}

function getInvoiceStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'draft': 'grey',
    'sent': 'info',
    'paid': 'success',
    'overdue': 'error',
    'cancelled': 'warning'
  }
  return colors[status.toLowerCase()] || 'grey'
}

function isExpired(validUntil: string): boolean {
  return new Date(validUntil) < new Date()
}

function isOverdue(invoice: DigiformaInvoice): boolean {
  return invoice.status !== 'paid' && new Date(invoice.dueDate) < new Date()
}

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.h-100 {
  height: 100%;
}
</style>
