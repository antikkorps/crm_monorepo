import { tasksApi } from "@/services/api"
import type {
  Task,
  TaskCreateRequest,
  TaskSearchFilters,
  TaskUpdateRequest,
} from "@medical-crm/shared"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useTasksStore = defineStore("tasks", () => {
  // State
  const tasks = ref<Task[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<TaskSearchFilters>({})

  // Getters
  const filteredTasks = computed(() => {
    let result = [...tasks.value]

    // Apply filters
    if (filters.value.status) {
      result = result.filter((task) => task.status === filters.value.status)
    }

    if (filters.value.priority) {
      result = result.filter((task) => task.priority === filters.value.priority)
    }

    if (filters.value.assigneeId) {
      result = result.filter((task) => task.assigneeId === filters.value.assigneeId)
    }

    if (filters.value.institutionId) {
      result = result.filter((task) => task.institutionId === filters.value.institutionId)
    }

    if (filters.value.overdue) {
      const now = new Date()
      result = result.filter((task) => {
        if (!task.dueDate) return false
        return new Date(task.dueDate) < now && task.status !== "completed"
      })
    }

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase()
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(searchTerm) ||
          task.description?.toLowerCase().includes(searchTerm)
      )
    }

    return result
  })

  const tasksByStatus = computed(() => {
    return {
      todo: filteredTasks.value.filter((task) => task.status === "todo"),
      in_progress: filteredTasks.value.filter((task) => task.status === "in_progress"),
      completed: filteredTasks.value.filter((task) => task.status === "completed"),
      cancelled: filteredTasks.value.filter((task) => task.status === "cancelled"),
    }
  })

  const overdueTasks = computed(() => {
    const now = new Date()
    return tasks.value.filter((task) => {
      if (!task.dueDate || task.status === "completed") return false
      return new Date(task.dueDate) < now
    })
  })

  const taskStats = computed(() => ({
    total: tasks.value.length,
    todo: tasksByStatus.value.todo.length,
    inProgress: tasksByStatus.value.in_progress.length,
    completed: tasksByStatus.value.completed.length,
    overdue: overdueTasks.value.length,
  }))

  // Actions
  const fetchTasks = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await tasksApi.getAll()
      tasks.value = (response as any)?.data || (response as any)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch tasks"
      console.error("Error fetching tasks:", err)
    } finally {
      loading.value = false
    }
  }

  const createTask = async (taskData: TaskCreateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await tasksApi.create(taskData)
      const newTask = (response as any)?.data || (response as any)
      tasks.value.push(newTask)
      return newTask
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create task"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTask = async (taskId: string, updates: TaskUpdateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await tasksApi.update(taskId, updates)
      const updatedTask = (response as any)?.data || (response as any)

      const index = tasks.value.findIndex((task) => task.id === taskId)
      if (index !== -1) {
        tasks.value[index] = updatedTask
      }

      return updatedTask
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update task"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      loading.value = true
      error.value = null
      await tasksApi.delete(taskId)

      const index = tasks.value.findIndex((task) => task.id === taskId)
      if (index !== -1) {
        tasks.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete task"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFilters = (newFilters: Partial<TaskSearchFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const getTaskById = (taskId: string) => {
    return tasks.value.find((task) => task.id === taskId)
  }

  return {
    // State
    tasks,
    loading,
    error,
    filters,

    // Getters
    filteredTasks,
    tasksByStatus,
    overdueTasks,
    taskStats,

    // Actions
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    updateFilters,
    clearFilters,
    getTaskById,
  }
})
