<template>
  <v-card class="activity-feed">
    <v-card-item>
      <div class="feed-header">
        <h3 class="feed-title">
          <v-icon icon="mdi-history" class="me-2" />
          {{ t("teams.teamActivity") }}
        </h3>
        <div class="feed-controls">
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            @click="refreshFeed"
            :loading="loading"
          />
          <v-select
            v-model="selectedFilter"
            :items="filterOptions"
            item-title="label"
            item-value="value"
            @update:model-value="applyFilter"
            density="compact"
            class="filter-dropdown"
            hide-details
          />
        </div>
      </div>
    </v-card-item>

    <v-card-text>
      <div class="activity-content">
        <!-- Loading State -->
        <div v-if="loading" class="loading-state">
          <v-progress-circular indeterminate size="small" />
          <span>{{ t("teams.loadingActivities") }}</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="activities.length === 0" class="empty-state">
          <v-icon icon="mdi-history" class="empty-icon" />
          <p>{{ t("teams.noActivitiesFound") }}</p>
        </div>

        <!-- Activity Timeline -->
        <div v-else class="activity-timeline">
          <v-timeline side="end" truncate-line="both">
            <v-timeline-item
              v-for="item in activities"
              :key="item.id"
              :dot-color="getMarkerClass(item.type)"
              size="default"
            >
              <template v-slot:icon>
                <v-icon color="white">{{ getActivityIcon(item.type) }}</v-icon>
              </template>

              <v-card elevation="2">
                <v-card-text>
                  <div class="activity-item">
                    <div class="activity-header">
                      <div class="activity-user">
                        <v-avatar
                          :image="getUserAvatar(item.userId)"
                          :alt="getUserInitials(item.user)"
                          size="32"
                          class="user-avatar"
                        >
                          {{ getUserInitials(item.user) }}
                        </v-avatar>
                        <span class="user-name">
                          {{ item.user?.firstName }} {{ item.user?.lastName }}
                        </span>
                      </div>
                      <div class="activity-time">
                        <small>{{ formatTime(item.timestamp) }}</small>
                      </div>
                    </div>

                    <div class="activity-content">
                      <p class="activity-description">{{ item.description }}</p>

                      <div v-if="item.metadata" class="activity-metadata">
                        <div v-if="item.metadata.taskTitle" class="metadata-item">
                          <v-icon icon="mdi-check-square" size="small" class="me-1" />
                          <span>{{ item.metadata.taskTitle }}</span>
                        </div>

                        <div v-if="item.metadata.institutionName" class="metadata-item">
                          <v-icon icon="mdi-office-building" size="small" class="me-1" />
                          <span>{{ item.metadata.institutionName }}</span>
                        </div>

                        <div v-if="item.metadata.amount" class="metadata-item">
                          <v-icon icon="mdi-currency-usd" size="small" class="me-1" />
                          <span>${{ formatAmount(item.metadata.amount) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-timeline-item>
          </v-timeline>
        </div>

        <!-- Load More Button -->
        <div v-if="hasMore" class="load-more-section">
          <v-btn
            prepend-icon="mdi-chevron-down"
            variant="outlined"
            @click="loadMore"
            :loading="loadingMore"
            block
            class="load-more-btn"
          >
            {{ t("teams.loadMore") }}
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { teamsApi, type TeamActivity } from "@/services/api/teams"

const { t } = useI18n()

type ActivityItem = TeamActivity

interface Props {
  teamId: string
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 20,
})

const activities = ref<ActivityItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const selectedFilter = ref("all")
const page = ref(1)

const filterOptions = computed(() => [
  { label: t("teams.filters.allActivities"), value: "all" },
  { label: t("teams.filters.tasks"), value: "task" },
  { label: t("teams.filters.institutions"), value: "institution" },
  { label: t("teams.filters.interactions"), value: "user" },
  { label: t("teams.filters.engagementLetters"), value: "engagement_letter" },
])

const getMarkerClass = (type: string) => {
  const colorMap = {
    task_created: "blue",
    task_completed: "success",
    task_assigned: "blue",
    institution_created: "purple",
    institution_updated: "purple",
    quote_created: "orange",
    invoice_paid: "success",
    note_created: "indigo",
    meeting_created: "teal",
    call_created: "cyan",
    engagement_letter_created: "deep-purple",
    engagement_letter_sent: "info",
    engagement_letter_accepted: "success",
    engagement_letter_rejected: "error",
    engagement_letter_completed: "teal",
  }
  return colorMap[type as keyof typeof colorMap] || "grey"
}

const getActivityIcon = (type: string) => {
  const iconMap = {
    task_created: "mdi-clipboard-plus-outline",
    task_completed: "mdi-clipboard-check-outline",
    task_assigned: "mdi-clipboard-account-outline",
    institution_created: "mdi-domain-plus",
    institution_updated: "mdi-account-arrow-right",
    quote_created: "mdi-file-document-plus-outline",
    invoice_paid: "mdi-cash-check",
    note_created: "mdi-text-box-outline",
    meeting_created: "mdi-calendar-account",
    call_created: "mdi-phone-outline",
    engagement_letter_created: "mdi-file-sign",
    engagement_letter_sent: "mdi-send",
    engagement_letter_accepted: "mdi-check-decagram",
    engagement_letter_rejected: "mdi-close-circle",
    engagement_letter_completed: "mdi-clipboard-check",
  }
  return iconMap[type as keyof typeof iconMap] || "mdi-circle-outline"
}

const getUserAvatar = (userId: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
}

const getUserInitials = (user?: { firstName: string; lastName: string }) => {
  if (!user) return "??"
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

const formatTime = (timestamp: Date | string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffTime = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffTime / (1000 * 60))
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return t("time.justNow")
  if (diffMinutes < 60) return t("time.minutesAgo", { count: diffMinutes })
  if (diffHours < 24) return t("time.hoursAgo", { count: diffHours })
  if (diffDays < 7) return t("time.daysAgo", { count: diffDays })

  return date.toLocaleDateString()
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const loadActivities = async (reset = false) => {
  try {
    if (reset) {
      loading.value = true
      page.value = 1
    } else {
      loadingMore.value = true
    }

    // Map filter value to API parameter
    const typeFilter = selectedFilter.value === "all" ? undefined : selectedFilter.value

    // Fetch activities from API
    const response = await teamsApi.getTeamActivities(props.teamId, {
      page: page.value,
      limit: props.limit,
      type: typeFilter,
    })

    if (!response || !response.data) {
      console.error("No data received from API", response)
      return
    }

    // Backend returns: { success: true, data: [...activities], meta: {...} }
    const newActivities = Array.isArray(response.data) ? response.data : []

    if (reset) {
      activities.value = newActivities
    } else {
      activities.value.push(...newActivities)
    }

    // Update pagination state
    if (response.meta?.pagination) {
      hasMore.value = response.meta.pagination.hasMore
    } else {
      hasMore.value = false
    }
    page.value++
  } catch (error) {
    console.error("Error loading activities:", error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

const refreshFeed = () => {
  loadActivities(true)
}

const loadMore = () => {
  loadActivities(false)
}

const applyFilter = () => {
  // Reload activities with new filter
  loadActivities(true)
}

onMounted(() => {
  loadActivities(true)
})
</script>

<style scoped>
.activity-feed {
  height: 100%;
}

.feed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem 0;
}

.feed-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
}

.feed-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-dropdown {
  min-width: 140px;
}

.activity-content {
  padding: 1rem;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: block;
}

.activity-timeline {
  margin-top: 1rem;
}

.activity-item {
  padding: 0;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.activity-user {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}

.activity-time {
  color: #6b7280;
  font-size: 0.75rem;
}

.activity-description {
  margin: 0 0 0.5rem 0;
  color: #4b5563;
  font-size: 0.875rem;
  line-height: 1.4;
}

.activity-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.metadata-item {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.load-more-section {
  text-align: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.load-more-btn {
  width: 100%;
}

@media (max-width: 768px) {
  .feed-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
    padding: 0.75rem 0.75rem 0;
  }

  .feed-title {
    font-size: 1rem;
  }

  .feed-controls {
    justify-content: space-between;
  }

  .filter-dropdown {
    min-width: 120px;
    font-size: 0.875rem;
  }

  .activity-content {
    padding: 0.75rem;
  }

  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .activity-metadata {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .user-name {
    font-size: 0.8125rem;
  }

  .activity-description {
    font-size: 0.8125rem;
  }
}

@media (max-width: 480px) {
  .feed-header {
    padding: 0.5rem 0.5rem 0;
  }

  .activity-content {
    padding: 0.5rem;
  }

  .feed-title {
    font-size: 0.9375rem;
  }

  .filter-dropdown {
    min-width: 100px;
  }
}
</style>
