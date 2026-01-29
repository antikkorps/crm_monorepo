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
              <v-switch
                v-model="form.isActive"
                :label="form.isActive ? 'Actif' : 'Inactif'"
                :color="form.isActive ? 'success' : 'grey'"
                inset
              />
            </div>
            <div class="field col-12">
              <v-combobox v-model="form.tags" label="Tags" multiple chips clearable hint="Press Enter to add tags. Tags help categorize and search institutions." persistent-hint />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field
                v-model="form.accountingNumber"
                label="Numéro Comptable"
                hint="Numéro client de votre système comptable (Sage, imports CSV)"
                persistent-hint
                clearable
                maxlength="50"
                counter
                :rules="[v => !v || v.length <= 50 || 'Maximum 50 caractères']"
              />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field
                v-model="form.digiformaId"
                label="ID Digiforma"
                hint="Rempli automatiquement lors de la synchronisation Digiforma"
                persistent-hint
                readonly
                disabled
              />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field
                v-model="form.finess"
                label="N° FINESS"
                hint="Numéro FINESS de l'établissement de santé (9 chiffres)"
                persistent-hint
                clearable
                maxlength="9"
                counter
                :rules="[v => !v || /^\d{9}$/.test(v) || 'Le FINESS doit contenir exactement 9 chiffres']"
              />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field
                v-model="form.groupName"
                label="Groupe"
                hint="Nom du groupe d'appartenance (ex: AP-HP, Ramsay)"
                persistent-hint
                clearable
              />
            </div>
            <div class="field col-12 md:col-6">
              <v-select
                v-model="form.commercialStatus"
                :items="commercialStatusOptions"
                item-title="label"
                item-value="value"
                label="Statut commercial"
                hint="Prospect ou Client"
                persistent-hint
              />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field
                v-model="form.mainPhone"
                label="Téléphone standard"
                hint="Numéro de téléphone principal de l'établissement"
                persistent-hint
                clearable
                type="tel"
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
              <v-text-field v-model.number="form.medicalProfile.bedCapacity" type="number" label="Capacité (lits)" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model.number="form.medicalProfile.surgicalRooms" type="number" label="Salles d'opération" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model.number="form.medicalProfile.staffCount" type="number" label="Effectif" hint="Nombre d'agents/personnel" persistent-hint />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model.number="form.medicalProfile.endoscopyRooms" type="number" label="Salles d'endoscopie" />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model.number="form.medicalProfile.surgicalInterventions" type="number" label="Interventions chir./an" hint="Nombre d'interventions chirurgicales par an" persistent-hint />
            </div>
            <div class="field col-12 md:col-6">
              <v-text-field v-model.number="form.medicalProfile.endoscopyInterventions" type="number" label="Interventions endo./an" hint="Nombre d'interventions endoscopie par an" persistent-hint />
            </div>
            <div class="field col-12 md:col-6">
              <v-select v-model="form.medicalProfile.specialties" :items="specialtyOptions" item-title="label" item-value="value" label="Spécialités" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-combobox v-model="form.medicalProfile.departments" label="Départements" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-combobox v-model="form.medicalProfile.equipmentTypes" label="Équipements" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-combobox v-model="form.medicalProfile.certifications" label="Certifications" multiple chips clearable />
            </div>
            <div class="field col-12 md:col-6">
              <v-select v-model="form.medicalProfile.complianceStatus" :items="complianceStatusOptions" item-title="label" item-value="value" label="Statut de conformité" />
            </div>
            <div class="field col-12">
              <v-textarea v-model="form.medicalProfile.complianceNotes" label="Notes de conformité" rows="3" auto-grow />
            </div>
          </div>
        </v-window-item>

        <v-window-item value="assignment">
          <div class="formgrid grid">
            <div class="field col-12">
              <v-select v-model="form.assignedUserId" :items="userOptions" item-title="label" item-value="value" label="Utilisateur assigné" clearable hint="Assigner cette institution à un membre de l'équipe" persistent-hint />
            </div>
          </div>
        </v-window-item>
      </v-window>

      <div class="form-actions">
        <v-btn variant="outlined" color="secondary" prepend-icon="mdi-close" @click="$emit('cancel')" type="button">
          Annuler
        </v-btn>
        <v-btn :loading="saving" color="primary" :prepend-icon="isEditing ? 'mdi-check' : 'mdi-plus'" type="submit">
          {{ isEditing ? 'Mettre à jour' : 'Créer' }}
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
import { CommercialStatus } from "@medical-crm/shared"
import { computed, onMounted, reactive, ref, watch } from "vue"
import { usersApi } from "@/services/api"

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
  // Commercial fields
  finess: undefined as string | undefined,
  groupName: undefined as string | undefined,
  commercialStatus: CommercialStatus.PROSPECT as CommercialStatus,
  mainPhone: undefined as string | undefined,
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
    // Activity metrics
    staffCount: undefined as number | undefined,
    endoscopyRooms: undefined as number | undefined,
    surgicalInterventions: undefined as number | undefined,
    endoscopyInterventions: undefined as number | undefined,
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

