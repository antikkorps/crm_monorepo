<template>
  <AppLayout>
    <div class="team">
      <Card>
        <template #title>
          <i class="pi pi-users mr-2"></i>
          Team
        </template>
        <template #content>
          <p>Team management will be implemented in a future task.</p>
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
.team {
  padding: 1rem;
}
</style>
