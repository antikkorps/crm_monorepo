<template>
  <AppLayout>
    <div class="tasks-view">
      <!-- Header -->
      <div class="tasks-header">
        <div class="header-content">
          <h1 class="page-title">
            <i class="pi pi-check-square mr-2"></i>
            Task Management
          </h1>
          <p class="page-description">
            Manage and track team tasks, assignments, and deadlines
          </p>
        </div>
        <div class="header-actions">
          <Button
            label="New Task"
            icon="pi pi-plus"
            @click="showCreateDialog = true"
            class="create-task-btn"
          />
        </div>
      </div>

      <!-- Task Statistics -->
      <TaskStats :stats="tasksStore.taskStats" />

      <!-- Filters -->
      <TaskFilters
        :filters="tasksStore.filters"
        @update:filters="tasksStore.updateFilters"
      />

      <!-- View Toggle -->
      <div class="view-controls">
        <div class="view-toggle">
          <Button
            label="List View"
            icon="pi pi-list"
            :severity="viewMode === 'list' ? 'primary' : 'secondary'"
            :outlined="viewMode !== 'list'"
            @click="viewMode = 'list'"
            size="small"
          />
          <Button
            label="Board View"
            icon="pi pi-th-large"
            :severity="viewMode === 'board' ? 'primary' : 'secondary'"
            :outlined="viewMode !== 'board'"
            @click="viewMode = 'board'"
            size="small"
          />
        </div>

        <div class="sort-controls">
          <Dropdown
            v-model="sortBy"
            :options="sortOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Sort by"
            @change="applySorting"
            class="sort-dropdown"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="tasksStore.loading" class="loading-container">
        <ProgressSpinner />
        <p>Loading tasks...</p>
      </div>

      <!-- Error State -->
      <Message
        v-else-if="tasksStore.error"
        severity="error"
        :closable="false"
        class="error-message"
      >
        {{ tasksStore.error }}
        <template #icon>
          <Button icon="pi pi-refresh" text @click="loadTasks" v-tooltip.top="'Retry'" />
        </template>
      </Message>

      <!-- Empty State -->
      <div v-else-if="tasksStore.filteredTasks.length === 0" class="empty-state">
        <div class="empty-content">
          <i class="pi pi-check-square empty-icon"></i>
          <h3>No tasks found</h3>
          <p v-if="hasActiveFilters">
            No tasks match your current filters. Try adjusting your search criteria.
          </p>
          <p v-else>
            Get started by creating your first task to track team activities and
            deadlines.
          </p>
          <div class="empty-actions">
            <Button
              v-if="hasActiveFilters"
              label="Clear Filters"
              icon="pi pi-filter-slash"
              outlined
              @click="tasksStore.clearFilters"
            />
            <Button
              label="Create Task"
              icon="pi pi-plus"
              @click="showCreateDialog = true"
            />
          </div>
        </div>
      </div>

      <!-- Tasks Content -->
      <div v-else class="tasks-content">
        <!-- List View -->
        <div v-if="viewMode === 'list'" class="tasks-list">
          <div class="tasks-grid">
            <TaskCard
              v-for="task in sortedTasks"
              :key="task.id"
              :task="task"
              @edit="editTask"
              @delete="confirmDeleteTask"
              @status-change="updateTaskStatus"
            />
          </div>
        </div>

        <!-- Board View -->
        <div v-else class="tasks-board">
          <div class="board-columns">
            <div
              v-for="(tasks, status) in tasksStore.tasksByStatus"
              :key="status"
              class="board-column"
            >
              <div class="column-header">
                <h3 class="column-title">{{ getStatusLabel(status) }}</h3>
                <Badge :value="tasks.length" class="column-count" />
              </div>
              <div class="column-content">
                <TaskCard
                  v-for="task in tasks"
                  :key="task.id"
                  :task="task"
                  @edit="editTask"
                  @delete="confirmDeleteTask"
                  @status-change="updateTaskStatus"
                  class="board-task-card"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Form Dialog -->
      <TaskForm
        v-model:visible="showCreateDialog"
        :loading="formLoading"
        @submit="createTask"
        @cancel="showCreateDialog = false"
      />

      <TaskForm
        v-model:visible="showEditDialog"
        :task="selectedTask"
        :loading="formLoading"
        @submit="updateTask"
        @cancel="showEditDialog = false"
      />

      <!-- Delete Confirmation Dialog -->
      <ConfirmDialog />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import TaskCard from "@/components/tasks/TaskCard.vue"
import TaskFilters from "@/components/tasks/TaskFilters.vue"
import TaskForm from "@/components/tasks/TaskForm.vue"
import TaskStats from "@/components/tasks/TaskStats.vue"
import { useTasksStore } from "@/stores/tasks"
import type {
  Task,
  TaskCreateRequest,
  TaskStatus,
  TaskUpdateRequest,
} from "@medical-crm/shared"
import Badge from "primevue/badge"
import Button from "primevue/button"
import ConfirmDialog from "primevue/confirmdialog"
import Dropdown from "primevue/dropdown"
import Message from "primevue/message"
import ProgressSpinner from "primevue/progressspinner"
import { useConfirm } from "primevue/useconfirm"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref } from "vue"

