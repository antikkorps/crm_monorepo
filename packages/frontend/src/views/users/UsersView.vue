<template>
  <AppLayout>
    <div class="users-view">
      <!-- Header -->
      <div class="d-flex flex-column flex-sm-row justify-space-between align-start align-sm-center mb-6 gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold mb-1">{{ t("users.title") }}</h1>
          <p class="text-body-2 text-medium-emphasis">{{ t("users.subtitle") }}</p>
        </div>
        <v-btn
          v-if="canCreateUsers"
          color="primary"
          prepend-icon="mdi-account-plus"
          @click="showCreateDialog = true"
        >
          {{ t("users.createUser") }}
        </v-btn>
      </div>

      <!-- Search and Filters -->
      <v-card class="mb-6" variant="outlined">
        <v-card-text>
          <v-row dense>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="searchQuery"
                :label="t('users.searchPlaceholder')"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-select
                v-model="selectedRole"
                :items="roleFilterOptions"
                :label="t('users.filterByRole')"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-select
                v-model="selectedStatus"
                :items="statusFilterOptions"
                :label="t('users.filterByStatus')"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                clearable
                hide-details
              />
            </v-col>
            <v-col cols="12" md="2" class="d-flex align-center justify-end">
              <v-btn
                v-if="hasActiveFilters"
                variant="text"
                color="primary"
                size="small"
                @click="clearFilters"
              >
                {{ t("users.clearFilters") }}
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Desktop: Users Table -->
      <v-card variant="outlined" class="d-none d-md-block">
        <v-data-table
          :headers="tableHeaders"
          :items="filteredUsers"
          :loading="loading"
          :items-per-page="10"
          class="users-table"
        >
          <!-- User name with avatar -->
          <template #item.firstName="{ item }">
            <div class="d-flex align-center py-2">
              <v-avatar size="40" class="me-3" color="grey-lighten-3">
                <v-img
                  v-if="item.avatarUrl"
                  :src="item.avatarUrl"
                  :alt="item.firstName"
                />
                <span v-else>{{ item.firstName?.charAt(0) }}{{ item.lastName?.charAt(0) }}</span>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.firstName }} {{ item.lastName }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.email }}</div>
              </div>
            </div>
          </template>

          <!-- Role chip -->
          <template #item.role="{ item }">
            <v-chip
              :color="getRoleColor(item.role)"
              size="small"
              variant="tonal"
            >
              {{ t(`profile.roles.${item.role}`) }}
            </v-chip>
          </template>

          <!-- Status -->
          <template #item.isActive="{ item }">
            <v-chip
              :color="item.isActive ? 'success' : 'error'"
              size="small"
              variant="tonal"
            >
              {{ item.isActive ? t("users.active") : t("users.inactive") }}
            </v-chip>
          </template>

          <!-- Actions with menu -->
          <template #item.actions="{ item }">
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  icon="mdi-dots-vertical"
                  size="small"
                  variant="text"
                />
              </template>
              <v-list density="compact">
                <v-list-item
                  prepend-icon="mdi-pencil"
                  :title="t('common.edit')"
                  @click="editUser(item)"
                />
                <v-list-item
                  prepend-icon="mdi-email-fast"
                  :title="t('users.sendInvitation')"
                  :disabled="sendingInvitation === item.id"
                  @click="sendInvitation(item)"
                />
                <v-list-item
                  prepend-icon="mdi-lock-reset"
                  :title="t('users.resetPassword')"
                  @click="openPasswordReset(item)"
                />
                <v-divider />
                <v-list-item
                  :prepend-icon="item.isActive ? 'mdi-account-off' : 'mdi-account-check'"
                  :title="item.isActive ? t('users.deactivate') : t('users.activate')"
                  @click="toggleUserStatus(item)"
                />
                <v-list-item
                  prepend-icon="mdi-delete"
                  :title="t('common.delete')"
                  class="text-error"
                  @click="confirmDeleteUser(item)"
                />
              </v-list>
            </v-menu>
          </template>

          <!-- Empty state -->
          <template #no-data>
            <div class="text-center py-8">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-off</v-icon>
              <p class="text-h6 text-medium-emphasis">{{ t("users.noUsers") }}</p>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Mobile: Users Cards -->
      <div class="d-md-none">
        <v-card v-if="loading" class="pa-4 text-center">
          <v-progress-circular indeterminate color="primary" />
        </v-card>

        <div v-else-if="filteredUsers.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-account-off</v-icon>
          <p class="text-h6 text-medium-emphasis">{{ t("users.noUsers") }}</p>
        </div>

        <v-card
          v-for="user in filteredUsers"
          :key="user.id"
          class="mb-3"
          variant="outlined"
        >
          <v-card-text class="pb-2">
            <div class="d-flex align-center mb-3">
              <v-avatar size="48" class="me-3" color="grey-lighten-3">
                <v-img
                  v-if="user.avatarUrl"
                  :src="user.avatarUrl"
                  :alt="user.firstName"
                />
                <span v-else>{{ user.firstName?.charAt(0) }}{{ user.lastName?.charAt(0) }}</span>
              </v-avatar>
              <div class="flex-grow-1">
                <div class="font-weight-medium">{{ user.firstName }} {{ user.lastName }}</div>
                <div class="text-caption text-medium-emphasis">{{ user.email }}</div>
              </div>
              <v-menu location="bottom end">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-dots-vertical"
                    size="small"
                    variant="text"
                  />
                </template>
                <v-list density="compact">
                  <v-list-item
                    prepend-icon="mdi-pencil"
                    :title="t('common.edit')"
                    @click="editUser(user)"
                  />
                  <v-list-item
                    prepend-icon="mdi-email-fast"
                    :title="t('users.sendInvitation')"
                    :disabled="sendingInvitation === user.id"
                    @click="sendInvitation(user)"
                  />
                  <v-list-item
                    prepend-icon="mdi-lock-reset"
                    :title="t('users.resetPassword')"
                    @click="openPasswordReset(user)"
                  />
                  <v-divider />
                  <v-list-item
                    :prepend-icon="user.isActive ? 'mdi-account-off' : 'mdi-account-check'"
                    :title="user.isActive ? t('users.deactivate') : t('users.activate')"
                    @click="toggleUserStatus(user)"
                  />
                  <v-list-item
                    prepend-icon="mdi-delete"
                    :title="t('common.delete')"
                    class="text-error"
                    @click="confirmDeleteUser(user)"
                  />
                </v-list>
              </v-menu>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <v-chip
                :color="getRoleColor(user.role)"
                size="small"
                variant="tonal"
              >
                {{ t(`profile.roles.${user.role}`) }}
              </v-chip>
              <v-chip
                :color="user.isActive ? 'success' : 'error'"
                size="small"
                variant="tonal"
              >
                {{ user.isActive ? t("users.active") : t("users.inactive") }}
              </v-chip>
              <v-chip
                v-if="(user as any).team"
                size="small"
                variant="outlined"
              >
                {{ (user as any).team.name }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Create/Edit User Dialog -->
      <UserProfileForm
        v-model="showCreateDialog"
        :loading="formLoading"
        @submit="createUser"
        @cancel="showCreateDialog = false"
      />

      <UserProfileForm
        v-model="showEditDialog"
        :user="selectedUser"
        :loading="formLoading"
        @submit="updateUser"
        @cancel="showEditDialog = false"
      />

      <!-- Invitation Confirmation Dialog -->
      <v-dialog v-model="showInvitationDialog" max-width="450px" persistent>
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="success" class="mr-2">mdi-check-circle</v-icon>
            {{ t("teams.userCreatedSuccess") }}
          </v-card-title>

          <v-card-text>
            <p class="mb-4">
              {{ t("teams.invitationPrompt", {
                name: newlyCreatedUser?.firstName + " " + newlyCreatedUser?.lastName,
                email: newlyCreatedUser?.email
              }) }}
            </p>
            <v-alert type="info" variant="tonal" density="compact">
              {{ t("teams.invitationInfo") }}
            </v-alert>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="closeInvitationDialog">
              {{ t("common.later") }}
            </v-btn>
            <v-btn
              color="primary"
              variant="elevated"
              :loading="sendingInvitationAfterCreate"
              prepend-icon="mdi-email-fast"
              @click="sendInvitationAfterCreate"
            >
              {{ t("auth.invitation.sendInvitation") }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Password Reset Dialog -->
      <PasswordResetDialog
        v-model="showPasswordResetDialog"
        :user="selectedUser"
        :loading="passwordResetLoading"
        @reset="handlePasswordReset"
      />

      <!-- Delete Confirmation Dialog -->
      <v-dialog v-model="showDeleteDialog" max-width="450px" persistent>
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
            {{ t("users.confirmDelete") }}
          </v-card-title>

          <v-card-text>
            <p>
              {{ t("users.deleteConfirmMessage", {
                name: userToDelete?.firstName + " " + userToDelete?.lastName
              }) }}
            </p>
            <v-alert type="warning" variant="tonal" density="compact" class="mt-3">
              {{ t("common.irreversible") }}
            </v-alert>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="showDeleteDialog = false">
              {{ t("common.cancel") }}
            </v-btn>
            <v-btn
              color="error"
              variant="elevated"
              :loading="deleteLoading"
              @click="deleteUser"
            >
              {{ t("common.delete") }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import UserProfileForm from "@/components/team/UserProfileForm.vue"
import PasswordResetDialog from "@/components/team/PasswordResetDialog.vue"
import { useSnackbar } from "@/composables/useSnackbar"
import { usersApi } from "@/services/api"
import { useAuthStore } from "@/stores/auth"
import type { User, UserCreationAttributes, UserUpdateAttributes } from "@medical-crm/shared"
import { UserRole } from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()
const { showSnackbar } = useSnackbar()
const authStore = useAuthStore()

// State
const users = ref<User[]>([])
const loading = ref(false)
const formLoading = ref(false)
const deleteLoading = ref(false)
const searchQuery = ref("")
const selectedRole = ref("")
const selectedStatus = ref("")
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const showPasswordResetDialog = ref(false)
const showInvitationDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedUser = ref<User | null>(null)
const userToDelete = ref<User | null>(null)
const newlyCreatedUser = ref<User | null>(null)
const sendingInvitation = ref<string | null>(null)
const sendingInvitationAfterCreate = ref(false)
const passwordResetLoading = ref(false)

// Permissions
const canCreateUsers = computed(() => authStore.userRole === UserRole.SUPER_ADMIN)

// Filter options
const roleFilterOptions = computed(() => [
  { label: t("profile.roles.super_admin"), value: "super_admin" },
  { label: t("profile.roles.team_admin"), value: "team_admin" },
  { label: t("profile.roles.user"), value: "user" },
])

const statusFilterOptions = computed(() => [
  { label: t("users.active"), value: "active" },
  { label: t("users.inactive"), value: "inactive" },
])

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedRole.value || selectedStatus.value
})

// Table headers - simplified for desktop (removed team and lastLogin to avoid horizontal scroll)
const tableHeaders = computed(() => [
  { title: t("common.name"), key: "firstName", sortable: true },
  { title: t("users.role"), key: "role", sortable: true, width: 150 },
  { title: t("common.status"), key: "isActive", sortable: true, width: 120 },
  { title: t("common.actions"), key: "actions", sortable: false, width: 80, align: "center" as const },
])

// Filtered users
const filteredUsers = computed(() => {
  let result = users.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (user) =>
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    )
  }

  if (selectedRole.value) {
    result = result.filter((user) => user.role === selectedRole.value)
  }

  if (selectedStatus.value) {
    const isActive = selectedStatus.value === "active"
    result = result.filter((user) => user.isActive === isActive)
  }

  return result
})

