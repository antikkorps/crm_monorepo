<template>
  <AppLayout>
    <div class="institution-detail">
      <Card>
        <template #title>
          <i class="pi pi-building mr-2"></i>
          Institution Details
        </template>
        <template #content>
          <p>Institution ID: {{ $route.params.id }}</p>
          <p>Institution details will be implemented in a future task.</p>
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
.institution-detail {
  padding: 1rem;
}
</style>
