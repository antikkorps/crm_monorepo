<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="plugin ? `Configure ${plugin.manifest.displayName}` : 'Plugin Configuration'"
    modal
    :style="{ width: '700px' }"
  >
    <div v-if="plugin" class="flex flex-column gap-4">
      <!-- Plugin Info -->
      <div class="flex align-items-center gap-3 pb-3 border-bottom-1 surface-border">
        <div class="bg-primary-100 p-2 border-round">
          <i
            :class="getCategoryIcon(plugin.manifest.category)"
            class="text-primary text-lg"
          ></i>
        </div>
        <div>
          <div class="font-medium text-900">{{ plugin.manifest.displayName }}</div>
          <div class="text-600 text-sm">
            {{ plugin.manifest.name }} v{{ plugin.manifest.version }}
          </div>
        </div>
      </div>

      <!-- Configuration Form -->
      <div v-if="configSchema">
        <h4 class="text-lg font-medium text-900 mb-3">Configuration</h4>

        <form @submit.prevent="saveConfiguration" class="flex flex-column gap-3">
          <div
            v-for="(property, key) in configSchema.properties"
            :key="key"
            class="field"
          >
            <label :for="key" class="block text-900 font-medium mb-2">
              {{ getFieldLabel(key, property) }}
              <span v-if="isRequired(key)" class="text-red-500 ml-1">*</span>
            </label>

            <!-- String Input -->
            <InputText
              v-if="property.type === 'string' && !property.enum"
              :id="key"
              v-model="configData[key]"
              :placeholder="property.description"
              class="w-full"
              :class="{ 'p-invalid': errors[key] }"
            />

            <!-- Number Input -->
            <InputNumber
              v-else-if="property.type === 'number'"
              :id="key"
              v-model="configData[key]"
              :placeholder="property.description"
              :min="property.minimum"
              :max="property.maximum"
              class="w-full"
              :class="{ 'p-invalid': errors[key] }"
            />

            <!-- Boolean Input -->
            <div v-else-if="property.type === 'boolean'" class="flex align-items-center">
              <Checkbox
                :id="key"
                v-model="configData[key]"
                :binary="true"
                :class="{ 'p-invalid': errors[key] }"
              />
              <label :for="key" class="ml-2 text-600">
                {{ property.description }}
              </label>
            </div>

            <!-- Enum/Select Input -->
            <Dropdown
              v-else-if="property.enum"
              :id="key"
              v-model="configData[key]"
              :options="property.enum"
              :placeholder="property.description"
              class="w-full"
              :class="{ 'p-invalid': errors[key] }"
            />

            <!-- Array Input -->
            <div v-else-if="property.type === 'array'" class="flex flex-column gap-2">
              <div
                v-for="(item, index) in configData[key] || []"
                :key="index"
                class="flex gap-2"
              >
                <InputText
                  v-model="configData[key][index]"
                  :placeholder="`${property.description} ${index + 1}`"
                  class="flex-1"
                />
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  outlined
                  size="small"
                  @click="removeArrayItem(key, index)"
                />
              </div>
              <Button
                icon="pi pi-plus"
                label="Add Item"
                outlined
                size="small"
                @click="addArrayItem(key)"
              />
            </div>

            <!-- Object Input (JSON) -->
            <Textarea
              v-else-if="property.type === 'object'"
              :id="key"
              v-model="objectInputs[key]"
              :placeholder="property.description"
              rows="4"
              class="w-full"
              :class="{ 'p-invalid': errors[key] }"
            />

            <!-- Default Text Input -->
            <InputText
              v-else
              :id="key"
              v-model="configData[key]"
              :placeholder="property.description"
              class="w-full"
              :class="{ 'p-invalid': errors[key] }"
            />

            <!-- Field Description -->
            <small v-if="property.description" class="text-600">
              {{ property.description }}
            </small>

            <!-- Field Error -->
            <small v-if="errors[key]" class="text-red-500">
              {{ errors[key] }}
            </small>
          </div>
        </form>
      </div>

      <!-- Raw JSON Editor -->
      <div v-else>
        <div class="flex justify-content-between align-items-center mb-3">
          <h4 class="text-lg font-medium text-900 m-0">Raw Configuration</h4>
          <Button
            icon="pi pi-refresh"
            label="Reset"
            outlined
            size="small"
            @click="resetConfiguration"
          />
        </div>

        <Textarea
          v-model="rawConfigData"
          rows="10"
          class="w-full font-mono"
          :class="{ 'p-invalid': jsonError }"
          placeholder="Enter JSON configuration..."
        />

        <small v-if="jsonError" class="text-red-500 block mt-2">
          {{ jsonError }}
        </small>
        <small v-else class="text-600 block mt-2">
          Enter valid JSON configuration for this plugin
        </small>
      </div>

      <!-- Current Configuration Preview -->
      <div v-if="hasCurrentConfig">
        <div class="flex justify-content-between align-items-center mb-2">
          <h5 class="font-medium text-900 m-0">Current Configuration</h5>
          <Button
            icon="pi pi-copy"
            label="Copy"
            outlined
            size="small"
            @click="copyCurrentConfig"
          />
        </div>
        <div class="surface-100 p-3 border-round">
          <pre class="text-sm m-0 overflow-auto" style="max-height: 150px">{{
            formatJSON(plugin.config)
          }}</pre>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-between w-full">
        <Button
          v-if="configSchema"
          icon="pi pi-refresh"
          label="Reset to Defaults"
          outlined
          @click="resetToDefaults"
        />
        <div class="flex gap-2">
          <Button
            label="Cancel"
            icon="pi pi-times"
            outlined
            @click="$emit('update:visible', false)"
          />
          <Button
            label="Save Configuration"
            icon="pi pi-save"
            @click="saveConfiguration"
            :loading="loading"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast"
