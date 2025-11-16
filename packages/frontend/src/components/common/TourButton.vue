<template>
  <v-menu>
    <template v-slot:activator="{ props }">
      <v-btn
        icon="mdi-help-circle-outline"
        v-bind="props"
        variant="text"
        size="small"
        :color="pulse ? 'primary' : undefined"
        :class="{ 'tour-button-pulse': pulse }"
      />
    </template>

    <v-list>
      <v-list-subheader>Visites Guidées</v-list-subheader>

      <v-list-item @click="startTour('dashboard')">
        <template v-slot:prepend>
          <v-icon>mdi-view-dashboard</v-icon>
        </template>
        <v-list-item-title>Dashboard</v-list-item-title>
        <template v-slot:append>
          <v-icon v-if="isTourCompleted('dashboard')" color="success" size="small">
            mdi-check-circle
          </v-icon>
        </template>
      </v-list-item>

      <v-list-item @click="startTour('institutions')">
        <template v-slot:prepend>
          <v-icon>mdi-domain</v-icon>
        </template>
        <v-list-item-title>Institutions</v-list-item-title>
        <template v-slot:append>
          <v-icon v-if="isTourCompleted('institutions')" color="success" size="small">
            mdi-check-circle
          </v-icon>
        </template>
      </v-list-item>

      <v-list-item @click="startTour('opportunities')">
        <template v-slot:prepend>
          <v-icon>mdi-chart-timeline-variant</v-icon>
        </template>
        <v-list-item-title>Pipeline</v-list-item-title>
        <template v-slot:append>
          <v-icon v-if="isTourCompleted('opportunities')" color="success" size="small">
            mdi-check-circle
          </v-icon>
        </template>
      </v-list-item>

      <v-list-item @click="startTour('analytics')">
        <template v-slot:prepend>
          <v-icon>mdi-chart-box-outline</v-icon>
        </template>
        <v-list-item-title>Analytics</v-list-item-title>
        <template v-slot:append>
          <v-icon v-if="isTourCompleted('analytics')" color="success" size="small">
            mdi-check-circle
          </v-icon>
        </template>
      </v-list-item>

      <v-divider class="my-2" />

      <v-list-item @click="resetAllTours">
        <template v-slot:prepend>
          <v-icon>mdi-refresh</v-icon>
        </template>
        <v-list-item-title class="text-caption">Réinitialiser les visites</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { useTour, type TourName } from "@/composables/useTour"
import { ref, onMounted } from "vue"

const { startTour, isTourCompleted, resetAllTours } = useTour()
const pulse = ref(false)

// Pulse animation on first visit
onMounted(() => {
  const hasSeenTourButton = localStorage.getItem("tour_button_seen")
  if (!hasSeenTourButton) {
    pulse.value = true
    localStorage.setItem("tour_button_seen", "true")

    // Stop pulse after 10 seconds
    setTimeout(() => {
      pulse.value = false
    }, 10000)
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
