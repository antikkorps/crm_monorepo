<template>
  <div class="template-manager">
    <div class="template-header">
      <div class="header-content">
        <h2>Document Templates</h2>
        <p class="header-description">
          Manage your document templates for quotes and invoices
        </p>
      </div>
      <div class="header-actions">
        <Button
          label="Create Template"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
          class="p-button-primary"
        />
      </div>
    </div>

    <div class="template-filters">
      <div class="filter-row">
        <div class="filter-group">
          <label for="type-filter">Type:</label>
          <Dropdown
            id="type-filter"
            v-model="filters.type"
            :options="templateTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="All Types"
            show-clear
            @change="loadTemplates"
          />
        </div>
        <div class="filter-group">
          <label for="search-filter">Search:</label>
          <InputText
            id="search-filter"
            v-model="filters.search"
            placeholder="Search templates..."
            @input="debouncedSearch"
          />
        </div>
      </div>
    </div>

    <div class="template-content">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <ProgressSpinner />
        <p>Loading templates...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="templates.length === 0" class="empty-state">
        <i class="pi pi-file-o empty-icon"></i>
        <h3>No Templates Found</h3>
        <p>Create your first document template to get started.</p>
        <Button
          label="Create Template"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
          class="p-button-primary"
        />
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

    <!-- Create/Edit Template Dialog -->
    <TemplateForm
      v-model:visible="showCreateDialog"
      :template="selectedTemplate"
      @saved="handleTemplateSaved"
    />

    <!-- Template Preview Dialog -->
    <TemplatePreview v-model:visible="showPreviewDialog" :template="previewingTemplate" />

    <!-- Delete Confirmation Dialog -->
    <Dialog
      v-model:visible="showDeleteDialog"
      header="Confirm Delete"
      :modal="true"
      :closable="false"
      class="delete-dialog"
    >
      <div class="delete-content">
        <i class="pi pi-exclamation-triangle delete-icon"></i>
        <div class="delete-message">
          <h4>Delete Template</h4>
          <p>
            Are you sure you want to delete the template "{{ templateToDelete?.name }}"?
            This action cannot be undone.
          </p>
          <p v-if="templateToDelete?.isDefault" class="warning-text">
            <strong>Warning:</strong> This is a default template. You should set another
            template as default before deleting this one.
          </p>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          text
          @click="showDeleteDialog = false"
        />
        <Button
          label="Delete"
          icon="pi pi-trash"
          severity="danger"
          @click="deleteTemplate"
          :loading="deleting"
        />
      </template>
    </Dialog>

    <!-- Toast for notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import type { DocumentTemplate, TemplateType } from "@medical-crm/shared"
import Button from "primevue/button"
import Dialog from "primevue/dialog"
import Dropdown from "primevue/dropdown"
import InputText from "primevue/inputtext"
import ProgressSpinner from "primevue/progressspinner"
import Toast from "primevue/toast"
import { useToast } from "primevue/usetoast"
import { onMounted, ref } from "vue"
import { templatesApi } from "../../services/api"
import TemplateCard from "./TemplateCard.vue"
import TemplateForm from "./TemplateForm.vue"
import TemplatePreview from "./TemplatePreview.vue"

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

// Filters
const filters = ref({
  type: null as TemplateType | null,
  search: "",
})

// Template type options for dropdown
const templateTypeOptions = [
  { label: "Quote Templates", value: "quote" },
  { label: "Invoice Templates", value: "invoice" },
  { label: "Both Types", value: "both" },
]

// Toast for notifications
const toast = useToast()

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
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load templates",
      life: 3000,
    })
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

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Template deleted successfully",
      life: 3000,
    })

    await loadTemplates()
    showDeleteDialog.value = false
    templateToDelete.value = null
  } catch (error) {
    console.error("Failed to delete template:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete template",
      life: 3000,
    })
  } finally {
    deleting.value = false
  }
}

// Duplicate template
const duplicateTemplate = async (template: DocumentTemplate) => {
  try {
    const newName = `${template.name} (Copy)`
    await templatesApi.duplicate(template.id, newName)

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Template duplicated successfully",
      life: 3000,
    })

    await loadTemplates()
  } catch (error) {
    console.error("Failed to duplicate template:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to duplicate template",
      life: 3000,
    })
  }
}

// Set default template
const setDefaultTemplate = async (template: DocumentTemplate) => {
  try {
    await templatesApi.setDefault(template.id)

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Default template updated",
      life: 3000,
    })

    await loadTemplates()
  } catch (error) {
    console.error("Failed to set default template:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to set default template",
      life: 3000,
    })
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
  color: var(--text-color);
  font-size: 1.75rem;
  font-weight: 600;
}

.header-description {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 1rem;
}

.header-actions {
  flex-shrink: 0;
}

.template-filters {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.filter-row {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.5rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
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
  color: var(--text-color-secondary);
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
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
  font-size: 1.25rem;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: var(--text-color-secondary);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.delete-dialog {
  max-width: 500px;
}

.delete-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 0;
}

.delete-icon {
  font-size: 2rem;
  color: var(--orange-500);
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.delete-message h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
  font-size: 1.125rem;
}

.delete-message p {
  margin: 0 0 0.75rem 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.delete-message p:last-child {
  margin-bottom: 0;
}

.warning-text {
  color: var(--orange-600) !important;
  font-size: 0.875rem;
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

  .filter-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }

  .delete-content {
    flex-direction: column;
    text-align: center;
  }
}
</style>
