<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="800px"
    persistent
  >
    <v-card>
      <v-card-title class="dialog-header">
        <span class="text-h5">{{ isEdit ? $t('reminders.edit') : $t('reminders.new') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="handleCancel"
        ></v-btn>
      </v-card-title>

      <v-card-text class="dialog-content">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <!-- Title -->
          <v-text-field
            v-model="formData.title"
            :label="`${$t('reminders.titleField')} *`"
            :placeholder="$t('reminders.titlePlaceholder')"
            prepend-inner-icon="mdi-format-title"
            :rules="[required]"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <!-- Description -->
          <v-textarea
            v-model="formData.description"
            :label="$t('reminders.descriptionField')"
            :placeholder="$t('reminders.descriptionPlaceholder')"
            prepend-inner-icon="mdi-text"
            variant="outlined"
            density="comfortable"
            rows="4"
            class="mb-4"
          />

          <!-- Date and Time -->
          <div class="date-time-row mb-4">
            <v-text-field
              v-model="formData.reminderDate"
              :label="`${$t('reminders.dateTimeField')} *`"
              type="datetime-local"
              prepend-inner-icon="mdi-calendar-clock"
              :rules="[required]"
              variant="outlined"
              density="comfortable"
            />
          </div>

          <!-- Priority -->
          <v-select
            v-model="formData.priority"
            :items="priorityOptions"
            item-title="label"
            item-value="value"
            :label="`${$t('reminders.priorityField')} *`"
            prepend-inner-icon="mdi-flag"
            :rules="[required]"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                </template>
              </v-list-item>
            </template>
            <template #selection="{ item }">
              <v-chip :color="item.raw.color" size="small" variant="flat">
                <v-icon start>{{ item.raw.icon }}</v-icon>
                {{ item.raw.label }}
              </v-chip>
            </template>
          </v-select>

          <!-- Institution -->
          <v-select
            v-model="formData.institutionId"
            :items="institutionOptions"
            item-title="label"
            item-value="value"
            :label="$t('reminders.institutionField')"
            :placeholder="$t('reminders.institutionPlaceholder')"
            prepend-inner-icon="mdi-office-building"
            :clearable="!isInstitutionPreselected"
            :disabled="isInstitutionPreselected"
            :loading="loadingInstitutions"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <!-- Contact Person -->
          <v-select
            v-model="formData.contactPersonId"
            :items="contactOptions"
            item-title="label"
            item-value="value"
            :label="$t('reminders.contactPersonField')"
            :placeholder="$t('reminders.contactPersonPlaceholder')"
            prepend-inner-icon="mdi-account"
            clearable
            :loading="loadingContacts"
            :disabled="!formData.institutionId"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          />

          <!-- Recurring Section -->
          <div class="recurring-section">
            <v-divider class="mb-4" />
            <h3 class="recurring-title mb-3">
              <v-icon class="me-2">mdi-repeat</v-icon>
              {{ $t('reminders.recurring.title') }}
            </h3>

            <v-switch
              v-model="isRecurring"
              :label="$t('reminders.recurring.label')"
              color="info"
              hide-details
              class="mb-3"
            />

            <v-expand-transition>
              <div v-if="isRecurring" class="recurring-fields">
                <v-select
                  v-model="formData.recurring.frequency"
                  :items="frequencyOptions"
                  item-title="label"
                  item-value="value"
                  :label="`${$t('reminders.recurring.frequency')} *`"
                  prepend-inner-icon="mdi-calendar-refresh"
                  :rules="isRecurring ? [required] : []"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                />

                <v-text-field
                  v-model="formData.recurring.endDate"
                  :label="$t('reminders.recurring.endDate')"
                  type="date"
                  prepend-inner-icon="mdi-calendar-end"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  :hint="$t('reminders.recurring.endDateHint')"
                  persistent-hint
                />
              </div>
            </v-expand-transition>
          </div>
        </v-form>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn
          color="secondary"
          variant="outlined"
          @click="handleCancel"
          :disabled="loading"
        >
          {{ $t('reminders.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          @click="handleSubmit"
          :loading="loading"
        >
          {{ isEdit ? $t('reminders.update') : $t('reminders.create') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { institutionsApi, contactsApi } from "@/services/api"
import type { Reminder, ReminderCreateRequest, ReminderPriority } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

interface Props {
  modelValue: boolean
  reminder?: Reminder
  loading?: boolean
  preselectedInstitutionId?: string
}

interface Emits {
  (e: "update:modelValue", value: boolean): void
  (e: "submit", data: ReminderCreateRequest): void
  (e: "cancel"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref()
const loadingInstitutions = ref(false)
const loadingContacts = ref(false)
const institutionOptions = ref<Array<{ label: string; value: string }>>([])
const contactOptions = ref<Array<{ label: string; value: string }>>([])
const isRecurring = ref(false)

const formData = ref<any>({
  title: "",
  description: "",
  reminderDate: "",
  priority: "medium" as ReminderPriority,
  institutionId: undefined,
  contactPersonId: undefined,
  recurring: {
    frequency: "daily",
    endDate: undefined,
  },
})

const isEdit = computed(() => !!props.reminder)
const isInstitutionPreselected = computed(() => !!props.preselectedInstitutionId)

const { t } = useI18n()

const getPriorityOptions = () => [
  {
    label: t('reminders.priority.low'),
    value: "low" as ReminderPriority,
    color: "blue",
    icon: "mdi-information-outline"
  },
  {
    label: t('reminders.priority.medium'),
    value: "medium" as ReminderPriority,
    color: "orange",
    icon: "mdi-alert-circle-outline"
  },
  {
    label: t('reminders.priority.high'),
    value: "high" as ReminderPriority,
    color: "red",
    icon: "mdi-alert"
  },
  {
    label: t('reminders.priority.urgent'),
    value: "urgent" as ReminderPriority,
    color: "purple",
    icon: "mdi-alert-octagon"
  },
]

const getFrequencyOptions = () => [
  { label: t('reminders.recurring.frequencies.daily'), value: "daily" },
  { label: t('reminders.recurring.frequencies.weekly'), value: "weekly" },
  { label: t('reminders.recurring.frequencies.monthly'), value: "monthly" },
]

const priorityOptions = getPriorityOptions()
const frequencyOptions = getFrequencyOptions()

const required = (value: any) => !!value || t('reminders.requiredField')

watch(
  () => props.reminder,
  (newReminder) => {
    if (newReminder) {
      const reminderDate = new Date(newReminder.reminderDate)
      const formattedDate = reminderDate.toISOString().slice(0, 16)

      formData.value = {
        title: newReminder.title,
        description: newReminder.description || "",
        reminderDate: formattedDate,
        priority: newReminder.priority,
        institutionId: newReminder.institutionId,
        contactPersonId: newReminder.contactPersonId,
        recurring: {
          frequency: newReminder.recurring?.frequency || "daily",
          endDate: newReminder.recurring?.endDate
            ? new Date(newReminder.recurring.endDate).toISOString().split('T')[0]
            : undefined,
        },
      }

      isRecurring.value = !!newReminder.recurring

      // Load contacts if institution is set
      if (newReminder.institutionId) {
        loadContacts(newReminder.institutionId)
      }
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      // Dialog opened - reset form with preselected values if creating new
      if (!props.reminder) {
        resetForm()
      }
    } else {
      // Dialog closed
      resetForm()
    }
  }
)

watch(
  () => formData.value.institutionId,
  (newInstitutionId) => {
    if (newInstitutionId) {
      loadContacts(newInstitutionId)
    } else {
      contactOptions.value = []
      formData.value.contactPersonId = undefined
    }
  }
)

const handleSubmit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  const submitData: ReminderCreateRequest = {
    title: formData.value.title,
    description: formData.value.description || undefined,
    reminderDate: new Date(formData.value.reminderDate),
    priority: formData.value.priority,
    institutionId: formData.value.institutionId || undefined,
    contactPersonId: formData.value.contactPersonId || undefined,
    recurring: isRecurring.value
      ? {
          frequency: formData.value.recurring.frequency,
          endDate: formData.value.recurring.endDate
            ? new Date(formData.value.recurring.endDate)
            : undefined,
        }
      : undefined,
  }

  emit("submit", submitData)
}

const handleCancel = () => {
  emit("cancel")
  emit("update:modelValue", false)
}

const resetForm = () => {
  if (!props.reminder) {
    formData.value = {
      title: "",
      description: "",
      reminderDate: "",
      priority: "medium",
      institutionId: props.preselectedInstitutionId || undefined,
      contactPersonId: undefined,
      recurring: {
        frequency: "daily",
        endDate: undefined,
      },
    }
    isRecurring.value = false
    formRef.value?.resetValidation()

    // Load contacts for preselected institution
    if (props.preselectedInstitutionId) {
      loadContacts(props.preselectedInstitutionId)
    }
  }
}

const loadInstitutions = async () => {
  try {
    loadingInstitutions.value = true
    const response = await institutionsApi.getAll()
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
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  } finally {
    loadingInstitutions.value = false
  }
}

const loadContacts = async (institutionId: string) => {
  try {
    loadingContacts.value = true
    const response = await contactsApi.getByInstitution(institutionId)
    const data = (response as any).data || response

    let contactsArray: any[] = []
    if (Array.isArray(data)) {
      contactsArray = data
    } else if (data && Array.isArray(data.contacts)) {
      contactsArray = data.contacts
    }

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

onMounted(() => {
  loadInstitutions()
})
</script>

<style scoped>
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.dialog-content {
  padding: 2rem;
}

.dialog-actions {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.date-time-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.recurring-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 1rem;
}

.recurring-title {
  display: flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.recurring-fields {
  margin-top: 1rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .dialog-header {
    padding: 1rem;
  }

  .dialog-content {
    padding: 1rem;
  }

  .date-time-row {
    grid-template-columns: 1fr;
  }
}
</style>