import { computed, nextTick, ref, watch } from "vue"
import { PluginCategory, PluginInstance, PluginService } from "../../services/api/plugins"
import { usePluginStore } from "../../stores/plugins"

// Props & Emits
interface Props {
  visible: boolean
  plugin: PluginInstance | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
  "configuration-saved": []
}>()

// Composables
const pluginStore = usePluginStore()
const toast = useToast()

// State
const loading = ref(false)
const configData = ref<Record<string, any>>({})
const objectInputs = ref<Record<string, string>>({})
const rawConfigData = ref("")
const errors = ref<Record<string, string>>({})
const jsonError = ref("")

// Computed
const configSchema = computed(() => {
  return props.plugin?.manifest.configSchema
})

const hasCurrentConfig = computed(() => {
  return props.plugin?.config && Object.keys(props.plugin.config).length > 0
})

// Methods
const initializeConfiguration = () => {
  if (!props.plugin) return

  // Initialize with current config or defaults
  const currentConfig = props.plugin.config || {}
  const defaultConfig = props.plugin.manifest.defaultConfig || {}

  configData.value = { ...defaultConfig, ...currentConfig }

  // Initialize object inputs for JSON editing
  if (configSchema.value?.properties) {
    Object.entries(configSchema.value.properties).forEach(
      ([key, property]: [string, any]) => {
        if (property.type === "object" && configData.value[key]) {
          objectInputs.value[key] = JSON.stringify(configData.value[key], null, 2)
        }
      }
    )
  }

  // Initialize raw JSON data
  rawConfigData.value = JSON.stringify(configData.value, null, 2)

  // Clear errors
  errors.value = {}
  jsonError.value = ""
}

const validateConfiguration = () => {
  errors.value = {}

  if (!configSchema.value) {
    // Validate raw JSON
    try {
      JSON.parse(rawConfigData.value)
      jsonError.value = ""
      return true
    } catch (error) {
      jsonError.value = "Invalid JSON format"
      return false
    }
  }

  const { properties, required = [] } = configSchema.value
  let isValid = true

  // Validate required fields
  required.forEach((field: string) => {
    if (
      !configData.value[field] &&
      configData.value[field] !== 0 &&
      configData.value[field] !== false
    ) {
      errors.value[field] = "This field is required"
      isValid = false
    }
  })

  // Validate field types and constraints
  Object.entries(properties).forEach(([key, property]: [string, any]) => {
    const value = configData.value[key]

    if (value !== undefined && value !== null && value !== "") {
      // Type validation
      if (property.type === "number" && isNaN(Number(value))) {
        errors.value[key] = "Must be a valid number"
        isValid = false
      }

      // Range validation for numbers
      if (property.type === "number" && !isNaN(Number(value))) {
        if (property.minimum !== undefined && Number(value) < property.minimum) {
          errors.value[key] = `Must be at least ${property.minimum}`
          isValid = false
        }
        if (property.maximum !== undefined && Number(value) > property.maximum) {
          errors.value[key] = `Must be at most ${property.maximum}`
          isValid = false
        }
      }

      // Enum validation
      if (property.enum && !property.enum.includes(value)) {
        errors.value[key] = `Must be one of: ${property.enum.join(", ")}`
        isValid = false
      }

      // Object validation (JSON)
      if (property.type === "object" && objectInputs.value[key]) {
        try {
          const parsed = JSON.parse(objectInputs.value[key])
          configData.value[key] = parsed
        } catch (error) {
          errors.value[key] = "Invalid JSON format"
          isValid = false
        }
      }
    }
  })

  return isValid
}

