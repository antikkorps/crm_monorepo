<template>
  <v-container fluid class="templates-view pa-0">
    <TemplateManager />
  </v-container>
</template>

<script setup lang="ts">
import { TemplateManager } from "../../components/templates"
</script>

<style scoped>
.templates-view {
  min-height: 100vh;
  background: rgb(var(--v-theme-surface));
}
</style>
