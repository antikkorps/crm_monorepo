<template>
  <v-list>
    <v-list-subheader>Visites Guidées</v-list-subheader>

    <v-list-item
      v-for="tour in availableTours"
      :key="tour.name"
      @click="handleTourClick(tour)"
    >
      <template v-slot:prepend>
        <v-icon>{{ tour.icon }}</v-icon>
      </template>

      <v-list-item-title>{{ tour.title }}</v-list-item-title>

      <template v-slot:append>
        <v-icon v-if="isTourCompleted(tour.name)" color="success" size="small">
          mdi-check-circle
        </v-icon>
      </template>
    </v-list-item>

    <v-divider class="my-2" />

    <v-list-item @click="resetAllTours">
      <template v-slot:prepend>
        <v-icon>mdi-refresh</v-icon>
      </template>
      <v-list-item-title class="text-caption">
        Réinitialiser toutes les visites
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import { useTour, type TourName } from "@/composables/useTour"
import { useRouter } from "vue-router"

const router = useRouter()
const { startTour, isTourCompleted, resetAllTours } = useTour()

interface TourConfig {
  name: TourName
  title: string
  icon: string
  route: string
}

const availableTours: TourConfig[] = [
  {
    name: "dashboard",
    title: "Tableau de bord",
    icon: "mdi-view-dashboard",
    route: "/dashboard",
  },
  {
    name: "institutions",
    title: "Établissements",
    icon: "mdi-domain",
    route: "/institutions",
  },
  {
    name: "opportunities",
    title: "Pipeline de ventes",
    icon: "mdi-chart-timeline-variant",
    route: "/opportunities",
  },
  {
    name: "analytics",
    title: "Analytics",
    icon: "mdi-chart-box-outline",
    route: "/analytics",
  },
]

const handleTourClick = (tour: TourConfig) => {
  // Navigate to the page first if not already there
  if (router.currentRoute.value.path !== tour.route) {
    router.push(tour.route).then(() => {
      // Small delay to ensure page is loaded
      setTimeout(() => {
        startTour(tour.name)
      }, 500)
    })
  } else {
    startTour(tour.name)
  }
}
</script>
