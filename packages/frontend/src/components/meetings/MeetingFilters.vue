<template>
  <v-card class="meeting-filters" variant="outlined">
    <v-card-text class="filters-container">
      <div class="filters-row">
        <!-- Search -->
        <div class="filter-group">
          <v-text-field
            v-model="localFilters.search"
            label="Rechercher"
            placeholder="Rechercher une réunion..."
            prepend-inner-icon="mdi-magnify"
            @input="onFiltersChange"
            density="comfortable"
            variant="outlined"
            clearable
          />
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
            prepend-inner-icon="mdi-traffic-light"
            @update:modelValue="onFiltersChange"
            clearable
            density="comfortable"
            variant="outlined"
          />
        </div>

        <!-- Organizer Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.organizerId"
            :items="userOptions"
            item-title="label"
            item-value="value"
            :label="t('meetings.status.scheduled')"
            placeholder="All organizers"
            prepend-inner-icon="mdi-account"
            @update:modelValue="onFiltersChange"
            clearable
            :loading="loadingUsers"
            density="comfortable"
            variant="outlined"
          />
        </div>

        <!-- Institution Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.institutionId"
            :items="institutionOptions"
            item-title="label"
            item-value="value"
            :label="t('institution.name')"
            placeholder="All institutions"
            prepend-inner-icon="mdi-office-building"
            @update:modelValue="onFiltersChange"
            clearable
            :loading="loadingInstitutions"
            density="comfortable"
            variant="outlined"
          />
        </div>
      </div>

      <div class="filters-row">
        <!-- Date Range -->
        <div class="filter-group">
          <v-text-field
            v-model="localFilters.startDateFrom"
            :label="t('segmentation.filters.dateRange.startDate')"
            placeholder="Start date"
            type="date"
            prepend-inner-icon="mdi-calendar-start"
            @change="onFiltersChange"
            density="comfortable"
            variant="outlined"
            clearable
          />
        </div>

        <div class="filter-group">
          <v-text-field
            v-model="localFilters.startDateTo"
            :label="t('segmentation.filters.dateRange.endDate')"
            placeholder="End date"
            type="date"
            prepend-inner-icon="mdi-calendar-end"
            @change="onFiltersChange"
            density="comfortable"
            variant="outlined"
            clearable
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
              {{ t('time.today') }}
            </v-btn>
            <v-btn
              :color="showUpcoming ? 'info' : 'secondary'"
              :variant="showUpcoming ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-calendar-clock"
              @click="toggleUpcomingFilter"
            >
              {{ t('common.next') }}
            </v-btn>
            <v-btn
              color="secondary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-filter-off"
              @click="clearAllFilters"
            >
              Clear all
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { institutionsApi, usersApi } from "@/services/api"
import type { MeetingFilters } from "@/services/api/meetings"
import { onMounted, ref, watch, computed } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  filters: MeetingFilters
}

interface Emits {
  (e: "update:filters", filters: MeetingFilters): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const localFilters = ref<MeetingFilters>({ ...props.filters })
const loadingUsers = ref(false)
const loadingInstitutions = ref(false)
const userOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const showToday = ref(false)
const showUpcoming = ref(false)

const statusOptions = computed(() => [
  { label: t('meetings.status.scheduled'), value: "scheduled" },
  { label: t('meetings.status.in_progress'), value: "in_progress" },
  { label: t('meetings.status.completed'), value: "completed" },
  { label: t('meetings.status.cancelled'), value: "cancelled" },
])

watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = { ...newFilters }
    // Update quick filter states based on filters
    updateQuickFilterStates()
  },
  { deep: true }
)

const onFiltersChange = () => {
  // Reset quick filters if date range is manually changed
  if (localFilters.value.startDateFrom || localFilters.value.startDateTo) {
    showToday.value = false
    showUpcoming.value = false
  }
  emit("update:filters", { ...localFilters.value })
}

const toggleTodayFilter = () => {
  showToday.value = !showToday.value
  showUpcoming.value = false

  if (showToday.value) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    localFilters.value.startDateFrom = formatDateForInput(today)
    localFilters.value.startDateTo = formatDateForInput(tomorrow)
  } else {
    delete localFilters.value.startDateFrom
    delete localFilters.value.startDateTo
  }

  onFiltersChange()
}

const toggleUpcomingFilter = () => {
  showUpcoming.value = !showUpcoming.value
  showToday.value = false

  if (showUpcoming.value) {
    const now = new Date()
    localFilters.value.startDateFrom = formatDateForInput(now)
    delete localFilters.value.startDateTo
    localFilters.value.status = "scheduled"
  } else {
    delete localFilters.value.startDateFrom
    delete localFilters.value.startDateTo
    delete localFilters.value.status
  }

  onFiltersChange()
}

const clearAllFilters = () => {
  localFilters.value = {}
  showToday.value = false
  showUpcoming.value = false
  onFiltersChange()
}

const updateQuickFilterStates = () => {
  // This function checks if current filters match quick filter states
  // and updates the button states accordingly
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatDateForInput(today)

  if (localFilters.value.startDateFrom === todayStr) {
    showToday.value = true
    showUpcoming.value = false
  } else if (localFilters.value.startDateFrom && !localFilters.value.startDateTo) {
    showUpcoming.value = true
    showToday.value = false
  }
}

const loadUsers = async () => {
  try {
    loadingUsers.value = true
    const response = await usersApi.getAll()
    const usersData = (response as any).data || response

    // Handle paginated response for users
    let usersArray: any[] = []
    if (Array.isArray(usersData)) {
      usersArray = usersData
    } else if (usersData && Array.isArray(usersData.users)) {
      usersArray = usersData.users
    } else {
      console.warn("Users API response format unexpected:", usersData)
      usersArray = []
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

// Helper function to format date for input
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

onMounted(() => {
  loadUsers()
  loadInstitutions()
  updateQuickFilterStates()
})
</script>

<style scoped>
.meeting-filters {
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