const commercialStatusOptions = [
  { label: "Prospect", value: CommercialStatus.PROSPECT },
  { label: "Client", value: CommercialStatus.CLIENT },
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

const userOptions = ref<{ label: string; value: string }[]>([])

// Load users on mount
const loadUsers = async () => {
  try {
    const response = await usersApi.getAll({ isActive: true })
    // API returns { success: true, data: [...users] }
    const users = (response as any).data || (response as any).users || response
    if (Array.isArray(users)) {
      userOptions.value = users.map((user: any) => ({
        label: `${user.firstName} ${user.lastName}`,
        value: user.id,
      }))
    }
  } catch (error) {
    console.error("Failed to load users:", error)
  }
}

onMounted(() => {
  loadUsers()
})

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
      // Commercial fields
      form.finess = institution.finess
      form.groupName = institution.groupName
      form.commercialStatus = institution.commercialStatus || CommercialStatus.PROSPECT
      form.mainPhone = institution.mainPhone
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
        // Activity metrics
        staffCount: institution.medicalProfile.staffCount,
        endoscopyRooms: institution.medicalProfile.endoscopyRooms,
        surgicalInterventions: institution.medicalProfile.surgicalInterventions,
        endoscopyInterventions: institution.medicalProfile.endoscopyInterventions,
      } : {
        bedCapacity: undefined,
        surgicalRooms: undefined,
        specialties: [],
        departments: [],
        equipmentTypes: [],
        certifications: [],
        complianceStatus: "pending_review" as ComplianceStatus,
        complianceNotes: "",
        staffCount: undefined,
        endoscopyRooms: undefined,
        surgicalInterventions: undefined,
        endoscopyInterventions: undefined,
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
  // Commercial fields
  form.finess = undefined
  form.groupName = undefined
  form.commercialStatus = CommercialStatus.PROSPECT
  form.mainPhone = undefined
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
    staffCount: undefined,
    endoscopyRooms: undefined,
    surgicalInterventions: undefined,
    endoscopyInterventions: undefined,
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
      // Commercial fields
      finess: form.finess?.trim() || undefined,
      groupName: form.groupName?.trim() || undefined,
      commercialStatus: form.commercialStatus,
      mainPhone: form.mainPhone?.trim() || undefined,
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
        // Activity metrics
        staffCount: form.medicalProfile.staffCount,
        endoscopyRooms: form.medicalProfile.endoscopyRooms,
        surgicalInterventions: form.medicalProfile.surgicalInterventions,
        endoscopyInterventions: form.medicalProfile.endoscopyInterventions,
      },
    }

    await new Promise((resolve) => setTimeout(resolve, 1500))

    const savedInstitution: MedicalInstitution = {
      id: props.institution?.id || `institution-${Date.now()}`,
      ...institutionData,
      tags: institutionData.tags || [],
      isActive: institutionData.isActive ?? true,
      commercialStatus: institutionData.commercialStatus ?? CommercialStatus.PROSPECT,
      medicalProfile: {
        id: props.institution?.medicalProfile?.id || `profile-${Date.now()}`,
        ...institutionData.medicalProfile,
      },
      contactPersons: props.institution?.contactPersons || [],
      // Multi-source tracking fields (defaults for new institutions)
      dataSource: props.institution?.dataSource || 'crm',
      isLocked: props.institution?.isLocked ?? false,
      lockedAt: props.institution?.lockedAt,
      lockedReason: props.institution?.lockedReason,
      externalData: props.institution?.externalData || {},
      lastSyncAt: props.institution?.lastSyncAt || {},
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 600px) {
  .form-actions {
    flex-direction: column-reverse;
    gap: 0.5rem;
  }

  .form-actions .v-btn {
    width: 100%;
  }
}
</style>
