<template>
  <v-dialog
    v-model="visible"
    max-width="500px"
    persistent
  >
    <v-card>
      <v-card-title>
        Reset User Password
      </v-card-title>

      <v-card-text>
        <div class="password-reset-form">
          <p class="user-info">
            <strong>User:</strong> {{ userName }}
          </p>

          <v-text-field
            v-model="newPassword"
            :error-messages="errorMessage ? [errorMessage] : []"
            label="New Password *"
            placeholder="Enter new password"
            type="password"
            density="comfortable"
            @input="errorMessage = ''"
          />

          <small class="form-help">
            Password must be at least 8 characters and contain uppercase, lowercase, number, and special character
          </small>

          <v-text-field
            v-model="confirmPassword"
            :error-messages="confirmErrorMessage ? [confirmErrorMessage] : []"
            label="Confirm Password *"
            placeholder="Re-enter new password"
            type="password"
            density="comfortable"
            class="mt-4"
            @input="confirmErrorMessage = ''"
          />
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
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          Reset Password
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"

interface Props {
  modelValue: boolean
  userId: string
  userName: string
  loading?: boolean
}

interface Emits {
  (e: "update:modelValue", visible: boolean): void
  (e: "submit", userId: string, newPassword: string): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
})

const newPassword = ref("")
const confirmPassword = ref("")
const errorMessage = ref("")
const confirmErrorMessage = ref("")

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

const validatePassword = (password: string): boolean => {
  // Password must be at least 8 characters and contain uppercase, lowercase, number, and special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

const handleSubmit = () => {
  errorMessage.value = ""
  confirmErrorMessage.value = ""

  if (!newPassword.value) {
    errorMessage.value = "Password is required"
    return
  }

  if (!validatePassword(newPassword.value)) {
    errorMessage.value = "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character"
    return
  }

  if (!confirmPassword.value) {
    confirmErrorMessage.value = "Please confirm the password"
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    confirmErrorMessage.value = "Passwords do not match"
    return
  }

  emit("submit", props.userId, newPassword.value)
}

const handleCancel = () => {
  emit("cancel")
  visible.value = false
}
</script>

<style scoped>
.password-reset-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
  margin-top: -0.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
