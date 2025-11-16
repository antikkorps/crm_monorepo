<template>
  <div class="plugin-manager">
    <!-- Header -->
    <div class="flex justify-content-between align-items-center mb-4">
      <div>
        <h2 class="text-2xl font-semibold text-900 mb-2">Plugin Management</h2>
        <p class="text-600 m-0">Manage and configure system plugins</p>
      </div>
      <div class="flex gap-2">
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          outlined
          @click="refreshPlugins"
          :loading="loading"
        />
        <Button
          icon="pi pi-search"
          label="Discover"
          outlined
          @click="showDiscoveryDialog = true"
        />
        <Button
          icon="pi pi-plus"
          label="Install Plugin"
          @click="showInstallDialog = true"
        />
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid mb-4">
      <div class="col-12 md:col-3">
        <div class="surface-card p-3 border-round shadow-1">
          <div class="flex justify-content-between align-items-start">
            <div>
              <div class="text-900 font-medium text-xl">{{ stats.total }}</div>
              <div class="text-600">Total Plugins</div>
            </div>
            <div class="bg-blue-100 p-2 border-round">
              <i class="pi pi-box text-blue-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 md:col-3">
        <div class="surface-card p-3 border-round shadow-1">
          <div class="flex justify-content-between align-items-start">
            <div>
              <div class="text-900 font-medium text-xl">{{ stats.enabled }}</div>
              <div class="text-600">Enabled</div>
            </div>
            <div class="bg-green-100 p-2 border-round">
              <i class="pi pi-check-circle text-green-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 md:col-3">
        <div class="surface-card p-3 border-round shadow-1">
          <div class="flex justify-content-between align-items-start">
            <div>
              <div class="text-900 font-medium text-xl">{{ stats.disabled }}</div>
              <div class="text-600">Disabled</div>
            </div>
            <div class="bg-orange-100 p-2 border-round">
              <i class="pi pi-pause-circle text-orange-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 md:col-3">
        <div class="surface-card p-3 border-round shadow-1">
          <div class="flex justify-content-between align-items-start">
            <div>
              <div class="text-900 font-medium text-xl">{{ stats.error }}</div>
              <div class="text-600">Errors</div>
            </div>
            <div class="bg-red-100 p-2 border-round">
              <i class="pi pi-exclamation-triangle text-red-500 text-xl"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters and Search -->
    <div class="surface-card p-4 border-round shadow-1 mb-4">
      <div class="flex flex-column md:flex-row gap-3 align-items-center">
        <div class="flex-1">
          <span class="p-input-icon-left w-full">
            <i class="pi pi-search"></i>
            <InputText
              v-model="searchQuery"
              placeholder="Search plugins..."
              class="w-full"
            />
          </span>
        </div>
        <Dropdown
          v-model="selectedCategory"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          placeholder="All Categories"
          class="w-full md:w-auto"
          show-clear
        />
        <Dropdown
          v-model="selectedStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="All Statuses"
          class="w-full md:w-auto"
          show-clear
        />
      </div>
    </div>

    <!-- Plugin List -->
    <div class="surface-card border-round shadow-1">
      <DataTable
        :value="filteredPlugins"
        :loading="loading"
        paginator
        :rows="10"
        :rows-per-page-options="[5, 10, 20]"
        responsive-layout="scroll"
        :global-filter-fields="[
          'manifest.name',
          'manifest.displayName',
          'manifest.description',
        ]"
        :global-filter="searchQuery"
        class="p-datatable-sm"
      >
        <template #empty>
          <div class="text-center py-4">
            <i class="pi pi-box text-4xl text-400 mb-3"></i>
            <div class="text-900 font-medium mb-2">No plugins found</div>
            <div class="text-600">Install your first plugin to get started</div>
          </div>
        </template>

        <Column field="manifest.displayName" header="Plugin" sortable>
          <template #body="{ data }">
            <div class="flex align-items-center gap-3">
              <div class="bg-primary-100 p-2 border-round">
                <i
                  :class="getCategoryIcon(data.manifest.category)"
                  class="text-primary text-lg"
                ></i>
              </div>
              <div>
                <div class="font-medium text-900">{{ data.manifest.displayName }}</div>
                <div class="text-600 text-sm">
                  {{ data.manifest.name }} v{{ data.manifest.version }}
                </div>
                <div class="text-600 text-sm mt-1">{{ data.manifest.description }}</div>
              </div>
            </div>
          </template>
        </Column>

        <Column field="manifest.category" header="Category" sortable>
          <template #body="{ data }">
            <Tag
              :value="getCategoryDisplayName(data.manifest.category)"
              :icon="getCategoryIcon(data.manifest.category)"
              class="text-sm"
            />
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag
              :value="getStatusDisplayName(data.status)"
              :severity="getStatusSeverity(data.status)"
              class="text-sm"
            />
          </template>
        </Column>

        <Column field="manifest.author" header="Author" sortable>
          <template #body="{ data }">
            <div class="text-900">{{ data.manifest.author }}</div>
          </template>
        </Column>

        <Column field="loadedAt" header="Installed" sortable>
          <template #body="{ data }">
            <div class="text-600 text-sm">
              {{ data.loadedAt ? formatDate(data.loadedAt) : "-" }}
            </div>
          </template>
        </Column>

        <Column header="Actions" class="text-center" style="width: 200px">
          <template #body="{ data }">
            <div class="flex gap-1 justify-content-center">
              <Button
                v-if="data.status === 'disabled'"
                icon="pi pi-play"
                size="small"
                outlined
                severity="success"
                v-tooltip="'Enable Plugin'"
                @click="enablePlugin(data.manifest.name)"
                :loading="loading"
              />
              <Button
                v-if="data.status === 'enabled'"
                icon="pi pi-pause"
                size="small"
                outlined
                severity="warning"
                v-tooltip="'Disable Plugin'"
                @click="disablePlugin(data.manifest.name)"
                :loading="loading"
              />
              <Button
                icon="pi pi-cog"
                size="small"
                outlined
                v-tooltip="'Configure Plugin'"
                @click="configurePlugin(data)"
              />
              <Button
                icon="pi pi-info-circle"
                size="small"
                outlined
                v-tooltip="'Plugin Details'"
                @click="showPluginDetails(data)"
              />
              <Button
                icon="pi pi-heart"
                size="small"
                outlined
                severity="info"
                v-tooltip="'Health Check'"
                @click="performHealthCheck(data.manifest.name)"
              />
              <Button
                icon="pi pi-trash"
                size="small"
                outlined
                severity="danger"
                v-tooltip="'Uninstall Plugin'"
                @click="confirmUninstall(data)"
                :disabled="data.status === 'enabled'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Install Plugin Dialog -->
    <Dialog
      v-model:visible="showInstallDialog"
      header="Install Plugin"
      modal
      :style="{ width: '500px' }"
    >
      <div class="flex flex-column gap-3">
        <div>
          <label for="pluginPath" class="block text-900 font-medium mb-2"
            >Plugin Path</label
          >
          <InputText
            id="pluginPath"
            v-model="installPluginPath"
            placeholder="Enter plugin directory path..."
            class="w-full"
          />
          <small class="text-600">
            Enter the full path to the plugin directory containing package.json
          </small>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          outlined
          @click="showInstallDialog = false"
        />
        <Button
          label="Install"
          icon="pi pi-download"
          @click="handleInstallPlugin"
          :loading="loading"
          :disabled="!installPluginPath.trim()"
        />
      </template>
    </Dialog>

    <!-- Plugin Discovery Dialog -->
    <PluginDiscovery
      v-model:visible="showDiscoveryDialog"
      @plugin-selected="handlePluginSelected"
    />

    <!-- Plugin Details Dialog -->
    <PluginDetails
      v-model:visible="showDetailsDialog"
      :plugin="selectedPluginForDetails"
    />

    <!-- Plugin Configuration Dialog -->
    <PluginConfiguration
      v-model:visible="showConfigDialog"
      :plugin="selectedPluginForConfig"
      @configuration-saved="handleConfigurationSaved"
    />

    <!-- Health Check Dialog -->
    <PluginHealthCheck
      v-model:visible="showHealthDialog"
      :plugin-name="selectedPluginForHealth"
      :health-data="healthCheckData"
    />

    <!-- Confirm Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">Confirm Action</v-card-title>
        <v-card-text>{{ confirmMessage }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showConfirmDialog = false">
            Cancel
          </v-btn>
          <v-btn color="error" variant="flat" @click="executeConfirm">
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useNotificationStore } from "@/stores/notification"
import { computed, onMounted, ref } from "vue"
import {
  PluginCategory,
  PluginInstance,
  PluginService,
  PluginStatus,
} from "../../services/api/plugins"
import { usePluginStore } from "../../stores/plugins"
import PluginConfiguration from "./PluginConfiguration.vue"
import PluginDetails from "./PluginDetails.vue"
import PluginDiscovery from "./PluginDiscovery.vue"
import PluginHealthCheck from "./PluginHealthCheck.vue"

