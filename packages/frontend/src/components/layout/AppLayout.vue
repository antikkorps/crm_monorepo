<template>
  <div class="layout-wrapper">
    <!-- PrimeVue Menubar Navigation -->
    <div class="layout-menubar">
      <AppMenubar />
    </div>

    <!-- Main Content Area -->
    <div class="layout-main-container">
      <div class="layout-main">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppMenubar from "./AppMenubar.vue"
</script>

<style scoped>
.layout-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout-menubar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.layout-main-container {
  margin-top: 4rem;
  min-height: calc(100vh - 4rem);
}

.layout-main {
  padding: 0;
  background: #f8f9fa;
  min-height: calc(100vh - 4rem);
}
</style>
