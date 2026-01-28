<template>
  <div class="revenue-tab">
    <!-- Add External Reference Button -->
    <div class="d-flex justify-end mb-4">
      <v-btn
        color="secondary"
        variant="tonal"
        prepend-icon="mdi-link-variant-plus"
        @click="showTransactionForm = true"
      >
        {{ t("simplifiedTransactions.addExternal") }}
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="pa-4">
      <v-row class="mb-6">
        <v-col cols="12" md="3" v-for="i in 4" :key="i">
          <v-card elevation="2">
            <v-card-text>
              <v-skeleton-loader type="text" width="100" class="mb-2" />
              <v-skeleton-loader type="text" width="150" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title>
              <v-skeleton-loader type="text" width="200" />
            </v-card-title>
            <v-card-text>
              <v-skeleton-loader type="paragraph" />
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-title>
              <v-skeleton-loader type="text" width="200" />
            </v-card-title>
            <v-card-text>
              <v-skeleton-loader type="paragraph" />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Error State -->
    <v-alert
      v-else-if="error"
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
          @click="loadRevenue"
        >
          Réessayer
        </v-btn>
      </template>
    </v-alert>

    <!-- Content -->
    <div v-else-if="analytics">
      <!-- Key Performance Indicators -->
      <v-row class="mb-6">
        <v-col cols="12" md="3">
          <v-card elevation="2" class="h-100" color="primary" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-currency-eur</v-icon>
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(analytics.summary.lifetimeValue) }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Lifetime Value (LTV)
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card elevation="2" class="h-100" color="success" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-percent</v-icon>
              <div class="text-h4 font-weight-bold">
                {{ analytics.summary.conversionRate }}%
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Taux de conversion
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ analytics.summary.acceptedQuotes }} / {{ analytics.summary.totalQuotes }} devis
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card elevation="2" class="h-100" color="warning" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-clock-outline</v-icon>
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(analytics.summary.pendingRevenue) }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Revenu en attente
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="3">
          <v-card elevation="2" class="h-100" color="error" variant="tonal">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-alert-circle-outline</v-icon>
              <div class="text-h4 font-weight-bold">
                {{ formatCurrency(analytics.summary.overdueRevenue) }}
              </div>
              <div class="text-body-2 text-medium-emphasis mt-1">
                Revenu en retard
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Secondary KPIs -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-text class="d-flex justify-space-between align-center">
              <div>
                <div class="text-caption text-medium-emphasis">Valeur moyenne devis</div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(analytics.summary.averageQuoteValue) }}
                </div>
              </div>
              <v-icon size="40" color="primary">mdi-file-document-outline</v-icon>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card elevation="2">
            <v-card-text class="d-flex justify-space-between align-center">
              <div>
                <div class="text-caption text-medium-emphasis">Valeur moyenne facture</div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(analytics.summary.averageInvoiceValue) }}
                </div>
              </div>
              <v-icon size="40" color="success">mdi-receipt-text-outline</v-icon>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quote Analytics -->
      <v-row class="mb-6">
        <v-col cols="12" md="6">
          <v-card elevation="2" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-file-document-outline" color="primary" class="mr-2" />
              Analyse des Devis
            </v-card-title>
            <v-card-text>
              <v-list lines="two">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-file-multiple-outline</v-icon>
                  </template>
                  <v-list-item-title>Total devis</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.quoteAnalytics.totalQuotes }} devis pour {{ formatCurrency(analytics.quoteAnalytics.totalQuoteValue) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle-outline</v-icon>
                  </template>
                  <v-list-item-title>Devis acceptés</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.quoteAnalytics.acceptedQuotes }} devis pour {{ formatCurrency(analytics.quoteAnalytics.acceptedQuoteValue) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="info">mdi-send-outline</v-icon>
                  </template>
                  <v-list-item-title>Devis envoyés</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.quoteAnalytics.sentQuotes }} devis en attente de réponse
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-close-circle-outline</v-icon>
                  </template>
                  <v-list-item-title>Devis rejetés</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.quoteAnalytics.rejectedQuotes }} devis rejetés ou expirés
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Invoice Analytics -->
        <v-col cols="12" md="6">
          <v-card elevation="2" class="h-100">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-receipt-text-outline" color="success" class="mr-2" />
              Analyse des Factures
            </v-card-title>
            <v-card-text>
              <v-list lines="two">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="primary">mdi-file-multiple-outline</v-icon>
                  </template>
                  <v-list-item-title>Total factures</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.invoiceAnalytics.totalInvoices }} factures pour {{ formatCurrency(analytics.invoiceAnalytics.totalInvoiceValue) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="success">mdi-check-circle-outline</v-icon>
                  </template>
                  <v-list-item-title>Factures payées</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.invoiceAnalytics.paidInvoices }} factures pour {{ formatCurrency(analytics.invoiceAnalytics.paidValue) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="warning">mdi-progress-clock</v-icon>
                  </template>
                  <v-list-item-title>Factures partiellement payées</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.invoiceAnalytics.partiallyPaidInvoices }} factures
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="info">mdi-clock-outline</v-icon>
                  </template>
                  <v-list-item-title>Factures impayées</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.invoiceAnalytics.unpaidInvoices }} factures pour {{ formatCurrency(analytics.invoiceAnalytics.pendingValue) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-divider />

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon color="error">mdi-alert-circle-outline</v-icon>
                  </template>
                  <v-list-item-title>Factures en retard</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ analytics.invoiceAnalytics.overdueInvoices }} factures en retard
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- External References (Simplified Transactions) -->
      <v-row v-if="analytics.simplifiedTransactionAnalytics?.total > 0" class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-link-variant" color="secondary" class="mr-2" />
              {{ t("simplifiedTransactions.title") }}
              <v-chip size="small" color="secondary" class="ml-2">
                {{ analytics.simplifiedTransactionAnalytics.total }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6" md="3">
                  <div class="text-center">
                    <v-icon size="24" color="primary" class="mb-1">mdi-file-document-outline</v-icon>
                    <div class="text-h6 font-weight-bold">
                      {{ analytics.simplifiedTransactionAnalytics.byType.quotes }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ t("simplifiedTransactions.type.quote") }}
                    </div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="text-center">
                    <v-icon size="24" color="success" class="mb-1">mdi-receipt-text-outline</v-icon>
                    <div class="text-h6 font-weight-bold">
                      {{ analytics.simplifiedTransactionAnalytics.byType.invoices }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ t("simplifiedTransactions.type.invoice") }}
                    </div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="text-center">
                    <v-icon size="24" color="info" class="mb-1">mdi-file-sign</v-icon>
                    <div class="text-h6 font-weight-bold">
                      {{ analytics.simplifiedTransactionAnalytics.byType.engagementLetters }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ t("simplifiedTransactions.type.engagement_letter") }}
                    </div>
                  </div>
                </v-col>
                <v-col cols="6" md="3">
                  <div class="text-center">
                    <v-icon size="24" color="warning" class="mb-1">mdi-file-document-edit-outline</v-icon>
                    <div class="text-h6 font-weight-bold">
                      {{ analytics.simplifiedTransactionAnalytics.byType.contracts }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ t("simplifiedTransactions.type.contract") }}
                    </div>
                  </div>
                </v-col>
              </v-row>

              <v-divider class="my-4" />

              <div class="d-flex justify-space-between align-center">
                <div>
                  <span class="text-caption text-medium-emphasis">Valeur totale :</span>
                  <span class="text-body-1 font-weight-bold ml-2">
                    {{ formatCurrency(analytics.simplifiedTransactionAnalytics.totalValue) }}
                  </span>
                </div>
                <div v-if="analytics.simplifiedTransactionAnalytics.paidInvoicesValue > 0">
                  <span class="text-caption text-medium-emphasis">Factures externes payées :</span>
                  <span class="text-body-1 font-weight-bold ml-2 text-success">
                    {{ formatCurrency(analytics.simplifiedTransactionAnalytics.paidInvoicesValue) }}
                  </span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Simplified Transactions List -->
      <v-row v-if="simplifiedTransactions.length > 0" class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-link-variant" color="secondary" class="mr-2" />
                {{ t("simplifiedTransactions.title") }}
              </div>
              <v-btn
                variant="text"
                size="small"
                color="secondary"
                prepend-icon="mdi-plus"
                @click="showTransactionForm = true"
              >
                {{ t("common.add") }}
              </v-btn>
            </v-card-title>
            <v-card-text>
              <v-list lines="two">
                <template v-for="(tx, index) in simplifiedTransactions" :key="tx.id">
                  <v-list-item
                    @click="editTransaction(tx)"
                    class="cursor-pointer"
                  >
                    <template v-slot:prepend>
                      <v-icon :color="getTypeColor(tx.type)">
                        {{ getTypeIcon(tx.type) }}
                      </v-icon>
                    </template>
                    <v-list-item-title class="d-flex align-center">
                      {{ tx.title }}
                      <v-chip
                        size="x-small"
                        color="secondary"
                        variant="tonal"
                        class="ml-2"
                      >
                        <v-icon start size="12">mdi-link-variant</v-icon>
                        {{ t("simplifiedTransactions.externalBadge") }}
                      </v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      <span v-if="tx.referenceNumber" class="mr-2">{{ tx.referenceNumber }} •</span>
                      {{ formatDate(tx.date) }} • {{ formatCurrency(tx.amountTtc) }}
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <v-chip
                        size="small"
                        :color="getStatusColor(tx.status)"
                        variant="tonal"
                      >
                        {{ t(`simplifiedTransactions.status.${tx.status}`) }}
                      </v-chip>
                    </template>
                  </v-list-item>
                  <v-divider v-if="index < simplifiedTransactions.length - 1" />
                </template>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Simplified Transaction Form Dialog -->
    <SimplifiedTransactionForm
      v-model="showTransactionForm"
      :transaction="editingTransaction"
      :institution-id="institutionId"
      @saved="onTransactionSaved"
      @cancelled="onTransactionCancelled"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { revenueApi, simplifiedTransactionsApi } from '@/services/api'
