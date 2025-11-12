<template>
  <v-card class="reminder-widget" elevation="2">
    <v-card-title class="d-flex align-center">
      <v-icon class="mr-2" color="primary">mdi-bell-ring</v-icon>
      <span>Système de Rappels</span>
      <v-spacer />
      <v-chip
        v-if="stats"
        :color="stats.notifications.successRate > 95 ? 'success' : stats.notifications.successRate > 80 ? 'warning' : 'error'"
        size="small"
      >
        {{ stats.notifications.successRate }}% success
      </v-chip>
    </v-card-title>

    <v-card-text>
      <!-- Loading State -->
      <v-skeleton-loader
        v-if="loading"
        type="list-item-three-line, list-item-three-line"
      />

      <!-- Error State -->
      <v-alert v-else-if="error" type="error" variant="tonal" closable>
        {{ error }}
      </v-alert>

      <!-- Stats Display -->
      <div v-else-if="stats">
        <!-- Summary Stats -->
        <v-row dense class="mb-4">
          <v-col cols="4">
            <div class="text-center">
              <div class="text-h4 font-weight-bold text-primary">
                {{ stats.summary.activeRules }}
              </div>
              <div class="text-caption text-medium-emphasis">Règles Actives</div>
            </div>
          </v-col>
          <v-col cols="4">
            <div class="text-center">
              <div class="text-h4 font-weight-bold text-success">
                {{ formatNumber(stats.notifications.totalSent) }}
              </div>
              <div class="text-caption text-medium-emphasis">Notifications Envoyées</div>
            </div>
          </v-col>
          <v-col cols="4">
            <div class="text-center">
              <div class="text-h4 font-weight-bold text-info">
                {{ stats.notifications.averagePerDay }}
              </div>
              <div class="text-caption text-medium-emphasis">Moyenne/Jour</div>
            </div>
          </v-col>
        </v-row>

        <v-divider class="my-3" />

        <!-- Top Rules -->
        <div class="mb-3">
          <div class="text-subtitle-2 font-weight-bold mb-2">
            <v-icon size="small" class="mr-1">mdi-chart-bar</v-icon>
            Top 5 Règles par Volume
          </div>
          <v-list density="compact" class="pa-0">
            <v-list-item
              v-for="rule in topRules"
              :key="rule.id"
              :to="`/settings/reminders/${rule.id}`"
              class="px-2"
            >
              <template #prepend>
                <v-avatar size="32" :color="getEntityColor(rule.entityType)">
                  <v-icon size="small" color="white">
                    {{ getEntityIcon(rule.entityType) }}
                  </v-icon>
                </v-avatar>
              </template>

              <v-list-item-title>
                <span class="text-capitalize">{{ rule.entityType }}</span> - {{ rule.triggerType }}
              </v-list-item-title>

              <v-list-item-subtitle>
                {{ rule.notificationsSent }} notifications
                <span v-if="rule.lastTriggered" class="ml-1">
                  · {{ formatRelativeTime(rule.lastTriggered) }}
                </span>
              </v-list-item-subtitle>

              <template #append>
                <v-chip
                  :color="rule.isActive ? 'success' : 'grey'"
                  size="x-small"
                  variant="flat"
                >
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </v-chip>
              </template>
            </v-list-item>

            <v-list-item v-if="topRules.length === 0" class="text-center">
              <v-list-item-title class="text-medium-emphasis">
                Aucune règle active
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </div>

        <v-divider class="my-3" />

        <!-- 7-Day Timeline -->
        <div v-if="stats.timeline && stats.timeline.length > 0">
          <div class="text-subtitle-2 font-weight-bold mb-2">
            <v-icon size="small" class="mr-1">mdi-chart-timeline-variant</v-icon>
            Activité (7 derniers jours)
          </div>
          <div class="timeline-chart">
            <div
              v-for="day in stats.timeline.slice(0, 7).reverse()"
              :key="day.date"
              class="timeline-day"
            >
              <div class="timeline-date">{{ formatShortDate(day.date) }}</div>
              <div class="timeline-bars">
                <v-tooltip location="top">
                  <template #activator="{ props }">
                    <div
                      v-bind="props"
                      class="timeline-bar success"
                      :style="{ width: getBarWidth(day.sent) }"
                    />
                  </template>
                  <span>{{ day.sent }} envoyées</span>
                </v-tooltip>
                <v-tooltip v-if="day.failed > 0" location="top">
                  <template #activator="{ props }">
                    <div
                      v-bind="props"
                      class="timeline-bar error"
                      :style="{ width: getBarWidth(day.failed) }"
                    />
                  </template>
                  <span>{{ day.failed }} échecs</span>
                </v-tooltip>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="mt-4">
          <v-btn
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-cog"
            :to="'/settings/reminders'"
            block
          >
            Gérer les Règles de Rappels
          </v-btn>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-6">
        <v-icon size="64" color="grey-lighten-1">mdi-bell-off</v-icon>
        <div class="text-subtitle-1 mt-2 text-medium-emphasis">
          Aucune statistique disponible
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ReminderStats {
  summary: {
    totalRules: number
    activeRules: number
    inactiveRules: number
  }
  notifications: {
    totalSent: number
    totalFailed: number
    successRate: number
    daysActive: number
    averagePerDay: number
  }
  topRules: Array<{
    id: string
    entityType: string
    triggerType: string
    priority: string
    isActive: boolean
    notificationsSent: number
    lastTriggered: string | null
  }>
  timeline: Array<{
    date: string
    sent: number
    failed: number
  }>
  lastJobRun: string | null
  periodDays: number
}

