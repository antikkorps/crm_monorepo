<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { onMounted } from "vue"

const authStore = useAuthStore()

// Initialize authentication on app startup
onMounted(() => {
  authStore.initializeAuth()
})
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
