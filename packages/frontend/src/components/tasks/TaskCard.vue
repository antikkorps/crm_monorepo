<template>
  <Card class="task-card" :class="taskCardClass">
    <template #header>
      <div class="task-header">
        <div class="task-priority">
          <Tag :value="priorityLabel" :severity="prioritySeverity" :icon="priorityIcon" />
        </div>
        <div class="task-actions">
          <Button
            icon="pi pi-pencil"
            size="small"
            text
            rounded
            @click="$emit('edit', task)"
            v-tooltip.top="'Edit Task'"
          />
          <Button
            icon="pi pi-trash"
            size="small"
            text
            rounded
            severity="danger"
            @click="$emit('delete', task)"
            v-tooltip.top="'Delete Task'"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div class="task-content">
        <h4 class="task-title">{{ task.title }}</h4>

        <p v-if="task.description" class="task-description">
          {{ task.description }}
        </p>

        <div class="task-meta">
          <div class="task-assignee" v-if="task.assignee">
            <Avatar
              :image="getAvatarUrl(task.assignee.id)"
              :label="getInitials(task.assignee.firstName, task.assignee.lastName)"
              size="small"
              shape="circle"
              class="mr-2"
            />
            <span class="assignee-name">
              {{ task.assignee.firstName }} {{ task.assignee.lastName }}
            </span>
          </div>

          <div class="task-institution" v-if="task.institution">
            <i class="pi pi-building mr-1"></i>
            <span>{{ task.institution.name }}</span>
          </div>

          <div class="task-due-date" v-if="task.dueDate" :class="dueDateClass">
            <i class="pi pi-calendar mr-1"></i>
            <span>{{ formatDueDate(task.dueDate) }}</span>
          </div>
        </div>

        <div class="task-status-actions">
          <Dropdown
            v-model="localStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            @change="onStatusChange"
            class="status-dropdown"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { Task, TaskStatus } from "@medical-crm/shared"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Card from "primevue/card"
import Dropdown from "primevue/dropdown"
import Tag from "primevue/tag"
import { computed, ref, watch } from "vue"

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

const localStatus = ref(props.task.status)

watch(
  () => props.task.status,
  (newStatus) => {
    localStatus.value = newStatus
  }
)

const statusOptions = [
  { label: "To Do", value: "todo", icon: "pi pi-circle" },
  { label: "In Progress", value: "in_progress", icon: "pi pi-clock" },
  { label: "Completed", value: "completed", icon: "pi pi-check-circle" },
  { label: "Cancelled", value: "cancelled", icon: "pi pi-times-circle" },
]

const priorityLabel = computed(() => {
  const labels = {
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  }
  return labels[props.task.priority]
})

const prioritySeverity = computed(() => {
  const severities = {
    low: "success",
    medium: "info",
    high: "warning",
    urgent: "danger",
  }
  return severities[props.task.priority] as any
})

const priorityIcon = computed(() => {
  const icons = {
    low: "pi pi-arrow-down",
    medium: "pi pi-minus",
    high: "pi pi-arrow-up",
    urgent: "pi pi-exclamation-triangle",
  }
  return icons[props.task.priority]
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

  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  if (diffDays === -1) return "Due yesterday"
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`
  if (diffDays <= 7) return `Due in ${diffDays} days`

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
  margin-bottom: 1rem;
  transition: all 0.2s ease;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem 0;
}

.task-actions {
  display: flex;
  gap: 0.25rem;
}

.task-content {
  padding: 0 1rem 1rem;
}

.task-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.task-description {
  margin: 0 0 1rem 0;
  color: #6c757d;
  font-size: 0.9rem;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.task-assignee,
.task-institution,
.task-due-date {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: #6c757d;
}

.assignee-name {
  font-weight: 500;
}

.due-date-overdue {
  color: #dc3545 !important;
  font-weight: 600;
}

.due-date-soon {
  color: #fd7e14 !important;
  font-weight: 500;
}

.task-status-actions {
  margin-top: 1rem;
}

.status-dropdown {
  width: 100%;
}

/* Task card status styling */
.task-status-todo {
  border-left: 4px solid #6c757d;
}

.task-status-in_progress {
  border-left: 4px solid #007bff;
}

.task-status-completed {
  border-left: 4px solid #28a745;
  opacity: 0.8;
}

.task-status-cancelled {
  border-left: 4px solid #dc3545;
  opacity: 0.7;
}

.task-overdue {
  border-left: 4px solid #dc3545 !important;
  background-color: #fff5f5;
}

@media (max-width: 768px) {
  .task-meta {
    font-size: 0.8rem;
  }

  .task-title {
    font-size: 1rem;
  }
}
</style>
