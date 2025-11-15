<template>
  <v-card elevation="2" class="h-100">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-clock-alert-outline" color="warning" class="mr-2" />
        Devis à échéance proche
      </div>
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="loading"
        @click="loadQuotes"
      />
    </v-card-title>

    <!-- Loading State -->
    <v-card-text v-if="loading && quotes.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement des devis...</p>
    </v-card-text>

    <!-- Empty State -->
    <v-card-text v-else-if="quotes.length === 0" class="text-center py-12">
      <v-icon icon="mdi-check-circle" size="64" color="success" class="mb-4" />
      <p class="text-h6 text-medium-emphasis">Aucun devis urgent</p>
      <p class="text-body-2 text-medium-emphasis">
        Tous vos devis sont à jour
      </p>
    </v-card-text>

    <!-- Quotes List -->
    <v-card-text v-else class="pa-0">
      <v-list density="compact" lines="two">
        <template v-for="(quote, index) in displayedQuotes" :key="quote.id">
          <v-list-item
            class="quote-item"
            :class="getQuoteClass(quote)"
            @click="handleQuoteClick(quote)"
          >
            <template v-slot:prepend>
              <v-avatar :color="getQuoteColor(quote)" size="40">
                <v-icon :icon="getQuoteIcon(quote)" size="20" color="white" />
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-bold">
              {{ quote.quoteNumber }}
              <v-chip
                :color="getQuoteColor(quote)"
                size="x-small"
                variant="flat"
                class="ml-2"
              >
                {{ getQuoteUrgencyLabel(quote) }}
              </v-chip>
            </v-list-item-title>

            <v-list-item-subtitle class="text-wrap">
              <div>{{ quote.institution?.name || 'Client inconnu' }}</div>
              <div class="text-caption">
                {{ quote.title }} - {{ formatCurrency(quote.total) }}
              </div>
            </v-list-item-subtitle>

            <template v-slot:append>
              <div class="d-flex flex-column align-end">
                <v-chip
                  :color="getQuoteColor(quote)"
                  size="small"
                  variant="tonal"
                  class="mb-1"
                >
                  <v-icon start :icon="getDaysIcon(quote.daysUntilExpiry)" size="16" />
                  {{ getDaysLabel(quote) }}
                </v-chip>
                <v-btn
                  icon="mdi-email-fast-outline"
                  size="x-small"
                  variant="text"
                  :color="getQuoteColor(quote)"
                  @click.stop="handleSendReminder(quote)"
                />
              </div>
            </template>
          </v-list-item>

          <v-divider v-if="index < displayedQuotes.length - 1" :key="`divider-${quote.id}`" />
        </template>
      </v-list>

      <!-- Show More Button -->
      <div v-if="quotes.length > 5" class="px-4 py-2 text-center">
        <v-btn
          variant="text"
          size="small"
          @click="showAll = !showAll"
        >
          {{ showAll ? 'Voir moins' : `Voir ${quotes.length - 5} de plus` }}
          <v-icon end>{{ showAll ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
      </div>

      <!-- Summary Alert -->
      <v-alert
        v-if="criticalCount > 0"
        type="error"
        variant="tonal"
        density="compact"
        class="ma-4"
        prominent
      >
        <div class="d-flex align-center">
          <v-icon icon="mdi-alert-octagon" class="mr-2" />
          <span class="text-body-2">
            <strong>{{ criticalCount }}</strong> devis {{ criticalCount > 1 ? 'expirent' : 'expire' }} aujourd'hui ou {{ criticalCount > 1 ? 'sont déjà expirés' : 'est déjà expiré' }}
          </span>
        </div>
      </v-alert>
    </v-card-text>
  </v-card>

  <!-- Send Reminder Dialog -->
  <SendReminderDialog
    v-if="selectedQuote"
    v-model="showReminderDialog"
    :quote="selectedQuote"
    @reminder-sent="handleReminderSent"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { quoteRemindersApi, type QuoteNeedingAttention } from '@/services/api/quoteReminders'
import SendReminderDialog from '@/components/quotes/SendReminderDialog.vue'

const router = useRouter()

// State
const quotes = ref<QuoteNeedingAttention[]>([])
const loading = ref(false)
const showAll = ref(false)
const showReminderDialog = ref(false)
const selectedQuote = ref<QuoteNeedingAttention | null>(null)

// Computed
const displayedQuotes = computed(() => {
  return showAll.value ? quotes.value : quotes.value.slice(0, 5)
})

const criticalCount = computed(() => {
  return quotes.value.filter(quote => quote.daysUntilExpiry <= 0).length
})

// Methods
function getQuoteColor(quote: QuoteNeedingAttention): string {
  if (quote.daysUntilExpiry < 0) return 'error'
  if (quote.daysUntilExpiry === 0) return 'error'
  if (quote.daysUntilExpiry <= 3) return 'warning'
  return 'info'
}

function getQuoteIcon(quote: QuoteNeedingAttention): string {
  if (quote.daysUntilExpiry < 0) return 'mdi-alert-circle'
  if (quote.daysUntilExpiry === 0) return 'mdi-clock-alert'
  if (quote.daysUntilExpiry <= 3) return 'mdi-clock-fast'
  return 'mdi-clock-outline'
}

function getQuoteClass(quote: QuoteNeedingAttention): string {
  if (quote.daysUntilExpiry < 0) return 'quote-expired'
  if (quote.daysUntilExpiry === 0) return 'quote-critical'
  if (quote.daysUntilExpiry <= 3) return 'quote-warning'
  return 'quote-info'
}

function getQuoteUrgencyLabel(quote: QuoteNeedingAttention): string {
  if (quote.daysUntilExpiry < 0) return 'Expiré'
  if (quote.daysUntilExpiry === 0) return 'Aujourd\'hui'
  if (quote.daysUntilExpiry <= 3) return 'Urgent'
  return `${quote.daysUntilExpiry}j`
}

function getDaysLabel(quote: QuoteNeedingAttention): string {
  if (quote.daysUntilExpiry < 0) {
    const days = Math.abs(quote.daysUntilExpiry)
    return `Expiré il y a ${days}j`
  }
  if (quote.daysUntilExpiry === 0) return 'Expire aujourd\'hui'
  if (quote.daysUntilExpiry === 1) return 'Expire demain'
  return `Expire dans ${quote.daysUntilExpiry}j`
}

function getDaysIcon(days: number): string {
  if (days < 0) return 'mdi-close-circle'
  if (days === 0) return 'mdi-alert'
  return 'mdi-calendar-clock'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

async function loadQuotes() {
  loading.value = true

  try {
    quotes.value = await quoteRemindersApi.getQuotesNeedingAttention()
    // Sort by urgency: expired first, then by days until expiry
    quotes.value.sort((a, b) => {
      if (a.daysUntilExpiry < 0 && b.daysUntilExpiry >= 0) return -1
      if (b.daysUntilExpiry < 0 && a.daysUntilExpiry >= 0) return 1
      return a.daysUntilExpiry - b.daysUntilExpiry
    })
  } catch (error) {
    console.error('Error loading quotes needing attention:', error)
  } finally {
    loading.value = false
  }
}

function handleQuoteClick(quote: QuoteNeedingAttention) {
  router.push(`/quotes/${quote.id}`)
}

function handleSendReminder(quote: QuoteNeedingAttention) {
  selectedQuote.value = quote
  showReminderDialog.value = true
}

function handleReminderSent() {
  // Reload quotes after sending reminder
  loadQuotes()
}

// Lifecycle
onMounted(() => {
  loadQuotes()
})
</script>

<style scoped>
.quote-item {
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  padding: 12px 16px;
}

.quote-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  transform: translateX(4px);
}

.quote-expired {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.quote-critical {
  border-left: 4px solid rgb(var(--v-theme-error));
  background-color: rgba(var(--v-theme-error), 0.05);
}

.quote-warning {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.quote-info {
  border-left: 4px solid rgb(var(--v-theme-info));
}

.h-100 {
  height: 100%;
}
</style>
