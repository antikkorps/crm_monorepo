<template>
  <div class="plugins-view">
    <PluginManager />
  </div>
</template>

<script setup lang="ts">
import { PluginManager } from "../../components/plugins"

// Set page title
document.title = "Plugin Management - OPEx_CRM"
</script>

<style scoped>
.plugins-view {
  min-height: 100vh;
  background-color: var(--surface-ground);
}
</style>
