<template>
  <v-card elevation="2" class="h-100">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-timeline-clock" color="primary" class="mr-2" />
        Activités récentes
      </div>
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="loading"
        @click="loadActivities"
      />
    </v-card-title>

    <!-- Loading State -->
    <v-card-text v-if="loading && activities.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement...</p>
    </v-card-text>

    <!-- Empty State -->
    <v-card-text v-else-if="activities.length === 0" class="text-center py-12">
      <v-icon
        icon="mdi-timeline-clock-outline"
        size="64"
        color="grey-lighten-1"
        class="mb-4"
      />
      <p class="text-h6 text-medium-emphasis">Aucune activité récente</p>
    </v-card-text>

    <!-- Timeline Content -->
    <v-card-text v-else class="timeline-container">
      <v-timeline side="end" density="compact" align="start">
        <v-timeline-item
          v-for="activity in activities"
          :key="activity.id"
          :dot-color="activity.color"
          :icon="activity.icon"
          size="small"
        >
          <template v-slot:opposite>
            <div class="text-caption text-medium-emphasis">
              {{ formatTime(activity.timestamp) }}
            </div>
          </template>

          <v-card variant="tonal" :color="activity.color" class="activity-card">
            <v-card-text class="pa-3">
              <div class="d-flex align-center justify-space-between mb-1">
                <span class="text-subtitle-2 font-weight-bold">{{ activity.title }}</span>
                <v-chip
                  :color="activity.color"
                  size="x-small"
                  variant="flat"
                  class="text-capitalize mx-2"
                >
                  {{ getActivityTypeLabel(activity.type) }}
                </v-chip>
              </div>

              <p class="text-body-2 text-medium-emphasis mb-2">
                {{ activity.description }}
              </p>

              <div v-if="activity.user" class="d-flex align-center">
                <v-avatar
                  :image="`https://api.dicebear.com/7.x/initials/svg?seed=${activity.user.id}`"
                  size="20"
                  class="mr-2"
                />
                <span class="text-caption">{{ activity.user.name }}</span>
              </div>
            </v-card-text>
          </v-card>
        </v-timeline-item>
      </v-timeline>

      <!-- Load More Button -->
      <div v-if="hasMore" class="text-center mt-4">
        <v-btn
          variant="text"
          color="primary"
          prepend-icon="mdi-chevron-down"
          :loading="loadingMore"
          @click="loadMore"
        >
          Charger plus
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { dashboardApi, type Activity } from "@/services/api/dashboard"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { onMounted, ref } from "vue"

// State
const activities = ref<Activity[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const limit = 10
const offset = ref(0)

// Load activities
async function loadActivities() {
  loading.value = true

  try {
    const data = await dashboardApi.getActivities(limit, 0)
    activities.value = data
    offset.value = limit
    hasMore.value = data.length === limit
  } catch (error) {
    console.error("Error loading activities:", error)
  } finally {
    loading.value = false
  }
}

// Load more activities
async function loadMore() {
  loadingMore.value = true

  try {
    const data = await dashboardApi.getActivities(limit, offset.value)
    activities.value.push(...data)
    offset.value += limit
    hasMore.value = data.length === limit
  } catch (error) {
    console.error("Error loading more activities:", error)
  } finally {
    loadingMore.value = false
  }
}

// Format time helper
function formatTime(timestamp: string): string {
  return formatDistanceToNow(new Date(timestamp), {
    addSuffix: true,
    locale: fr,
  })
}

// Get activity type label
function getActivityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    institution: "Institution",
    task: "Tâche",
    quote: "Devis",
    invoice: "Facture",
    sync: "Synchronisation",
  }
  return labels[type] || type
}

// Lifecycle
onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.timeline-container {
  max-height: 600px;
  overflow-y: auto;
}

.activity-card {
  transition: all 0.2s ease-in-out;
}

.activity-card:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.h-100 {
  height: 100%;
}
</style>
