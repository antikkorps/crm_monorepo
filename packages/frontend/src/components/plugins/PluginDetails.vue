<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="plugin ? `${plugin.manifest.displayName} Details` : 'Plugin Details'"
    modal
    :style="{ width: '800px' }"
  >
    <div v-if="plugin" class="flex flex-column gap-4">
      <!-- Header -->
      <div class="flex align-items-center gap-4 pb-3 border-bottom-1 surface-border">
        <div class="bg-primary-100 p-3 border-round">
          <i
            :class="getCategoryIcon(plugin.manifest.category)"
            class="text-primary text-2xl"
          ></i>
        </div>
        <div class="flex-1">
          <div class="text-2xl font-semibold text-900 mb-1">
            {{ plugin.manifest.displayName }}
          </div>
          <div class="text-600 mb-2">
            {{ plugin.manifest.name }} v{{ plugin.manifest.version }}
          </div>
          <div class="flex align-items-center gap-2">
            <Tag
              :value="getStatusDisplayName(plugin.status)"
              :severity="getStatusSeverity(plugin.status)"
            />
            <Tag
              :value="getCategoryDisplayName(plugin.manifest.category)"
              :icon="getCategoryIcon(plugin.manifest.category)"
            />
          </div>
        </div>
      </div>

      <!-- Description -->
      <div>
        <h4 class="text-lg font-medium text-900 mb-2">Description</h4>
        <p class="text-600 line-height-3 m-0">
          {{ plugin.manifest.description }}
        </p>
      </div>

      <!-- Basic Information -->
      <div>
        <h4 class="text-lg font-medium text-900 mb-3">Information</h4>
        <div class="grid">
          <div class="col-6">
            <div class="text-600 text-sm mb-1">Author</div>
            <div class="text-900 font-medium">{{ plugin.manifest.author }}</div>
          </div>
          <div class="col-6">
            <div class="text-600 text-sm mb-1">Version</div>
            <div class="text-900 font-medium">{{ plugin.manifest.version }}</div>
          </div>
          <div class="col-6">
            <div class="text-600 text-sm mb-1">License</div>
            <div class="text-900 font-medium">
              {{ plugin.manifest.license || "Not specified" }}
            </div>
          </div>
          <div class="col-6">
            <div class="text-600 text-sm mb-1">Main File</div>
            <div class="text-900 font-medium">{{ plugin.manifest.main }}</div>
          </div>
          <div class="col-6" v-if="plugin.loadedAt">
            <div class="text-600 text-sm mb-1">Installed</div>
            <div class="text-900 font-medium">{{ formatDate(plugin.loadedAt) }}</div>
          </div>
          <div class="col-6" v-if="plugin.lastError">
            <div class="text-600 text-sm mb-1">Last Error</div>
            <div class="text-900 font-medium">{{ formatDate(plugin.lastError) }}</div>
          </div>
        </div>
      </div>

      <!-- Links -->
      <div v-if="plugin.manifest.homepage || plugin.manifest.repository">
        <h4 class="text-lg font-medium text-900 mb-3">Links</h4>
        <div class="flex gap-2">
          <Button
            v-if="plugin.manifest.homepage"
            icon="pi pi-external-link"
            label="Homepage"
            outlined
            size="small"
            @click="openLink(plugin.manifest.homepage)"
          />
          <Button
            v-if="plugin.manifest.repository"
            icon="pi pi-github"
            label="Repository"
            outlined
            size="small"
            @click="openLink(plugin.manifest.repository)"
          />
        </div>
      </div>

      <!-- Hooks -->
      <div v-if="plugin.manifest.hooks && plugin.manifest.hooks.length > 0">
        <h4 class="text-lg font-medium text-900 mb-3">Event Hooks</h4>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="hook in plugin.manifest.hooks"
            :key="hook"
            :value="hook"
            severity="info"
            class="text-sm"
          />
        </div>
        <small class="text-600 mt-2 block">
          These are the system events this plugin can respond to
        </small>
      </div>

      <!-- Permissions -->
      <div v-if="plugin.manifest.permissions && plugin.manifest.permissions.length > 0">
        <h4 class="text-lg font-medium text-900 mb-3">Permissions</h4>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="permission in plugin.manifest.permissions"
            :key="permission"
            :value="permission"
            severity="warning"
            class="text-sm"
          />
        </div>
        <small class="text-600 mt-2 block">
          These are the system permissions required by this plugin
        </small>
      </div>

      <!-- Keywords -->
      <div v-if="plugin.manifest.keywords && plugin.manifest.keywords.length > 0">
        <h4 class="text-lg font-medium text-900 mb-3">Keywords</h4>
        <div class="flex flex-wrap gap-2">
          <Tag
            v-for="keyword in plugin.manifest.keywords"
            :key="keyword"
            :value="keyword"
            class="text-sm"
          />
        </div>
      </div>

      <!-- Dependencies -->
      <div v-if="hasDependencies">
        <h4 class="text-lg font-medium text-900 mb-3">Dependencies</h4>

        <div v-if="plugin.manifest.dependencies" class="mb-3">
          <div class="text-600 text-sm mb-2">Runtime Dependencies</div>
          <div class="surface-100 p-3 border-round">
            <div
              v-for="(version, name) in plugin.manifest.dependencies"
              :key="name"
              class="flex justify-content-between align-items-center py-1"
            >
              <span class="font-mono text-sm">{{ name }}</span>
              <span class="text-600 text-sm">{{ version }}</span>
            </div>
          </div>
        </div>

        <div v-if="plugin.manifest.peerDependencies" class="mb-3">
          <div class="text-600 text-sm mb-2">Peer Dependencies</div>
          <div class="surface-100 p-3 border-round">
            <div
              v-for="(version, name) in plugin.manifest.peerDependencies"
              :key="name"
              class="flex justify-content-between align-items-center py-1"
            >
              <span class="font-mono text-sm">{{ name }}</span>
              <span class="text-600 text-sm">{{ version }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Configuration Schema -->
      <div v-if="plugin.manifest.configSchema">
        <h4 class="text-lg font-medium text-900 mb-3">Configuration Schema</h4>
        <div class="surface-100 p-3 border-round">
          <pre class="text-sm m-0 overflow-auto" style="max-height: 200px">{{
            formatJSON(plugin.manifest.configSchema)
          }}</pre>
        </div>
      </div>

      <!-- Current Configuration -->
      <div v-if="plugin.config && Object.keys(plugin.config).length > 0">
        <h4 class="text-lg font-medium text-900 mb-3">Current Configuration</h4>
        <div class="surface-100 p-3 border-round">
          <pre class="text-sm m-0 overflow-auto" style="max-height: 200px">{{
            formatJSON(plugin.config)
          }}</pre>
        </div>
      </div>

      <!-- Error Information -->
      <div
        v-if="plugin.error"
        class="surface-red-50 p-3 border-round border-1 border-red-200"
      >
        <div class="flex align-items-center gap-2 mb-2">
          <i class="pi pi-exclamation-triangle text-red-500"></i>
          <span class="font-medium text-red-900">Plugin Error</span>
        </div>
        <div class="text-red-800 text-sm">{{ plugin.error }}</div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-between w-full">
        <div class="flex gap-2">
          <Button
            v-if="plugin && plugin.status === 'disabled'"
            icon="pi pi-play"
            label="Enable"
            severity="success"
            @click="enablePlugin"
            :loading="loading"
          />
          <Button
            v-if="plugin && plugin.status === 'enabled'"
            icon="pi pi-pause"
            label="Disable"
            severity="warning"
            @click="disablePlugin"
            :loading="loading"
          />
          <Button icon="pi pi-cog" label="Configure" outlined @click="configurePlugin" />
          <Button
            icon="pi pi-heart"
            label="Health Check"
            outlined
            @click="performHealthCheck"
            :loading="healthCheckLoading"
          />
        </div>
        <Button
          label="Close"
          icon="pi pi-times"
          outlined
          @click="$emit('update:visible', false)"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useNotificationStore } from "@/stores/notification"