// Methods
const loadUsers = async () => {
  try {
    loading.value = true
    const response = await usersApi.getAll() as { data?: User[] } | User[]
    users.value = Array.isArray(response) ? response : (response as { data?: User[] }).data || []
  } catch (error) {
    console.error("Error loading users:", error)
    showSnackbar(t("users.errorLoading"), "error")
  } finally {
    loading.value = false
  }
}

const clearFilters = () => {
  searchQuery.value = ""
  selectedRole.value = ""
  selectedStatus.value = ""
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "super_admin":
      return "error"
    case "team_admin":
      return "warning"
    default:
      return "primary"
  }
}

const createUser = async (userData: UserCreationAttributes | UserUpdateAttributes) => {
  try {
    formLoading.value = true
    if (!("password" in userData) || !userData.password) {
      showSnackbar(t("teams.passwordRequired"), "error")
      return
    }
    const response = await usersApi.create(userData as UserCreationAttributes) as { data?: { user: User } }
    showCreateDialog.value = false

    if (response?.data?.user) {
      newlyCreatedUser.value = response.data.user
      showInvitationDialog.value = true
    } else {
      showSnackbar(t("teams.userCreatedSuccess"), "success")
    }

    await loadUsers()
  } catch (error: any) {
    const message = error?.message || t("teams.errorCreatingUser")
    showSnackbar(message, "error")
  } finally {
    formLoading.value = false
  }
}

