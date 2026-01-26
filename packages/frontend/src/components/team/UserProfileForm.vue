<template>
  <v-dialog
    v-model="visible"
    max-width="700px"
    persistent
  >
    <v-card>
      <v-card-title>
        {{ isEditing ? t("profile.form.editTitle") : t("profile.form.createTitle") }}
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
            {{ t("profile.form.avatarDescription") }}
          </p>
        </div>
      </div>

      <!-- Personal Information -->
      <div class="form-section">
        <h4 class="section-title">{{ t("profile.form.personalInformation") }}</h4>

        <div class="form-row">
          <div class="form-group">
            <v-text-field
              id="firstName"
              v-model="formData.firstName"
              :error-messages="errors.firstName ? [errors.firstName] : []"
              :label="t('profile.form.firstNameLabel') + ' *'"
              :placeholder="t('profile.form.firstNamePlaceholder')"
              density="comfortable"
            />
          </div>

          <div class="form-group">
            <v-text-field
              id="lastName"
              v-model="formData.lastName"
              :error-messages="errors.lastName ? [errors.lastName] : []"
              :label="t('profile.form.lastNameLabel') + ' *'"
              :placeholder="t('profile.form.lastNamePlaceholder')"
              density="comfortable"
            />
          </div>
        </div>

        <div class="form-group">
          <v-text-field
            id="email"
            v-model="formData.email"
            :error-messages="errors.email ? [errors.email] : []"
            :label="t('profile.form.emailLabel') + ' *'"
            :placeholder="t('profile.form.emailPlaceholder')"
            type="email"
            density="comfortable"
          />
        </div>

        <!-- Password section with live validation (only for creation) -->
        <template v-if="!isEditing">
          <div class="form-group">
            <v-text-field
              id="password"
              v-model="formData.password"
              :error-messages="errors.password ? [errors.password] : []"
              :label="t('profile.form.passwordLabel') + ' *'"
              :placeholder="t('profile.form.passwordPlaceholder')"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
              density="comfortable"
              @click:append-inner="showPassword = !showPassword"
              @input="validatePasswords"
            />
          </div>

          <div class="form-group">
            <v-text-field
              id="confirmPassword"
              v-model="confirmPassword"
              :error-messages="errors.confirmPassword ? [errors.confirmPassword] : []"
              :label="t('profile.form.confirmPasswordLabel') + ' *'"
              :placeholder="t('profile.form.confirmPasswordPlaceholder')"
              :type="showPassword ? 'text' : 'password'"
              :append-inner-icon="showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
              density="comfortable"
              @click:append-inner="showPassword = !showPassword"
              @input="validatePasswords"
            />
          </div>

          <!-- Password requirements checklist -->
          <div class="password-requirements" v-if="formData.password">
            <div class="text-caption text-medium-emphasis mb-2">
              {{ t("auth.forgotPassword.passwordRequirements") }}
            </div>
            <div class="requirements-list">
              <div :class="hasMinLength ? 'text-success' : 'text-error'">
                <v-icon size="small">
                  {{ hasMinLength ? "mdi-check-circle" : "mdi-circle-outline" }}
                </v-icon>
                {{ t("auth.forgotPassword.minLength") }}
              </div>
              <div :class="hasUppercase ? 'text-success' : 'text-error'">
                <v-icon size="small">
                  {{ hasUppercase ? "mdi-check-circle" : "mdi-circle-outline" }}
                </v-icon>
                {{ t("auth.forgotPassword.uppercaseRequired") }}
              </div>
              <div :class="hasLowercase ? 'text-success' : 'text-error'">
                <v-icon size="small">
                  {{ hasLowercase ? "mdi-check-circle" : "mdi-circle-outline" }}
                </v-icon>
                {{ t("auth.forgotPassword.lowercaseRequired") }}
              </div>
              <div :class="hasNumber ? 'text-success' : 'text-error'">
                <v-icon size="small">
                  {{ hasNumber ? "mdi-check-circle" : "mdi-circle-outline" }}
                </v-icon>
                {{ t("auth.forgotPassword.numberRequired") }}
              </div>
              <div :class="hasSpecialChar ? 'text-success' : 'text-error'">
                <v-icon size="small">
                  {{ hasSpecialChar ? "mdi-check-circle" : "mdi-circle-outline" }}
                </v-icon>
                {{ t("auth.forgotPassword.specialCharRequired") }}
              </div>
              <div v-if="confirmPassword" :class="passwordsMatch ? 'text-success' : 'text-error'">
                <v-icon size="small">
                  {{ passwordsMatch ? "mdi-check-circle" : "mdi-circle-outline" }}
                </v-icon>
                {{ t("auth.forgotPassword.passwordsMatch") }}
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Role and Team Assignment -->
      <div class="form-section">
        <h4 class="section-title">{{ t("profile.form.roleTeamSection") }}</h4>

        <div class="form-row">
          <div class="form-group">
            <v-select
              id="role"
              v-model="formData.role"
              :items="roleOptions"
              item-title="label"
              item-value="value"
              :label="t('profile.form.roleLabel')"
              :placeholder="t('profile.form.rolePlaceholder')"
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
              :label="t('profile.form.teamLabel')"
              :placeholder="t('profile.form.teamPlaceholder')"
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
            :label="t('profile.form.activeUser')"
            density="comfortable"
          />
          <small class="form-help">{{ t("profile.form.inactiveUserHelp") }}</small>
        </div>
      </div>

      <!-- Territory Assignment -->
      <div class="form-section">
        <h4 class="section-title">{{ t("profile.form.territorySection") }}</h4>

        <div class="form-group">
          <v-select
            v-model="formData.assignedInstitutions"
            :items="institutionOptions"
            item-title="label"
            item-value="value"
            :label="t('profile.form.institutionsLabel')"
            :placeholder="t('profile.form.institutionsPlaceholder')"
            multiple
            :loading="loadingInstitutions"
            density="comfortable"
            chips
            closable-chips
          />
          <small class="form-help">
            {{ t("profile.form.institutionsHelp") }}
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
          {{ t("common.cancel") }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!isEditing && (!isPasswordValid || !passwordsMatch)"
          @click="handleSubmit"
        >
          {{ isEditing ? t("profile.form.updateButton") : t("profile.form.createButton") }}
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
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

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

interface FormData {
  firstName: string
  lastName: string
  email: string
  password: string
  role: UserRole
  teamId: string
  isActive: boolean
  assignedInstitutions: string[]
}

const formData = ref<FormData>({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "user" as UserRole,
  teamId: "",
  isActive: true,
  assignedInstitutions: [],
})

const confirmPassword = ref("")
const showPassword = ref(false)
const errors = ref<Record<string, string>>({})
const loadingTeams = ref(false)
const loadingInstitutions = ref(false)
const teamOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])

