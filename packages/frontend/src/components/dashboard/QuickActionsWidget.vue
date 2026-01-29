<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center justify-space-between card-title-responsive">
      <div class="d-flex align-center">
        <v-icon icon="mdi-lightning-bolt" color="primary" class="mr-2" size="small" />
        <span>Actions recommandées</span>
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
    <v-card-text v-if="loading && actions.length === 0" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4 text-body-2">Chargement...</p>
    </v-card-text>

    <!-- Empty State -->
    <v-card-text v-else-if="actions.length === 0" class="text-center py-8">
      <v-icon icon="mdi-check-all" size="48" color="success" class="mb-3" />
      <p class="text-body-1 font-weight-medium">Aucune action urgente</p>
      <p class="text-body-2 text-medium-emphasis">
        Toutes les tâches prioritaires sont à jour
      </p>
    </v-card-text>

    <!-- Actions List -->
    <v-card-text v-else class="pa-2 pa-sm-4">
      <div class="actions-grid">
        <div
          v-for="action in actions"
          :key="action.id"
          class="action-item"
          @click="handleActionClick(action)"
        >
          <div class="action-content">
            <!-- Icon -->
            <v-avatar
              size="40"
              :color="action.color"
              variant="tonal"
              class="action-icon"
            >
              <v-icon :icon="action.icon" size="20" :color="action.color" />
            </v-avatar>

            <!-- Text -->
            <div class="action-text">
              <div class="d-flex align-center ga-2">
                <span class="action-title">{{ action.title }}</span>
                <v-chip
                  v-if="action.category === 'urgent'"
                  color="error"
                  size="x-small"
                  variant="flat"
                  density="compact"
                  class="urgent-chip"
                >
                  Urgent
                </v-chip>
              </div>
              <span class="action-description">{{ action.description }}</span>
            </div>

            <!-- Arrow -->
            <v-icon
              icon="mdi-chevron-right"
              size="20"
              color="grey"
              class="action-arrow"
            />
          </div>
        </div>
      </div>
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
.card-title-responsive {
  font-size: 1rem;
  padding: 12px 16px;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  cursor: pointer;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition: all 0.2s ease;
}

.action-item:hover {
  background: rgba(var(--v-theme-primary), 0.04);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.action-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.action-icon {
  flex-shrink: 0;
}

.action-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-description {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action-arrow {
  flex-shrink: 0;
  opacity: 0.5;
  transition: all 0.2s ease;
}

.urgent-chip {
  padding-top: 2px;
  font-size: 0.625rem;
}

.action-item:hover .action-arrow {
  opacity: 1;
  transform: translateX(2px);
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .card-title-responsive {
    font-size: 0.875rem;
    padding: 8px 12px;
  }

  .action-content {
    padding: 10px;
    gap: 10px;
  }

  .action-icon {
    width: 36px !important;
    height: 36px !important;
  }

  .action-icon :deep(.v-icon) {
    font-size: 18px !important;
  }
}
</style>
