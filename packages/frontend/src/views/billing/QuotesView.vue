<template>
  <AppLayout>
    <div class="quotes">
      <Card>
        <template #title>
          <i class="pi pi-file-edit mr-2"></i>
          Quotes
        </template>
        <template #content>
          <p>Quote management will be implemented in a future task.</p>
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
.quotes {
  padding: 1rem;
}
</style>
