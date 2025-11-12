<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-lightning-bolt" color="primary" class="mr-2" />
        Actions recommandées
      </div>
      <v-chip
        v-if="actions.length > 0"
        :text="`${actions.length}`"
        size="small"
        color="primary"
        variant="flat"
      />
    </v-card-title>

    <!-- Loading State -->
    <v-card-text v-if="loading && actions.length === 0" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement...</p>
    </v-card-text>

    <!-- Empty State -->
    <v-card-text v-else-if="actions.length === 0" class="text-center py-12">
      <v-icon icon="mdi-check-all" size="64" color="success" class="mb-4" />
      <p class="text-h6 text-medium-emphasis">Aucune action urgente</p>
      <p class="text-body-2 text-medium-emphasis">
        Toutes les tâches prioritaires sont à jour
      </p>
    </v-card-text>

    <!-- Actions Grid -->
    <v-card-text v-else>
      <v-row>
        <v-col
          v-for="action in actions"
          :key="action.id"
          cols="12"
          sm="6"
          md="4"
          class="d-flex"
        >
          <v-card
            class="quick-action-card flex-grow-1"
            :class="`action-${action.category}`"
            variant="outlined"
            hover
            @click="handleActionClick(action)"
          >
            <v-card-text class="text-center pa-6 d-flex flex-column">
              <!-- Category Badge -->
              <v-chip
                v-if="action.category === 'urgent'"
                color="error"
                size="x-small"
                variant="flat"
                class="mb-3 align-self-center"
              >
                <v-icon start size="x-small">mdi-alert</v-icon>
                Urgent
              </v-chip>

              <!-- Icon -->
              <v-avatar
                size="64"
                class="mb-4 align-self-center"
                :color="action.color"
                variant="tonal"
              >
                <v-icon
                  :icon="action.icon"
                  size="32"
                  :color="action.color"
                />
              </v-avatar>

              <!-- Title -->
              <v-card-title class="text-h6 mb-2 text-wrap">
                {{ action.title }}
              </v-card-title>

              <!-- Description -->
              <p class="text-body-2 text-medium-emphasis mb-4 flex-grow-1">
                {{ action.description }}
              </p>

              <!-- Action Button -->
              <v-btn
                :color="action.color"
                variant="elevated"
                size="small"
                block
                append-icon="mdi-arrow-right"
                class="mt-auto"
              >
                Accéder
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Refresh Note -->
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
        closable
      >
        <span class="text-caption">
          Les actions sont personnalisées selon votre activité et mises à jour automatiquement
        </span>
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { dashboardApi, type QuickAction } from '@/services/api/dashboard'

const router = useRouter()

// State
const actions = ref<QuickAction[]>([])
const loading = ref(false)

// Load quick actions
async function loadQuickActions() {
  loading.value = true

  try {
    actions.value = await dashboardApi.getQuickActions()
  } catch (error) {
    console.error('Error loading quick actions:', error)
  } finally {
    loading.value = false
  }
}

// Handle action click
function handleActionClick(action: QuickAction) {
  router.push(action.route)
}

// Lifecycle
onMounted(() => {
  loadQuickActions()
})
</script>

<style scoped>
.quick-action-card {
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
}

.quick-action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.action-urgent {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.action-finance {
  border-left: 4px solid rgb(var(--v-theme-warning));
}

.action-sales {
  border-left: 4px solid rgb(var(--v-theme-info));
}

.action-planning {
  border-left: 4px solid rgb(var(--v-theme-primary));
}

.action-analytics {
  border-left: 4px solid rgb(var(--v-theme-purple));
}

.action-general {
  border-left: 4px solid rgb(var(--v-theme-blue));
}
</style>
