<template>
  <div class="template-manager">
    <div class="template-header">
      <div class="header-content">
        <h2>{{ t('templates.title') }}</h2>
        <p class="header-description">
          {{ t('templates.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Tabs for switching between template types -->
    <v-tabs v-model="activeTab" class="mb-4" color="primary" grow>
      <v-tab value="documents">
        <v-icon start size="small">mdi-file-document-outline</v-icon>
        <span class="d-none d-sm-inline">{{ t('templates.tabs.documents') }}</span>
        <span class="d-sm-none">{{ t('templates.tabs.documentsShort') }}</span>
      </v-tab>
      <v-tab value="cgv">
        <v-icon start size="small">mdi-scale-balance</v-icon>
        <span class="d-none d-sm-inline">{{ t('templates.tabs.cgv') }}</span>
        <span class="d-sm-none">{{ t('templates.tabs.cgvShort') }}</span>
      </v-tab>
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- Document Templates Tab -->
      <v-window-item value="documents">
        <div class="header-actions mb-4 d-none d-md-flex">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            variant="elevated"
            @click="showCreateDialog = true"
          >
            {{ t('templates.createTemplate') }}
          </v-btn>
        </div>

        <!-- Mobile FAB for documents -->
        <v-btn
          v-if="$vuetify.display.smAndDown && activeTab === 'documents'"
          color="primary"
          icon="mdi-plus"
          size="large"
          class="fab-add"
          position="fixed"
          @click="showCreateDialog = true"
        />

        <div class="template-filters">
      <v-card variant="outlined">
        <v-card-text class="pa-4">
          <v-row dense>
            <v-col cols="12" sm="6" md="3">
              <v-select
                v-model="filters.type"
                :items="templateTypeOptions"
                item-title="label"
                item-value="value"
                :label="t('templates.form.templateType')"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                @update:model-value="loadTemplates"
              />
            </v-col>
            <v-col cols="12" sm="6" md="9">
              <v-text-field
                v-model="filters.search"
                :label="t('templates.searchTemplates')"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                clearable
                hide-details
                @input="debouncedSearch"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>

    <div class="template-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">{{ t('templates.loadingTemplates') }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="templates.length === 0" class="empty-state">
        <v-icon size="64" class="mb-4 empty-icon">mdi-file-document-outline</v-icon>
        <h3>{{ t('templates.noTemplatesFound') }}</h3>
        <p>{{ t('templates.createFirstTemplate') }}</p>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          variant="elevated"
          @click="showCreateDialog = true"
          class="mt-4"
        >
          {{ t('templates.createTemplate') }}
        </v-btn>
      </div>

      <!-- Templates Grid -->
      <div v-else class="templates-grid">
        <TemplateCard
          v-for="template in templates"
          :key="template.id"
          :template="template"
          @edit="editTemplate"
          @delete="confirmDelete"
          @duplicate="duplicateTemplate"
          @set-default="setDefaultTemplate"
          @preview="previewTemplate"
        />
      </div>
    </div>
      </v-window-item>

      <!-- CGV Templates Tab - lazy loaded -->
      <v-window-item value="cgv">
        <CgvTemplateManager v-if="activeTab === 'cgv'" />
      </v-window-item>
    </v-window>

    <!-- Create/Edit Template Dialog -->
    <TemplateForm
      v-model:visible="showCreateDialog"
      :template="selectedTemplate"
      @saved="handleTemplateSaved"
    />

    <!-- Template Preview Dialog -->
    <TemplatePreview
      v-model:visible="showPreviewDialog"
      :template="previewingTemplate"
      @edit-template="editTemplateFromPreview"
    />

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-3">mdi-alert-circle</v-icon>
          {{ t('templates.delete.confirmDelete') }}
        </v-card-title>

        <v-card-text>
          <div class="delete-content">
            <h4 class="mb-3">{{ t('templates.delete.deleteTemplate') }}</h4>
            <p class="mb-3">
              {{ t('templates.delete.confirmDeleteMessage', { templateName: templateToDelete?.name }) }}
            </p>
            <v-alert
              v-if="templateToDelete?.isDefault"
              type="warning"
              variant="tonal"
              class="mb-0"
            >
              <strong>{{ t('common.warning') }}:</strong> {{ t('templates.delete.warningDefaultTemplate') }}
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false"> {{ t('common.cancel') }} </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            :loading="deleting"
            @click="deleteTemplate"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import type { DocumentTemplate, TemplateType } from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { templatesApi } from "../../services/api"
import CgvTemplateManager from "./CgvTemplateManager.vue"
import TemplateCard from "./TemplateCard.vue"
import TemplateForm from "./TemplateForm.vue"
import TemplatePreview from "./TemplatePreview.vue"

const { t } = useI18n()

// Tab state
const activeTab = ref("documents")

// Reactive state
const templates = ref<DocumentTemplate[]>([])
const loading = ref(false)
const deleting = ref(false)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showPreviewDialog = ref(false)
const selectedTemplate = ref<DocumentTemplate | null>(null)
const templateToDelete = ref<DocumentTemplate | null>(null)
const previewingTemplate = ref<DocumentTemplate | null>(null)

// Snackbar state
const snackbar = ref<{ visible: boolean; color: string; message: string }>({
  visible: false,
  color: "info",
  message: "",
})

const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, color, message }
}

// Filters
const filters = ref({
  type: null as TemplateType | null,
  search: "",
})

// Template type options for dropdown
const templateTypeOptions = computed(() => [
  { label: t("templates.types.quoteTemplates"), value: "quote" },
  { label: t("templates.types.invoiceTemplates"), value: "invoice" },
  { label: t("templates.types.bothTypes"), value: "both" },
])

// Debounced search
let searchTimeout: NodeJS.Timeout
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadTemplates()
  }, 300)
}

