<template>
  <v-card elevation="2" class="h-100">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-bell-alert" color="primary" class="mr-2" />
        Alertes intelligentes
      </div>
      <v-btn
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="loading"
        @click="loadAlerts"
      />
    </v-card-title>

    <!-- Loading State -->
    <v-card-text v-if="loading && alerts.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement...</p>
    </v-card-text>

    <!-- Empty State (All Good!) -->
    <v-card-text v-else-if="alerts.length === 0" class="text-center py-12">
      <v-icon icon="mdi-check-circle" size="64" color="success" class="mb-4" />
      <p class="text-h6 text-medium-emphasis">Tout est sous contrôle !</p>
      <p class="text-body-2 text-medium-emphasis">
        Aucune alerte pour le moment
      </p>
    </v-card-text>

    <!-- Alerts List -->
    <v-card-text v-else>
      <v-list density="compact" lines="two">
        <v-list-item
          v-for="(alert, index) in alerts"
          :key="alert.id"
          class="alert-item mb-2"
          :class="`alert-${alert.type}`"
          @click="handleAlertClick(alert)"
        >
          <template v-slot:prepend>
            <v-avatar :color="alert.color" size="40">
              <v-icon :icon="alert.icon" size="20" color="white" />
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold">
            {{ alert.title }}
            <v-chip
              :color="alert.color"
              size="x-small"
              variant="flat"
              class="ml-2"
            >
              {{ alert.count }}
            </v-chip>
          </v-list-item-title>

          <v-list-item-subtitle class="text-wrap">
            {{ alert.message }}
          </v-list-item-subtitle>

          <template v-slot:append>
            <v-btn
              :color="alert.color"
              variant="text"
              size="small"
              icon="mdi-chevron-right"
            />
          </template>
        </v-list-item>

        <!-- Divider between alerts -->
        <v-divider v-if="index < alerts.length - 1" :key="`divider-${alert.id}`" class="my-2" />
      </v-list>

      <!-- Summary Card -->
      <v-alert
        v-if="criticalCount > 0"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-4"
        prominent
      >
        <div class="d-flex align-center">
          <v-icon icon="mdi-alert-octagon" class="mr-2" />
          <span class="text-body-2">
            <strong>{{ criticalCount }}</strong> alerte(s) critique(s) nécessitent votre attention immédiate
          </span>
        </div>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardApi, type Alert } from '@/services/api/dashboard'

const router = useRouter()

// State
const alerts = ref<Alert[]>([])
const loading = ref(false)

// Computed
const criticalCount = computed(() => {
  return alerts.value.filter(alert => alert.type === 'critical').length
})

// Load alerts
async function loadAlerts() {
  loading.value = true

  try {
    alerts.value = await dashboardApi.getAlerts()
  } catch (error) {
    console.error('Error loading alerts:', error)
  } finally {
    loading.value = false
  }
}

// Handle alert click
function handleAlertClick(alert: Alert) {
  if (alert.action?.route) {
    router.push(alert.action.route)
  }
}

// Lifecycle
onMounted(() => {
  loadAlerts()
})
</script>

<style scoped>
.alert-item {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.alert-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  transform: translateX(4px);
}

.alert-critical {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.alert-warning {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.alert-info {
  border-left: 4px solid rgb(var(--v-theme-info));
}

.h-100 {
  height: 100%;
}
</style>
