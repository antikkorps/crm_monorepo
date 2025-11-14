<template>
  <AppLayout>
    <!-- Page Header -->
    <v-row class="mb-6">
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center">
          <div>
            <h1 class="text-h3 font-weight-bold mb-2">
              <v-icon icon="mdi-school" class="mr-2" />
              Intégration Digiforma
            </h1>
            <p class="text-body-1 text-medium-emphasis">
              Configurez la synchronisation avec Digiforma pour consolider vos revenus Formation
            </p>
          </div>
          <v-chip
            v-if="settings"
            :color="settings.isConfigured && settings.isEnabled ? 'success' : 'warning'"
            :text="settings.isConfigured && settings.isEnabled ? 'Actif' : 'Inactif'"
            :prepend-icon="settings.isConfigured && settings.isEnabled ? 'mdi-check-circle' : 'mdi-alert-circle'"
            size="large"
          />
        </div>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="loading && !settings">
      <v-col cols="12">
        <v-card>
          <v-card-text class="text-center py-12">
            <v-progress-circular indeterminate color="primary" size="64" />
            <p class="mt-4 text-body-1">Chargement de la configuration...</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Main Content -->
    <div v-else>
      <!-- Configuration Card -->
      <v-row class="mb-6">
        <v-col cols="12" md="8">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-cog" color="primary" class="mr-2" />
              Configuration
            </v-card-title>

            <v-card-text>
              <v-form ref="configForm" @submit.prevent="saveSettings">
                <!-- API URL -->
                <v-text-field
                  v-model="formData.apiUrl"
                  label="URL de l'API Digiforma"
                  prepend-inner-icon="mdi-web"
                  variant="outlined"
                  :rules="[rules.required, rules.url]"
                  hint="URL de l'API GraphQL Digiforma"
                  persistent-hint
                  class="mb-4"
                />

                <!-- Bearer Token -->
                <v-text-field
                  v-model="formData.bearerToken"
                  label="Bearer Token"
                  prepend-inner-icon="mdi-key"
                  :type="showToken ? 'text' : 'password'"
                  :append-inner-icon="showToken ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showToken = !showToken"
                  variant="outlined"
                  :rules="[rules.required]"
                  hint="Token d'authentification pour l'API Digiforma"
                  persistent-hint
                  class="mb-4"
                />

                <!-- Enable/Disable Toggle -->
                <v-switch
                  v-model="formData.isEnabled"
                  label="Activer l'intégration Digiforma"
                  color="primary"
                  :disabled="!settings?.isConfigured && !formData.bearerToken"
                  hide-details
                  class="mb-4"
                />

                <!-- Auto Sync Settings -->
                <v-expand-transition>
                  <div v-if="formData.isEnabled">
                    <v-divider class="my-4" />

                    <h3 class="text-h6 mb-3">Synchronisation automatique</h3>

                    <v-switch
                      v-model="formData.autoSyncEnabled"
                      label="Activer la synchronisation automatique"
                      color="primary"
                      hide-details
                      class="mb-4"
                    />

                    <v-select
                      v-if="formData.autoSyncEnabled"
                      v-model="formData.syncFrequency"
                      label="Fréquence de synchronisation"
                      prepend-inner-icon="mdi-clock-outline"
                      :items="syncFrequencies"
                      variant="outlined"
                      hide-details
                      class="mb-4"
                    />
                  </div>
                </v-expand-transition>

                <!-- Action Buttons -->
                <div class="d-flex gap-2 mt-6">
                  <v-btn
                    type="submit"
                    color="primary"
                    prepend-icon="mdi-content-save"
                    :loading="saving"
                    :disabled="loading"
                  >
                    Enregistrer
                  </v-btn>

                  <v-btn
                    color="info"
                    prepend-icon="mdi-connection"
                    :loading="testing"
                    :disabled="(!formData.bearerToken && !settings?.isConfigured) || !formData.apiUrl || loading"
                    @click="testConnection"
                  >
                    Tester la connexion
                  </v-btn>
                </div>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Status Card -->
        <v-col cols="12" md="4">
          <v-card elevation="2" class="mb-4">
            <v-card-title class="d-flex align-center">
              <v-icon icon="mdi-information" color="info" class="mr-2" />
              Statut
            </v-card-title>

            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon
                      :icon="settings?.isConfigured ? 'mdi-check-circle' : 'mdi-close-circle'"
                      :color="settings?.isConfigured ? 'success' : 'error'"
                    />
                  </template>
                  <v-list-item-title>Configuration</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ settings?.isConfigured ? 'Configurée' : 'Non configurée' }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon
                      :icon="settings?.isEnabled ? 'mdi-check-circle' : 'mdi-close-circle'"
                      :color="settings?.isEnabled ? 'success' : 'warning'"
                    />
                  </template>
                  <v-list-item-title>Intégration</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ settings?.isEnabled ? 'Active' : 'Inactive' }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="settings?.lastTestDate">
                  <template v-slot:prepend>
                    <v-icon
                      :icon="settings.lastTestSuccess ? 'mdi-check-circle' : 'mdi-alert-circle'"
                      :color="settings.lastTestSuccess ? 'success' : 'error'"
                    />
                  </template>
                  <v-list-item-title>Dernier test</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDate(settings.lastTestDate) }}
                  </v-list-item-subtitle>
                </v-list-item>

                <v-list-item v-if="settings?.lastSyncDate">
                  <template v-slot:prepend>
                    <v-icon icon="mdi-sync" color="primary" />
                  </template>
                  <v-list-item-title>Dernière synchro</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ formatDate(settings.lastSyncDate) }}
                  </v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Test Result -->
          <v-alert
            v-if="testResult"
            :type="testResult.success ? 'success' : 'error'"
            :title="testResult.success ? 'Connexion réussie' : 'Échec de connexion'"
            :text="testResult.message"
            class="mb-4"
            closable
            @click:close="testResult = null"
          />
        </v-col>
      </v-row>

      <!-- Synchronization Card -->
      <v-row class="mb-6">
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between">
              <div class="d-flex align-center">
                <v-icon icon="mdi-sync" color="primary" class="mr-2" />
                Synchronisation
              </div>
              <div class="d-flex gap-2">
                <v-btn
                  color="primary"
                  prepend-icon="mdi-sync"
                  :loading="syncing"
                  :disabled="!settings?.isConfigured || !settings?.isEnabled || loading || syncStatus?.isRunning"
                  @click="triggerSync('normal')"
                >
                  Synchroniser maintenant
                </v-btn>
                <v-btn
                  v-if="isSuperAdmin"
                  color="warning"
                  prepend-icon="mdi-sync-alert"
                  :loading="syncing"
                  :disabled="!settings?.isConfigured || !settings?.isEnabled || loading || syncStatus?.isRunning"
                  @click="syncModeDialog = true"
                >
                  Synchro initiale
                </v-btn>
              </div>
            </v-card-title>

            <v-card-text>
              <!-- Sync Status -->
              <v-alert
                v-if="syncStatus?.isRunning"
                type="info"
                variant="tonal"
                prominent
                class="mb-4"
              >
                <template v-slot:prepend>
                  <v-progress-circular indeterminate size="24" />
                </template>
                <v-alert-title>Synchronisation en cours...</v-alert-title>
                Veuillez patienter pendant la synchronisation des données
              </v-alert>

              <!-- Last Sync Stats -->
              <div v-if="syncStatus?.lastSync" class="mb-4">
                <h3 class="text-h6 mb-3">Dernière synchronisation</h3>

                <v-row>
                  <v-col cols="12" sm="6" md="3">
                    <v-card variant="tonal" color="primary">
                      <v-card-text class="text-center">
                        <div class="text-h4 font-weight-bold">
                          {{ syncStatus.lastSync.companiesSynced }}
                        </div>
                        <div class="text-body-2">Entreprises</div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card variant="tonal" color="info">
                      <v-card-text class="text-center">
                        <div class="text-h4 font-weight-bold">
                          {{ syncStatus.lastSync.contactsSynced }}
                        </div>
                        <div class="text-body-2">Contacts</div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card variant="tonal" color="success">
                      <v-card-text class="text-center">
                        <div class="text-h4 font-weight-bold">
                          {{ syncStatus.lastSync.quotesSynced }}
                        </div>
                        <div class="text-body-2">Devis</div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card variant="tonal" color="warning">
                      <v-card-text class="text-center">
                        <div class="text-h4 font-weight-bold">
                          {{ syncStatus.lastSync.invoicesSynced }}
                        </div>
                        <div class="text-body-2">Factures</div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Errors -->
                <v-alert
                  v-if="syncStatus.lastSync.errors && syncStatus.lastSync.errors.length > 0"
                  type="warning"
                  variant="tonal"
                  class="mt-4"
                >
                  <v-alert-title>Erreurs détectées ({{ syncStatus.lastSync.errors.length }})</v-alert-title>
                  <v-list density="compact">
                    <v-list-item
                      v-for="(error, index) in syncStatus.lastSync.errors.slice(0, 5)"
                      :key="index"
                    >
                      <v-list-item-title>{{ error.type }}</v-list-item-title>
                      <v-list-item-subtitle>{{ error.message }}</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                  <div v-if="syncStatus.lastSync.errors.length > 5" class="text-caption mt-2">
                    ... et {{ syncStatus.lastSync.errors.length - 5 }} autres erreurs
                  </div>
                </v-alert>
              </div>

              <!-- Sync History -->
              <div v-if="syncHistory.length > 0">
                <h3 class="text-h6 mb-3">Historique des synchronisations</h3>

                <v-data-table
                  :headers="syncHistoryHeaders"
                  :items="syncHistory"
                  :items-per-page="10"
                  :loading="loadingHistory"
                >
                  <template v-slot:item.status="{ item }">
                    <v-chip
                      :color="getSyncStatusColor(item.status)"
                      :text="getSyncStatusLabel(item.status)"
                      size="small"
                    />
                  </template>

                  <template v-slot:item.startedAt="{ item }">
                    {{ formatDate(item.startedAt) }}
                  </template>

                  <template v-slot:item.duration="{ item }">
                    {{ getSyncDuration(item) }}
                  </template>

                  <template v-slot:item.synced="{ item }">
                    {{ getTotalSynced(item) }}
                  </template>
                </v-data-table>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Sync Mode Dialog (Superadmin only) -->
    <v-dialog v-model="syncModeDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon icon="mdi-alert" color="warning" class="mr-2" />
          Synchronisation initiale
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" class="mb-4">
            <v-alert-title>Attention</v-alert-title>
            La synchronisation initiale va mettre à jour <strong>toutes</strong> les institutions, contacts et adresses depuis Digiforma.
            <br><br>
            Cela peut écraser les modifications manuelles effectuées dans le CRM.
            <br><br>
            La synchronisation normale crée uniquement les <strong>nouvelles</strong> entreprises sans toucher aux données existantes.
          </v-alert>

          <p class="text-body-2 mt-4">
            Êtes-vous sûr de vouloir lancer une synchronisation initiale ?
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="syncModeDialog = false"
          >
            Annuler
          </v-btn>
          <v-btn
            color="warning"
            variant="flat"
            @click="confirmInitialSync"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">
          Fermer
        </v-btn>
      </template>
    </v-snackbar>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { digiformaApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { DigiformaSettings, DigiformaSyncStatus, DigiformaSync } from '@/services/api/digiforma'

// Auth store
const authStore = useAuthStore()
const isSuperAdmin = computed(() => authStore.userRole === 'super_admin')

// Refs
const settings = ref<DigiformaSettings | null>(null)
const syncStatus = ref<DigiformaSyncStatus | null>(null)
const syncHistory = ref<DigiformaSync[]>([])
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const syncing = ref(false)
const loadingHistory = ref(false)
const showToken = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)
const syncModeDialog = ref(false)

