<template>
  <v-card class="reminder-filters" variant="outlined">
    <v-card-text class="filters-container">
      <div class="filters-row">
        <!-- Search -->
        <div class="filter-group">
          <v-text-field
            v-model="localFilters.search"
            label="Rechercher"
            placeholder="Rechercher dans les rappels..."
            prepend-inner-icon="mdi-magnify"
            @input="onFiltersChange"
            density="comfortable"
            variant="outlined"
            clearable
          />
        </div>

        <!-- Priority Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.priority"
            :items="priorityOptions"
            item-title="label"
            item-value="value"
            label="Priorité"
            placeholder="Toutes les priorités"
            prepend-inner-icon="mdi-flag"
            @update:modelValue="onFiltersChange"
            clearable
            density="comfortable"
            variant="outlined"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </div>

        <!-- Status Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.status"
            :items="statusOptions"
            item-title="label"
            item-value="value"
            label="Statut"
            placeholder="Tous les statuts"
            prepend-inner-icon="mdi-information-outline"
            @update:modelValue="onFiltersChange"
            clearable
            density="comfortable"
            variant="outlined"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </div>

        <!-- User Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.userId"
            :items="userOptions"
            item-title="label"
            item-value="value"
            label="Utilisateur"
            placeholder="Tous les utilisateurs"
            prepend-inner-icon="mdi-account"
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
            placeholder="Toutes les institutions"
            prepend-inner-icon="mdi-office-building"
            @update:modelValue="onFiltersChange"
            clearable
            :loading="loadingInstitutions"
            density="comfortable"
            variant="outlined"
          />
        </div>

        <!-- Date Range -->
        <div class="filter-group">
          <v-text-field
            v-model="localFilters.dateFrom"
            label="Date de début"
            type="date"
            prepend-inner-icon="mdi-calendar-start"
            @update:modelValue="onFiltersChange"
            clearable
            density="comfortable"
            variant="outlined"
          />
        </div>

        <div class="filter-group">
          <v-text-field
            v-model="localFilters.dateTo"
            label="Date de fin"
            type="date"
            prepend-inner-icon="mdi-calendar-end"
            @update:modelValue="onFiltersChange"
            clearable
            density="comfortable"
            variant="outlined"
          />
        </div>

        <!-- Quick Filters -->
        <div class="filter-group quick-filters-group">
          <div class="quick-filters">
            <v-btn
              :color="showToday ? 'primary' : 'secondary'"
              :variant="showToday ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-calendar-today"
              @click="toggleTodayFilter"
            >
              Aujourd'hui
            </v-btn>
            <v-btn
              :color="showUpcoming ? 'info' : 'secondary'"
              :variant="showUpcoming ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-calendar-arrow-right"
              @click="toggleUpcomingFilter"
            >
              À venir
            </v-btn>
            <v-btn
              :color="showOverdue ? 'error' : 'secondary'"
              :variant="showOverdue ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-alert-circle"
              @click="toggleOverdueFilter"
            >
              En retard
            </v-btn>
            <v-btn
              :color="showCompleted ? 'success' : 'secondary'"
              :variant="showCompleted ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-check-circle"
              @click="toggleCompletedFilter"
            >
              Complétés
            </v-btn>
            <v-btn
              color="secondary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-filter-off"
              @click="clearAllFilters"
            >
              Tout effacer
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { institutionsApi, usersApi } from "@/services/api"
import type { ReminderFilters } from "@/services/api/reminders"
import type { ReminderPriority, ReminderStatus } from "@medical-crm/shared"
import { onMounted, ref, watch } from "vue"

interface Props {
  filters: ReminderFilters
}

interface Emits {
  (e: "update:filters", filters: ReminderFilters): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localFilters = ref<ReminderFilters>({ ...props.filters })
const loadingUsers = ref(false)
const loadingInstitutions = ref(false)
const userOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const showToday = ref(false)
const showUpcoming = ref(false)
const showOverdue = ref(false)
const showCompleted = ref(false)

const priorityOptions = [
  {
    label: "Faible",
    value: "low" as ReminderPriority,
    color: "blue",
    icon: "mdi-information-outline"
  },
  {
    label: "Moyenne",
    value: "medium" as ReminderPriority,
    color: "orange",
    icon: "mdi-alert-circle-outline"
  },
  {
    label: "Haute",
    value: "high" as ReminderPriority,
    color: "red",
    icon: "mdi-alert"
  },
  {
    label: "Urgent",
    value: "urgent" as ReminderPriority,
    color: "purple",
    icon: "mdi-alert-octagon"
  },
]

const statusOptions = [
  {
    label: "En attente",
    value: "pending" as ReminderStatus,
    color: "grey",
    icon: "mdi-clock-outline"
  },
  {
    label: "Complété",
    value: "completed" as ReminderStatus,
    color: "success",
    icon: "mdi-check-circle"
  },
  {
    label: "Annulé",
    value: "cancelled" as ReminderStatus,
    color: "error",
    icon: "mdi-close-circle"
  },
]

watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = { ...newFilters }
    updateQuickFilterStates()
  },
  { deep: true }
)

