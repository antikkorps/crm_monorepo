<template>
  <Card class="task-filters">
    <template #content>
      <div class="filters-container">
        <div class="filters-row">
          <!-- Search -->
          <div class="filter-group">
            <label class="filter-label">Search</label>
            <InputText
              v-model="localFilters.search"
              placeholder="Search tasks..."
              class="filter-input"
              @input="onFiltersChange"
            />
          </div>

          <!-- Status Filter -->
          <div class="filter-group">
            <label class="filter-label">Status</label>
            <Dropdown
              v-model="localFilters.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Statuses"
              class="filter-input"
              @change="onFiltersChange"
              showClear
            />
          </div>

          <!-- Priority Filter -->
          <div class="filter-group">
            <label class="filter-label">Priority</label>
            <Dropdown
              v-model="localFilters.priority"
              :options="priorityOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Priorities"
              class="filter-input"
              @change="onFiltersChange"
              showClear
            />
          </div>

          <!-- Assignee Filter -->
          <div class="filter-group">
            <label class="filter-label">Assignee</label>
            <Dropdown
              v-model="localFilters.assigneeId"
              :options="assigneeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Assignees"
              class="filter-input"
              @change="onFiltersChange"
              showClear
              :loading="loadingUsers"
            />
          </div>
        </div>

        <div class="filters-row">
          <!-- Institution Filter -->
          <div class="filter-group">
            <label class="filter-label">Institution</label>
            <Dropdown
              v-model="localFilters.institutionId"
              :options="institutionOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Institutions"
              class="filter-input"
              @change="onFiltersChange"
              showClear
              :loading="loadingInstitutions"
            />
          </div>

          <!-- Due Date Range -->
          <div class="filter-group">
            <label class="filter-label">Due Date From</label>
            <Calendar
              v-model="localFilters.dueDateFrom"
              placeholder="From date"
              class="filter-input"
              @date-select="onFiltersChange"
              showIcon
              dateFormat="dd/mm/yy"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">Due Date To</label>
            <Calendar
              v-model="localFilters.dueDateTo"
              placeholder="To date"
              class="filter-input"
              @date-select="onFiltersChange"
              showIcon
              dateFormat="dd/mm/yy"
            />
          </div>

          <!-- Quick Filters -->
          <div class="filter-group">
            <label class="filter-label">Quick Filters</label>
            <div class="quick-filters">
              <Button
                label="Overdue"
                :severity="localFilters.overdue ? 'danger' : 'secondary'"
                :outlined="!localFilters.overdue"
                size="small"
                @click="toggleOverdueFilter"
              />
              <Button
                label="Clear All"
                severity="secondary"
                outlined
                size="small"
                @click="clearAllFilters"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { institutionsApi, teamApi } from "@/services/api"
import type { TaskSearchFilters } from "@medical-crm/shared"
import Button from "primevue/button"
import Calendar from "primevue/calendar"
import Card from "primevue/card"
import Dropdown from "primevue/dropdown"
import InputText from "primevue/inputtext"
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
