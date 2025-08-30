<template>
  <div class="templates-view">
    <TemplateManager />
  </div>
</template>

<script setup lang="ts">
import { TemplateManager } from "../../components/templates"
</script>

<style scoped>
.templates-view {
  min-height: 100vh;
  background: var(--surface-ground);
}
</style>
