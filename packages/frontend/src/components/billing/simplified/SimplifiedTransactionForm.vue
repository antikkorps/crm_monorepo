<template>
  <v-dialog v-model="isOpen" max-width="800" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon
          :icon="isEditing ? 'mdi-pencil' : 'mdi-link-variant-plus'"
          class="mr-2"
        />
        {{
          isEditing
            ? t("simplifiedTransactions.form.editTitle")
            : t("simplifiedTransactions.form.createTitle")
        }}
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="isFormValid" @submit.prevent="handleSubmit">
          <!-- Type Selection -->
          <v-card variant="outlined" class="mb-4">
            <v-card-subtitle class="pt-3">
              {{ t("simplifiedTransactions.form.typeSelection") }}
            </v-card-subtitle>
            <v-card-text>
              <v-btn-toggle
                v-model="formData.type"
                mandatory
                color="primary"
                variant="outlined"
                divided
                class="type-toggle"
              >
                <v-btn value="quote" :disabled="isEditing">
                  <v-icon start>mdi-file-document-outline</v-icon>
                  {{ t("simplifiedTransactions.type.quote") }}
                </v-btn>
                <v-btn value="invoice" :disabled="isEditing">
                  <v-icon start>mdi-receipt-text-outline</v-icon>
                  {{ t("simplifiedTransactions.type.invoice") }}
                </v-btn>
                <v-btn value="engagement_letter" :disabled="isEditing">
                  <v-icon start>mdi-file-sign</v-icon>
                  {{ t("simplifiedTransactions.type.engagement_letter") }}
                </v-btn>
                <v-btn value="contract" :disabled="isEditing">
                  <v-icon start>mdi-file-document-edit-outline</v-icon>
                  {{ t("simplifiedTransactions.type.contract") }}
                </v-btn>
              </v-btn-toggle>
            </v-card-text>
          </v-card>

          <!-- Basic Information -->
          <v-card variant="outlined" class="mb-4">
            <v-card-subtitle class="pt-3">
              {{ t("simplifiedTransactions.form.basicInfo") }}
            </v-card-subtitle>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" md="6" v-if="!institutionId">
                  <v-autocomplete
                    v-model="formData.institutionId"
                    :items="institutionOptions"
                    item-title="name"
                    item-value="id"
                    :label="t('simplifiedTransactions.form.institution') + ' *'"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                    :loading="loadingInstitutions"
                    @update:search="onInstitutionSearch"
                    no-filter
                    clearable
                  />
                </v-col>

                <v-col cols="12" :md="institutionId ? 12 : 6">
                  <v-text-field
                    v-model="formData.referenceNumber"
                    :label="t('simplifiedTransactions.form.referenceNumber')"
                    :placeholder="t('simplifiedTransactions.form.referenceNumberPlaceholder')"
                    variant="outlined"
                    density="compact"
                    prepend-inner-icon="mdi-link-variant"
                  />
                </v-col>

                <v-col cols="12" md="8">
                  <v-text-field
                    v-model="formData.title"
                    :label="t('simplifiedTransactions.form.title') + ' *'"
                    :placeholder="t('simplifiedTransactions.form.titlePlaceholder')"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="formData.date"
                    :label="t('simplifiedTransactions.form.date') + ' *'"
                    type="date"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                  />
                </v-col>

                <v-col cols="12">
                  <v-textarea
                    v-model="formData.description"
                    :label="t('simplifiedTransactions.form.description')"
                    :placeholder="t('simplifiedTransactions.form.descriptionPlaceholder')"
                    variant="outlined"
                    density="compact"
                    rows="2"
                    auto-grow
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Financial Information -->
          <v-card variant="outlined" class="mb-4">
            <v-card-subtitle class="pt-3">
              {{ t("simplifiedTransactions.form.financial") }}
            </v-card-subtitle>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="formData.amountHt"
                    :label="t('simplifiedTransactions.form.amountHt') + ' *'"
                    type="number"
                    step="0.01"
                    min="0"
                    variant="outlined"
                    density="compact"
                    suffix="€"
                    :rules="[rules.required, rules.positiveNumber]"
                    @update:model-value="calculateTtc"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="formData.vatRate"
                    :label="t('simplifiedTransactions.form.vatRate')"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    variant="outlined"
                    density="compact"
                    suffix="%"
                    @update:model-value="calculateTtc"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model.number="formData.amountTtc"
                    :label="t('simplifiedTransactions.form.amountTtc')"
                    type="number"
                    step="0.01"
                    min="0"
                    variant="outlined"
                    density="compact"
                    suffix="€"
                    :hint="t('simplifiedTransactions.form.amountTtcHint')"
                    persistent-hint
                    readonly
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.status"
                    :items="statusOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('simplifiedTransactions.status.label') + ' *'"
                    variant="outlined"
                    density="compact"
                    :rules="[rules.required]"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Invoice-specific fields -->
          <v-card v-if="formData.type === 'invoice'" variant="outlined" class="mb-4">
            <v-card-subtitle class="pt-3">
              {{ t("simplifiedTransactions.form.invoiceFields") }}
            </v-card-subtitle>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.dueDate"
                    :label="t('simplifiedTransactions.form.dueDate')"
                    type="date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.paymentStatus"
                    :items="paymentStatusOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('simplifiedTransactions.paymentStatus.label')"
                    variant="outlined"
                    density="compact"
                    clearable
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.paymentDate"
                    :label="t('simplifiedTransactions.form.paymentDate')"
                    type="date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="formData.paymentAmount"
                    :label="t('simplifiedTransactions.form.paymentAmount')"
                    type="number"
                    step="0.01"
                    min="0"
                    variant="outlined"
                    density="compact"
                    suffix="€"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Contract-specific fields -->
          <v-card v-if="formData.type === 'contract'" variant="outlined" class="mb-4">
            <v-card-subtitle class="pt-3">
              {{ t("simplifiedTransactions.form.contractFields") }}
            </v-card-subtitle>
            <v-card-text>
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.contractType"
                    :items="contractTypeOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('simplifiedTransactions.contractType.label')"
                    variant="outlined"
                    density="compact"
                    clearable
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-checkbox
                    v-model="formData.isRecurring"
                    :label="t('simplifiedTransactions.form.isRecurring')"
                    density="compact"
                    hide-details
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.contractStartDate"
                    :label="t('simplifiedTransactions.form.contractStartDate')"
                    type="date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>

                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.contractEndDate"
                    :label="t('simplifiedTransactions.form.contractEndDate')"
                    type="date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Notes -->
          <v-card variant="outlined">
            <v-card-subtitle class="pt-3">
              {{ t("simplifiedTransactions.form.notes") }}
            </v-card-subtitle>
            <v-card-text>
              <v-textarea
                v-model="formData.notes"
                :placeholder="t('simplifiedTransactions.form.notesPlaceholder')"
                variant="outlined"
                density="compact"
                rows="3"
                auto-grow
              />
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">
          {{ t("common.cancel") }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="saving"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          {{ t("common.save") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import {
  SimplifiedContractType,
  SimplifiedPaymentStatus,
  SimplifiedTransactionStatus,
  SimplifiedTransactionType,
  getDefaultStatusForType,
  getValidStatusesForType,
  type SimplifiedTransaction,
  type SimplifiedTransactionCreateRequest,
  type SimplifiedTransactionUpdateRequest,
} from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { simplifiedTransactionsApi } from "@/services/api/simplified-transactions"
import { institutionsApi } from "@/services/api"

const { t } = useI18n()

// Props
interface Props {
  modelValue: boolean
  transaction?: SimplifiedTransaction | null
  institutionId?: string // Pre-filled institution ID
}

const props = withDefaults(defineProps<Props>(), {
  transaction: null,
  institutionId: undefined,
})

// Emits
interface Emits {
  (e: "update:modelValue", value: boolean): void
  (e: "saved", transaction: SimplifiedTransaction): void
  (e: "cancelled"): void
}

const emit = defineEmits<Emits>()

// State
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
})

const isEditing = computed(() => !!props.transaction)
const form = ref()
const isFormValid = ref(false)
const saving = ref(false)

// Institution search
const loadingInstitutions = ref(false)
const institutionOptions = ref<Array<{ id: string; name: string }>>([])
let institutionSearchTimeout: ReturnType<typeof setTimeout> | null = null

// Form data
interface FormData {
  institutionId: string
  type: SimplifiedTransactionType
  referenceNumber: string
  title: string
  description: string
  date: string
  amountHt: number
  vatRate: number
  amountTtc: number
  status: SimplifiedTransactionStatus
  paymentStatus: SimplifiedPaymentStatus | null
  paymentDate: string
  paymentAmount: number | null
  dueDate: string
  contractType: SimplifiedContractType | null
  contractStartDate: string
  contractEndDate: string
  isRecurring: boolean
  notes: string
}

const getDefaultFormData = (): FormData => ({
  institutionId: props.institutionId || "",
  type: SimplifiedTransactionType.QUOTE,
  referenceNumber: "",
  title: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  amountHt: 0,
  vatRate: 20,
  amountTtc: 0,
  status: SimplifiedTransactionStatus.DRAFT,
  paymentStatus: null,
  paymentDate: "",
  paymentAmount: null,
  dueDate: "",
  contractType: null,
  contractStartDate: "",
  contractEndDate: "",
  isRecurring: false,
  notes: "",
})

const formData = ref<FormData>(getDefaultFormData())

// Validation rules
const rules = {
  required: (v: any) => !!v || v === 0 || t("common.required"),
  positiveNumber: (v: number) => v >= 0 || t("common.error"),
}

// Status options based on type
const statusOptions = computed(() => {
  const validStatuses = getValidStatusesForType(formData.value.type)
  return validStatuses.map((status) => ({
    value: status,
    label: t(`simplifiedTransactions.status.${status}`),
  }))
})

// Payment status options
const paymentStatusOptions = computed(() =>
  Object.values(SimplifiedPaymentStatus).map((status) => ({
    value: status,
    label: t(`simplifiedTransactions.paymentStatus.${status}`),
  }))
)

// Contract type options
const contractTypeOptions = computed(() =>
  Object.values(SimplifiedContractType).map((type) => ({
    value: type,
    label: t(`simplifiedTransactions.contractType.${type}`),
  }))
)

// Calculate TTC when HT or VAT changes
const calculateTtc = () => {
  const ht = formData.value.amountHt || 0
  const vat = formData.value.vatRate || 0
  formData.value.amountTtc = Number((ht * (1 + vat / 100)).toFixed(2))
}

// Watch for type changes to update default status
watch(
  () => formData.value.type,
  (newType) => {
    if (!isEditing.value) {
      formData.value.status = getDefaultStatusForType(newType)
    }
  }
)

// Watch for dialog open to reset form
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      if (props.transaction) {
        // Edit mode - populate form
        formData.value = {
          institutionId: props.transaction.institutionId,
          type: props.transaction.type,
          referenceNumber: props.transaction.referenceNumber || "",
          title: props.transaction.title,
          description: props.transaction.description || "",
          date: props.transaction.date
            ? new Date(props.transaction.date).toISOString().split("T")[0]
            : "",
          amountHt: Number(props.transaction.amountHt),
          vatRate: Number(props.transaction.vatRate),
          amountTtc: Number(props.transaction.amountTtc),
          status: props.transaction.status,
          paymentStatus: props.transaction.paymentStatus || null,
          paymentDate: props.transaction.paymentDate
            ? new Date(props.transaction.paymentDate).toISOString().split("T")[0]
            : "",
          paymentAmount:
            props.transaction.paymentAmount != null
              ? Number(props.transaction.paymentAmount)
              : null,
          dueDate: props.transaction.dueDate
            ? new Date(props.transaction.dueDate).toISOString().split("T")[0]
            : "",
          contractType: props.transaction.contractType || null,
          contractStartDate: props.transaction.contractStartDate
            ? new Date(props.transaction.contractStartDate).toISOString().split("T")[0]
            : "",
          contractEndDate: props.transaction.contractEndDate
            ? new Date(props.transaction.contractEndDate).toISOString().split("T")[0]
            : "",
          isRecurring: props.transaction.isRecurring || false,
          notes: props.transaction.notes || "",
        }

        // Load institution for autocomplete
        if (props.transaction.institution) {
          institutionOptions.value = [
            {
              id: props.transaction.institution.id,
              name: props.transaction.institution.name,
            },
          ]
        }
      } else {
        // Create mode - reset form
        formData.value = getDefaultFormData()
        if (props.institutionId) {
          formData.value.institutionId = props.institutionId
          // Load institution name
          loadInstitutionById(props.institutionId)
        }
      }
    }
  }
)

