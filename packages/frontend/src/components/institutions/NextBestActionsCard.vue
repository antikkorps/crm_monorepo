<template>
  <v-card>
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2" color="primary">mdi-lightbulb-on-outline</v-icon>
      Actions Recommandées
    </v-card-title>

    <v-divider />

    <v-card-text class="pa-0">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="mt-4 text-medium-emphasis">Chargement des recommandations...</p>
      </div>

      <!-- Error State -->
      <v-alert v-else-if="error" type="error" variant="tonal" class="ma-4">
        {{ error }}
      </v-alert>

      <!-- Empty State -->
      <div v-else-if="!actions || actions.length === 0" class="text-center py-8">
        <v-icon size="64" color="grey-lighten-1">mdi-check-circle-outline</v-icon>
        <p class="mt-4 text-medium-emphasis">Aucune action recommandée pour le moment</p>
        <p class="text-caption text-medium-emphasis">Tout est à jour !</p>
      </div>

      <!-- Actions List -->
      <v-list v-else density="compact">
        <v-list-item
          v-for="(action, index) in actions"
          :key="index"
          :class="{ 'bg-red-lighten-5': action.priority === 'urgent', 'bg-orange-lighten-5': action.priority === 'high' }"
        >
          <template v-slot:prepend>
            <v-avatar :color="getPriorityColor(action.priority)" size="40">
              <v-icon color="white">{{ getCategoryIcon(action.category) }}</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-medium">
            {{ action.action }}
          </v-list-item-title>

          <v-list-item-subtitle class="mt-1">
            <v-icon size="small" class="mr-1">mdi-information-outline</v-icon>
            {{ action.reason }}
          </v-list-item-subtitle>

          <v-list-item-subtitle v-if="action.dueDate" class="mt-1">
            <v-icon size="small" class="mr-1">mdi-calendar-clock</v-icon>
            {{ formatDueDate(action.dueDate) }}
          </v-list-item-subtitle>

          <template v-slot:append>
            <div class="d-flex flex-column align-end gap-1">
              <v-chip
                :color="getPriorityColor(action.priority)"
                size="x-small"
                variant="flat"
              >
                {{ formatPriority(action.priority) }}
              </v-chip>
              <v-chip
                :color="getCategoryColor(action.category)"
                size="x-small"
                variant="tonal"
              >
                {{ formatCategory(action.category) }}
              </v-chip>
            </div>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <v-card-actions v-if="actions && actions.length > 0">
      <v-spacer />
      <v-btn
        variant="text"
        color="primary"
        prepend-icon="mdi-refresh"
        @click="loadActions"
      >
        Actualiser
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { analyticsApi } from "@/services/api"
import type { NextBestAction } from "@/services/api/analytics"

const props = defineProps<{
  institutionId: string
}>()

const actions = ref<NextBestAction[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const loadActions = async () => {
  loading.value = true
  error.value = null

  try {
    const response = await analyticsApi.getNextActions(props.institutionId)
    actions.value = response.data.data
  } catch (err: any) {
    error.value = err.message || "Impossible de charger les recommandations"
    console.error("Failed to load next actions:", err)
  } finally {
    loading.value = false
  }
}

const getPriorityColor = (priority: "urgent" | "high" | "medium" | "low"): string => {
  const colors: Record<"urgent" | "high" | "medium" | "low", string> = {
    urgent: "error",
    high: "warning",
    medium: "info",
    low: "success",
  }
  return colors[priority] || "grey"
}

const getCategoryColor = (category: "follow_up" | "upsell" | "retention" | "reactivation" | "closing"): string => {
  const colors: Record<"follow_up" | "upsell" | "retention" | "reactivation" | "closing", string> = {
    follow_up: "primary",
    upsell: "success",
    retention: "warning",
    reactivation: "info",
    closing: "purple",
  }
  return colors[category] || "grey"
}

const getCategoryIcon = (category: "follow_up" | "upsell" | "retention" | "reactivation" | "closing"): string => {
  const icons: Record<"follow_up" | "upsell" | "retention" | "reactivation" | "closing", string> = {
    follow_up: "mdi-phone-outline",
    upsell: "mdi-trending-up",
    retention: "mdi-account-heart",
    reactivation: "mdi-refresh-circle",
    closing: "mdi-handshake",
  }
  return icons[category] || "mdi-information"
}

const formatPriority = (priority: "urgent" | "high" | "medium" | "low"): string => {
  const labels: Record<"urgent" | "high" | "medium" | "low", string> = {
    urgent: "🔴 Urgent",
    high: "🟠 Élevé",
    medium: "🟡 Moyen",
    low: "🟢 Faible",
  }
  return labels[priority] || priority
}

const formatCategory = (category: "follow_up" | "upsell" | "retention" | "reactivation" | "closing"): string => {
  const labels: Record<"follow_up" | "upsell" | "retention" | "reactivation" | "closing", string> = {
    follow_up: "Suivi",
    upsell: "Upsell",
    retention: "Rétention",
    reactivation: "Réactivation",
    closing: "Conclusion",
  }
  return labels[category] || category
}

const formatDueDate = (dueDate: string): string => {
  const date = new Date(dueDate)
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `En retard de ${Math.abs(diffDays)} jour(s)`
  } else if (diffDays === 0) {
    return "Aujourd'hui"
  } else if (diffDays === 1) {
    return "Demain"
  } else if (diffDays < 7) {
    return `Dans ${diffDays} jours`
  } else {
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
  }
}

onMounted(() => {
  loadActions()
})
</script>

<style scoped>
.bg-red-lighten-5 {
  background-color: rgba(244, 67, 54, 0.05);
}

.bg-orange-lighten-5 {
  background-color: rgba(255, 152, 0, 0.05);
}
</style>
