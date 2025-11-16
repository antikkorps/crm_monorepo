<template>
  <v-card class="reminder-card" variant="elevated" :class="cardClass">
    <!-- Status indicator -->
    <div class="status-indicator" :class="statusIndicatorClass"></div>

    <v-card-text class="reminder-content">
      <!-- Header with priority and actions -->
      <div class="reminder-header">
        <div class="reminder-badges">
          <v-chip
            :color="priorityColor"
            size="small"
            variant="flat"
            :prepend-icon="priorityIcon"
            class="priority-chip"
          >
            {{ priorityLabel }}
          </v-chip>
          <v-chip
            v-if="isOverdue"
            color="error"
            size="small"
            variant="flat"
            prepend-icon="mdi-alert-circle"
            class="overdue-chip"
          >
            En retard
          </v-chip>
          <v-chip
            v-if="isCompleted"
            color="success"
            size="small"
            variant="flat"
            prepend-icon="mdi-check-circle"
            class="completed-chip"
          >
            Terminé
          </v-chip>
          <v-chip
            v-if="reminder.recurring"
            color="info"
            size="small"
            variant="outlined"
            prepend-icon="mdi-repeat"
            class="recurring-chip"
          >
            Récurrent
          </v-chip>
        </div>

        <div class="reminder-actions">
          <v-btn
            v-if="!isCompleted && !isCancelled"
            icon="mdi-check"
            size="small"
            variant="text"
            color="success"
            class="action-btn"
            @click="$emit('complete', reminder)"
          >
            <v-tooltip :text="t('actions.finish')">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-check</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            class="action-btn"
            @click="$emit('edit', reminder)"
          >
            <v-tooltip :text="$t('actions.edit')">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-pencil</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            class="action-btn"
            @click="$emit('delete', reminder)"
          >
            <v-tooltip :text="$t('actions.delete')">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-delete</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
        </div>
      </div>

      <!-- Title -->
      <div class="reminder-title-section">
        <h3 class="reminder-title">{{ reminder.title }}</h3>
      </div>

      <!-- Description Preview -->
      <div v-if="reminder.description" class="reminder-description-section">
        <p class="reminder-description">{{ truncatedDescription }}</p>
      </div>

      <!-- Date and Time -->
      <div class="reminder-date-section">
        <v-chip
          :color="dateChipColor"
          size="small"
          variant="tonal"
          prepend-icon="mdi-calendar-clock"
          class="date-chip"
        >
          {{ formatReminderDate(reminder.reminderDate) }} - {{ timeRemaining }}
        </v-chip>
      </div>

      <!-- Meta information -->
      <div class="reminder-meta-section">
        <!-- User -->
        <div class="meta-item user-item" v-if="reminder.user">
          <div class="meta-icon">
            <v-avatar
              :image="getAvatarUrl(reminder.user.id)"
              :alt="getInitials(reminder.user.firstName, reminder.user.lastName)"
              size="28"
              class="user-avatar"
            >
              <span class="avatar-text">{{ getInitials(reminder.user.firstName, reminder.user.lastName) }}</span>
            </v-avatar>
          </div>
          <div class="meta-content">
            <div class="meta-label">{{ $t('labels.creator').toUpperCase() }}</div>
            <div class="meta-value">{{ reminder.user.firstName }} {{ reminder.user.lastName }}</div>
          </div>
        </div>

        <!-- Institution -->
        <div class="meta-item institution-item" v-if="reminder.institution">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-office-building</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">{{ $t('labels.category').toUpperCase() }}</div>
            <div class="meta-value">{{ reminder.institution.name }}</div>
          </div>
        </div>

        <!-- Contact Person -->
        <div class="meta-item contact-item" v-if="reminder.contactPerson">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-account</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">{{ $t('labels.name').toUpperCase() }}</div>
            <div class="meta-value">{{ reminder.contactPerson.firstName }} {{ reminder.contactPerson.lastName }}</div>
          </div>
        </div>

        <!-- Recurring Info -->
        <div class="meta-item recurring-item" v-if="reminder.recurring">
          <div class="meta-icon">
            <v-icon size="20" color="info">mdi-repeat</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">{{ $t('reminders.recurring.title').toUpperCase() }}</div>
            <div class="meta-value">{{ recurringLabel }}</div>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Reminder } from "@medical-crm/shared"
import { computed } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  reminder: Reminder
}

interface Emits {
  (e: "edit", reminder: Reminder): void
  (e: "delete", reminder: Reminder): void
  (e: "complete", reminder: Reminder): void
}

const { t } = useI18n()

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isOverdue = computed(() => {
  return (
    props.reminder.status === "pending" &&
    new Date(props.reminder.reminderDate) < new Date()
  )
})

const isCompleted = computed(() => {
  return props.reminder.status === "completed"
})

const isCancelled = computed(() => {
  return props.reminder.status === "cancelled"
})

const priorityColor = computed(() => {
  switch (props.reminder.priority) {
    case "low":
      return "blue"
    case "medium":
      return "orange"
    case "high":
      return "red"
    case "urgent":
      return "purple"
    default:
      return "grey"
  }
})

const priorityIcon = computed(() => {
  switch (props.reminder.priority) {
    case "urgent":
      return "mdi-alert-octagon"
    case "high":
      return "mdi-alert"
    case "medium":
      return "mdi-alert-circle-outline"
    case "low":
      return "mdi-information-outline"
    default:
      return "mdi-flag"
  }
})