// Form data
const formData = ref({
  apiUrl: 'https://app.digiforma.com/api/v1/graphql',
  bearerToken: '',
  isEnabled: false,
  autoSyncEnabled: false,
  syncFrequency: 'weekly' as 'daily' | 'weekly' | 'monthly'
})

// Form validation
const configForm = ref()
const rules = {
  required: (value: string) => !!value || 'Ce champ est requis',
  url: (value: string) => {
    try {
      new URL(value)
      return true
    } catch {
      return 'URL invalide'
    }
  }
}

// Sync frequencies
const syncFrequencies = [
  { title: 'Quotidienne', value: 'daily' },
  { title: 'Hebdomadaire', value: 'weekly' },
  { title: 'Mensuelle', value: 'monthly' }
]

// Snackbar
const snackbar = ref({
  show: false,
  message: '',
  color: 'success'
})

// Sync history table headers
const syncHistoryHeaders = [
  { title: 'Date', key: 'startedAt', sortable: true },
  { title: 'Statut', key: 'status', sortable: true },
  { title: 'Type', key: 'syncType', sortable: true },
  { title: 'Durée', key: 'duration', sortable: false },
  { title: 'Éléments synchronisés', key: 'synced', sortable: false }
]

// Load settings
async function loadSettings() {
  loading.value = true
  try {
    settings.value = await digiformaApi.settings.getSettings()

    // Populate form with current settings
    formData.value = {
      apiUrl: settings.value.apiUrl ? decodeURIComponent(settings.value.apiUrl) : '',
      bearerToken: '', // Don't show existing token
      isEnabled: settings.value.isEnabled,
      autoSyncEnabled: settings.value.autoSyncEnabled,
      syncFrequency: settings.value.syncFrequency
    }
  } catch (error) {
    showSnackbar('Erreur lors du chargement de la configuration', 'error')
    console.error('Failed to load settings:', error)
  } finally {
    loading.value = false
  }
}

