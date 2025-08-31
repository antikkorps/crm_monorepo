<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon icon="mdi-chart-line" color="primary" class="mr-2" />
      Revenue Analytics
    </v-card-title>
    <v-card-text>
      <div class="d-flex flex-column align-center justify-center pa-8">
        <v-icon icon="mdi-chart-line" size="64" color="primary" class="mb-4" />
        <div class="text-h6 mb-2">Revenue Analytics Chart</div>
        <div class="text-body-2 text-center text-medium-emphasis">
          Chart component will be implemented with Chart.js
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
interface Props {
  data: any
}

defineProps<Props>()
</script>