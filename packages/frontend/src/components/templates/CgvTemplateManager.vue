<template>
  <div class="cgv-template-manager">
    <!-- Mobile: FAB + Bottom Sheet, Desktop: Button + Dialog -->
    <v-btn
      v-if="$vuetify.display.smAndDown"
      color="primary"
      icon="mdi-plus"
      size="large"
      class="fab-add"
      position="fixed"
      @click="openCreateDialog"
    />

    <div v-else class="header-actions mb-4">
      <v-btn
        color="primary"
        prepend-icon="mdi-plus"
        variant="elevated"
        @click="openCreateDialog"
      >
        {{ t("cgvTemplates.create") }}
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!templates || templates.length === 0" class="empty-state">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-file-document-edit-outline</v-icon>
      <h3 class="text-h6 mb-2">{{ t("cgvTemplates.noTemplates") }}</h3>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ t("cgvTemplates.noTemplatesDescription") }}
      </p>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
        {{ t("cgvTemplates.createFirst") }}
      </v-btn>
    </div>

    <!-- Templates List - Mobile optimized -->
    <div v-else class="templates-list">
      <v-card
        v-for="template in templates"
        :key="template.id"
        class="template-card mb-3"
        :class="{ 'template-card--default': template.isDefault }"
        variant="outlined"
      >
        <v-card-item>
          <template #prepend>
            <v-avatar :color="getCategoryColor(template.category)" size="40">
              <v-icon color="white">{{ getCategoryIcon(template.category) }}</v-icon>
            </v-avatar>
          </template>

          <v-card-title class="text-body-1 font-weight-medium">
            {{ template.name }}
            <v-chip
              v-if="template.isDefault"
              size="x-small"
              color="primary"
              class="ml-2"
            >
              {{ t("cgvTemplates.default") }}
            </v-chip>
          </v-card-title>

          <v-card-subtitle v-if="template.description" class="text-caption">
            {{ template.description }}
          </v-card-subtitle>

          <template #append>
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
              </template>
              <v-list density="compact">
                <v-list-item @click="editTemplate(template)">
                  <template #prepend>
                    <v-icon size="small">mdi-pencil</v-icon>
                  </template>
                  <v-list-item-title>{{ t("common.edit") }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="!template.isDefault" @click="setAsDefault(template)">
                  <template #prepend>
                    <v-icon size="small">mdi-star</v-icon>
                  </template>
                  <v-list-item-title>{{ t("cgvTemplates.setDefault") }}</v-list-item-title>
                </v-list-item>
                <v-list-item @click="duplicateTemplate(template)">
                  <template #prepend>
                    <v-icon size="small">mdi-content-copy</v-icon>
                  </template>
                  <v-list-item-title>{{ t("common.copy") }}</v-list-item-title>
                </v-list-item>
                <v-divider class="my-1" />
                <v-list-item
                  :disabled="template.isDefault"
                  class="text-error"
                  @click="confirmDelete(template)"
                >
                  <template #prepend>
                    <v-icon size="small" color="error">mdi-delete</v-icon>
                  </template>
                  <v-list-item-title>{{ t("common.delete") }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
        </v-card-item>

        <v-card-text v-if="template.category" class="pt-0">
          <v-chip size="small" variant="tonal" :color="getCategoryColor(template.category)">
            {{ t(`cgvTemplates.categories.${template.category}`) }}
          </v-chip>
        </v-card-text>
      </v-card>
    </div>

    <!-- Create/Edit Dialog - Full screen on mobile -->
    <v-dialog
      v-model="showDialog"
      :fullscreen="$vuetify.display.smAndDown"
      :max-width="$vuetify.display.smAndDown ? undefined : '800px'"
      scrollable
    >
      <v-card>
        <v-toolbar color="primary" density="compact">
          <v-btn icon="mdi-close" @click="closeDialog" />
          <v-toolbar-title>
            {{ editingTemplate ? t("cgvTemplates.edit") : t("cgvTemplates.create") }}
          </v-toolbar-title>
          <v-spacer />
          <v-btn variant="text" :loading="saving" @click="saveTemplate">
            {{ t("common.save") }}
          </v-btn>
        </v-toolbar>

        <v-card-text class="pa-4">
          <v-form ref="formRef" @submit.prevent="saveTemplate">
            <v-text-field
              v-model="form.name"
              :label="t('cgvTemplates.form.name')"
              :rules="[v => !!v || t('cgvTemplates.form.nameRequired')]"
              variant="outlined"
              density="comfortable"
              class="mb-3"
            />

            <v-textarea
              v-model="form.description"
              :label="t('cgvTemplates.form.description')"
              variant="outlined"
              density="comfortable"
              rows="2"
              class="mb-3"
            />

            <v-select
              v-model="form.category"
              :items="categoryOptions"
              :label="t('cgvTemplates.form.category')"
              item-title="label"
              item-value="value"
              variant="outlined"
              density="comfortable"
              clearable
              class="mb-3"
            />

            <v-switch
              v-model="form.isDefault"
              :label="t('cgvTemplates.form.isDefault')"
              color="primary"
              density="comfortable"
              class="mb-4"
            />

            <div class="text-body-2 text-medium-emphasis mb-2">
              {{ t("cgvTemplates.form.content") }}
            </div>
            <RichTextEditor
              v-model="form.content"
              :placeholder="t('cgvTemplates.form.contentPlaceholder')"
              min-height="300px"
            />
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">
          {{ t("cgvTemplates.confirmDelete.title") }}
        </v-card-title>
        <v-card-text>
          {{ t("cgvTemplates.confirmDelete.message", { name: templateToDelete?.name }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">
            {{ t("common.cancel") }}
          </v-btn>
          <v-btn color="error" :loading="deleting" @click="deleteTemplate">
            {{ t("common.delete") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import RichTextEditor from "@/components/common/RichTextEditor.vue"
import { cgvTemplatesApi, type CgvTemplate } from "@/services/api/cgv-templates"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

// State
const templates = ref<CgvTemplate[]>([])
const loading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const editingTemplate = ref<CgvTemplate | null>(null)
const templateToDelete = ref<CgvTemplate | null>(null)
const formRef = ref()

const snackbar = ref({ visible: false, message: "", color: "info" })

// Form data
const defaultForm = {
  name: "",
  description: "",
  content: "",
  category: null as string | null,
  isDefault: false,
}
const form = ref({ ...defaultForm })

// Category options
const categoryOptions = computed(() => [
  { label: t("cgvTemplates.categories.general"), value: "general" },
  { label: t("cgvTemplates.categories.audit"), value: "audit" },
  { label: t("cgvTemplates.categories.conseil"), value: "conseil" },
  { label: t("cgvTemplates.categories.formation"), value: "formation" },
])

// Category helpers
function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    general: "blue-grey",
    audit: "indigo",
    conseil: "teal",
    formation: "orange",
  }
  return colors[category || ""] || "grey"
}

function getCategoryIcon(category?: string): string {
  const icons: Record<string, string> = {
    general: "mdi-file-document",
    audit: "mdi-clipboard-check",
    conseil: "mdi-lightbulb",
    formation: "mdi-school",
  }
  return icons[category || ""] || "mdi-file-document"
}

// Load templates
async function loadTemplates() {
  // Check if we have a token before making the API call
  const token = localStorage.getItem("token")
  if (!token) {
    console.warn("No auth token, skipping CGV templates load")
    return
  }

  try {
    loading.value = true
    const result = await cgvTemplatesApi.getAll()
    templates.value = result || []
  } catch (error: any) {
    console.error("Failed to load CGV templates:", error)
    templates.value = []
    // Don't show error snackbar for auth errors - let other handlers deal with it
    if (error?.status !== 401 && error?.status !== 403) {
      showSnackbar(t("cgvTemplates.messages.loadError"), "error")
    }
  } finally {
    loading.value = false
  }
}

// Open create dialog
function openCreateDialog() {
  editingTemplate.value = null
  form.value = { ...defaultForm }
  showDialog.value = true
}

// Edit template
function editTemplate(template: CgvTemplate) {
  editingTemplate.value = template
  form.value = {
    name: template.name,
    description: template.description || "",
    content: template.content,
    category: template.category || null,
    isDefault: template.isDefault,
  }
  showDialog.value = true
}

// Close dialog
function closeDialog() {
  showDialog.value = false
  editingTemplate.value = null
  form.value = { ...defaultForm }
}

// Save template
async function saveTemplate() {
  const { valid } = await formRef.value?.validate()
  if (!valid) return

  try {
    saving.value = true

    const data = {
      name: form.value.name,
      description: form.value.description || undefined,
      content: form.value.content,
      category: form.value.category || undefined,
      isDefault: form.value.isDefault,
    }

    if (editingTemplate.value) {
      await cgvTemplatesApi.update(editingTemplate.value.id, data)
      showSnackbar(t("cgvTemplates.messages.updated"), "success")
    } else {
      await cgvTemplatesApi.create(data)
      showSnackbar(t("cgvTemplates.messages.created"), "success")
    }

    closeDialog()
    await loadTemplates()
  } catch (error) {
    console.error("Failed to save CGV template:", error)
    showSnackbar(t("cgvTemplates.messages.saveError"), "error")
  } finally {
    saving.value = false
  }
}

// Set as default
async function setAsDefault(template: CgvTemplate) {
  try {
    await cgvTemplatesApi.setDefault(template.id)
    showSnackbar(t("cgvTemplates.messages.setDefault"), "success")
    await loadTemplates()
  } catch (error) {
    console.error("Failed to set default:", error)
    showSnackbar(t("cgvTemplates.messages.setDefaultError"), "error")
  }
}

// Duplicate template
async function duplicateTemplate(template: CgvTemplate) {
  try {
    await cgvTemplatesApi.create({
      name: `${template.name} (${t("common.copy")})`,
      description: template.description,
      content: template.content,
      category: template.category,
      isDefault: false,
    })
    showSnackbar(t("cgvTemplates.messages.duplicated"), "success")
    await loadTemplates()
  } catch (error) {
    console.error("Failed to duplicate:", error)
    showSnackbar(t("cgvTemplates.messages.duplicateError"), "error")
  }
}

// Confirm delete
function confirmDelete(template: CgvTemplate) {
  templateToDelete.value = template
  showDeleteDialog.value = true
}

// Delete template
async function deleteTemplate() {
  if (!templateToDelete.value) return

  try {
    deleting.value = true
    await cgvTemplatesApi.delete(templateToDelete.value.id)
    showSnackbar(t("cgvTemplates.messages.deleted"), "success")
    showDeleteDialog.value = false
    templateToDelete.value = null
    await loadTemplates()
  } catch (error) {
    console.error("Failed to delete:", error)
    showSnackbar(t("cgvTemplates.messages.deleteError"), "error")
  } finally {
    deleting.value = false
  }
}

// Snackbar helper
function showSnackbar(message: string, color: string) {
  snackbar.value = { visible: true, message, color }
}

// Init
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.cgv-template-manager {
  position: relative;
  min-height: 200px;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
}

.templates-list {
  max-width: 600px;
}

.template-card {
  transition: all 0.2s ease;
}

.template-card--default {
  border-color: rgb(var(--v-theme-primary));
  border-width: 2px;
}

.fab-add {
  bottom: 80px;
  right: 16px;
  z-index: 100;
}

@media (min-width: 960px) {
  .templates-list {
    max-width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1rem;
  }

  .template-card {
    margin-bottom: 0 !important;
  }
}
</style>
