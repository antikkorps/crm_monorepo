<template>
  <AppLayout>
    <div class="institutions">
      <Card>
        <template #title>
          <i class="pi pi-building mr-2"></i>
          Medical Institutions
        </template>
        <template #content>
          <p>Medical institutions management will be implemented in a future task.</p>
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
.institutions {
  padding: 1rem;
}
</style>
