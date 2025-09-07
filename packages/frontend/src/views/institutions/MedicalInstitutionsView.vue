<template>
  <AppLayout>
    <div class="medical-institutions-view">
      <!-- Header Section -->
      <div class="page-header">
        <div class="page-title">
          <h1 class="text-3xl font-bold text-900 mb-2">Medical Institutions</h1>
          <p class="text-600 text-lg">
            Manage your medical institution contacts and relationships
          </p>
        </div>
        <div class="page-actions">
          <v-btn
            variant="outlined"
            prepend-icon="mdi-upload"
            class="mr-2"
            @click="showImportDialog = true"
            >Import CSV</v-btn
          >
          <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true"
            >Add Institution</v-btn
          >
        </div>
      </div>

      <!-- Search and Filter Section -->
      <v-card class="mb-4">
        <v-card-text>
          <div class="search-filters">
            <!-- Quick Search -->
            <div class="field col-12 md:col-4">
              <label for="search" class="block text-900 font-medium mb-2">Search</label>
              <v-text-field
                id="search"
                v-model="searchQuery"
                label="Search institutions"
                density="comfortable"
                @input="onSearchInput"
              />
            </div>

            <!-- Institution Type Filter -->
            <div class="field col-12 md:col-3">
              <label for="type" class="block text-900 font-medium mb-2">Type</label>
              <v-select
                v-model="filters.type"
                :items="institutionTypeOptions"
                item-title="label"
                item-value="value"
                label="Type"
                clearable
                @update:model-value="applyFilters"
              />
            </div>

            <!-- Location Filter -->
            <div class="field col-12 md:col-3">
              <label for="city" class="block text-900 font-medium mb-2">City</label>
              <v-text-field
                id="city"
                v-model="filters.city"
                label="City"
                density="comfortable"
                @input="onFilterInput"
              />
            </div>

            <!-- Assigned User Filter -->
            <div class="field col-12 md:col-2">
              <label for="assigned" class="block text-900 font-medium mb-2"
                >Assigned To</label
              >
              <v-select
                v-model="filters.assignedUserId"
                :items="userOptions"
                item-title="label"
                item-value="value"
                label="Assigned To"
                clearable
                @update:model-value="applyFilters"
              />
            </div>
          </div>

          <!-- Advanced Filters Toggle -->
          <div class="advanced-filters-toggle">
            <v-btn
              variant="text"
              size="small"
              @click="showAdvancedFilters = !showAdvancedFilters"
            >
              <v-icon class="mr-1">{{
                showAdvancedFilters ? "mdi-chevron-up" : "mdi-chevron-down"
              }}</v-icon>
              {{
                showAdvancedFilters ? "Hide Advanced Filters" : "Show Advanced Filters"
              }}
            </v-btn>
          </div>

          <!-- Advanced Filters -->
          <div
            v-if="showAdvancedFilters"
            class="advanced-filters mt-4 pt-4 border-top-1 surface-border"
          >
            <div class="formgrid grid">
              <!-- Bed Capacity Range -->
              <div class="field col-12 md:col-3">
                <label class="block text-900 font-medium mb-2">Bed Capacity</label>
                <div class="flex gap-2">
                  <v-text-field
                    v-model.number="filters.minBedCapacity"
                    type="number"
                    label="Min"
                    density="comfortable"
                    @input="onFilterInput"
                  />
                  <v-text-field
                    v-model.number="filters.maxBedCapacity"
                    type="number"
                    label="Max"
                    density="comfortable"
                    @input="onFilterInput"
                  />
                </div>
              </div>

              <!-- Surgical Rooms Range -->
              <div class="field col-12 md:col-3">
                <label class="block text-900 font-medium mb-2">Surgical Rooms</label>
                <div class="flex gap-2">
                  <v-text-field
                    v-model.number="filters.minSurgicalRooms"
                    type="number"
                    label="Min"
                    density="comfortable"
                    @input="onFilterInput"
                  />
                  <v-text-field
                    v-model.number="filters.maxSurgicalRooms"
                    type="number"
                    label="Max"
                    density="comfortable"
                    @input="onFilterInput"
                  />
                </div>
              </div>

              <!-- Specialties Filter -->
              <div class="field col-12 md:col-3">
                <label class="block text-900 font-medium mb-2">Specialties</label>
                <v-select
                  v-model="filters.specialties"
                  :items="specialtyOptions"
                  item-title="label"
                  item-value="value"
                  label="Specialties"
                  multiple
                  chips
                  clearable
                  @update:model-value="applyFilters"
                />
              </div>

              <!-- Compliance Status Filter -->
              <div class="field col-12 md:col-3">
                <label class="block text-900 font-medium mb-2">Compliance Status</label>
                <v-select
                  v-model="filters.complianceStatus"
                  :items="complianceStatusOptions"
                  item-title="label"
                  item-value="value"
                  label="Compliance Status"
                  clearable
                  @update:model-value="applyFilters"
                />
              </div>
            </div>

            <!-- Filter Actions -->
            <div class="flex justify-content-end gap-2 mt-3">
              <v-btn
                variant="outlined"
                size="small"
                prepend-icon="mdi-close"
                @click="clearFilters"
                >Clear Filters</v-btn
              >
              <v-btn
                size="small"
                prepend-icon="mdi-check"
                color="primary"
                @click="applyFilters"
                >Apply Filters</v-btn
              >
            </div>
          </div>
        </v-card-text>
      </v-card>

      <!-- Data Table -->
      <v-card>
        <v-card-text>
          <v-data-table
            :items="institutions"
            :loading="loading"
            :items-per-page="lazyParams.rows"
            :page="Math.floor(lazyParams.first / lazyParams.rows) + 1"
            :headers="tableHeaders"
            :items-length="totalRecords"
            item-key="id"
            @update:page="
              (p) => {
                lazyParams.first = (p - 1) * lazyParams.rows
                loadInstitutions()
              }
            "
          >
            <template #top>
              <div class="d-flex justify-between align-center mb-2">
                <h3 class="m-0">Institutions ({{ totalRecords }})</h3>
                <div class="d-flex gap-2">
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-refresh"
                    :loading="loading"
                    @click="refreshData"
                    >Refresh</v-btn
                  >
                  <v-btn
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-download"
                    @click="exportData"
                    >Export</v-btn
                  >
                </div>
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-6">
                <v-icon size="36" class="mb-2">mdi-domain</v-icon>
                <div class="text-subtitle-1">No medical institutions found</div>
                <div class="text-caption">
                  Try adjusting your search or add a new institution
                </div>
              </div>
            </template>

            <template #item.name="{ item }">
              <div class="d-flex align-center">
                <v-avatar size="28" class="mr-2" :color="getInstitutionColor(item.type)">
                  <span class="white--text">{{ item.name.charAt(0).toUpperCase() }}</span>
                </v-avatar>
                <div>
                  <div class="font-semibold">{{ item.name }}</div>
                  <div class="text-caption">{{ formatInstitutionType(item.type) }}</div>
                </div>
              </div>
            </template>

            <template #item.location="{ item }">
              <div>
                <div class="font-medium">
                  {{ item.address.city }}, {{ item.address.state }}
                </div>
                <div class="text-caption">{{ item.address.country }}</div>
              </div>
            </template>

            <template #item.profile="{ item }">
              <div v-if="item.medicalProfile" class="d-flex flex-column">
                <div class="d-flex gap-4 mb-1">
                  <div
                    v-if="item.medicalProfile?.bedCapacity"
                    class="d-flex align-center"
                  >
                    <v-icon size="16" class="mr-1">mdi-hospital</v-icon>
                    <span class="text-caption"
                      >{{ item.medicalProfile?.bedCapacity }} beds</span
                    >
                  </div>
                  <div
                    v-if="item.medicalProfile?.surgicalRooms"
                    class="d-flex align-center"
                  >
                    <v-icon size="16" class="mr-1">mdi-hammer-wrench</v-icon>
                    <span class="text-caption"
                      >{{ item.medicalProfile?.surgicalRooms }} OR</span
                    >
                  </div>
                </div>
                <div>
                  <v-chip
                    v-for="sp in (item.medicalProfile?.specialties || []).slice(0, 2)"
                    :key="sp"
                    size="x-small"
                    class="mr-1 mb-1"
                    color="info"
                    variant="tonal"
                    >{{ sp }}</v-chip
                  >
                  <v-chip
                    v-if="(item.medicalProfile?.specialties || []).length > 2"
                    size="x-small"
                    variant="tonal"
                  >
                    +{{ (item.medicalProfile?.specialties || []).length - 2 }} more
                  </v-chip>
                </div>
              </div>
              <div v-else class="text-caption text-medium-emphasis">
                No medical profile
              </div>
            </template>

            <template #item.status="{ item }">
              <div class="d-flex gap-2">
                <v-chip v-if="item.medicalProfile" :color="getComplianceSeverity(item.medicalProfile.complianceStatus)" variant="tonal">
                  {{ formatComplianceStatus(item.medicalProfile.complianceStatus) }}
                </v-chip>
                <v-chip v-else variant="tonal">No profile</v-chip>
                <v-chip :color="item.isActive ? 'success' : 'error'" variant="tonal">
                  {{ item.isActive ? "Active" : "Inactive" }}
                </v-chip>
              </div>
            </template>

            <template #item.actions="{ item }">
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-eye"
                  variant="text"
                  size="small"
                  @click="viewInstitution(item)"
                />
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  @click="editInstitution(item)"
                />
                <v-btn
                  icon="mdi-delete"
                  color="error"
                  variant="text"
                  size="small"
                  @click="confirmDelete(item)"
                />
              </div>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>

      <!-- Create Institution Dialog (Vuetify) -->
      <v-dialog v-model="showCreateDialog" max-width="900">
        <v-card>
          <v-card-title>Add New Medical Institution</v-card-title>
          <v-card-text>
            <MedicalInstitutionForm
              @institution-saved="onInstitutionCreated"
              @cancel="showCreateDialog = false"
            />
          </v-card-text>
        </v-card>
      </v-dialog>

      <!-- Import CSV Dialog (Vuetify) -->
      <v-dialog v-model="showImportDialog" max-width="600">
        <v-card>
          <v-card-title>Import Medical Institutions</v-card-title>
          <v-card-text>
            <p class="text-600 mb-4">Import medical institutions from a CSV file</p>
            <div class="text-center py-4">
              <v-icon size="36" class="mb-2">mdi-upload</v-icon>
              <p class="text-600">CSV import interface coming soon...</p>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="showImportDialog = false">Cancel</v-btn>
            <v-btn color="primary" @click="showImportDialog = false">Import</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Delete Confirmation Dialog (Vuetify) -->
      <v-dialog v-model="confirmVisible" max-width="420">
        <v-card>
          <v-card-title>Delete Confirmation</v-card-title>
          <v-card-text>{{ confirmMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="confirmVisible = false">Cancel</v-btn>
            <v-btn color="error" @click="confirmAccept">Delete</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Snackbar notifications -->
      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
        {{ snackbar.message }}
      </v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionFormVuetify.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { institutionsApi } from "@/services/api"
import type {
  ComplianceStatus,
  InstitutionType,
  MedicalInstitution,
  MedicalInstitutionSearchFilters,
} from "@medical-crm/shared"
// Using Vuetify components globally; no PrimeVue imports
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
// Local snackbar + confirm state (Vuetify)
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
  if (confirmTarget.value) {
    void deleteInstitution(confirmTarget.value)
  }
}

// Reactive data
const institutions = ref<MedicalInstitution[]>([])
const selectedInstitutions = ref<MedicalInstitution[]>([])
const loading = ref(false)
const totalRecords = ref(0)
const searchQuery = ref("")
const showAdvancedFilters = ref(false)
const showCreateDialog = ref(false)
const showImportDialog = ref(false)

// Pagination and sorting
const lazyParams = ref({
  first: 0,
  rows: 20,
  sortField: "name",
  sortOrder: 1,
})

// Filters
const filters = ref<MedicalInstitutionSearchFilters>({
  name: "",
  type: undefined,
  city: "",
  assignedUserId: undefined,
  minBedCapacity: undefined,
  maxBedCapacity: undefined,
  minSurgicalRooms: undefined,
  maxSurgicalRooms: undefined,
  specialties: [],
  complianceStatus: undefined,
})

// Filter options
const institutionTypeOptions = [
  { label: "Hospital", value: "hospital" },
  { label: "Clinic", value: "clinic" },
  { label: "Medical Center", value: "medical_center" },
  { label: "Specialty Clinic", value: "specialty_clinic" },
]

const complianceStatusOptions = [
  { label: "Compliant", value: "compliant" },
  { label: "Non-Compliant", value: "non_compliant" },
  { label: "Pending Review", value: "pending_review" },
  { label: "Expired", value: "expired" },
]

const specialtyOptions = [
  { label: "Cardiology", value: "cardiology" },
  { label: "Neurology", value: "neurology" },
  { label: "Orthopedics", value: "orthopedics" },
  { label: "Pediatrics", value: "pediatrics" },
  { label: "Oncology", value: "oncology" },
  { label: "Emergency Medicine", value: "emergency_medicine" },
  { label: "Surgery", value: "surgery" },
  { label: "Internal Medicine", value: "internal_medicine" },
]

const userOptions = ref([
  { label: "John Doe", value: "user1" },
  { label: "Jane Smith", value: "user2" },
  // This will be populated from API in a real implementation
])

// Computed properties
const activeFilters = computed(() => {
  const active: MedicalInstitutionSearchFilters = {}
  if (searchQuery.value) active.name = searchQuery.value
  if (filters.value.type) active.type = filters.value.type
  if (filters.value.city) active.city = filters.value.city
  if (filters.value.assignedUserId) active.assignedUserId = filters.value.assignedUserId
  if (filters.value.minBedCapacity) active.minBedCapacity = filters.value.minBedCapacity
  if (filters.value.maxBedCapacity) active.maxBedCapacity = filters.value.maxBedCapacity
  if (filters.value.minSurgicalRooms)
    active.minSurgicalRooms = filters.value.minSurgicalRooms
  if (filters.value.maxSurgicalRooms)
    active.maxSurgicalRooms = filters.value.maxSurgicalRooms
  if (filters.value.specialties?.length) active.specialties = filters.value.specialties
  if (filters.value.complianceStatus)
    active.complianceStatus = filters.value.complianceStatus
  return active
})

// Methods
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
    // Support both old and new backend shapes
    if (payload?.success && payload.data) {
      institutions.value = payload.data.institutions || []
      totalRecords.value = payload.data.pagination?.total || payload.data.total || 0
    } else {
      institutions.value = payload.data || []
      totalRecords.value = payload.meta?.total || 0
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
    showSnackbar("Failed to load medical institutions", "error")
  } finally {
    loading.value = false
  }
}

