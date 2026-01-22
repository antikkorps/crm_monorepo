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
              <v-icon size="80" color="white" class="mb-4"> mdi-lock-reset </v-icon>
              <h1 class="text-h2 font-weight-bold text-white">
                {{ t("auth.forgotPassword.title") }}
              </h1>
              <p class="text-h5 text-white mt-4 opacity-80">
                {{ t("auth.forgotPassword.subtitle") }}
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

              <!-- Step 1: Request Code -->
              <div v-if="step === 1">
                <h2 class="text-h5 font-weight-bold text-center mb-2">
                  {{ t("auth.forgotPassword.requestTitle") }}
                </h2>
                <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
                  {{ t("auth.forgotPassword.requestSubtitle") }}
                </p>

                <v-form @submit.prevent="handleRequestCode">
                  <v-text-field
                    v-model="email"
                    :label="t('auth.forgotPassword.emailLabel')"
                    type="email"
                    :placeholder="t('auth.forgotPassword.emailPlaceholder')"
                    prepend-inner-icon="mdi-email-outline"
                    variant="outlined"
                    :error-messages="errors.email"
                    :error="!!errors.email"
                    autocomplete="email"
                    required
                    autofocus
                    class="mb-4"
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    :loading="isLoading"
                    :disabled="!email"
                    prepend-icon="mdi-email-fast"
                    variant="elevated"
                    block
                    class="mb-4"
                  >
                    {{ t("auth.forgotPassword.sendCodeButton") }}
                  </v-btn>

                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    class="text-capitalize"
                    block
                    @click="goToLogin"
                  >
                    {{ t("auth.forgotPassword.backToLogin") }}
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
                </v-form>
              </div>

              <!-- Step 2: Verify Code -->
              <div v-if="step === 2">
                <h2 class="text-h5 font-weight-bold text-center mb-2">
                  {{ t("auth.forgotPassword.verifyTitle") }}
                </h2>
                <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
                  {{ t("auth.forgotPassword.verifySubtitle", { email }) }}
                </p>

                <v-form @submit.prevent="handleVerifyCode">
                  <v-text-field
                    v-model="code"
                    :label="t('auth.forgotPassword.codeLabel')"
                    type="text"
                    :placeholder="t('auth.forgotPassword.codePlaceholder')"
                    prepend-inner-icon="mdi-shield-key-outline"
                    variant="outlined"
                    :error-messages="errors.code"
                    :error="!!errors.code"
                    autocomplete="one-time-code"
                    inputmode="numeric"
                    maxlength="6"
                    required
                    autofocus
                    class="mb-4"
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    :loading="isLoading"
                    :disabled="code.length !== 6"
                    prepend-icon="mdi-check-circle"
                    variant="elevated"
                    block
                    class="mb-4"
                  >
                    {{ t("auth.forgotPassword.verifyCodeButton") }}
                  </v-btn>

                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    class="text-capitalize"
                    block
                    :disabled="isLoading"
                    @click="handleResendCode"
                  >
                    {{ t("auth.forgotPassword.resendCode") }}
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
                </v-form>
              </div>

              <!-- Step 3: Reset Password -->
              <div v-if="step === 3">
                <h2 class="text-h5 font-weight-bold text-center mb-2">
                  {{ t("auth.forgotPassword.resetTitle") }}
                </h2>
                <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
                  {{ t("auth.forgotPassword.resetSubtitle") }}
                </p>

                <v-form @submit.prevent="handleResetPassword">
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
                    prepend-icon="mdi-lock-reset"
                    variant="elevated"
                    block
                    class="mb-4"
                  >
                    {{ t("auth.forgotPassword.resetPasswordButton") }}
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
import { computed, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const { t } = useI18n()
const router = useRouter()

const step = ref(1)
const email = ref("")
const code = ref("")
const newPassword = ref("")
const confirmPassword = ref("")
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref("")
const successMessage = ref("")

const errors = reactive({
  email: "",
  code: "",
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

const handleRequestCode = async () => {
  if (!email.value) {
    errors.email = t("auth.forgotPassword.emailRequired")
    return
  }

  isLoading.value = true
  errorMessage.value = ""

  try {
    await apiClient.post("/auth/forgot-password", { email: email.value })
    step.value = 2
    code.value = ""
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.error?.message || t("auth.forgotPassword.requestError")
  } finally {
    isLoading.value = false
  }
}

const handleResendCode = async () => {
  code.value = ""
  errorMessage.value = ""
  await handleRequestCode()
}

const handleVerifyCode = async () => {
  if (code.value.length !== 6) {
    errors.code = t("auth.forgotPassword.codeInvalid")
    return
  }

  isLoading.value = true
  errorMessage.value = ""

  try {
    await apiClient.post("/auth/verify-reset-code", {
      email: email.value,
      code: code.value,
    })
    step.value = 3
    newPassword.value = ""
    confirmPassword.value = ""
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.error?.message || t("auth.forgotPassword.verifyError")
  } finally {
    isLoading.value = false
  }
}

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

const handleResetPassword = async () => {
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
    successMessage.value = t("auth.forgotPassword.resetSuccess")
    setTimeout(() => {
      router.push("/login")
    }, 2000)
  } catch (error: any) {
    errorMessage.value =
      error.response?.data?.error?.message || t("auth.forgotPassword.resetError")
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.hero-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.opacity-80 {
  opacity: 0.8;
}

.text-capitalize {
  text-transform: capitalize;
}
</style>
