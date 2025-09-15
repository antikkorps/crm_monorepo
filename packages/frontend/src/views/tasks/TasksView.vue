<template>
  <AppLayout>
    <div class="tasks-view">
       <!-- Header -->
       <div class="tasks-header">
         <div class="header-content">
            <h1 class="page-title">
              <v-icon class="me-2">mdi-check-all</v-icon>
              {{ t('task.title') }}
            </h1>
            <p class="page-description">
              {{ t('task.subtitle') }}
            </p>
         </div>
         <div class="header-actions">
             <v-btn
               color="primary"
               variant="elevated"
               prepend-icon="mdi-plus"
               @click="showCreateDialog = true"
               class="create-task-btn"
             >
               {{ t('task.createNew') }}
             </v-btn>
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
             <v-btn
               :color="viewMode === 'list' ? 'primary' : 'secondary'"
               :variant="viewMode === 'list' ? 'elevated' : 'outlined'"
               prepend-icon="mdi-view-list"
               @click="viewMode = 'list'"
               size="small"
             >
               {{ t('task.listView') }}
             </v-btn>
             <v-btn
               :color="viewMode === 'board' ? 'primary' : 'secondary'"
               :variant="viewMode === 'board' ? 'elevated' : 'outlined'"
               prepend-icon="mdi-view-grid"
               @click="viewMode = 'board'"
               size="small"
             >
               {{ t('task.boardView') }}
             </v-btn>
         </div>

         <div class="sort-controls">
             <v-select
               v-model="sortBy"
               :items="sortOptions"
               item-title="label"
               item-value="value"
               :label="t('task.sortBy')"
               @update:modelValue="applySorting"
               class="sort-dropdown"
               density="comfortable"
               variant="outlined"
             />
         </div>
       </div>

       <!-- Loading State -->
       <div v-if="tasksStore.loading" class="loading-container">
          <v-progress-circular indeterminate color="primary" />
          <p>{{ t('task.loading') }}</p>
       </div>

       <!-- Error State -->
        <v-alert
          v-else-if="tasksStore.error"
          type="error"
          class="error-message"
          closable
          variant="tonal"
        >
          {{ tasksStore.error }}
          <template #append>
            <v-btn
              icon="mdi-refresh"
              size="small"
              variant="text"
              @click="loadTasks"
            />
          </template>
        </v-alert>

       <!-- Empty State -->
       <div v-else-if="tasksStore.filteredTasks.length === 0" class="empty-state">
         <div class="empty-content">
            <v-icon class="empty-icon">mdi-check-all</v-icon>
            <h3>{{ t('task.noTasksFound') }}</h3>
            <p v-if="hasActiveFilters">
              {{ t('task.noTasksMatchFilters') }}
            </p>
            <p v-else>
              {{ t('task.getStarted') }}
            </p>
           <div class="empty-actions">
               <v-btn
                 v-if="hasActiveFilters"
                 color="secondary"
                 variant="outlined"
                 prepend-icon="mdi-filter-off"
                 @click="tasksStore.clearFilters"
               >
                 {{ t('task.clearFilters') }}
               </v-btn>
               <v-btn
                 color="primary"
                 variant="elevated"
                 prepend-icon="mdi-plus"
                 @click="showCreateDialog = true"
               >
                 {{ t('task.createTask') }}
               </v-btn>
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
                  <v-chip variant="outlined" size="small" class="column-count">{{ tasks.length }}</v-chip>
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
         v-model="showCreateDialog"
         :loading="formLoading"
         @submit="createTask"
         @cancel="showCreateDialog = false"
       />

       <TaskForm
         v-model="showEditDialog"
         :task="selectedTask"
         :loading="formLoading"
         @submit="updateTask"
         @cancel="showEditDialog = false"
       />

       <!-- Delete Confirmation Dialog -->
       <v-dialog
         v-model="showConfirmDialog"
         max-width="400px"
         persistent
       >
         <v-card>
            <v-card-title class="text-h6">
              {{ t('task.confirm.deleteTitle') }}
            </v-card-title>

            <v-card-text>
              {{ t('task.confirm.deleteMessage', { title: taskToDelete?.title || '' }) }}
            </v-card-text>

            <v-card-actions>
              <v-spacer />
               <v-btn
                 color="secondary"
                 variant="outlined"
                 @click="cancelDelete"
               >
                 {{ t('task.cancel') }}
               </v-btn>
               <v-btn
                 color="error"
                 variant="elevated"
                 @click="confirmDelete"
               >
                 {{ t('task.delete') }}
               </v-btn>
            </v-card-actions>
         </v-card>
       </v-dialog>
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
import { useSnackbar } from "@/composables/useSnackbar"
import { useI18n } from "vue-i18n"
import { computed, onMounted, ref } from "vue"

