<template>
  <div class="medical-institution-form">
    <form @submit.prevent="handleSubmit">
      <TabView>
        <!-- Basic Information Tab -->
        <TabPanel header="Basic Information" value="0">
          <div class="formgrid grid">
            <!-- Institution Name -->
            <div class="field col-12">
              <label for="name" class="block text-900 font-medium mb-2">
                Institution Name *
              </label>
              <InputText
                id="name"
                v-model="form.name"
                class="w-full"
                :class="{ 'p-invalid': errors.name }"
                placeholder="Enter institution name"
              />
              <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
            </div>

            <!-- Institution Type -->
            <div class="field col-12 md:col-6">
              <label for="type" class="block text-900 font-medium mb-2">
                Institution Type *
              </label>
              <Dropdown
                id="type"
                v-model="form.type"
                :options="institutionTypeOptions"
                option-label="label"
                option-value="value"
                placeholder="Select institution type"
                class="w-full"
                :class="{ 'p-invalid': errors.type }"
              />
              <small v-if="errors.type" class="p-error">{{ errors.type }}</small>
            </div>

            <!-- Status -->
            <div class="field col-12 md:col-6">
              <label class="block text-900 font-medium mb-2">Status</label>
              <div class="flex align-items-center">
                <InputSwitch v-model="form.isActive" />
                <span class="ml-2">{{ form.isActive ? "Active" : "Inactive" }}</span>
              </div>
            </div>

            <!-- Tags -->
            <div class="field col-12">
              <label for="tags" class="block text-900 font-medium mb-2">Tags</label>
              <Chips
                id="tags"
                v-model="form.tags"
                class="w-full"
                placeholder="Add tags..."
              />
              <small class="text-600">
                Press Enter to add tags. Tags help categorize and search institutions.
              </small>
            </div>
          </div>
        </TabPanel>

        <!-- Address Information Tab -->
        <TabPanel header="Address" value="1">
          <div class="formgrid grid">
            <!-- Street Address -->
            <div class="field col-12">
              <label for="street" class="block text-900 font-medium mb-2">
                Street Address *
              </label>
              <InputText
                id="street"
                v-model="form.address.street"
                class="w-full"
                :class="{ 'p-invalid': errors['address.street'] }"
                placeholder="Enter street address"
              />
              <small v-if="errors['address.street']" class="p-error">
                {{ errors["address.street"] }}
              </small>
            </div>

            <!-- City and State -->
            <div class="field col-12 md:col-6">
              <label for="city" class="block text-900 font-medium mb-2">City *</label>
              <InputText
                id="city"
                v-model="form.address.city"
                class="w-full"
                :class="{ 'p-invalid': errors['address.city'] }"
                placeholder="Enter city"
              />
              <small v-if="errors['address.city']" class="p-error">
                {{ errors["address.city"] }}
              </small>
            </div>

            <div class="field col-12 md:col-6">
              <label for="state" class="block text-900 font-medium mb-2">State *</label>
              <InputText
                id="state"
                v-model="form.address.state"
                class="w-full"
                :class="{ 'p-invalid': errors['address.state'] }"
                placeholder="Enter state"
              />
              <small v-if="errors['address.state']" class="p-error">
                {{ errors["address.state"] }}
              </small>
            </div>

            <!-- ZIP Code and Country -->
            <div class="field col-12 md:col-6">
              <label for="zipCode" class="block text-900 font-medium mb-2">
                ZIP Code *
              </label>
              <InputText
                id="zipCode"
                v-model="form.address.zipCode"
                class="w-full"
                :class="{ 'p-invalid': errors['address.zipCode'] }"
                placeholder="Enter ZIP code"
              />
              <small v-if="errors['address.zipCode']" class="p-error">
                {{ errors["address.zipCode"] }}
              </small>
            </div>

            <div class="field col-12 md:col-6">
              <label for="country" class="block text-900 font-medium mb-2">
                Country *
              </label>
              <InputText
                id="country"
                v-model="form.address.country"
                class="w-full"
                :class="{ 'p-invalid': errors['address.country'] }"
                placeholder="Enter country"
              />
              <small v-if="errors['address.country']" class="p-error">
                {{ errors["address.country"] }}
              </small>
            </div>
          </div>
        </TabPanel>

        <!-- Medical Profile Tab -->
        <TabPanel header="Medical Profile" value="2">
          <div class="formgrid grid">
            <!-- Capacity Information -->
            <div class="field col-12 md:col-6">
              <label for="bedCapacity" class="block text-900 font-medium mb-2">
                Bed Capacity
              </label>
              <InputNumber
                id="bedCapacity"
                v-model="form.medicalProfile.bedCapacity"
                class="w-full"
                :min="0"
                placeholder="Number of beds"
              />
            </div>

            <div class="field col-12 md:col-6">
              <label for="surgicalRooms" class="block text-900 font-medium mb-2">
                Surgical Rooms
              </label>
              <InputNumber
                id="surgicalRooms"
                v-model="form.medicalProfile.surgicalRooms"
                class="w-full"
                :min="0"
                placeholder="Number of surgical rooms"
              />
            </div>

            <!-- Specialties -->
            <div class="field col-12 md:col-6">
              <label for="specialties" class="block text-900 font-medium mb-2">
                Medical Specialties
              </label>
              <MultiSelect
                id="specialties"
                v-model="form.medicalProfile.specialties"
                :options="specialtyOptions"
                option-label="label"
                option-value="value"
                placeholder="Select specialties"
                class="w-full"
                :filter="true"
              />
            </div>

            <!-- Compliance Status -->
            <div class="field col-12 md:col-6">
              <label for="complianceStatus" class="block text-900 font-medium mb-2">
                Compliance Status
              </label>
              <Dropdown
                id="complianceStatus"
                v-model="form.medicalProfile.complianceStatus"
                :options="complianceStatusOptions"
                option-label="label"
                option-value="value"
                placeholder="Select compliance status"
                class="w-full"
              />
            </div>

            <!-- Departments -->
            <div class="field col-12">
              <label for="departments" class="block text-900 font-medium mb-2">
                Departments
              </label>
              <Chips
                id="departments"
                v-model="form.medicalProfile.departments"
                class="w-full"
                placeholder="Add departments..."
              />
            </div>

            <!-- Equipment Types -->
            <div class="field col-12">
              <label for="equipmentTypes" class="block text-900 font-medium mb-2">
                Equipment Types
              </label>
              <Chips
                id="equipmentTypes"
                v-model="form.medicalProfile.equipmentTypes"
                class="w-full"
                placeholder="Add equipment types..."
              />
            </div>

            <!-- Certifications -->
            <div class="field col-12">
              <label for="certifications" class="block text-900 font-medium mb-2">
                Certifications
              </label>
              <Chips
                id="certifications"
                v-model="form.medicalProfile.certifications"
                class="w-full"
                placeholder="Add certifications..."
              />
            </div>

            <!-- Compliance Notes -->
            <div class="field col-12">
              <label for="complianceNotes" class="block text-900 font-medium mb-2">
                Compliance Notes
              </label>
              <Textarea
                id="complianceNotes"
                v-model="form.medicalProfile.complianceNotes"
                class="w-full"
                rows="3"
                placeholder="Enter compliance notes..."
              />
            </div>
          </div>
        </TabPanel>

        <!-- Assignment Tab -->
        <TabPanel header="Assignment" value="3">
          <div class="formgrid grid">
            <!-- Assigned User -->
            <div class="field col-12">
              <label for="assignedUserId" class="block text-900 font-medium mb-2">
                Assigned User
              </label>
              <Dropdown
                id="assignedUserId"
                v-model="form.assignedUserId"
                :options="userOptions"
                option-label="label"
                option-value="value"
                placeholder="Select assigned user"
                class="w-full"
                show-clear
              />
              <small class="text-600">
                Assign this institution to a team member for management
              </small>
            </div>
          </div>
        </TabPanel>
      </TabView>

      <!-- Form Actions -->
      <div class="flex justify-content-end gap-2 mt-4">
        <Button
          label="Cancel"
          icon="pi pi-times"
          severity="secondary"
          outlined
          @click="$emit('cancel')"
          type="button"
        />
        <Button
          :label="isEditing ? 'Update Institution' : 'Create Institution'"
          :icon="isEditing ? 'pi pi-check' : 'pi pi-plus'"
          :loading="saving"
          type="submit"
        />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type {
  ComplianceStatus,
  InstitutionType,
  MedicalInstitution,
  MedicalInstitutionCreationAttributes,
} from "@medical-crm/shared"
import Button from "primevue/button"
import Chips from "primevue/chips"
import Dropdown from "primevue/dropdown"
import InputNumber from "primevue/inputnumber"
import InputSwitch from "primevue/inputswitch"
import InputText from "primevue/inputtext"
import MultiSelect from "primevue/multiselect"
import TabPanel from "primevue/tabpanel"
import TabView from "primevue/tabview"
import Textarea from "primevue/textarea"
import { computed, reactive, ref, watch } from "vue"

