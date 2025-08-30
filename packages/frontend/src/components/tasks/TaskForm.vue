<template>
  <Dialog
    :visible="visible"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="task-form-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <h3>{{ isEditing ? "Edit Task" : "Create New Task" }}</h3>
    </template>

    <form @submit.prevent="handleSubmit" class="task-form">
      <!-- Title -->
      <div class="form-group">
        <label for="title" class="form-label required">Title</label>
        <InputText
          id="title"
          v-model="formData.title"
          :class="{ 'p-invalid': errors.title }"
          placeholder="Enter task title"
          class="form-input"
        />
        <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
      </div>

      <!-- Description -->
      <div class="form-group">
        <label for="description" class="form-label">Description</label>
        <Textarea
          id="description"
          v-model="formData.description"
          placeholder="Enter task description (optional)"
          class="form-input"
          rows="3"
          autoResize
        />
      </div>

      <!-- Priority and Status Row -->
      <div class="form-row">
        <div class="form-group">
          <label for="priority" class="form-label">Priority</label>
          <Dropdown
            id="priority"
            v-model="formData.priority"
            :options="priorityOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select priority"
            class="form-input"
          />
        </div>

        <div class="form-group" v-if="isEditing">
          <label for="status" class="form-label">Status</label>
          <Dropdown
            id="status"
            v-model="formData.status"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select status"
            class="form-input"
          />
        </div>
      </div>

      <!-- Assignee and Institution Row -->
      <div class="form-row">
        <div class="form-group">
          <label for="assigneeId" class="form-label required">Assignee</label>
          <Dropdown
            id="assigneeId"
            v-model="formData.assigneeId"
            :options="assigneeOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select assignee"
            class="form-input"
            :class="{ 'p-invalid': errors.assigneeId }"
            :loading="loadingUsers"
            filter
          />
          <small v-if="errors.assigneeId" class="p-error">{{ errors.assigneeId }}</small>
        </div>

        <div class="form-group">
          <label for="institutionId" class="form-label">Institution</label>
          <Dropdown
            id="institutionId"
            v-model="formData.institutionId"
            :options="institutionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select institution (optional)"
            class="form-input"
            :loading="loadingInstitutions"
            filter
            showClear
          />
        </div>
      </div>

      <!-- Due Date -->
      <div class="form-group">
        <label for="dueDate" class="form-label">Due Date</label>
        <Calendar
          id="dueDate"
          v-model="formData.dueDate"
          placeholder="Select due date (optional)"
          class="form-input"
          showIcon
          dateFormat="dd/mm/yy"
          :minDate="new Date()"
          showTime
          hourFormat="24"
        />
      </div>
    </form>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Cancel" severity="secondary" outlined @click="handleCancel" />
        <Button
          :label="isEditing ? 'Update Task' : 'Create Task'"
          :loading="loading"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
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
import Button from "primevue/button"
import Calendar from "primevue/calendar"
import Dialog from "primevue/dialog"
import Dropdown from "primevue/dropdown"
import InputText from "primevue/inputtext"
import Textarea from "primevue/textarea"
import { computed, onMounted, ref, watch } from "vue"

interface Props {
  visible: boolean
  task?: Task | null
  loading?: boolean
}

interface Emits {
  (e: "update:visible", visible: boolean): void
  (e: "submit", data: TaskCreateRequest | TaskUpdateRequest): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
]

const statusOptions = [
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
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
    errors.value.title = "Title is required"
  }

  if (!formData.value.assigneeId) {
    errors.value.assigneeId = "Assignee is required"
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
  emit("update:visible", false)
}

const loadUsers = async () => {
  try {
    loadingUsers.value = true
    const response = await teamApi.getAll()
    const teams = response.data || response

    // Flatten team members into assignee options
    const users: Array<{ label: string; value: string }> = []
    teams.forEach((team: any) => {
      if (team.members) {
        team.members.forEach((member: any) => {
          users.push({
            label: `${member.firstName} ${member.lastName}`,
            value: member.id,
          })
        })
      }
    })

    assigneeOptions.value = users
  } catch (error) {
    console.error("Error loading users:", error)
  } finally {
    loadingUsers.value = false
  }
}

const loadInstitutions = async () => {
  try {
    loadingInstitutions.value = true
    const response = await institutionsApi.getAll()
    const institutions = response.data || response

    institutionOptions.value = institutions.map((institution: any) => ({
      label: institution.name,
      value: institution.id,
    }))
  } catch (error) {
    console.error("Error loading institutions:", error)
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

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-label.required::after {
  content: " *";
  color: #ef4444;
}

.form-input {
  width: 100%;
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
