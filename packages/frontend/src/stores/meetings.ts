import { meetingsApi, type MeetingFilters } from "@/services/api/meetings"
import type {
  Meeting,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  MeetingStatus,
} from "@medical-crm/shared"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useMeetingsStore = defineStore("meetings", () => {
  // State
  const meetings = ref<Meeting[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const filters = ref<MeetingFilters>({})

  // Getters
  const filteredMeetings = computed(() => {
    let result = [...meetings.value]

    // Apply filters
    if (filters.value.status) {
      result = result.filter((meeting) => meeting.status === filters.value.status)
    }

    if (filters.value.organizerId) {
      result = result.filter((meeting) => meeting.organizerId === filters.value.organizerId)
    }

    if (filters.value.institutionId) {
      result = result.filter((meeting) => meeting.institutionId === filters.value.institutionId)
    }

    if (filters.value.search) {
      const searchTerm = filters.value.search.toLowerCase()
      result = result.filter(
        (meeting) =>
          meeting.title.toLowerCase().includes(searchTerm) ||
          meeting.description?.toLowerCase().includes(searchTerm) ||
          meeting.location?.toLowerCase().includes(searchTerm)
      )
    }

    return result
  })

  const meetingsByStatus = computed(() => {
    return {
      scheduled: filteredMeetings.value.filter((meeting) => meeting.status === "scheduled"),
      in_progress: filteredMeetings.value.filter((meeting) => meeting.status === "in_progress"),
      completed: filteredMeetings.value.filter((meeting) => meeting.status === "completed"),
      cancelled: filteredMeetings.value.filter((meeting) => meeting.status === "cancelled"),
    }
  })

  const upcomingMeetings = computed(() => {
    const now = new Date()
    return meetings.value
      .filter((meeting) => {
        const startDate = new Date(meeting.startDate)
        return startDate > now && meeting.status === "scheduled"
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  })

  const pastMeetings = computed(() => {
    const now = new Date()
    return meetings.value
      .filter((meeting) => {
        const endDate = new Date(meeting.endDate)
        return endDate < now
      })
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  })

  const todayMeetings = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return meetings.value
      .filter((meeting) => {
        const startDate = new Date(meeting.startDate)
        return startDate >= today && startDate < tomorrow
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  })

  const meetingStats = computed(() => ({
    total: meetings.value.length,
    scheduled: meetingsByStatus.value.scheduled.length,
    inProgress: meetingsByStatus.value.in_progress.length,
    completed: meetingsByStatus.value.completed.length,
    upcoming: upcomingMeetings.value.length,
    today: todayMeetings.value.length,
  }))

  // Actions
  const fetchMeetings = async (customFilters?: MeetingFilters) => {
    try {
      loading.value = true
      error.value = null
      const response = await meetingsApi.getAll(customFilters || filters.value)
      meetings.value = (response as any)?.data || (response as any)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch meetings"
      console.error("Error fetching meetings:", err)
    } finally {
      loading.value = false
    }
  }

  const createMeeting = async (meetingData: MeetingCreateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await meetingsApi.create(meetingData)
      const newMeeting = (response as any)?.data || (response as any)
      meetings.value.push(newMeeting)
      return newMeeting
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create meeting"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateMeeting = async (meetingId: string, updates: MeetingUpdateRequest) => {
    try {
      loading.value = true
      error.value = null
      const response = await meetingsApi.update(meetingId, updates)
      const updatedMeeting = (response as any)?.data || (response as any)

      const index = meetings.value.findIndex((meeting) => meeting.id === meetingId)
      if (index !== -1) {
        meetings.value[index] = updatedMeeting
      }

      return updatedMeeting
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update meeting"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateMeetingStatus = async (meetingId: string, status: MeetingStatus) => {
    try {
      loading.value = true
      error.value = null
      const response = await meetingsApi.updateStatus(meetingId, status)
      const updatedMeeting = (response as any)?.data || (response as any)

      const index = meetings.value.findIndex((meeting) => meeting.id === meetingId)
      if (index !== -1) {
        meetings.value[index] = updatedMeeting
      }

      return updatedMeeting
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update meeting status"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteMeeting = async (meetingId: string) => {
    try {
      loading.value = true
      error.value = null
      await meetingsApi.delete(meetingId)

      const index = meetings.value.findIndex((meeting) => meeting.id === meetingId)
      if (index !== -1) {
        meetings.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete meeting"
      throw err
    } finally {
      loading.value = false
    }
  }

  const exportToIcs = async (meetingId: string) => {
    try {
      const blob = await meetingsApi.exportToIcs(meetingId)
      const meeting = getMeetingById(meetingId)
      const filename = meeting
        ? `${meeting.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.ics`
        : `meeting_${meetingId}.ics`

      // Download the .ics file
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to export meeting"
      throw err
    }
  }

  const sendInvitation = async (meetingId: string, emails?: string[]) => {
    try {
      loading.value = true
      error.value = null
      await meetingsApi.sendInvitation(meetingId, emails)
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to send invitation"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFilters = (newFilters: Partial<MeetingFilters>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  const clearFilters = () => {
    filters.value = {}
  }

  const getMeetingById = (meetingId: string) => {
    return meetings.value.find((meeting) => meeting.id === meetingId)
  }

  return {
    // State
    meetings,
    loading,
    error,
    filters,

    // Getters
    filteredMeetings,
    meetingsByStatus,
    upcomingMeetings,
    pastMeetings,
    todayMeetings,
    meetingStats,

    // Actions
    fetchMeetings,
    createMeeting,
    updateMeeting,
    updateMeetingStatus,
    deleteMeeting,
    exportToIcs,
    sendInvitation,
    updateFilters,
    clearFilters,
    getMeetingById,
  }
})
