<template>
  <v-card class="task-filters" variant="outlined">
    <v-card-text class="filters-container">
        <div class="filters-row">
          <!-- Search -->
          <div class="filter-group">
            <v-text-field
              v-model="localFilters.search"
              label="Search"
              placeholder="Search tasks..."
              @input="onFiltersChange"
              density="comfortable"
              variant="outlined"
            />
          </div>

          <!-- Status Filter -->
          <div class="filter-group">
            <v-select
              v-model="localFilters.status"
              :items="statusOptions"
              item-title="label"
              item-value="value"
              label="Status"
              placeholder="All Statuses"
              @update:modelValue="onFiltersChange"
              clearable
              density="comfortable"
              variant="outlined"
            />
          </div>

          <!-- Priority Filter -->
          <div class="filter-group">
            <v-select
              v-model="localFilters.priority"
              :items="priorityOptions"
              item-title="label"
              item-value="value"
              label="Priority"
              placeholder="All Priorities"
              @update:modelValue="onFiltersChange"
              clearable
              density="comfortable"
              variant="outlined"
            />
          </div>

          <!-- Assignee Filter -->
          <div class="filter-group">
            <v-select
              v-model="localFilters.assigneeId"
              :items="assigneeOptions"
              item-title="label"
              item-value="value"
              label="Assignee"
              placeholder="All Assignees"
              @update:modelValue="onFiltersChange"
              clearable
              :loading="loadingUsers"
              density="comfortable"
              variant="outlined"
            />
          </div>
        </div>

        <div class="filters-row">
          <!-- Institution Filter -->
          <div class="filter-group">
            <v-select
              v-model="localFilters.institutionId"
              :items="institutionOptions"
              item-title="label"
              item-value="value"
              label="Institution"
              placeholder="All Institutions"
              @update:modelValue="onFiltersChange"
              clearable
              :loading="loadingInstitutions"
              density="comfortable"
              variant="outlined"
            />
          </div>

          <!-- Due Date Range -->
          <div class="filter-group">
            <v-text-field
              v-model="localFilters.dueDateFrom"
              label="Due Date From"
              placeholder="From date"
              type="date"
              @change="onFiltersChange"
              density="comfortable"
              variant="outlined"
            />
          </div>

          <div class="filter-group">
            <v-text-field
              v-model="localFilters.dueDateTo"
              label="Due Date To"
              placeholder="To date"
              type="date"
              @change="onFiltersChange"
              density="comfortable"
              variant="outlined"
            />
          </div>

          <!-- Quick Filters -->
          <div class="filter-group">
            <div class="quick-filters">
              <v-btn
                :color="localFilters.overdue ? 'error' : 'secondary'"
                :variant="localFilters.overdue ? 'elevated' : 'outlined'"
                size="small"
                @click="toggleOverdueFilter"
              >
                Overdue
              </v-btn>
              <v-btn
                color="secondary"
                variant="outlined"
                size="small"
                @click="clearAllFilters"
              >
                Clear All
              </v-btn>
            </div>
          </div>
        </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { institutionsApi, teamApi } from "@/services/api"
import type { TaskSearchFilters } from "@medical-crm/shared"
// Vuetify components are auto-imported
import { onMounted, ref, watch } from "vue"

interface Props {
  filters: TaskSearchFilters
}

interface Emits {
  (e: "update:filters", filters: TaskSearchFilters): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localFilters = ref<TaskSearchFilters>({ ...props.filters })
const loadingUsers = ref(false)
const loadingInstitutions = ref(false)
const assigneeOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])

const statusOptions = [
  { label: "To Do", value: "todo" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
]

watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = { ...newFilters }
  },
  { deep: true }
)

const onFiltersChange = () => {
  emit("update:filters", { ...localFilters.value })
}

const toggleOverdueFilter = () => {
  localFilters.value.overdue = !localFilters.value.overdue
  onFiltersChange()
}

const clearAllFilters = () => {
  localFilters.value = {}
  onFiltersChange()
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
    const data = response.data || response

    // Handle paginated response: {institutions: [...], pagination: {...}}
    let institutionsArray: any[] = []
    if (Array.isArray(data)) {
      institutionsArray = data
    } else if (data && Array.isArray(data.institutions)) {
      institutionsArray = data.institutions
    } else {
      console.warn("Institutions API response format unexpected:", data)
      institutionsArray = []
    }

    institutionOptions.value = institutionsArray.map((institution: any) => ({
      label: institution.name,
      value: institution.id,
    }))
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
.task-filters {
  margin-bottom: 1.5rem;
}

.filters-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.filter-input {
  width: 100%;
}

.quick-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .filters-row {
    grid-template-columns: 1fr;
  }

  .quick-filters {
    justify-content: flex-start;
  }
}
</style>
