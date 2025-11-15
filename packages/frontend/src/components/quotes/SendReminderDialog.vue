<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="py-3 d-flex align-center bg-primary">
        <v-icon class="mr-2">mdi-email-fast-outline</v-icon>
        Envoyer un rappel
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="close"
        />
      </v-card-title>

      <v-card-text class="pt-4">
        <!-- Quote Info -->
        <v-alert
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          <div class="text-subtitle-2 font-weight-bold">{{ quote?.quoteNumber }}</div>
          <div class="text-body-2">{{ quote?.institution?.name }}</div>
          <div class="text-caption">
            {{ quote?.title }} - {{ formatCurrency(quote?.total || 0) }}
          </div>
          <div class="text-caption mt-1">
            <v-chip
              :color="getUrgencyColor(quote?.daysUntilExpiry || 0)"
              size="x-small"
              class="mr-1"
            >
              {{ getExpiryLabel(quote?.daysUntilExpiry || 0) }}
            </v-chip>
          </div>
        </v-alert>

        <!-- Reminder Type Selection -->
        <div class="mb-4">
          <label class="text-subtitle-2 mb-2 d-block">Type de rappel</label>
          <v-select
            v-model="selectedReminderType"
            :items="reminderTypes"
            item-title="label"
            item-value="value"
            variant="outlined"
            density="comfortable"
            hide-details="auto"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item
                v-bind="props"
                :title="item.raw.label"
                :subtitle="item.raw.description"
              >
                <template v-slot:prepend>
                  <v-icon :icon="item.raw.icon" :color="item.raw.color" />
                </template>
              </v-list-item>
            </template>

            <template v-slot:selection="{ item }">
              <div class="d-flex align-center">
                <v-icon :icon="item.raw.icon" :color="item.raw.color" size="20" class="mr-2" />
                <span>{{ item.raw.label }}</span>
              </div>
            </template>
          </v-select>
          <div class="text-caption text-medium-emphasis mt-1">
            {{ selectedReminderTypeDescription }}
          </div>
        </div>

        <!-- Custom Message -->
        <div class="mb-4">
          <label class="text-subtitle-2 mb-2 d-block">Message personnalisé (optionnel)</label>
          <v-textarea
            v-model="customMessage"
            variant="outlined"
            rows="3"
            density="comfortable"
            placeholder="Ajoutez un message personnalisé qui sera ajouté au début de l'email..."
            hide-details="auto"
            counter="500"
            :maxlength="500"
          />
        </div>

        <!-- Preview Actions -->
        <v-expansion-panels variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <div class="d-flex align-center">
                <v-icon class="mr-2">mdi-information-outline</v-icon>
                Actions qui seront effectuées
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list density="compact">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-email" color="primary" />
                  </template>
                  <v-list-item-title>Email au commercial assigné</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ quote?.assignedUser?.email || 'Non disponible' }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon icon="mdi-bell" color="info" />
                  </template>
                  <v-list-item-title>Notification in-app</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ quote?.assignedUser?.firstName }} {{ quote?.assignedUser?.lastName }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="willCreateTask">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-checkbox-marked-circle" color="success" />
                  </template>
                  <v-list-item-title>Tâche de suivi créée</v-list-item-title>
                  <v-list-item-subtitle>
                    Une tâche de relance sera automatiquement créée
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <!-- Error Alert -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="error = ''"
        >
          {{ error }}
        </v-alert>

        <!-- Success Alert -->
        <v-alert
          v-if="success"
          type="success"
          variant="tonal"
          class="mt-4"
        >
          <div class="d-flex align-center">
            <v-icon icon="mdi-check-circle" class="mr-2" />
            Rappel envoyé avec succès !
          </div>
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :loading="sending"
          :disabled="!selectedReminderType || success"
          @click="sendReminder"
        >
          <v-icon start>mdi-send</v-icon>
          Envoyer le rappel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { quoteRemindersApi, type QuoteNeedingAttention } from '@/services/api/quoteReminders'

interface ReminderType {
  value: string
  label: string
  description: string
  icon: string
  color: string
  createTask: boolean
}

const props = defineProps<{
  modelValue: boolean
  quote: QuoteNeedingAttention | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'reminder-sent': []
}>()

// State
const selectedReminderType = ref('')
const customMessage = ref('')
const sending = ref(false)
const error = ref('')
const success = ref(false)

// Constants
const SUCCESS_DISPLAY_DURATION_MS = 2000

// Reminder types
const reminderTypes: ReminderType[] = [
  {
    value: '7_days_before',
    label: '7 jours avant échéance',
    description: 'Rappel de courtoisie - Le devis expire dans 7 jours',
    icon: 'mdi-calendar-clock',
    color: 'info',
    createTask: true
  },
  {
    value: '3_days_before',
    label: '3 jours avant échéance',
    description: 'Rappel urgent - Le devis expire dans 3 jours',
    icon: 'mdi-clock-fast',
    color: 'warning',
    createTask: true
  },
  {
    value: 'day_of',
    label: 'Jour d\'échéance',
    description: 'Dernier rappel - Le devis expire aujourd\'hui',
    icon: 'mdi-clock-alert',
    color: 'error',
    createTask: true
  },
  {
    value: 'after_expiry',
    label: 'Après expiration',
    description: 'Le devis est expiré - Proposer un renouvellement',
    icon: 'mdi-alert-circle',
    color: 'error',
    createTask: true
  }
]

// Computed
const selectedReminderTypeDescription = computed(() => {
  const type = reminderTypes.find(t => t.value === selectedReminderType.value)
  return type?.description || ''
})

const willCreateTask = computed(() => {
  const type = reminderTypes.find(t => t.value === selectedReminderType.value)
  return type?.createTask || false
})

// Methods
function getUrgencyColor(days: number): string {
  if (days < 0) return 'error'
  if (days === 0) return 'error'
  if (days <= 3) return 'warning'
  return 'info'
}

function getExpiryLabel(days: number): string {
  if (days < 0) return `Expiré il y a ${Math.abs(days)}j`
  if (days === 0) return 'Expire aujourd\'hui'
  if (days === 1) return 'Expire demain'
  return `Expire dans ${days}j`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

async function sendReminder() {
  if (!props.quote || !selectedReminderType.value) return

  sending.value = true
  error.value = ''
  success.value = false

  try {
    await quoteRemindersApi.sendQuoteReminder(props.quote.id, {
      reminderType: selectedReminderType.value,
      message: customMessage.value || undefined
    })

    success.value = true

    // Notify parent and close after 2 seconds
    setTimeout(() => {
      emit('reminder-sent')
      close()
    }, SUCCESS_DISPLAY_DURATION_MS)
  } catch (err: any) {
    console.error('Error sending reminder:', err)
    error.value = err.message || 'Une erreur est survenue lors de l\'envoi du rappel'
  } finally {
    sending.value = false
  }
}

function close() {
  emit('update:modelValue', false)
  // Reset form after a short delay to avoid visual glitch
  setTimeout(() => {
    selectedReminderType.value = ''
    customMessage.value = ''
    error.value = ''
    success.value = false
  }, 300)
}

// Auto-select reminder type based on quote urgency
watch(() => props.quote, (newQuote) => {
  if (!newQuote) return

  const days = newQuote.daysUntilExpiry
  if (days < 0) {
    selectedReminderType.value = 'after_expiry'
  } else if (days === 0) {
    selectedReminderType.value = 'day_of'
  } else if (days <= 3) {
    selectedReminderType.value = '3_days_before'
  } else {
    selectedReminderType.value = '7_days_before'
  }
}, { immediate: true })
</script>

<style scoped>
.bg-primary {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
</style>
