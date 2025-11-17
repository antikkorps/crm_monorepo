<template>
  <v-dialog
    v-model="visible"
    max-width="700px"
    persistent
  >
    <v-card>
      <v-card-title>
        {{ isEditing ? $t('meetings.edit') : $t('meetings.new') }}
      </v-card-title>

      <v-card-text class="meeting-form">
        <form @submit.prevent="handleSubmit" class="form-container">
          <!-- Title -->
          <div class="form-group">
            <v-text-field
              id="title"
              v-model="formData.title"
              :error-messages="errors.title ? [errors.title] : []"
              :label="`${$t('meetings.titleField')} *`"
              :placeholder="$t('meetings.titlePlaceholder')"
              density="comfortable"
              hide-details="auto"
            />
          </div>

          <!-- Description -->
          <div class="form-group">
            <v-textarea
              id="description"
              v-model="formData.description"
              :label="$t('meetings.descriptionField')"
              :placeholder="$t('meetings.descriptionPlaceholder')"
              density="comfortable"
              :rows="$vuetify.display.mobile ? 2 : 3"
              auto-grow
              hide-details="auto"
            />
          </div>

          <!-- Date and Time Row -->
          <div class="form-row">
            <div class="form-group">
              <v-text-field
                id="startDate"
                v-model="formData.startDate"
                :error-messages="errors.startDate ? [errors.startDate] : []"
                :label="`${$t('meetings.startDateField')} *`"
                type="datetime-local"
                density="comfortable"
                hide-details="auto"
              />
            </div>

            <div class="form-group">
              <v-text-field
                id="endDate"
                v-model="formData.endDate"
                :error-messages="errors.endDate ? [errors.endDate] : []"
                :label="`${$t('meetings.endDateField')} *`"
                type="datetime-local"
                density="comfortable"
                hide-details="auto"
              />
            </div>
          </div>

          <!-- Location -->
          <div class="form-group">
            <v-text-field
              id="location"
              v-model="formData.location"
              :label="$t('meetings.locationField')"
              :placeholder="$t('meetings.locationPlaceholder')"
              prepend-inner-icon="mdi-map-marker"
              density="comfortable"
              hide-details="auto"
            />
          </div>

          <!-- Institution and Status Row -->
          <div class="form-row">
            <div class="form-group">
              <v-autocomplete
                id="institutionId"
                v-model="formData.institutionId"
                :items="institutionOptions"
                item-title="label"
                item-value="value"
                :label="$t('meetings.institutionField')"
                :placeholder="$t('meetings.institutionPlaceholder')"
                clearable
                :loading="loadingInstitutions"
                density="comfortable"
                hide-details="auto"
                @update:search="onInstitutionSearch"
                no-filter
              />
            </div>

            <div class="form-group" v-if="isEditing">
              <v-select
                id="status"
                v-model="formData.status"
                :items="statusOptions"
                item-title="label"
                item-value="value"
                :label="$t('meetings.statusField')"
                :placeholder="$t('meetings.statusPlaceholder')"
                density="comfortable"
                hide-details="auto"
              />
            </div>
          </div>

          <!-- Participants (Team Members) -->
          <div class="form-group">
            <v-autocomplete
              id="participantIds"
              v-model="formData.participantIds"
              :items="userOptions"
              item-title="label"
              item-value="value"
              :label="$t('meetings.participantsField')"
              :placeholder="$t('meetings.participantsPlaceholder')"
              multiple
              chips
              closable-chips
              :loading="loadingUsers"
              density="comfortable"
              hide-details="auto"
            >
              <template #chip="{ item, props }">
                <v-chip
                  v-bind="props"
                  :text="item.title"
                  closable
                  size="small"
                />
              </template>
            </v-autocomplete>
          </div>

          <!-- Contact Persons (Clients) -->
          <div class="form-group">
            <v-autocomplete
              id="contactPersonIds"
              v-model="formData.contactPersonIds"
              :items="contactPersonOptions"
              item-title="label"
              item-value="value"
              :label="$t('meetings.contactPersonsField')"
              :placeholder="$t('meetings.contactPersonsPlaceholder')"
              multiple
              chips
              closable-chips
              :loading="loadingContactPersons"
              :disabled="!formData.institutionId"
              density="comfortable"
              hide-details="auto"
            >
              <template #chip="{ item, props }">
                <v-chip
                  v-bind="props"
                  :text="item.title"
                  closable
                  size="small"
                />
              </template>
            </v-autocomplete>
            <span v-if="!formData.institutionId" class="text-caption text-disabled">
              {{ $t('meetings.selectInstitutionFirst') }}
            </span>
          </div>
        </form>
      </v-card-text>

      <v-card-actions class="dialog-footer">
        <v-spacer />
        <v-btn
          color="secondary"
          variant="outlined"
          @click="handleCancel"
        >
          {{ $t('meetings.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ isEditing ? $t('meetings.update') : $t('meetings.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { institutionsApi, contactsApi } from "@/services/api"
import { useInstitutionsStore } from "@/stores/institutions"
import { useTeamStore } from "@/stores/team"
import { useI18n } from "vue-i18n"
import type {
  Meeting,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  MeetingStatus,
} from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"

interface Props {
  modelValue: boolean
  meeting?: Meeting | null
  loading?: boolean
}

interface Emits {
  (e: "update:modelValue", visible: boolean): void
  (e: "submit", data: MeetingCreateRequest | MeetingUpdateRequest): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Stores
const teamStore = useTeamStore()
const institutionsStore = useInstitutionsStore()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value)
})

const formData = ref<MeetingCreateRequest & { status?: MeetingStatus; startDate: string; endDate: string }>({
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  location: "",
  institutionId: "",
  participantIds: [],
  contactPersonIds: [],
  status: "scheduled" as MeetingStatus,
})

const errors = ref<Record<string, string>>({})
const userOptions = ref<Array<{ label: string; value: string }>>([])
const contactPersonOptions = ref<Array<{ label: string; value: string }>>([])
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const loadingInstitutionsSearch = ref(false)
const loadingContactPersons = ref(false)

// Computed loading states from stores
const loadingUsers = computed(() => teamStore.loading)
const loadingInstitutions = computed(() => institutionsStore.loading || loadingInstitutionsSearch.value)

const isEditing = computed(() => !!props.meeting)

const { t } = useI18n()

const statusOptions = computed(() => [
  { label: t('meetings.status.scheduled'), value: "scheduled" },
  { label: t('meetings.status.in_progress'), value: "in_progress" },
  { label: t('meetings.status.completed'), value: "completed" },
  { label: t('meetings.status.cancelled'), value: "cancelled" },
])

watch(
  () => props.modelValue,
  (isVisible) => {
    if (isVisible) {
      resetForm()
      if (props.meeting) {
        populateForm(props.meeting)
      }
    }
  }
)

const resetForm = () => {
  formData.value = {
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    institutionId: "",
    participantIds: [],
    contactPersonIds: [],
    status: "scheduled" as MeetingStatus,
  }
  errors.value = {}
  contactPersonOptions.value = []
}

const populateForm = (meeting: Meeting) => {
  formData.value = {
    title: meeting.title,
    description: meeting.description || "",
    startDate: formatDateForInput(new Date(meeting.startDate)),
    endDate: formatDateForInput(new Date(meeting.endDate)),
    location: meeting.location || "",
    institutionId: meeting.institutionId || "",
    participantIds: meeting.participants?.filter((p) => p.userId).map((p) => p.userId!) || [],
    contactPersonIds: meeting.participants?.filter((p) => p.contactPersonId).map((p) => p.contactPersonId!) || [],
    status: meeting.status,
  }

  // Load contact persons for the selected institution
  if (meeting.institutionId) {
    loadContactPersons(meeting.institutionId)
  }
}

const validateForm = (): boolean => {
  errors.value = {}

  if (!formData.value.title.trim()) {
    errors.value.title = t('meetings.titleRequired')
  }

  if (!formData.value.startDate) {
    errors.value.startDate = t('meetings.startDateRequired')
  }

  if (!formData.value.endDate) {
    errors.value.endDate = t('meetings.endDateRequired')
  }

  // Validate that endDate is after startDate
  if (formData.value.startDate && formData.value.endDate) {
    const start = new Date(formData.value.startDate)
    const end = new Date(formData.value.endDate)
    if (end <= start) {
      errors.value.endDate = t('meetings.endDateAfterStart')
    }
  }

  return Object.keys(errors.value).length === 0
}

const handleSubmit = () => {
  if (!validateForm()) return

  const submitData = { ...formData.value }

  // Clean up empty values
  if (!submitData.description?.trim()) {
    delete submitData.description
  }
  if (!submitData.location?.trim()) {
    delete submitData.location
  }
  if (!submitData.institutionId) {
    delete submitData.institutionId
  }
  if (!submitData.participantIds || submitData.participantIds.length === 0) {
    delete submitData.participantIds
  }
  if (!submitData.contactPersonIds || submitData.contactPersonIds.length === 0) {
    delete submitData.contactPersonIds
  }

  // Convert string dates to Date objects for API
  (submitData as any).startDate = new Date(submitData.startDate)
  ;(submitData as any).endDate = new Date(submitData.endDate)

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  visible.value = false
}

const loadUsers = async () => {
  try {
    await teamStore.fetchTeamMembers()

    // Convert team members to user options
    const users: Array<{ label: string; value: string }> = []
    if (Array.isArray(teamStore.teamMembers)) {
      teamStore.teamMembers.forEach((member) => {
        if (member.firstName && member.lastName && member.id) {
          users.push({
            label: `${member.firstName} ${member.lastName}`,
            value: member.id,
          })
        }
      })
    } else {
      console.warn("Team members is not an array:", teamStore.teamMembers)
    }
    userOptions.value = users
  } catch (error) {
    console.error("Error loading users:", error)
    userOptions.value = []
  }
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
      console.warn("Institutions response is not an array:", institutionsStore.institutions)
      institutionOptions.value = []
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  }
}

