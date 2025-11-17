<template>
  <div class="timeline-tab">
    <!-- Filters and Search -->
    <v-card class="mb-4" elevation="0" variant="outlined">
      <v-card-text>
        <v-row align="center">
          <v-col cols="12" md="6">
            <v-text-field
              v-model="searchQuery"
              density="compact"
              prepend-inner-icon="mdi-magnify"
              placeholder="Rechercher dans la timeline..."
              variant="outlined"
              hide-details
              clearable
              @update:model-value="debouncedSearch"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-chip-group
              v-model="selectedTypes"
              multiple
              selected-class="text-primary"
              column
            >
              <v-chip filter variant="outlined" value="all" size="small">
                <v-icon start>mdi-all-inclusive</v-icon>
                Tout
              </v-chip>
              <v-chip filter variant="outlined" value="meeting" size="small">
                <v-icon start>mdi-calendar-account</v-icon>
                Réunions
              </v-chip>
              <v-chip filter variant="outlined" value="call" size="small">
                <v-icon start>mdi-phone</v-icon>
                Appels
              </v-chip>
              <v-chip filter variant="outlined" value="note" size="small">
                <v-icon start>mdi-note-text</v-icon>
                Notes
              </v-chip>
              <v-chip filter variant="outlined" value="reminder" size="small">
                <v-icon start>mdi-bell-alert</v-icon>
                Rappels
              </v-chip>
              <v-chip filter variant="outlined" value="task" size="small">
                <v-icon start>mdi-checkbox-marked-circle-outline</v-icon>
                Tâches
              </v-chip>
            </v-chip-group>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Timeline Items -->
    <div v-if="error" class="text-center py-12">
      <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
      <p class="text-h6 mt-4">{{ error }}</p>
      <v-btn prepend-icon="mdi-refresh" @click="loadTimeline(true)" class="mt-4">Réessayer</v-btn>
    </div>

    <div v-else-if="filteredItems.length === 0 && !loading">
      <v-card elevation="0" variant="outlined">
        <v-card-text class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2">mdi-timeline-clock-outline</v-icon>
          <p class="text-h6 mt-4">Aucune activité</p>
          <p class="text-medium-emphasis">Aucune activité trouvée pour les filtres sélectionnés</p>
        </v-card-text>
      </v-card>
    </div>

    <v-timeline v-else side="end" truncate-line="both">
      <v-timeline-item
        v-for="item in filteredItems"
        :key="`${item.type}-${item.id}`"
        :dot-color="getItemColor(item.type)"
        size="small"
      >
        <template v-slot:icon>
          <v-icon size="small">{{ getItemIcon(item.type) }}</v-icon>
        </template>

        <v-card :class="`timeline-item-${item.type}`" elevation="2">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-chip :color="getItemColor(item.type)" variant="tonal" size="small" class="mr-2">
                {{ getItemLabel(item.type) }}
              </v-chip>
              <span class="text-body-1">{{ item.title }}</span>
            </div>
            <v-chip size="x-small" variant="text">
              {{ formatRelativeTime(item.createdAt) }}
            </v-chip>
          </v-card-title>

          <v-card-text>
            <div v-if="item.description" class="text-body-2 mb-3">
              {{ item.description }}
            </div>

            <div class="d-flex flex-wrap ga-2 mb-2">
              <!-- User info -->
              <v-chip v-if="item.user" size="small" variant="tonal" prepend-icon="mdi-account-outline">
                {{ item.user.firstName }} {{ item.user.lastName }}
              </v-chip>

              <!-- Assignee info for tasks -->
              <v-chip v-if="item.assignee" size="small" variant="tonal" color="secondary" prepend-icon="mdi-account-check">
                Assigné: {{ item.assignee.firstName }} {{ item.assignee.lastName }}
              </v-chip>

              <!-- Type-specific metadata -->
              <template v-if="item.type === 'meeting'">
                <v-chip v-if="item.metadata.startDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ formatDateTime(item.metadata.startDate) }}
                </v-chip>
                <v-chip v-if="item.metadata.location" size="small" variant="outlined" prepend-icon="mdi-map-marker">
                  {{ item.metadata.location }}
                </v-chip>
                <v-chip v-if="item.metadata.status" size="small" :color="getMeetingStatusColor(item.metadata.status)" variant="tonal">
                  {{ formatMeetingStatus(item.metadata.status) }}
                </v-chip>
              </template>

              <template v-if="item.type === 'call'">
                <v-chip v-if="item.metadata.phoneNumber" size="small" variant="outlined" prepend-icon="mdi-phone">
                  {{ item.metadata.phoneNumber }}
                </v-chip>
                <v-chip v-if="item.metadata.duration" size="small" variant="outlined" prepend-icon="mdi-clock-outline">
                  {{ formatDuration(item.metadata.duration) }}
                </v-chip>
                <v-chip v-if="item.metadata.callType" size="small" :color="getCallTypeColor(item.metadata.callType)" variant="tonal">
                  {{ formatCallType(item.metadata.callType) }}
                </v-chip>
              </template>

              <template v-if="item.type === 'reminder'">
                <v-chip v-if="item.metadata.dueDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  {{ formatDateTime(item.metadata.dueDate) }}
                </v-chip>
                <v-chip v-if="item.metadata.priority" size="small" :color="getPriorityColor(item.metadata.priority)" variant="tonal">
                  {{ formatPriority(item.metadata.priority) }}
                </v-chip>
                <v-chip v-if="item.metadata.isCompleted" size="small" color="success" variant="tonal" prepend-icon="mdi-check">
                  Complété
                </v-chip>
              </template>

              <template v-if="item.type === 'task'">
                <v-chip v-if="item.metadata.status" size="small" :color="getTaskStatusColor(item.metadata.status)" variant="tonal">
                  {{ formatTaskStatus(item.metadata.status) }}
                </v-chip>
                <v-chip v-if="item.metadata.priority" size="small" :color="getPriorityColor(item.metadata.priority)" variant="tonal">
                  {{ formatPriority(item.metadata.priority) }}
                </v-chip>
                <v-chip v-if="item.metadata.dueDate" size="small" variant="outlined" prepend-icon="mdi-calendar-clock">
                  Échéance: {{ formatDate(item.metadata.dueDate) }}
                </v-chip>
              </template>

              <template v-if="item.type === 'note'">
                <v-chip v-if="item.metadata.isPrivate" size="small" color="error" variant="tonal" prepend-icon="mdi-lock">
                  Privé
                </v-chip>
                <v-chip v-if="item.metadata.tags && item.metadata.tags.length" size="small" variant="outlined" prepend-icon="mdi-tag">
                  {{ item.metadata.tags.join(", ") }}
                </v-chip>
              </template>
            </div>

            <div class="text-caption text-medium-emphasis">
              <v-icon size="x-small" class="mr-1">mdi-clock-outline</v-icon>
              {{ formatDateTime(item.createdAt) }}
            </div>
          </v-card-text>
        </v-card>
      </v-timeline-item>

      <!-- Intersection observer for infinite scroll -->
      <v-timeline-item v-if="hasMore && !loading">
        <v-card v-intersect="onIntersect" elevation="0">
          <v-card-text class="text-center py-4">
            <v-progress-circular indeterminate color="primary" size="24" />
            <p class="text-caption mt-2">Chargement...</p>
          </v-card-text>
        </v-card>
      </v-timeline-item>

      <!-- Loading skeleton -->
      <v-timeline-item v-if="loading" v-for="i in 3" :key="`skeleton-${i}`" dot-color="grey">
        <v-card elevation="2">
          <v-card-title>
            <v-skeleton-loader type="text" width="200" />
          </v-card-title>
          <v-card-text>
            <v-skeleton-loader type="paragraph" />
          </v-card-text>
        </v-card>
      </v-timeline-item>
    </v-timeline>

    <!-- Load more button (fallback) -->
    <div v-if="hasMore && !loading && filteredItems.length > 0" class="text-center mt-4">
      <v-btn variant="outlined" prepend-icon="mdi-refresh" @click="loadMore">
        Charger plus
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { timelineApi } from "@/services/api"
import type { TimelineItem, TimelineItemType } from "@/services/api/timeline"

