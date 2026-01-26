<template>
  <AppLayout>
    <!-- Page Header -->
    <v-row class="mb-4 mb-md-6">
      <v-col cols="12">
        <div class="dashboard-header">
          <v-chip
            :text="getCurrentDate()"
            prepend-icon="mdi-calendar"
            color="primary"
            variant="tonal"
            size="small"
            class="dashboard-date-chip"
          />
          <div class="dashboard-header-text">
            <h1 class="text-h5 text-md-h3 font-weight-bold mb-1 mb-md-2">
              {{ t("dashboard.title") }}
            </h1>
            <p class="text-body-2 text-md-h6 text-medium-emphasis">
              {{ t("dashboard.welcome") }},
              <strong>{{ authStore.user?.firstName || "User" }}</strong> !
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Redirect Loading (if needed) -->
    <v-row v-if="shouldRedirectToBilling" class="justify-center">
      <v-col cols="12" md="8">
        <v-alert type="info" variant="tonal" prominent>
          <template v-slot:prepend>
            <v-progress-circular indeterminate size="24" />
          </template>
          <v-alert-title>{{ t("dashboard.redirecting") }}</v-alert-title>
          {{ t("dashboard.redirectingToBilling") }}
        </v-alert>
      </v-col>
    </v-row>

    <!-- Dashboard Loading Skeleton -->
    <DashboardSkeleton v-else-if="metricsLoading && !metrics" />

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Stats Cards -->
      <v-row id="tour-stats-cards" class="mb-6">
        <v-col v-for="stat in statsCards" :key="stat.title" cols="12" sm="6" md="3">
          <v-card class="stat-card" elevation="2" @click="$router.push(stat.route)" hover>
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-icon :icon="stat.icon" :color="stat.color" size="28" class="mr-3" />
                <span class="text-h6 font-weight-medium">{{ stat.title }}</span>
              </div>

              <div class="stat-value" :style="{ color: stat.color }">
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
                style="pointer-events: none"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Performance Metrics Widget -->
      <v-row v-if="metrics" class="mb-6">
        <v-col cols="12">
          <v-card id="tour-performance-metrics" elevation="2">
            <v-card-title class="performance-header">
              <div class="d-flex align-center">
                <v-icon icon="mdi-chart-timeline-variant" color="primary" class="mr-2" size="small" />
                <span>{{ t("dashboard.performanceIndicators") }}</span>
              </div>
              <v-btn-toggle
                id="tour-period-selector"
                v-model="period"
                mandatory
                density="compact"
                variant="outlined"
                class="period-selector"
              >
                <v-btn value="week" size="small">{{ t("dashboard.period.week") }}</v-btn>
                <v-btn value="month" size="small">{{ t("dashboard.period.month") }}</v-btn>
                <v-btn value="quarter" size="small">{{ t("dashboard.period.quarter") }}</v-btn>
              </v-btn-toggle>
            </v-card-title>

            <v-card-text class="pa-2 pa-sm-4">
              <v-row dense>
                <!-- Revenue Growth -->
                <v-col cols="12" sm="4">
                  <div class="performance-metric">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-caption text-medium-emphasis">{{
                        t("dashboard.metrics.revenueGrowth")
                      }}</span>
                      <v-icon
                        :icon="
                          metrics.growth.revenueGrowth >= 0
                            ? 'mdi-trending-up'
                            : 'mdi-trending-down'
                        "
                        :color="metrics.growth.revenueGrowth >= 0 ? 'success' : 'error'"
                        size="20"
                      />
                    </div>
                    <div
                      :class="`text-h5 text-sm-h4 font-weight-bold ${
                        metrics.growth.revenueGrowth >= 0
                          ? 'text-success'
                          : 'text-error'
                      }`"
                    >
                      {{ metrics.growth.revenueGrowth > 0 ? "+" : ""
                      }}{{ metrics.growth.revenueGrowth.toFixed(1) }}%
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ t("dashboard.metrics.vsPreviousPeriod") }}
                    </div>
                  </div>
                </v-col>

                <!-- New Clients -->
                <v-col cols="12" sm="4">
                  <div class="performance-metric">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-caption text-medium-emphasis">{{
                        t("dashboard.metrics.newClients")
                      }}</span>
                      <v-icon icon="mdi-account-multiple-plus" color="blue" size="20" />
                    </div>
                    <div class="text-h5 text-sm-h4 font-weight-bold text-blue">
                      {{ metrics.newClients.count }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      <span
                        :class="
                          metrics.newClients.percentageChange >= 0
                            ? 'text-success'
                            : 'text-error'
                        "
                      >
                        {{ metrics.newClients.percentageChange > 0 ? "+" : ""
                        }}{{ metrics.newClients.percentageChange.toFixed(1) }}%
                      </span>
                      {{ t("dashboard.metrics.thisMonth") }}
                    </div>
                  </div>
                </v-col>

                <!-- Conversion Rate -->
                <v-col cols="12" sm="4">
                  <div class="performance-metric">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-caption text-medium-emphasis">{{
                        t("dashboard.metrics.conversionRate")
                      }}</span>
                      <v-icon icon="mdi-percent" color="orange" size="20" />
                    </div>
                    <div class="text-h5 text-sm-h4 font-weight-bold text-orange">
                      {{ metrics.conversionRate.rate.toFixed(1) }}%
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ metrics.conversionRate.quotesAccepted }} /
                      {{ metrics.conversionRate.quotesTotal }}
                      {{ t("dashboard.metrics.quotesAccepted") }}
                    </div>
                  </div>
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
                      <v-icon
                        :icon="
                          metrics.growth.tasksCompletedGrowth >= 0
                            ? 'mdi-check-circle'
                            : 'mdi-information'
                        "
                        class="mr-2"
                      />
                      <span class="text-body-2">
                        <strong
                          >{{ metrics.growth.tasksCompletedGrowth > 0 ? "+" : ""
                          }}{{ metrics.growth.tasksCompletedGrowth.toFixed(1) }}%</strong
                        >
                        {{ t("dashboard.metrics.vsPreviousPeriod") }}
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
          <div id="tour-kpi-charts">
            <KPIChartsWidget :period="period" />
          </div>
        </v-col>
      </v-row>

      <!-- Smart Alerts & Timeline -->
      <v-row class="mb-6">
        <v-col cols="12" md="5">
          <div id="tour-smart-alerts">
            <SmartAlertsWidget />
          </div>
        </v-col>
        <v-col cols="12" md="7">
          <div id="tour-timeline">
            <TimelineWidget />
          </div>
        </v-col>
      </v-row>

      <!-- Quick Actions (Personalized) -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div id="tour-quick-actions">
            <QuickActionsWidget />
          </div>
        </v-col>
      </v-row>

      <!-- Hot Leads Widget -->
      <v-row class="mb-6">
        <v-col cols="12">
          <div id="tour-hot-leads">
            <HotLeadsWidget />
          </div>
        </v-col>
      </v-row>

      <!-- Recent Tasks Widget -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card id="tour-recent-tasks" elevation="2">
            <v-card-title
              class="d-flex align-center justify-space-between card-title-responsive"
            >
              <div class="d-flex align-center">
                <v-icon
                  icon="mdi-check-circle"
                  color="primary"
                  class="mr-2"
                  size="small"
                />
                <span>{{ t("tasks.recent") }}</span>
              </div>
              <v-btn
                :text="t('dashboard.stats.viewAll')"
                prepend-icon="mdi-arrow-right"
                color="primary"
                variant="text"
                size="small"
                @click="$router.push('/tasks')"
              />
            </v-card-title>

            <v-card-text v-if="tasksStore.loading" class="text-center py-8">
              <v-progress-circular indeterminate size="32" />
            </v-card-text>

            <v-card-text v-else-if="recentTasks.length === 0" class="text-center py-8">
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-check-all</v-icon>
              <p class="text-body-1 font-weight-medium">{{ t("tasks.noTasks") }}</p>
              <p class="text-body-2 text-medium-emphasis">
                {{ t("tasks.noTasksDescription") }}
              </p>
              <v-btn
                :text="t('tasks.createTask')"
                prepend-icon="mdi-plus"
                color="primary"
                variant="elevated"
                class="mt-4"
                size="small"
                @click="$router.push('/tasks')"
              />
            </v-card-text>

            <v-card-text v-else class="pa-2 pa-sm-4">
              <div class="tasks-list">
                <div
                  v-for="task in recentTasks"
                  :key="task.id"
                  class="task-item"
                  @click="$router.push('/tasks')"
                >
                  <div class="task-content">
                    <!-- Priority indicator -->
                    <div
                      class="task-priority-indicator"
                      :class="`priority-${task.priority}`"
                    />

                    <!-- Task info -->
                    <div class="task-info">
                      <div class="task-header">
                        <span class="task-title">{{ task.title }}</span>
                        <div class="task-badges">
                          <v-chip
                            v-if="isOverdue(task)"
                            color="error"
                            size="x-small"
                            variant="flat"
                            density="compact"
                            class="task-status-chip"
                          >
                            En retard
                          </v-chip>
                          <v-chip
                            v-else-if="isDueSoon(task)"
                            color="warning"
                            size="x-small"
                            variant="flat"
                            density="compact"
                            class="task-status-chip"
                          >
                            Bientôt
                          </v-chip>
                        </div>
                      </div>
                      <div class="task-meta">
                        <span
                          v-if="task.dueDate"
                          class="meta-item"
                          :class="getDueDateClass(task)"
                        >
                          <v-icon size="12" class="mr-1">mdi-calendar</v-icon>
                          {{ formatDueDate(task.dueDate) }}
                        </span>
                        <span v-if="task.assignee" class="meta-item">
                          <v-icon size="12" class="mr-1">mdi-account</v-icon>
                          {{ task.assignee.firstName }}
                        </span>
                        <span v-if="task.institution" class="meta-item">
                          <v-icon size="12" class="mr-1">mdi-office-building</v-icon>
                          {{ truncateText(task.institution.name, 20) }}
                        </span>
                      </div>
                    </div>

                    <!-- Arrow -->
                    <v-icon
                      icon="mdi-chevron-right"
                      size="20"
                      color="grey"
                      class="task-arrow"
                    />
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Development Notice -->
      <v-row>
        <v-col cols="12">
          <v-alert type="info" variant="tonal" prominent border="start" closable>
            <v-alert-title class="text-h6 mb-2">
              {{ t("dashboard.development.title") }}
            </v-alert-title>

            <p class="mb-4">
              {{ t("dashboard.development.description") }}
            </p>

            <v-btn
              :text="t('dashboard.development.discoverBilling')"
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
import HotLeadsWidget from "@/components/dashboard/HotLeadsWidget.vue"
import KPIChartsWidget from "@/components/dashboard/KPIChartsWidget.vue"
import QuickActionsWidget from "@/components/dashboard/QuickActionsWidget.vue"
import SmartAlertsWidget from "@/components/dashboard/SmartAlertsWidget.vue"
import TimelineWidget from "@/components/dashboard/TimelineWidget.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { DashboardSkeleton } from "@/components/skeletons"
import { dashboardApi, type DashboardMetrics } from "@/services/api/dashboard"
import { useAuthStore } from "@/stores/auth"
import { useInstitutionsStore } from "@/stores/institutions"
import { useTasksStore } from "@/stores/tasks"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const authStore = useAuthStore()
const institutionsStore = useInstitutionsStore()
const tasksStore = useTasksStore()
const router = useRouter()
const { t } = useI18n()

// Dashboard metrics state
const metrics = ref<DashboardMetrics | null>(null)
const metricsLoading = ref(false)
const metricsError = ref<string | null>(null)
const period = ref<"week" | "month" | "quarter">("month")

// Check if user should be automatically redirected to billing analytics
const shouldRedirectToBilling = computed(() => {
  return false
})

// Recent tasks for dashboard widget (max 4, prioritized by status and due date)
const recentTasks = computed(() => {
  const allTasks = tasksStore.tasks
  const userId = authStore.user?.id

  // Filter tasks assigned to current user or unassigned, exclude completed
  const userTasks = allTasks.filter(
    (task) =>
      (task.assigneeId === userId || !task.assigneeId) &&
      task.status !== "completed" &&
      task.status !== "cancelled",
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
    const aDueSoon =
      aDue && !aOverdue && (aDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3
    const bDueSoon =
      bDue && !bOverdue && (bDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 3
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
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Task widget helper functions
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

const getDueDateClass = (task: any) => ({
  "due-date-overdue": isOverdue(task),
  "due-date-soon": isDueSoon(task) && !isOverdue(task),
})

const formatDueDate = (date: Date | string) => {
  const dueDate = new Date(date)
  const now = new Date()
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t("tasks.today")
  if (diffDays === 1) return t("tasks.tomorrow")
  if (diffDays === -1) return t("tasks.yesterday")
  if (diffDays < 0)
    return `${t("tasks.overdueBy")} ${Math.abs(diffDays)} ${t("tasks.days")}`
  if (diffDays <= 7) return `${t("tasks.dueIn")} ${diffDays} ${t("tasks.days")}`

  return dueDate.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
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
        title: t("dashboard.stats.institutions"),
        value: institutionsStore.institutions.length.toString(),
        description: `${
          institutionsStore.institutions.filter((inst) => inst.isActive).length
        } ${t("dashboard.stats.active")}`,
        icon: "mdi-domain",
        color: "blue",
        actionLabel: t("dashboard.stats.viewAll"),
        actionIcon: "mdi-arrow-right",
        route: "/institutions",
      },
      {
        title: t("dashboard.stats.tasks"),
        value: tasksStore.taskStats.total.toString(),
        description: `${tasksStore.taskStats.inProgress} ${t(
          "dashboard.stats.inProgress",
        )}, ${tasksStore.taskStats.overdue} ${t("tasks.overdue")}`,
        icon: "mdi-check-circle",
        color: tasksStore.taskStats.overdue > 0 ? "error" : "green",
        actionLabel: t("dashboard.stats.manage"),
        actionIcon: "mdi-arrow-right",
        route: "/tasks",
      },
      {
        title: t("dashboard.stats.team"),
        value: "...",
        description: t("messages.loading"),
        icon: "mdi-account-group",
        color: "purple",
        actionLabel: t("dashboard.stats.viewTeam"),
        actionIcon: "mdi-arrow-right",
        route: "/team",
      },
      {
        title: t("dashboard.stats.monthlyRevenue"),
        value: "...",
        description: t("messages.loading"),
        icon: "mdi-chart-line",
        color: "orange",
        actionLabel: t("dashboard.stats.analyze"),
        actionIcon: "mdi-arrow-right",
        route: "/billing/analytics",
      },
    ]
  }

  const { institutions, tasks, team, billing } = metrics.value

  return [
    {
      title: t("dashboard.stats.institutions"),
      value: institutions.total.toString(),
      description: `${institutions.active} ${t("dashboard.stats.active")}, ${
        institutions.inactive
      } ${t("dashboard.stats.inactive")}`,
      icon: "mdi-domain",
      color: "blue",
      actionLabel: t("dashboard.stats.viewAll"),
      actionIcon: "mdi-arrow-right",
      route: "/institutions",
    },
    {
      title: t("dashboard.stats.tasks"),
      value: tasks.total.toString(),
      description: `${tasks.inProgress} ${t("dashboard.stats.inProgress")}, ${
        tasks.overdue
      } ${t("tasks.overdue")}`,
      icon: "mdi-check-circle",
      color: tasks.overdue > 0 ? "error" : "green",
      actionLabel: t("dashboard.stats.manage"),
      actionIcon: "mdi-arrow-right",
      route: "/tasks",
    },
    {
      title: t("dashboard.stats.team"),
      value: team.activeMembers.toString(),
      description: `${team.totalMembers} ${t("dashboard.stats.members")}, ${
        team.teams
      } ${t("dashboard.stats.teams")}`,
      icon: "mdi-account-group",
      color: "purple",
      actionLabel: t("dashboard.stats.viewTeam"),
      actionIcon: "mdi-arrow-right",
      route: "/team",
    },
    {
      title: t("dashboard.stats.monthlyRevenue"),
      value: formatCurrency(billing.totalRevenue),
      description: `${billing.invoicesCount} ${t("dashboard.stats.invoices")}, ${
        billing.quotesCount
      } ${t("dashboard.stats.quotes")}`,
      icon: "mdi-chart-line",
      color: "orange",
      actionLabel: t("dashboard.stats.analyze"),
      actionIcon: "mdi-arrow-right",
      route: "/billing/analytics",
    },
  ]
})

// Format currency helper with compact notation (2099 → 2.10k€)
const formatCurrency = (amount: number): string => {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    notation: "compact",
    compactDisplay: "short",
  }).format(amount)
  // Remove space before € and between number and k/M
  return formatted.replace(/\s+/g, "").replace(",", ".")
}

// Load dashboard metrics from API
const loadMetrics = async () => {
  metricsLoading.value = true
  metricsError.value = null

  try {
    metrics.value = await dashboardApi.getMetrics({ period: period.value })
  } catch (error) {
    console.error("Error loading dashboard metrics:", error)
    metricsError.value = error instanceof Error ? error.message : "Failed to load metrics"
  } finally {
    metricsLoading.value = false
  }
}

// Watch period changes to reload metrics
watch(period, () => {
  loadMetrics()
})

// Auto-redirect logic (if needed)
onMounted(async () => {
  // Fetch data for dashboard
  await Promise.all([
    loadMetrics(),
    tasksStore.fetchTasks(),
    institutionsStore.fetchInstitutions(),
  ])

  if (shouldRedirectToBilling.value) {
    setTimeout(() => {
      router.push("/billing/analytics")
    }, 2000)
  }
})
</script>

<style scoped>
.dashboard-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.dashboard-date-chip {
  align-self: flex-end;
  order: -1;
}

.dashboard-header-text {
  min-width: 0;
}

@media (min-width: 600px) {
  .dashboard-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }

  .dashboard-date-chip {
    align-self: auto;
    order: 1;
  }
}

.card-title-responsive {
  font-size: 1rem;
  padding: 12px 16px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-value {
  font-size: clamp(1.5rem, 5vw, 2.125rem);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 0.5rem;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* Performance metrics header */
.performance-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  font-size: 1rem;
  padding: 12px 16px;
}

.period-selector {
  align-self: stretch;
}

.period-selector :deep(.v-btn) {
  flex: 1;
}

.performance-metric {
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

@media (min-width: 600px) {
  .performance-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .period-selector {
    align-self: auto;
  }

  .period-selector :deep(.v-btn) {
    flex: none;
  }
}

/* Tasks list styles */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  cursor: pointer;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transition: all 0.2s ease;
}

.task-item:hover {
  background: rgba(var(--v-theme-primary), 0.04);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.task-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.task-priority-indicator {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  flex-shrink: 0;
}

.task-priority-indicator.priority-low {
  background-color: rgb(var(--v-theme-success));
}

.task-priority-indicator.priority-medium {
  background-color: rgb(var(--v-theme-info));
}

.task-priority-indicator.priority-high {
  background-color: rgb(var(--v-theme-warning));
}

.task-priority-indicator.priority-urgent {
  background-color: rgb(var(--v-theme-error));
}

.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-badges {
  display: flex;
  gap: 4px;
}

.task-status-chip {
  padding-top: 2px;
  font-size: 0.625rem;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.task-meta .meta-item {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.task-arrow {
  flex-shrink: 0;
  opacity: 0.5;
  transition: all 0.2s ease;
}

.task-item:hover .task-arrow {
  opacity: 1;
  transform: translateX(2px);
}

.due-date-overdue {
  color: rgb(var(--v-theme-error)) !important;
  font-weight: 600;
}

.due-date-soon {
  color: rgb(var(--v-theme-warning)) !important;
  font-weight: 600;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .card-title-responsive {
    font-size: 0.875rem;
    padding: 8px 12px;
  }

  .task-content {
    padding: 10px;
    gap: 10px;
  }

  .task-priority-indicator {
    height: 32px;
  }

  .task-meta {
    gap: 8px;
  }

  .task-meta .meta-item {
    font-size: 0.7rem;
  }
}
</style>