// Load sync status
async function loadSyncStatus() {
  try {
    syncStatus.value = await digiformaApi.sync.getStatus()
  } catch (error) {
    console.error('Failed to load sync status:', error)
  }
}

// Load sync history
async function loadSyncHistory() {
  loadingHistory.value = true
  try {
    const result = await digiformaApi.sync.getHistory(10, 0)
    syncHistory.value = result.syncs
  } catch (error) {
    console.error('Failed to load sync history:', error)
  } finally {
    loadingHistory.value = false
  }
}

// Save settings
async function saveSettings() {
  const { valid } = await configForm.value.validate()
  if (!valid) return

  saving.value = true
  try {
    const payload: any = {
      apiUrl: formData.value.apiUrl,
      isEnabled: formData.value.isEnabled,
      autoSyncEnabled: formData.value.autoSyncEnabled,
      syncFrequency: formData.value.syncFrequency
    }

    // Only include bearer token if it was entered
    if (formData.value.bearerToken) {
      payload.bearerToken = formData.value.bearerToken
    }

    settings.value = await digiformaApi.settings.updateSettings(payload)
    showSnackbar('Configuration enregistrée avec succès', 'success')

    // Clear bearer token field after save
    formData.value.bearerToken = ''
  } catch (error: any) {
    showSnackbar(error.message || 'Erreur lors de l\'enregistrement', 'error')
    console.error('Failed to save settings:', error)
  } finally {
    saving.value = false
  }
}

