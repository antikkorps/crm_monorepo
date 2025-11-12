<template>
  <AppLayout>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h3 font-weight-bold mb-2">
              <v-icon icon="mdi-toggle-switch" class="mr-2" />
              Gestion des Fonctionnalités
            </h1>
            <p class="text-body-1 text-medium-emphasis">
              Activez ou désactivez les modules de l'application. La désactivation d'un module le masquera de la navigation
              et empêchera l'accès à ses fonctionnalités.
            </p>
          </div>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-text class="pa-6">

            <div v-if="loading" class="text-center py-12">
              <v-progress-circular indeterminate color="primary" size="64" />
              <div class="text-h6 mt-4">Chargement des paramètres...</div>
            </div>

            <div v-else>
              <!-- Feature Toggles -->
              <v-row>
                <v-col cols="12" md="6" v-for="feature in features" :key="feature.key">
                  <v-card variant="outlined" class="feature-card">
                    <v-card-text class="pa-4">
                      <div class="d-flex align-center justify-space-between">
                        <div class="flex-grow-1">
                          <div class="d-flex align-center mb-2">
                            <v-icon :color="feature.color" start>{{ feature.icon }}</v-icon>
                            <h3 class="text-h6">{{ feature.title }}</h3>
                          </div>
                          <p class="text-body-2 text-medium-emphasis mb-0">
                            {{ feature.description }}
                          </p>
                        </div>
                        <v-switch
                          v-model="featureStates[feature.key]"
                          color="primary"
                          hide-details
                          inset
                          @update:model-value="markAsChanged(feature.key)"
                        />
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Impact Warning -->
              <v-alert
                v-if="hasChanges"
                type="warning"
                variant="tonal"
                class="mt-6"
              >
                <v-icon start>mdi-alert</v-icon>
                Vous avez des modifications non enregistrées. Cliquez sur "Enregistrer les modifications" pour les appliquer.
              </v-alert>
            </div>
          </v-card-text>

          <v-divider />

          <v-card-actions class="pa-4">
            <v-spacer />
            <v-btn
              variant="text"
              @click="resetChanges"
              :disabled="!hasChanges || saving"
            >
              Annuler
            </v-btn>
            <v-btn
              variant="elevated"
              color="primary"
              :loading="saving"
              :disabled="!hasChanges"
              @click="saveChanges"
            >
              Enregistrer les modifications
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Success Snackbar -->
    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" timeout="3000">
      <v-icon start>mdi-check-circle</v-icon>
      Paramètres enregistrés avec succès !
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000">
      <v-icon start>mdi-alert-circle</v-icon>
      Échec de l'enregistrement des paramètres. {{ errorMessage }}
    </v-snackbar>
  </AppLayout>
</template>

<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings"
import { onMounted, ref } from "vue"
import AppLayout from "@/components/layout/AppLayout.vue"

const settingsStore = useSettingsStore()

// Feature definitions with French translations
const features = [
  {
    key: "quotes_enabled",
    title: "Gestion des Devis",
    description: "Activer la création, modification et génération PDF des devis",
    icon: "mdi-file-document-edit",
    color: "blue",
  },
  {
    key: "invoices_enabled",
    title: "Gestion des Factures",
    description: "Activer la création des factures, suivi des paiements et rappels",
    icon: "mdi-file-document",
    color: "green",
  },
  {
    key: "tasks_enabled",
    title: "Gestion des Tâches",
    description: "Activer l'assignation, suivi et notifications des tâches",
    icon: "mdi-check-circle",
    color: "purple",
  },
  {
    key: "contacts_enabled",
    title: "Gestion des Contacts",
    description: "Activer la gestion des personnes de contact pour les institutions",
    icon: "mdi-account-box-outline",
    color: "orange",
  },
  {
    key: "segmentation_enabled",
    title: "Segmentation Client",
    description: "Activer la segmentation avancée et filtrage des clients",
    icon: "mdi-filter-variant",
    color: "teal",
  },
]

// Component state
const loading = ref(false)
const saving = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref("")
const hasChanges = ref(false)
const changedKeys = ref<Set<string>>(new Set())

// Feature states (local copy for editing)
const featureStates = ref<Record<string, boolean>>({})
const originalStates = ref<Record<string, boolean>>({})

// Load initial states
onMounted(async () => {
  loading.value = true
  try {
    await settingsStore.loadAllSettings()

    // Initialize feature states from store
    features.forEach((feature) => {
      featureStates.value[feature.key] = settingsStore.featureFlags[feature.key as keyof typeof settingsStore.featureFlags]
      originalStates.value[feature.key] = featureStates.value[feature.key]
    })
  } catch (error) {
    console.error("Failed to load settings:", error)
    showError.value = true
    errorMessage.value = "Échec du chargement des paramètres actuels"
  } finally {
    loading.value = false
  }
})

// Mark a feature as changed
const markAsChanged = (key: string) => {
  changedKeys.value.add(key)

  // Check if any feature actually differs from original
  let actualChanges = false
  features.forEach((feature) => {
    if (featureStates.value[feature.key] !== originalStates.value[feature.key]) {
      actualChanges = true
    }
  })
  hasChanges.value = actualChanges
}

// Reset changes
const resetChanges = () => {
  features.forEach((feature) => {
    featureStates.value[feature.key] = originalStates.value[feature.key]
  })
  changedKeys.value.clear()
  hasChanges.value = false
}

// Save changes
const saveChanges = async () => {
  saving.value = true
  try {
    // Build settings update array
    const updates = features
      .filter((feature) => featureStates.value[feature.key] !== originalStates.value[feature.key])
      .map((feature) => ({
        key: `features.${feature.key}`,
        value: featureStates.value[feature.key],
      }))

    if (updates.length === 0) {
      hasChanges.value = false
      return
    }

    // Send bulk update
    await settingsStore.bulkUpdateSettings(updates)

    // Update original states
    features.forEach((feature) => {
      originalStates.value[feature.key] = featureStates.value[feature.key]
    })

    changedKeys.value.clear()
    hasChanges.value = false
    showSuccess.value = true
  } catch (error: any) {
    console.error("Failed to save settings:", error)
    showError.value = true
    errorMessage.value = error.message || "Erreur inconnue"
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.features-settings {
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  height: 100%;
  transition: all 0.2s ease;
}

.feature-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
