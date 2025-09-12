<template>
  <AppLayout>
    <div class="medical-institutions-view">
      <!-- Header Section -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-main">
            <div class="title-section">
              <div class="title-icon">
                <v-avatar color="primary" variant="flat" size="56">
                  <v-icon size="28" color="white">mdi-hospital-building</v-icon>
                </v-avatar>
              </div>
              <div class="title-text">
                <h1 class="header-title">{{ t("institutions.title") }}</h1>
                <p class="header-subtitle">
                  {{ t("institutions.subtitle") }}
                </p>
              </div>
            </div>

            <div class="header-actions">
              <v-btn
                variant="outlined"
                prepend-icon="mdi-upload"
                class="action-btn"
                @click="showImportDialog = true"
                >{{ t("institutions.importCSV") }}</v-btn
              >
              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                variant="elevated"
                class="action-btn primary-btn"
                @click="showCreateDialog = true"
                >{{ t("institutions.addInstitution") }}</v-btn
              >
            </div>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="stats-cards">
          <v-card class="stats-card" variant="tonal">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">{{ totalRecords }}</div>
                  <div class="text-caption text-medium-emphasis">Institutions Totales</div>
                </div>
                <v-icon color="primary" size="32">mdi-hospital-building</v-icon>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stats-card" variant="tonal" color="success">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">
                    {{ institutions.filter((i) => i.isActive).length }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Actives</div>
                </div>
                <v-icon color="success" size="32">mdi-check-circle</v-icon>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stats-card" variant="tonal" color="warning">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">
                    {{
                      institutions.filter(
                        (i) => i.medicalProfile?.complianceStatus === "pending_review"
                      ).length
                    }}
                  </div>
                  <div class="text-caption text-medium-emphasis">En Attente</div>
                </div>
                <v-icon color="warning" size="32">mdi-clock-alert</v-icon>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stats-card" variant="tonal" color="error">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">
                    {{
                      institutions.filter(
                        (i) => i.medicalProfile?.complianceStatus === "non_compliant"
                      ).length
                    }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Non Conformes</div>
                </div>
                <v-icon color="error" size="32">mdi-alert-circle</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <v-card class="filters-card mb-6" variant="outlined">
        <v-card-text class="pa-4">
          <div class="d-flex flex-wrap align-center gap-4">
            <v-text-field
              v-model="searchQuery"
              :label="t('institutions.searchInstitutions')"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              class="search-field flex-grow-1"
              @input="onSearchInput"
            />
            <v-btn
              variant="text"
              color="primary"
              @click="showAdvancedFilters = !showAdvancedFilters"
            >
              <v-icon start>{{ showAdvancedFilters ? "mdi-filter-variant-minus" : "mdi-filter-variant" }}</v-icon>
              Filtres avancés
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              color="grey"
              @click="clearFilters"
              :disabled="!hasActiveFilters"
              >Effacer les filtres</v-btn
            >
          </div>

          <v-expand-transition>
            <div v-if="showAdvancedFilters" class="advanced-filters mt-4 pt-4 border-t">
              <v-row dense>
                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="filters.type"
                    :items="institutionTypeOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('institutions.type')"
                    variant="outlined"
                    density="compact"
                    clearable
                    hide-details
                    @update:model-value="applyFilters"
                  />
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-text-field
                    v-model="filters.city"
                    :label="t('institutions.city')"
                    variant="outlined"
                    density="compact"
                    clearable
                    hide-details
                    @input="onFilterInput"
                  />
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="filters.assignedUserId"
                    :items="userOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('institutions.assignedTo')"
                    variant="outlined"
                    density="compact"
                    clearable
                    hide-details
                    :loading="loadingUsers"
                    @update:model-value="applyFilters"
                  />
                </v-col>
                <v-col cols="12" sm="6" md="3">
                  <v-select
                    v-model="filters.complianceStatus"
                    :items="complianceStatusOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('institutions.complianceStatus')"
                    variant="outlined"
                    density="compact"
                    clearable
                    hide-details
                    @update:model-value="applyFilters"
                  />
                </v-col>
              </v-row>
            </div>
          </v-expand-transition>
        </v-card-text>
      </v-card>

      <!-- Desktop Data Table -->
      <v-card class="data-table-card d-none d-md-block" variant="flat">
        <v-data-table
          :items="institutions"
          :loading="loading"
          :items-per-page="lazyParams.rows"
          :page="Math.floor(lazyParams.first / lazyParams.rows) + 1"
          :headers="tableHeaders"
          :items-length="totalRecords"
          item-key="id"
          class="elevation-0 enhanced-table"
          @update:page="(p) => { lazyParams.first = (p - 1) * lazyParams.rows; loadInstitutions(); }"
        >
          <template #no-data>
            <div class="table-empty-state text-center py-12">
              <v-icon size="64" class="mb-4 empty-icon">mdi-domain-off</v-icon>
              <div class="text-h6 mb-2 empty-title">{{ t("institutions.noInstitutionsFound") }}</div>
              <div class="text-body-1 empty-subtitle">{{ t("institutions.adjustSearchOrAdd") }}</div>
            </div>
          </template>

          <template #item.name="{ item }">
            <div class="d-flex align-center py-2 cursor-pointer" @click="viewInstitution(item)">
              <v-avatar size="40" class="mr-4" :color="getInstitutionColor(item.type)" variant="tonal">
                <v-icon size="20">{{ getInstitutionIcon(item.type) }}</v-icon>
              </v-avatar>
              <div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-4">{{ item.name }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ formatInstitutionType(item.type) }}</div>
              </div>
            </div>
          </template>

          <template #item.location="{ item }">
            <div class="text-body-2 text-grey-darken-2">
              {{ item.address.city }}, {{ item.address.state }}
            </div>
            <div class="text-caption text-medium-emphasis">{{ item.address.country }}</div>
          </template>

          <template #item.profile="{ item }">
            <div v-if="item.medicalProfile" class="d-flex flex-wrap gap-2">
              <v-chip v-if="item.medicalProfile?.bedCapacity" size="small" variant="tonal" color="blue-grey" prepend-icon="mdi-bed">
                {{ item.medicalProfile.bedCapacity }}
              </v-chip>
              <v-chip v-if="item.medicalProfile?.surgicalRooms" size="small" variant="tonal" color="blue-grey" prepend-icon="mdi-medical-bag">
                {{ item.medicalProfile.surgicalRooms }}
              </v-chip>
            </div>
            <div v-else class="text-caption text-medium-emphasis">{{ t("institutions.noMedicalProfile") }}</div>
          </template>

          <template #item.status="{ item }">
            <div class="d-flex align-center">
              <v-chip :color="item.isActive ? 'success' : 'grey'" variant="flat" size="small">
                {{ item.isActive ? t("institutions.active") : t("institutions.inactive") }}
              </v-chip>
            </div>
          </template>

          <template #item.actions="{ item }">
            <div class="actions-container">
              <v-btn icon="mdi-pencil" variant="text" size="small" @click="editInstitution(item)" title="Modifier" />
              <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="confirmDelete(item)" title="Supprimer" />
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Mobile Cards List -->
      <div class="mobile-cards-container d-md-none">
        <div v-if="!loading && institutions.length === 0" class="empty-state">
          <div class="text-center py-12">
            <v-icon size="64" class="mb-4" color="grey-lighten-2">mdi-domain-off</v-icon>
            <h3 class="text-h6 mb-2">{{ t("institutions.noInstitutionsFound") }}</h3>
            <p class="text-body-1 text-medium-emphasis">{{ t("institutions.adjustSearchOrAdd") }}</p>
          </div>
        </div>

        <div class="mobile-cards-list">
          <v-card v-for="institution in institutions" :key="institution.id" class="institution-card mb-3" variant="outlined" @click="viewInstitution(institution)">
            <v-card-text class="pa-4">
              <div class="d-flex justify-space-between align-start">
                <div class="d-flex align-start">
                  <v-avatar size="48" :color="getInstitutionColor(institution.type)" variant="tonal" class="mr-4">
                    <v-icon size="24">{{ getInstitutionIcon(institution.type) }}</v-icon>
                  </v-avatar>
                  <div>
                    <h3 class="institution-name">{{ institution.name }}</h3>
                    <div class="text-body-2 text-medium-emphasis">{{ institution.address.city }}, {{ institution.address.state }}</div>
                  </div>
                </div>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text" size="small" @click.stop></v-btn>
                  </template>
                  <v-list>
                    <v-list-item @click.stop="editInstitution(institution)" prepend-icon="mdi-pencil">Modifier</v-list-item>
                    <v-list-item @click.stop="confirmDelete(institution)" prepend-icon="mdi-delete" class="text-error">Supprimer</v-list-item>
                  </v-list>
                </v-menu>
              </div>
              <div class="d-flex flex-wrap gap-2 mt-3">
                <v-chip size="small" variant="tonal" :color="getInstitutionColor(institution.type)">{{ formatInstitutionType(institution.type) }}</v-chip>
                <v-chip :color="institution.isActive ? 'success' : 'grey'" variant="tonal" size="small">{{ institution.isActive ? 'Actif' : 'Inactif' }}</v-chip>
                <v-chip v-if="institution.medicalProfile" :color="getComplianceSeverity(institution.medicalProfile.complianceStatus)" variant="tonal" size="small">
                  {{ formatComplianceStatus(institution.medicalProfile.complianceStatus) }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <div v-if="totalRecords > lazyParams.rows" class="mobile-pagination mt-4">
          <v-pagination :model-value="Math.floor(lazyParams.first / lazyParams.rows) + 1" :length="Math.ceil(totalRecords / lazyParams.rows)" :total-visible="3" @update:model-value="(p) => { lazyParams.first = (p - 1) * lazyParams.rows; loadInstitutions(); }" />
        </div>
      </div>

      <!-- Dialogs and Snackbars -->
      <v-dialog v-model="showCreateDialog" max-width="900">
        <v-card>
          <v-card-title>{{ t("institutions.addNewInstitution") }}</v-card-title>
          <v-card-text>
            <MedicalInstitutionForm @institution-saved="onInstitutionCreated" @cancel="showCreateDialog = false" />
          </v-card-text>
        </v-card>
      </v-dialog>

      <ImportInstitutionsDialog v-model="showImportDialog" @completed="onImportCompleted" />

      <v-dialog v-model="confirmVisible" max-width="420">
        <v-card>
          <v-card-title>{{ t("institutions.deleteConfirmation") }}</v-card-title>
          <v-card-text>{{ confirmMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="confirmVisible = false">{{ t("common.cancel") }}</v-btn>
            <v-btn color="error" @click="confirmAccept">{{ t("common.delete") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
        {{ snackbar.message }}
      </v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import ImportInstitutionsDialog from "@/components/institutions/ImportInstitutionsDialog.vue"
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionFormVuetify.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { institutionsApi, usersApi } from "@/services/api"
import type {
  ComplianceStatus,
  InstitutionType,
  MedicalInstitution,
  MedicalInstitutionSearchFilters,
} from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

const router = useRouter()
const { t } = useI18n()

const snackbar = ref<{ visible: boolean; color: string; message: string }>({ visible: false, color: "info", message: "" })
const showSnackbar = (message: string, color: string = "info") => { snackbar.value = { visible: true, color, message } }
const confirmVisible = ref(false)
const confirmMessage = ref("")
const confirmTarget = ref<MedicalInstitution | null>(null)
const confirmAccept = () => {
  confirmVisible.value = false
  if (confirmTarget.value) void deleteInstitution(confirmTarget.value)
}

const onImportCompleted = () => {
  showImportDialog.value = false
  showSnackbar(t("institutions.importCompleted"), "success")
  loadInstitutions()
}

const institutions = ref<MedicalInstitution[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const searchQuery = ref("")
const showAdvancedFilters = ref(false)
const showCreateDialog = ref(false)
const showImportDialog = ref(false)

const lazyParams = ref({ first: 0, rows: 10, sortField: "name", sortOrder: 1 })

const filters = ref<MedicalInstitutionSearchFilters>({})

const institutionTypeOptions = computed(() => [ ... ]) // Keep existing options
const complianceStatusOptions = computed(() => [ ... ])
const specialtyOptions = computed(() => [ ... ])
const userOptions = ref<Array<{ label: string; value: string }>>([])
const loadingUsers = ref(false)

const hasActiveFilters = computed(() => Object.values(filters.value).some(v => v) || searchQuery.value)

const activeFilters = computed(() => {
  const active: MedicalInstitutionSearchFilters = { ...filters.value }
  if (searchQuery.value) active.name = searchQuery.value
  return active
})

const loadUsers = async () => { ... } // Keep existing logic

const loadInstitutions = async () => {
  loading.value = true
  try {
    const params = {
      ...activeFilters.value,
      page: Math.floor(lazyParams.value.first / lazyParams.value.rows) + 1,
      limit: lazyParams.value.rows,
      sortBy: lazyParams.value.sortField,
      sortOrder: lazyParams.value.sortOrder === 1 ? "asc" : "desc",
    }
    const response = await institutionsApi.getAll(params)
    const payload: any = response
    if (payload?.success && payload.data) {
      institutions.value = payload.data.institutions || []
      totalRecords.value = payload.data.pagination?.total || payload.data.total || 0
    } else {
      institutions.value = payload.data || []
      totalRecords.value = payload.meta?.total || 0
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
    showSnackbar(t("institutions.failedToLoad"), "error")
  } finally {
    loading.value = false
  }
}

let searchTimeout = ref<any>(null)
const onSearchInput = () => {
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(applyFilters, 500)
}

let filterTimeout = ref<any>(null)
const onFilterInput = () => {
  clearTimeout(filterTimeout.value)
  filterTimeout.value = setTimeout(applyFilters, 800)
}

const applyFilters = () => {
  lazyParams.value.first = 0
  loadInstitutions()
}

const clearFilters = () => {
  searchQuery.value = ""
  filters.value = {}
  applyFilters()
}

const refreshData = () => loadInstitutions()

const exportData = () => showSnackbar(t("institutions.exportComingSoon"), "info")

const viewInstitution = (institution: MedicalInstitution) => router.push(`/institutions/${institution.id}`)

const editInstitution = (institution: MedicalInstitution) => router.push(`/institutions/${institution.id}?edit=true`)

const confirmDelete = (institution: MedicalInstitution) => {
  confirmMessage.value = t("institutions.deleteConfirmMessage", { name: institution.name })
  confirmTarget.value = institution
  confirmVisible.value = true
}

const deleteInstitution = async (institution: MedicalInstitution) => {
  try {
    await institutionsApi.delete(institution.id)
    showSnackbar(t("institutions.institutionDeleted", { name: institution.name }), "success")
    loadInstitutions()
  } catch (error) {
    console.error("Error deleting institution:", error)
    showSnackbar(t("institutions.failedToDelete"), "error")
  }
}

const onInstitutionCreated = (newInstitution: MedicalInstitution) => {
  showCreateDialog.value = false
  loadInstitutions()
  showSnackbar(t("institutions.institutionCreated", { name: newInstitution.name }), "success")
}

// Utility functions (keep existing)
const formatInstitutionType = (type: InstitutionType): string => { ... }
const formatComplianceStatus = (status: ComplianceStatus): string => { ... }
const getComplianceSeverity = (status: ComplianceStatus): string => { ... }
const getInstitutionColor = (type: InstitutionType): string => { ... }
const getInstitutionIcon = (type: InstitutionType): string => { ... }

const tableHeaders = computed(() => [ ... ] as const)

onMounted(() => {
  loadInstitutions()
  loadUsers()
})
</script>

<style scoped>
.medical-institutions-view {
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  padding: 1.5rem;
  border-radius: 16px;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-title {
  font-size: 1.75rem;
  font-weight: 700;
}

.header-subtitle {
  color: rgb(var(--v-theme-on-surface-variant));
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.filters-card {
  border-radius: 12px;
}

.search-field {
  max-width: 400px;
}

.advanced-filters {
  border-top: 1px solid rgba(var(--v-theme-outline), 0.2);
}

.enhanced-table :deep(tbody tr) {
  transition: background-color 0.2s ease;
}

.enhanced-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.04);
}

.enhanced-table :deep(.v-data-table__td) {
  padding-top: 1rem;
  padding-bottom: 1rem;
}

.institution-name {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.mobile-cards-list .institution-card {
  border-radius: 12px;
}

.mobile-cards-list .institution-name {
  font-size: 1.1rem;
  font-weight: 600;
}

@media (max-width: 960px) {
  .medical-institutions-view {
    padding: 1rem;
  }
  .header-main, .title-section {
    flex-direction: column;
    align-items: start;
    gap: 1rem;
  }
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>