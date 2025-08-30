<template>
  <Dialog
    :visible="visible"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="user-profile-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <h3>{{ isEditing ? "Edit User Profile" : "Create New User" }}</h3>
    </template>

    <form @submit.prevent="handleSubmit" class="user-profile-form">
      <!-- Avatar Preview -->
      <div class="avatar-section">
        <Avatar
          :image="avatarPreviewUrl"
          :label="avatarInitials"
          size="xlarge"
          shape="circle"
          class="avatar-preview"
        />
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
            <label for="firstName" class="form-label required">First Name</label>
            <InputText
              id="firstName"
              v-model="formData.firstName"
              :class="{ 'p-invalid': errors.firstName }"
              placeholder="Enter first name"
              class="form-input"
            />
            <small v-if="errors.firstName" class="p-error">{{ errors.firstName }}</small>
          </div>

          <div class="form-group">
            <label for="lastName" class="form-label required">Last Name</label>
            <InputText
              id="lastName"
              v-model="formData.lastName"
              :class="{ 'p-invalid': errors.lastName }"
              placeholder="Enter last name"
              class="form-input"
            />
            <small v-if="errors.lastName" class="p-error">{{ errors.lastName }}</small>
          </div>
        </div>

        <div class="form-group">
          <label for="email" class="form-label required">Email</label>
          <InputText
            id="email"
            v-model="formData.email"
            :class="{ 'p-invalid': errors.email }"
            placeholder="Enter email address"
            class="form-input"
            type="email"
          />
          <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
        </div>
      </div>

      <!-- Role and Team Assignment -->
      <div class="form-section">
        <h4 class="section-title">Role & Team Assignment</h4>

        <div class="form-row">
          <div class="form-group">
            <label for="role" class="form-label">Role</label>
            <Dropdown
              id="role"
              v-model="formData.role"
              :options="roleOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select role"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="teamId" class="form-label">Team</label>
            <Dropdown
              id="teamId"
              v-model="formData.teamId"
              :options="teamOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Select team (optional)"
              class="form-input"
              :loading="loadingTeams"
              showClear
            />
          </div>
        </div>

        <div class="form-group" v-if="isEditing">
          <div class="form-checkbox">
            <Checkbox id="isActive" v-model="formData.isActive" :binary="true" />
            <label for="isActive" class="checkbox-label">Active User</label>
          </div>
          <small class="form-help"> Inactive users cannot log in to the system </small>
        </div>
      </div>

      <!-- Territory Assignment -->
      <div class="form-section">
        <h4 class="section-title">Territory Assignment</h4>

        <div class="form-group">
          <label class="form-label">Assigned Medical Institutions</label>
          <MultiSelect
            v-model="formData.assignedInstitutions"
            :options="institutionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select institutions"
            class="form-input"
            :loading="loadingInstitutions"
            filter
            :maxSelectedLabels="3"
            selectedItemsLabel="{0} institutions selected"
          />
          <small class="form-help">
            Select medical institutions this user will manage
          </small>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Cancel" severity="secondary" outlined @click="handleCancel" />
        <Button
          :label="isEditing ? 'Update Profile' : 'Create User'"
          :loading="loading"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { institutionsApi, teamApi } from "@/services/api"
import type {
  User,
  UserCreationAttributes,
  UserRole,
  UserUpdateAttributes,
} from "@medical-crm/shared"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Checkbox from "primevue/checkbox"
import Dialog from "primevue/dialog"
import Dropdown from "primevue/dropdown"
import InputText from "primevue/inputtext"
import MultiSelect from "primevue/multiselect"
import { computed, onMounted, ref, watch } from "vue"

interface Props {
  visible: boolean
  user?: User | null
  loading?: boolean
}

interface Emits {
  (e: "update:visible", visible: boolean): void
  (e: "submit", data: UserCreationAttributes | UserUpdateAttributes): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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
  () => props.visible,
  (visible) => {
    if (visible) {
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
  emit("update:visible", false)
}

const loadTeams = async () => {
  try {
    loadingTeams.value = true
    const response = await teamApi.getAll()
    const teams = response.data || response

    teamOptions.value = teams.map((team: any) => ({
      label: team.name,
      value: team.id,
    }))
  } catch (error) {
    console.error("Error loading teams:", error)
  } finally {
    loadingTeams.value = false
  }
}

const loadInstitutions = async () => {
  try {
    loadingInstitutions.value = true
    const response = await institutionsApi.getAll()
    const institutions = response.data || response

    institutionOptions.value = institutions.map((institution: any) => ({
      label: institution.name,
      value: institution.id,
    }))
  } catch (error) {
    console.error("Error loading institutions:", error)
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