const saveConfiguration = async () => {
  if (!props.plugin) return

  if (!validateConfiguration()) {
    toast.add({
      severity: "error",
      summary: "Validation Error",
      detail: "Please fix the configuration errors before saving",
      life: 5000,
    })
    return
  }

  try {
    loading.value = true

    let configToSave = configData.value

    if (!configSchema.value) {
      // Use raw JSON data
      configToSave = JSON.parse(rawConfigData.value)
    }

    await pluginStore.configurePlugin(props.plugin.manifest.name, configToSave)

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Plugin configuration saved successfully",
      life: 3000,
    })

    emit("configuration-saved")
    emit("update:visible", false)
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Save Failed",
      detail: error instanceof Error ? error.message : "Failed to save configuration",
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

const resetConfiguration = () => {
  initializeConfiguration()
  toast.add({
    severity: "info",
    summary: "Reset",
    detail: "Configuration reset to current values",
    life: 3000,
  })
}

const resetToDefaults = () => {
  if (!props.plugin) return

  const defaultConfig = props.plugin.manifest.defaultConfig || {}
  configData.value = { ...defaultConfig }

  // Reset object inputs
  if (configSchema.value?.properties) {
    Object.entries(configSchema.value.properties).forEach(
      ([key, property]: [string, any]) => {
        if (property.type === "object" && configData.value[key]) {
          objectInputs.value[key] = JSON.stringify(configData.value[key], null, 2)
        }
      }
    )
  }

  rawConfigData.value = JSON.stringify(configData.value, null, 2)
  errors.value = {}

  toast.add({
    severity: "info",
    summary: "Reset",
    detail: "Configuration reset to default values",
    life: 3000,
  })
}

const copyCurrentConfig = async () => {
  if (!props.plugin) return

  try {
    await navigator.clipboard.writeText(JSON.stringify(props.plugin.config, null, 2))
    toast.add({
      severity: "success",
      summary: "Copied",
      detail: "Current configuration copied to clipboard",
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Copy Failed",
      detail: "Failed to copy configuration to clipboard",
      life: 3000,
    })
  }
}

const addArrayItem = (key: string) => {
  if (!configData.value[key]) {
    configData.value[key] = []
  }
  configData.value[key].push("")
}

const removeArrayItem = (key: string, index: number) => {
  if (configData.value[key]) {
    configData.value[key].splice(index, 1)
  }
}

const getFieldLabel = (key: string, property: any) => {
  return (
    property.title ||
    key.replace(/([A-Z])/g, " $1").replace(/^./, (str: string) => str.toUpperCase())
  )
}

const isRequired = (key: string) => {
  return configSchema.value?.required?.includes(key) || false
}

const formatJSON = (obj: any) => {
  return JSON.stringify(obj, null, 2)
}

const getCategoryIcon = (category: PluginCategory) => {
  return PluginService.getCategoryIcon(category)
}

// Watchers
watch(
  () => props.visible,
  (newVisible) => {
    if (newVisible) {
      nextTick(() => {
        initializeConfiguration()
      })
    }
  }
)

watch(
  () => props.plugin,
  () => {
    if (props.visible) {
      initializeConfiguration()
    }
  }
)
</script>

<style scoped>
.field {
  margin-bottom: 1rem;
}

pre {
  font-family: "Courier New", monospace;
  white-space: pre-wrap;
  word-wrap: break-word;
}

:deep(.p-inputnumber input) {
  width: 100%;
}
</style>
