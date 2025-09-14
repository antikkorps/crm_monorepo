<template>
  <v-card class="password-change-form">
    <v-card-title>
      <v-icon start>mdi-lock</v-icon>
      Changer le mot de passe
    </v-card-title>

    <v-card-text>
      <v-form ref="formRef" v-model="isFormValid" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="currentPassword"
          label="Mot de passe actuel"
          type="password"
          variant="outlined"
          density="comfortable"
          :rules="currentPasswordRules"
          :error-messages="errors.currentPassword"
          prepend-inner-icon="mdi-lock-outline"
          class="mb-4"
          required
          autocomplete="current-password"
        />

        <v-text-field
          v-model="newPassword"
          label="Nouveau mot de passe"
          type="password"
          variant="outlined"
          density="comfortable"
          :rules="newPasswordRules"
          :error-messages="errors.newPassword"
          prepend-inner-icon="mdi-lock-plus-outline"
          class="mb-4"
          required
          autocomplete="new-password"
        />

        <v-text-field
          v-model="confirmPassword"
          label="Confirmer le nouveau mot de passe"
          type="password"
          variant="outlined"
          density="comfortable"
          :rules="confirmPasswordRules"
          :error-messages="errors.confirmPassword"
          prepend-inner-icon="mdi-lock-check-outline"
          class="mb-4"
          required
          autocomplete="new-password"
        />

        <div class="password-requirements mb-4">
          <p class="text-caption text-medium-emphasis mb-2">
            Le mot de passe doit contenir :
          </p>
          <ul class="text-caption text-medium-emphasis requirements-list">
            <li :class="{ 'text-success': hasMinLength }">
              <v-icon
                :icon="hasMinLength ? 'mdi-check' : 'mdi-close'"
                :color="hasMinLength ? 'success' : 'error'"
                size="small"
                start
              />
              Au moins 8 caractères
            </li>
            <li :class="{ 'text-success': hasUppercase }">
              <v-icon
                :icon="hasUppercase ? 'mdi-check' : 'mdi-close'"
                :color="hasUppercase ? 'success' : 'error'"
                size="small"
                start
              />
              Au moins une majuscule
            </li>
            <li :class="{ 'text-success': hasLowercase }">
              <v-icon
                :icon="hasLowercase ? 'mdi-check' : 'mdi-close'"
                :color="hasLowercase ? 'success' : 'error'"
                size="small"
                start
              />
              Au moins une minuscule
            </li>
            <li :class="{ 'text-success': hasNumber }">
              <v-icon
                :icon="hasNumber ? 'mdi-check' : 'mdi-close'"
                :color="hasNumber ? 'success' : 'error'"
                size="small"
                start
              />
              Au moins un chiffre
            </li>
            <li :class="{ 'text-success': hasSpecialChar }">
              <v-icon
                :icon="hasSpecialChar ? 'mdi-check' : 'mdi-close'"
                :color="hasSpecialChar ? 'success' : 'error'"
                size="small"
                start
              />
              Au moins un caractère spécial (!@#$%^&*)
            </li>
          </ul>
        </div>

        <v-alert
          v-if="errors.general"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ errors.general }}
        </v-alert>

        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          class="mb-4"
        >
          {{ successMessage }}
        </v-alert>
      </v-form>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn variant="text" @click="$emit('cancel')" :disabled="isLoading">
        Annuler
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        @click="handleSubmit"
        :disabled="!isFormValid || !allRequirementsMet"
        :loading="isLoading"
      >
        Changer le mot de passe
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'

interface FormErrors {
  currentPassword?: string[]
  newPassword?: string[]
  confirmPassword?: string[]
  general?: string
}

const emit = defineEmits<{
  cancel: []
  success: []
}>()

const authStore = useAuthStore()
const notificationStore = useNotificationStore()

const formRef = ref()
const isFormValid = ref(false)
const isLoading = ref(false)
const successMessage = ref('')

// Form fields
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// Errors
const errors = ref<FormErrors>({})

// Password requirements validation
const hasMinLength = computed(() => newPassword.value.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(newPassword.value))
const hasLowercase = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /\d/.test(newPassword.value))
const hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(newPassword.value))

const allRequirementsMet = computed(() =>
  hasMinLength.value &&
  hasUppercase.value &&
  hasLowercase.value &&
  hasNumber.value &&
  hasSpecialChar.value
)

// Validation rules
const currentPasswordRules = [
  (v: string) => !!v || 'Le mot de passe actuel est requis',
  (v: string) => (v && v.length >= 3) || 'Mot de passe trop court',
]

const newPasswordRules = [
  (v: string) => !!v || 'Le nouveau mot de passe est requis',
  (v: string) => (v && v.length >= 8) || 'Le mot de passe doit contenir au moins 8 caractères',
  (v: string) => /[A-Z]/.test(v) || 'Le mot de passe doit contenir au moins une majuscule',
  (v: string) => /[a-z]/.test(v) || 'Le mot de passe doit contenir au moins une minuscule',
  (v: string) => /\d/.test(v) || 'Le mot de passe doit contenir au moins un chiffre',
  (v: string) => /[!@#$%^&*(),.?":{}|<>]/.test(v) || 'Le mot de passe doit contenir au moins un caractère spécial',
]

const confirmPasswordRules = [
  (v: string) => !!v || 'La confirmation du mot de passe est requise',
  (v: string) => v === newPassword.value || 'Les mots de passe ne correspondent pas',
]

// Clear errors when fields change
watch([currentPassword, newPassword, confirmPassword], () => {
  errors.value = {}
  successMessage.value = ''
})

const handleSubmit = async () => {
  if (!isFormValid.value || !allRequirementsMet.value) {
    return
  }

  isLoading.value = true
  errors.value = {}
  successMessage.value = ''

  try {
    await authStore.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })

    successMessage.value = 'Mot de passe changé avec succès'
    notificationStore.showSuccess('Mot de passe mis à jour avec succès')

    // Reset form
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    formRef.value?.resetValidation()

    setTimeout(() => {
      emit('success')
    }, 2000)

  } catch (error: any) {
    if (error.response?.status === 400) {
      const errorData = error.response.data
      if (errorData.field === 'currentPassword') {
        errors.value.currentPassword = [errorData.message || 'Mot de passe actuel incorrect']
      } else if (errorData.field === 'newPassword') {
        errors.value.newPassword = [errorData.message || 'Le nouveau mot de passe ne respecte pas les critères']
      } else {
        errors.value.general = errorData.message || 'Erreur de validation'
      }
    } else {
      errors.value.general = 'Une erreur est survenue lors du changement de mot de passe'
      notificationStore.showError(
        error.response?.data?.message || 'Erreur lors du changement de mot de passe'
      )
    }
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  errors.value = {}
  successMessage.value = ''
  formRef.value?.resetValidation()
}

// Reset form when component is mounted
resetForm()
</script>

<style scoped>
.password-change-form {
  max-width: 500px;
}

.password-requirements {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 16px;
}

.requirements-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.requirements-list li {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  transition: color 0.2s ease;
}

.requirements-list li:last-child {
  margin-bottom: 0;
}
</style>