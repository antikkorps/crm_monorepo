<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Discover Plugins"
    modal
    :style="{ width: '700px' }"
  >
    <div class="flex flex-column gap-4">
      <!-- Directory Input -->
      <div>
        <label for="directory" class="block text-900 font-medium mb-2"
          >Plugin Directory</label
        >
        <div class="p-inputgroup">
          <InputText
            id="directory"
            v-model="searchDirectory"
            placeholder="Enter directory path to search for plugins..."
            class="flex-1"
          />
          <Button
            icon="pi pi-search"
            label="Search"
            @click="discoverPlugins"
            :loading="loading"
          />
        </div>
        <small class="text-600">
          Leave empty to search in the default plugin directory
        </small>
      </div>

      <!-- Results -->
      <div v-if="discoveredPlugins.length > 0">
        <div class="flex justify-content-between align-items-center mb-3">
          <h4 class="text-lg font-medium text-900 m-0">
            Discovered Plugins ({{ discoveredPlugins.length }})
          </h4>
          <Button
            icon="pi pi-refresh"
            label="Refresh"
            outlined
            size="small"
            @click="discoverPlugins"
            :loading="loading"
          />
        </div>

        <div class="border-1 surface-border border-round">
          <div
            v-for="(plugin, index) in discoveredPlugins"
            :key="plugin"
            class="flex justify-content-between align-items-center p-3"
            :class="{
              'border-bottom-1 surface-border': index < discoveredPlugins.length - 1,
            }"
          >
            <div class="flex align-items-center gap-3">
              <div class="bg-primary-100 p-2 border-round">
                <i class="pi pi-box text-primary"></i>
              </div>
              <div>
                <div class="font-medium text-900">{{ getPluginName(plugin) }}</div>
                <div class="text-600 text-sm">{{ plugin }}</div>
              </div>
            </div>
            <div class="flex gap-2">
              <Button
                icon="pi pi-eye"
                label="Preview"
                outlined
                size="small"
                @click="previewPlugin(plugin)"
              />
              <Button
                icon="pi pi-download"
                label="Select"
                size="small"
                @click="selectPlugin(plugin)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- No Results -->
      <div v-else-if="hasSearched && !loading" class="text-center py-4">
        <i class="pi pi-search text-4xl text-400 mb-3"></i>
        <div class="text-900 font-medium mb-2">No plugins found</div>
        <div class="text-600">No valid plugins were found in the specified directory</div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-4">
        <ProgressSpinner style="width: 50px; height: 50px" />
        <div class="text-600 mt-3">Searching for plugins...</div>
      </div>

      <!-- Initial State -->
      <div v-if="!hasSearched && !loading" class="text-center py-4">
        <i class="pi pi-folder-open text-4xl text-400 mb-3"></i>
        <div class="text-900 font-medium mb-2">Discover Plugins</div>
        <div class="text-600">Enter a directory path to search for available plugins</div>
      </div>
    </div>

    <!-- Plugin Preview Dialog -->
    <Dialog
      v-model:visible="showPreviewDialog"
      header="Plugin Preview"
      modal
      :style="{ width: '600px' }"
    >
      <div v-if="previewData" class="flex flex-column gap-3">
        <div class="flex align-items-center gap-3 mb-3">
          <div class="bg-primary-100 p-3 border-round">
            <i
              :class="getCategoryIcon(previewData.category)"
              class="text-primary text-xl"
            ></i>
          </div>
          <div>
            <div class="text-xl font-semibold text-900">
              {{ previewData.displayName }}
            </div>
            <div class="text-600">{{ previewData.name }} v{{ previewData.version }}</div>
          </div>
        </div>

        <div class="grid">
          <div class="col-6">
            <div class="text-600 text-sm mb-1">Author</div>
            <div class="text-900">{{ previewData.author }}</div>
          </div>
          <div class="col-6">
            <div class="text-600 text-sm mb-1">Category</div>
            <Tag
              :value="getCategoryDisplayName(previewData.category)"
              :icon="getCategoryIcon(previewData.category)"
            />
          </div>
          <div class="col-12">
            <div class="text-600 text-sm mb-1">Description</div>
            <div class="text-900">{{ previewData.description }}</div>
          </div>
          <div class="col-6" v-if="previewData.homepage">
            <div class="text-600 text-sm mb-1">Homepage</div>
            <a :href="previewData.homepage" target="_blank" class="text-primary">
              {{ previewData.homepage }}
            </a>
          </div>
          <div class="col-6" v-if="previewData.license">
            <div class="text-600 text-sm mb-1">License</div>
            <div class="text-900">{{ previewData.license }}</div>
          </div>
        </div>

        <div v-if="previewData.hooks && previewData.hooks.length > 0">
          <div class="text-600 text-sm mb-2">Hooks</div>
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="hook in previewData.hooks"
              :key="hook"
              :value="hook"
              severity="info"
              class="text-xs"
            />
          </div>
        </div>

        <div v-if="previewData.keywords && previewData.keywords.length > 0">
          <div class="text-600 text-sm mb-2">Keywords</div>
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="keyword in previewData.keywords"
              :key="keyword"
              :value="keyword"
              class="text-xs"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          outlined
          @click="showPreviewDialog = false"
        />
        <Button
          label="Install This Plugin"
          icon="pi pi-download"
          @click="selectPreviewedPlugin"
        />
      </template>
    </Dialog>

    <template #footer>
      <Button
        label="Cancel"
        icon="pi pi-times"
        outlined
        @click="$emit('update:visible', false)"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast"
