<template>
  <div id="app">
    <Toast />
    <ConfirmDialog />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import ConfirmDialog from "primevue/confirmdialog"
import Toast from "primevue/toast"
import { onMounted } from "vue"

const authStore = useAuthStore()

onMounted(async () => {
  // Initialize authentication state on app startup
  await authStore.initializeAuth()
})
</script>

<style>
/* Global styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu",
    "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f8f9fa;
}

#app {
  min-height: 100vh;
}

/* Custom PrimeVue theme overrides */
.p-component {
  font-size: 14px;
}

.p-button {
  font-weight: 500;
}

.p-card {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Utility classes */
.full-height {
  height: 100vh;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-center {
  text-align: center;
}
</style>
