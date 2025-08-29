<template>
  <div class="login-container full-height flex-center">
    <Card class="login-card">
      <template #title>
        <div class="text-center">
          <i class="pi pi-heart-fill text-4xl text-primary mb-3"></i>
          <h2>Medical CRM</h2>
        </div>
      </template>
      <template #content>
        <p class="text-center mb-4">Please sign in to continue</p>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="field">
            <label for="email" class="block text-900 font-medium mb-2">Email</label>
            <InputText
              id="email"
              v-model="loginForm.email"
              type="email"
              placeholder="Enter your email"
              class="w-full"
              :class="{ 'p-invalid': emailError }"
              @blur="validateEmail"
            />
            <small v-if="emailError" class="p-error">{{ emailError }}</small>
          </div>

          <div class="field">
            <label for="password" class="block text-900 font-medium mb-2">Password</label>
            <Password
              id="password"
              v-model="loginForm.password"
              placeholder="Enter your password"
              :feedback="false"
              toggle-mask
              class="w-full"
              :class="{ 'p-invalid': passwordError }"
              @blur="validatePassword"
            />
            <small v-if="passwordError" class="p-error">{{ passwordError }}</small>
          </div>

          <div class="field-checkbox">
            <Checkbox id="remember" v-model="loginForm.rememberMe" :binary="true" />
            <label for="remember" class="ml-2">Remember me</label>
          </div>

          <Button
            type="submit"
            label="Sign In"
            class="w-full"
            :loading="authStore.isLoading"
            :disabled="!isFormValid"
          />

          <div v-if="loginError" class="mt-3">
            <Message severity="error" :closable="false">
              {{ loginError }}
            </Message>
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { LoginCredentials } from "@/stores/auth"
import { useAuthStore } from "@/stores/auth"
import Button from "primevue/button"
import Card from "primevue/card"
import Checkbox from "primevue/checkbox"
import InputText from "primevue/inputtext"
import Message from "primevue/message"
import Password from "primevue/password"
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Form data
const loginForm = ref<LoginCredentials & { rememberMe: boolean }>({
  email: "",
  password: "",
  rememberMe: false,
})

// Form validation
const emailError = ref("")
const passwordError = ref("")
const loginError = ref("")

const validateEmail = () => {
  emailError.value = ""
  if (!loginForm.value.email) {
    emailError.value = "Email is required"
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.value.email)) {
    emailError.value = "Please enter a valid email address"
  }
}

const validatePassword = () => {
  passwordError.value = ""
  if (!loginForm.value.password) {
    passwordError.value = "Password is required"
  } else if (loginForm.value.password.length < 6) {
    passwordError.value = "Password must be at least 6 characters"
  }
}

const isFormValid = computed(() => {
  return (
    loginForm.value.email &&
    loginForm.value.password &&
    !emailError.value &&
    !passwordError.value
  )
})

const handleLogin = async () => {
  // Validate form
  validateEmail()
  validatePassword()

  if (!isFormValid.value) {
    return
  }

  try {
    loginError.value = ""

    await authStore.login({
      email: loginForm.value.email,
      password: loginForm.value.password,
    })

    // Redirect to intended page or dashboard
    const redirectPath = (route.query.redirect as string) || "/dashboard"
    router.push(redirectPath)
  } catch (error: any) {
    console.error("Login failed:", error)
    loginError.value =
      error.response?.data?.error?.message || "Login failed. Please try again."
  }
}

// Redirect if already authenticated
onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push("/dashboard")
  }
})
</script>

<style scoped>
.login-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 100%;
  max-width: 400px;
  margin: 1rem;
}
</style>