interface Props {
  institution?: MedicalInstitution
}

interface Emits {
  (e: "institution-saved", institution: MedicalInstitution): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
// Snackbar/notifications are handled by parent components (Vuetify)

const saving = ref(false)
const isEditing = computed(() => !!props.institution)

// Form data
const form = reactive({
  name: "",
  type: "" as InstitutionType,
  isActive: true,
  tags: [] as string[],
  address: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  },
  medicalProfile: {
    bedCapacity: undefined as number | undefined,
    surgicalRooms: undefined as number | undefined,
    specialties: [] as string[],
    departments: [] as string[],
    equipmentTypes: [] as string[],
    certifications: [] as string[],
    complianceStatus: "pending_review" as ComplianceStatus,
    complianceNotes: "",
  },
  assignedUserId: undefined as string | undefined,
})

// Form errors
const errors = reactive({
  name: "",
  type: "",
  "address.street": "",
  "address.city": "",
  "address.state": "",
  "address.zipCode": "",
  "address.country": "",
})

// Options
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
  { label: "Radiology", value: "radiology" },
  { label: "Anesthesiology", value: "anesthesiology" },
  { label: "Pathology", value: "pathology" },
  { label: "Psychiatry", value: "psychiatry" },
  { label: "Dermatology", value: "dermatology" },
  { label: "Ophthalmology", value: "ophthalmology" },
  { label: "Otolaryngology", value: "otolaryngology" },
]

