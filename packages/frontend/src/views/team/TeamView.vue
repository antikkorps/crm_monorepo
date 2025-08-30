<template>
  <AppLayout>
    <div class="team-view">
      <!-- Header -->
      <div class="team-header">
        <div class="header-content">
          <h1 class="page-title">
            <i class="pi pi-users mr-2"></i>
            Team Management
          </h1>
          <p class="page-description">
            Manage team members, roles, and territory assignments
          </p>
        </div>
        <div class="header-actions">
          <Button
            label="Add Member"
            icon="pi pi-user-plus"
            @click="showCreateUserDialog = true"
            class="add-member-btn"
          />
        </div>
      </div>

      <!-- Team Statistics -->
      <div class="team-stats">
        <div class="stats-grid">
          <Card class="stat-card">
            <template #content>
              <div class="stat-content">
                <div class="stat-icon total-members">
                  <i class="pi pi-users"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ teamStore.teamStats.totalMembers }}</div>
                  <div class="stat-label">Total Members</div>
                </div>
              </div>
            </template>
          </Card>

          <Card class="stat-card">
            <template #content>
              <div class="stat-content">
                <div class="stat-icon active-members">
                  <i class="pi pi-check-circle"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ teamStore.teamStats.activeMembers }}</div>
                  <div class="stat-label">Active Members</div>
                </div>
              </div>
            </template>
          </Card>

          <Card class="stat-card">
            <template #content>
              <div class="stat-content">
                <div class="stat-icon total-teams">
                  <i class="pi pi-sitemap"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ teamStore.teamStats.totalTeams }}</div>
                  <div class="stat-label">Teams</div>
                </div>
              </div>
            </template>
          </Card>

          <Card class="stat-card">
            <template #content>
              <div class="stat-content">
                <div class="stat-icon admins">
                  <i class="pi pi-shield"></i>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ adminCount }}</div>
                  <div class="stat-label">Administrators</div>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Filters and Controls -->
      <div class="team-controls">
        <div class="search-section">
          <InputText
            v-model="searchQuery"
            placeholder="Search team members..."
            class="search-input"
          >
            <template #prefix>
              <i class="pi pi-search"></i>
            </template>
          </InputText>
        </div>

        <div class="filter-section">
          <Dropdown
            v-model="selectedRole"
            :options="roleFilterOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by role"
            showClear
            class="role-filter"
          />

          <Dropdown
            v-model="selectedTeam"
            :options="teamFilterOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by team"
            showClear
            class="team-filter"
            :loading="teamStore.loading"
          />

          <Dropdown
            v-model="selectedStatus"
            :options="statusFilterOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by status"
            showClear
            class="status-filter"
          />
        </div>

        <div class="view-controls">
          <Button
            label="Grid View"
            icon="pi pi-th-large"
            :severity="viewMode === 'grid' ? 'primary' : 'secondary'"
            :outlined="viewMode !== 'grid'"
            @click="viewMode = 'grid'"
            size="small"
          />
          <Button
            label="List View"
            icon="pi pi-list"
            :severity="viewMode === 'list' ? 'primary' : 'secondary'"
            :outlined="viewMode !== 'list'"
            @click="viewMode = 'list'"
            size="small"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="teamStore.loading" class="loading-container">
        <ProgressSpinner />
        <p>Loading team members...</p>
      </div>

      <!-- Error State -->
      <Message
        v-else-if="teamStore.error"
        severity="error"
        :closable="false"
        class="error-message"
      >
        {{ teamStore.error }}
        <template #icon>
          <Button
            icon="pi pi-refresh"
            text
            @click="loadTeamData"
            v-tooltip.top="'Retry'"
          />
        </template>
      </Message>

      <!-- Empty State -->
      <div v-else-if="filteredMembers.length === 0" class="empty-state">
        <div class="empty-content">
          <i class="pi pi-users empty-icon"></i>
          <h3>No team members found</h3>
          <p v-if="hasActiveFilters">
            No team members match your current filters. Try adjusting your search
            criteria.
          </p>
          <p v-else>
            Get started by adding your first team member to begin collaboration.
          </p>
          <div class="empty-actions">
            <Button
              v-if="hasActiveFilters"
              label="Clear Filters"
              icon="pi pi-filter-slash"
              outlined
              @click="clearFilters"
            />
            <Button
              label="Add Member"
              icon="pi pi-user-plus"
              @click="showCreateUserDialog = true"
            />
          </div>
        </div>
      </div>

      <!-- Team Members Content -->
      <div v-else class="team-content">
        <div class="content-layout">
          <!-- Members Section -->
          <div class="members-section">
            <div class="section-header">
              <h3>Team Members ({{ filteredMembers.length }})</h3>
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
              <DataTable
                :value="filteredMembers"
                :paginator="true"
                :rows="10"
                :rowsPerPageOptions="[5, 10, 20, 50]"
                paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                currentPageReportTemplate="{first} to {last} of {totalRecords}"
                class="members-table"
                stripedRows
                responsiveLayout="scroll"
              >
                <Column field="firstName" header="Name" sortable>
                  <template #body="{ data }">
                    <div class="user-name-cell">
                      <Avatar
                        :image="getUserAvatar(data.id)"
                        :label="getUserInitials(data)"
                        size="normal"
                        shape="circle"
                        class="mr-2"
                      />
                      <div>
                        <div class="name">{{ data.firstName }} {{ data.lastName }}</div>
                        <div class="email">{{ data.email }}</div>
                      </div>
                    </div>
                  </template>
                </Column>

                <Column field="role" header="Role" sortable>
                  <template #body="{ data }">
                    <Tag
                      :value="getRoleLabel(data.role)"
                      :severity="getRoleSeverity(data.role)"
                    />
                  </template>
                </Column>

                <Column field="teamId" header="Team" sortable>
                  <template #body="{ data }">
                    <span v-if="data.teamId">{{ getTeamName(data.teamId) }}</span>
                    <span v-else class="no-team">No team assigned</span>
                  </template>
                </Column>

                <Column field="isActive" header="Status" sortable>
                  <template #body="{ data }">
                    <Tag
                      :value="data.isActive ? 'Active' : 'Inactive'"
                      :severity="data.isActive ? 'success' : 'danger'"
                    />
                  </template>
                </Column>

                <Column field="lastLoginAt" header="Last Login" sortable>
                  <template #body="{ data }">
                    <span v-if="data.lastLoginAt">{{
                      formatLastLogin(data.lastLoginAt)
                    }}</span>
                    <span v-else class="no-login">Never</span>
                  </template>
                </Column>

                <Column header="Actions">
                  <template #body="{ data }">
                    <div class="table-actions">
                      <Button
                        icon="pi pi-pencil"
                        size="small"
                        text
                        @click="editUser(data)"
                        v-tooltip.top="'Edit'"
                      />
                      <Button
                        icon="pi pi-cog"
                        size="small"
                        text
                        @click="manageUser(data)"
                        v-tooltip.top="'Manage'"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>

          <!-- Activity Feed Sidebar -->
          <div class="activity-section">
            <TeamActivityFeed :team-id="teamStore.selectedTeam?.id" />
          </div>
        </div>
      </div>

      <!-- User Profile Form Dialog -->
      <UserProfileForm
        v-model:visible="showCreateUserDialog"
        :loading="formLoading"
        @submit="createUser"
        @cancel="showCreateUserDialog = false"
      />

      <UserProfileForm
        v-model:visible="showEditUserDialog"
        :user="selectedUser"
        :loading="formLoading"
        @submit="updateUser"
        @cancel="showEditUserDialog = false"
      />

      <!-- User Management Dialog -->
      <Dialog
        v-model:visible="showManageUserDialog"
        :modal="true"
        :closable="true"
        class="manage-user-dialog"
      >
        <template #header>
          <h3>Manage User: {{ selectedUser?.firstName }} {{ selectedUser?.lastName }}</h3>
        </template>

        <div class="manage-user-content">
          <div class="management-section">
            <h4>Team Assignment</h4>
            <Dropdown
              v-model="managementData.teamId"
              :options="teamOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select team"
              showClear
              class="w-full"
            />
          </div>

          <div class="management-section">
            <h4>Territory Assignment</h4>
            <MultiSelect
              v-model="managementData.assignedInstitutions"
              :options="institutionOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select institutions"
              class="w-full"
              filter
              :maxSelectedLabels="3"
            />
          </div>

          <div class="management-section">
            <h4>User Status</h4>
            <div class="status-controls">
              <div class="status-item">
                <Checkbox
                  v-model="managementData.isActive"
                  :binary="true"
                  inputId="userActive"
                />
                <label for="userActive">Active User</label>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="dialog-footer">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              @click="showManageUserDialog = false"
            />
            <Button
              label="Save Changes"
              :loading="formLoading"
              @click="saveUserManagement"
            />
          </div>
        </template>
      </Dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import TeamActivityFeed from "@/components/team/TeamActivityFeed.vue"