const editUser = (user: User) => {
  selectedUser.value = user
  showEditDialog.value = true
}

const updateUser = async (updates: UserUpdateAttributes) => {
  if (!selectedUser.value) return

  try {
    formLoading.value = true
    await usersApi.update(selectedUser.value.id, updates)
    showEditDialog.value = false
    selectedUser.value = null
    showSnackbar(t("users.userUpdated"), "success")
    await loadUsers()
  } catch (error) {
    showSnackbar(t("users.errorUpdating"), "error")
  } finally {
    formLoading.value = false
  }
}

const toggleUserStatus = async (user: User) => {
  try {
    await usersApi.update(user.id, { isActive: !user.isActive })
    showSnackbar(
      user.isActive ? t("users.userDeactivated") : t("users.userActivated"),
      "success"
    )
    await loadUsers()
  } catch (error) {
    showSnackbar(t("users.errorUpdating"), "error")
  }
}

const confirmDeleteUser = (user: User) => {
  userToDelete.value = user
  showDeleteDialog.value = true
}

const deleteUser = async () => {
  if (!userToDelete.value) return

  try {
    deleteLoading.value = true
    await usersApi.delete(userToDelete.value.id)
    showDeleteDialog.value = false
    userToDelete.value = null
    showSnackbar(t("users.userDeleted"), "success")
    await loadUsers()
  } catch (error) {
    showSnackbar(t("users.errorDeleting"), "error")
  } finally {
    deleteLoading.value = false
  }
}