const onPage = (event: any) => {
  lazyParams.value.first = event.first
  lazyParams.value.rows = event.rows
  loadInstitutions()
}

const onSort = (event: any) => {
  lazyParams.value.sortField = event.sortField
  lazyParams.value.sortOrder = event.sortOrder
  loadInstitutions()
}

const onSearchInput = () => {
  // Debounce search input
  clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    applyFilters()
  }, 500)
}

const searchTimeout = ref<ReturnType<typeof setTimeout> | undefined>()

const onFilterInput = () => {
  // Debounce filter input
  clearTimeout(filterTimeout.value)
  filterTimeout.value = setTimeout(() => {
    applyFilters()
  }, 800)
}

const filterTimeout = ref<ReturnType<typeof setTimeout> | undefined>()

const applyFilters = () => {
  lazyParams.value.first = 0 // Reset to first page
  loadInstitutions()
}

const clearFilters = () => {
  searchQuery.value = ""
  filters.value = {
    name: "",
    type: undefined,
    city: "",
    assignedUserId: undefined,
    minBedCapacity: undefined,
    maxBedCapacity: undefined,
    minSurgicalRooms: undefined,
    maxSurgicalRooms: undefined,
    specialties: [],
    complianceStatus: undefined,
  }
  applyFilters()
}

