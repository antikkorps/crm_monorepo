<template>
  <!-- Show button only if there's a tour available for current page -->
  <v-tooltip v-if="currentTour" location="bottom">
    <template v-slot:activator="{ props }">
      <v-btn
        v-bind="props"
        icon="mdi-help-circle-outline"
        variant="text"
        size="small"
        :color="pulse ? 'primary' : undefined"
        :class="{ 'tour-button-pulse': pulse }"
        @click="startCurrentTour"
      >
        <v-icon>mdi-help-circle-outline</v-icon>
        <v-badge
          v-if="!isTourCompleted(currentTour.name)"
          color="primary"
          dot
          floating
        />
      </v-btn>
    </template>
    <span>{{ currentTour.tooltip }}</span>
  </v-tooltip>
</template>

<script setup lang="ts">
import { useTour, type TourName } from "@/composables/useTour"
import { ref, computed, onMounted } from "vue"
import { useRoute } from "vue-router"

const route = useRoute()
const { startTour, isTourCompleted } = useTour()
const pulse = ref(false)

// Define available tours for each route
const tourConfig: Record<string, { name: TourName; tooltip: string }> = {
  "/dashboard": { name: "dashboard", tooltip: "Visite guidée du tableau de bord" },
  "/institutions": { name: "institutions", tooltip: "Visite guidée des établissements" },
  "/opportunities": { name: "opportunities", tooltip: "Visite guidée du pipeline" },
  "/analytics": { name: "analytics", tooltip: "Visite guidée des analytics" },
}

// Get current tour based on route
const currentTour = computed(() => {
  const path = route.path
  return tourConfig[path] || null
})

// Start the current page's tour
const startCurrentTour = () => {
  if (currentTour.value) {
    startTour(currentTour.value.name)
  }
}

// Pulse animation on first visit to a page with a tour
onMounted(() => {
  if (currentTour.value) {
    const tourName = currentTour.value.name
    const hasSeenTour = localStorage.getItem(`tour_seen_${tourName}`)

    if (!hasSeenTour && !isTourCompleted(tourName)) {
      pulse.value = true
      localStorage.setItem(`tour_seen_${tourName}`, "true")

      // Stop pulse after 10 seconds
      setTimeout(() => {
        pulse.value = false
      }, 10000)
    }
  }
})
</script>

<style scoped>
.tour-button-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}
</style>
