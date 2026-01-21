<template>
  <v-dialog v-model="visible" max-width="700px" persistent>
    <v-card>
      <v-card-title>
        {{ isEditing ? $t("calls.edit") : $t("calls.new") }}
      </v-card-title>

      <v-card-text class="call-form">
        <form @submit.prevent="handleSubmit" class="form-container">
          <!-- Phone Number and Call Type Row -->
          <div class="form-row">
            <div class="form-group">
              <v-text-field
                id="phoneNumber"
                v-model="formData.phoneNumber"
                :error-messages="errors.phoneNumber ? [errors.phoneNumber] : []"
                :label="t('calls.phoneNumberField') + ' *'"
                :placeholder="t('calls.phoneNumberPlaceholder')"
                prepend-inner-icon="mdi-phone"
                density="comfortable"
                hide-details="auto"
              />
            </div>

            <div class="form-group">
              <v-select
                id="callType"
                v-model="formData.callType"
                :items="callTypeOptions"
                :error-messages="errors.callType ? [errors.callType] : []"
                item-title="label"
                item-value="value"
                :label="t('calls.callTypeField') + ' *'"
                :placeholder="t('calls.callTypePlaceholder')"
                prepend-inner-icon="mdi-phone-log"
                density="comfortable"
                hide-details="auto"
              />
            </div>
          </div>

          <!-- Duration -->
          <div class="form-group">
            <v-text-field
              id="duration"
              v-model.number="formData.duration"
              :label="t('calls.durationField')"
              :placeholder="t('calls.durationPlaceholder')"
              type="number"
              min="0"
              prepend-inner-icon="mdi-clock-outline"
              density="comfortable"
              hide-details="auto"
              :hint="t('calls.durationHint')"
              persistent-hint
            />
          </div>

          <!-- Summary -->
          <div class="form-group">
            <v-textarea
              id="summary"
              v-model="formData.summary"
              :label="t('calls.summaryField')"
              :placeholder="t('calls.summaryPlaceholder')"
              density="comfortable"
              :rows="$vuetify.display.mobile ? 2 : 3"
              auto-grow
              hide-details="auto"
            />
          </div>

          <!-- Institution and Contact Person Row -->
          <div class="form-row">
            <div class="form-group">
              <v-autocomplete
                id="institutionId"
                v-model="formData.institutionId"
                :items="institutionOptions"
                item-title="label"
                item-value="value"
                :label="t('calls.institutionField')"
                :placeholder="t('calls.institutionPlaceholder')"
                :clearable="!isInstitutionPreselected"
                :disabled="isInstitutionPreselected"
                :loading="loadingInstitutions"
                density="comfortable"
                hide-details="auto"
                @update:search="onInstitutionSearch"
                no-filter
              />
            </div>

            <div class="form-group">
              <v-autocomplete
                id="contactPersonId"
                v-model="formData.contactPersonId"
                :items="contactOptions"
                item-title="label"
                item-value="value"
                :label="t('calls.contactPersonField')"
                :placeholder="t('calls.contactPersonPlaceholder')"
                clearable
                :loading="loadingContacts"
                :disabled="!formData.institutionId"
                density="comfortable"
                hide-details="auto"
              />
            </div>
          </div>
        </form>
      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer />
        <v-btn color="secondary" variant="outlined" @click="handleCancel">
          {{ $t("calls.cancel") }}
        </v-btn>
        <v-btn color="primary" :loading="loading" @click="handleSubmit">
          {{ isEditing ? $t("calls.update") : $t("calls.create") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { institutionsApi } from "@/services/api"
import { useInstitutionsStore } from "@/stores/institutions"
import type {
  Call,
  CallCreateRequest,
  CallType,
  CallUpdateRequest,
} from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  modelValue: boolean
  call?: Call | null
  loading?: boolean
  preselectedInstitutionId?: string
}

interface Emits {
  (e: "update:modelValue", visible: boolean): void
  (e: "submit", data: CallCreateRequest | CallUpdateRequest): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Stores
const institutionsStore = useInstitutionsStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
})

const formData = ref<CallCreateRequest & { duration?: number }>({
  phoneNumber: "",
  callType: "outgoing" as CallType,
  duration: undefined,
  summary: "",
  institutionId: "",
  contactPersonId: "",
})

const errors = ref<Record<string, string>>({})
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const contactOptions = ref<Array<{ label: string; value: string }>>([])
const loadingInstitutionsSearch = ref(false)
const loadingContacts = ref(false)

// Computed loading states
const loadingInstitutions = computed(
  () => institutionsStore.loading || loadingInstitutionsSearch.value
)

const isEditing = computed(() => !!props.call)
const isInstitutionPreselected = computed(() => !!props.preselectedInstitutionId)

const { t } = useI18n()

const callTypeOptions = computed(() => [
  { label: t("calls.direction.inbound"), value: "incoming" },
  { label: t("calls.direction.outbound"), value: "outgoing" },
  { label: t("calls.status.missed"), value: "missed" },
])