import type { RevenueAnalytics } from '@/services/api/revenue'
import type { SimplifiedTransaction, SimplifiedTransactionType, SimplifiedTransactionStatus } from '@medical-crm/shared'
import SimplifiedTransactionForm from '@/components/billing/simplified/SimplifiedTransactionForm.vue'

const { t } = useI18n()

// Props
const props = defineProps<{
  institutionId: string
}>()

// Refs
const analytics = ref<RevenueAnalytics | null>(null)
const simplifiedTransactions = ref<SimplifiedTransaction[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Simplified Transaction Form
const showTransactionForm = ref(false)
const editingTransaction = ref<SimplifiedTransaction | null>(null)

// Load revenue analytics
async function loadRevenue() {
  loading.value = true
  error.value = null

  try {
    const [revenueResponse, transactionsResponse] = await Promise.all([
      revenueApi.getInstitutionRevenue(props.institutionId),
      simplifiedTransactionsApi.getByInstitution(props.institutionId)
    ])
    analytics.value = revenueResponse.data
    simplifiedTransactions.value = transactionsResponse.data || []
  } catch (err: any) {
    error.value = err.message || 'Impossible de charger les analytics de revenus'
    console.error('Failed to load revenue analytics:', err)
  } finally {
    loading.value = false
  }
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format date
function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date))
}

