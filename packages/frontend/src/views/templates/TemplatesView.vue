<template>
  <AppLayout>
    <TemplateManager />
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import { TemplateManager } from "../../components/templates"
</script>

<style scoped>
.templates-view {
  min-height: 100vh;
  background: rgb(var(--v-theme-surface));
}
</style>