const loadContactPersons = async (institutionId: string) => {
  if (!institutionId) {
    contactPersonOptions.value = []
    return
  }

  try {
    loadingContactPersons.value = true
    const response = await contactsApi.getAll({ institutionId })
    const data = (response as any).data || response

    let contactsArray: any[] = []
    if (Array.isArray(data)) {
      contactsArray = data
    } else if (data && Array.isArray(data.contacts)) {
      contactsArray = data.contacts
    } else if (data && Array.isArray(data.data)) {
      contactsArray = data.data
    }

    contactPersonOptions.value = contactsArray.map((contact: any) => ({
      label: `${contact.firstName} ${contact.lastName}${contact.title ? ` (${contact.title})` : ""}`,
      value: contact.id,
    }))
  } catch (error) {
    console.error("Error loading contact persons:", error)
    contactPersonOptions.value = []
  } finally {
    loadingContactPersons.value = false
  }
}

// Watch for institution changes to reload contact persons
watch(
  () => formData.value.institutionId,
  (newInstitutionId) => {
    // Always clear selected contact persons when institution changes
    formData.value.contactPersonIds = []
    if (newInstitutionId) {
      loadContactPersons(newInstitutionId)
    } else {
      contactPersonOptions.value = []
    }
  }
)

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

// Helper function to format date for datetime-local input
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

onMounted(() => {
  loadUsers()
  loadInstitutions()
})
</script>

<style scoped>
.meeting-form-dialog {
  width: 90vw;
  max-width: 700px;
}

.meeting-form {
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
  .meeting-form-dialog {
    width: 95vw;
    max-width: none;
  }

  .meeting-form {
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
  .meeting-form-dialog {
    width: 98vw;
    margin: 1rem;
  }

  .meeting-form {
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
