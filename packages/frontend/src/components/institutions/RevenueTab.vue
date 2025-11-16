<template>
  <div class="revenue-tab">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { revenueApi } from '@/services/api'
import type { RevenueAnalytics } from '@/services/api/revenue'

// Props
const props = defineProps<{
  institutionId: string
}>()

// Refs
const analytics = ref<RevenueAnalytics | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Load revenue analytics
async function loadRevenue() {
  loading.value = true
  error.value = null

  try {
    const response = await revenueApi.getInstitutionRevenue(props.institutionId)
    analytics.value = response.data.data
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
</style>
