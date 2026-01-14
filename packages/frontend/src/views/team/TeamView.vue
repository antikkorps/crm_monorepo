<template>
  <AppLayout>
    <div class="team-view">
      <!-- Header -->
      <div class="team-header">
        <div class="header-content">
          <h1 class="page-title">
            <v-icon>mdi-account-group</v-icon>
            {{ t("teams.title") }}
          </h1>
          <p class="page-description">
            {{ t("teams.subtitle") }}
          </p>
        </div>
        <div class="header-actions">
          <v-btn
            color="secondary"
            variant="outlined"
            prepend-icon="mdi-account-multiple-plus"
            @click="showCreateTeamDialog = true"
            class="add-team-btn"
          >
            {{ t("teams.createNew") }}
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-account-plus"
            @click="showCreateUserDialog = true"
            class="add-member-btn"
          >
            {{ t("teams.addMember") }}
          </v-btn>
        </div>
      </div>

      <!-- Team Statistics -->
      <div class="team-stats">
        <div class="stats-grid">
          <v-card class="stat-card">
            <v-card-text>
              <div class="stat-content">
                <div class="stat-icon total-members">
                  <v-icon>mdi-account-group</v-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ teamStore.teamStats.totalMembers }}</div>
                  <div class="stat-label">{{ t("teams.totalMembers") }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stat-card">
            <v-card-text>
              <div class="stat-content">
                <div class="stat-icon active-members">
                  <v-icon>mdi-check-circle</v-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ teamStore.teamStats.activeMembers }}</div>
                  <div class="stat-label">{{ t("teams.activeMembers") }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stat-card">
            <v-card-text>
              <div class="stat-content">
                <div class="stat-icon total-teams">
                  <v-icon>mdi-sitemap</v-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ teamStore.teamStats.totalTeams }}</div>
                  <div class="stat-label">
                    {{
                      teamStore.teamStats.totalTeams === 1
                        ? t("teams.singleTeam")
                        : t("teams.multipleTeams")
                    }}
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stat-card">
            <v-card-text>
              <div class="stat-content">
                <div class="stat-icon admins">
                  <v-icon>mdi-shield-account</v-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ adminCount }}</div>
                  <div class="stat-label">{{ t("teams.administrators") }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Filters and Controls -->
      <div class="team-controls">
        <div class="search-section">
          <v-text-field
            v-model="searchQuery"
            :placeholder="t('teams.searchPlaceholder')"
            prepend-inner-icon="mdi-magnify"
            class="search-input"
            density="comfortable"
          />
        </div>

        <div class="filter-section">
          <v-select
            v-model="selectedRole"
            :items="roleFilterOptions"
            item-title="label"
            item-value="value"
            :placeholder="t('teams.filterByRole')"
            clearable
            class="role-filter"
            density="comfortable"
          />

          <v-select
            v-model="selectedTeam"
            :items="teamFilterOptions"
            item-title="label"
            item-value="value"
            :placeholder="t('teams.filterByTeam')"
            clearable
            class="team-filter"
            :loading="teamStore.loading"
            density="comfortable"
          />

          <v-select
            v-model="selectedStatus"
            :items="statusFilterOptions"
            item-title="label"
            item-value="value"
            :placeholder="t('teams.filterByStatus')"
            clearable
            class="status-filter"
            density="comfortable"
          />
        </div>

        <div class="view-controls">
          <v-btn
            :color="viewMode === 'grid' ? 'primary' : 'secondary'"
            :variant="viewMode === 'grid' ? 'flat' : 'outlined'"
            prepend-icon="mdi-view-grid"
            @click="viewMode = 'grid'"
            size="small"
          >
            {{ t("teams.gridView") }}
          </v-btn>
          <v-btn
            :color="viewMode === 'list' ? 'primary' : 'secondary'"
            :variant="viewMode === 'list' ? 'flat' : 'outlined'"
            prepend-icon="mdi-view-list"
            @click="viewMode = 'list'"
            size="small"
          >
            {{ t("teams.listView") }}
          </v-btn>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="teamStore.loading" class="loading-container">
        <v-progress-circular indeterminate color="primary" />
        <p>{{ t("teams.loadingMembers") }}</p>
      </div>

      <!-- Error State -->
      <v-alert v-else-if="teamStore.error" type="error" class="error-message" closable>
        {{ teamStore.error }}
        <template #append>
          <v-btn icon="mdi-refresh" size="small" variant="text" @click="loadTeamData" />
        </template>
      </v-alert>

      <!-- Empty State -->
      <div v-else-if="filteredMembers.length === 0" class="empty-state">
        <div class="empty-content">
          <v-icon class="empty-icon">mdi-account-group</v-icon>
          <h3>{{ t("teams.noMembersFound") }}</h3>
          <p v-if="hasActiveFilters">
            {{ t("teams.noMembersMatchFilters") }}
          </p>
          <p v-else>
            {{ t("teams.getStarted") }}
          </p>
          <div class="empty-actions">
            <v-btn
              v-if="hasActiveFilters"
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-filter-off"
              @click="clearFilters"
            >
              {{ t("teams.clearFilters") }}
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-account-plus"
              @click="showCreateUserDialog = true"
            >
              {{ t("teams.addMember") }}
            </v-btn>
          </div>
        </div>
      </div>

      <!-- Team Members Content -->
      <div v-else class="team-content">
        <div class="content-layout">
          <div class="main-content">
            <!-- Teams Section -->
            <div class="teams-section">
              <div class="section-header">
                <h3>
                  {{
                    teamStore.teams.length === 1
                      ? t("teams.singleTeam")
                      : t("teams.multipleTeams")
                  }}
                  ({{ teamStore.teams.length }})
                </h3>
              </div>
              <div class="teams-grid">
                <TeamCard
                  v-for="team in teamStore.teams"
                  :key="team.id"
                  :team="team"
                  :team-members="teamStore.getTeamMembers(team.id)"
                  @edit="editTeam"
                  @manage="manageTeam"
                  @add-member="addMemberToTeam"
                  @view-details="viewTeamDetails"
                />
              </div>
            </div>

            <!-- Members Section -->
            <div class="members-section">
              <div class="section-header">
                <h3>{{ t("teams.teamMembers") }} ({{ filteredMembers.length }})</h3>
              </div>

              <!-- Grid View -->
              <div v-if="viewMode === 'grid'" class="members-grid">
                <UserCard
                  v-for="member in filteredMembers"
                  :key="member.id"
                  :user="member"
                  :team-name="getTeamName(member.teamId)"
                  :assigned-institutions="getUserInstitutions(member.id)"
                  :user-stats="getUserStats(member.id)"
                  @edit="editUser"
                  @manage="manageUser"
                />
              </div>

              <!-- List View -->
              <div v-else class="members-list">
                <v-data-table
                  :items="filteredMembers"
                  :headers="tableHeaders"
                  :items-per-page="10"
                  :items-per-page-options="[5, 10, 20, 50]"
                  class="members-table"
                >
                  <template #item.firstName="{ item }">
                    <div class="user-name-cell">
                      <v-avatar size="40" class="me-3" :color="getUserAvatarColor(item)">
                        <img :src="getUserAvatar(item)" :alt="getUserInitials(item)" />
                      </v-avatar>
                      <div>
                        <div class="name">{{ item.firstName }} {{ item.lastName }}</div>
                        <div class="email">{{ item.email }}</div>
                      </div>
                    </div>
                  </template>

                  <template #item.role="{ item }">
                    <v-chip :color="getRoleSeverity(item.role)" size="small">
                      {{ getRoleLabel(item.role) }}
                    </v-chip>
                  </template>

                  <template #item.teamId="{ item }">
                    <span v-if="item.teamId">{{ getTeamName(item.teamId) }}</span>
                    <span v-else class="no-team">No team assigned</span>
                  </template>

                  <template #item.isActive="{ item }">
                    <v-chip :color="item.isActive ? 'success' : 'error'" size="small">
                      {{ item.isActive ? "Active" : "Inactive" }}
                    </v-chip>
                  </template>

                  <template #item.lastLoginAt="{ item }">
                    <span v-if="item.lastLoginAt">{{
                      formatLastLogin(item.lastLoginAt)
                    }}</span>
                    <span v-else class="no-login">Never</span>
                  </template>

                  <template #item.actions="{ item }">
                    <div class="table-actions">
                      <v-btn
                        icon="mdi-pencil"
                        size="small"
                        variant="text"
                        @click="editUser(item)"
                      />
                      <v-btn
                        icon="mdi-cog"
                        size="small"
                        variant="text"
                        @click="manageUser(item)"
                      />
                    </div>
                  </template>
                </v-data-table>
              </div>
            </div>
          </div>

          <!-- Activity Feed Sidebar -->
          <div v-if="teamStore.selectedTeam" class="activity-section">
            <TeamActivityFeed :team-id="teamStore.selectedTeam.id" />
          </div>
        </div>
      </div>

      <!-- User Profile Form Dialog -->
      <UserProfileForm
        v-model="showCreateUserDialog"
        :loading="formLoading"
        @submit="createUser"
        @cancel="showCreateUserDialog = false"
      />

      <UserProfileForm
        v-model="showEditUserDialog"
        :user="selectedUser"
        :loading="formLoading"
        @submit="updateUser"
        @cancel="showEditUserDialog = false"
      />

      <!-- User Management Dialog -->
      <v-dialog v-model="showManageUserDialog" max-width="500px" persistent>
        <v-card>
          <v-card-title>
            Manage User: {{ selectedUser?.firstName }} {{ selectedUser?.lastName }}
          </v-card-title>

          <v-card-text class="manage-user-content">
            <div class="management-section">
              <h4>Team Assignment</h4>
              <v-select
                v-model="managementData.teamId"
                :items="teamOptions"
                item-title="label"
                item-value="value"
                placeholder="Select team"
                clearable
                density="comfortable"
              />
            </div>

            <div class="management-section">
              <h4>Territory Assignment</h4>
              <v-select
                v-model="managementData.assignedInstitutions"
                :items="institutionOptions"
                item-title="label"
                item-value="value"
                placeholder="Select institutions"
                multiple
                density="comfortable"
                :menu-props="{ maxHeight: 200 }"
              />
            </div>

            <div class="management-section">
              <h4>User Status</h4>
              <div class="status-controls">
                <v-checkbox
                  v-model="managementData.isActive"
                  label="Active User"
                  density="comfortable"
                />
              </div>
            </div>

            <div class="management-section">
              <h4>Account Actions</h4>
              <v-btn
                color="warning"
                variant="outlined"
                prepend-icon="mdi-lock-reset"
                @click="openPasswordResetDialog(selectedUser!)"
                :disabled="!selectedUser"
                block
              >
                Reset Password
              </v-btn>
            </div>
          </v-card-text>

          <v-card-actions class="dialog-footer">
            <v-spacer />
            <v-btn
              color="secondary"
              variant="outlined"
              @click="showManageUserDialog = false"
            >
              Cancel
            </v-btn>
            <v-btn color="primary" :loading="formLoading" @click="saveUserManagement">
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Password Reset Dialog -->
      <PasswordResetDialog
        v-model="showPasswordResetDialog"
        :user-id="selectedUser?.id || ''"
        :user-name="`${selectedUser?.firstName || ''} ${selectedUser?.lastName || ''}`"
        :loading="passwordResetLoading"
        @submit="resetUserPassword"
        @cancel="showPasswordResetDialog = false"
      />

      <!-- Create Team Dialog -->
      <CreateTeamDialog
        v-model="showCreateTeamDialog"
        @team-created="handleTeamCreated"
      />

      <!-- Edit Team Dialog -->
      <EditTeamDialog
        v-model="showEditTeamDialog"
        :team="selectedTeamForEdit"
        @team-updated="handleTeamUpdated"
        @team-deleted="handleTeamDeleted"
      />

      <!-- Add Team Member Dialog -->
      <AddTeamMemberDialog
        v-model="showAddMemberDialog"
        :team="selectedTeamForMember"
        @member-added="handleMemberAdded"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import AddTeamMemberDialog from "@/components/team/AddTeamMemberDialog.vue"
import CreateTeamDialog from "@/components/team/CreateTeamDialog.vue"
import EditTeamDialog from "@/components/team/EditTeamDialog.vue"
import PasswordResetDialog from "@/components/team/PasswordResetDialog.vue"
import TeamActivityFeed from "@/components/team/TeamActivityFeed.vue"
import TeamCard from "@/components/team/TeamCard.vue"
import UserCard from "@/components/team/UserCard.vue"
import UserProfileForm from "@/components/team/UserProfileForm.vue"
import { useSnackbar } from "@/composables/useSnackbar"
import { institutionsApi, teamApi, usersApi } from "@/services/api"
import { AvatarService } from "@/services/avatarService"
import { useTeamStore } from "@/stores/team"
import type {
  ApiResponse,
  User,
  UserCreationAttributes,
  UserUpdateAttributes,
} from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const teamStore = useTeamStore()
const router = useRouter()
const { showSnackbar } = useSnackbar()
const { t } = useI18n()

// Component state
const viewMode = ref<"grid" | "list">("grid")
const searchQuery = ref("")
const selectedRole = ref("")
const selectedTeam = ref("")
const selectedStatus = ref("")

// Synchronize selectedTeam with teamStore.selectedTeam
watch(selectedTeam, (newTeamId) => {
  if (newTeamId) {
    const team = teamStore.getTeamById(newTeamId)
    teamStore.setSelectedTeam(team || null)
  } else {
    teamStore.setSelectedTeam(null)
  }
})
const showCreateUserDialog = ref(false)
const showEditUserDialog = ref(false)
const showManageUserDialog = ref(false)
const showPasswordResetDialog = ref(false)
const showCreateTeamDialog = ref(false)
const showEditTeamDialog = ref(false)
const showAddMemberDialog = ref(false)
const selectedUser = ref<User | null>(null)
const selectedTeamForEdit = ref<any | null>(null)
const selectedTeamForMember = ref<any | null>(null)
const formLoading = ref(false)
const passwordResetLoading = ref(false)

// Management data
const managementData = ref({
  teamId: "",
  assignedInstitutions: [] as string[],
  isActive: true,
})

// Options
const teamOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])

