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

            <div id="tour-institutions-actions" class="header-actions">
              <v-btn
                id="tour-institutions-import"
                variant="outlined"
                prepend-icon="mdi-upload"
                class="action-btn"
                @click="showImportDialog = true"
                >{{ t("institutions.importCSV") }}</v-btn
              >
              <v-btn
                id="tour-institutions-add"
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
        <div id="tour-institutions-stats" class="stats-cards">
          <v-card class="stats-card" variant="tonal">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">{{ stats.total }}</div>
                  <div class="text-caption text-medium-emphasis">
                    Institutions Totales
                  </div>
                </div>
                <v-icon color="primary" size="32">mdi-hospital-building</v-icon>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stats-card" variant="tonal" color="success">
            <v-card-text class="pa-4">
              <div class="d-flex align-center justify-space-between">
                <div>
                  <div class="text-h5 font-weight-bold">{{ stats.active }}</div>
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
                  <div class="text-h5 font-weight-bold">{{ stats.pendingReview }}</div>
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
                  <div class="text-h5 font-weight-bold">{{ stats.nonCompliant }}</div>
                  <div class="text-caption text-medium-emphasis">Non Conformes</div>
                </div>
                <v-icon color="error" size="32">mdi-alert-circle</v-icon>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Search and Filter Section -->
      <v-card id="tour-institutions-filters" class="filters-card mb-6" variant="outlined">
        <v-card-text class="pa-4">
          <div class="d-flex flex-wrap align-center gap-4">
            <v-text-field
              id="tour-institutions-search"
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
              id="tour-institutions-advanced-filters"
              variant="text"
              color="primary"
              @click="showAdvancedFilters = !showAdvancedFilters"
            >
              <v-icon start>{{
                showAdvancedFilters ? "mdi-filter-variant-minus" : "mdi-filter-variant"
              }}</v-icon>
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
                <v-col cols="12" sm="6" md="3">
                  <v-switch
                    v-model="showInactive"
                    label="Afficher les inactives"
                    color="primary"
                    density="compact"
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
      <v-card id="tour-institutions-table" class="data-table-card d-none d-md-block" variant="flat">
        <TableSkeleton
          v-if="loading && institutions.length === 0"
          :rows="lazyParams.rows"
          :columns="7"
          toolbar
          pagination
        />
        <v-data-table
          v-else
          :items="institutions"
          :loading="loading && institutions.length > 0"
          :items-per-page="lazyParams.rows"
          :page="Math.floor(lazyParams.first / lazyParams.rows) + 1"
          :headers="tableHeaders"
          :items-length="totalRecords"
          item-key="id"
          class="elevation-0 enhanced-table"
          :item-class="(item) => item.isActive ? '' : 'inactive-institution'"
          @update:page="onPageChange"
          @update:items-per-page="onItemsPerPageChange"
          @update:sort-by="onSortChange"
        >
          <template #no-data>
            <div class="table-empty-state text-center py-12">
              <v-icon size="64" class="mb-4 empty-icon">mdi-domain-off</v-icon>
              <div class="text-h6 mb-2 empty-title">
                {{ t("institutions.noInstitutionsFound") }}
              </div>
              <div class="text-body-1 empty-subtitle">
                {{ t("institutions.adjustSearchOrAdd") }}
              </div>
            </div>
          </template>

          <template #item.name="{ item }">
            <div
              class="d-flex align-center py-2 cursor-pointer"
              @click="viewInstitution(item)"
            >
              <v-avatar
                size="40"
                class="mr-4"
                :color="getInstitutionColor(item.type)"
                variant="tonal"
              >
                <v-icon size="20">{{ getInstitutionIcon(item.type) }}</v-icon>
              </v-avatar>
              <div>
                <div class="text-subtitle-1 font-weight-bold text-grey-darken-4">
                  {{ item.name }}
                </div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ formatInstitutionType(item.type) }}
                </div>
              </div>
            </div>
          </template>

          <template #item.location="{ item }">
            <div class="text-body-2 text-grey-darken-2">
              {{ item.address.city }}, {{ item.address.state }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ item.address.country }}
            </div>
          </template>

          <template #item.profile="{ item }">
            <div v-if="item.medicalProfile" class="d-flex flex-wrap gap-2">
              <v-chip
                v-if="item.medicalProfile?.bedCapacity"
                size="small"
                variant="tonal"
                color="blue-grey"
                prepend-icon="mdi-bed"
              >
                {{ item.medicalProfile.bedCapacity }}
              </v-chip>
              <v-chip
                v-if="item.medicalProfile?.surgicalRooms"
                size="small"
                variant="tonal"
                color="blue-grey"
                prepend-icon="mdi-medical-bag"
              >
                {{ item.medicalProfile.surgicalRooms }}
              </v-chip>
            </div>
            <div v-else class="text-caption text-medium-emphasis">
              {{ t("institutions.noMedicalProfile") }}
            </div>
          </template>

          <template #item.status="{ item }">
            <div class="d-flex align-center">
              <v-chip
                :color="item.isActive ? 'success' : 'grey'"
                variant="flat"
                size="small"
              >
                {{
                  item.isActive ? t("institutions.active") : t("institutions.inactive")
                }}
              </v-chip>
            </div>
          </template>

          <template #item.primaryContact="{ item }">
            <div v-if="item.contactPersons && item.contactPersons.length > 0">
              <!-- Contact principal -->
              <template v-for="contact in item.contactPersons" :key="contact.id">
                <div v-if="contact.isPrimary" class="contact-info">
                  <div class="text-subtitle-2 font-weight-medium">
                    {{ contact.firstName }} {{ contact.lastName }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ contact.title }}
                  </div>
                </div>
              </template>
              <!-- Si pas de contact principal, prendre le premier -->
              <div
                v-if="!item.contactPersons.some((c) => c.isPrimary)"
                class="contact-info"
              >
                <div class="text-subtitle-2 font-weight-medium">
                  {{ item.contactPersons[0]?.firstName }}
                  {{ item.contactPersons[0]?.lastName }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.contactPersons[0]?.title }} (par défaut)
                </div>
              </div>
            </div>
            <div v-else class="text-caption text-medium-emphasis">Aucun contact</div>
          </template>

          <template #item.actions="{ item }">
            <div class="actions-container">
              <v-btn
                v-if="!item.isActive"
                icon="mdi-restore"
                variant="text"
                color="success"
                size="small"
                @click="reactivateInstitution(item)"
                title="Réactiver"
              />
              <v-btn
                v-if="item.isActive"
                icon="mdi-pencil"
                variant="text"
                size="small"
                @click="editInstitution(item)"
                title="Modifier"
              />
              <v-tooltip
                v-if="!item.isActive && item.isLocked"
                location="top"
              >
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon="mdi-lock"
                    variant="text"
                    color="grey"
                    size="small"
                    disabled
                  />
                </template>
                <div class="text-caption">
                  <strong>Suppression impossible</strong><br>
                  Cette institution contient des données<br>
                  CRM enrichies (notes, réunions, modifications)<br>
                  et ne peut être que désactivée.
                </div>
              </v-tooltip>
              <v-btn
                v-else
                icon="mdi-delete"
                variant="text"
                color="error"
                size="small"
                @click="confirmDelete(item)"
                :title="item.isActive ? 'Désactiver' : 'Supprimer définitivement'"
              />
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Mobile Cards List -->
      <div class="mobile-cards-container d-md-none">
        <ListSkeleton
          v-if="loading && institutions.length === 0"
          :count="5"
          avatar
          actions
          type="list-item-three-line"
        />

        <div v-else-if="!loading && institutions.length === 0" class="empty-state">
          <div class="text-center py-12">
            <v-icon size="64" class="mb-4" color="grey-lighten-2">mdi-domain-off</v-icon>
            <h3 class="text-h6 mb-2">{{ t("institutions.noInstitutionsFound") }}</h3>
            <p class="text-body-1 text-medium-emphasis">
              {{ t("institutions.adjustSearchOrAdd") }}
            </p>
          </div>
        </div>

        <div v-else class="mobile-cards-list">
          <v-card
            v-for="institution in institutions"
            :key="institution.id"
            class="institution-card mb-3"
            variant="outlined"
            @click="viewInstitution(institution)"
          >
            <v-card-text class="pa-4">
              <div class="d-flex justify-space-between align-start">
                <div class="d-flex align-start">
                  <v-avatar
                    size="48"
                    :color="getInstitutionColor(institution.type)"
                    variant="tonal"
                    class="mr-4"
                  >
                    <v-icon size="24">{{ getInstitutionIcon(institution.type) }}</v-icon>
                  </v-avatar>
                  <div>
                    <h3 class="institution-name">{{ institution.name }}</h3>
                    <div class="text-body-2 text-medium-emphasis">
                      {{ institution.address.city }}, {{ institution.address.state }}
                    </div>
                  </div>
                </div>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      @click.stop
                    ></v-btn>
                  </template>
                  <v-list>
                    <v-list-item
                      @click.stop="editInstitution(institution)"
                      prepend-icon="mdi-pencil"
                      >Modifier</v-list-item
                    >
                    <v-list-item
                      @click.stop="confirmDelete(institution)"
                      prepend-icon="mdi-delete"
                      class="text-error"
                      >Supprimer</v-list-item
                    >
                  </v-list>
                </v-menu>
              </div>
              <div class="d-flex flex-wrap gap-2 mt-3">
                <v-chip
                  size="small"
                  variant="tonal"
                  :color="getInstitutionColor(institution.type)"
                  >{{ formatInstitutionType(institution.type) }}</v-chip
                >
                <v-chip
                  :color="institution.isActive ? 'success' : 'grey'"
                  variant="tonal"
                  size="small"
                  >{{ institution.isActive ? "Actif" : "Inactif" }}</v-chip
                >
                <v-chip
                  v-if="institution.medicalProfile"
                  :color="
                    getComplianceSeverity(institution.medicalProfile.complianceStatus)
                  "
                  variant="tonal"
                  size="small"
                >
                  {{
                    formatComplianceStatus(institution.medicalProfile.complianceStatus)
                  }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <div v-if="totalRecords > lazyParams.rows" class="mobile-pagination mt-4">
          <v-pagination
            :model-value="Math.floor(lazyParams.first / lazyParams.rows) + 1"
            :length="Math.ceil(totalRecords / lazyParams.rows)"
            :total-visible="3"
            @update:model-value="onPageChange"
          />
        </div>
      </div>

      <!-- Dialogs and Snackbars -->
      <v-dialog v-model="showCreateDialog" max-width="900">
        <v-card>
          <v-card-title>{{ t("institutions.addNewInstitution") }}</v-card-title>
          <v-card-text>
            <MedicalInstitutionForm
              @institution-saved="onInstitutionCreated"
              @cancel="showCreateDialog = false"
            />
          </v-card-text>
        </v-card>
      </v-dialog>

      <ImportInstitutionsDialog
        v-model="showImportDialog"
        @completed="onImportCompleted"
      />

      <v-dialog v-model="confirmVisible" max-width="420">
        <v-card>
          <v-card-title>{{ t("institutions.deleteConfirmation") }}</v-card-title>
          <v-card-text>{{ confirmMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="confirmVisible = false">{{
              t("common.cancel")
            }}</v-btn>
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
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionForm.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { TableSkeleton, ListSkeleton } from "@/components/skeletons"
import { institutionsApi } from "@/services/api"
import type {
  MedicalInstitution,
  MedicalInstitutionSearchFilters,
} from "@medical-crm/shared"
import { ComplianceStatus, InstitutionType } from "@medical-crm/shared"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter, useRoute } from "vue-router"

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const snackbar = ref<{ visible: boolean; color: string; message: string }>({
  visible: false,
  color: "info",
  message: "",
})
const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, color, message }
}
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
const stats = ref({
  total: 0,
  active: 0,
  pendingReview: 0,
  nonCompliant: 0
})
const searchQuery = ref("")
const showAdvancedFilters = ref(false)
const showCreateDialog = ref(false)
const showImportDialog = ref(false)
const showInactive = ref(false)

