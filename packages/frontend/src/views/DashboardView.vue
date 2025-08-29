<template>
  <AppLayout>
    <div class="dashboard">
      <div class="grid">
        <div class="col-12">
          <Card>
            <template #title>
              <i class="pi pi-home mr-2"></i>
              Dashboard
            </template>
            <template #content>
              <p>Welcome to the Medical CRM Dashboard!</p>
              <p>This is a placeholder for the main dashboard content.</p>
            </template>
          </Card>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import Card from "primevue/card"
</script>

<style scoped>
.dashboard {
  padding: 1rem;
}
</style>
