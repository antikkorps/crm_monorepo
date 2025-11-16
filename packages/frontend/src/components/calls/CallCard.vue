<template>
  <v-card class="call-card" :class="callCardClass" variant="elevated">
    <!-- Status indicator -->
    <div class="status-indicator" :class="`status-${call.callType}`"></div>

    <v-card-text class="call-content">
      <!-- Header with type and actions -->
      <div class="call-header">
        <div class="call-type-section">
          <v-chip
            :color="typeColor"
            :prepend-icon="typeIcon"
            size="small"
            variant="flat"
            class="type-chip"
          >
            {{ typeLabel }}
          </v-chip>
        </div>

        <div class="call-actions">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            class="action-btn"
            @click="$emit('edit', call)"
          >
            <v-tooltip text="Modifier">
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
            @click="$emit('delete', call)"
          >
            <v-tooltip text="Supprimer">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-delete</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
        </div>
      </div>

      <!-- Phone Number -->
      <div class="call-phone-section">
        <h3 class="call-phone">{{ call.phoneNumber }}</h3>
      </div>

      <!-- Duration -->
      <div v-if="call.duration !== undefined && call.duration !== null" class="call-duration-section">
        <div class="duration-display">
          <v-icon size="18" color="primary">mdi-clock-outline</v-icon>
          <span class="duration-text">{{ formatDuration(call.duration) }}</span>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="call.summary" class="call-summary-section">
        <p class="call-summary">{{ call.summary }}</p>
      </div>

      <!-- Meta information -->
      <div class="call-meta-section">
        <!-- Date and Time -->
        <div class="meta-item date-item">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-calendar-clock</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Date</div>
            <div class="meta-value">{{ formatDate(call.createdAt) }}</div>
          </div>
        </div>

        <!-- User -->
        <div class="meta-item user-item" v-if="call.user">
          <div class="meta-icon">
            <v-avatar
              :image="getAvatarUrl(call.user.id)"
              :alt="getInitials(call.user.firstName, call.user.lastName)"
              size="28"
              class="user-avatar"
            >
              <span class="avatar-text">{{ getInitials(call.user.firstName, call.user.lastName) }}</span>
            </v-avatar>
          </div>
          <div class="meta-content">
            <div class="meta-label">Utilisateur</div>
            <div class="meta-value">{{ call.user.firstName }} {{ call.user.lastName }}</div>
          </div>
        </div>

        <!-- Institution -->
        <div class="meta-item institution-item" v-if="call.institution">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-office-building</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Institution</div>
            <div class="meta-value">{{ call.institution.name }}</div>
          </div>
        </div>

        <!-- Contact Person -->
        <div class="meta-item contact-item" v-if="call.contactPerson">
          <div class="meta-icon">
            <v-icon size="20" color="info">mdi-account</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Contact</div>
            <div class="meta-value">{{ call.contactPerson.firstName }} {{ call.contactPerson.lastName }}</div>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Call } from "@medical-crm/shared"
import { computed } from "vue"

interface Props {
  call: Call
}

interface Emits {
  (e: "edit", call: Call): void
  (e: "delete", call: Call): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const typeLabel = computed(() => {
  const labels = {
    incoming: "Entrant",
    outgoing: "Sortant",
    missed: "Manqué",
  }
  return labels[props.call.callType]
})

const typeColor = computed(() => {
  const colors = {
    incoming: "success",
    outgoing: "info",
    missed: "error",
  }
  return colors[props.call.callType]
})

const typeIcon = computed(() => {
  const icons = {
    incoming: "mdi-phone-incoming",
    outgoing: "mdi-phone-outgoing",
    missed: "mdi-phone-missed",
  }
  return icons[props.call.callType]
})

const callCardClass = computed(() => {
  return [`call-type-${props.call.callType}`]
})

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${remainingSeconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

const formatDate = (date: Date | string): string => {
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

  return `${dateStr} • ${timeStr}`
}

const getAvatarUrl = (userId: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}
</script>

<style scoped>
.call-card {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.call-card:hover {
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

.status-incoming {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}

.status-outgoing {
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
}

.status-missed {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.call-content {
  padding: 1.5rem;
  padding-left: 2rem; /* Account for status indicator */
}

.call-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.call-type-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.type-chip {
  align-self: flex-start;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.call-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.call-card:hover .call-actions {
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

.call-phone-section {
  margin-bottom: 1rem;
}

.call-phone {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.call-duration-section {
  margin-bottom: 1rem;
}

.duration-display {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.duration-text {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}

.call-summary-section {
  margin-bottom: 1.25rem;
}

.call-summary {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.call-meta-section {
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

/* Call card type styling */
.call-type-incoming {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%);
}

.call-type-outgoing {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, rgba(37, 99, 235, 0.03) 100%);
}

.call-type-missed {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(220, 38, 38, 0.03) 100%);
}

/* Responsive design */
@media (max-width: 768px) {
  .call-content {
    padding: 1rem;
    padding-left: 1.5rem;
  }

  .call-phone {
    font-size: 1.1rem;
  }

  .call-meta-section {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .meta-item {
    padding: 0.625rem;
  }

  .call-header {
    margin-bottom: 0.75rem;
  }

  .call-actions {
    opacity: 1; /* Always show on mobile */
  }
}

@media (max-width: 480px) {
  .call-content {
    padding: 0.875rem;
    padding-left: 1.25rem;
  }

  .call-phone-section {
    margin-bottom: 0.75rem;
  }

  .call-phone {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .call-summary {
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

  .duration-display {
    padding: 0.375rem 0.75rem;
  }

  .duration-text {
    font-size: 0.85rem;
  }
}
</style>
