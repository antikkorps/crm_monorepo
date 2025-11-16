<template>
  <v-card class="note-filters" variant="outlined">
    <v-card-text class="filters-container">
      <div class="filters-row">
        <!-- Search -->
        <div class="filter-group">
          <v-text-field
            v-model="localFilters.search"
            label="Rechercher"
            placeholder="Rechercher dans les notes..."
            prepend-inner-icon="mdi-magnify"
            @input="onFiltersChange"
            density="comfortable"
            variant="outlined"
            clearable
          />
        </div>

        <!-- Tags Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.tags"
            :items="availableTags"
            label="Tags"
            placeholder="Filtrer par tags"
            prepend-inner-icon="mdi-tag-multiple"
            @update:modelValue="onFiltersChange"
            clearable
            multiple
            chips
            density="comfortable"
            variant="outlined"
          />
        </div>

        <!-- Creator Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.creatorId"
            :items="userOptions"
            item-title="label"
            item-value="value"
            label="Créateur"
            placeholder="Tous les créateurs"
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
      </div>

      <div class="filters-row">
        <!-- Privacy Filter -->
        <div class="filter-group">
          <v-select
            v-model="localFilters.isPrivate"
            :items="privacyOptions"
            item-title="label"
            item-value="value"
            label="Confidentialité"
            placeholder="Toutes les notes"
            prepend-inner-icon="mdi-lock-outline"
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
              :color="showMyNotes ? 'primary' : 'secondary'"
              :variant="showMyNotes ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-account"
              @click="toggleMyNotesFilter"
            >
              Mes notes
            </v-btn>
            <v-btn
              :color="showShared ? 'primary' : 'secondary'"
              :variant="showShared ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-share-variant"
              @click="toggleSharedFilter"
            >
              Partagées avec moi
            </v-btn>
            <v-btn
              :color="showPrivate ? 'error' : 'secondary'"
              :variant="showPrivate ? 'elevated' : 'outlined'"
              size="small"
              prepend-icon="mdi-lock"
              @click="togglePrivateFilter"
            >
              Notes privées
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
import type { NoteFilters } from "@/services/api/notes"
import { useAuthStore } from "@/stores/auth"
import { onMounted, ref, watch, computed } from "vue"

interface Props {
  filters: NoteFilters
  availableTags?: string[]
}

interface Emits {
  (e: "update:filters", filters: NoteFilters): void
}

const props = withDefaults(defineProps<Props>(), {
  availableTags: () => [],
})
const emit = defineEmits<Emits>()

const authStore = useAuthStore()
const localFilters = ref<NoteFilters>({ ...props.filters })
const loadingUsers = ref(false)
const loadingInstitutions = ref(false)
const userOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const showMyNotes = ref(false)
const showShared = ref(false)
const showPrivate = ref(false)

const privacyOptions = [
  { label: "Notes privées", value: true },
  { label: "Notes partagées", value: false },
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
  // Reset quick filters if filters are manually changed
  if (localFilters.value.isPrivate !== undefined) {
    showPrivate.value = localFilters.value.isPrivate === true
  }

  emit("update:filters", { ...localFilters.value })
}

const toggleMyNotesFilter = () => {
  showMyNotes.value = !showMyNotes.value
  showShared.value = false

  if (showMyNotes.value && authStore.user) {
    localFilters.value.creatorId = authStore.user.id
    delete localFilters.value.sharedWithUserId
  } else {
    delete localFilters.value.creatorId
  }

  onFiltersChange()
}

const toggleSharedFilter = () => {
  showShared.value = !showShared.value
  showMyNotes.value = false

  if (showShared.value && authStore.user) {
    localFilters.value.sharedWithUserId = authStore.user.id
    delete localFilters.value.creatorId
  } else {
    delete localFilters.value.sharedWithUserId
  }

  onFiltersChange()
}

const togglePrivateFilter = () => {
  showPrivate.value = !showPrivate.value

  if (showPrivate.value) {
    localFilters.value.isPrivate = true
  } else {
    delete localFilters.value.isPrivate
  }

  onFiltersChange()
}

const clearAllFilters = () => {
  localFilters.value = {}
  showMyNotes.value = false
  showShared.value = false
  showPrivate.value = false
  onFiltersChange()
}

const updateQuickFilterStates = () => {
  // Update quick filter button states based on current filters
  if (authStore.user) {
    showMyNotes.value = localFilters.value.creatorId === authStore.user.id
    showShared.value = localFilters.value.sharedWithUserId === authStore.user.id
  }
  showPrivate.value = localFilters.value.isPrivate === true
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
.note-filters {
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
