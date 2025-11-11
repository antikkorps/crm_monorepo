<template>
  <div id="app">
    <router-view />

    <!-- Global Snackbar -->
    <v-snackbar
      v-model="snackbarState.show"
      :color="snackbarState.color"
      :timeout="snackbarState.timeout"
      location="bottom right"
    >
      {{ snackbarState.message }}
      <template #actions>
        <v-btn variant="text" @click="hideSnackbar"> Fermer </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { useSettingsStore } from "@/stores/settings"
import { useSnackbar } from "@/composables/useSnackbar"
import { onMounted } from "vue"

const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const { snackbarState, hideSnackbar } = useSnackbar()

// Initialize authentication and settings on app startup
onMounted(async () => {
  authStore.initializeAuth()
  // Load public settings (feature flags) - no auth required
  await settingsStore.loadPublicSettings()
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