const props = defineProps<{
  institutionId: string
}>()

// State
const items = ref<TimelineItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const offset = ref(0)
const total = ref(0)
const limit = 50
const searchQuery = ref("")
const selectedTypes = ref<(TimelineItemType | "all")[]>(["all"])

// Computed
const hasMore = computed(() => offset.value + limit < total.value)

const filteredItems = computed(() => {
  let filtered = items.value

  // Filter by type (client-side)
  if (!selectedTypes.value.includes("all")) {
    filtered = filtered.filter((item) =>
      selectedTypes.value.includes(item.type as TimelineItemType)
    )
  }

  // Filter by search query (client-side for loaded items)
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Methods
const loadTimeline = async (reset = false) => {
  if (loading.value) return

  if (reset) {
    items.value = []
    offset.value = 0
    total.value = 0
  }

  loading.value = true
  error.value = null

  try {
    const response = await timelineApi.getInstitutionTimeline(props.institutionId, {
      limit,
      offset: offset.value,
    })

    const data = response.data

    // Check if data and required properties exist
    if (!data || !data.items || !data.pagination) {
      console.warn("Invalid timeline data structure returned from API:", data)
      error.value = "Format de données invalide"
      loading.value = false
      return
    }

    if (reset) {
      items.value = data.items
    } else {
      items.value = [...items.value, ...data.items]
    }

    offset.value = data.pagination.offset + data.pagination.limit
    total.value = data.pagination.total
  } catch (err: any) {
    error.value = err.message || "Impossible de charger la timeline"
    console.error("Failed to load timeline:", err)
  } finally {
    loading.value = false
  }
}

const loadMore = () => {
  if (hasMore.value && !loading.value) {
    loadTimeline()
  }
}

const onIntersect = (isIntersecting: boolean) => {
  if (isIntersecting && hasMore.value && !loading.value) {
    loadMore()
  }
}

// Debounced search
let searchTimeout: number | null = null
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = window.setTimeout(() => {
    // For now, search is client-side on loaded items
    // Could be enhanced to trigger server-side search
  }, 300)
}

// Formatters
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const formatRelativeTime = (date: string): string => {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "À l'instant"
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours} h`
  if (diffDays < 7) return `Il y a ${diffDays} j`
  return formatDate(date)
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}m ${secs}s`
}