import { ref, watch } from "vue"
import { PluginCategory, PluginService } from "../../services/api/plugins"
import { usePluginStore } from "../../stores/plugins"

// Props & Emits
interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
  "plugin-selected": [pluginPath: string]
}>()

// Composables
const pluginStore = usePluginStore()
const toast = useToast()

// State
const searchDirectory = ref("")
const discoveredPlugins = ref<string[]>([])
const loading = ref(false)
const hasSearched = ref(false)
const showPreviewDialog = ref(false)
const previewData = ref<any>(null)
const previewPluginPath = ref("")

// Methods
const discoverPlugins = async () => {
  try {
    loading.value = true
    const response = await pluginStore.discoverPlugins(
      searchDirectory.value.trim() || undefined
    )
    discoveredPlugins.value = response.plugins
    hasSearched.value = true

    if (response.plugins.length === 0) {
      toast.add({
        severity: "info",
        summary: "No Plugins Found",
        detail: "No valid plugins were found in the specified directory",
        life: 3000,
      })
    }
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Discovery Failed",
      detail: error instanceof Error ? error.message : "Failed to discover plugins",
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

const previewPlugin = async (pluginPath: string) => {
  try {
    // Load plugin manifest for preview
    const manifestPath = `${pluginPath}/package.json`

    // In a real implementation, you would fetch the manifest file
    // For now, we'll simulate loading the manifest
    previewData.value = {
      name: getPluginName(pluginPath),
      displayName: getPluginName(pluginPath)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      version: "1.0.0",
      description: "Plugin description would be loaded from package.json",
      author: "Plugin Author",
      category: PluginCategory.UTILITY,
      license: "MIT",
      hooks: ["user:created", "invoice:paid"],
      keywords: ["plugin", "utility"],
    }

    previewPluginPath.value = pluginPath
    showPreviewDialog.value = true
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Preview Failed",
      detail: "Failed to load plugin preview",
      life: 5000,
    })
  }
}

const selectPlugin = (pluginPath: string) => {
  emit("plugin-selected", pluginPath)
}

const selectPreviewedPlugin = () => {
  showPreviewDialog.value = false
  selectPlugin(previewPluginPath.value)
}

const getPluginName = (pluginPath: string) => {
  return pluginPath.split("/").pop() || pluginPath
}

const getCategoryDisplayName = (category: PluginCategory) => {
  return PluginService.getCategoryDisplayName(category)
}

const getCategoryIcon = (category: PluginCategory) => {
  return PluginService.getCategoryIcon(category)
}

// Watchers
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      // Reset state when dialog opens
      searchDirectory.value = ""
      discoveredPlugins.value = []
      hasSearched.value = false
      previewData.value = null
      showPreviewDialog.value = false
    }
  }
)
</script>

<style scoped>
:deep(.p-inputgroup .p-button) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

:deep(.p-tag) {
  font-size: 0.75rem;
}
</style>