// Load institution by ID for display
const loadInstitutionById = async (id: string) => {
  try {
    const response = await institutionsApi.getById(id)
    if (response?.data) {
      institutionOptions.value = [
        {
          id: response.data.id,
          name: response.data.name,
        },
      ]
    }
  } catch (error) {
    console.error("Error loading institution:", error)
  }
}

// Institution search
const onInstitutionSearch = (search: string) => {
  if (institutionSearchTimeout) {
    clearTimeout(institutionSearchTimeout)
  }

  if (!search || search.length < 2) {
    return
  }

  institutionSearchTimeout = setTimeout(async () => {
    loadingInstitutions.value = true
    try {
      const response = await institutionsApi.searchInstitutions({
        search,
        limit: 20,
      })
      institutionOptions.value =
        response?.data?.map((inst: any) => ({
          id: inst.id,
          name: inst.name,
        })) || []
    } catch (error) {
      console.error("Error searching institutions:", error)
    } finally {
      loadingInstitutions.value = false
    }
  }, 300)
}

// Handle form submission
const handleSubmit = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  saving.value = true

  try {
    let savedTransaction: SimplifiedTransaction

    if (isEditing.value && props.transaction) {
      // Update existing
      const updateData: SimplifiedTransactionUpdateRequest = {
        referenceNumber: formData.value.referenceNumber || undefined,
        title: formData.value.title,
        description: formData.value.description || undefined,
        date: new Date(formData.value.date),
        amountHt: formData.value.amountHt,
        vatRate: formData.value.vatRate,
        amountTtc: formData.value.amountTtc,
        status: formData.value.status,
        notes: formData.value.notes || undefined,
      }

      // Add invoice-specific fields
      if (formData.value.type === SimplifiedTransactionType.INVOICE) {
        updateData.paymentStatus = formData.value.paymentStatus || undefined
        updateData.paymentDate = formData.value.paymentDate
          ? new Date(formData.value.paymentDate)
          : undefined
        updateData.paymentAmount = formData.value.paymentAmount ?? undefined
        updateData.dueDate = formData.value.dueDate
          ? new Date(formData.value.dueDate)
          : undefined
      }

      // Add contract-specific fields
      if (formData.value.type === SimplifiedTransactionType.CONTRACT) {
        updateData.contractType = formData.value.contractType || undefined
        updateData.contractStartDate = formData.value.contractStartDate
          ? new Date(formData.value.contractStartDate)
          : undefined
        updateData.contractEndDate = formData.value.contractEndDate
          ? new Date(formData.value.contractEndDate)
          : undefined
        updateData.isRecurring = formData.value.isRecurring
      }

      const response = await simplifiedTransactionsApi.update(
        props.transaction.id,
        updateData
      )
      savedTransaction = response.data
    } else {
      // Create new
      const createData: SimplifiedTransactionCreateRequest = {
        institutionId: formData.value.institutionId,
        type: formData.value.type,
        referenceNumber: formData.value.referenceNumber || undefined,
        title: formData.value.title,
        description: formData.value.description || undefined,
        date: new Date(formData.value.date),
        amountHt: formData.value.amountHt,
        vatRate: formData.value.vatRate,
        amountTtc: formData.value.amountTtc,
        status: formData.value.status,
        notes: formData.value.notes || undefined,
      }

      // Add invoice-specific fields
      if (formData.value.type === SimplifiedTransactionType.INVOICE) {
        createData.paymentStatus = formData.value.paymentStatus || undefined
        createData.paymentDate = formData.value.paymentDate
          ? new Date(formData.value.paymentDate)
          : undefined
        createData.paymentAmount = formData.value.paymentAmount ?? undefined
        createData.dueDate = formData.value.dueDate
          ? new Date(formData.value.dueDate)
          : undefined
      }

      // Add contract-specific fields
      if (formData.value.type === SimplifiedTransactionType.CONTRACT) {
        createData.contractType = formData.value.contractType || undefined
        createData.contractStartDate = formData.value.contractStartDate
          ? new Date(formData.value.contractStartDate)
          : undefined
        createData.contractEndDate = formData.value.contractEndDate
          ? new Date(formData.value.contractEndDate)
          : undefined
        createData.isRecurring = formData.value.isRecurring
      }

      const response = await simplifiedTransactionsApi.create(createData)
      savedTransaction = response.data
    }

    emit("saved", savedTransaction)
    isOpen.value = false
  } catch (error: any) {
    console.error("Error saving simplified transaction:", error)
    // TODO: Show error snackbar
  } finally {
    saving.value = false
  }
}

// Handle cancel
const handleCancel = () => {
  emit("cancelled")
  isOpen.value = false
}
</script>

<style scoped>
.type-toggle {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
}

.type-toggle .v-btn {
  flex: 1 1 auto;
  min-width: 120px;
}

@media (max-width: 600px) {
  .type-toggle {
    flex-direction: column;
  }

  .type-toggle .v-btn {
    width: 100%;
  }
}
</style>
