import { remindersApi, type ReminderFilters } from "@/services/api/reminders"
import type {
  Reminder,
  ReminderCreateRequest,
  ReminderUpdateRequest,
  ReminderPriority,
  ReminderStatus,
} from "@medical-crm/shared"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useRemindersStore = defineStore("reminders", () => {
  // State
  const reminders = ref<Reminder[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<ReminderFilters>({})

  // Getters
  const filteredReminders = computed(() => {
    let result = [...reminders.value]

    // Apply filters
    if (filters.value.userId) {
      result = result.filter((reminder) => reminder.userId === filters.value.userId)
    }

    if (filters.value.institutionId) {
      result = result.filter(
        (reminder) => reminder.institutionId === filters.value.institutionId
      )
    }

    if (filters.value.contactPersonId) {
      result = result.filter(
        (reminder) => reminder.contactPersonId === filters.value.contactPersonId
      )
    }

    if (filters.value.priority) {
      result = result.filter((reminder) => reminder.priority === filters.value.priority)
    }

    if (filters.value.status) {
      result = result.filter((reminder) => reminder.status === filters.value.status)
    }

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase()
      result = result.filter(
        (reminder) =>
          reminder.title.toLowerCase().includes(searchTerm) ||
          reminder.description?.toLowerCase().includes(searchTerm)
      )
    }

    if (filters.value.dateFrom) {
      const fromDate = new Date(filters.value.dateFrom)
      result = result.filter(
        (reminder) => new Date(reminder.reminderDate) >= fromDate
      )
    }

    if (filters.value.dateTo) {
      const toDate = new Date(filters.value.dateTo)
      result = result.filter(
        (reminder) => new Date(reminder.reminderDate) <= toDate
      )
    }

    return result
  })

  const upcomingReminders = computed(() => {
    const now = new Date()
    return reminders.value
      .filter(
        (reminder) =>
          reminder.status === "pending" &&
          new Date(reminder.reminderDate) > now
      )
      .sort(
        (a, b) =>
          new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()
      )
  })

  const overdueReminders = computed(() => {
    const now = new Date()
    return reminders.value
      .filter(
        (reminder) =>
          reminder.status === "pending" &&
          new Date(reminder.reminderDate) <= now
      )
      .sort(
        (a, b) =>
          new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()
      )
  })

  const todayReminders = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return reminders.value
      .filter((reminder) => {
        const reminderDate = new Date(reminder.reminderDate)
        return reminderDate >= today && reminderDate < tomorrow
      })
      .sort(
        (a, b) =>
          new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()
      )
  })

  const remindersByPriority = computed(() => {
    const byPriority: Record<ReminderPriority, Reminder[]> = {
      low: [],
      medium: [],
      high: [],
      urgent: [],
    }

    reminders.value.forEach((reminder) => {
      byPriority[reminder.priority].push(reminder)
    })

    return byPriority
  })

  const reminderStats = computed(() => ({
    total: reminders.value.length,
    pending: reminders.value.filter((r) => r.status === "pending").length,
    completed: reminders.value.filter((r) => r.status === "completed").length,
    overdue: overdueReminders.value.length,
    today: todayReminders.value.length,
    upcoming: upcomingReminders.value.length,
    urgent: reminders.value.filter(
      (r) => r.priority === "urgent" && r.status === "pending"
    ).length,
  }))

  // Actions
  const fetchReminders = async (customFilters?: ReminderFilters) => {
    try {
      loading.value = true
      error.value = null
      const response = await remindersApi.getAll(customFilters || filters.value)
      reminders.value = (response as any)?.data || (response as any)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch reminders"
      console.error("Error fetching reminders:", err)
    } finally {
      loading.value = false
    }
  }

  const fetchUpcoming = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await remindersApi.getUpcoming()
      const upcoming = (response as any)?.data || (response as any)
      // Merge with existing reminders
      upcoming.forEach((upcomingReminder: Reminder) => {
        const index = reminders.value.findIndex((r) => r.id === upcomingReminder.id)
        if (index === -1) {
          reminders.value.push(upcomingReminder)
        }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch upcoming reminders"
      console.error("Error fetching upcoming reminders:", err)
    } finally {
      loading.value = false
    }
  }

  const fetchOverdue = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await remindersApi.getOverdue()
      const overdue = (response as any)?.data || (response as any)
      // Merge with existing reminders
      overdue.forEach((overdueReminder: Reminder) => {
        const index = reminders.value.findIndex((r) => r.id === overdueReminder.id)
        if (index === -1) {
          reminders.value.push(overdueReminder)
        }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch overdue reminders"
      console.error("Error fetching overdue reminders:", err)
    } finally {
      loading.value = false
    }
  }

  const createReminder = async (reminderData: ReminderCreateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await remindersApi.create(reminderData)
      const newReminder = (response as any)?.data || (response as any)
      reminders.value.push(newReminder)
      return newReminder
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create reminder"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateReminder = async (reminderId: string, updates: ReminderUpdateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await remindersApi.update(reminderId, updates)
      const updatedReminder = (response as any)?.data || (response as any)

      const index = reminders.value.findIndex((reminder) => reminder.id === reminderId)
      if (index !== -1) {
        reminders.value[index] = updatedReminder
      }

      return updatedReminder
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update reminder"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteReminder = async (reminderId: string) => {
    try {
      loading.value = true
      error.value = null
      await remindersApi.delete(reminderId)

      const index = reminders.value.findIndex((reminder) => reminder.id === reminderId)
      if (index !== -1) {
        reminders.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete reminder"
      throw err
    } finally {
      loading.value = false
    }
  }

  const completeReminder = async (reminderId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await remindersApi.completeReminder(reminderId)
      const updatedReminder = (response as any)?.data || (response as any)

      const index = reminders.value.findIndex((reminder) => reminder.id === reminderId)
      if (index !== -1) {
        reminders.value[index] = updatedReminder
      }

      return updatedReminder
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to complete reminder"
      throw err
    } finally {
      loading.value = false
    }
  }

  const cancelReminder = async (reminderId: string) => {
    try {
      loading.value = true
      error.value = null
      const response = await remindersApi.cancelReminder(reminderId)
      const updatedReminder = (response as any)?.data || (response as any)

      const index = reminders.value.findIndex((reminder) => reminder.id === reminderId)
      if (index !== -1) {
        reminders.value[index] = updatedReminder
      }

      return updatedReminder
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to cancel reminder"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFilters = (newFilters: Partial<ReminderFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const getReminderById = (reminderId: string) => {
    return reminders.value.find((reminder) => reminder.id === reminderId)
  }

  return {
    // State
    reminders,
    loading,
    error,
    filters,

    // Getters
    filteredReminders,
    upcomingReminders,
    overdueReminders,
    todayReminders,
    remindersByPriority,
    reminderStats,

    // Actions
    fetchReminders,
    fetchUpcoming,
    fetchOverdue,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    cancelReminder,
    updateFilters,
    clearFilters,
    getReminderById,
  }
})