const isEditing = computed(() => !!props.user)

// Password validation computed properties
const hasMinLength = computed(() => formData.value.password.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(formData.value.password))
const hasLowercase = computed(() => /[a-z]/.test(formData.value.password))
const hasNumber = computed(() => /\d/.test(formData.value.password))
const hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(formData.value.password))
const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return false
  return formData.value.password === confirmPassword.value
})
const isPasswordValid = computed(() => {
  return (
    hasMinLength.value &&
    hasUppercase.value &&
    hasLowercase.value &&
    hasNumber.value &&
    hasSpecialChar.value
  )
})

// Role options with i18n
const roleOptions = computed(() => [
  { label: t("profile.roles.user"), value: "user" },
  { label: t("profile.roles.team_admin"), value: "team_admin" },
  { label: t("profile.roles.super_admin"), value: "super_admin" },
])

const avatarPreviewUrl = computed(() => {
  // Use user's actual avatar when editing
  if (props.user?.avatarUrl) {
    return props.user.avatarUrl
  }
  // Fallback to DiceBear for new users
  const seed = `${formData.value.firstName}${formData.value.lastName}`.toLowerCase()
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
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
  confirmPassword.value = ""
  errors.value = {}
}

const populateForm = (user: User) => {
  formData.value = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    password: "",
    role: user.role,
    teamId: user.teamId || "",
    isActive: user.isActive,
    assignedInstitutions: [],
  }
  confirmPassword.value = ""
}

const validatePasswords = () => {
  errors.value.password = ""
  errors.value.confirmPassword = ""

  if (formData.value.password && !isPasswordValid.value) {
    errors.value.password = t("auth.forgotPassword.passwordWeak")
  }

  if (confirmPassword.value && !passwordsMatch.value) {
    errors.value.confirmPassword = t("auth.forgotPassword.passwordMismatch")
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.firstName.trim()) {
    errors.value.firstName = t("profile.validation.firstNameRequired")
  }

  if (!formData.value.lastName.trim()) {
    errors.value.lastName = t("profile.validation.lastNameRequired")
  }

  if (!formData.value.email.trim()) {
    errors.value.email = t("profile.validation.emailRequired")
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    errors.value.email = t("profile.validation.emailInvalid")
  }

  if (!isEditing.value) {
    if (!formData.value.password) {
      errors.value.password = t("profile.validation.passwordRequired")
    } else if (!isPasswordValid.value) {
      errors.value.password = t("auth.forgotPassword.passwordWeak")
    }

    if (!confirmPassword.value) {
      errors.value.confirmPassword = t("profile.validation.confirmPasswordRequired")
    } else if (!passwordsMatch.value) {
      errors.value.confirmPassword = t("auth.forgotPassword.passwordMismatch")
    }
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validateForm()) return

  // Build submit data without optional fields
  const submitData: UserCreationAttributes | UserUpdateAttributes = {
    firstName: formData.value.firstName,
    lastName: formData.value.lastName,
    email: formData.value.email,
    role: formData.value.role,
  }

  // Add teamId if set
  if (formData.value.teamId) {
    submitData.teamId = formData.value.teamId
  }

  // Add password for creation
  if (!isEditing.value && formData.value.password) {
    (submitData as UserCreationAttributes).password = formData.value.password
  }

  // Add isActive for editing
  if (isEditing.value) {
    (submitData as UserUpdateAttributes).isActive = formData.value.isActive
  }

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  visible.value = false
}

const loadTeams = async () => {
  try {
    loadingTeams.value = true
    const response = await teamApi.getAll() as { data?: unknown[] } | unknown[]
    const teams = Array.isArray(response) ? response : (response as { data?: unknown[] }).data || []

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
    const response = await institutionsApi.getAll() as { data?: { institutions?: unknown[] } | unknown[] } | unknown[]
    const data = Array.isArray(response) ? response : (response as { data?: unknown }).data || response

    // Handle paginated response: {institutions: [...], pagination: {...}}
    let institutionsArray: any[] = []
    if (Array.isArray(data)) {
      institutionsArray = data
    } else if (data && typeof data === 'object' && 'institutions' in data && Array.isArray((data as any).institutions)) {
      institutionsArray = (data as any).institutions
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

.password-requirements {
  padding: 0.75rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.requirements-list {
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.requirements-list div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