const refreshData = () => {
  loadInstitutions()
}

const exportData = () => {
  // Export functionality to be implemented
  showSnackbar("Export functionality coming soon", "info")
}

const viewInstitution = (institution: MedicalInstitution) => {
  router.push(`/institutions/${institution.id}`)
}

const editInstitution = (institution: MedicalInstitution) => {
  router.push(`/institutions/${institution.id}`)
}

const confirmDelete = (institution: MedicalInstitution) => {
  confirmMessage.value = `Are you sure you want to delete ${institution.name}?`
  confirmTarget.value = institution
  confirmVisible.value = true
}

const deleteInstitution = async (institution: MedicalInstitution) => {
  try {
    await institutionsApi.delete(institution.id)
    showSnackbar(`${institution.name} has been deleted`, "success")
    loadInstitutions()
  } catch (error) {
    console.error("Error deleting institution:", error)
    showSnackbar("Failed to delete institution", "error")
  }
}

const onInstitutionCreated = (newInstitution: MedicalInstitution) => {
  showCreateDialog.value = false
  loadInstitutions() // Refresh the list
  showSnackbar(`${newInstitution.name} has been created successfully`, "success")
}

// Utility functions
const formatInstitutionType = (type: InstitutionType): string => {
  const typeMap = {
    hospital: "Hospital",
    clinic: "Clinic",
    medical_center: "Medical Center",
    specialty_clinic: "Specialty Clinic",
  }
  return typeMap[type] || type
}

