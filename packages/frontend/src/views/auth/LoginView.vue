<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center" class="fill-height">
          <v-col cols="12" sm="8" md="4">
            <v-card elevation="12" class="login-card">
              <v-card-text class="pa-8">
                <div class="text-center mb-8">
                  <h1 class="text-h3 font-weight-bold primary--text mb-2">
                    Medical CRM
                  </h1>
                  <p class="text-subtitle-1 text-medium-emphasis">
                    Connectez-vous à votre compte
                  </p>
                </div>

                <v-form @submit.prevent="handleLogin">
                  <v-text-field
                    v-model="credentials.email"
                    label="Email"
                    type="email"
                    placeholder="Votre adresse email"
                    prepend-inner-icon="mdi-email"
                    variant="outlined"
                    :error-messages="errors.email"
                    :error="!!errors.email"
                    required
                    autofocus
                    class="mb-4"
                  />

                  <v-text-field
                    v-model="credentials.password"
                    label="Mot de passe"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Votre mot de passe"
                    prepend-inner-icon="mdi-lock"
                    :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                    variant="outlined"
                    :error-messages="errors.password"
                    :error="!!errors.password"
                    required
                    class="mb-4"
                    @click:append-inner="showPassword = !showPassword"
                  />

                  <v-checkbox
                    v-model="rememberMe"
                    label="Se souvenir de moi"
                    color="primary"
                    class="mb-4"
                  />

                  <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    :loading="isLoading"
                    :disabled="!isFormValid"
                    prepend-icon="mdi-login"
                    variant="elevated"
                    block
                    class="mb-4"
                  >
                    Se connecter
                  </v-btn>

                  <v-alert
                    v-if="loginError"
                    type="error"
                    variant="tonal"
                    class="mb-4"
                  >
                    {{ loginError }}
                  </v-alert>
                </v-form>

                <v-divider class="my-6" />

                <div class="text-center">
                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                  >
                    Mot de passe oublié ?
                  </v-btn>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
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
const showPassword = ref(false)

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
.login-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
}

:deep(.v-card-text) {
  background: white;
  border-radius: 12px;
  margin: 8px;
}
</style>
