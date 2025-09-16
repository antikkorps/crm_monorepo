import { teamApi, usersApi } from "@/services/api"
import type {
  Team,
  TeamCreationAttributes,
  TeamUpdateAttributes,
  User,
  UserUpdateAttributes,
} from "@medical-crm/shared"
import { defineStore } from "pinia"
import { computed, ref } from "vue"

export const useTeamStore = defineStore("team", () => {
  // State
  const teams = ref<Team[]>([])
  const teamMembers = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selectedTeam = ref<Team | null>(null)

  // Getters
  const currentTeamMembers = computed(() => {
    if (!selectedTeam.value) return []
    return teamMembers.value.filter((member) => member.teamId === selectedTeam.value?.id)
  })

  const teamStats = computed(() => ({
    totalTeams: teams.value.length,
    totalMembers: teamMembers.value.length,
    activeMembers: teamMembers.value.filter((member) => member.isActive).length,
    inactiveMembers: teamMembers.value.filter((member) => !member.isActive).length,
  }))

  const membersByRole = computed(() => {
    return {
      super_admin: teamMembers.value.filter((member) => member.role === "super_admin"),
      team_admin: teamMembers.value.filter((member) => member.role === "team_admin"),
      user: teamMembers.value.filter((member) => member.role === "user"),
    }
  })

  // Actions
  const fetchTeams = async () => {
    try {
      loading.value = true
      error.value = null
      const response = await teamApi.getAll()
      const data = (response as any).data || response

      // Handle paginated response: {teams: [...], pagination: {...}}
      let teamsArray: any[] = []
      if (Array.isArray(data)) {
        teamsArray = data
      } else if (data && Array.isArray(data.teams)) {
        teamsArray = data.teams
      } else {
        console.warn("Teams API response format unexpected:", data)
        teamsArray = []
      }

      teams.value = teamsArray
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch teams"
      console.error("Error fetching teams:", err)
      teams.value = []
    } finally {
      loading.value = false
    }
  }

  const fetchTeamMembers = async (teamId?: string) => {
    try {
      loading.value = true
      error.value = null

      if (teamId) {
        const response = await teamApi.getById(teamId)
        const team = (response as any).data || response
        teamMembers.value = Array.isArray(team.members) ? team.members : []
      } else {
        // Fetch all users (simpler approach)
        const usersResponse = await usersApi.getAll()
        const usersData = (usersResponse as any).data || usersResponse

        // Handle paginated response for users
        let usersArray: User[] = []
        if (Array.isArray(usersData)) {
          usersArray = usersData
        } else if (usersData && Array.isArray(usersData.users)) {
          usersArray = usersData.users
        } else {
          console.warn("Users API response format unexpected:", usersData)
          usersArray = []
        }

        teamMembers.value = usersArray
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch team members"
      console.error("Error fetching team members:", err)
    } finally {
      loading.value = false
    }
  }

  const createTeam = async (teamData: TeamCreationAttributes) => {
    try {
      loading.value = true
      error.value = null
      const response = await teamApi.create(teamData)
      const newTeam = (response as any).data || response
      teams.value.push(newTeam)
      return newTeam
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to create team"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateTeam = async (teamId: string, updates: TeamUpdateAttributes) => {
    try {
      loading.value = true
      error.value = null
      const response = await teamApi.update(teamId, updates)
      const updatedTeam = (response as any).data || response

      const index = teams.value.findIndex((team) => team.id === teamId)
      if (index !== -1) {
        teams.value[index] = updatedTeam
      }

      return updatedTeam
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update team"
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteTeam = async (teamId: string) => {
    try {
      loading.value = true
      error.value = null
      await teamApi.delete(teamId)

      const index = teams.value.findIndex((team) => team.id === teamId)
      if (index !== -1) {
        teams.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to delete team"
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateUserProfile = async (userId: string, updates: UserUpdateAttributes) => {
    try {
      loading.value = true
      error.value = null
      const response = await usersApi.update(userId, updates)
      const updatedUser = (response as any).data || response

      const index = teamMembers.value.findIndex((member) => member.id === userId)
      if (index !== -1) {
        teamMembers.value[index] = updatedUser
      }

      return updatedUser
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to update user profile"
      throw err
    } finally {
      loading.value = false
    }
  }

  const assignUserToTeam = async (userId: string, teamId: string) => {
    try {
      loading.value = true
      error.value = null

      // Update user's team assignment
      await updateUserProfile(userId, { teamId })

      // Refresh team members
      await fetchTeamMembers()
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to assign user to team"
      throw err
    } finally {
      loading.value = false
    }
  }

  const removeUserFromTeam = async (userId: string) => {
    try {
      loading.value = true
      error.value = null

      // Remove user's team assignment
      await updateUserProfile(userId, { teamId: undefined })

      // Refresh team members
      await fetchTeamMembers()
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to remove user from team"
      throw err
    } finally {
      loading.value = false
    }
  }

  const setSelectedTeam = (team: Team | null) => {
    selectedTeam.value = team
  }

  const getTeamById = (teamId: string) => {
    return teams.value.find((team) => team.id === teamId)
  }

  const getUserById = (userId: string) => {
    return teamMembers.value.find((member) => member.id === userId)
  }

  const getTeamMembers = (teamId: string) => {
    return teamMembers.value.filter((member) => member.teamId === teamId)
  }

  return {
    // State
    teams,
    teamMembers,
    loading,
    error,
    selectedTeam,

    // Getters
    currentTeamMembers,
    teamStats,
    membersByRole,

    // Actions
    fetchTeams,
    fetchTeamMembers,
    createTeam,
    updateTeam,
    deleteTeam,
    updateUserProfile,
    assignUserToTeam,
    removeUserFromTeam,
    setSelectedTeam,
    getTeamById,
    getUserById,
    getTeamMembers,
  }
})