const formatComplianceStatus = (status: ComplianceStatus): string => {
  const statusMap = {
    compliant: "Compliant",
    non_compliant: "Non-Compliant",
    pending_review: "Pending Review",
    expired: "Expired",
  }
  return statusMap[status] || status
}

const getComplianceSeverity = (status: ComplianceStatus): string => {
  const severityMap = {
    compliant: "success",
    non_compliant: "danger",
    pending_review: "warning",
    expired: "danger",
  }
  return severityMap[status] || "secondary"
}

const getInstitutionColor = (type: InstitutionType): string => {
  const colorMap = {
    hospital: "#1976d2",
    clinic: "#388e3c",
    medical_center: "#f57c00",
    specialty_clinic: "#7b1fa2",
  }
  return colorMap[type] || "#6c757d"
}

// Vuetify data-table headers
const tableHeaders = [
  { title: "Institution", value: "name", sortable: false },
  { title: "Location", value: "location", sortable: false },
  { title: "Medical Profile", value: "profile", sortable: false },
  { title: "Status", value: "status", sortable: false },
  { title: "Actions", value: "actions", sortable: false, align: "end" },
]

// Lifecycle
onMounted(() => {
  loadInstitutions()
})

// Watch for filter changes
watch(
  activeFilters,
  () => {
    // Filters are applied through user interactions
  },
  { deep: true }
)
</script>

<style scoped>
.medical-institutions-view {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.page-title h1 {
  margin: 0 0 0.5rem 0;
}

.page-actions {
  display: flex;
  gap: 0.5rem;
}

.search-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.advanced-filters-toggle {
  text-align: center;
  margin-top: 1rem;
}

.advanced-filters {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
}

.medical-profile-summary {
  font-size: 0.875rem;
}

.specialties-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.institution-avatar {
  flex-shrink: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .page-actions {
    width: 100%;
    justify-content: stretch;
  }

  .page-actions .p-button {
    flex: 1;
  }

  .search-filters {
    grid-template-columns: 1fr;
  }
}
</style>
