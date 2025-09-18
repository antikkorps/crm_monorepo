<template>
  <v-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    max-width="1200px"
    persistent
    scrollable
  >
    <v-card class="template-preview-dialog">
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Template Preview</span>
        <div class="preview-actions">
          <v-btn
            icon="mdi-refresh"
            variant="text"
            size="small"
            @click="refreshPreview"
          >
            <v-icon>mdi-refresh</v-icon>
            <v-tooltip activator="parent" location="top">Refresh Preview</v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-open-in-new"
            variant="text"
            size="small"
            @click="openInNewTab"
          >
            <v-icon>mdi-open-in-new</v-icon>
            <v-tooltip activator="parent" location="top">Open in New Tab</v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="$emit('update:visible', false)"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text class="preview-content pa-0">

        <!-- Preview Frame -->
        <div v-if="template" class="preview-frame-container">
          <div class="preview-toolbar">
            <div class="preview-info">
              <span class="template-name">{{ template?.name }}</span>
              <v-chip :color="templateTypeColor" size="small" variant="elevated">
                {{ templateTypeLabel }}
              </v-chip>
            </div>
            <div class="preview-controls">
              <v-btn
                :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
                variant="text"
                size="small"
                @click="toggleFullscreen"
              >
                <v-icon>{{ isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
                <v-tooltip activator="parent" location="top">
                  {{ isFullscreen ? 'Exit Fullscreen' : 'Fullscreen' }}
                </v-tooltip>
              </v-btn>
            </div>
          </div>

          <div class="preview-frame" :class="{ fullscreen: isFullscreen }">
            <TemplatePreviewRenderer :template-data="templateAsCreateRequest" />
          </div>
        </div>

        <!-- No Template State -->
        <div v-else class="no-template-state">
          <v-icon size="64" class="mb-4 empty-icon">mdi-file-document-outline</v-icon>
          <h4>No Template Selected</h4>
          <p>Select a template to preview its appearance.</p>
        </div>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn
          variant="text"
          @click="$emit('update:visible', false)"
        >
          Close
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="editTemplate"
          :disabled="!template"
        >
          Edit Template
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="5000">
      {{ snackbar.message }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import type { DocumentTemplate } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { templatesApi } from "../../services/api"
import TemplatePreviewRenderer from "./TemplatePreviewRenderer.vue"

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
const isFullscreen = ref(false)

// Snackbar state
const snackbar = ref<{ visible: boolean; color: string; message: string }>({
  visible: false,
  color: "info",
  message: "",
})

const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, color, message }
}

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

const templateTypeColor = computed(() => {
  if (!props.template) return "grey"

  switch (props.template.type) {
    case "quote":
      return "info"
    case "invoice":
      return "warning"
    case "both":
      return "success"
    default:
      return "grey"
  }
})

// Convert DocumentTemplate to DocumentTemplateCreateRequest for the renderer
const templateAsCreateRequest = computed(() => {
  if (!props.template) return null

  return {
    name: props.template.name,
    type: props.template.type,
    companyName: props.template.companyName,
    companyAddress: props.template.companyAddress,
    companyEmail: props.template.companyEmail || "",
    companyPhone: props.template.companyPhone || "",
    companyWebsite: props.template.companyWebsite || "",
    taxNumber: props.template.taxNumber || "",
    vatNumber: props.template.vatNumber || "",
    siretNumber: props.template.siretNumber || "",
    registrationNumber: props.template.registrationNumber || "",
    logoUrl: props.template.logoUrl || "",
    logoPosition: props.template.logoPosition,
    logoSize: props.template.logoSize || "medium",
    primaryColor: props.template.primaryColor || "#3f51b5",
    secondaryColor: props.template.secondaryColor || "#2196f3",
    headerHeight: props.template.headerHeight,
    footerHeight: props.template.footerHeight,
    marginTop: props.template.marginTop,
    marginBottom: props.template.marginBottom,
    marginLeft: props.template.marginLeft,
    marginRight: props.template.marginRight,
    customHeader: props.template.customHeader || "",
    customFooter: props.template.customFooter || "",
    termsAndConditions: props.template.termsAndConditions || "",
    paymentInstructions: props.template.paymentInstructions || "",
    htmlTemplate: props.template.htmlTemplate || "",
    styles: props.template.styles || ""
  }
})

// Watch for visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      // Reset state when dialog closes
      isFullscreen.value = false
    }
  }
)

// Open in new tab
const openInNewTab = () => {
  if (!templateAsCreateRequest.value) return

  showSnackbar("Opening in new tab is not available in component mode", "info")
}

// Refresh preview (no-op since we use reactive component)
const refreshPreview = () => {
  showSnackbar("Preview refreshed", "success")
}

// Toggle fullscreen
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value
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
  height: 80vh;
}

.preview-actions {
  display: flex;
  gap: 0.25rem;
}

.preview-content {
  height: 60vh;
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
  color: rgb(var(--v-theme-on-surface-variant));
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
  color: rgb(var(--v-theme-on-surface));
}

.error-content p {
  margin: 0 0 1rem 0;
  color: rgb(var(--v-theme-on-surface-variant));
}

.preview-frame-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 8px;
  overflow: hidden;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgb(var(--v-theme-surface-variant));
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.template-name {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
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
  color: rgb(var(--v-theme-on-surface-variant));
  padding: 3rem;
}

.empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
}

.no-template-state h4 {
  margin: 0 0 0.5rem 0;
  color: rgb(var(--v-theme-on-surface));
}

.no-template-state p {
  margin: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .template-preview-dialog {
    height: 90vh;
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
}
</style>
