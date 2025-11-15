<template>
  <div class="d-inline-flex align-center">
    <v-tooltip :text="tooltipText" location="top">
      <template v-slot:activator="{ props }">
        <v-chip
          v-bind="props"
          :color="urgencyColor"
          :variant="variant"
          :size="size"
          :prepend-icon="urgencyIcon"
          class="quote-expiry-badge"
        >
          <template v-if="showDate">
            {{ formattedDate }}
          </template>
          <template v-else>
            {{ urgencyLabel }}
          </template>
        </v-chip>
      </template>
    </v-tooltip>

    <!-- Pulsing indicator for critical quotes -->
    <span
      v-if="isCritical"
      class="ml-1 pulse-indicator"
      :style="{ backgroundColor: urgencyColor }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  validUntil: string | Date
  status: string
  daysUntilExpiry?: number | null
  size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large'
  showDate?: boolean
  variant?: 'flat' | 'text' | 'elevated' | 'tonal' | 'outlined' | 'plain'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  showDate: false,
  variant: 'tonal'
})

// Computed
const daysRemaining = computed(() => {
  if (props.daysUntilExpiry !== undefined && props.daysUntilExpiry !== null) {
    return props.daysUntilExpiry
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const validDate = new Date(props.validUntil)
  validDate.setHours(0, 0, 0, 0)

  const diffTime = validDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
})

const isExpired = computed(() => {
  return daysRemaining.value < 0
})

const isCritical = computed(() => {
  return daysRemaining.value === 0 || isExpired.value
})

const urgencyColor = computed(() => {
  // Don't show urgency for accepted, rejected, or cancelled quotes
  if (['accepted', 'rejected', 'cancelled', 'ordered'].includes(props.status.toLowerCase())) {
    return 'grey'
  }

  if (isExpired.value) return 'error'
  if (daysRemaining.value === 0) return 'error'
  if (daysRemaining.value <= 3) return 'warning'
  if (daysRemaining.value <= 7) return 'info'
  return 'success'
})

const urgencyIcon = computed(() => {
  if (['accepted', 'rejected', 'cancelled', 'ordered'].includes(props.status.toLowerCase())) {
    return 'mdi-calendar-check'
  }

  if (isExpired.value) return 'mdi-alert-circle'
  if (daysRemaining.value === 0) return 'mdi-clock-alert'
  if (daysRemaining.value <= 3) return 'mdi-clock-fast'
  if (daysRemaining.value <= 7) return 'mdi-clock-outline'
  return 'mdi-calendar'
})

const urgencyLabel = computed(() => {
  if (['accepted', 'rejected', 'cancelled', 'ordered'].includes(props.status.toLowerCase())) {
    return formattedDate.value
  }

  if (isExpired.value) {
    const days = Math.abs(daysRemaining.value)
    return `Expiré (-${days}j)`
  }
  if (daysRemaining.value === 0) return 'Aujourd\'hui'
  if (daysRemaining.value === 1) return 'Demain'
  if (daysRemaining.value <= 7) return `${daysRemaining.value} jours`
  return formattedDate.value
})

const tooltipText = computed(() => {
  const dateStr = formattedDate.value

  if (['accepted', 'rejected', 'cancelled', 'ordered'].includes(props.status.toLowerCase())) {
    return `Validité : ${dateStr}`
  }

  if (isExpired.value) {
    const days = Math.abs(daysRemaining.value)
    return `⚠️ Expiré depuis ${days} jour${days > 1 ? 's' : ''} (${dateStr})`
  }
  if (daysRemaining.value === 0) return `🔥 Expire aujourd'hui (${dateStr})`
  if (daysRemaining.value === 1) return `⚡ Expire demain (${dateStr})`
  if (daysRemaining.value <= 3) return `⏰ Expire dans ${daysRemaining.value} jours (${dateStr})`
  if (daysRemaining.value <= 7) return `📅 Expire dans ${daysRemaining.value} jours (${dateStr})`
  return `Valide jusqu'au ${dateStr}`
})

const formattedDate = computed(() => {
  const date = new Date(props.validUntil)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
})
</script>

<style scoped>
.quote-expiry-badge {
  font-weight: 500;
}

.pulse-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
  display: inline-block;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-error), 0.7);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(var(--v-theme-error), 0);
    opacity: 0.7;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(var(--v-theme-error), 0);
    opacity: 1;
  }
}
</style>
