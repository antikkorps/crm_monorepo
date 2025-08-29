<template>
  <AppLayout>
    <div class="institution-detail-view">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <ProgressSpinner />
        <p class="text-600 mt-3">Loading institution details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <i class="pi pi-exclamation-triangle text-4xl text-orange-500 mb-3"></i>
        <p class="text-600 text-lg mb-4">{{ error }}</p>
        <Button label="Go Back" icon="pi pi-arrow-left" @click="goBack" />
      </div>

      <!-- Institution Details -->
      <div v-else-if="institution">
        <!-- Header Section -->
        <div class="page-header mb-4">
          <div class="flex align-items-center mb-3">
            <Button
              icon="pi pi-arrow-left"
              text
              rounded
              class="mr-3"
              @click="goBack"
              v-tooltip="'Back to Institutions'"
            />
            <div class="institution-header-info">
              <div class="flex align-items-center mb-2">
                <Avatar
                  :label="institution.name.charAt(0).toUpperCase()"
                  shape="circle"
                  size="large"
                  :style="{ backgroundColor: getInstitutionColor(institution.type) }"
                  class="mr-3"
                />
                <div>
                  <h1 class="text-3xl font-bold text-900 m-0">{{ institution.name }}</h1>
                  <p class="text-600 text-lg m-0">
                    {{ formatInstitutionType(institution.type) }}
                  </p>
                </div>
              </div>
              <div class="flex align-items-center gap-3">
                <Tag
                  :value="
                    formatComplianceStatus(institution.medicalProfile.complianceStatus)
                  "
                  :severity="
                    getComplianceSeverity(institution.medicalProfile.complianceStatus)
                  "
                />
                <Tag v-if="institution.assignedUserId" value="Assigned" severity="info" />
                <Tag v-else value="Unassigned" severity="secondary" />
                <Tag
                  :value="institution.isActive ? 'Active' : 'Inactive'"
                  :severity="institution.isActive ? 'success' : 'danger'"
                />
              </div>
            </div>
          </div>

          <div class="page-actions">
            <Button
              label="Edit Institution"
              icon="pi pi-pencil"
              @click="toggleEditMode"
              :severity="editMode ? 'secondary' : 'primary'"
              :outlined="editMode"
            />
            <Button
              label="Delete"
              icon="pi pi-trash"
              severity="danger"
              outlined
              @click="confirmDelete"
            />
          </div>
        </div>

        <!-- Edit Mode Form -->
        <div v-if="editMode">
          <Card>
            <template #title>Edit Institution</template>
            <template #content>
              <MedicalInstitutionForm
                :institution="institution"
                @institution-saved="onInstitutionSaved"
                @cancel="cancelEdit"
              />
            </template>
          </Card>
        </div>

        <!-- View Mode Content -->
        <div v-else>
          <!-- Content Tabs -->
          <TabView>
            <!-- Overview Tab -->
            <TabPanel header="Overview" value="0">
              <div class="grid">
                <!-- Basic Information Card -->
                <div class="col-12 lg:col-6">
                  <Card>
                    <template #title>Basic Information</template>
                    <template #content>
                      <div class="institution-info">
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Institution Name</label>
                          <p class="text-700 mt-1">{{ institution.name }}</p>
                        </div>
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Type</label>
                          <p class="text-700 mt-1">
                            {{ formatInstitutionType(institution.type) }}
                          </p>
                        </div>
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Status</label>
                          <p class="text-700 mt-1">
                            <Tag
                              :value="institution.isActive ? 'Active' : 'Inactive'"
                              :severity="institution.isActive ? 'success' : 'danger'"
                            />
                          </p>
                        </div>
                        <div class="info-item">
                          <label class="font-semibold text-900">Tags</label>
                          <div class="mt-1">
                            <Tag
                              v-for="tag in institution.tags"
                              :key="tag"
                              :value="tag"
                              severity="secondary"
                              class="mr-1 mb-1"
                            />
                            <span v-if="!institution.tags.length" class="text-500">
                              No tags
                            </span>
                          </div>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>

                <!-- Address Information Card -->
                <div class="col-12 lg:col-6">
                  <Card>
                    <template #title>Address Information</template>
                    <template #content>
                      <div class="address-info">
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Street Address</label>
                          <p class="text-700 mt-1">{{ institution.address.street }}</p>
                        </div>
                        <div class="grid">
                          <div class="col-6">
                            <div class="info-item mb-3">
                              <label class="font-semibold text-900">City</label>
                              <p class="text-700 mt-1">{{ institution.address.city }}</p>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="info-item mb-3">
                              <label class="font-semibold text-900">State</label>
                              <p class="text-700 mt-1">{{ institution.address.state }}</p>
                            </div>
                          </div>
                        </div>
                        <div class="grid">
                          <div class="col-6">
                            <div class="info-item mb-3">
                              <label class="font-semibold text-900">ZIP Code</label>
                              <p class="text-700 mt-1">
                                {{ institution.address.zipCode }}
                              </p>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="info-item">
                              <label class="font-semibold text-900">Country</label>
                              <p class="text-700 mt-1">
                                {{ institution.address.country }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </template>
                  </Card>
                </div>
              </div>
            </TabPanel>

            <!-- Medical Profile Tab -->
            <TabPanel header="Medical Profile" value="1">
              <Card>
                <template #title>Medical Information</template>
                <template #content>
                  <div class="medical-profile-info">
                    <div class="grid">
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Bed Capacity</label>
                          <p class="text-700 mt-1 text-2xl">
                            {{
                              institution.medicalProfile.bedCapacity || "Not specified"
                            }}
                          </p>
                        </div>
                      </div>
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Surgical Rooms</label>
                          <p class="text-700 mt-1 text-2xl">
                            {{
                              institution.medicalProfile.surgicalRooms || "Not specified"
                            }}
                          </p>
                        </div>
                      </div>
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Specialties</label>
                          <p class="text-700 mt-1">
                            {{ institution.medicalProfile.specialties.length }}
                          </p>
                        </div>
                      </div>
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Departments</label>
                          <p class="text-700 mt-1">
                            {{ institution.medicalProfile.departments.length }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="grid">
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900"
                            >Medical Specialties</label
                          >
                          <div class="mt-2">
                            <Tag
                              v-for="specialty in institution.medicalProfile.specialties"
                              :key="specialty"
                              :value="specialty"
                              severity="info"
                              class="mr-1 mb-1"
                            />
                            <span
                              v-if="!institution.medicalProfile.specialties.length"
                              class="text-500"
                            >
                              No specialties specified
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Departments</label>
                          <div class="mt-2">
                            <Tag
                              v-for="department in institution.medicalProfile.departments"
                              :key="department"
                              :value="department"
                              severity="secondary"
                              class="mr-1 mb-1"
                            />
                            <span
                              v-if="!institution.medicalProfile.departments.length"
                              class="text-500"
                            >
                              No departments specified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="grid">
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Equipment Types</label>
                          <div class="mt-2">
                            <Tag
                              v-for="equipment in institution.medicalProfile
                                .equipmentTypes"
                              :key="equipment"
                              :value="equipment"
                              severity="warning"
                              class="mr-1 mb-1"
                            />
                            <span
                              v-if="!institution.medicalProfile.equipmentTypes.length"
                              class="text-500"
                            >
                              No equipment specified
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Certifications</label>
                          <div class="mt-2">
                            <Tag
                              v-for="certification in institution.medicalProfile
                                .certifications"
                              :key="certification"
                              :value="certification"
                              severity="success"
                              class="mr-1 mb-1"
                            />
                            <span
                              v-if="!institution.medicalProfile.certifications.length"
                              class="text-500"
                            >
                              No certifications specified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="institution.medicalProfile.complianceNotes" class="grid">
                      <div class="col-12">
                        <div class="info-item">
                          <label class="font-semibold text-900">Compliance Notes</label>
                          <p class="text-700 mt-1">
                            {{ institution.medicalProfile.complianceNotes }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </Card>
            </TabPanel>

            <!-- Contact Persons Tab -->
            <TabPanel header="Contact Persons" value="2">
              <Card>
                <template #title>
                  <div class="flex justify-content-between align-items-center">
                    <span>Contact Persons</span>
                    <Button
                      label="Add Contact"
                      icon="pi pi-plus"
                      size="small"
                      @click="showAddContactDialog = true"
                    />
                  </div>
                </template>
                <template #content>
                  <div
                    v-if="institution.contactPersons.length === 0"
                    class="text-center py-6"
                  >
                    <i class="pi pi-users text-4xl text-400 mb-3"></i>
                    <p class="text-600 text-lg">No contact persons added</p>
                    <p class="text-500">Add contact persons to manage relationships</p>
                  </div>

                  <div v-else class="contact-persons-list">
                    <div
                      v-for="contact in institution.contactPersons"
                      :key="contact.id"
                      class="contact-person-card mb-3"
                    >
                      <Card>
                        <template #content>
                          <div class="flex justify-content-between align-items-start">
                            <div class="contact-info">
                              <div class="flex align-items-center mb-2">
                                <Avatar
                                  :label="`${contact.firstName.charAt(
                                    0
                                  )}${contact.lastName.charAt(0)}`"
                                  shape="circle"
                                  size="normal"
                                  class="mr-3"
                                />
                                <div>
                                  <h4 class="text-900 font-semibold m-0">
                                    {{ contact.firstName }} {{ contact.lastName }}
                                    <Tag
                                      v-if="contact.isPrimary"
                                      value="Primary"
                                      severity="success"
                                      class="ml-2"
                                    />
                                  </h4>
                                  <p class="text-600 m-0">
                                    {{ contact.title || "No title" }}
                                  </p>
                                </div>
                              </div>
                              <div class="contact-details">
                                <div class="flex align-items-center mb-1">
                                  <i class="pi pi-envelope text-600 mr-2"></i>
                                  <span class="text-700">{{ contact.email }}</span>
                                </div>
                                <div
                                  v-if="contact.phone"
                                  class="flex align-items-center mb-1"
                                >
                                  <i class="pi pi-phone text-600 mr-2"></i>
                                  <span class="text-700">{{ contact.phone }}</span>
                                </div>
                                <div
                                  v-if="contact.department"
                                  class="flex align-items-center"
                                >
                                  <i class="pi pi-building text-600 mr-2"></i>
                                  <span class="text-700">{{ contact.department }}</span>
                                </div>
                              </div>
                            </div>
                            <div class="contact-actions">
                              <Button
                                icon="pi pi-pencil"
                                text
                                rounded
                                size="small"
                                @click="editContact(contact)"
                                v-tooltip="'Edit Contact'"
                              />
                              <Button
                                icon="pi pi-trash"
                                text
                                rounded
                                size="small"
                                severity="danger"
                                @click="confirmDeleteContact(contact)"
                                v-tooltip="'Delete Contact'"
                              />
                            </div>
                          </div>
                        </template>
                      </Card>
                    </div>
                  </div>
                </template>
              </Card>
            </TabPanel>
          </TabView>
        </div>

        <!-- Add Contact Dialog -->
        <Dialog
          v-model:visible="showAddContactDialog"
          header="Add Contact Person"
          :modal="true"
          :closable="true"
          :style="{ width: '40vw' }"
          class="p-fluid"
        >
          <ContactPersonForm
            :institution-id="institution.id"
            @contact-saved="onContactSaved"
            @cancel="showAddContactDialog = false"
          />
        </Dialog>

        <!-- Edit Contact Dialog -->
        <Dialog
          v-model:visible="showEditContactDialog"
          header="Edit Contact Person"
          :modal="true"
          :closable="true"
          :style="{ width: '40vw' }"
          class="p-fluid"
        >
          <ContactPersonForm
            v-if="editingContact"
            :institution-id="institution.id"
            :contact="editingContact"
            @contact-saved="onContactSaved"
            @cancel="showEditContactDialog = false"
          />
        </Dialog>

        <!-- Delete Contact Confirmation -->
        <ConfirmDialog />

        <!-- Delete Institution Confirmation -->
        <ConfirmDialog />
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import ContactPersonForm from "@/components/institutions/ContactPersonForm.vue"
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionForm.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { institutionsApi } from "@/services/api"
import type {
  ComplianceStatus,
  ContactPerson,
  InstitutionType,
  MedicalInstitution,
} from "@medical-crm/shared"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Card from "primevue/card"
import ConfirmDialog from "primevue/confirmdialog"
import Dialog from "primevue/dialog"
import ProgressSpinner from "primevue/progressspinner"
import TabPanel from "primevue/tabpanel"
import TabView from "primevue/tabview"
import Tag from "primevue/tag"
import { useConfirm } from "primevue/useconfirm"
import { useToast } from "primevue/usetoast"
import { onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

// Reactive data
const institution = ref<MedicalInstitution | null>(null)
const loading = ref(false)
const error = ref("")
const editMode = ref(false)
const showAddContactDialog = ref(false)
const showEditContactDialog = ref(false)
const editingContact = ref<ContactPerson | null>(null)

// Methods
const loadInstitution = async () => {
  const institutionId = route.params.id as string
  if (!institutionId) {
    error.value = "Institution ID is required"
    return
  }

  loading.value = true
  error.value = ""

  try {
    // In a real implementation, this would call the API
    // For now, we'll simulate the API call with mock data
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock institution data
    institution.value = {
      id: institutionId,
      name: "General Hospital",
      type: "hospital" as InstitutionType,
      address: {
        street: "123 Medical Center Drive",
        city: "Healthcare City",
        state: "CA",
        zipCode: "90210",
        country: "USA",
      },
      tags: ["trauma-center", "teaching-hospital"],
      isActive: true,
      assignedUserId: "user1",
      medicalProfile: {
        id: "profile1",
        bedCapacity: 250,
        surgicalRooms: 12,
        specialties: ["cardiology", "neurology", "emergency_medicine"],
        departments: ["Emergency", "ICU", "Surgery", "Cardiology"],
        equipmentTypes: ["MRI", "CT Scanner", "X-Ray"],
        certifications: ["Joint Commission", "HIPAA Compliant"],
        complianceStatus: "compliant" as ComplianceStatus,
        complianceNotes:
          "All certifications up to date. Next audit scheduled for Q3 2024.",
      },
      contactPersons: [
        {
          id: "contact1",
          firstName: "Dr. Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@generalhospital.com",
          phone: "+1-555-0123",
          title: "Chief Medical Officer",
          department: "Administration",
          isPrimary: true,
        },
        {
          id: "contact2",
          firstName: "Michael",
          lastName: "Chen",
          email: "michael.chen@generalhospital.com",
          phone: "+1-555-0124",
          title: "Procurement Manager",
          department: "Purchasing",
          isPrimary: false,
        },
      ],
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-02-20"),
    }
  } catch (err) {
    console.error("Error loading institution:", err)
    error.value = "Failed to load institution details"
  } finally {
    loading.value = false
  }
}

const toggleEditMode = () => {
  editMode.value = !editMode.value
}

const cancelEdit = () => {
  editMode.value = false
}

const onInstitutionSaved = (savedInstitution: MedicalInstitution) => {
  institution.value = savedInstitution
  editMode.value = false
  toast.add({
    severity: "success",
    summary: "Success",
    detail: "Institution updated successfully",
    life: 3000,
  })
}

const confirmDelete = () => {
  confirm.require({
    message: `Are you sure you want to delete ${institution.value?.name}?`,
    header: "Delete Confirmation",
    icon: "pi pi-exclamation-triangle",
    rejectClass: "p-button-secondary p-button-outlined",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    acceptClass: "p-button-danger",
    accept: () => deleteInstitution(),
  })
}

const deleteInstitution = async () => {
  if (!institution.value) return

  try {
    await institutionsApi.delete(institution.value.id)
    toast.add({
      severity: "success",
      summary: "Success",
      detail: `${institution.value.name} has been deleted`,
      life: 3000,
    })
    router.push("/institutions")
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

const editContact = (contact: ContactPerson) => {
  editingContact.value = contact
  showEditContactDialog.value = true
}

const confirmDeleteContact = (contact: ContactPerson) => {
  confirm.require({
    message: `Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`,
    header: "Delete Contact",
    icon: "pi pi-exclamation-triangle",
    rejectClass: "p-button-secondary p-button-outlined",
    rejectLabel: "Cancel",
    acceptLabel: "Delete",
    acceptClass: "p-button-danger",
    accept: () => deleteContact(contact),
  })
}

const deleteContact = async (contact: ContactPerson) => {
  if (!institution.value) return

  try {
    // In a real implementation, this would call the API
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Remove contact from the list
    institution.value.contactPersons = institution.value.contactPersons.filter(
      (c) => c.id !== contact.id
    )

    toast.add({
      severity: "success",
      summary: "Success",
      detail: `${contact.firstName} ${contact.lastName} has been deleted`,
      life: 3000,
    })
  } catch (error) {
    console.error("Error deleting contact:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete contact",
      life: 3000,
    })
  }
}

const onContactSaved = (savedContact: ContactPerson) => {
  if (!institution.value) return

  const existingIndex = institution.value.contactPersons.findIndex(
    (c) => c.id === savedContact.id
  )

  if (existingIndex >= 0) {
    // Update existing contact
    institution.value.contactPersons[existingIndex] = savedContact
  } else {
    // Add new contact
    institution.value.contactPersons.push(savedContact)
  }

  showAddContactDialog.value = false
  showEditContactDialog.value = false
  editingContact.value = null
}

const goBack = () => {
  router.push("/institutions")
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
  loadInstitution()
})
</script>

<style scoped>
.institution-detail-view {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.institution-header-info {
  flex: 1;
}

.page-actions {
  display: flex;
  gap: 0.5rem;
}

.info-item {
  margin-bottom: 1rem;
}

.info-item label {
  display: block;
  margin-bottom: 0.25rem;
}

.contact-person-card {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.contact-info {
  flex: 1;
}

.contact-actions {
  display: flex;
  gap: 0.25rem;
}

.medical-profile-info {
  font-size: 0.875rem;
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
}
</style>