import UserCard from "@/components/team/UserCard.vue"
import UserProfileForm from "@/components/team/UserProfileForm.vue"
import { institutionsApi, teamApi } from "@/services/api"
import { useTeamStore } from "@/stores/team"
import type {
  User,
  UserCreationAttributes,
  UserUpdateAttributes,
} from "@medical-crm/shared"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Card from "primevue/card"
import Checkbox from "primevue/checkbox"
import Column from "primevue/column"
import DataTable from "primevue/datatable"
import Dialog from "primevue/dialog"
import Dropdown from "primevue/dropdown"
import InputText from "primevue/inputtext"
import Message from "primevue/message"
import MultiSelect from "primevue/multiselect"
import ProgressSpinner from "primevue/progressspinner"
import Tag from "primevue/tag"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref } from "vue"

const teamStore = useTeamStore()
const toast = useToast()

// Component state
const viewMode = ref<"grid" | "list">("grid")
const searchQuery = ref("")
const selectedRole = ref("")
const selectedTeam = ref("")
const selectedStatus = ref("")
const showCreateUserDialog = ref(false)
const showEditUserDialog = ref(false)
const showManageUserDialog = ref(false)
const selectedUser = ref<User | null>(null)
const formLoading = ref(false)

// Management data
const managementData = ref({
  teamId: "",
  assignedInstitutions: [] as string[],
  isActive: true,
})