// Composables
const pluginStore = usePluginStore()
const notificationStore = useNotificationStore()

// State
const searchQuery = ref("")
const selectedCategory = ref<PluginCategory | null>(null)
const selectedStatus = ref<PluginStatus | null>(null)
const showInstallDialog = ref(false)
const showDiscoveryDialog = ref(false)
const showDetailsDialog = ref(false)
const showConfigDialog = ref(false)
const showHealthDialog = ref(false)
const showConfirmDialog = ref(false)
const confirmMessage = ref("")
const confirmCallback = ref<(() => void) | null>(null)
const installPluginPath = ref("")
const selectedPluginForDetails = ref<PluginInstance | null>(null)
const selectedPluginForConfig = ref<PluginInstance | null>(null)
const selectedPluginForHealth = ref<string | null>(null)
const healthCheckData = ref<any>(null)

// Computed
const { plugins, stats, loading } = pluginStore

const categoryOptions = computed(() => [
  { label: "Integration", value: PluginCategory.INTEGRATION },
  { label: "Billing", value: PluginCategory.BILLING },
  { label: "Notification", value: PluginCategory.NOTIFICATION },
  { label: "Analytics", value: PluginCategory.ANALYTICS },
  { label: "Workflow", value: PluginCategory.WORKFLOW },
  { label: "Utility", value: PluginCategory.UTILITY },
])

