<template>
  <div class="features-settings">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center bg-primary">
            <v-icon start class="text-white">mdi-toggle-switch</v-icon>
            <span class="text-white">Feature Flags Management</span>
          </v-card-title>

          <v-card-text class="pa-6">
            <v-alert type="info" variant="tonal" class="mb-6">
              <v-icon start>mdi-information</v-icon>
              Enable or disable application modules. Disabling a module will hide it from navigation
              and prevent access to its features.
            </v-alert>

            <div v-if="loading" class="text-center py-12">
              <v-progress-circular indeterminate color="primary" size="64" />
              <div class="text-h6 mt-4">Loading settings...</div>
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
                You have unsaved changes. Click "Save Changes" to apply them.
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
              Cancel
            </v-btn>
            <v-btn
              variant="elevated"
              color="primary"
              :loading="saving"
              :disabled="!hasChanges"
              @click="saveChanges"
            >
              Save Changes
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" timeout="3000">
      <v-icon start>mdi-check-circle</v-icon>
      Settings saved successfully!
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000">
      <v-icon start>mdi-alert-circle</v-icon>
      Failed to save settings. {{ errorMessage }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from "@/stores/settings"
import { onMounted, ref } from "vue"

const settingsStore = useSettingsStore()

// Component state
const loading = ref(false)
const saving = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref("")
const hasChanges = ref(false)
const changedKeys = ref<Set<string>>(new Set())

// Feature definitions
const features = [
  {
    key: "quotes_enabled",
    title: "Quotes Management",
    description: "Enable quote creation, editing, and PDF generation",
    icon: "mdi-file-document-edit",
    color: "blue",
  },
  {
    key: "invoices_enabled",
    title: "Invoices Management",
    description: "Enable invoice creation, payment tracking, and reminders",
    icon: "mdi-file-document",
    color: "green",
  },
  {
    key: "tasks_enabled",
    title: "Tasks Management",
    description: "Enable task assignment, tracking, and notifications",
    icon: "mdi-check-circle",
    color: "purple",
  },
  {
    key: "contacts_enabled",
    title: "Contacts Management",
    description: "Enable contact person management for institutions",
    icon: "mdi-account-box-outline",
    color: "orange",
  },
  {
    key: "segmentation_enabled",
    title: "Customer Segmentation",
    description: "Enable advanced customer segmentation and filtering",
    icon: "mdi-filter-variant",
    color: "teal",
  },
]

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
    errorMessage.value = "Failed to load current settings"
  } finally {
    loading.value = false
  }
})

// Mark a feature as changed
const markAsChanged = (key: string) => {
  changedKeys.value.add(key)
  hasChanges.value = featureStates.value[key] !== originalStates.value[key] || changedKeys.value.size > 0

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
    errorMessage.value = error.message || "Unknown error occurred"
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
