<template>
  <v-card class="task-card" :class="taskCardClass" variant="elevated">
    <!-- Status indicator -->
    <div class="status-indicator" :class="`status-${task.status}`"></div>

    <v-card-text class="task-content">
      <!-- Header with priority and actions -->
      <div class="task-header">
        <div class="task-priority-section">
          <v-chip
            :color="priorityColor"
            :prepend-icon="priorityIcon"
            size="small"
            variant="flat"
            class="priority-chip"
          >
            {{ priorityLabel }}
          </v-chip>
          <div class="task-badges">
            <v-chip
              v-if="isOverdue"
              color="error"
              size="small"
              variant="outlined"
              class="overdue-badge"
            >
              <v-icon start>mdi-alert-circle</v-icon>
              {{ t('tasks.overdue') }}
            </v-chip>
            <v-chip
              v-else-if="isDueSoon"
              color="warning"
              size="small"
              variant="outlined"
              class="due-soon-badge"
            >
              <v-icon start>mdi-clock-outline</v-icon>
              {{ t('tasks.dueSoon') }}
            </v-chip>
          </div>
        </div>

        <div class="task-actions">
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            color="primary"
            class="action-btn"
            @click="$emit('edit', task)"
          >
            <v-tooltip :text="t('actions.edit')">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-pencil</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            color="error"
            class="action-btn"
            @click="$emit('delete', task)"
          >
            <v-tooltip :text="t('actions.delete')">
              <template #activator="{ props }">
                <v-icon v-bind="props">mdi-delete</v-icon>
              </template>
            </v-tooltip>
          </v-btn>
        </div>
      </div>

      <!-- Title -->
      <div class="task-title-section">
        <h3 class="task-title">{{ task.title }}</h3>
        <div class="task-status-chip">
          <v-chip
            :color="statusColor"
            size="small"
            variant="flat"
            class="status-chip"
          >
            <v-icon start size="small">{{ statusIcon }}</v-icon>
            {{ statusLabel }}
          </v-chip>
        </div>
      </div>

      <!-- Description -->
      <div v-if="task.description" class="task-description-section">
        <p class="task-description">{{ task.description }}</p>
      </div>

      <!-- Meta information -->
      <div class="task-meta-section">
        <!-- Assignee -->
        <div class="meta-item assignee-item" v-if="task.assignee">
          <div class="meta-icon">
            <v-avatar
              :image="getAvatarUrl(task.assignee.id)"
              :alt="getInitials(task.assignee.firstName, task.assignee.lastName)"
              size="28"
              class="assignee-avatar"
            >
              <span class="avatar-text">{{ getInitials(task.assignee.firstName, task.assignee.lastName) }}</span>
            </v-avatar>
          </div>
          <div class="meta-content">
            <div class="meta-label">{{ t('tasks.assignedTo') }}</div>
            <div class="meta-value">{{ task.assignee.firstName }} {{ task.assignee.lastName }}</div>
          </div>
        </div>

        <!-- Institution -->
        <div class="meta-item institution-item" v-if="task.institution">
          <div class="meta-icon">
            <v-icon size="20" color="primary">mdi-office-building</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">{{ t('labels.type') }}</div>
            <div class="meta-value">{{ task.institution.name }}</div>
          </div>
        </div>

        <!-- Due date -->
        <div class="meta-item due-date-item" v-if="task.dueDate">
          <div class="meta-icon">
            <v-icon size="20" :color="dueDateColor">mdi-calendar</v-icon>
          </div>
          <div class="meta-content">
            <div class="meta-label">{{ t('tasks.dueDate') }}</div>
            <div class="meta-value" :class="dueDateClass">{{ formatDueDate(task.dueDate) }}</div>
          </div>
        </div>
      </div>

      <!-- Status change dropdown -->
      <div class="task-footer">
        <v-select
          v-model="localStatus"
          :items="statusOptions"
          item-title="label"
          item-value="value"
          @update:modelValue="onStatusChange"
          class="status-dropdown"
          density="compact"
          variant="outlined"
          hide-details
          :placeholder="`${t('tasks.changeStatus')} (${statusLabel})`"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { Task, TaskStatus } from "@medical-crm/shared"
// Vuetify components are auto-imported
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  task: Task
}

