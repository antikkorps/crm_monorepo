<template>
  <v-card class="note-card" variant="elevated">
    <!-- Status indicator -->
    <div class="status-indicator" :class="statusClass"></div>

    <v-card-text class="note-content">
      <!-- Header with privacy and actions -->
      <div class="note-header">
        <div class="note-badges">
          <v-chip
            v-if="note.isPrivate"
            color="error"
            size="small"
            variant="flat"
            prepend-icon="mdi-lock"
            class="privacy-chip"
          >
            Privée
          </v-chip>
          <v-chip
            v-if="shareCount > 0"
            color="primary"
            size="small"
            variant="flat"
            prepend-icon="mdi-share-variant"
            class="share-chip"
          >
            {{ shareCount }} partage{{ shareCount > 1 ? 's' : '' }}
          </v-chip>
        </div>

        <div class="note-actions">
          <v-btn
            icon="mdi-share-variant"
            size="small"
            variant="text"
            color="primary"
            class="action-btn"
            @click="$emit('share', note)"
          >
            <v-tooltip text="Partager">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-share-variant</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            class="action-btn"
            @click="$emit('edit', note)"
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
            @click="$emit('delete', note)"
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
      <div class="note-title-section">
        <h3 class="note-title">{{ note.title }}</h3>
      </div>

      <!-- Content Preview -->
      <div class="note-preview-section">
        <p class="note-preview">{{ truncatedContent }}</p>
      </div>

      <!-- Tags -->
      <div v-if="note.tags && note.tags.length > 0" class="note-tags-section">
        <v-chip
          v-for="tag in note.tags"
          :key="tag"
          size="small"
          variant="outlined"
          :color="getTagColor(tag)"
          class="tag-chip"
        >
          {{ tag }}
        </v-chip>
      </div>

      <!-- Meta information -->
      <div class="note-meta-section">
        <!-- Creator -->
        <div class="meta-item creator-item" v-if="note.creator">
          <div class="meta-icon">
            <v-avatar
              :image="getAvatarUrl(note.creator.id)"
              :alt="getInitials(note.creator.firstName, note.creator.lastName)"
              size="28"
              class="user-avatar"
            >
              <span class="avatar-text">{{ getInitials(note.creator.firstName, note.creator.lastName) }}</span>
            </v-avatar>
          </div>
          <div class="meta-content">
            <div class="meta-label">Créateur</div>
            <div class="meta-value">{{ note.creator.firstName }} {{ note.creator.lastName }}</div>
          </div>
        </div>

        <!-- Institution -->
        <div class="meta-item institution-item" v-if="note.institution">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-office-building</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Institution</div>
            <div class="meta-value">{{ note.institution.name }}</div>
          </div>
        </div>

        <!-- Date -->
        <div class="meta-item date-item">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-calendar-clock</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">Date</div>
            <div class="meta-value">{{ formatDate(note.createdAt) }}</div>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Note } from "@medical-crm/shared"
import { computed } from "vue"

interface Props {
  note: Note
}

interface Emits {
  (e: "edit", note: Note): void
  (e: "delete", note: Note): void
  (e: "share", note: Note): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const shareCount = computed(() => {
  return props.note.shares?.length || 0
})

const statusClass = computed(() => {
  if (props.note.isPrivate) {
    return "status-private"
  } else if (shareCount.value > 0) {
    return "status-shared"
  }
  return "status-normal"
})

const truncatedContent = computed(() => {
  const maxLength = 150
  if (props.note.content.length <= maxLength) {
    return props.note.content
  }
  return props.note.content.substring(0, maxLength) + "..."
})

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

const getTagColor = (tag: string): string => {
  // Simple hash function to generate consistent colors for tags
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colors = ["primary", "secondary", "success", "info", "warning", "purple", "pink", "indigo"]
  return colors[Math.abs(hash) % colors.length]
}
</script>

<style scoped>
.note-card {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.note-card:hover {
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

.status-private {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.status-shared {
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
}

.status-normal {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}

.note-content {
  padding: 1.5rem;
  padding-left: 2rem; /* Account for status indicator */
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.note-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex: 1;
}

.privacy-chip,
.share-chip {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.note-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.note-card:hover .note-actions {
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

.note-title-section {
  margin-bottom: 1rem;
}

.note-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}

.note-preview-section {
  margin-bottom: 1rem;
}

.note-preview {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.note-tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag-chip {
  font-size: 0.75rem;
  font-weight: 500;
}

.note-meta-section {
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
  .note-content {
    padding: 1rem;
    padding-left: 1.5rem;
  }

  .note-title {
    font-size: 1.1rem;
  }

  .note-meta-section {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .meta-item {
    padding: 0.625rem;
  }

  .note-header {
    margin-bottom: 0.75rem;
  }

  .note-actions {
    opacity: 1; /* Always show on mobile */
  }
}

@media (max-width: 480px) {
  .note-content {
    padding: 0.875rem;
    padding-left: 1.25rem;
  }

  .note-title-section {
    margin-bottom: 0.75rem;
  }

  .note-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .note-preview {
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
