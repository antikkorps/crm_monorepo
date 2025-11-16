<template>
  <v-card class="meeting-card" :class="meetingCardClass" variant="elevated">
    <!-- Status indicator -->
    <div class="status-indicator" :class="`status-${meeting.status}`"></div>

    <v-card-text class="meeting-content">
      <!-- Header with status and actions -->
      <div class="meeting-header">
        <div class="meeting-status-section">
          <v-chip
            :color="statusColor"
            :prepend-icon="statusIcon"
            size="small"
            variant="flat"
            class="status-chip"
          >
            {{ statusLabel }}
          </v-chip>
          <div class="meeting-badges">
            <v-chip
              v-if="isToday"
              color="primary"
              size="small"
              variant="outlined"
              class="today-badge"
            >
              <v-icon start>mdi-calendar-today</v-icon>
              Aujourd'hui
            </v-chip>
            <v-chip
              v-else-if="isUpcoming"
              color="info"
              size="small"
              variant="outlined"
              class="upcoming-badge"
            >
              <v-icon start>mdi-clock-outline</v-icon>
              À venir
            </v-chip>
          </div>
        </div>

        <div class="meeting-actions">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            class="action-btn"
            @click="$emit('edit', meeting)"
          >
            <v-tooltip text="Modifier">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-pencil</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-download"
            size="small"
            variant="text"
            color="secondary"
            class="action-btn"
            @click="$emit('export', meeting)"
          >
            <v-tooltip text="Exporter (.ics)">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-download</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-email-send"
            size="small"
            variant="text"
            color="info"
            class="action-btn"
            @click="$emit('send-invitation', meeting)"
          >
            <v-tooltip text="Envoyer invitation">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-email-send</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            class="action-btn"
            @click="$emit('delete', meeting)"
          >
            <v-tooltip text="Supprimer">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-delete</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
        </div>
      </div>

      <!-- Title -->
      <div class="meeting-title-section">
        <h3 class="meeting-title">{{ meeting.title }}</h3>
      </div>

      <!-- Description -->
      <div v-if="meeting.description" class="meeting-description-section">
        <p class="meeting-description">{{ meeting.description }}</p>
      </div>

      <!-- Meta information -->
      <div class="meeting-meta-section">
        <!-- Date and Time -->
        <div class="meta-item date-item">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-calendar-clock</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Date et heure</div>
            <div class="meta-value">{{ formatMeetingDate(meeting.startDate, meeting.endDate) }}</div>
          </div>
        </div>

        <!-- Location -->
        <div class="meta-item location-item" v-if="meeting.location">
          <div class="meta-icon">
            <v-icon size="20" color="secondary">mdi-map-marker</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Lieu</div>
            <div class="meta-value">{{ meeting.location }}</div>
          </div>
        </div>

        <!-- Organizer -->
        <div class="meta-item organizer-item" v-if="meeting.organizer">
          <div class="meta-icon">
            <v-avatar
              :image="getAvatarUrl(meeting.organizer.id)"
              :alt="getInitials(meeting.organizer.firstName, meeting.organizer.lastName)"
              size="28"
              class="organizer-avatar"
            >
              <span class="avatar-text">{{ getInitials(meeting.organizer.firstName, meeting.organizer.lastName) }}</span>
            </v-avatar>
          </div>
          <div class="meta-content">
            <div class="meta-label">Organisateur</div>
            <div class="meta-value">{{ meeting.organizer.firstName }} {{ meeting.organizer.lastName }}</div>
          </div>
        </div>

        <!-- Institution -->
        <div class="meta-item institution-item" v-if="meeting.institution">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-office-building</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Institution</div>
            <div class="meta-value">{{ meeting.institution.name }}</div>
          </div>
        </div>

        <!-- Participants -->
        <div class="meta-item participants-item" v-if="meeting.participants && meeting.participants.length > 0">
          <div class="meta-icon">
            <v-icon size="20" color="info">mdi-account-group</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Participants</div>
            <div class="meta-value">{{ meeting.participants.length }} participant(s)</div>
          </div>
        </div>
      </div>

      <!-- Status change dropdown -->
      <div class="meeting-footer">
        <v-select
          v-model="localStatus"
          :items="statusOptions"
          item-title="label"
          item-value="value"
          @update:modelValue="onStatusChange"
          class="status-dropdown"
          density="compact"
          variant="outlined"
          hide-details
          :placeholder="`Changer le statut (${statusLabel})`"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Meeting, MeetingStatus } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"

interface Props {
  meeting: Meeting
}