import { computed, ref } from "vue"
import {
  PluginCategory,
  PluginInstance,
  PluginService,
  PluginStatus,
} from "../../services/api/plugins"
import { usePluginStore } from "../../stores/plugins"

// Props & Emits
interface Props {
  visible: boolean
  plugin: PluginInstance | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
  "configure-plugin": [plugin: PluginInstance]
}>()

// Composables
const pluginStore = usePluginStore()
const notificationStore = useNotificationStore()

// State
const loading = ref(false)
const healthCheckLoading = ref(false)

// Computed
const hasDependencies = computed(() => {
  if (!props.plugin) return false
  return (
    (props.plugin.manifest.dependencies &&
      Object.keys(props.plugin.manifest.dependencies).length > 0) ||
    (props.plugin.manifest.peerDependencies &&
      Object.keys(props.plugin.manifest.peerDependencies).length > 0)
  )
})

// Methods
const enablePlugin = async () => {
  if (!props.plugin) return

  try {
    loading.value = true
    await pluginStore.enablePlugin(props.plugin.manifest.name)
    notificationStore.showSuccess(`Plugin "${props.plugin.manifest.displayName}" enabled successfully`)
  } catch (error) {
    notificationStore.showError(`Failed to enable plugin "${props.plugin.manifest.displayName}"`)
  } finally {
    loading.value = false
  }
}

const disablePlugin = async () => {
  if (!props.plugin) return

  try {
    loading.value = true
    await pluginStore.disablePlugin(props.plugin.manifest.name)
    notificationStore.showSuccess(`Plugin "${props.plugin.manifest.displayName}" disabled successfully`)
  } catch (error) {
    notificationStore.showError(`Failed to disable plugin "${props.plugin.manifest.displayName}"`)
  } finally {
    loading.value = false
  }
}

const configurePlugin = () => {
  if (props.plugin) {
    emit("configure-plugin", props.plugin)
  }
}

const performHealthCheck = async () => {
  if (!props.plugin) return

  try {
    healthCheckLoading.value = true
    const health = await pluginStore.healthCheck(props.plugin.manifest.name)

    const message = health.message || `Plugin is ${health.status}`
    if (health.status === "healthy") {
      notificationStore.showSuccess(message)
    } else {
      notificationStore.showError(message)
    }
  } catch (error) {
    notificationStore.showError(`Failed to perform health check for "${props.plugin.manifest.displayName}"`)
  } finally {
    healthCheckLoading.value = false
  }
}

const openLink = (url: string) => {
  window.open(url, "_blank")
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

const formatJSON = (obj: any) => {
  return JSON.stringify(obj, null, 2)
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
</script>

<style scoped>
pre {
  font-family: "Courier New", monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}

:deep(.p-tag) {
  font-size: 0.75rem;
}
</style>
