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
              <v-icon size="80" color="white" class="mb-4"> mdi-heart-pulse </v-icon>
              <h1 class="text-h2 font-weight-bold text-white">Medical CRM</h1>
              <p class="text-h5 text-white mt-4 opacity-80">
                La plateforme pour les professionnels de santé.
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
                <h1 class="text-h4 font-weight-bold text-primary mb-2">Medical CRM</h1>
              </div>
              <h2 class="text-h5 font-weight-bold text-center mb-2">Se connecter</h2>
              <p class="text-subtitle-1 text-medium-emphasis text-center mb-8">
                Ravi de vous revoir !
              </p>

              <v-form @submit.prevent="handleLogin">
                <v-text-field
                  v-model="credentials.email"
                  label="Email"
                  type="email"
                  placeholder="Votre adresse email"
                  prepend-inner-icon="mdi-email-outline"
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
                  prepend-inner-icon="mdi-lock-outline"
                  :append-inner-icon="
                    showPassword ? 'mdi-eye-outline' : 'mdi-eye-off-outline'
                  "
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
                  hide-details
                />

                <div class="d-flex justify-space-between align-center mb-4">
                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    class="text-capitalize"
                  >
                    Mot de passe oublié ?
                  </v-btn>
                </div>

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
                  density="compact"
                >
                  {{ loginError }}
                </v-alert>
              </v-form>
            </v-sheet>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth"
import { computed, reactive, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const credentials = reactive({
  email: "demo@example.com",
  password: "password",
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

const validateEmail = () => {
  if (!credentials.email) {
    errors.email = "L'email est requis"
  } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
    errors.email = "Format d'email invalide"
  } else {
    errors.email = ""
  }
}

const validatePassword = () => {
  if (!credentials.password) {
    errors.password = "Le mot de passe est requis"
  } else {
    errors.password = ""
  }
}

watch(credentials, () => {
  validateEmail()
  validatePassword()
})

const handleLogin = async () => {
  validateEmail()
  validatePassword()
  if (!isFormValid.value) return

  isLoading.value = true
  loginError.value = ""

  try {
    await authStore.login(credentials)
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
