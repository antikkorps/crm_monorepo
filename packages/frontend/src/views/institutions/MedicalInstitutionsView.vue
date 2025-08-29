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
          <Button
            label="Import CSV"
            icon="pi pi-upload"
            outlined
            class="mr-2"
            @click="showImportDialog = true"
          />
          <Button
            label="Add Institution"
            icon="pi pi-plus"
            @click="showCreateDialog = true"
          />
        </div>
      </div>

      <!-- Search and Filter Section -->
      <Card class="mb-4">
        <template #content>
          <div class="search-filters">
            <!-- Quick Search -->
            <div class="field col-12 md:col-4">
              <label for="search" class="block text-900 font-medium mb-2">Search</label>
              <InputText
                id="search"
                v-model="searchQuery"
                placeholder="Search institutions..."
                class="w-full"
                @input="onSearchInput"
              />
            </div>

            <!-- Institution Type Filter -->
            <div class="field col-12 md:col-3">
              <label for="type" class="block text-900 font-medium mb-2">Type</label>
              <Dropdown
                id="type"
                v-model="filters.type"
                :options="institutionTypeOptions"
                option-label="label"
                option-value="value"
                placeholder="All Types"
                class="w-full"
                show-clear
                @change="applyFilters"
              />
            </div>

            <!-- Location Filter -->
            <div class="field col-12 md:col-3">
              <label for="city" class="block text-900 font-medium mb-2">City</label>
              <InputText
                id="city"
                v-model="filters.city"
                placeholder="Filter by city"
                class="w-full"
                @input="onFilterInput"
              />
            </div>

            <!-- Assigned User Filter -->
            <div class="field col-12 md:col-2">
              <label for="assigned" class="block text-900 font-medium mb-2"
                >Assigned To</label
              >
              <Dropdown
                id="assigned"
                v-model="filters.assignedUserId"
                :options="userOptions"
                option-label="label"
                option-value="value"
                placeholder="All Users"
                class="w-full"
                show-clear
                @change="applyFilters"
              />
            </div>
          </div>

          <!-- Advanced Filters Toggle -->
          <div class="advanced-filters-toggle">
            <Button
              :label="
                showAdvancedFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'
              "
              :icon="showAdvancedFilters ? 'pi pi-chevron-up' : 'pi pi-chevron-down'"
              text
              size="small"
              @click="showAdvancedFilters = !showAdvancedFilters"
            />
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
                  <InputNumber
                    v-model="filters.minBedCapacity"
                    placeholder="Min"
                    class="w-full"
                    @input="onFilterInput"
                  />
                  <InputNumber
                    v-model="filters.maxBedCapacity"
                    placeholder="Max"
                    class="w-full"
                    @input="onFilterInput"
                  />
                </div>
              </div>

              <!-- Surgical Rooms Range -->
              <div class="field col-12 md:col-3">
                <label class="block text-900 font-medium mb-2">Surgical Rooms</label>
                <div class="flex gap-2">
                  <InputNumber
                    v-model="filters.minSurgicalRooms"
                    placeholder="Min"
                    class="w-full"
                    @input="onFilterInput"
                  />
                  <InputNumber
                    v-model="filters.maxSurgicalRooms"
                    placeholder="Max"
                    class="w-full"
                    @input="onFilterInput"
                  />
                </div>
              </div>

              <!-- Specialties Filter -->
              <div class="field col-12 md:col-3">
                <label class="block text-900 font-medium mb-2">Specialties</label>
                <MultiSelect
                  v-model="filters.specialties"
                  :options="specialtyOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Select specialties"
                  class="w-full"
                  @change="applyFilters"
                />
              </div>

              <!-- Compliance Status Filter -->
              <div class="field col-12 md:col-3">
                <label class="block text-900 font-medium mb-2">Compliance Status</label>
                <Dropdown
                  v-model="filters.complianceStatus"
                  :options="complianceStatusOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="All Statuses"
                  class="w-full"
                  show-clear
                  @change="applyFilters"
                />
              </div>
            </div>

            <!-- Filter Actions -->
            <div class="flex justify-content-end gap-2 mt-3">
              <Button
                label="Clear Filters"
                icon="pi pi-times"
                outlined
                size="small"
                @click="clearFilters"
              />
              <Button
                label="Apply Filters"
                icon="pi pi-check"
                size="small"
                @click="applyFilters"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Data Table -->
      <Card>
        <template #content>
          <DataTable
            v-model:selection="selectedInstitutions"
            :value="institutions"
            :loading="loading"
            :paginator="true"
            :rows="20"
            :total-records="totalRecords"
            :lazy="true"
            paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
            :rows-per-page-options="[10, 20, 50]"
            current-page-report-template="Showing {first} to {last} of {totalRecords} institutions"
            selection-mode="multiple"
            data-key="id"
            @page="onPage"
            @sort="onSort"
          >
            <template #header>
              <div class="flex justify-content-between align-items-center">
                <h3 class="m-0">Institutions ({{ totalRecords }})</h3>
                <div class="flex gap-2">
                  <Button
                    icon="pi pi-refresh"
                    outlined
                    size="small"
                    @click="refreshData"
                    :loading="loading"
                  />
                  <Button
                    icon="pi pi-download"
                    outlined
                    size="small"
                    @click="exportData"
                  />
                </div>
              </div>
            </template>

            <template #empty>
              <div class="text-center py-6">
                <i class="pi pi-building text-4xl text-400 mb-3"></i>
                <p class="text-600 text-lg">No medical institutions found</p>
                <p class="text-500">
                  Try adjusting your search criteria or add a new institution
                </p>
              </div>
            </template>

            <template #loading>
              <div class="text-center py-6">
                <ProgressSpinner />
                <p class="text-600 mt-3">Loading institutions...</p>
              </div>
            </template>

            <!-- Institution Name Column -->
            <Column field="name" header="Institution" sortable style="min-width: 12rem">
              <template #body="{ data }">
                <div class="flex align-items-center">
                  <div class="institution-avatar mr-3">
                    <Avatar
                      :label="data.name.charAt(0).toUpperCase()"
                      shape="circle"
                      size="normal"
                      :style="{ backgroundColor: getInstitutionColor(data.type) }"
                    />
                  </div>
                  <div>
                    <div class="font-semibold text-900">{{ data.name }}</div>
                    <div class="text-600 text-sm">
                      {{ formatInstitutionType(data.type) }}
                    </div>
                  </div>
                </div>
              </template>
            </Column>

            <!-- Location Column -->
            <Column
              field="address.city"
              header="Location"
              sortable
              style="min-width: 10rem"
            >
              <template #body="{ data }">
                <div>
                  <div class="font-medium">
                    {{ data.address.city }}, {{ data.address.state }}
                  </div>
                  <div class="text-600 text-sm">{{ data.address.country }}</div>
                </div>
              </template>
            </Column>

            <!-- Medical Profile Column -->
            <Column header="Medical Profile" style="min-width: 12rem">
              <template #body="{ data }">
                <div class="medical-profile-summary">
                  <div class="flex gap-3 mb-2">
                    <div
                      v-if="data.medicalProfile.bedCapacity"
                      class="flex align-items-center"
                    >
                      <i class="pi pi-home text-600 mr-1"></i>
                      <span class="text-sm"
                        >{{ data.medicalProfile.bedCapacity }} beds</span
                      >
                    </div>
                    <div
                      v-if="data.medicalProfile.surgicalRooms"
                      class="flex align-items-center"
                    >
                      <i class="pi pi-cog text-600 mr-1"></i>
                      <span class="text-sm"
                        >{{ data.medicalProfile.surgicalRooms }} OR</span
                      >
                    </div>
                  </div>
                  <div class="specialties-tags">
                    <Tag
                      v-for="specialty in data.medicalProfile.specialties.slice(0, 2)"
                      :key="specialty"
                      :value="specialty"
                      severity="info"
                      class="mr-1 mb-1"
                    />
                    <Tag
                      v-if="data.medicalProfile.specialties.length > 2"
                      :value="`+${data.medicalProfile.specialties.length - 2} more`"
                      severity="secondary"
                      class="mr-1 mb-1"
                    />
                  </div>
                </div>
              </template>
            </Column>

            <!-- Compliance Status Column -->
            <Column
              field="medicalProfile.complianceStatus"
              header="Compliance"
              sortable
              style="min-width: 8rem"
            >
              <template #body="{ data }">
                <Tag
                  :value="formatComplianceStatus(data.medicalProfile.complianceStatus)"
                  :severity="getComplianceSeverity(data.medicalProfile.complianceStatus)"
                />
              </template>
            </Column>

            <!-- Assigned User Column -->
            <Column
              field="assignedUserId"
              header="Assigned To"
              sortable
              style="min-width: 8rem"
            >
              <template #body="{ data }">
                <div v-if="data.assignedUser" class="flex align-items-center">
                  <Avatar
                    :image="data.assignedUser.avatar"
                    shape="circle"
                    size="small"
                    class="mr-2"
                  />
                  <span class="text-sm"
                    >{{ data.assignedUser.firstName }}
                    {{ data.assignedUser.lastName }}</span
                  >
                </div>
                <span v-else class="text-500 text-sm">Unassigned</span>
              </template>
            </Column>

            <!-- Actions Column -->
            <Column header="Actions" style="min-width: 8rem">
              <template #body="{ data }">
                <div class="flex gap-1">
                  <Button
                    icon="pi pi-eye"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    @click="viewInstitution(data)"
                    v-tooltip="'View Details'"
                  />
                  <Button
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    @click="editInstitution(data)"
                    v-tooltip="'Edit'"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    rounded
                    size="small"
                    @click="confirmDelete(data)"
                    v-tooltip="'Delete'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>

      <!-- Create Institution Dialog -->
      <Dialog
        v-model:visible="showCreateDialog"
        header="Add New Medical Institution"
        :modal="true"
        :closable="true"
        :style="{ width: '70vw' }"
        class="p-fluid"
      >
        <MedicalInstitutionForm
          @institution-saved="onInstitutionCreated"
          @cancel="showCreateDialog = false"
        />
      </Dialog>

      <!-- Import CSV Dialog -->
      <Dialog
        v-model:visible="showImportDialog"
        header="Import Medical Institutions"
        :modal="true"
        :closable="true"
        :style="{ width: '40vw' }"
        class="p-fluid"
      >
        <p class="text-600 mb-4">Import medical institutions from a CSV file</p>
        <!-- Import interface will be implemented in subtask 9.3 -->
        <div class="text-center py-4">
          <i class="pi pi-upload text-4xl text-400 mb-3"></i>
          <p class="text-600">CSV import interface coming soon...</p>
        </div>
        <template #footer>
          <Button
            label="Cancel"
            icon="pi pi-times"
            text
            @click="showImportDialog = false"
          />
          <Button label="Import" icon="pi pi-upload" @click="showImportDialog = false" />
        </template>
      </Dialog>

      <!-- Delete Confirmation Dialog -->
      <ConfirmDialog />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionForm.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { institutionsApi } from "@/services/api"
