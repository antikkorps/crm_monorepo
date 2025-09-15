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
          rows="3"
          auto-grow
        />
      </div>

      <!-- Priority and Status Row -->
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
          />
        </div>

        <div class="form-group" v-if="isEditing">
          <v-select
            id="status"
            v-model="formData.status"
            :items="statusOptions"
            item-title="label"
            item-value="value"
            :label="t('task.form.status')"
            :placeholder="t('task.form.statusPlaceholder')"
            density="comfortable"
          />
        </div>
      </div>

      <!-- Assignee and Institution Row -->
      <div class="form-row">
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
          />
        </div>

        <div class="form-group">
          <v-select
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
import { institutionsApi, teamApi } from "@/services/api"
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

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
})

const formData = ref<TaskCreateRequest & { status?: TaskStatus }>({
  title: "",
  description: "",
  priority: "medium" as TaskPriority,
  assigneeId: "",
  institutionId: "",
  dueDate: undefined,
  status: "todo" as TaskStatus,
})

const errors = ref<Record<string, string>>({})
const loadingUsers = ref(false)
const loadingInstitutions = ref(false)
const assigneeOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])

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
    dueDate: undefined,
    status: "todo" as TaskStatus,
  }
  errors.value = {}
}

const populateForm = (task: Task) => {
  formData.value = {
    title: task.title,
    description: task.description || "",
    priority: task.priority,
    assigneeId: task.assigneeId,
    institutionId: task.institutionId || "",
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    status: task.status,
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
  if (!submitData.dueDate) {
    delete submitData.dueDate
  }

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  visible.value = false
}

const loadUsers = async () => {
  try {
    loadingUsers.value = true
    const response = await teamApi.getAll()
    const teams = response.data || response

    if (Array.isArray(teams)) {
      // Flatten team members into assignee options
      const users: Array<{ label: string; value: string }> = []
      teams.forEach((team: any) => {
        if (team.members && Array.isArray(team.members)) {
          team.members.forEach((member: any) => {
            if (member.firstName && member.lastName && member.id) {
              users.push({
                label: `${member.firstName} ${member.lastName}`,
                value: member.id,
              })
            }
          })
        }
      })
      assigneeOptions.value = users
    } else {
      console.warn("Teams response is not an array:", teams)
      assigneeOptions.value = []
    }
  } catch (error) {
    console.error("Error loading users:", error)
    assigneeOptions.value = []
  } finally {
    loadingUsers.value = false
  }
}

const loadInstitutions = async () => {
  try {
    loadingInstitutions.value = true
    const response = await institutionsApi.getAll()
    const institutions = response.data || response

    if (Array.isArray(institutions)) {
      institutionOptions.value = institutions.map((institution: any) => ({
        label: institution.name,
        value: institution.id,
      }))
    } else {
      console.warn("Institutions response is not an array:", institutions)
      institutionOptions.value = []
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  } finally {
    loadingInstitutions.value = false
  }
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
}

.form-group {
  margin-bottom: 1rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .task-form-dialog {
    width: 95vw;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
