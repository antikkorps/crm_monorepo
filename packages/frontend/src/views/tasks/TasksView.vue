<template>
  <AppLayout>
    <div class="tasks">
      <Card>
        <template #title>
          <i class="pi pi-check-square mr-2"></i>
          Tasks
        </template>
        <template #content>
          <p>Task management will be implemented in a future task.</p>
        </template>
      </Card>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import Card from "primevue/card"
</script>

<style scoped>
.tasks {
  padding: 1rem;
}
</style>
