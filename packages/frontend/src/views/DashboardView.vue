<template>
  <AppLayout>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h3 font-weight-bold mb-2">Dashboard</h1>
            <p class="text-h6 text-medium-emphasis">
              Bienvenue, <strong>{{ authStore.userName }}</strong>
            </p>
          </div>
          <v-chip
            :text="getCurrentDate()"
            prepend-icon="mdi-calendar"
            color="primary"
            variant="tonal"
            size="large"
          />
        </div>
      </v-col>
    </v-row>

    <!-- Redirect Loading (if needed) -->
    <v-row v-if="shouldRedirectToBilling" class="justify-center">
      <v-col cols="12" md="8">
        <v-alert
          type="info"
          variant="tonal"
          prominent
        >
          <template v-slot:prepend>
            <v-progress-circular indeterminate size="24" />
          </template>
          <v-alert-title>Redirection en cours...</v-alert-title>
          Redirection vers le dashboard de facturation...
        </v-alert>
      </v-col>
    </v-row>

    <!-- Dashboard Loading Skeleton -->
    <DashboardSkeleton v-else-if="metricsLoading && !metrics" />

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col
          v-for="stat in statsCards"
          :key="stat.title"
          cols="12"
          sm="6"
          md="3"
        >
          <v-card
            class="stat-card"
            elevation="2"
            @click="$router.push(stat.route)"
            hover
          >
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-icon
                  :icon="stat.icon"
                  :color="stat.color"
                  size="28"
                  class="mr-3"
                />
                <span class="text-h6 font-weight-medium">{{ stat.title }}</span>
              </div>
              
              <div class="text-h3 font-weight-bold mb-2" :style="{ color: stat.color }">
                {{ stat.value }}
              </div>
              
              <p class="text-body-2 text-medium-emphasis mb-3">
                {{ stat.description }}
              </p>
              
              <v-btn
                :text="stat.actionLabel"
                :prepend-icon="stat.actionIcon"
                variant="text"
                color="primary"
                size="small"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Performance Metrics Widget -->
      <v-row v-if="metrics" class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-chart-timeline-variant" color="primary" class="mr-2" />
                Indicateurs de performance
              </div>
              <v-btn-group variant="outlined" density="compact">
                <v-btn
                  :color="period === 'week' ? 'primary' : undefined"
                  size="small"
                  @click="setPeriod('week')"
                >
                  7 jours
                </v-btn>
                <v-btn
                  :color="period === 'month' ? 'primary' : undefined"
                  size="small"
                  @click="setPeriod('month')"
                >
                  30 jours
                </v-btn>
                <v-btn
                  :color="period === 'quarter' ? 'primary' : undefined"
                  size="small"
                  @click="setPeriod('quarter')"
                >
                  90 jours
                </v-btn>
              </v-btn-group>
            </v-card-title>

            <v-card-text>
              <v-row>
                <!-- Revenue Growth -->
                <v-col cols="12" md="4">
                  <v-card variant="outlined" class="performance-card">
                    <v-card-text>
                      <div class="d-flex align-center justify-space-between mb-2">
                        <span class="text-subtitle-2 text-medium-emphasis">Croissance CA</span>
                        <v-icon :icon="metrics.growth.revenueGrowth >= 0 ? 'mdi-trending-up' : 'mdi-trending-down'"
                                :color="metrics.growth.revenueGrowth >= 0 ? 'success' : 'error'"
                                size="24" />
                      </div>
                      <div :class="`text-h4 font-weight-bold ${metrics.growth.revenueGrowth >= 0 ? 'text-success' : 'text-error'}`">
                        {{ metrics.growth.revenueGrowth > 0 ? '+' : '' }}{{ metrics.growth.revenueGrowth.toFixed(1) }}%
                      </div>
                      <div class="text-caption text-medium-emphasis mt-2">
                        vs période précédente
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- New Clients -->
                <v-col cols="12" md="4">
                  <v-card variant="outlined" class="performance-card">
                    <v-card-text>
                      <div class="d-flex align-center justify-space-between mb-2">
                        <span class="text-subtitle-2 text-medium-emphasis">Nouveaux clients</span>
                        <v-icon icon="mdi-account-multiple-plus" color="blue" size="24" />
                      </div>
                      <div class="text-h4 font-weight-bold text-blue">
                        {{ metrics.newClients.count }}
                      </div>
                      <div class="text-caption text-medium-emphasis mt-2">
                        <span :class="metrics.newClients.percentageChange >= 0 ? 'text-success' : 'text-error'">
                          {{ metrics.newClients.percentageChange > 0 ? '+' : '' }}{{ metrics.newClients.percentageChange.toFixed(1) }}%
                        </span> ce mois
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Conversion Rate -->
                <v-col cols="12" md="4">
                  <v-card variant="outlined" class="performance-card">
                    <v-card-text>
                      <div class="d-flex align-center justify-space-between mb-2">
                        <span class="text-subtitle-2 text-medium-emphasis">Taux de conversion</span>
                        <v-icon icon="mdi-percent" color="orange" size="24" />
                      </div>
                      <div class="text-h4 font-weight-bold text-orange">
                        {{ metrics.conversionRate.rate.toFixed(1) }}%
                      </div>
                      <div class="text-caption text-medium-emphasis mt-2">
                        {{ metrics.conversionRate.quotesAccepted }} / {{ metrics.conversionRate.quotesTotal }} devis acceptés
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Tasks Completed Growth -->
              <v-row class="mt-2">
                <v-col cols="12">
                  <v-alert
                    :color="metrics.growth.tasksCompletedGrowth >= 0 ? 'success' : 'info'"
                    variant="tonal"
                    density="compact"
                    class="mb-0"
                  >
                    <div class="d-flex align-center">
                      <v-icon :icon="metrics.growth.tasksCompletedGrowth >= 0 ? 'mdi-check-circle' : 'mdi-information'" class="mr-2" />
                      <span class="text-body-2">
                        <strong>{{ metrics.growth.tasksCompletedGrowth > 0 ? '+' : '' }}{{ metrics.growth.tasksCompletedGrowth.toFixed(1) }}%</strong>
                        de tâches complétées par rapport à la période précédente
                      </span>
                    </div>
                  </v-alert>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- KPI Charts Widget -->
      <v-row v-if="metrics" class="mb-6">
        <v-col cols="12">
          <KPIChartsWidget :period="period" />
        </v-col>
      </v-row>

      <!-- Smart Alerts & Timeline -->
      <v-row class="mb-6">
        <v-col cols="12" md="5">
          <SmartAlertsWidget />
        </v-col>
        <v-col cols="12" md="7">
          <TimelineWidget />
        </v-col>
      </v-row>

      <!-- Quick Actions (Personalized) -->
      <v-row class="mb-6">
        <v-col cols="12">
          <QuickActionsWidget />
        </v-col>
      </v-row>

      <!-- Recent Tasks Widget -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-check-circle" color="primary" class="mr-2" />
                Tâches récentes
              </div>
              <v-btn
                text="Voir tout"
                prepend-icon="mdi-arrow-right"
                color="primary"
                variant="text"
                @click="$router.push('/tasks')"
              />
            </v-card-title>

            <v-card-text v-if="tasksStore.loading">
              <div class="d-flex justify-center py-8">
                <v-progress-circular indeterminate size="32" />
              </div>
            </v-card-text>

            <v-card-text v-else-if="recentTasks.length === 0">
              <div class="text-center py-8">
                <v-icon size="48" color="grey-lighten-1" class="mb-4">mdi-check-all</v-icon>
                <p class="text-h6 text-medium-emphasis mb-2">Aucune tâche en cours</p>
                <p class="text-body-2 text-medium-emphasis">
                  Toutes vos tâches sont terminées ou vous n'avez pas de tâches assignées.
                </p>
                <v-btn
                  text="Créer une tâche"
                  prepend-icon="mdi-plus"
                  color="primary"
                  variant="elevated"
                  class="mt-4"
                  @click="$router.push('/tasks')"
                />
              </div>
            </v-card-text>

            <v-card-text v-else>
              <v-row>
                <v-col
                  v-for="task in recentTasks"
                  :key="task.id"
                  cols="12"
                  md="6"
                  class="mb-4"
                >
                  <v-card
                    variant="outlined"
                    class="task-widget-card"
                    hover
                    @click="$router.push('/tasks')"
                  >
                    <v-card-text class="pa-4">
                      <!-- Priority and status badges -->
                      <div class="d-flex justify-space-between align-start mb-3">
                        <v-chip
                          :color="getPriorityColor(task.priority)"
                          :prepend-icon="getPriorityIcon(task.priority)"
                          size="small"
                          variant="flat"
                          class="priority-chip"
                        >
                          {{ getPriorityLabel(task.priority) }}
                        </v-chip>

                        <div class="d-flex gap-1">
                          <v-chip
                            v-if="isOverdue(task)"
                            color="error"
                            size="small"
                            variant="outlined"
                          >
                            <v-icon start size="small">mdi-alert-circle</v-icon>
                            En retard
                          </v-chip>
                          <v-chip
                            v-else-if="isDueSoon(task)"
                            color="warning"
                            size="small"
                            variant="outlined"
                          >
                            <v-icon start size="small">mdi-clock-outline</v-icon>
                            Bientôt
                          </v-chip>
                        </div>
                      </div>

                      <!-- Task title -->
                      <h4 class="task-title text-h6 font-weight-medium mb-2">
                        {{ task.title }}
                      </h4>

                      <!-- Task description (truncated) -->
                      <p v-if="task.description" class="task-description text-body-2 text-medium-emphasis mb-3">
                        {{ truncateText(task.description, 80) }}
                      </p>

                      <!-- Meta information -->
                      <div class="task-meta d-flex flex-wrap gap-3">
                        <!-- Assignee -->
                        <div v-if="task.assignee" class="meta-item d-flex align-center">
                          <v-avatar
                            :image="getAvatarUrl(task.assignee.id)"
                            :alt="getInitials(task.assignee.firstName, task.assignee.lastName)"
                            size="24"
                            class="mr-2"
                          >
                            <span class="avatar-text">{{ getInitials(task.assignee.firstName, task.assignee.lastName) }}</span>
                          </v-avatar>
                          <span class="text-caption">{{ task.assignee.firstName }} {{ task.assignee.lastName }}</span>
                        </div>

                        <!-- Due date -->
                        <div v-if="task.dueDate" class="meta-item d-flex align-center">
                          <v-icon size="16" :color="getDueDateColor(task)" class="mr-1">mdi-calendar</v-icon>
                          <span class="text-caption" :class="getDueDateClass(task)">
                            {{ formatDueDate(task.dueDate) }}
                          </span>
                        </div>

                        <!-- Institution -->
                        <div v-if="task.institution" class="meta-item d-flex align-center">
                          <v-icon size="16" color="primary" class="mr-1">mdi-office-building</v-icon>
                          <span class="text-caption">{{ task.institution.name }}</span>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Development Notice -->
      <v-row>
        <v-col cols="12">
          <v-alert
            type="info"
            variant="tonal"
            prominent
            border="start"
            closable
          >
            <v-alert-title class="text-h6 mb-2">
              Dashboard en développement
            </v-alert-title>
            
            <p class="mb-4">
              Le dashboard principal est en cours de développement. 
              Explorez les différentes sections via la navigation latérale.
            </p>
            
            <v-btn
              text="Découvrir Billing Analytics"
              prepend-icon="mdi-chart-bar"
              color="primary"
              variant="elevated"
              @click="$router.push('/billing/analytics')"
            />
          </v-alert>
        </v-col>
      </v-row>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import TimelineWidget from "@/components/dashboard/TimelineWidget.vue"
