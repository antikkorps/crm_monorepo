<template>
  <v-dialog
    v-model="visible"
    max-width="500px"
    persistent
  >
    <v-card>
      <v-card-title>
        {{ t("users.resetPassword") }}
      </v-card-title>

      <v-card-text>
        <div class="password-reset-form">
          <p class="user-info">
            <strong>{{ t("common.user") }}:</strong> {{ userName }}
          </p>

          <v-text-field
            v-model="newPassword"
            :error-messages="errorMessage ? [errorMessage] : []"
            :label="t('profile.form.passwordLabel') + ' *'"
            :placeholder="t('profile.form.newPasswordPlaceholder')"
            type="password"
            density="comfortable"
            @input="errorMessage = ''"
          />

          <small class="form-help">
            {{ t("profile.form.passwordHelp") }}
          </small>

          <!-- Reactive password validation checklist -->
          <div v-if="newPassword" class="password-requirements mt-2">
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
              {{ t("auth.forgotPassword.hasUppercase") }}
            </div>
            <div :class="hasLowercase ? 'text-success' : 'text-error'">
              <v-icon size="small">
                {{ hasLowercase ? "mdi-check-circle" : "mdi-circle-outline" }}
              </v-icon>
              {{ t("auth.forgotPassword.hasLowercase") }}
            </div>
            <div :class="hasNumber ? 'text-success' : 'text-error'">
              <v-icon size="small">
                {{ hasNumber ? "mdi-check-circle" : "mdi-circle-outline" }}
              </v-icon>
              {{ t("auth.forgotPassword.hasNumber") }}
            </div>
            <div :class="hasSpecialChar ? 'text-success' : 'text-error'">
              <v-icon size="small">
                {{ hasSpecialChar ? "mdi-check-circle" : "mdi-circle-outline" }}
              </v-icon>
              {{ t("auth.forgotPassword.hasSpecialChar") }}
            </div>
          </div>

          <v-text-field
            v-model="confirmPassword"
            :error-messages="confirmErrorMessage ? [confirmErrorMessage] : []"
            :label="t('profile.form.confirmPasswordLabel') + ' *'"
            :placeholder="t('profile.form.confirmPasswordPlaceholder')"
            type="password"
            density="comfortable"
            class="mt-4"
            @input="confirmErrorMessage = ''"
          />

          <div v-if="confirmPassword" :class="passwordsMatch ? 'text-success' : 'text-error'">
            <v-icon size="small">
              {{ passwordsMatch ? "mdi-check-circle" : "mdi-circle-outline" }}
            </v-icon>
            {{ t("auth.forgotPassword.passwordsMatch") }}
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer />
        <v-btn
          color="secondary"
          variant="outlined"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ t("common.cancel") }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!isPasswordValid || !passwordsMatch"
          @click="handleSubmit"
        >
          {{ t("users.resetPassword") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { User } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

interface Props {
  modelValue: boolean
  user: User | null
  loading?: boolean
}

interface Emits {
  (e: "update:modelValue", visible: boolean): void
  (e: "reset", newPassword: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
})

const userName = computed(() => {
  if (!props.user) return ""
  return `${props.user.firstName} ${props.user.lastName}`
})

const newPassword = ref("")
const confirmPassword = ref("")
const errorMessage = ref("")
const confirmErrorMessage = ref("")

// Reactive password validation
const hasMinLength = computed(() => newPassword.value.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(newPassword.value))
const hasLowercase = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /\d/.test(newPassword.value))
const hasSpecialChar = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(newPassword.value))

const isPasswordValid = computed(() => {
  return hasMinLength.value && hasUppercase.value && hasLowercase.value && hasNumber.value && hasSpecialChar.value
})

const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return false
  return newPassword.value === confirmPassword.value
})

watch(
  () => props.modelValue,
  (isVisible) => {
    if (isVisible) {
      resetForm()
    }
  }
)

const resetForm = () => {
  newPassword.value = ""
  confirmPassword.value = ""
  errorMessage.value = ""
  confirmErrorMessage.value = ""
}

const handleSubmit = () => {
  errorMessage.value = ""
  confirmErrorMessage.value = ""

  if (!newPassword.value) {
    errorMessage.value = t("profile.validation.passwordRequired")
    return
  }

  if (!isPasswordValid.value) {
    errorMessage.value = t("profile.form.passwordHelp")
    return
  }

  if (!confirmPassword.value) {
    confirmErrorMessage.value = t("profile.validation.confirmPasswordRequired")
    return
  }

  if (!passwordsMatch.value) {
    confirmErrorMessage.value = t("auth.forgotPassword.passwordMismatch")
    return
  }

  emit("reset", newPassword.value)
}

const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped>
.password-reset-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem 0;
}

.user-info {
  margin: 0;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.9rem;
}

.form-help {
  color: #6b7280;
  font-size: 0.75rem;
}

.password-requirements {
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