import type {
  ComplianceStatus,
  InstitutionType,
  MedicalInstitution,
  MedicalInstitutionSearchFilters,
} from "@medical-crm/shared"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Card from "primevue/card"
import Column from "primevue/column"
import ConfirmDialog from "primevue/confirmdialog"
import DataTable from "primevue/datatable"
import Dialog from "primevue/dialog"
import Dropdown from "primevue/dropdown"
import InputNumber from "primevue/inputnumber"
import InputText from "primevue/inputtext"
import MultiSelect from "primevue/multiselect"
import ProgressSpinner from "primevue/progressspinner"
import Tag from "primevue/tag"
import { useConfirm } from "primevue/useconfirm"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

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
    institutions.value = (response as any).data || []
    totalRecords.value = (response as any).meta?.total || 0
  } catch (error) {
    console.error("Error loading institutions:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load medical institutions",
      life: 3000,
    })
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

const searchTimeout = ref<NodeJS.Timeout>()

const onFilterInput = () => {
  // Debounce filter input
  clearTimeout(filterTimeout.value)
  filterTimeout.value = setTimeout(() => {
    applyFilters()
  }, 800)
}

const filterTimeout = ref<NodeJS.Timeout>()

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
  toast.add({
    severity: "info",
    summary: "Export",
    detail: "Export functionality coming soon",
    life: 3000,
  })
}

const viewInstitution = (institution: MedicalInstitution) => {
  router.push(`/institutions/${institution.id}`)
}

const editInstitution = (institution: MedicalInstitution) => {
  router.push(`/institutions/${institution.id}`)
}

const confirmDelete = (institution: MedicalInstitution) => {
  confirm.require({
    message: `Are you sure you want to delete ${institution.name}?`,
    header: "Delete Confirmation",
    icon: "pi pi-exclamation-triangle",
    rejectClass: "p-button-secondary p-button-outlined",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    acceptClass: "p-button-danger",
    accept: () => deleteInstitution(institution),
  })
}

const deleteInstitution = async (institution: MedicalInstitution) => {
  try {
    await institutionsApi.delete(institution.id)
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `${institution.name} has been deleted`,
      life: 3000,
    })
    loadInstitutions()
  } catch (error) {
    console.error("Error deleting institution:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete institution",
      life: 3000,
    })
  }
}

const onInstitutionCreated = (newInstitution: MedicalInstitution) => {
  showCreateDialog.value = false
  loadInstitutions() // Refresh the list
  toast.add({
    severity: "success",
    summary: "Success",
    detail: `${newInstitution.name} has been created successfully`,
    life: 3000,
  })
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