const formatCallType = (type: string): string => {
  const map: Record<string, string> = {
    incoming: "Entrant",
    outgoing: "Sortant",
    missed: "Manqué",
  }
  return map[type] || type
}

const formatMeetingStatus = (status: string): string => {
  const map: Record<string, string> = {
    scheduled: "Planifié",
    completed: "Terminé",
    cancelled: "Annulé",
  }
  return map[status] || status
}

const formatTaskStatus = (status: string): string => {
  const map: Record<string, string> = {
    pending: "En attente",
    in_progress: "En cours",
    blocked: "Bloqué",
    completed: "Terminé",
    cancelled: "Annulé",
  }
  return map[status] || status
}

const formatPriority = (priority: string): string => {
  const map: Record<string, string> = {
    low: "Basse",
    medium: "Moyenne",
    high: "Haute",
    urgent: "Urgente",
  }
  return map[priority] || priority
}

// Icon and color helpers
const getItemIcon = (type: TimelineItemType): string => {
  const icons: Record<TimelineItemType, string> = {
    note: "mdi-note-text",
    meeting: "mdi-calendar-account",
    call: "mdi-phone",
    reminder: "mdi-bell-alert",
    task: "mdi-checkbox-marked-circle-outline",
  }
  return icons[type] || "mdi-circle"
}

const getItemColor = (type: TimelineItemType): string => {
  const colors: Record<TimelineItemType, string> = {
    note: "warning",
    meeting: "primary",
    call: "success",
    reminder: "info",
    task: "secondary",
  }
  return colors[type] || "grey"
}

const getItemLabel = (type: TimelineItemType): string => {
  const labels: Record<TimelineItemType, string> = {
    note: "Note",
    meeting: "Réunion",
    call: "Appel",
    reminder: "Rappel",
    task: "Tâche",
  }
  return labels[type] || type
}

const getCallTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    incoming: "success",
    outgoing: "info",
    missed: "error",
  }
  return colors[type] || "grey"
}

const getMeetingStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    scheduled: "primary",
    completed: "success",
    cancelled: "error",
  }
  return colors[status] || "grey"
}

const getTaskStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "warning",
    in_progress: "info",
    blocked: "error",
    completed: "success",
    cancelled: "grey",
  }
  return colors[status] || "grey"
}

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: "info",
    medium: "warning",
    high: "error",
    urgent: "purple",
  }
  return colors[priority] || "grey"
}

// Lifecycle
onMounted(() => {
  loadTimeline(true)
})
</script>

<style scoped>
.timeline-tab {
  padding: 0.5rem;
}

.v-timeline {
  padding-top: 0;
}
</style>