const lazyParams = ref({ first: 0, rows: 10, sortField: "name", sortOrder: 1 })

const filters = ref<MedicalInstitutionSearchFilters>({})

const institutionTypeOptions = computed(() => [
  { label: "Hôpital Public", value: "public_hospital" },
  { label: "Clinique Privée", value: "private_clinic" },
  { label: "Centre de Santé", value: "health_center" },
  { label: "Cabinet Médical", value: "medical_office" },
  { label: "Laboratoire", value: "laboratory" },
  { label: "Pharmacie", value: "pharmacy" },
])

const complianceStatusOptions = computed(() => [
  { label: "Conforme", value: "compliant" },
  { label: "Non Conforme", value: "non_compliant" },
  { label: "En Attente", value: "pending" },
  { label: "En Révision", value: "under_review" },
])

const specialtyOptions = computed(() => [
  { label: "Cardiologie", value: "cardiology" },
  { label: "Neurologie", value: "neurology" },
  { label: "Orthopédie", value: "orthopedics" },
  { label: "Pédiatrie", value: "pediatrics" },
  { label: "Radiologie", value: "radiology" },
  { label: "Urgences", value: "emergency" },
])
const userOptions = ref<Array<{ label: string; value: string }>>([])
const loadingUsers = ref(false)

const hasActiveFilters = computed(
  () => Object.values(filters.value).some((v) => v) || searchQuery.value
)

