<template>
  <div class="medical-institution-form">
    <form @submit.prevent="handleSubmit">
      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab value="basic">Basic Information</v-tab>
        <v-tab value="address">Address</v-tab>
        <v-tab value="medical">Medical Profile</v-tab>
        <v-tab value="assignment">Assignment</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <v-window-item value="basic">
          <div class="formgrid grid">
            <div class="field col-12">
              <v-text-field v-model="form.name" label="Institution Name *" :error-messages="errors.name ? [errors.name] : []" />
            </div>
            <div class="field col-12 md:col-6">
              <v-select v-model="form.type" :items="institutionTypeOptions" item-title="label" item-value="value" label="Institution Type *" :error-messages="errors.type ? [errors.type] : []" />
            </div>
            <div class="field col-12 md:col-6">
              <v-switch v-model="form.isActive" :label="form.isActive ? 'Active' : 'Inactive'" inset />
            </div>
            <div class="field col-12">
              <v-combobox v-model="form.tags" label="Tags" multiple chips clearable hint="Press Enter to add tags. Tags help categorize and search institutions." persistent-hint />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field
                v-model="form.accountingNumber"
                label="Accounting Number"
                hint="Client number from your accounting system (Sage, CSV imports)"
                persistent-hint
                clearable
                maxlength="50"
                counter
              />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field
                v-model="form.digiformaId"
                label="Digiforma ID"
                hint="Automatically filled during Digiforma synchronization"
                persistent-hint
                readonly
                disabled
              />
            </div>
          </div>
        </v-window-item>

        <v-window-item value="address">
          <div class="formgrid grid">
            <div class="field col-12">
              <v-text-field v-model="form.address.street" label="Street Address *" :error-messages="errors['address.street'] ? [errors['address.street']] : []" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model="form.address.city" label="City *" :error-messages="errors['address.city'] ? [errors['address.city']] : []" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model="form.address.state" label="State *" :error-messages="errors['address.state'] ? [errors['address.state']] : []" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model="form.address.zipCode" label="ZIP Code *" :error-messages="errors['address.zipCode'] ? [errors['address.zipCode']] : []" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model="form.address.country" label="Country *" :error-messages="errors['address.country'] ? [errors['address.country']] : []" />
            </div>
          </div>
        </v-window-item>

        <v-window-item value="medical">
          <div class="formgrid grid">
            <div class="field col-12 md:col-6">
              <v-text-field v-model.number="form.medicalProfile.bedCapacity" type="number" label="Bed Capacity" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model.number="form.medicalProfile.surgicalRooms" type="number" label="Surgical Rooms" />
            </div>
            <div class="field col-12 md:col-6">
              <v-select v-model="form.medicalProfile.specialties" :items="specialtyOptions" item-title="label" item-value="value" label="Specialties" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-combobox v-model="form.medicalProfile.departments" label="Departments" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-combobox v-model="form.medicalProfile.equipmentTypes" label="Equipment Types" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-combobox v-model="form.medicalProfile.certifications" label="Certifications" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-select v-model="form.medicalProfile.complianceStatus" :items="complianceStatusOptions" item-title="label" item-value="value" label="Compliance Status" />
            </div>
            <div class="field col-12">
              <v-textarea v-model="form.medicalProfile.complianceNotes" label="Compliance Notes" rows="3" auto-grow />
            </div>
          </div>
        </v-window-item>

        <v-window-item value="assignment">
          <div class="formgrid grid">
            <div class="field col-12">
              <v-select v-model="form.assignedUserId" :items="userOptions" item-title="label" item-value="value" label="Assigned User" clearable hint="Assign this institution to a team member for management" persistent-hint />
            </div>
          </div>
        </v-window-item>
      </v-window>

      <div class="flex justify-content-end gap-2 mt-4">
        <v-btn variant="outlined" color="secondary" prepend-icon="mdi-close" @click="$emit('cancel')" type="button">Cancel</v-btn>
        <v-btn :loading="saving" color="primary" :prepend-icon="isEditing ? 'mdi-check' : 'mdi-plus'" type="submit">
          {{ isEditing ? 'Update Institution' : 'Create Institution' }}
        </v-btn>
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

const saving = ref(false)
const isEditing = computed(() => !!props.institution)
const activeTab = ref<'basic' | 'address' | 'medical' | 'assignment'>("basic")

// Form data
const form = reactive({
  name: "",
  type: "" as InstitutionType,
  isActive: true,
  tags: [] as string[],
  accountingNumber: undefined as string | undefined,
  digiformaId: undefined as string | undefined,
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
      form.accountingNumber = institution.accountingNumber
      form.digiformaId = institution.digiformaId
      form.address = { ...institution.address }
      form.medicalProfile = institution.medicalProfile ? {
        bedCapacity: institution.medicalProfile.bedCapacity,
        surgicalRooms: institution.medicalProfile.surgicalRooms,
        specialties: [...(institution.medicalProfile.specialties || [])],
        departments: [...(institution.medicalProfile.departments || [])],
        equipmentTypes: [...(institution.medicalProfile.equipmentTypes || [])],
        certifications: [...(institution.medicalProfile.certifications || [])],
        complianceStatus: institution.medicalProfile.complianceStatus,
        complianceNotes: institution.medicalProfile.complianceNotes || "",
      } : {
        bedCapacity: undefined,
        surgicalRooms: undefined,
        specialties: [],
        departments: [],
        equipmentTypes: [],
        certifications: [],
        complianceStatus: "pending_review" as ComplianceStatus,
        complianceNotes: "",
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
      accountingNumber: form.accountingNumber?.trim() || undefined,
      digiformaId: form.digiformaId?.trim() || undefined,
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

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const savedInstitution: MedicalInstitution = {
      id: props.institution?.id || `institution-${Date.now()}`,
      ...institutionData,
      tags: institutionData.tags || [],
      isActive: institutionData.isActive ?? true,
      medicalProfile: {
        id: props.institution?.medicalProfile?.id || `profile-${Date.now()}`,
        ...institutionData.medicalProfile,
      },
      contactPersons: props.institution?.contactPersons || [],
      createdAt: props.institution?.createdAt || new Date(),
      updatedAt: new Date(),
    }

    emit("institution-saved", savedInstitution)

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
.medical-institution-form { padding: 1rem 0; }
.field { margin-bottom: 1rem; }
.p-error { display: block; margin-top: 0.25rem; }
</style>