const onFiltersChange = () => {
  // Reset quick filter states when manually changing filters
  updateQuickFilterStates()
  emit("update:filters", { ...localFilters.value })
}

const toggleTodayFilter = () => {
  showToday.value = !showToday.value
  showUpcoming.value = false
  showOverdue.value = false

  if (showToday.value) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    localFilters.value.dateFrom = today.toISOString().split('T')[0]
    localFilters.value.dateTo = tomorrow.toISOString().split('T')[0]
    localFilters.value.status = "pending"
  } else {
    delete localFilters.value.dateFrom
    delete localFilters.value.dateTo
    delete localFilters.value.status
  }

  onFiltersChange()
}

const toggleUpcomingFilter = () => {
  showUpcoming.value = !showUpcoming.value
  showToday.value = false
  showOverdue.value = false

  if (showUpcoming.value) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    localFilters.value.dateFrom = tomorrow.toISOString().split('T')[0]
    delete localFilters.value.dateTo
    localFilters.value.status = "pending"
  } else {
    delete localFilters.value.dateFrom
    delete localFilters.value.dateTo
    delete localFilters.value.status
  }

  onFiltersChange()
}

const toggleOverdueFilter = () => {
  showOverdue.value = !showOverdue.value
  showToday.value = false
  showUpcoming.value = false

  if (showOverdue.value) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    delete localFilters.value.dateFrom
    localFilters.value.dateTo = today.toISOString().split('T')[0]
    localFilters.value.status = "pending"
  } else {
    delete localFilters.value.dateFrom
    delete localFilters.value.dateTo
    delete localFilters.value.status
  }

  onFiltersChange()
}

const toggleCompletedFilter = () => {
  showCompleted.value = !showCompleted.value

  if (showCompleted.value) {
    localFilters.value.status = "completed"
  } else {
    delete localFilters.value.status
  }

  onFiltersChange()
}

const clearAllFilters = () => {
  localFilters.value = {}
  showToday.value = false
  showUpcoming.value = false
  showOverdue.value = false
  showCompleted.value = false
  onFiltersChange()
}

const updateQuickFilterStates = () => {
  // Update quick filter button states based on current filters
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  showToday.value =
    localFilters.value.dateFrom === today.toISOString().split('T')[0] &&
    localFilters.value.dateTo === tomorrow.toISOString().split('T')[0] &&
    localFilters.value.status === "pending"

  showUpcoming.value =
    localFilters.value.dateFrom === tomorrow.toISOString().split('T')[0] &&
    !localFilters.value.dateTo &&
    localFilters.value.status === "pending"

  showOverdue.value =
    !localFilters.value.dateFrom &&
    localFilters.value.dateTo === today.toISOString().split('T')[0] &&
    localFilters.value.status === "pending"

  showCompleted.value = localFilters.value.status === "completed"
}

const loadUsers = async () => {
  try {
    loadingUsers.value = true
    const response = await usersApi.getAll()
    const usersData = (response as any).data || response

    let usersArray: any[] = []
    if (Array.isArray(usersData)) {
      usersArray = usersData
    } else if (usersData && Array.isArray(usersData.users)) {
      usersArray = usersData.users
    }

    userOptions.value = usersArray.map((user: any) => ({
      label: `${user.firstName} ${user.lastName}`,
      value: user.id,
    }))
  } catch (error) {
    console.error("Error loading users:", error)
    userOptions.value = []
  } finally {
    loadingUsers.value = false
  }
}

const loadInstitutions = async () => {
  try {
    loadingInstitutions.value = true
    const response = await institutionsApi.getAll()
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
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  } finally {
    loadingInstitutions.value = false
  }
}

onMounted(() => {
  loadUsers()
  loadInstitutions()
  updateQuickFilterStates()
})
</script>

<style scoped>
.reminder-filters {
  margin-bottom: 1.5rem;
}

.filters-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filters-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quick-filters-group {
  grid-column: span 2;
}

.quick-filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  height: 100%;
}

@media (max-width: 1024px) {
  .filters-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-filters-group {
    grid-column: span 2;
  }
}

@media (max-width: 768px) {
  .filters-row {
    grid-template-columns: 1fr;
  }

  .quick-filters-group {
    grid-column: 1;
  }

  .quick-filters {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .quick-filters .v-btn {
    flex: 1;
    min-width: fit-content;
  }
}

@media (max-width: 480px) {
  .quick-filters {
    flex-direction: column;
    width: 100%;
  }

  .quick-filters .v-btn {
    width: 100%;
  }
}
</style>