const activeFilters = computed(() => {
  const active: MedicalInstitutionSearchFilters = { ...filters.value }
  if (searchQuery.value) active.name = searchQuery.value
  // Par défaut, on ne montre que les actives (isActive: true)
  // Si showInactive est true, on ne filtre pas par isActive (on montre tout)
  if (!showInactive.value) {
    active.isActive = true
  }
  return active
})

const loadUsers = async () => {
  if (loadingUsers.value) return

  loadingUsers.value = true
  try {
    // Simuler le chargement des utilisateurs depuis l'API
    // TODO: Remplacer par un vrai appel API
    const response = await new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            data: [
              { id: "1", firstName: "Jean", lastName: "Dupont" },
              { id: "2", firstName: "Marie", lastName: "Martin" },
              { id: "3", firstName: "Pierre", lastName: "Bernard" },
            ],
          }),
        500
      )
    )

    const users = (response as any).data || []
    userOptions.value = users.map((user: any) => ({
      label: `${user.firstName} ${user.lastName}`,
      value: user.id,
    }))
  } catch (error) {
    console.error("Erreur lors du chargement des utilisateurs:", error)
    userOptions.value = []
  } finally {
    loadingUsers.value = false
  }
}

const loadStats = async () => {
  try {
    // Fetch all institutions (limit: -1 means no pagination)
    const response = await institutionsApi.getAll({ limit: -1 })
    const payload: any = response
    let allInstitutions: MedicalInstitution[] = []

    if (payload?.success && payload.data) {
      allInstitutions = payload.data.institutions || []
    } else {
      allInstitutions = payload.data || []
    }

    stats.value = {
      total: allInstitutions.length,
      active: allInstitutions.filter(i => i.isActive).length,
      pendingReview: allInstitutions.filter(i => i.medicalProfile?.complianceStatus === "pending_review").length,
      nonCompliant: allInstitutions.filter(i => i.medicalProfile?.complianceStatus === "non_compliant").length
    }
  } catch (error) {
    console.error("Error loading stats:", error)
  }
}

