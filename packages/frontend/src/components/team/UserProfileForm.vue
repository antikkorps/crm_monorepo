<template>
  <v-dialog
    v-model="visible"
    max-width="700px"
    persistent
  >
    <v-card>
      <v-card-title>
        {{ isEditing ? "Edit User Profile" : "Create New User" }}
      </v-card-title>

      <v-card-text class="user-profile-form">

    <form @submit.prevent="handleSubmit" class="user-profile-form">
      <!-- Avatar Preview -->
      <div class="avatar-section">
        <v-avatar
          :image="avatarPreviewUrl"
          :alt="avatarInitials"
          size="80"
          class="avatar-preview"
        >
          {{ avatarInitials }}
        </v-avatar>
        <div class="avatar-info">
          <p class="avatar-description">
            Avatar is automatically generated based on the user's name
          </p>
        </div>
      </div>

      <!-- Personal Information -->
      <div class="form-section">
        <h4 class="section-title">Personal Information</h4>

        <div class="form-row">
          <div class="form-group">
            <v-text-field
              id="firstName"
              v-model="formData.firstName"
              :error-messages="errors.firstName ? [errors.firstName] : []"
              label="First Name *"
              placeholder="Enter first name"
              density="comfortable"
            />
          </div>

          <div class="form-group">
            <v-text-field
              id="lastName"
              v-model="formData.lastName"
              :error-messages="errors.lastName ? [errors.lastName] : []"
              label="Last Name *"
              placeholder="Enter last name"
              density="comfortable"
            />
          </div>
        </div>

        <div class="form-group">
          <v-text-field
            id="email"
            v-model="formData.email"
            :error-messages="errors.email ? [errors.email] : []"
            label="Email *"
            placeholder="Enter email address"
            type="email"
            density="comfortable"
          />
        </div>

        <div class="form-group" v-if="!isEditing">
          <v-text-field
            id="password"
            v-model="formData.password"
            :error-messages="errors.password ? [errors.password] : []"
            label="Password *"
            placeholder="Enter password"
            type="password"
            density="comfortable"
          />
          <small class="form-help">
            Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (!@#$%^&*(),.?":{}|&lt;&gt;)
          </small>
        </div>
      </div>

      <!-- Role and Team Assignment -->
      <div class="form-section">
        <h4 class="section-title">Role & Team Assignment</h4>

        <div class="form-row">
          <div class="form-group">
            <v-select
              id="role"
              v-model="formData.role"
              :items="roleOptions"
              item-title="label"
              item-value="value"
              label="Role"
              placeholder="Select role"
              density="comfortable"
            />
          </div>

          <div class="form-group">
            <v-select
              id="teamId"
              v-model="formData.teamId"
              :items="teamOptions"
              item-title="label"
              item-value="value"
              label="Team"
              placeholder="Select team (optional)"
              clearable
              :loading="loadingTeams"
              density="comfortable"
            />
          </div>
        </div>

        <div class="form-group" v-if="isEditing">
          <v-checkbox
            id="isActive"
            v-model="formData.isActive"
            label="Active User"
            density="comfortable"
          />
          <small class="form-help"> Inactive users cannot log in to the system </small>
        </div>
      </div>

      <!-- Territory Assignment -->
      <div class="form-section">
        <h4 class="section-title">Territory Assignment</h4>

        <div class="form-group">
          <v-select
            v-model="formData.assignedInstitutions"
            :items="institutionOptions"
            item-title="label"
            item-value="value"
            label="Assigned Medical Institutions"
            placeholder="Select institutions"
            multiple
            :loading="loadingInstitutions"
            density="comfortable"
            chips
            closable-chips
          />
          <small class="form-help">
            Select medical institutions this user will manage
          </small>
        </div>
      </div>
    </form>

      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer />
        <v-btn
          color="secondary"
          variant="outlined"
          @click="handleCancel"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ isEditing ? 'Update Profile' : 'Create User' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { institutionsApi, teamApi } from "@/services/api"
import type {
  User,
  UserCreationAttributes,
  UserRole,
  UserUpdateAttributes,
} from "@medical-crm/shared"
import { useSnackbar } from "@/composables/useSnackbar"
import { computed, onMounted, ref, watch } from "vue"

interface Props {
  modelValue: boolean
  user?: User | null
  loading?: boolean
}

interface Emits {
  (e: "update:modelValue", visible: boolean): void
  (e: "submit", data: UserCreationAttributes | UserUpdateAttributes): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
})