const tasksStore = useTasksStore()
const toast = useToast()
const confirm = useConfirm()

// Component state
const viewMode = ref<"list" | "board">("list")
const sortBy = ref("dueDate")
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedTask = ref<Task | null>(null)
const formLoading = ref(false)

const sortOptions = [
  { label: "Due Date", value: "dueDate" },
  { label: "Priority", value: "priority" },
  { label: "Status", value: "status" },
  { label: "Created Date", value: "createdAt" },
  { label: "Title", value: "title" },
]

const hasActiveFilters = computed(() => {
  return Object.keys(tasksStore.filters).some(
    (key) =>
      tasksStore.filters[key as keyof typeof tasksStore.filters] !== undefined &&
      tasksStore.filters[key as keyof typeof tasksStore.filters] !== null &&
      tasksStore.filters[key as keyof typeof tasksStore.filters] !== ""
  )
})

const sortedTasks = computed(() => {
  const tasks = [...tasksStore.filteredTasks]

  return tasks.sort((a, b) => {
    switch (sortBy.value) {
      case "dueDate":
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()

      case "priority":
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]

      case "status":
        const statusOrder = { todo: 0, in_progress: 1, completed: 2, cancelled: 3 }
        return statusOrder[a.status] - statusOrder[b.status]

      case "createdAt":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

      case "title":
        return a.title.localeCompare(b.title)

      default:
        return 0
    }
  })
})

const getStatusLabel = (status: string) => {
  const labels = {
    todo: "To Do",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  }
  return labels[status as keyof typeof labels] || status
}

const loadTasks = async () => {
  try {
    await tasksStore.fetchTasks()
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load tasks",
      life: 5000,
    })
  }
}

const createTask = async (taskData: TaskCreateRequest) => {
  try {
    formLoading.value = true
    await tasksStore.createTask(taskData)
    showCreateDialog.value = false
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Task created successfully",
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to create task",
      life: 5000,
    })
  } finally {
    formLoading.value = false
  }
}

const editTask = (task: Task) => {
  selectedTask.value = task
  showEditDialog.value = true
}

const updateTask = async (updates: TaskUpdateRequest) => {
  if (!selectedTask.value) return

  try {
    formLoading.value = true
    await tasksStore.updateTask(selectedTask.value.id, updates)
    showEditDialog.value = false
    selectedTask.value = null
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Task updated successfully",
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to update task",
      life: 5000,
    })
  } finally {
    formLoading.value = false
  }
}

const updateTaskStatus = async (task: Task, newStatus: TaskStatus) => {
  try {
    await tasksStore.updateTask(task.id, { status: newStatus })
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `Task status updated to ${getStatusLabel(newStatus)}`,
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to update task status",
      life: 5000,
    })
  }
}

const confirmDeleteTask = (task: Task) => {
  confirm.require({
    message: `Are you sure you want to delete the task "${task.title}"?`,
    header: "Delete Task",
    icon: "pi pi-exclamation-triangle",
    rejectClass: "p-button-secondary p-button-outlined",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    acceptClass: "p-button-danger",
    accept: () => deleteTask(task),
  })
}

const deleteTask = async (task: Task) => {
  try {
    await tasksStore.deleteTask(task.id)
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Task deleted successfully",
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete task",
      life: 5000,
    })
  }
}

const applySorting = () => {
  // Sorting is handled by the computed property
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.tasks-view {
  padding: 1.5rem;
  background: #f8f9fa;
  min-height: 100vh;
}

/* Header */
.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
}

.page-description {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.create-task-btn {
  white-space: nowrap;
}

/* View Controls */
.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sort-dropdown {
  min-width: 150px;
}

/* Loading and Error States */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.loading-container p {
  margin-top: 1rem;
  color: #6b7280;
}

.error-message {
  margin-bottom: 1.5rem;
}

/* Empty State */
.empty-state {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 3rem;
}

.empty-content {
  text-align: center;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 3rem;
  color: #d1d5db;
  margin-bottom: 1rem;
}

.empty-content h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
}

.empty-content p {
  margin: 0 0 1.5rem 0;
  color: #6b7280;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Tasks Content */
.tasks-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* List View */
.tasks-list {
  padding: 1.5rem;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

/* Board View */
.tasks-board {
  padding: 1.5rem;
  overflow-x: auto;
}

.board-columns {
  display: flex;
  gap: 1.5rem;
  min-width: max-content;
}

.board-column {
  flex: 0 0 300px;
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
}

.column-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
}

.column-count {
  background: #e5e7eb;
  color: #374151;
}

.column-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 200px;
}

.board-task-card {
  margin-bottom: 0;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .tasks-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }

  .board-column {
    flex: 0 0 280px;
  }
}

@media (max-width: 768px) {
  .tasks-view {
    padding: 1rem;
  }

  .tasks-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .view-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .view-toggle {
    justify-content: center;
  }

  .tasks-grid {
    grid-template-columns: 1fr;
  }

  .board-columns {
    flex-direction: column;
  }

  .board-column {
    flex: none;
  }
}

@media (max-width: 480px) {
  .empty-actions {
    flex-direction: column;
  }

  .view-toggle {
    flex-direction: column;
  }
}
</style>
