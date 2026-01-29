<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-0 fill-height">
        <v-row no-gutters class="fill-height">
          <!-- Left Panel (Branding) -->
          <v-col
            cols="12"
            md="8"
            class="d-none d-md-flex align-center justify-center hero-banner"
          >
            <div class="text-center pa-8">
              <v-icon size="80" color="white" class="mb-4"> mdi-account-check </v-icon>
              <h1 class="text-h2 font-weight-bold text-white">
                {{ t("auth.invitation.title") }}
              </h1>
              <p class="text-h5 text-white mt-4 opacity-80">
                {{ t("auth.invitation.subtitle") }}
              </p>
            </div>
          </v-col>

          <!-- Right Panel (Form) -->
          <v-col
            cols="12"
            md="4"
            class="d-flex align-center justify-center"
            style="background-color: #f0f2f5"
          >
            <v-sheet
              class="pa-8 pa-md-12 mx-auto"
              max-width="450"
              width="100%"
              elevation="0"
              color="transparent"
            >
              <div class="text-center mb-8 d-md-none">
                <h1 class="text-h4 font-weight-bold text-primary mb-2">OPEx_CRM</h1>
              </div>

              <!-- Error state: Invalid or expired link -->
              <div v-if="linkError">
                <v-alert type="error" variant="tonal" class="mb-6">
                  {{ linkError }}
                </v-alert>
                <v-btn color="primary" variant="elevated" block @click="goToLogin">
                  {{ t("auth.invitation.goToLogin") }}
                </v-btn>
              </div>

              <!-- Loading state -->
              <div v-else-if="isValidating" class="text-center">
                <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
                <p class="text-body-1">{{ t("auth.invitation.validating") }}</p>
              </div>

              <!-- Set Password Form -->
              <div v-else>
                <h2 class="text-h5 font-weight-bold text-center mb-2">
                  {{ t("auth.invitation.setPasswordTitle") }}
                </h2>
                <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
                  {{ t("auth.invitation.setPasswordSubtitle") }}
                </p>

                <v-form @submit.prevent="handleSetPassword">
                  <v-text-field
                    v-model="newPassword"
                    :label="t('auth.forgotPassword.newPasswordLabel')"
                    :type="showPassword ? 'text' : 'password'"
                    :placeholder="t('auth.forgotPassword.newPasswordPlaceholder')"
                    prepend-inner-icon="mdi-lock-outline"
                    :append-inner-icon="
                      showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'
                    "
                    variant="outlined"
                    :error-messages="errors.newPassword"
                    :error="!!errors.newPassword"
                    autocomplete="new-password"
                    required
                    autofocus
                    class="mb-4"
                    @click:append-inner="showPassword = !showPassword"
                    @input="validatePasswords"
                  />

                  <v-text-field
                    v-model="confirmPassword"
                    :label="t('auth.forgotPassword.confirmPasswordLabel')"
                    :type="showPassword ? 'text' : 'password'"
                    :placeholder="t('auth.forgotPassword.confirmPasswordPlaceholder')"
                    prepend-inner-icon="mdi-lock-check-outline"
                    :append-inner-icon="
                      showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'
                    "
                    variant="outlined"
                    :error-messages="errors.confirmPassword"
                    :error="!!errors.confirmPassword"
                    autocomplete="new-password"
                    required
                    class="mb-4"
                    @click:append-inner="showPassword = !showPassword"
                    @input="validatePasswords"
                  />

                  <div class="mb-4 pa-3 bg-grey-lighten-4 rounded">
                    <div class="text-caption text-medium-emphasis mb-2">
                      {{ t("auth.forgotPassword.passwordRequirements") }}
                    </div>
                    <div class="text-caption">
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
                      <div
                        v-if="confirmPassword"
                        :class="passwordsMatch ? 'text-success' : 'text-error'"
                      >
                        <v-icon size="small">
                          {{ passwordsMatch ? "mdi-check-circle" : "mdi-circle-outline" }}
                        </v-icon>
                        {{ t("auth.forgotPassword.passwordsMatch") }}
                      </div>
                    </div>
                  </div>

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    :loading="isLoading"
                    :disabled="!isPasswordValid || !passwordsMatch"
                    prepend-icon="mdi-account-check"
                    variant="elevated"
                    block
                    class="mb-4"
                  >
                    {{ t("auth.invitation.activateAccount") }}
                  </v-btn>

                  <v-alert
                    v-if="errorMessage"
                    type="error"
                    variant="tonal"
                    class="mt-4"
                    density="compact"
                  >
                    {{ errorMessage }}
                  </v-alert>

                  <v-alert
                    v-if="successMessage"
                    type="success"
                    variant="tonal"
                    class="mt-4"
                    density="compact"
                  >
                    {{ successMessage }}
                  </v-alert>
                </v-form>
              </div>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { apiClient } from "@/services/api"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

const email = ref("")
const code = ref("")
const newPassword = ref("")
const confirmPassword = ref("")
const showPassword = ref(false)
const isLoading = ref(false)
const isValidating = ref(true)
const errorMessage = ref("")
const successMessage = ref("")
const linkError = ref("")

const errors = reactive({
  newPassword: "",
  confirmPassword: "",
})

// Computed properties for live password validation
const hasMinLength = computed(() => newPassword.value.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(newPassword.value))
const hasLowercase = computed(() => /[a-z]/.test(newPassword.value))
const hasNumber = computed(() => /\d/.test(newPassword.value))
const hasSpecialChar = computed(() => /[@$!%*?&]/.test(newPassword.value))
const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return false
  return newPassword.value === confirmPassword.value
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

const goToLogin = () => {
  router.push("/login")
}

onMounted(async () => {
  // Get email and code from URL parameters
  const urlEmail = route.query.email as string
  const urlCode = route.query.code as string

  if (!urlEmail || !urlCode) {
    linkError.value = t("auth.invitation.invalidLink")
    isValidating.value = false
    return
  }

  email.value = urlEmail
  code.value = urlCode

  // Verify the code is valid
  try {
    await apiClient.post("/auth/verify-reset-code", {
      email: urlEmail,
      code: urlCode,
    })
    isValidating.value = false
  } catch (error: any) {
    linkError.value = t("auth.invitation.expiredLink")
    isValidating.value = false
  }
})

const validatePasswords = () => {
  errors.newPassword = ""
  errors.confirmPassword = ""

  if (newPassword.value && !isPasswordValid.value) {
    errors.newPassword = t("auth.forgotPassword.passwordWeak")
  }

  if (confirmPassword.value && !passwordsMatch.value) {
    errors.confirmPassword = t("auth.forgotPassword.passwordMismatch")
  }
}

const handleSetPassword = async () => {
  validatePasswords()

  if (errors.newPassword || errors.confirmPassword) {
    return
  }

  isLoading.value = true
  errorMessage.value = ""
  successMessage.value = ""

  try {
    await apiClient.post("/auth/reset-password", {
      email: email.value,
      code: code.value,
      newPassword: newPassword.value,
    })
    successMessage.value = t("auth.invitation.accountActivated")
    setTimeout(() => {
      router.push("/login")
    }, 2000)
  } catch (error: any) {
    errorMessage.value = error.message || t("auth.invitation.activationError")
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.hero-banner {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
}

.opacity-80 {
  opacity: 0.8;
}
</style>