interface Emits {
  (e: "edit", task: Task): void
  (e: "delete", task: Task): void
  (e: "statusChange", task: Task, newStatus: TaskStatus): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const localStatus = ref(props.task.status)

watch(
  () => props.task.status,
  (newStatus) => {
    localStatus.value = newStatus
  }
)

const statusOptions = computed(() => [
  { label: t('tasks.status.todo'), value: "todo" },
  { label: t('tasks.status.in_progress'), value: "in_progress" },
  { label: t('tasks.status.completed'), value: "completed" },
  { label: t('tasks.status.cancelled'), value: "cancelled" },
])

const priorityLabel = computed(() => {
  const labels = {
    low: t('tasks.priority.low'),
    medium: t('tasks.priority.medium'),
    high: t('tasks.priority.high'),
    urgent: t('tasks.priority.urgent'),
  }
  return labels[props.task.priority]
})

const priorityColor = computed(() => {
  const colors = {
    low: "success",
    medium: "info",
    high: "warning",
    urgent: "error",
  }
  return colors[props.task.priority]
})

const priorityIcon = computed(() => {
  const icons = {
    low: "mdi-priority-low",
    medium: "mdi-priority-medium",
    high: "mdi-priority-high",
    urgent: "mdi-alert-circle",
  }
  return icons[props.task.priority]
})

const statusLabel = computed(() => {
  const labels = {
    todo: t('tasks.status.todo'),
    in_progress: t('tasks.status.in_progress'),
    completed: t('tasks.status.completed'),
    cancelled: t('tasks.status.cancelled'),
  }
  return labels[props.task.status]
})

const statusColor = computed(() => {
  const colors = {
    todo: "grey",
    in_progress: "primary",
    completed: "success",
    cancelled: "error",
  }
  return colors[props.task.status]
})

const statusIcon = computed(() => {
  const icons = {
    todo: "mdi-circle-outline",
    in_progress: "mdi-play-circle",
    completed: "mdi-check-circle",
    cancelled: "mdi-close-circle",
  }
  return icons[props.task.status]
})

const dueDateColor = computed(() => {
  if (isOverdue.value) return "error"
  if (isDueSoon.value) return "warning"
  return "success"
})

const taskCardClass = computed(() => {
  const classes = [`task-status-${props.task.status}`]

  if (isOverdue.value) {
    classes.push("task-overdue")
  }

  return classes
})

const isOverdue = computed(() => {
  if (!props.task.dueDate || props.task.status === "completed") return false
  return new Date(props.task.dueDate) < new Date()
})

const dueDateClass = computed(() => ({
  "due-date-overdue": isOverdue.value,
  "due-date-soon": isDueSoon.value && !isOverdue.value,
}))

const isDueSoon = computed(() => {
  if (!props.task.dueDate || props.task.status === "completed") return false
  const dueDate = new Date(props.task.dueDate)
  const now = new Date()
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays <= 3 && diffDays > 0
})

const formatDueDate = (date: Date | string) => {
  const dueDate = new Date(date)
  const now = new Date()
  const diffTime = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('tasks.today')
  if (diffDays === 1) return t('tasks.tomorrow')
  if (diffDays === -1) return t('tasks.yesterday')
  if (diffDays < 0) return `${t('tasks.overdueBy')} ${Math.abs(diffDays)} ${t('tasks.days')}`
  if (diffDays <= 7) return `${t('tasks.dueIn')} ${diffDays} ${t('tasks.days')}`

  return dueDate.toLocaleDateString()
}

const getAvatarUrl = (userId: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
}

const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

const onStatusChange = () => {
  emit("statusChange", props.task, localStatus.value)
}
</script>

<style scoped>
.task-card {
  position: relative;
  margin-bottom: 1rem;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.12);
}

/* Status indicator */
.status-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #e0e0e0;
  transition: background-color 0.3s ease;
}

.status-todo {
  background: linear-gradient(180deg, #9ca3af 0%, #6b7280 100%);
}

.status-in_progress {
  background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
}

.status-completed {
  background: linear-gradient(180deg, #10b981 0%, #059669 100%);
}

.status-cancelled {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.task-content {
  padding: 1.5rem;
  padding-left: 2rem; /* Account for status indicator */
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}

.task-priority-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.priority-chip {
  align-self: flex-start;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.overdue-badge,
.due-soon-badge {
  font-size: 0.75rem;
  height: 24px;
}

.task-actions {
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.task-card:hover .task-actions {
  opacity: 1;
}

.action-btn {
  border-radius: 6px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background-color: rgba(0, 0, 0, 0.04);
  transform: scale(1.1);
}

.task-title-section {
  margin-bottom: 1rem;
}

.task-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-status-chip {
  display: flex;
  justify-content: flex-end;
}

.status-chip {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.75rem;
}

.task-description-section {
  margin-bottom: 1.25rem;
}

.task-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-meta-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
  transition: all 0.2s ease;
}

.meta-item:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.meta-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e5e7eb;
}

.assignee-avatar {
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.avatar-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.meta-content {
  flex: 1;
  min-width: 0;
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.meta-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.due-date-overdue .meta-value {
  color: #dc2626;
  font-weight: 600;
}

.due-date-soon .meta-value {
  color: #d97706;
  font-weight: 600;
}

.task-footer {
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.status-dropdown {
  max-width: 250px;
}

.status-dropdown :deep(.v-field) {
  background: #f9fafb;
  border-radius: 8px;
}

.status-dropdown :deep(.v-field:hover) {
  background: #f3f4f6;
}

/* Task card status styling */
.task-status-todo {
  /* Default grey styling */
}

.task-status-in_progress {
  /* Blue accent */
}

.task-status-completed {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%);
}

.task-status-cancelled {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(220, 38, 38, 0.03) 100%);
}

.task-overdue {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.05) 0%, rgba(239, 68, 68, 0.03) 100%);
  border-color: rgba(220, 38, 38, 0.2);
}

.task-overdue .status-indicator {
  background: linear-gradient(180deg, #dc2626 0%, #b91c1c 100%);
}

/* Responsive design */
@media (max-width: 768px) {
  .task-content {
    padding: 1rem;
    padding-left: 1.5rem;
  }

  .task-title {
    font-size: 1.1rem;
  }

  .task-meta-section {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .meta-item {
    padding: 0.625rem;
  }

  .task-header {
    margin-bottom: 0.75rem;
  }

  .task-actions {
    opacity: 1; /* Always show on mobile */
  }

  .status-dropdown {
    max-width: none;
  }
}

@media (max-width: 480px) {
  .task-content {
    padding: 0.875rem;
    padding-left: 1.25rem;
  }

  .task-title-section {
    margin-bottom: 0.75rem;
  }

  .task-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .task-description {
    font-size: 0.85rem;
  }

  .meta-item {
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .meta-icon {
    width: 32px;
    height: 32px;
  }

  .meta-value {
    font-size: 0.8rem;
  }
}
</style>
