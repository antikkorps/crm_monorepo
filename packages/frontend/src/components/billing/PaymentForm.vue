<template>
  <Dialog
    v-model:visible="dialogVisible"
    header="Record Payment"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="payment-form-dialog"
    :style="{ width: '600px' }"
  >
    <div v-if="invoice" class="payment-form">
      <!-- Invoice Information -->
      <div class="invoice-info">
        <h4>Invoice Details</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>Invoice Number:</label>
            <span>{{ invoice.invoiceNumber }}</span>
          </div>
          <div class="info-item">
            <label>Institution:</label>
            <span>{{ invoice.institution?.name }}</span>
          </div>
          <div class="info-item">
            <label>Total Amount:</label>
            <span class="amount">${{ formatCurrency(invoice.total) }}</span>
          </div>
          <div class="info-item">
            <label>Amount Paid:</label>
            <span class="amount paid">${{ formatCurrency(invoice.totalPaid) }}</span>
          </div>
          <div class="info-item">
            <label>Remaining:</label>
            <span class="amount remaining"
              >${{ formatCurrency(invoice.remainingAmount) }}</span
            >
          </div>
        </div>
      </div>

      <!-- Payment Form -->
      <form @submit.prevent="handleSubmit" class="form-content">
        <div class="form-grid">
          <div class="field">
            <label for="amount">Payment Amount *</label>
            <InputNumber
              id="amount"
              v-model="form.amount"
              mode="currency"
              currency="USD"
              :min="0.01"
              :max="invoice.remainingAmount"
              :max-fraction-digits="2"
              placeholder="$0.00"
              :class="{ 'p-invalid': errors.amount }"
            />
            <small v-if="errors.amount" class="p-error">{{ errors.amount }}</small>
            <small class="field-help">
              Maximum: ${{ formatCurrency(invoice.remainingAmount) }}
            </small>
          </div>

          <div class="field">
            <label for="payment-date">Payment Date *</label>
            <Calendar
              id="payment-date"
              v-model="form.paymentDate"
              placeholder="Select payment date"
              :max-date="new Date()"
              :class="{ 'p-invalid': errors.paymentDate }"
            />
            <small v-if="errors.paymentDate" class="p-error">{{
              errors.paymentDate
            }}</small>
          </div>

          <div class="field">
            <label for="payment-method">Payment Method *</label>
            <Dropdown
              id="payment-method"
              v-model="form.paymentMethod"
              :options="paymentMethods"
              option-label="label"
              option-value="value"
              placeholder="Select payment method"
              :class="{ 'p-invalid': errors.paymentMethod }"
            />
            <small v-if="errors.paymentMethod" class="p-error">{{
              errors.paymentMethod
            }}</small>
          </div>

          <div class="field">
            <label for="reference">Reference</label>
            <InputText
              id="reference"
              v-model="form.reference"
              placeholder="Enter payment reference (optional)"
            />
            <small class="field-help"> Check number, transaction ID, etc. </small>
          </div>
        </div>

        <div class="field">
          <label for="notes">Notes</label>
          <Textarea
            id="notes"
            v-model="form.notes"
            placeholder="Enter any additional notes about this payment"
            rows="3"
          />
        </div>

        <!-- Payment Summary -->
        <div v-if="form.amount > 0" class="payment-summary">
          <h4>Payment Summary</h4>
          <div class="summary-grid">
            <div class="summary-item">
              <span>Payment Amount:</span>
              <span class="amount">${{ formatCurrency(form.amount) }}</span>
            </div>
            <div class="summary-item">
              <span>Remaining After Payment:</span>
              <span class="amount">
                ${{ formatCurrency(Math.max(0, invoice.remainingAmount - form.amount)) }}
              </span>
            </div>
            <div class="summary-item status">
              <span>New Invoice Status:</span>
              <Tag :value="getNewStatus()" :severity="getNewStatusSeverity()" />
            </div>
          </div>
        </div>
      </form>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="closeDialog"
        />
        <Button
          label="Record Payment"
          icon="pi pi-check"
          class="p-button-primary"
          @click="handleSubmit"
          :loading="submitting"
          :disabled="!isFormValid"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { invoicesApi } from "@/services/api"
import type { Invoice, PaymentCreateRequest, PaymentMethod } from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { computed, ref, watch } from "vue"

