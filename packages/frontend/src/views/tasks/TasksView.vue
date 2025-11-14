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
               <span class="btn-text-desktop">{{ t('task.createNew') }}</span>
               <span class="btn-text-mobile">{{ t('task.createShort') }}</span>
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
       <div v-if="tasksStore.loading && tasksStore.filteredTasks.length === 0" class="loading-container">
          <ListSkeleton
            :count="5"
            avatar
            actions
            type="list-item-three-line"
          />
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
                 class="create-task-btn"
               >
                 <span class="btn-text-desktop">{{ t('task.createTask') }}</span>
                 <span class="btn-text-mobile">{{ t('task.createShort') }}</span>
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
import { ListSkeleton } from "@/components/skeletons"
import { useTasksStore } from "@/stores/tasks"
import type {
  Task,
  TaskCreateRequest,
  TaskStatus,
  TaskUpdateRequest,
} from "@medical-crm/shared"
import { useSnackbar } from "@/composables/useSnackbar"
import { useI18n } from "vue-i18n"
import { taskNotificationService } from "@/services/taskNotificationService"
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

const tasksStore = useTasksStore()
const { showSnackbar } = useSnackbar()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

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


const handleTaskIdFromRoute = async () => {
  const taskId = route.query.taskId as string
  if (taskId) {
    // Wait for tasks to be loaded
    await loadTasks()

    // Find the task
    const task = tasksStore.filteredTasks.find(t => t.id === taskId)
    if (task) {
      // Open the task for editing
      selectedTask.value = task
      showEditDialog.value = true

      // Clear the taskId from the URL to avoid reopening on refresh
      const newQuery = { ...route.query }
      delete newQuery.taskId
      router.replace({ query: newQuery })

      showSnackbar(`Opened task: ${task.title}`, "info")
    } else {
      showSnackbar("Task not found", "warning")
    }
  }
}

onMounted(async () => {
  await loadTasks()
  handleTaskIdFromRoute()
})

// Watch for route changes to handle direct links to tasks
watch(
  () => route.query.taskId,
  (newTaskId) => {
    if (newTaskId) {
      handleTaskIdFromRoute()
    }
  }
)
</script>

<style scoped>
.tasks-view {
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  min-height: 100vh;
}

/* Header */
.tasks-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}

.tasks-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981);
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

/* Button text responsive */
.btn-text-mobile {
  display: none;
}

.btn-text-desktop {
  display: inline;
}

/* View Controls */
.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.04);
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
  padding: 4rem 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  text-align: center;
}

.loading-container p {
  margin-top: 1rem;
  color: #6b7280;
  font-size: 1.1rem;
}

.error-message {
  margin-bottom: 2rem;
  border-radius: 12px;
}

/* Empty State */
.empty-state {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  padding: 4rem 2rem;
  text-align: center;
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
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

/* List View */
.tasks-list {
  padding: 2rem;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

/* Board View */
.tasks-board {
  padding: 2rem;
  overflow-x: auto;
}

.board-columns {
  display: flex;
  gap: 1.5rem;
  min-width: max-content;
}

.board-column {
  flex: 0 0 320px;
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  min-height: 600px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e2e8f0;
}

.column-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.column-count {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1) !important;
  color: #475569 !important;
  font-weight: 600;
  border: 1px solid #cbd5e1;
}

.column-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 500px;
}

.board-task-card {
  margin-bottom: 0;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .tasks-grid {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  }

  .board-column {
    flex: 0 0 300px;
  }
}

@media (max-width: 1024px) {
  .tasks-view {
    padding: 1.5rem;
  }

  .tasks-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }

  .board-column {
    flex: 0 0 280px;
  }
}

@media (max-width: 768px) {
  .tasks-view {
    padding: 0.75rem;
  }

  .tasks-header {
    padding: 1.25rem;
    margin-bottom: 1.25rem;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .tasks-header::before {
    height: 3px;
  }

  .header-actions {
    justify-content: center;
    width: 100%;
  }

  .create-task-btn {
    width: 100%;
    max-width: 250px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .tasks-list,
  .tasks-board {
    padding: 1.25rem;
  }

  .tasks-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .board-columns {
    flex-direction: column;
    gap: 1rem;
  }

  .board-column {
    flex: none;
    min-height: 400px;
  }

  .view-controls {
    padding: 1rem;
    margin-bottom: 1.25rem;
    flex-direction: column;
    gap: 1rem;
  }

  .view-toggle {
    justify-content: center;
  }

  .sort-controls {
    justify-content: center;
  }
}

@media (max-width: 640px) {
  .tasks-view {
    padding: 0.5rem;
  }

  .tasks-header {
    padding: 1rem;
    border-radius: 12px;
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .header-content {
    order: 1;
  }

  .header-actions {
    order: 2;
    justify-content: center;
    width: 100%;
  }

  .create-task-btn {
    width: 100%;
    max-width: 200px;
  }

  /* Switch button text on mobile */
  .btn-text-desktop {
    display: none;
  }

  .btn-text-mobile {
    display: inline;
  }

  .tasks-list,
  .tasks-board {
    padding: 0.75rem;
  }

  .loading-container,
  .empty-state {
    padding: 2rem 1rem;
    border-radius: 12px;
  }

  .view-controls {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }

  .view-toggle {
    width: 100%;
    justify-content: center;
  }

  .sort-controls {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .tasks-view {
    padding: 0.25rem;
  }

  .empty-actions {
    flex-direction: column;
    gap: 0.75rem;
  }

  .view-toggle {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }

  .view-toggle .v-btn {
    width: 100%;
  }

  .sort-controls {
    width: 100%;
  }

  .sort-dropdown {
    width: 100%;
    min-width: auto;
  }

  .tasks-header {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }

  .page-title {
    font-size: 1.25rem;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page-description {
    font-size: 0.9rem;
  }

  .loading-container,
  .empty-state {
    padding: 1.5rem 0.75rem;
  }

  .tasks-content {
    border-radius: 12px;
  }

  .tasks-grid {
    gap: 0.75rem;
  }

  .create-task-btn {
    font-size: 0.9rem;
    padding: 0.75rem 1rem;
  }
}
</style>