const tasksStore = useTasksStore()
const { showSnackbar } = useSnackbar()
const { t } = useI18n()

// Component state
const viewMode = ref<"list" | "board">("list")
const sortBy = ref("dueDate")
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedTask = ref<Task | null>(null)
const formLoading = ref(false)

// Confirmation dialog state
const showConfirmDialog = ref(false)
const confirmMessage = ref("")
const confirmHeader = ref("")
const taskToDelete = ref<Task | null>(null)

const sortOptions = computed(() => [
  { label: t('task.sortOptions.dueDate'), value: "dueDate" },
  { label: t('task.sortOptions.priority'), value: "priority" },
  { label: t('task.sortOptions.status'), value: "status" },
  { label: t('task.sortOptions.createdAt'), value: "createdAt" },
  { label: t('task.sortOptions.title'), value: "title" },
])

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
    todo: t('task.status.todo'),
    in_progress: t('task.status.in_progress'),
    completed: t('task.status.completed'),
    cancelled: t('task.status.cancelled'),
  }
  return labels[status as keyof typeof labels] || status
}

const loadTasks = async () => {
  try {
    await tasksStore.fetchTasks()
   } catch (error) {
     showSnackbar(t('task.messages.loadFailed'), "error")
   }
}

const createTask = async (taskData: TaskCreateRequest) => {
  try {
    formLoading.value = true
    await tasksStore.createTask(taskData)
     showCreateDialog.value = false
     showSnackbar(t('task.messages.created'), "success")
   } catch (error) {
     showSnackbar(t('task.messages.createFailed'), "error")
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
     showSnackbar(t('task.messages.updated'), "success")
   } catch (error) {
     showSnackbar(t('task.messages.updateFailed'), "error")
  } finally {
    formLoading.value = false
  }
}

const updateTaskStatus = async (task: Task, newStatus: TaskStatus) => {
  try {
    await tasksStore.updateTask(task.id, { status: newStatus })
     showSnackbar(t('task.messages.statusUpdated', { status: getStatusLabel(newStatus) }), "success")
   } catch (error) {
     showSnackbar(t('task.messages.statusUpdateFailed'), "error")
  }
}

const confirmDeleteTask = (task: Task) => {
   taskToDelete.value = task
   showConfirmDialog.value = true
}

const deleteTask = async (task: Task) => {
  try {
    await tasksStore.deleteTask(task.id)
     showSnackbar(t('task.messages.deleted'), "success")
   } catch (error) {
     showSnackbar(t('task.messages.deleteFailed'), "error")
  }
}

const applySorting = () => {
   // Sorting is handled by the computed property
}

const confirmDelete = () => {
   if (taskToDelete.value) {
     deleteTask(taskToDelete.value)
   }
   showConfirmDialog.value = false
   taskToDelete.value = null
}

const cancelDelete = () => {
   showConfirmDialog.value = false
   taskToDelete.value = null
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
  gap: 0.5rem;
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
  background: #e5e7eb !important;
  color: #374151 !important;
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
