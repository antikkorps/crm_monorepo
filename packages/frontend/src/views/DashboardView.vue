<template>
  <AppLayout>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h3 font-weight-bold mb-2">Dashboard</h1>
            <p class="text-h6 text-medium-emphasis">
              Bienvenue, <strong>{{ authStore.userName }}</strong>
            </p>
          </div>
          <v-chip
            :text="getCurrentDate()"
            prepend-icon="mdi-calendar"
            color="primary"
            variant="tonal"
            size="large"
          />
        </div>
      </v-col>
    </v-row>

    <!-- Redirect Loading (if needed) -->
    <v-row v-if="shouldRedirectToBilling" class="justify-center">
      <v-col cols="12" md="8">
        <v-alert
          type="info"
          variant="tonal"
          prominent
        >
          <template v-slot:prepend>
            <v-progress-circular indeterminate size="24" />
          </template>
          <v-alert-title>Redirection en cours...</v-alert-title>
          Redirection vers le dashboard de facturation...
        </v-alert>
      </v-col>
    </v-row>

    <!-- Dashboard Content -->
    <div v-else>
      <!-- Stats Cards -->
      <v-row class="mb-6">
        <v-col
          v-for="stat in statsCards"
          :key="stat.title"
          cols="12"
          sm="6"
          md="3"
        >
          <v-card
            class="stat-card"
            elevation="2"
            @click="$router.push(stat.route)"
            hover
          >
            <v-card-text>
              <div class="d-flex align-center mb-3">
                <v-icon
                  :icon="stat.icon"
                  :color="stat.color"
                  size="28"
                  class="mr-3"
                />
                <span class="text-h6 font-weight-medium">{{ stat.title }}</span>
              </div>
              
              <div class="text-h3 font-weight-bold mb-2" :style="{ color: stat.color }">
                {{ stat.value }}
              </div>
              
              <p class="text-body-2 text-medium-emphasis mb-3">
                {{ stat.description }}
              </p>
              
              <v-btn
                :text="stat.actionLabel"
                :prepend-icon="stat.actionIcon"
                variant="text"
                color="primary"
                size="small"
              />
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Quick Actions -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-lightning-bolt" color="primary" class="mr-2" />
              Actions rapides
            </v-card-title>
            
            <v-card-text>
              <v-row>
                <v-col
                  v-for="action in quickActions"
                  :key="action.title"
                  cols="12"
                  sm="6"
                  md="4"
                >
                  <v-card
                    class="quick-action-card"
                    variant="outlined"
                    hover
                    @click="$router.push(action.route)"
                  >
                    <v-card-text class="text-center pa-6">
                      <v-avatar
                        size="64"
                        class="mb-4"
                        :color="action.color"
                        variant="tonal"
                      >
                        <v-icon
                          :icon="action.icon"
                          size="32"
                          :color="action.color"
                        />
                      </v-avatar>
                      
                      <v-card-title class="text-h6 mb-2">
                        {{ action.title }}
                      </v-card-title>
                      
                      <p class="text-body-2 text-medium-emphasis">
                        {{ action.description }}
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Development Notice -->
      <v-row>
        <v-col cols="12">
          <v-alert
            type="info"
            variant="tonal"
            prominent
            border="start"
            closable
          >
            <v-alert-title class="text-h6 mb-2">
              Dashboard en développement
            </v-alert-title>
            
            <p class="mb-4">
              Le dashboard principal est en cours de développement. 
              Explorez les différentes sections via la navigation latérale.
            </p>
            
            <v-btn
              text="Découvrir Billing Analytics"
              prepend-icon="mdi-chart-bar"
              color="primary"
              variant="elevated"
              @click="$router.push('/billing/analytics')"
            />
          </v-alert>
        </v-col>
      </v-row>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import AppLayout from "@/components/layout/AppLayout.vue"
import { useAuthStore } from "@/stores/auth"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"

const authStore = useAuthStore()
const router = useRouter()

// Check if user should be automatically redirected to billing analytics
const shouldRedirectToBilling = computed(() => {
  return false
})

// Get current date formatted
const getCurrentDate = () => {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Stats cards data - updated with Material Design Icons
const statsCards = ref([
  {
    title: 'Institutions',
    value: '12',
    description: 'Institutions actives',
    icon: 'mdi-domain',
    color: 'blue',
    actionLabel: 'Voir tout',
    actionIcon: 'mdi-arrow-right',
    route: '/institutions'
  },
  {
    title: 'Tâches',
    value: '8',
    description: 'Tâches en cours',
    icon: 'mdi-check-circle',
    color: 'green',
    actionLabel: 'Gérer',
    actionIcon: 'mdi-arrow-right',
    route: '/tasks'
  },
  {
    title: 'Équipe',
    value: '5',
    description: 'Membres actifs',
    icon: 'mdi-account-group',
    color: 'purple',
    actionLabel: 'Voir équipe',
    actionIcon: 'mdi-arrow-right',
    route: '/team'
  },
  {
    title: 'Analytics',
    value: '24',
    description: 'Rapports générés',
    icon: 'mdi-chart-bar',
    color: 'orange',
    actionLabel: 'Analyser',
    actionIcon: 'mdi-arrow-right',
    route: '/billing/analytics'
  }
])

// Quick actions data - updated with Material Design Icons
const quickActions = ref([
  {
    title: 'Billing Analytics',
    description: 'Analysez vos données de facturation et performances',
    icon: 'mdi-chart-bar',
    color: 'primary',
    route: '/billing/analytics'
  },
  {
    title: 'Gestion des institutions',
    description: 'Administrez vos institutions et partenaires',
    icon: 'mdi-domain',
    color: 'blue',
    route: '/institutions'
  },
  {
    title: 'Suivi des tâches',
    description: 'Organisez et suivez vos tâches quotidiennes',
    icon: 'mdi-check-circle',
    color: 'green',
    route: '/tasks'
  },
  {
    title: 'Équipe & collaboration',
    description: 'Gérez votre équipe et les collaborations',
    icon: 'mdi-account-group',
    color: 'purple',
    route: '/team'
  },
  {
    title: 'Webhooks & intégrations',
    description: 'Configurez vos intégrations et webhooks',
    icon: 'mdi-webhook',
    color: 'cyan',
    route: '/webhooks'
  },
  {
    title: 'Facturation',
    description: 'Créez et gérez vos devis et factures',
    icon: 'mdi-credit-card',
    color: 'orange',
    route: '/quotes'
  }
])

// Auto-redirect logic (if needed)
onMounted(() => {
  if (shouldRedirectToBilling.value) {
    setTimeout(() => {
      router.push("/billing/analytics")
    }, 2000)
  }
})
</script>

<style scoped>
.stat-card {
  cursor: pointer;
  transition: transform 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.quick-action-card {
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

.quick-action-card:hover {
  transform: translateY(-2px);
}
</style>
