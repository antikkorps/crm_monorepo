<template>
  <Dialog
    :visible="visible"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="template-preview-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <div class="preview-header">
        <h3>Template Preview</h3>
        <div class="preview-actions">
          <Button
            icon="pi pi-refresh"
            text
            rounded
            @click="refreshPreview"
            v-tooltip.top="'Refresh Preview'"
            :loading="loading"
          />
          <Button
            icon="pi pi-external-link"
            text
            rounded
            @click="openInNewTab"
            v-tooltip.top="'Open in New Tab'"
            :disabled="!previewHtml"
          />
        </div>
      </div>
    </template>

    <div class="preview-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <ProgressSpinner />
        <p>Generating preview...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <Message severity="error" :closable="false">
          <div class="error-content">
            <h4>Preview Error</h4>
            <p>{{ error }}</p>
            <Button
              label="Retry"
              icon="pi pi-refresh"
              @click="loadPreview"
              class="retry-button"
            />
          </div>
        </Message>
      </div>

      <!-- Preview Frame -->
      <div v-else-if="previewHtml" class="preview-frame-container">
        <div class="preview-toolbar">
          <div class="preview-info">
            <span class="template-name">{{ template?.name }}</span>
            <Badge :value="templateTypeLabel" :severity="templateTypeSeverity" />
          </div>
          <div class="preview-controls">
            <Button
              :icon="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"
              text
              rounded
              @click="toggleFullscreen"
              v-tooltip.top="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'"
            />
          </div>
        </div>

        <div class="preview-frame" :class="{ fullscreen: isFullscreen }">
          <iframe
            ref="previewFrame"
            :srcdoc="previewHtml"
            class="preview-iframe"
            sandbox="allow-same-origin"
            @load="handleFrameLoad"
          ></iframe>
        </div>
      </div>

      <!-- No Template State -->
      <div v-else class="no-template-state">
        <i class="pi pi-file-o empty-icon"></i>
        <h4>No Template Selected</h4>
        <p>Select a template to preview its appearance.</p>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Close"
          severity="secondary"
          @click="$emit('update:visible', false)"
        />
        <Button
          label="Edit Template"
          severity="primary"
          @click="editTemplate"
          :disabled="!template"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { DocumentTemplate } from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { computed, ref, watch } from "vue"
import { templatesApi } from "../../services/api"

interface Props {
  visible: boolean
  template?: DocumentTemplate | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  "update:visible": [visible: boolean]
  "edit-template": [template: DocumentTemplate]
}>()

// Reactive state
const loading = ref(false)
const error = ref("")
const previewHtml = ref("")
const isFullscreen = ref(false)
const previewFrame = ref<HTMLIFrameElement>()

// Toast for notifications
const toast = useToast()

// Computed properties
const templateTypeLabel = computed(() => {
  if (!props.template) return ""

  switch (props.template.type) {
    case "quote":
      return "Quote"
    case "invoice":
      return "Invoice"
    case "both":
      return "Quote & Invoice"
    default:
      return "Unknown"
  }
})

const templateTypeSeverity = computed(() => {
  if (!props.template) return "secondary"

  switch (props.template.type) {
    case "quote":
      return "info"
    case "invoice":
      return "warning"
    case "both":
      return "success"
    default:
      return "secondary"
  }
})

// Watch for template changes
watch(
  () => props.template,
  (newTemplate) => {
    if (newTemplate && props.visible) {
      loadPreview()
    }
  },
  { immediate: true }
)

// Watch for visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.template) {
      loadPreview()
    } else if (!visible) {
      // Reset state when dialog closes
      isFullscreen.value = false
      error.value = ""
    }
  }
)

// Load preview
const loadPreview = async () => {
  if (!props.template) return

  try {
    loading.value = true
    error.value = ""

    const response = await templatesApi.preview(props.template.id)

    if (typeof response === "string") {
      previewHtml.value = response
    } else if (response.success) {
      previewHtml.value = response.data
    } else {
      throw new Error(response.error || "Failed to generate preview")
    }
  } catch (err) {
    console.error("Failed to load preview:", err)
    error.value = err instanceof Error ? err.message : "Failed to load preview"

    toast.add({
      severity: "error",
      summary: "Preview Error",
      detail: error.value,
      life: 5000,
    })
  } finally {
    loading.value = false
  }
}

// Refresh preview
const refreshPreview = () => {
  loadPreview()
}

// Open in new tab
const openInNewTab = () => {
  if (!previewHtml.value) return

  const newWindow = window.open("", "_blank")
  if (newWindow) {
    newWindow.document.write(previewHtml.value)
    newWindow.document.close()
  }
}

// Toggle fullscreen
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
}

// Handle frame load
const handleFrameLoad = () => {
  // Frame loaded successfully
  console.log("Preview frame loaded")
}

// Edit template
const editTemplate = () => {
  if (props.template) {
    emit("edit-template", props.template)
    emit("update:visible", false)
  }
}

// Handle escape key for fullscreen
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && isFullscreen.value) {
    isFullscreen.value = false
  }
}

// Add event listener for escape key
if (typeof window !== "undefined") {
  window.addEventListener("keydown", handleKeydown)
}
</script>

<style scoped>
.template-preview-dialog {
  width: 90vw;
  max-width: 1200px;
  height: 90vh;
  max-height: 90vh;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.preview-header h3 {
  margin: 0;
  color: var(--text-color);
}

.preview-actions {
  display: flex;
  gap: 0.25rem;
}

.preview-content {
  height: 70vh;
  display: flex;
  flex-direction: column;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
}

.loading-state p {
  margin: 0;
  color: var(--text-color-secondary);
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.error-content {
  text-align: center;
}

.error-content h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.error-content p {
  margin: 0 0 1rem 0;
  color: var(--text-color-secondary);
}

.retry-button {
  margin-top: 0.5rem;
}

.preview-frame-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--surface-100);
  border-bottom: 1px solid var(--surface-border);
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.template-name {
  font-weight: 600;
  color: var(--text-color);
}

.preview-controls {
  display: flex;
  gap: 0.25rem;
}

.preview-frame {
  flex: 1;
  position: relative;
  background: white;
}

.preview-frame.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  border-radius: 0;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
}

.no-template-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--text-color-secondary);
}

.no-template-state h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.no-template-state p {
  margin: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 0 0 0;
  border-top: 1px solid var(--surface-border);
}

/* Responsive design */
@media (max-width: 768px) {
  .template-preview-dialog {
    width: 95vw;
    height: 95vh;
  }

  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .preview-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .preview-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-footer .p-button {
    width: 100%;
  }
}
</style>