interface Emits {
  (e: "edit", meeting: Meeting): void
  (e: "delete", meeting: Meeting): void
  (e: "export", meeting: Meeting): void
  (e: "send-invitation", meeting: Meeting): void
  (e: "status-change", meeting: Meeting, newStatus: MeetingStatus): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localStatus = ref(props.meeting.status)

watch(
  () => props.meeting.status,
  (newStatus) => {
    localStatus.value = newStatus
  }
)

const statusOptions = [
  { label: "Planifiée", value: "scheduled" },
  { label: "En cours", value: "in_progress" },
  { label: "Terminée", value: "completed" },
  { label: "Annulée", value: "cancelled" },
]

const statusLabel = computed(() => {
  const labels = {
    scheduled: "Planifiée",
    in_progress: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
  }
  return labels[props.meeting.status]
})

const statusColor = computed(() => {
  const colors = {
    scheduled: "info",
    in_progress: "primary",
    completed: "success",
    cancelled: "error",
  }
  return colors[props.meeting.status]
})

const statusIcon = computed(() => {
  const icons = {
    scheduled: "mdi-calendar-clock",
    in_progress: "mdi-play-circle",
    completed: "mdi-check-circle",
    cancelled: "mdi-close-circle",
  }
  return icons[props.meeting.status]
})

const meetingCardClass = computed(() => {
  const classes = [`meeting-status-${props.meeting.status}`]

  if (isToday.value) {
    classes.push("meeting-today")
  } else if (isUpcoming.value) {
    classes.push("meeting-upcoming")
  }

  return classes
})

const isToday = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const startDate = new Date(props.meeting.startDate)
  return startDate >= today && startDate < tomorrow
})

const isUpcoming = computed(() => {
  const now = new Date()
  const startDate = new Date(props.meeting.startDate)
  return startDate > now && props.meeting.status === "scheduled" && !isToday.value
})

const formatMeetingDate = (startDate: Date | string, endDate: Date | string) => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const dateStr = start.toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const startTimeStr = start.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const endTimeStr = end.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return `${dateStr} • ${startTimeStr} - ${endTimeStr}`
}

const getAvatarUrl = (userId: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const onStatusChange = () => {
  emit("status-change", props.meeting, localStatus.value)
}
</script>

<style scoped>
.meeting-card {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.meeting-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.12);
}

/* Status indicator */
.status-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #e0e0e0;
  transition: background-color 0.3s ease;
}

.status-scheduled {
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
}

.status-in_progress {
  background: linear-gradient(180deg, #8b5cf6 0%, #6d28d9 100%);
}

.status-completed {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}

.status-cancelled {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.meeting-content {
  padding: 1.5rem;
  padding-left: 2rem; /* Account for status indicator */
}

.meeting-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.meeting-status-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.status-chip {
  align-self: flex-start;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meeting-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.today-badge,
.upcoming-badge {
  font-size: 0.75rem;
  height: 24px;
}

.meeting-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.meeting-card:hover .meeting-actions {
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

.meeting-title-section {
  margin-bottom: 1rem;
}

.meeting-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meeting-description-section {
  margin-bottom: 1.25rem;
}

.meeting-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meeting-meta-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
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

.organizer-avatar {
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

.meeting-footer {
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.status-dropdown {
  max-width: 250px;
}

.status-dropdown :deep(.v-field) {
  background: #f9fafb;
  border-radius: 8px;
}

.status-dropdown :deep(.v-field:hover) {
  background: #f3f4f6;
}

/* Meeting card status styling */
.meeting-status-scheduled {
  /* Default blue styling */
}

.meeting-status-in_progress {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(109, 40, 217, 0.03) 100%);
}

.meeting-status-completed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%);
}

.meeting-status-cancelled {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(220, 38, 38, 0.03) 100%);
}

.meeting-today {
  border-color: rgba(59, 130, 246, 0.3);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.03) 100%);
}

.meeting-upcoming {
  border-color: rgba(59, 130, 246, 0.2);
}

/* Responsive design */
@media (max-width: 768px) {
  .meeting-content {
    padding: 1rem;
    padding-left: 1.5rem;
  }

  .meeting-title {
    font-size: 1.1rem;
  }

  .meeting-meta-section {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .meta-item {
    padding: 0.625rem;
  }

  .meeting-header {
    margin-bottom: 0.75rem;
  }

  .meeting-actions {
    opacity: 1; /* Always show on mobile */
  }

  .status-dropdown {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .meeting-content {
    padding: 0.875rem;
    padding-left: 1.25rem;
  }

  .meeting-title-section {
    margin-bottom: 0.75rem;
  }

  .meeting-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .meeting-description {
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