const sendInvitation = async (user: User) => {
  try {
    sendingInvitation.value = user.id
    await usersApi.sendInvitation(user.id)
    showSnackbar(t("auth.invitation.invitationSent"), "success")
  } catch (error: any) {
    const message = error?.message || t("auth.invitation.invitationError")
    showSnackbar(message, "error")
  } finally {
    sendingInvitation.value = null
  }
}

const sendInvitationAfterCreate = async () => {
  if (!newlyCreatedUser.value) return

  try {
    sendingInvitationAfterCreate.value = true
    await usersApi.sendInvitation(newlyCreatedUser.value.id)
    showSnackbar(t("auth.invitation.invitationSent"), "success")
    showInvitationDialog.value = false
    newlyCreatedUser.value = null
  } catch (error: any) {
    const message = error?.message || t("auth.invitation.invitationError")
    showSnackbar(message, "error")
  } finally {
    sendingInvitationAfterCreate.value = false
  }
}

const closeInvitationDialog = () => {
  showInvitationDialog.value = false
  newlyCreatedUser.value = null
  showSnackbar(t("teams.userCreatedSuccess"), "success")
}

const openPasswordReset = (user: User) => {
  selectedUser.value = user
  showPasswordResetDialog.value = true
}

const handlePasswordReset = async (newPassword: string) => {
  if (!selectedUser.value) return

  try {
    passwordResetLoading.value = true
    await usersApi.resetPassword(selectedUser.value.id, newPassword)
    showPasswordResetDialog.value = false
    selectedUser.value = null
    showSnackbar(t("users.passwordResetSuccess"), "success")
  } catch (error) {
    showSnackbar(t("users.errorResettingPassword"), "error")
  } finally {
    passwordResetLoading.value = false
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.users-view {
  max-width: 1200px;
  margin: 0 auto;
}

.users-table :deep(.v-data-table__td) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
