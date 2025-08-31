<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-hospital-building</v-icon>
        Medical Institution Segments
      </div>
    </v-card-title>
    
    <v-card-text class="text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-bar</v-icon>
      <h3 class="text-h6 mb-2">Medical Segment Analytics</h3>
      <p class="text-body-2 text-medium-emphasis">
        Analytics component placeholder for medical institution segments
      </p>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  data?: any
}

defineProps<Props>()
</script>