const loading = ref(true)
const error = ref<string | null>(null)
const stats = ref<ReminderStats | null>(null)

const topRules = computed(() => {
  if (!stats.value) return []
  return stats.value.topRules.slice(0, 5)
})

const maxTimelineValue = computed(() => {
  if (!stats.value || !stats.value.timeline.length) return 1
  return Math.max(...stats.value.timeline.map(day => day.sent + day.failed), 1)
})

onMounted(async () => {
  await loadStats()
})

async function loadStats() {
  loading.value = true
  error.value = null

  try {
    const response = await fetch('/api/reminder-rules/stats/detailed?daysBack=30', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to load reminder stats')
    }

    const data = await response.json()
    if (data.success && data.data) {
      stats.value = data.data
    } else {
      throw new Error(data.message || 'Invalid response format')
    }
  } catch (err) {
    console.error('Error loading reminder stats:', err)
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

function formatRelativeTime(date: string | null): string {
  if (!date) return 'Jamais'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

function formatShortDate(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function getEntityColor(entityType: string): string {
  const colors: Record<string, string> = {
    task: 'blue',
    quote: 'orange',
    invoice: 'green',
  }
  return colors[entityType] || 'grey'
}

function getEntityIcon(entityType: string): string {
  const icons: Record<string, string> = {
    task: 'mdi-check-circle',
    quote: 'mdi-file-document',
    invoice: 'mdi-receipt',
  }
  return icons[entityType] || 'mdi-bell'
}

function getBarWidth(value: number): string {
  const percentage = (value / maxTimelineValue.value) * 100
  return `${Math.max(percentage, 2)}%`
}
</script>

<style scoped>
.reminder-widget {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.timeline-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-day {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-date {
  font-size: 0.75rem;
  width: 48px;
  text-align: right;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
}

.timeline-bars {
  flex: 1;
  display: flex;
  gap: 2px;
  height: 20px;
}

.timeline-bar {
  height: 100%;
  border-radius: 2px;
  transition: all 0.2s;
  cursor: pointer;
}

.timeline-bar.success {
  background-color: rgb(var(--v-theme-success));
}

.timeline-bar.error {
  background-color: rgb(var(--v-theme-error));
}

.timeline-bar:hover {
  opacity: 0.8;
}
</style>
