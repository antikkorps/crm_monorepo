<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">Medical CRM</h1>
        <p class="login-subtitle">Connectez-vous à votre compte</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email" class="form-label">Email</label>
          <InputText
            id="email"
            v-model="credentials.email"
            type="email"
            placeholder="Votre adresse email"
            :class="{ 'p-invalid': errors.email }"
            required
            autofocus
          />
          <small v-if="errors.email" class="p-error">{{ errors.email }}</small>
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Mot de passe</label>
          <Password
            id="password"
            v-model="credentials.password"
            placeholder="Votre mot de passe"
            :class="{ 'p-invalid': errors.password }"
            :feedback="false"
            toggle-mask
            required
          />
          <small v-if="errors.password" class="p-error">{{ errors.password }}</small>
        </div>

        <div class="form-group">
          <div class="flex align-items-center">
            <Checkbox id="remember" v-model="rememberMe" :binary="true" />
            <label for="remember" class="ml-2">Se souvenir de moi</label>
          </div>
        </div>

        <Button
          type="submit"
          label="Se connecter"
          :loading="isLoading"
          :disabled="!isFormValid"
          class="login-button"
          icon="pi pi-sign-in"
        />

        <div v-if="loginError" class="error-message">
          <Message severity="error" :closable="false">
            {{ loginError }}
          </Message>
        </div>
      </form>

      <div class="login-footer">
        <a href="#" class="forgot-password">Mot de passe oublié ?</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import Button from "primevue/button"
import Checkbox from "primevue/checkbox"
import InputText from "primevue/inputtext"
import Message from "primevue/message"
import Password from "primevue/password"
import { computed, reactive, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const credentials = reactive({
  email: "",
  password: "",
})

const rememberMe = ref(false)
const isLoading = ref(false)
const loginError = ref("")

const errors = reactive({
  email: "",
  password: "",
})

const isFormValid = computed(() => {
  return credentials.email && credentials.password && !errors.email && !errors.password
})

const validateForm = () => {
  errors.email = ""
  errors.password = ""

  if (!credentials.email) {
    errors.email = "L'email est requis"
  } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
    errors.email = "Format d'email invalide"
  }

  if (!credentials.password) {
    errors.password = "Le mot de passe est requis"
  } else if (credentials.password.length < 6) {
    errors.password = "Le mot de passe doit contenir au moins 6 caractères"
  }

  return !errors.email && !errors.password
}

const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true
  loginError.value = ""

  try {
    await authStore.login(credentials)

    // Redirect to intended page or dashboard
    const redirectPath = (route.query.redirect as string) || "/dashboard"
    router.push(redirectPath)
  } catch (error: any) {
    loginError.value =
      error.response?.data?.message || "Erreur de connexion. Vérifiez vos identifiants."
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2rem;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.login-subtitle {
  color: #6b7280;
  margin: 0;
  font-size: 0.95rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.9rem;
}

.login-button {
  width: 100%;
  padding: 0.75rem;
  font-weight: 600;
  margin-top: 0.5rem;
}

.error-message {
  margin-top: 1rem;
}

.login-footer {
  text-align: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.forgot-password {
  color: #667eea;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}

.forgot-password:hover {
  text-decoration: underline;
}

/* PrimeVue component customizations */
:deep(.p-inputtext),
:deep(.p-password-input) {
  width: 100%;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  font-size: 0.95rem;
}

:deep(.p-inputtext:focus),
:deep(.p-password-input:focus) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

:deep(.p-password) {
  width: 100%;
}

:deep(.p-checkbox) {
  width: 1.2rem;
  height: 1.2rem;
}

:deep(.p-message) {
  margin: 0;
}
</style>
