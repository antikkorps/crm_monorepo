<template>
  <AppLayout>
    <div class="invoices">
      <Card>
        <template #title>
          <i class="pi pi-file mr-2"></i>
          Invoices
        </template>
        <template #content>
          <p>Invoice management will be implemented in a future task.</p>
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
.invoices {
  padding: 1rem;
}
</style>