// Load templates from API
const loadTemplates = async () => {
  try {
    loading.value = true
    const response = await templatesApi.getAll(filters.value)
    templates.value = response.data || []
  } catch (error) {
    console.error("Failed to load templates:", error)
    showSnackbar(t("templates.failedToLoadTemplates"), "error")
  } finally {
    loading.value = false
  }
}

// Edit template
const editTemplate = (template: DocumentTemplate) => {
  selectedTemplate.value = template
  showCreateDialog.value = true
}

// Confirm delete
const confirmDelete = (template: DocumentTemplate) => {
  templateToDelete.value = template
  showDeleteDialog.value = true
}

// Delete template
const deleteTemplate = async () => {
  if (!templateToDelete.value) return

  try {
    deleting.value = true
    await templatesApi.delete(templateToDelete.value.id)

    showSnackbar(t("templates.templateDeleted"), "success")

    await loadTemplates()
    showDeleteDialog.value = false
    templateToDelete.value = null
  } catch (error) {
    console.error("Failed to delete template:", error)
    showSnackbar(t("templates.failedToDeleteTemplate"), "error")
  } finally {
    deleting.value = false
  }
}

// Duplicate template
const duplicateTemplate = async (template: DocumentTemplate) => {
  try {
    const newName = `${template.name} (${t('common.copy')})`
    await templatesApi.duplicate(template.id, newName)

    showSnackbar(t("templates.templateDuplicated"), "success")

    await loadTemplates()
  } catch (error) {
    console.error("Failed to duplicate template:", error)
    showSnackbar(t("templates.failedToDuplicateTemplate"), "error")
  }
}

// Set default template
const setDefaultTemplate = async (template: DocumentTemplate) => {
  try {
    await templatesApi.setDefault(template.id)

    showSnackbar(t("templates.defaultTemplateUpdated"), "success")

    await loadTemplates()
  } catch (error) {
    console.error("Failed to set default template:", error)
    showSnackbar(t("templates.failedToSetDefaultTemplate"), "error")
  }
}

// Preview template
const previewTemplate = (template: DocumentTemplate) => {
  previewingTemplate.value = template
  showPreviewDialog.value = true
}

// Handle template saved
const handleTemplateSaved = () => {
  showCreateDialog.value = false
  selectedTemplate.value = null
  loadTemplates()
}

// Edit template from preview
const editTemplateFromPreview = (template: DocumentTemplate) => {
  showPreviewDialog.value = false
  previewingTemplate.value = null
  editTemplate(template)
}

// Load templates on mount
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.template-manager {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header-content h2 {
  margin: 0 0 0.5rem 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.75rem;
  font-weight: 600;
}

.header-description {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
}

.fab-add {
  bottom: 80px;
  right: 16px;
  z-index: 100;
}

.template-filters {
  margin-bottom: 2rem;
}

.template-content {
  min-height: 400px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
}

.loading-state p {
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.25rem;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: rgb(var(--v-theme-on-surface-variant));
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.delete-content h4 {
  margin: 0 0 0.75rem 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.125rem;
}

.delete-content p {
  margin: 0 0 0.75rem 0;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.delete-content p:last-child {
  margin-bottom: 0;
}

/* Responsive design */
@media (max-width: 768px) {
  .template-manager {
    padding: 1rem;
  }

  .template-header {
    flex-direction: column;
    align-items: stretch;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .header-actions {
    width: 100%;
  }

  .header-actions .v-btn {
    width: 100%;
  }
}
</style>