// Options
const teamOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])

const roleFilterOptions = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Team Admin", value: "team_admin" },
  { label: "User", value: "user" },
]

const teamFilterOptions = computed(() => teamOptions.value)

const statusFilterOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

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

const getUserAvatar = (userId: string) => {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${userId}`
}

const getUserInitials = (user: User) => {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
}

const getRoleLabel = (role: string) => {
  const labels = {
    super_admin: "Super Admin",
    team_admin: "Team Admin",
    user: "User",
  }
  return labels[role as keyof typeof labels] || role
}

const getRoleSeverity = (role: string) => {
  const severities = {
    super_admin: "danger",
    team_admin: "warning",
    user: "info",
  }
  return severities[role as keyof typeof severities] as any
}

const getTeamName = (teamId?: string) => {
  if (!teamId) return ""
  const team = teamStore.getTeamById(teamId)
  return team?.name || "Unknown Team"
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

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`

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
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load team data",
      life: 5000,
    })
  }
}

const loadOptions = async () => {
  try {
    // Load teams
    const teamsResponse = await teamApi.getAll()
    const teams = teamsResponse.data || teamsResponse
    teamOptions.value = teams.map((team: any) => ({
      label: team.name,
      value: team.id,
    }))

    // Load institutions
    const institutionsResponse = await institutionsApi.getAll()
    const institutions = institutionsResponse.data || institutionsResponse
    institutionOptions.value = institutions.map((institution: any) => ({
      label: institution.name,
      value: institution.id,
    }))
  } catch (error) {
    console.error("Error loading options:", error)
  }
}

const createUser = async (userData: UserCreationAttributes) => {
  try {
    formLoading.value = true
    // In real app, this would call a user creation API
    console.log("Creating user:", userData)
    showCreateUserDialog.value = false
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "User created successfully",
      life: 3000,
    })
    await loadTeamData()
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to create user",
      life: 5000,
    })
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
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "User updated successfully",
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to update user",
      life: 5000,
    })
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

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "User management updated successfully",
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to update user management",
      life: 5000,
    })
  } finally {
    formLoading.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ""
  selectedRole.value = ""
  selectedTeam.value = ""
  selectedStatus.value = ""
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

.members-section {
  padding: 1.5rem;
  border-right: 1px solid #e5e7eb;
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
    padding: 1rem;
  }

  .team-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .team-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-section {
    flex-direction: column;
  }

  .view-controls {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .members-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .empty-actions {
    flex-direction: column;
  }
}
</style>
