<template>
  <v-dialog
    v-model="visible"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title>
         {{ isEditing ? t('task.edit') : t('task.createNew') }}
       </v-card-title>

      <v-card-text class="task-form">

    <form @submit.prevent="handleSubmit" class="task-form">
       <!-- Title -->
       <div class="form-group">
         <v-text-field
           id="title"
           v-model="formData.title"
           :error-messages="errors.title ? [errors.title] : []"
           :label="t('task.form.title') + ' *'"
           :placeholder="t('task.form.titlePlaceholder')"
           density="comfortable"
           hide-details="auto"
         />
       </div>

       <!-- Description -->
       <div class="form-group">
         <v-textarea
           id="description"
           v-model="formData.description"
           :label="t('task.form.description')"
           :placeholder="t('task.form.descriptionPlaceholder')"
           density="comfortable"
           :rows="$vuetify.display.mobile ? 2 : 3"
           auto-grow
           hide-details="auto"
         />
       </div>

       <!-- Priority and Assignee Row -->
       <div class="form-row">
         <div class="form-group">
           <v-select
             id="priority"
             v-model="formData.priority"
             :items="priorityOptions"
             item-title="label"
             item-value="value"
             :label="t('task.form.priority')"
             :placeholder="t('task.form.priorityPlaceholder')"
             density="comfortable"
             hide-details="auto"
           />
         </div>

         <div class="form-group">
           <v-select
             id="assigneeId"
             v-model="formData.assigneeId"
             :items="assigneeOptions"
             item-title="label"
             item-value="value"
             :error-messages="errors.assigneeId ? [errors.assigneeId] : []"
             :label="t('task.form.assignee') + ' *'"
             :placeholder="t('task.form.assigneePlaceholder')"
             :loading="loadingUsers"
             density="comfortable"
             hide-details="auto"
           />
         </div>
       </div>

       <!-- Status Row (only in edit mode) -->
       <div class="form-row" v-if="isEditing">
         <div class="form-group full-width">
           <v-select
             id="status"
             v-model="formData.status"
             :items="statusOptions"
             item-title="label"
             item-value="value"
             :label="t('task.form.status')"
             :placeholder="t('task.form.statusPlaceholder')"
             density="comfortable"
             hide-details="auto"
           />
         </div>
       </div>

       <!-- Institution and Contact Row -->
       <div class="form-row">
         <div class="form-group">
           <v-autocomplete
             id="institutionId"
             v-model="formData.institutionId"
             :items="institutionOptions"
             item-title="label"
             item-value="value"
             :label="t('task.form.institution')"
             :placeholder="t('task.form.institutionPlaceholder')"
             clearable
             :loading="loadingInstitutions"
             density="comfortable"
             hide-details="auto"
             @update:model-value="onInstitutionChange"
             @update:search="onInstitutionSearch"
             no-filter
           />
         </div>

         <div class="form-group" v-if="formData.institutionId">
           <v-select
             id="contactId"
             v-model="formData.contactId"
             :items="contactOptions"
             item-title="label"
             item-value="value"
             :label="t('task.form.contact')"
             :placeholder="t('task.form.contactPlaceholder')"
             clearable
             :loading="loadingContacts"
             density="comfortable"
             hide-details="auto"
           />
         </div>
       </div>

       <!-- Due Date -->
       <div class="form-group">
         <v-text-field
           id="dueDate"
           v-model="formData.dueDate"
           :label="t('task.form.dueDate')"
           :placeholder="t('task.form.dueDatePlaceholder')"
           type="datetime-local"
           density="comfortable"
           hide-details="auto"
           :min="new Date().toISOString().slice(0, 16)"
         />
       </div>
    </form>

      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer />
        <v-btn
          color="secondary"
          variant="outlined"
          @click="handleCancel"
        >
          {{ t('task.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ isEditing ? t('task.update') : t('task.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { institutionsApi } from "@/services/api"
import { useInstitutionsStore } from "@/stores/institutions"
import { useTeamStore } from "@/stores/team"
import type {
  Task,
  TaskCreateRequest,
  TaskPriority,
  TaskStatus,
  TaskUpdateRequest,
} from "@medical-crm/shared"
// Vuetify components are auto-imported
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  modelValue: boolean
  task?: Task | null
  loading?: boolean
}

interface Emits {
  (e: "update:modelValue", visible: boolean): void
  (e: "submit", data: TaskCreateRequest | TaskUpdateRequest): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()

// Stores
const teamStore = useTeamStore()
const institutionsStore = useInstitutionsStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
})

const formData = ref<TaskCreateRequest & { status?: TaskStatus; contactId?: string; dueDate: string }>({
  title: "",
  description: "",
  priority: "medium" as TaskPriority,
  assigneeId: "",
  institutionId: "",
  contactId: "",
  dueDate: "",
  status: "todo" as TaskStatus,
})

const errors = ref<Record<string, string>>({})
const assigneeOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const contactOptions = ref<Array<{ label: string; value: string }>>([])
const loadingContacts = ref(false)
const loadingInstitutionsSearch = ref(false)

// Computed loading states from stores
const loadingUsers = computed(() => teamStore.loading)
const loadingInstitutions = computed(() => institutionsStore.loading || loadingInstitutionsSearch.value)

const isEditing = computed(() => !!props.task)

const priorityOptions = computed(() => [
  { label: t('task.priority.low'), value: "low" },
  { label: t('task.priority.medium'), value: "medium" },
  { label: t('task.priority.high'), value: "high" },
  { label: t('task.priority.urgent'), value: "urgent" },
])

const statusOptions = computed(() => [
  { label: t('task.status.todo'), value: "todo" },
  { label: t('task.status.in_progress'), value: "in_progress" },
  { label: t('task.status.completed'), value: "completed" },
  { label: t('task.status.cancelled'), value: "cancelled" },
])

watch(
  () => props.modelValue,
  (isVisible) => {
    if (isVisible) {
      resetForm()
      if (props.task) {
        populateForm(props.task)
      }
    }
  }
)

const resetForm = () => {
  formData.value = {
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    assigneeId: "",
    institutionId: "",
    contactId: "",
    dueDate: "",
    status: "todo" as TaskStatus,
  }
  errors.value = {}
  contactOptions.value = []
}

const populateForm = (task: Task) => {
  formData.value = {
    title: task.title,
    description: task.description || "",
    priority: task.priority,
    assigneeId: task.assigneeId,
    institutionId: task.institutionId || "",
    contactId: (task as any).contactId || "",
    dueDate: task.dueDate ? formatDateForInput(new Date(task.dueDate)) : "",
    status: task.status,
  }

  // Load contacts if institution is selected
  if (formData.value.institutionId) {
    loadContacts(formData.value.institutionId)
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.title.trim()) {
    errors.value.title = t('task.form.titleRequired')
  }

  if (!formData.value.assigneeId) {
    errors.value.assigneeId = t('task.form.assigneeRequired')
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validateForm()) return

  const submitData = { ...formData.value }

  // Clean up empty values
  if (!submitData.description?.trim()) {
    delete submitData.description
  }
  if (!submitData.institutionId) {
    delete submitData.institutionId
  }
  if (!submitData.contactId) {
    delete submitData.contactId
  }
  if (!submitData.dueDate) {
    delete submitData.dueDate
  } else {
    // Convert string to Date for API
    (submitData as any).dueDate = new Date(submitData.dueDate)
  }

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  visible.value = false
}

const onInstitutionChange = async (institutionId: string) => {
  formData.value.contactId = "" // Reset contact when institution changes
  if (institutionId) {
    await loadContacts(institutionId)
  } else {
    contactOptions.value = []
  }
}

const loadContacts = async (institutionId: string) => {
  try {
    loadingContacts.value = true
    const institution = institutionsStore.getInstitutionById(institutionId)

    if (institution && Array.isArray(institution.contactPersons)) {
      contactOptions.value = institution.contactPersons.map((contact: any) => ({
        label: `${contact.firstName} ${contact.lastName}${contact.title ? ` (${contact.title})` : ''}`,
        value: contact.id,
      }))
    } else {
      contactOptions.value = []
    }
  } catch (error) {
    console.error("Error loading contacts:", error)
    contactOptions.value = []
  } finally {
    loadingContacts.value = false
  }
}

const loadUsers = async () => {
  try {
    await teamStore.fetchTeamMembers()

    // Convert team members to assignee options
    const users: Array<{ label: string; value: string }> = []
    if (Array.isArray(teamStore.teamMembers)) {
      teamStore.teamMembers.forEach((member) => {
        if (member.firstName && member.lastName && member.id) {
          users.push({
            label: `${member.firstName} ${member.lastName}`,
            value: member.id,
          })
        }
      })
    } else {
      console.warn("Team members is not an array:", teamStore.teamMembers)
    }
    assigneeOptions.value = users
  } catch (error) {
    console.error("Error loading users:", error)
    assigneeOptions.value = []
  }
}

const loadInstitutions = async () => {
  try {
    await institutionsStore.fetchInstitutions()

    if (Array.isArray(institutionsStore.institutions)) {
      institutionOptions.value = institutionsStore.institutions.map((institution) => ({
        label: institution.name,
        value: institution.id,
      }))
    } else {
      console.warn("Institutions response is not an array:", institutionsStore.institutions)
      institutionOptions.value = []
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  }
}

// Debounce timer for institution search
let searchDebounceTimer: NodeJS.Timeout | null = null

const onInstitutionSearch = async (search: string | null) => {
  // Clear previous timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // If search is empty or too short, load all institutions
  if (!search || search.length < 2) {
    loadingInstitutionsSearch.value = true
    await loadInstitutions()
    loadingInstitutionsSearch.value = false
    return
  }

  // Debounce search
  searchDebounceTimer = setTimeout(async () => {
    try {
      loadingInstitutionsSearch.value = true
      const response = await institutionsApi.search(search, { limit: 50 })
      const data = (response as any).data || response

      let institutionsArray: any[] = []
      if (Array.isArray(data)) {
        institutionsArray = data
      } else if (data && Array.isArray(data.institutions)) {
        institutionsArray = data.institutions
      }

      institutionOptions.value = institutionsArray.map((institution: any) => ({
        label: institution.name,
        value: institution.id,
      }))
    } catch (error) {
      console.error("Error searching institutions:", error)
      institutionOptions.value = []
    } finally {
      loadingInstitutionsSearch.value = false
    }
  }, 300) // 300ms debounce
}

// Helper function to format date for datetime-local input
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

onMounted(() => {
  loadUsers()
  loadInstitutions()
})
</script>

<style scoped>
.task-form-dialog {
  width: 90vw;
  max-width: 600px;
}

.task-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--v-theme-surface-variant), 0.2);
}

@media (max-width: 768px) {
  .task-form-dialog {
    width: 95vw;
    max-width: none;
  }

  .task-form {
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
    gap: 0.5rem;
    padding-top: 1.5rem;

    .v-btn {
      width: 100%;
    }
  }
}

@media (max-width: 480px) {
  .task-form-dialog {
    width: 98vw;
    margin: 1rem;
  }

  .task-form {
    gap: 0.75rem;
    padding: 0.25rem 0;
  }

  .form-row {
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .v-card-text {
    padding: 1rem !important;
  }

  .v-card-title {
    padding: 1rem 1rem 0.5rem 1rem !important;
    font-size: 1.25rem;
  }
}
</style>