import SmartAlertsWidget from "@/components/dashboard/SmartAlertsWidget.vue"
import KPIChartsWidget from "@/components/dashboard/KPIChartsWidget.vue"
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget.vue"
import { DashboardSkeleton } from "@/components/skeletons"
import { useAuthStore } from "@/stores/auth"
import { useInstitutionsStore } from "@/stores/institutions"
import { useTasksStore } from "@/stores/tasks"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { dashboardApi, type DashboardMetrics } from "@/services/api/dashboard"

const authStore = useAuthStore()
const institutionsStore = useInstitutionsStore()
const tasksStore = useTasksStore()
const router = useRouter()

// Dashboard metrics state
const metrics = ref<DashboardMetrics | null>(null)
const metricsLoading = ref(false)
const metricsError = ref<string | null>(null)
const period = ref<'week' | 'month' | 'quarter'>('month')

// Check if user should be automatically redirected to billing analytics
const shouldRedirectToBilling = computed(() => {
  return false
})

// Recent tasks for dashboard widget (max 4, prioritized by status and due date)
const recentTasks = computed(() => {
  const allTasks = tasksStore.tasks
  const userId = authStore.user?.id

  // Filter tasks assigned to current user or unassigned, exclude completed
  const userTasks = allTasks.filter(task =>
    (task.assigneeId === userId || !task.assigneeId) &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'
  )

  // Sort by priority: overdue first, then due soon, then by due date, then by status
  const sortedTasks = userTasks.sort((a, b) => {
    const now = new Date()
    const aDue = a.dueDate ? new Date(a.dueDate) : null
    const bDue = b.dueDate ? new Date(b.dueDate) : null

    // Overdue tasks first
    const aOverdue = aDue && aDue < now
    const bOverdue = bDue && bDue < now
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1

    // Due soon next (within 3 days)
    const aDueSoon = aDue && !aOverdue && (aDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3
    const bDueSoon = bDue && !bOverdue && (bDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3
    if (aDueSoon && !bDueSoon) return -1
    if (!aDueSoon && bDueSoon) return 1

    // Then by due date (earliest first)
    if (aDue && bDue) {
      return aDue.getTime() - bDue.getTime()
    }
    if (aDue && !bDue) return -1
    if (!aDue && bDue) return 1

    // Finally by priority
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  return sortedTasks.slice(0, 4)
})

// Get current date formatted
const getCurrentDate = () => {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Task widget helper functions
const getPriorityLabel = (priority: string) => {
  const labels = {
    low: "Faible",
    medium: "Moyenne",
    high: "Élevée",
    urgent: "Urgente",
  }
  return labels[priority as keyof typeof labels] || priority
}

const getPriorityColor = (priority: string) => {
  const colors = {
    low: "success",
    medium: "info",
    high: "warning",
    urgent: "error",
  }
  return colors[priority as keyof typeof colors] || "grey"
}

const getPriorityIcon = (priority: string) => {
  const icons = {
    low: "mdi-priority-low",
    medium: "mdi-priority-medium",
    high: "mdi-priority-high",
    urgent: "mdi-alert-circle",
  }
  return icons[priority as keyof typeof icons] || "mdi-priority-medium"
}

const isOverdue = (task: any) => {
  if (!task.dueDate || task.status === "completed") return false
  return new Date(task.dueDate) < new Date()
}

const isDueSoon = (task: any) => {
  if (!task.dueDate || task.status === "completed") return false
  const dueDate = new Date(task.dueDate)
  const now = new Date()
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 3 && diffDays > 0
}

const getDueDateColor = (task: any) => {
  if (isOverdue(task)) return "error"
  if (isDueSoon(task)) return "warning"
  return "success"
}

const getDueDateClass = (task: any) => ({
  "due-date-overdue": isOverdue(task),
  "due-date-soon": isDueSoon(task) && !isOverdue(task),
})

const formatDueDate = (date: Date | string) => {
  const dueDate = new Date(date)
  const now = new Date()
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return "Demain"
  if (diffDays === -1) return "Hier"
  if (diffDays < 0) return `En retard de ${Math.abs(diffDays)} j.`
  if (diffDays <= 7) return `Dans ${diffDays} j.`

  return dueDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short'
  })
}

const getAvatarUrl = (userId: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

// Stats cards data - updated with real metrics from backend
const statsCards = computed(() => {
  if (!metrics.value) {
    // Fallback to store data while loading
    return [
      {
        title: 'Institutions',
        value: institutionsStore.institutions.length.toString(),
        description: `${institutionsStore.institutions.filter(inst => inst.isActive).length} actives`,
        icon: 'mdi-domain',
        color: 'blue',
        actionLabel: 'Voir tout',
        actionIcon: 'mdi-arrow-right',
        route: '/institutions'
      },
      {
        title: 'Tâches',
        value: tasksStore.taskStats.total.toString(),
        description: `${tasksStore.taskStats.inProgress} en cours, ${tasksStore.taskStats.overdue} en retard`,
        icon: 'mdi-check-circle',
        color: tasksStore.taskStats.overdue > 0 ? 'error' : 'green',
        actionLabel: 'Gérer',
        actionIcon: 'mdi-arrow-right',
        route: '/tasks'
      },
      {
        title: 'Équipe',
        value: '...',
        description: 'Chargement...',
        icon: 'mdi-account-group',
        color: 'purple',
        actionLabel: 'Voir équipe',
        actionIcon: 'mdi-arrow-right',
        route: '/team'
      },
      {
        title: 'CA du mois',
        value: '...',
        description: 'Chargement...',
        icon: 'mdi-chart-line',
        color: 'orange',
        actionLabel: 'Analyser',
        actionIcon: 'mdi-arrow-right',
        route: '/billing/analytics'
      }
    ]
  }

  const { institutions, tasks, team, billing } = metrics.value

  return [
    {
      title: 'Institutions',
      value: institutions.total.toString(),
      description: `${institutions.active} actives, ${institutions.inactive} inactives`,
      icon: 'mdi-domain',
      color: 'blue',
      actionLabel: 'Voir tout',
      actionIcon: 'mdi-arrow-right',
      route: '/institutions'
    },
    {
      title: 'Tâches',
      value: tasks.total.toString(),
      description: `${tasks.inProgress} en cours, ${tasks.overdue} en retard`,
      icon: 'mdi-check-circle',
      color: tasks.overdue > 0 ? 'error' : 'green',
      actionLabel: 'Gérer',
      actionIcon: 'mdi-arrow-right',
      route: '/tasks'
    },
    {
      title: 'Équipe',
      value: team.activeMembers.toString(),
      description: `${team.totalMembers} membres, ${team.teams} équipe(s)`,
      icon: 'mdi-account-group',
      color: 'purple',
      actionLabel: 'Voir équipe',
      actionIcon: 'mdi-arrow-right',
      route: '/team'
    },
    {
      title: 'CA du mois',
      value: formatCurrency(billing.totalRevenue),
      description: `${billing.invoicesCount} factures, ${billing.quotesCount} devis`,
      icon: 'mdi-chart-line',
      color: 'orange',
      actionLabel: 'Analyser',
      actionIcon: 'mdi-arrow-right',
      route: '/billing/analytics'
    }
  ]
})

// Format currency helper
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Load dashboard metrics from API
const loadMetrics = async () => {
  metricsLoading.value = true
  metricsError.value = null

  try {
    metrics.value = await dashboardApi.getMetrics({ period: period.value })
  } catch (error) {
    console.error('Error loading dashboard metrics:', error)
    metricsError.value = error instanceof Error ? error.message : 'Failed to load metrics'
  } finally {
    metricsLoading.value = false
  }
}

// Set period and reload metrics
const setPeriod = (newPeriod: 'week' | 'month' | 'quarter') => {
  period.value = newPeriod
  loadMetrics()
}

// Auto-redirect logic (if needed)
onMounted(async () => {
  // Fetch data for dashboard
  await Promise.all([
    loadMetrics(),
    tasksStore.fetchTasks(),
    institutionsStore.fetchInstitutions()
  ])

  if (shouldRedirectToBilling.value) {
    setTimeout(() => {
      router.push("/billing/analytics")
    }, 2000)
  }
})
</script>

<style scoped>
.stat-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.performance-card {
  transition: all 0.2s ease-in-out;
  height: 100%;
}

.performance-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.quick-action-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.quick-action-card:hover {
  transform: translateY(-2px);
}

.task-widget-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-radius: 12px;
}

.task-widget-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-title {
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-description {
  line-height: 1.4;
  margin-bottom: 0.75rem;
}

.task-meta {
  margin-top: auto;
}

.meta-item {
  opacity: 0.8;
}

.avatar-text {
  font-size: 0.625rem;
  font-weight: 600;
  color: #374151;
}

.priority-chip {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.7rem;
}

.due-date-overdue {
  color: #dc2626 !important;
  font-weight: 600;
}

.due-date-soon {
  color: #d97706 !important;
  font-weight: 600;
}

/* Responsive design for task widget */
@media (max-width: 768px) {
  .task-widget-card .v-card-text {
    padding: 1rem;
  }

  .task-title {
    font-size: 1.1rem !important;
    margin-bottom: 0.5rem;
  }

  .task-description {
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .task-meta {
    gap: 0.5rem;
  }

  .meta-item {
    font-size: 0.75rem;
  }

  .meta-item .v-avatar {
    margin-right: 0.25rem !important;
  }
}

@media (max-width: 480px) {
  .task-widget-card .v-card-text {
    padding: 0.875rem;
  }

  .task-title {
    font-size: 1rem !important;
  }

  .task-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .meta-item {
    font-size: 0.7rem;
  }
}
</style>