const priorityLabel = computed(() => {
  switch (props.reminder.priority) {
    case "low":
      return t('reminders.priority.low')
    case "medium":
      return t('reminders.priority.medium')
    case "high":
      return t('reminders.priority.high')
    case "urgent":
      return t('reminders.priority.urgent')
    default:
      return "Unknown"
  }
})

const statusIndicatorClass = computed(() => {
  if (isCompleted.value) return "status-completed"
  if (isCancelled.value) return "status-cancelled"
  if (isOverdue.value) return "status-overdue"
  return `status-${props.reminder.priority}`
})

const cardClass = computed(() => {
  if (isOverdue.value) return "card-overdue"
  if (isCompleted.value) return "card-completed"
  return ""
})

const dateChipColor = computed(() => {
  if (isCompleted.value) return "success"
  if (isOverdue.value) return "error"
  return "primary"
})

const truncatedDescription = computed(() => {
  if (!props.reminder.description) return ""
  const maxLength = 150
  if (props.reminder.description.length <= maxLength) {
    return props.reminder.description
  }
  return props.reminder.description.substring(0, maxLength) + "..."
})

const timeRemaining = computed(() => {
  const now = new Date()
  const reminderDate = new Date(props.reminder.reminderDate)
  const diff = reminderDate.getTime() - now.getTime()

  if (isCompleted.value) return t('reminders.status.completed')
  if (isCancelled.value) return t('reminders.status.cancelled')

  if (diff < 0) {
    const absDiff = Math.abs(diff)
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `Il y a ${days}j`
    if (hours > 0) return `Il y a ${hours}h`
    return `Il y a ${minutes}m`
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `Dans ${days}j`
  if (hours > 0) return `Dans ${hours}h`
  return `Dans ${minutes}m`
})

const recurringLabel = computed(() => {
  if (!props.reminder.recurring) return ""

  const frequencyMap = {
    daily: t('reminders.recurring.frequencies.daily'),
    weekly: t('reminders.recurring.frequencies.weekly'),
    monthly: t('reminders.recurring.frequencies.monthly'),
  }

  const frequency = frequencyMap[props.reminder.recurring.frequency] || props.reminder.recurring.frequency

  if (props.reminder.recurring.endDate) {
    return `${frequency} (${t('time.thisMonth')} ${formatReminderDate(props.reminder.recurring.endDate)})`
  }

  return frequency
})

const formatReminderDate = (date: Date | string): string => {
  const d = new Date(date)

  const dateStr = d.toLocaleDateString("fr-FR", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const timeStr = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return `${dateStr} ${timeStr}`
}

const getAvatarUrl = (userId: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}
</script>

<style scoped>
.reminder-card {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.reminder-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.12);
}

.card-overdue {
  border-left: 4px solid #ef4444;
}

.card-completed {
  opacity: 0.8;
}

/* Status indicator */
.status-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  transition: background-color 0.3s ease;
}

.status-low {
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
}

.status-medium {
  background: linear-gradient(180deg, #f97316 0%, #ea580c 100%);
}

.status-high {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.status-urgent {
  background: linear-gradient(180deg, #a855f7 0%, #9333ea 100%);
}

.status-completed {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}

.status-cancelled {
  background: linear-gradient(180deg, #6b7280 0%, #4b5563 100%);
}

.status-overdue {
  background: linear-gradient(180deg, #dc2626 0%, #991b1b 100%);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.reminder-content {
  padding: 1.5rem;
  padding-left: 2rem; /* Account for status indicator */
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.reminder-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex: 1;
}

.priority-chip,
.overdue-chip,
.completed-chip,
.recurring-chip {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reminder-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.reminder-card:hover .reminder-actions {
  opacity: 1;
}

.action-btn {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.04);
  transform: scale(1.1);
}

.reminder-title-section {
  margin-bottom: 1rem;
}

.reminder-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.reminder-description-section {
  margin-bottom: 1rem;
}

.reminder-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.reminder-date-section {
  margin-bottom: 1rem;
}

.date-chip {
  font-weight: 500;
}

.reminder-meta-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  transition: all 0.2s ease;
}

.meta-item:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.meta-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e5e7eb;
}

.user-avatar {
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.avatar-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.meta-content {
  flex: 1;
  min-width: 0;
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.meta-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Responsive design */
@media (max-width: 768px) {
  .reminder-content {
    padding: 1rem;
    padding-left: 1.5rem;
  }

  .reminder-title {
    font-size: 1.1rem;
  }

  .reminder-meta-section {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .meta-item {
    padding: 0.625rem;
  }

  .reminder-header {
    margin-bottom: 0.75rem;
  }

  .reminder-actions {
    opacity: 1; /* Always show on mobile */
  }
}

@media (max-width: 480px) {
  .reminder-content {
    padding: 0.875rem;
    padding-left: 1.25rem;
  }

  .reminder-title-section {
    margin-bottom: 0.75rem;
  }

  .reminder-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .reminder-description {
    font-size: 0.85rem;
  }

  .meta-item {
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .meta-icon {
    width: 32px;
    height: 32px;
  }

  .meta-value {
    font-size: 0.8rem;
  }
}
</style>