const roleFilterOptions = computed(() => [
  { label: t("profile.roles.super_admin"), value: "super_admin" },
  { label: t("profile.roles.team_admin"), value: "team_admin" },
  { label: t("profile.roles.user"), value: "user" },
])

const teamFilterOptions = computed(() => teamOptions.value)

const statusFilterOptions = computed(() => [
  { label: t("teams.statusActive"), value: "active" },
  { label: t("teams.statusInactive"), value: "inactive" },
])

const tableHeaders = computed(() => [
  { title: t("common.labels.name"), key: "firstName", sortable: true },
  { title: t("teams.role"), key: "role", sortable: true },
  { title: t("teams.team"), key: "teamId", sortable: true },
  { title: t("common.labels.status"), key: "isActive", sortable: true },
  { title: t("teams.lastLogin"), key: "lastLoginAt", sortable: true },
  { title: t("common.actions.view"), key: "actions", sortable: false },
])

const adminCount = computed(() => {
  return (
    teamStore.membersByRole.super_admin.length + teamStore.membersByRole.team_admin.length
  )
})

const hasActiveFilters = computed(() => {
  return (
    searchQuery.value || selectedRole.value || selectedTeam.value || selectedStatus.value
  )
})

const filteredMembers = computed(() => {
  let members = [...teamStore.teamMembers]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    members = members.filter(
      (member) =>
        member.firstName.toLowerCase().includes(query) ||
        member.lastName.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
    )
  }

  // Role filter
  if (selectedRole.value) {
    members = members.filter((member) => member.role === selectedRole.value)
  }

  // Team filter
  if (selectedTeam.value) {
    members = members.filter((member) => member.teamId === selectedTeam.value)
  }

  // Status filter
  if (selectedStatus.value) {
    const isActive = selectedStatus.value === "active"
    members = members.filter((member) => member.isActive === isActive)
  }

  return members
})