// Test connection
async function testConnection() {
  testing.value = true
  testResult.value = null

  try {
    const result = await digiformaApi.settings.testConnection()
    testResult.value = result

    if (result.success) {
      showSnackbar('Connexion réussie', 'success')
      await loadSettings() // Reload to get updated test date
    } else {
      showSnackbar('Échec de connexion', 'error')
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: error.message || 'Erreur lors du test de connexion'
    }
    showSnackbar('Erreur lors du test de connexion', 'error')
  } finally {
    testing.value = false
  }
}

// Trigger sync
async function triggerSync(mode: 'initial' | 'normal' = 'normal') {
  syncing.value = true

  try {
    const result = await digiformaApi.sync.triggerSync({ mode })
    showSnackbar(
      mode === 'initial' ? 'Synchronisation initiale démarrée' : 'Synchronisation démarrée',
      'success'
    )

    // Poll sync status
    const pollInterval = setInterval(async () => {
      await loadSyncStatus()

      if (!syncStatus.value?.isRunning) {
        clearInterval(pollInterval)
        syncing.value = false
        await loadSyncHistory()
        showSnackbar('Synchronisation terminée', 'success')
      }
    }, 3000)
  } catch (error: any) {
    showSnackbar(error.message || 'Erreur lors du démarrage de la synchronisation', 'error')
    console.error('Failed to trigger sync:', error)
    syncing.value = false
  }
}

// Confirm initial sync (superadmin only)
function confirmInitialSync() {
  syncModeDialog.value = false
  triggerSync('initial')
}

// Helper functions
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getSyncStatusColor(status: string) {
  const colors: Record<string, string> = {
    success: 'success',
    pending: 'info',
    in_progress: 'warning',
    error: 'error',
    partial: 'warning'
  }
  return colors[status] || 'grey'
}

function getSyncStatusLabel(status: string) {
  const labels: Record<string, string> = {
    success: 'Succès',
    pending: 'En attente',
    in_progress: 'En cours',
    error: 'Erreur',
    partial: 'Partiel'
  }
  return labels[status] || status
}

function getSyncDuration(sync: DigiformaSync) {
  if (!sync.completedAt) return '-'

  const start = new Date(sync.startedAt).getTime()
  const end = new Date(sync.completedAt).getTime()
  const seconds = Math.floor((end - start) / 1000)

  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${seconds % 60}s`
}

function getTotalSynced(sync: DigiformaSync) {
  return sync.companiesSynced + sync.contactsSynced + sync.quotesSynced + sync.invoicesSynced
}

function showSnackbar(message: string, color: 'success' | 'error' | 'info' = 'success') {
  snackbar.value = {
    show: true,
    message,
    color
  }
}

// Lifecycle
onMounted(async () => {
  await loadSettings()
  await loadSyncStatus()
  await loadSyncHistory()
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