const statusOptions = computed(() => [
  { label: "Enabled", value: PluginStatus.ENABLED },
  { label: "Disabled", value: PluginStatus.DISABLED },
  { label: "Error", value: PluginStatus.ERROR },
  { label: "Loading", value: PluginStatus.LOADING },
])

const filteredPlugins = computed(() => {
  let filtered = [...plugins]

  if (selectedCategory.value) {
    filtered = filtered.filter(
      (plugin) => plugin.manifest.category === selectedCategory.value
    )
  }

  if (selectedStatus.value) {
    filtered = filtered.filter((plugin) => plugin.status === selectedStatus.value)
  }

  return filtered
})

// Helper for confirmation dialogs
const showConfirm = (message: string, onConfirm: () => void) => {
  confirmMessage.value = message
  confirmCallback.value = onConfirm
  showConfirmDialog.value = true
}

const executeConfirm = () => {
  if (confirmCallback.value) {
    confirmCallback.value()
  }
  showConfirmDialog.value = false
}

// Methods
const refreshPlugins = async () => {
  try {
    await pluginStore.refreshAll()
    notificationStore.showSuccess("Plugins refreshed successfully")
  } catch (error) {
    notificationStore.showError("Failed to refresh plugins")
  }
}

const handleInstallPlugin = async () => {
  try {
    await pluginStore.installPlugin(installPluginPath.value.trim())
    notificationStore.showSuccess("Plugin installed successfully")
    showInstallDialog.value = false
    installPluginPath.value = ""
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to install plugin"
    notificationStore.showError(message)
  }
}

const handlePluginSelected = (pluginPath: string) => {
  installPluginPath.value = pluginPath
  showDiscoveryDialog.value = false
  showInstallDialog.value = true
}

const enablePlugin = async (name: string) => {
  try {
    await pluginStore.enablePlugin(name)
    notificationStore.showSuccess(`Plugin "${name}" enabled successfully`)
  } catch (error) {
    notificationStore.showError(`Failed to enable plugin "${name}"`)
  }
}

const disablePlugin = async (name: string) => {
  try {
    await pluginStore.disablePlugin(name)
    notificationStore.showSuccess(`Plugin "${name}" disabled successfully`)
  } catch (error) {
    notificationStore.showError(`Failed to disable plugin "${name}"`)
  }
}

const configurePlugin = (plugin: PluginInstance) => {
  selectedPluginForConfig.value = plugin
  showConfigDialog.value = true
}

const showPluginDetails = (plugin: PluginInstance) => {
  selectedPluginForDetails.value = plugin
  showDetailsDialog.value = true
}

const performHealthCheck = async (name: string) => {
  try {
    const health = await pluginStore.healthCheck(name)
    selectedPluginForHealth.value = name
    healthCheckData.value = health
    showHealthDialog.value = true
  } catch (error) {
    notificationStore.showError(`Failed to perform health check for "${name}"`)
  }
}

const confirmUninstall = (plugin: PluginInstance) => {
  showConfirm(
    `Are you sure you want to uninstall "${plugin.manifest.displayName}"? This action cannot be undone.`,
    () => uninstallPlugin(plugin.manifest.name)
  )
}

const uninstallPlugin = async (name: string) => {
  try {
    await pluginStore.uninstallPlugin(name)
    notificationStore.showSuccess(`Plugin "${name}" uninstalled successfully`)
  } catch (error) {
    notificationStore.showError(`Failed to uninstall plugin "${name}"`)
  }
}

const handleConfigurationSaved = () => {
  notificationStore.showSuccess("Plugin configuration saved successfully")
}

// Utility methods
const getCategoryDisplayName = (category: PluginCategory) => {
  return PluginService.getCategoryDisplayName(category)
}

const getStatusDisplayName = (status: PluginStatus) => {
  return PluginService.getStatusDisplayName(status)
}

const getStatusSeverity = (status: PluginStatus) => {
  return PluginService.getStatusSeverity(status)
}

const getCategoryIcon = (category: PluginCategory) => {
  return PluginService.getCategoryIcon(category)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

// Lifecycle
onMounted(async () => {
  await pluginStore.initialize()
})
</script>

<style scoped>
.plugin-manager {
  padding: 1rem;
}

:deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.75rem;
}

:deep(.p-tag) {
  font-size: 0.75rem;
}
</style>
