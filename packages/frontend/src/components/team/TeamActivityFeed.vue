<template>
  <v-card class="activity-feed">
    <v-card-item>
      <div class="feed-header">
        <h3 class="feed-title">
          <v-icon icon="mdi-history" class="me-2" />
          Team Activity
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
          <span>Loading activities...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredActivities.length === 0" class="empty-state">
          <v-icon icon="mdi-history" class="empty-icon" />
          <p>No recent activities found</p>
        </div>

        <!-- Activity Timeline -->
        <div v-else class="activity-timeline">
          <v-timeline
            :items="timelineItems"
            class="activity-timeline"
            size="small"
          >
            <template #item="{ item }">
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
            </template>
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
            Load More
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"

interface ActivityItem {
  id: string
  type:
    | "task_created"
    | "task_completed"
    | "task_assigned"
    | "institution_created"
    | "institution_updated"
    | "quote_created"
    | "invoice_paid"
    | "user_login"
  userId: string
  description: string
  timestamp: Date
  user?: {
    id: string
    firstName: string
    lastName: string
    avatarSeed: string
  }
  metadata?: {
    taskTitle?: string
    institutionName?: string
    amount?: number
    [key: string]: any
  }
}

interface Props {
  teamId?: string
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

const filterOptions = [
  { label: "All Activities", value: "all" },
  { label: "Tasks", value: "task" },
  { label: "Institutions", value: "institution" },
  { label: "Billing", value: "billing" },
  { label: "User Actions", value: "user" },
]

const filteredActivities = computed(() => {
  if (selectedFilter.value === "all") {
    return activities.value
  }

  const typeMap = {
    task: ["task_created", "task_completed", "task_assigned"],
    institution: ["institution_created", "institution_updated"],
    billing: ["quote_created", "invoice_paid"],
    user: ["user_login"],
  }

  const allowedTypes = typeMap[selectedFilter.value as keyof typeof typeMap] || []
  return activities.value.filter((activity) => allowedTypes.includes(activity.type))
})

const timelineItems = computed(() =>
  filteredActivities.value.map((activity) => ({
    ...activity,
    dotColor: getMarkerClass(activity.type).replace('marker-', ''),
    icon: getActivityIcon(activity.type).replace('pi pi-', 'mdi-'),
  }))
)

const getMarkerClass = (type: string) => {
  const classMap = {
    task_created: "marker-task",
    task_completed: "marker-success",
    task_assigned: "marker-task",
    institution_created: "marker-institution",
    institution_updated: "marker-institution",
    quote_created: "marker-billing",
    invoice_paid: "marker-success",
    user_login: "marker-user",
  }
  return classMap[type as keyof typeof classMap] || "marker-default"
}

const getActivityIcon = (type: string) => {
  const iconMap = {
    task_created: "mdi-plus",
    task_completed: "mdi-check",
    task_assigned: "mdi-account-plus",
    institution_created: "mdi-office-building",
    institution_updated: "mdi-pencil",
    quote_created: "mdi-file-edit",
    invoice_paid: "mdi-currency-usd",
    user_login: "mdi-login",
  }
  return iconMap[type as keyof typeof iconMap] || "mdi-circle"
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

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

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

    // Mock data for demonstration
    const mockActivities: ActivityItem[] = [
      {
        id: "1",
        type: "task_completed",
        userId: "user1",
        description: 'Completed task "Follow up with City Hospital"',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        user: { id: "user1", firstName: "John", lastName: "Doe", avatarSeed: "user1" },
        metadata: {
          taskTitle: "Follow up with City Hospital",
          institutionName: "City Hospital",
        },
      },
      {
        id: "2",
        type: "institution_created",
        userId: "user2",
        description: "Added new medical institution",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        user: { id: "user2", firstName: "Jane", lastName: "Smith", avatarSeed: "user2" },
        metadata: { institutionName: "Regional Medical Center" },
      },
      {
        id: "3",
        type: "quote_created",
        userId: "user1",
        description: "Created new quote for medical equipment",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
        user: { id: "user1", firstName: "John", lastName: "Doe", avatarSeed: "user1" },
        metadata: { institutionName: "City Hospital", amount: 15000 },
      },
      {
        id: "4",
        type: "task_assigned",
        userId: "user3",
        description: "Assigned task to team member",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
        user: {
          id: "user3",
          firstName: "Mike",
          lastName: "Johnson",
          avatarSeed: "user3",
        },
        metadata: { taskTitle: "Prepare presentation for board meeting" },
      },
      {
        id: "5",
        type: "invoice_paid",
        userId: "user2",
        description: "Received payment for invoice",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        user: { id: "user2", firstName: "Jane", lastName: "Smith", avatarSeed: "user2" },
        metadata: { institutionName: "Metro Clinic", amount: 8500 },
      },
    ]

    if (reset) {
      activities.value = mockActivities
    } else {
      activities.value.push(...mockActivities)
    }

    // Simulate pagination
    hasMore.value = page.value < 3
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
  // Filter is applied via computed property
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

.activity-marker {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
}

.marker-task {
  background-color: #3b82f6;
}

.marker-success {
  background-color: #10b981;
}

.marker-institution {
  background-color: #8b5cf6;
}

.marker-billing {
  background-color: #f59e0b;
}

.marker-user {
  background-color: #6b7280;
}

.marker-default {
  background-color: #d1d5db;
  color: #6b7280;
}

.activity-item {
  padding-left: 1rem;
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
  }

  .feed-controls {
    justify-content: space-between;
  }

  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .activity-metadata {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