interface Props {
  visible: boolean
  invoice?: Invoice | null
}

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "payment-recorded", payment: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const toast = useToast()

// Dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
})

// Form state
const submitting = ref(false)

// Form data
const form = ref<Omit<PaymentCreateRequest, "invoiceId">>({
  amount: 0,
  paymentDate: new Date(),
  paymentMethod: "" as PaymentMethod,
  reference: "",
  notes: "",
})

// Payment method options
const paymentMethods = [
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Check", value: "check" },
  { label: "Cash", value: "cash" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Other", value: "other" },
]

// Validation
const errors = ref<Record<string, string>>({})

// Computed
const isFormValid = computed(() => {
  return (
    form.value.amount > 0 &&
    form.value.paymentDate &&
    form.value.paymentMethod &&
    Object.keys(errors.value).length === 0
  )
})

// Methods
const validateForm = () => {
  errors.value = {}

  if (!form.value.amount || form.value.amount <= 0) {
    errors.value.amount = "Payment amount must be greater than 0"
  } else if (props.invoice && form.value.amount > props.invoice.remainingAmount) {
    errors.value.amount = "Payment amount cannot exceed remaining amount"
  }

  if (!form.value.paymentDate) {
    errors.value.paymentDate = "Payment date is required"
  } else if (form.value.paymentDate > new Date()) {
    errors.value.paymentDate = "Payment date cannot be in the future"
  }

  if (!form.value.paymentMethod) {
    errors.value.paymentMethod = "Payment method is required"
  }

  return Object.keys(errors.value).length === 0
}

const getNewStatus = () => {
  if (!props.invoice || !form.value.amount) return ""

  const remainingAfterPayment = props.invoice.remainingAmount - form.value.amount

  if (remainingAfterPayment <= 0) {
    return "Paid"
  } else if (props.invoice.totalPaid > 0 || form.value.amount > 0) {
    return "Partially Paid"
  } else {
    return props.invoice.status
  }
}

const getNewStatusSeverity = () => {
  const status = getNewStatus().toLowerCase().replace(" ", "_")
  const severityMap = {
    paid: "success",
    partially_paid: "warning",
    sent: "info",
    draft: "secondary",
    overdue: "danger",
    cancelled: "secondary",
  }
  return severityMap[status as keyof typeof severityMap] || "secondary"
}

const handleSubmit = async () => {
  if (!validateForm() || !props.invoice) {
    return
  }

  try {
    submitting.value = true

    const paymentData: PaymentCreateRequest = {
      ...form.value,
      invoiceId: props.invoice.id,
    }

    const response = await invoicesApi.payments.create(props.invoice.id, paymentData)

    if (response.success) {
      emit("payment-recorded", response.data)
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Payment recorded successfully",
        life: 3000,
      })
      closeDialog()
    }
  } catch (error) {
    console.error("Error recording payment:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to record payment",
      life: 3000,
    })
  } finally {
    submitting.value = false
  }
}

const closeDialog = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  form.value = {
    amount: 0,
    paymentDate: new Date(),
    paymentMethod: "" as PaymentMethod,
    reference: "",
    notes: "",
  }
  errors.value = {}
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Watch for dialog visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      resetForm()
      // Set default amount to remaining amount if it's reasonable
      if (props.invoice && props.invoice.remainingAmount <= 10000) {
        form.value.amount = props.invoice.remainingAmount
      }
    }
  }
)

// Watch form changes for validation
watch(
  () => form.value,
  () => {
    if (Object.keys(errors.value).length > 0) {
      validateForm()
    }
  },
  { deep: true }
)
</script>

<style scoped>
.payment-form-dialog {
  max-height: 90vh;
}

.payment-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.invoice-info {
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
}

.invoice-info h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-item label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.info-item span {
  color: var(--text-color);
  font-weight: 500;
}

.amount {
  font-family: "Courier New", monospace;
  font-weight: 600;
}

.amount.paid {
  color: var(--green-600);
}

.amount.remaining {
  color: var(--orange-600);
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.field label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.field-help {
  margin-top: 0.25rem;
  color: var(--text-color-secondary);
  font-size: 0.75rem;
}

.payment-summary {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.payment-summary h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1rem;
}

.summary-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.summary-item.status {
  padding-top: 0.75rem;
  border-top: 1px solid var(--surface-border);
  margin-top: 0.5rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .payment-form-dialog {
    width: 95vw !important;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
