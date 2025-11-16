<template>
  <v-card class="call-filters" variant="outlined">
    <v-card-text class="filters-container">
      <div class="filters-row">
        <!-- Search -->
        <div class="filter-group">
          <v-text-field
            v-model="localFilters.search"
            label="Rechercher"
            placeholder="Rechercher un appel..."
            prepend-inner-icon="mdi-magnify"
            @input="onFiltersChange"
            density="comfortable"
            variant="outlined"
            clearable
          />
        </div>

        <!-- Call Type Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.callType"
            :items="callTypeOptions"
            item-title="label"
            item-value="value"
            :label="t('calls.typeField')"
            placeholder="All types"
            prepend-inner-icon="mdi-phone-log"
            @update:modelValue="onFiltersChange"
            clearable
            density="comfortable"
            variant="outlined"
          />
        </div>

        <!-- User Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.userId"
            :items="userOptions"
            item-title="label"
            item-value="value"
            :label="t('contact.firstName')"
            placeholder="All users"
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
            v-model="localFilters.dateFrom"
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
            v-model="localFilters.dateTo"
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
              :color="showMissed ? 'error' : 'secondary'"
              :variant="showMissed ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-phone-missed"
              @click="toggleMissedFilter"
            >
              Missed calls
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
import type { CallFilters } from "@/services/api/calls"
import { onMounted, ref, watch, computed } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  filters: CallFilters
}

interface Emits {
  (e: "update:filters", filters: CallFilters): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const localFilters = ref<CallFilters>({ ...props.filters })
const loadingUsers = ref(false)
const loadingInstitutions = ref(false)
const userOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const showToday = ref(false)
const showMissed = ref(false)

const callTypeOptions = computed(() => [
  { label: t('calls.direction.inbound'), value: "incoming" },
  { label: t('calls.direction.outbound'), value: "outgoing" },
  { label: "Missed", value: "missed" },
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
  // Reset quick filters if date range or call type is manually changed
  if (localFilters.value.dateFrom || localFilters.value.dateTo) {
    showToday.value = false
  }
  if (localFilters.value.callType && localFilters.value.callType !== "missed") {
    showMissed.value = false
  }
  emit("update:filters", { ...localFilters.value })
}

const toggleTodayFilter = () => {
  showToday.value = !showToday.value

  if (showToday.value) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    localFilters.value.dateFrom = formatDateForInput(today)
    localFilters.value.dateTo = formatDateForInput(tomorrow)
  } else {
    delete localFilters.value.dateFrom
    delete localFilters.value.dateTo
  }

  onFiltersChange()
}

const toggleMissedFilter = () => {
  showMissed.value = !showMissed.value

  if (showMissed.value) {
    localFilters.value.callType = "missed"
  } else {
    delete localFilters.value.callType
  }

  onFiltersChange()
}

const clearAllFilters = () => {
  localFilters.value = {}
  showToday.value = false
  showMissed.value = false
  onFiltersChange()
}

const updateQuickFilterStates = () => {
  // This function checks if current filters match quick filter states
  // and updates the button states accordingly
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatDateForInput(today)

  if (localFilters.value.dateFrom === todayStr) {
    showToday.value = true
  }

  if (localFilters.value.callType === "missed") {
    showMissed.value = true
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
.call-filters {
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