const formData = ref<
  UserCreationAttributes & { isActive?: boolean; assignedInstitutions?: string[] }
>({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "user" as UserRole,
  teamId: "",
  isActive: true,
  assignedInstitutions: [],
})

const errors = ref<Record<string, string>>({})
const loadingTeams = ref(false)
const loadingInstitutions = ref(false)
const teamOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])

const isEditing = computed(() => !!props.user)

const roleOptions = [
  { label: "User", value: "user" },
  { label: "Team Admin", value: "team_admin" },
  { label: "Super Admin", value: "super_admin" },
]

const avatarPreviewUrl = computed(() => {
  const seed = `${formData.value.firstName}${formData.value.lastName}`.toLowerCase()
  return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
})

const avatarInitials = computed(() => {
  const first = formData.value.firstName.charAt(0).toUpperCase()
  const last = formData.value.lastName.charAt(0).toUpperCase()
  return `${first}${last}`
})

watch(
  () => props.modelValue,
  (isVisible) => {
    if (isVisible) {
      resetForm()
      if (props.user) {
        populateForm(props.user)
      }
    }
  }
)

const resetForm = () => {
  formData.value = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "user" as UserRole,
    teamId: "",
    isActive: true,
    assignedInstitutions: [],
  }
  errors.value = {}
}

const populateForm = (user: User) => {
  formData.value = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: "", // Don't populate password for editing
    role: user.role,
    teamId: user.teamId || "",
    isActive: user.isActive,
    assignedInstitutions: [], // TODO: Load from user's assigned institutions
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.firstName.trim()) {
    errors.value.firstName = "First name is required"
  }

  if (!formData.value.lastName.trim()) {
    errors.value.lastName = "Last name is required"
  }

  if (!formData.value.email.trim()) {
    errors.value.email = "Email is required"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = "Please enter a valid email address"
  }

  if (!isEditing.value && !formData.value.password) {
    errors.value.password = "Password is required for new users"
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validateForm()) return

  const submitData = { ...formData.value }

  // Clean up empty values
  if (!submitData.teamId) {
    delete submitData.teamId
  }

  // Remove password if editing and not provided
  if (isEditing.value && !submitData.password) {
    delete submitData.password
  }

  // Remove assignedInstitutions from user data (handle separately)
  delete submitData.assignedInstitutions

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  visible.value = false
}

const loadTeams = async () => {
  try {
    loadingTeams.value = true
    const response = await teamApi.getAll()
    const teams = response.data || response

    if (Array.isArray(teams)) {
      teamOptions.value = teams.map((team: any) => ({
        label: team.name,
        value: team.id,
      }))
    } else {
      console.warn("Teams response is not an array:", teams)
      teamOptions.value = []
    }
  } catch (error) {
    console.error("Error loading teams:", error)
    teamOptions.value = []
  } finally {
    loadingTeams.value = false
  }
}

const loadInstitutions = async () => {
  try {
    loadingInstitutions.value = true
    const response = await institutionsApi.getAll()
    const data = response.data || response

    // Handle paginated response: {institutions: [...], pagination: {...}}
    let institutionsArray: any[] = []
    if (Array.isArray(data)) {
      institutionsArray = data
    } else if (data && Array.isArray(data.institutions)) {
      institutionsArray = data.institutions
    } else {
      console.warn("Institutions response format unexpected:", data)
      institutionsArray = []
    }

    institutionOptions.value = institutionsArray.map((institution: any) => ({
      label: institution.name,
      value: institution.id,
    }))
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  } finally {
    loadingInstitutions.value = false
  }
}

onMounted(() => {
  loadTeams()
  loadInstitutions()
})
</script>

<style scoped>
.user-profile-dialog {
  width: 90vw;
  max-width: 700px;
}

.user-profile-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.avatar-preview {
  border: 3px solid #e5e7eb;
}

.avatar-info {
  text-align: center;
}

.avatar-description {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-label.required::after {
  content: " *";
  color: #ef4444;
}

.form-input {
  width: 100%;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
}

.form-help {
  color: #6b7280;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .user-profile-dialog {
    width: 95vw;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .avatar-section {
    padding: 0.75rem;
  }
}
</style>