watch(
  () => props.modelValue,
  (isVisible) => {
    if (isVisible) {
      resetForm()
      if (props.call) {
        populateForm(props.call)
      }
    }
  }
)

watch(
  () => formData.value.institutionId,
  async (newInstitutionId) => {
    // Clear contact person when institution changes
    formData.value.contactPersonId = ""
    contactOptions.value = []

    // Load contacts for the selected institution
    if (newInstitutionId) {
      await loadContactsForInstitution(newInstitutionId)
    }
  }
)

const resetForm = () => {
  formData.value = {
    phoneNumber: "",
    callType: "outgoing" as CallType,
    duration: undefined,
    summary: "",
    institutionId: props.preselectedInstitutionId || "",
    contactPersonId: "",
  }
  errors.value = {}

  // Load contacts for preselected institution
  if (props.preselectedInstitutionId) {
    loadContactsForInstitution(props.preselectedInstitutionId)
  }
}

const populateForm = (call: Call) => {
  formData.value = {
    phoneNumber: call.phoneNumber,
    callType: call.callType,
    duration: call.duration,
    summary: call.summary || "",
    institutionId: call.institutionId || "",
    contactPersonId: call.contactPersonId || "",
  }

  // Load contacts if institution is set
  if (call.institutionId) {
    loadContactsForInstitution(call.institutionId)
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.phoneNumber.trim()) {
    errors.value.phoneNumber = t("calls.phoneNumberRequired")
  }

  if (!formData.value.callType) {
    errors.value.callType = t("calls.callTypeRequired")
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validateForm()) return

  const submitData = { ...formData.value }

  // Clean up empty values
  if (!submitData.summary?.trim()) {
    delete submitData.summary
  }
  if (!submitData.institutionId) {
    delete submitData.institutionId
  }
  if (!submitData.contactPersonId) {
    delete submitData.contactPersonId
  }
  if (
    submitData.duration === undefined ||
    submitData.duration === null ||
    submitData.duration === 0
  ) {
    delete submitData.duration
  }

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  visible.value = false
}

const loadInstitutions = async () => {
  try {
    await institutionsStore.fetchInstitutions()

    if (Array.isArray(institutionsStore.institutions)) {
      institutionOptions.value = institutionsStore.institutions.map((institution) => ({
        label: institution.name,
        value: institution.id,
      }))
    } else {
      console.warn(
        "Institutions response is not an array:",
        institutionsStore.institutions
      )
      institutionOptions.value = []
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  }
}

const loadContactsForInstitution = async (institutionId: string) => {
  try {
    loadingContacts.value = true
    // Get institution with its contacts
    const response = await institutionsApi.getById(institutionId)
    const institution =
      (response as any).data?.institution || (response as any).data || response

    // Extract contacts from institution
    const contactsArray = institution?.contactPersons || []

    contactOptions.value = contactsArray.map((contact: any) => ({
      label: `${contact.firstName} ${contact.lastName}`,
      value: contact.id,
    }))
  } catch (error) {
    console.error("Error loading contacts:", error)
    contactOptions.value = []
  } finally {
    loadingContacts.value = false
  }
}

// Debounce timer for institution search
let searchDebounceTimer: NodeJS.Timeout | null = null

const onInstitutionSearch = async (search: string | null) => {
  // Clear previous timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // If search is empty or too short, load all institutions
  if (!search || search.length < 2) {
    loadingInstitutionsSearch.value = true
    await loadInstitutions()
    loadingInstitutionsSearch.value = false
    return
  }

  // Debounce search
  searchDebounceTimer = setTimeout(async () => {
    try {
      loadingInstitutionsSearch.value = true
      const response = await institutionsApi.search(search, { limit: 50 })
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
      console.error("Error searching institutions:", error)
      institutionOptions.value = []
    } finally {
      loadingInstitutionsSearch.value = false
    }
  }, 300) // 300ms debounce
}

onMounted(() => {
  loadInstitutions()
})
</script>

<style scoped>
.call-form-dialog {
  width: 90vw;
  max-width: 700px;
}

.call-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(var(--v-theme-surface-variant), 0.2);
}

@media (max-width: 768px) {
  .call-form-dialog {
    width: 95vw;
    max-width: none;
  }

  .call-form {
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .form-container {
    gap: 1rem;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
    gap: 0.5rem;
    padding-top: 1.5rem;

    .v-btn {
      width: 100%;
    }
  }
}

@media (max-width: 480px) {
  .call-form-dialog {
    width: 98vw;
    margin: 1rem;
  }

  .call-form {
    gap: 0.75rem;
    padding: 0.25rem 0;
  }

  .form-container {
    gap: 0.75rem;
  }

  .form-row {
    gap: 0.5rem;
  }

  .v-card-text {
    padding: 1rem !important;
  }

  .v-card-title {
    padding: 1rem 1rem 0.5rem 1rem !important;
    font-size: 1.25rem;
  }
}
</style>