// Get type icon
function getTypeIcon(type: SimplifiedTransactionType): string {
  const icons: Record<SimplifiedTransactionType, string> = {
    quote: 'mdi-file-document-outline',
    invoice: 'mdi-receipt-text-outline',
    engagement_letter: 'mdi-file-sign',
    contract: 'mdi-file-document-edit-outline'
  }
  return icons[type] || 'mdi-file-outline'
}

// Get type color
function getTypeColor(type: SimplifiedTransactionType): string {
  const colors: Record<SimplifiedTransactionType, string> = {
    quote: 'primary',
    invoice: 'success',
    engagement_letter: 'info',
    contract: 'warning'
  }
  return colors[type] || 'grey'
}

// Get status color
function getStatusColor(status: SimplifiedTransactionStatus): string {
  const colors: Record<string, string> = {
    draft: 'grey',
    sent: 'info',
    accepted: 'success',
    rejected: 'error',
    expired: 'warning',
    cancelled: 'grey',
    pending: 'info',
    paid: 'success',
    partial: 'warning',
    overdue: 'error',
    active: 'success',
    terminated: 'grey'
  }
  return colors[status] || 'grey'
}

// Edit transaction
function editTransaction(tx: SimplifiedTransaction) {
  editingTransaction.value = tx
  showTransactionForm.value = true
}

// Handle transaction saved
function onTransactionSaved() {
  editingTransaction.value = null
  loadRevenue()
}

// Handle transaction cancelled
function onTransactionCancelled() {
  editingTransaction.value = null
}

// Lifecycle
onMounted(() => {
  loadRevenue()
})
</script>

<style scoped>
.h-100 {
  height: 100%;
}

.revenue-tab {
  padding: 0.5rem;
}

.cursor-pointer {
  cursor: pointer;
}

.cursor-pointer:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