const userOptions = ref([
  { label: "John Doe", value: "user1" },
  { label: "Jane Smith", value: "user2" },
  // This will be populated from API in a real implementation
])

// Initialize form with institution data if editing
watch(
  () => props.institution,
  (institution) => {
    if (institution) {
      form.name = institution.name
      form.type = institution.type
      form.isActive = institution.isActive
      form.tags = [...institution.tags]
      form.address = { ...institution.address }
      form.medicalProfile = {
        bedCapacity: institution.medicalProfile.bedCapacity,
        surgicalRooms: institution.medicalProfile.surgicalRooms,
        specialties: [...institution.medicalProfile.specialties],
        departments: [...institution.medicalProfile.departments],
        equipmentTypes: [...institution.medicalProfile.equipmentTypes],
        certifications: [...institution.medicalProfile.certifications],
        complianceStatus: institution.medicalProfile.complianceStatus,
        complianceNotes: institution.medicalProfile.complianceNotes || "",
      }
      form.assignedUserId = institution.assignedUserId
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  form.name = ""
  form.type = "" as InstitutionType
  form.isActive = true
  form.tags = []
  form.address = {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  }
  form.medicalProfile = {
    bedCapacity: undefined,
    surgicalRooms: undefined,
    specialties: [],
    departments: [],
    equipmentTypes: [],
    certifications: [],
    complianceStatus: "pending_review" as ComplianceStatus,
    complianceNotes: "",
  }
  form.assignedUserId = undefined
  clearErrors()
}

function clearErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = ""
  })
}

const validateForm = (): boolean => {
  clearErrors()
  let isValid = true

  // Required fields
  if (!form.name.trim()) {
    errors.name = "Institution name is required"
    isValid = false
  } else if (form.name.length > 255) {
    errors.name = "Institution name must be less than 255 characters"
    isValid = false
  }

  if (!form.type) {
    errors.type = "Institution type is required"
    isValid = false
  }

  // Address validation
  if (!form.address.street.trim()) {
    errors["address.street"] = "Street address is required"
    isValid = false
  }

  if (!form.address.city.trim()) {
    errors["address.city"] = "City is required"
    isValid = false
  }

  if (!form.address.state.trim()) {
    errors["address.state"] = "State is required"
    isValid = false
  }

  if (!form.address.zipCode.trim()) {
    errors["address.zipCode"] = "ZIP code is required"
    isValid = false
  }

  if (!form.address.country.trim()) {
    errors["address.country"] = "Country is required"
    isValid = false
  }

  return isValid
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  saving.value = true

  try {
    const institutionData: MedicalInstitutionCreationAttributes = {
      name: form.name.trim(),
      type: form.type,
      address: {
        street: form.address.street.trim(),
        city: form.address.city.trim(),
        state: form.address.state.trim(),
        zipCode: form.address.zipCode.trim(),
        country: form.address.country.trim(),
      },
      tags: form.tags.filter((tag) => tag.trim()),
      isActive: form.isActive,
      assignedUserId: form.assignedUserId,
      medicalProfile: {
        bedCapacity: form.medicalProfile.bedCapacity,
        surgicalRooms: form.medicalProfile.surgicalRooms,
        specialties: form.medicalProfile.specialties,
        departments: form.medicalProfile.departments,
        equipmentTypes: form.medicalProfile.equipmentTypes,
        certifications: form.medicalProfile.certifications,
        complianceStatus: form.medicalProfile.complianceStatus,
        complianceNotes: form.medicalProfile.complianceNotes?.trim(),
      },
    }

    // In a real implementation, this would call the API
    // For now, we'll simulate the API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const savedInstitution: MedicalInstitution = {
      id: props.institution?.id || `institution-${Date.now()}`,
      ...institutionData,
      tags: institutionData.tags || [],
      isActive: institutionData.isActive ?? true,
      medicalProfile: {
        id: props.institution?.medicalProfile.id || `profile-${Date.now()}`,
        ...institutionData.medicalProfile,
      },
      contactPersons: props.institution?.contactPersons || [],
      createdAt: props.institution?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    emit("institution-saved", savedInstitution)

    // Notify parent via emitted event; parent can display snackbar

    if (!isEditing.value) {
      resetForm()
    }
  } catch (error) {
    console.error("Error saving institution:", error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.medical-institution-form {
  padding: 1rem 0;
}

.field {
  margin-bottom: 1rem;
}

.p-error {
  display: block;
  margin-top: 0.25rem;
}

:deep(.p-tabview-panels) {
  padding: 1.5rem 1rem;
}
</style>