const loadInstitutions = async () => {
  // Prevent multiple simultaneous requests
  if (loading.value) {
    console.log("Already loading, skipping duplicate request")
    return
  }

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

const onPageChange = (page: number) => {
  if (loading.value) return // Prevent page change during loading
  lazyParams.value.first = (page - 1) * lazyParams.value.rows
  loadInstitutions()
}

const onItemsPerPageChange = (itemsPerPage: number) => {
  if (loading.value) return
  lazyParams.value.rows = itemsPerPage
  lazyParams.value.first = 0 // Reset to first page
  loadInstitutions()
}

const onSortChange = (sortOptions: any[]) => {
  if (loading.value) return
  if (sortOptions && sortOptions.length > 0) {
    lazyParams.value.sortField = sortOptions[0].key
    lazyParams.value.sortOrder = sortOptions[0].order === 'desc' ? -1 : 1
  } else {
    lazyParams.value.sortField = "name"
    lazyParams.value.sortOrder = 1
  }
  loadInstitutions()
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

const refreshData = async () => {
  await loadInstitutions()
  showSnackbar("Données actualisées", "success")
}

const exportData = () => showSnackbar(t("institutions.exportComingSoon"), "info")

const viewInstitution = (institution: MedicalInstitution) => {
  // Marquer qu'on navigue pour pouvoir rafraîchir au retour
  sessionStorage.setItem("needsRefresh", "true")
  router.push(`/institutions/${institution.id}`)
}

const editInstitution = (institution: MedicalInstitution) => {
  // Marquer qu'on navigue pour pouvoir rafraîchir au retour
  sessionStorage.setItem("needsRefresh", "true")
  router.push(`/institutions/${institution.id}?edit=true`)
}

const confirmDelete = (institution: MedicalInstitution) => {
  if (institution.isActive) {
    // Soft delete
    confirmMessage.value = `Êtes-vous sûr de vouloir désactiver "${institution.name}" ? L'institution sera archivée mais pourra être réactivée ultérieurement.`
  } else {
    // Hard delete
    confirmMessage.value = `⚠️ ATTENTION : Êtes-vous sûr de vouloir SUPPRIMER DÉFINITIVEMENT "${institution.name}" ? Cette action est irréversible et supprimera toutes les données associées.`
  }
  confirmTarget.value = institution
  confirmVisible.value = true
}

const deleteInstitution = async (institution: MedicalInstitution) => {
  try {
    if (institution.isActive) {
      // Soft delete: désactiver l'institution
      await institutionsApi.update(institution.id, { isActive: false })
      showSnackbar(
        `Institution "${institution.name}" désactivée avec succès`,
        "success"
      )
    } else {
      // Hard delete: suppression définitive
      await institutionsApi.delete(institution.id, true) // force: true
      showSnackbar(
        `Institution "${institution.name}" supprimée définitivement`,
        "success"
      )
    }
    loadInstitutions()
  } catch (error) {
    console.error("Error deleting institution:", error)
    showSnackbar(t("institutions.failedToDelete"), "error")
  }
}

const reactivateInstitution = async (institution: MedicalInstitution) => {
  try {
    await institutionsApi.update(institution.id, { isActive: true })
    showSnackbar(
      `Institution "${institution.name}" réactivée avec succès`,
      "success"
    )
    loadInstitutions()
  } catch (error) {
    console.error("Error reactivating institution:", error)
    showSnackbar("Erreur lors de la réactivation de l'institution", "error")
  }
}

const onInstitutionCreated = (newInstitution: MedicalInstitution) => {
  showCreateDialog.value = false
  loadInstitutions()
  showSnackbar(
    t("institutions.institutionCreated", { name: newInstitution.name }),
    "success"
  )
}

// Utility functions
const formatInstitutionType = (type: InstitutionType): string => {
  const typeMap: Record<InstitutionType, string> = {
    [InstitutionType.HOSPITAL]: "Hôpital",
    [InstitutionType.CLINIC]: "Clinique",
    [InstitutionType.MEDICAL_CENTER]: "Centre Médical",
    [InstitutionType.SPECIALTY_CLINIC]: "Clinique Spécialisée",
  }
  return typeMap[type] || type
}

const formatComplianceStatus = (status: ComplianceStatus): string => {
  const statusMap: Record<ComplianceStatus, string> = {
    [ComplianceStatus.COMPLIANT]: "Conforme",
    [ComplianceStatus.NON_COMPLIANT]: "Non Conforme",
    [ComplianceStatus.PENDING_REVIEW]: "En Attente de Révision",
    [ComplianceStatus.EXPIRED]: "Expiré",
  }
  return statusMap[status] || status
}

const getComplianceSeverity = (status: ComplianceStatus): string => {
  const severityMap: Record<ComplianceStatus, string> = {
    [ComplianceStatus.COMPLIANT]: "success",
    [ComplianceStatus.NON_COMPLIANT]: "error",
    [ComplianceStatus.PENDING_REVIEW]: "warning",
    [ComplianceStatus.EXPIRED]: "error",
  }
  return severityMap[status] || "default"
}

const getInstitutionColor = (type: InstitutionType): string => {
  const colorMap: Record<InstitutionType, string> = {
    [InstitutionType.HOSPITAL]: "blue",
    [InstitutionType.CLINIC]: "green",
    [InstitutionType.MEDICAL_CENTER]: "orange",
    [InstitutionType.SPECIALTY_CLINIC]: "purple",
  }
  return colorMap[type] || "primary"
}

const getInstitutionIcon = (type: InstitutionType): string => {
  const iconMap: Record<InstitutionType, string> = {
    [InstitutionType.HOSPITAL]: "mdi-hospital-building",
    [InstitutionType.CLINIC]: "mdi-medical-bag",
    [InstitutionType.MEDICAL_CENTER]: "mdi-heart-pulse",
    [InstitutionType.SPECIALTY_CLINIC]: "mdi-stethoscope",
  }
  return iconMap[type] || "mdi-hospital-building"
}

const tableHeaders = computed(
  () =>
    [
      { title: "Nom", key: "name", sortable: true },
      { title: "Localisation", key: "location", sortable: true },
      { title: "Profil Médical", key: "profile", sortable: false },
      { title: "Statut", key: "status", sortable: true },
      { title: "Contact Principal", key: "primaryContact", sortable: false },
      { title: "Actions", key: "actions", sortable: false },
    ] as const
)

onMounted(() => {
  // Vérifier si on revient d'une page d'édition/vue et qu'il faut rafraîchir
  const needsRefresh = sessionStorage.getItem("needsRefresh")
  if (needsRefresh) {
    console.log("Rafraîchissement automatique après retour de navigation...")
    sessionStorage.removeItem("needsRefresh")
  }

  loadStats()
  loadInstitutions()
  loadUsers()

  // Rafraîchir les données quand la page redevient visible
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      console.log("Page redevenue visible, rafraîchissement des données...")
      loadInstitutions()
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange)

  // Nettoyer l'événement lors du démontage
  onUnmounted(() => {
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  })
})

// Watcher pour détecter les changements de route et rafraîchir
watch(
  () => route.path,
  (newPath, oldPath) => {
    // Si on revient sur cette page depuis une autre page (ignorer les changements de query params)
    if (newPath === "/institutions" && oldPath && oldPath !== "/institutions") {
      console.log("Retour sur la page institutions, rafraîchissement des données...")
      setTimeout(() => loadInstitutions(), 100) // Petit délai pour laisser la page se charger
    }
  }
)
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
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  white-space: nowrap;
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

.enhanced-table :deep(.inactive-institution) {
  opacity: 0.6;
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
}

.enhanced-table :deep(.inactive-institution:hover) {
  opacity: 0.8;
  background-color: rgba(var(--v-theme-surface-variant), 0.5);
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

.contact-info {
  line-height: 1.3;
}

.contact-info .text-caption {
  font-size: 0.75rem;
}

@media (max-width: 960px) {
  .medical-institutions-view {
    padding: 1rem;
  }
  .header-main,
  .title-section {
    flex-direction: column;
    align-items: start;
    gap: 1rem;
  }
  .header-actions {
    width: 100%;
    justify-content: stretch;
  }
  .action-btn {
    flex: 1;
    min-width: 0;
  }
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  .header-actions {
    flex-direction: column;
    width: 100%;
  }
  .action-btn {
    width: 100%;
  }
}
</style>