const getUserAvatar = (user: User) => {
  console.log("TeamView - User data:", user)
  console.log("TeamView - avatarSeed:", user.avatarSeed)
  console.log("TeamView - avatarStyle:", user.avatarStyle)

  // Si l'utilisateur n'a pas de avatarSeed ou avatarStyle, générer à partir du nom
  if (!user.avatarSeed || !user.avatarStyle) {
    const fallbackUrl = AvatarService.generateUserAvatar(user.firstName, user.lastName, {
      size: 40,
    })
    console.log("TeamView - Using fallback avatar:", fallbackUrl)
    return fallbackUrl
  }

  const avatarUrl = AvatarService.generateAvatarFromSeed(user.avatarSeed, {
    style: user.avatarStyle,
    size: 40,
  })
  console.log("TeamView - Using seed avatar:", avatarUrl)
  return avatarUrl
}

const getUserInitials = (user: User) => {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

const getUserAvatarColor = (user: User) => {
  const colors = [
    "primary",
    "secondary",
    "success",
    "info",
    "warning",
    "error",
    "purple",
    "pink",
    "indigo",
    "teal",
    "cyan",
    "orange",
  ]
  const name = `${user.firstName}${user.lastName}`
  const index = name.length % colors.length
  return colors[index]
}

const getRoleLabel = (role: string) => {
  const labels = {
    super_admin: t("profile.roles.super_admin"),
    team_admin: t("profile.roles.team_admin"),
    user: t("profile.roles.user"),
  }
  return labels[role as keyof typeof labels] || role
}

const getRoleSeverity = (role: string) => {
  const severities = {
    super_admin: "error",
    team_admin: "warning",
    user: "info",
  }
  return severities[role as keyof typeof severities] as any
}

const getTeamName = (teamId?: string) => {
  if (!teamId) return ""
  const team = teamStore.getTeamById(teamId)
  return team?.name || t("teams.unknownTeam")
}

const getUserInstitutions = (userId: string) => {
  // Mock data - in real app, this would come from API
  return []
}

const getUserStats = (userId: string) => {
  // Mock data - in real app, this would come from API
  return {
    assignedTasks: Math.floor(Math.random() * 10),
    completedTasks: Math.floor(Math.random() * 8),
  }
}

const formatLastLogin = (date: Date | string) => {
  const loginDate = new Date(date)
  const now = new Date()
  const diffTime = now.getTime() - loginDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t("common.time.today")
  if (diffDays === 1) return t("common.time.yesterday")
  if (diffDays < 7) return t("teams.daysAgo", { days: diffDays })

  return loginDate.toLocaleDateString()
}

const loadTeamData = async () => {
  try {
    await Promise.all([
      teamStore.fetchTeams(),
      teamStore.fetchTeamMembers(),
      loadOptions(),
    ])
  } catch (error) {
    showSnackbar("Failed to load team data", "error")
  }
}

const loadOptions = async () => {
  try {
    // Load teams
    const teamsResponse = (await teamApi.getAll()) as ApiResponse<any[]>
    const teams = teamsResponse.data || teamsResponse
    if (Array.isArray(teams)) {
      teamOptions.value = teams.map((team: any) => ({
        label: team.name,
        value: team.id,
      }))
    } else {
      console.warn("Teams response is not an array:", teams)
      teamOptions.value = []
    }

    // Load institutions
    const institutionsResponse = (await institutionsApi.getAll()) as ApiResponse<any>
    const institutionsData = institutionsResponse.data || institutionsResponse

    // Handle paginated response: {institutions: [...], pagination: {...}}
    let institutionsArray: any[] = []
    if (Array.isArray(institutionsData)) {
      institutionsArray = institutionsData
    } else if (institutionsData && Array.isArray(institutionsData.institutions)) {
      institutionsArray = institutionsData.institutions
    } else {
      console.warn("Institutions response format unexpected:", institutionsData)
      institutionsArray = []
    }

    institutionOptions.value = institutionsArray.map((institution: any) => ({
      label: institution.name,
      value: institution.id,
    }))
  } catch (error) {
    console.error("Error loading options:", error)
    // Set empty arrays on error to prevent further issues
    teamOptions.value = []
    institutionOptions.value = []
  }
}

const createUser = async (userData: UserCreationAttributes | UserUpdateAttributes) => {
  try {
    formLoading.value = true
    // Type guard to ensure we have a password for creation
    if (!("password" in userData) || !userData.password) {
      showSnackbar(t("teams.passwordRequired"), "error")
      return
    }
    await usersApi.create(userData as UserCreationAttributes)
    showCreateUserDialog.value = false
    showSnackbar(t("teams.userCreatedSuccess"), "success")
    await loadTeamData()
  } catch (error: any) {
    const message = error?.message || t("teams.errorCreatingUser")
    showSnackbar(message, "error")
  } finally {
    formLoading.value = false
  }
}

const editUser = (user: User) => {
  selectedUser.value = user
  showEditUserDialog.value = true
}

const updateUser = async (updates: UserUpdateAttributes) => {
  if (!selectedUser.value) return

  try {
    formLoading.value = true
    await teamStore.updateUserProfile(selectedUser.value.id, updates)
    showEditUserDialog.value = false
    selectedUser.value = null
    showSnackbar("User updated successfully", "success")
  } catch (error) {
    showSnackbar("Failed to update user", "error")
  } finally {
    formLoading.value = false
  }
}

const manageUser = (user: User) => {
  selectedUser.value = user
  managementData.value = {
    teamId: user.teamId || "",
    assignedInstitutions: [], // Load from API
    isActive: user.isActive,
  }
  showManageUserDialog.value = true
}

const saveUserManagement = async () => {
  if (!selectedUser.value) return

  try {
    formLoading.value = true

    // Update user profile
    await teamStore.updateUserProfile(selectedUser.value.id, {
      teamId: managementData.value.teamId || undefined,
      isActive: managementData.value.isActive,
    })

    // Handle territory assignment (would be separate API call)
    console.log("Assigning institutions:", managementData.value.assignedInstitutions)

    showManageUserDialog.value = false
    selectedUser.value = null

    showSnackbar("User management updated successfully", "success")
  } catch (error) {
    showSnackbar("Failed to update user management", "error")
  } finally {
    formLoading.value = false
  }
}

const openPasswordResetDialog = (user: User) => {
  selectedUser.value = user
  showPasswordResetDialog.value = true
}

const resetUserPassword = async (userId: string, newPassword: string) => {
  try {
    passwordResetLoading.value = true
    await usersApi.resetPassword(userId, newPassword)
    showPasswordResetDialog.value = false
    selectedUser.value = null
    showSnackbar("Password reset successfully", "success")
  } catch (error: any) {
    const message = error?.message || "Failed to reset password"
    showSnackbar(message, "error")
  } finally {
    passwordResetLoading.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ""
  selectedRole.value = ""
  selectedTeam.value = ""
  selectedStatus.value = ""
}

const editTeam = (team: any) => {
  selectedTeamForEdit.value = team
  showEditTeamDialog.value = true
}

const manageTeam = (team: any) => {
  // Open edit team dialog
  editTeam(team)
}

const addMemberToTeam = (team: any) => {
  selectedTeamForMember.value = team
  showAddMemberDialog.value = true
}

const viewTeamDetails = (team: any) => {
  // Navigate to team detail page
  router.push(`/teams/${team.id}`)
}

const handleTeamCreated = async () => {
  try {
    await teamStore.fetchTeams()
    showSnackbar(t("teams.teamCreatedSuccess"), "success")
  } catch (error) {
    console.error("Error refreshing teams:", error)
  }
}

const handleTeamUpdated = async () => {
  try {
    await teamStore.fetchTeams()
    showSnackbar(t("teams.teamUpdatedSuccess"), "success")
  } catch (error) {
    console.error("Error refreshing teams:", error)
  }
}

const handleTeamDeleted = async () => {
  try {
    await teamStore.fetchTeams()
    showSnackbar(t("teams.teamDeletedSuccess"), "success")
  } catch (error) {
    console.error("Error refreshing teams:", error)
  }
}

const handleMemberAdded = async () => {
  try {
    await Promise.all([teamStore.fetchTeams(), teamStore.fetchTeamMembers()])
    showSnackbar(t("teams.memberAddedSuccess"), "success")
  } catch (error) {
    console.error("Error refreshing team data:", error)
  }
}

onMounted(() => {
  loadTeamData()
})
</script>

<style scoped>
.team-view {
  padding: 1.5rem;
  background: #f8f9fa;
  min-height: 100vh;
}

/* Header */
.team-header {
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

/* Statistics */
.team-stats {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 1.25rem;
  color: white;
}

.total-members {
  background-color: #3b82f6;
}

.active-members {
  background-color: #10b981;
}

.total-teams {
  background-color: #8b5cf6;
}

.admins {
  background-color: #f59e0b;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

/* Controls */
.team-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  background: white;
  padding: 1rem;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.search-section {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
}

.filter-section {
  display: flex;
  gap: 0.75rem;
}

.role-filter,
.team-filter,
.status-filter {
  min-width: 150px;
}

.view-controls {
  display: flex;
  gap: 0.5rem;
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

/* Content Layout */
.team-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.content-layout {
  display: grid;
  grid-template-columns: 1fr 350px;
  min-height: 600px;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Teams Section */
.teams-section {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.members-section {
  padding: 1.5rem;
}

.activity-section {
  background: #f9fafb;
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

/* Grid View */
.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

/* List View */
.members-list {
  margin-top: 1rem;
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.name {
  font-weight: 500;
  color: #374151;
}

.email {
  font-size: 0.875rem;
  color: #6b7280;
}

.no-team,
.no-login {
  color: #9ca3af;
  font-style: italic;
}

.table-actions {
  display: flex;
  gap: 0.25rem;
}

/* Management Dialog */
.manage-user-dialog {
  width: 90vw;
  max-width: 500px;
}

.manage-user-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.management-section h4 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.status-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-item label {
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .content-layout {
    grid-template-columns: 1fr;
  }

  .activity-section {
    border-top: 1px solid #e5e7eb;
    border-right: none;
  }
}

@media (max-width: 768px) {
  .team-view {
    padding: 0.75rem;
  }

  .team-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
    padding: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .page-description {
    font-size: 0.9rem;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .header-actions .v-btn {
    width: 100%;
  }

  .team-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .filter-section {
    flex-direction: column;
    gap: 0.5rem;
  }

  .view-controls {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .teams-section {
    padding: 1rem;
  }

  .teams-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .members-section {
    padding: 1rem;
  }

  .members-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .content-layout {
    gap: 0;
  }

  .main-content {
    gap: 0;
  }
}

@media (max-width: 480px) {
  .team-view {
    padding: 0.5rem;
  }

  .team-header {
    padding: 0.75rem;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-content {
    padding: 0.25rem;
  }

  .teams-section,
  .members-section {
    padding: 0.75rem;
  }

  .empty-actions {
    flex-direction: column;
  }

  .section-header h3 {
    font-size: 1rem;
  }
}
</style>
