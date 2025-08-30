<template>
  <div class="dashboard-view">
    <h1 class="text-3xl font-bold text-900 mb-4">Dashboard</h1>

    <!-- Check if user should be redirected to billing analytics -->
    <div v-if="shouldRedirectToBilling" class="text-center py-8">
      <ProgressSpinner />
      <p class="mt-3">Redirection vers le dashboard de facturation...</p>
    </div>

    <!-- Default dashboard content -->
    <div v-else class="grid">
      <!-- Welcome Card -->
      <div class="col-12">
        <Card>
          <template #content>
            <div class="flex align-items-center">
              <i class="pi pi-user text-4xl text-primary mr-3"></i>
              <div>
                <h2 class="text-2xl font-semibold mb-2">
                  Bienvenue, {{ authStore.userName }}!
                </h2>
                <p class="text-600">Voici votre tableau de bord Medical CRM</p>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Quick Actions -->
      <div class="col-12">
        <Card>
          <template #title>Actions rapides</template>
          <template #content>
            <div class="grid">
              <div class="col-12 md:col-6 lg:col-3">
                <Button
                  label="Billing Analytics"
                  icon="pi pi-chart-bar"
                  @click="$router.push('/billing/analytics')"
                  class="w-full p-button-outlined"
                />
              </div>
              <div class="col-12 md:col-6 lg:col-3">
                <Button
                  label="Institutions"
                  icon="pi pi-building"
                  @click="$router.push('/institutions')"
                  class="w-full p-button-outlined"
                />
              </div>
              <div class="col-12 md:col-6 lg:col-3">
                <Button
                  label="Tâches"
                  icon="pi pi-check-square"
                  @click="$router.push('/tasks')"
                  class="w-full p-button-outlined"
                />
              </div>
              <div class="col-12 md:col-6 lg:col-3">
                <Button
                  label="Équipe"
                  icon="pi pi-users"
                  @click="$router.push('/team')"
                  class="w-full p-button-outlined"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Info Card -->
      <div class="col-12">
        <Card>
          <template #content>
            <div class="text-center py-4">
              <i class="pi pi-info-circle text-4xl text-blue-500 mb-3"></i>
              <h3 class="text-xl font-semibold mb-2">Dashboard en développement</h3>
              <p class="text-600 mb-4">
                Le dashboard principal est en cours de développement. En attendant, vous
                pouvez accéder aux différentes sections via le menu de navigation.
              </p>
              <Button
                label="Voir Billing Analytics"
                icon="pi pi-chart-bar"
                @click="$router.push('/billing/analytics')"
                class="p-button-primary"
              />
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import Button from "primevue/button"
import Card from "primevue/card"
import ProgressSpinner from "primevue/progressspinner"
import { computed, onMounted } from "vue"
import { useRouter } from "vue-router"

const authStore = useAuthStore()
const router = useRouter()

// Check if user should be automatically redirected to billing analytics
const shouldRedirectToBilling = computed(() => {
  // For now, don't auto-redirect, let users choose
  return false
})

// Auto-redirect logic (if needed)
onMounted(() => {
  if (shouldRedirectToBilling.value) {
    setTimeout(() => {
      router.push("/billing/analytics")
    }, 2000)
  }
})
</script>

<style scoped>
.dashboard-view {
  padding: 1rem;
}

@media (max-width: 768px) {
  .dashboard-view {
    padding: 0.5rem;
  }
}
</style>
