<template>
  <div class="payment-history">
    <div class="header">
      <h3>Payment History</h3>
      <div class="header-actions">
        <Button
          v-if="canRecordPayments"
          icon="pi pi-plus"
          label="Record Payment"
          class="p-button-sm p-button-primary"
          @click="$emit('record-payment')"
        />
        <Button
          icon="pi pi-refresh"
          class="p-button-sm p-button-outlined"
          @click="loadPayments"
          :loading="loading"
          v-tooltip="'Refresh'"
        />
      </div>
    </div>

    <!-- Payment Summary -->
    <div v-if="invoice" class="payment-summary">
      <div class="summary-cards">
        <Card class="summary-card">
          <template #content>
            <div class="summary-content">
              <div class="summary-icon total">
                <i class="pi pi-file-o"></i>
              </div>
              <div class="summary-details">
                <h4>${{ formatCurrency(invoice.total) }}</h4>
                <p>Invoice Total</p>
              </div>
            </div>
          </template>
        </Card>

        <Card class="summary-card">
          <template #content>
            <div class="summary-content">
              <div class="summary-icon paid">
                <i class="pi pi-check-circle"></i>
              </div>
              <div class="summary-details">
                <h4>${{ formatCurrency(invoice.totalPaid) }}</h4>
                <p>Total Paid</p>
              </div>
            </div>
          </template>
        </Card>

        <Card class="summary-card">
          <template #content>
            <div class="summary-content">
              <div class="summary-icon remaining">
                <i class="pi pi-clock"></i>
              </div>
              <div class="summary-details">
                <h4>${{ formatCurrency(invoice.remainingAmount) }}</h4>
                <p>Remaining</p>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Payment Progress -->
      <div class="payment-progress">
        <label>Payment Progress</label>
        <ProgressBar
          :value="paymentPercentage"
          :show-value="true"
          :class="getProgressClass()"
        />
        <small class="progress-text">
          {{ formatCurrency(invoice.totalPaid) }} of
          {{ formatCurrency(invoice.total) }} paid ({{ paymentPercentage.toFixed(1) }}%)
        </small>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label for="status-filter">Status</label>
        <Dropdown
          id="status-filter"
          v-model="filters.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          placeholder="All Statuses"
          show-clear
          @change="loadPayments"
        />
      </div>

      <div class="filter-group">
        <label for="method-filter">Payment Method</label>
        <Dropdown
          id="method-filter"
          v-model="filters.paymentMethod"
          :options="methodOptions"
          option-label="label"
          option-value="value"
          placeholder="All Methods"
          show-clear
          @change="loadPayments"
        />
      </div>

      <div class="filter-group">
        <label for="date-from">Date From</label>
        <Calendar
          id="date-from"
          v-model="filters.dateFrom"
          placeholder="Select date"
          show-clear
          @date-select="loadPayments"
        />
      </div>

      <div class="filter-group">
        <label for="date-to">Date To</label>
        <Calendar
          id="date-to"
          v-model="filters.dateTo"
          placeholder="Select date"
          show-clear
          @date-select="loadPayments"
        />
      </div>
    </div>

    <!-- Payments Table -->
    <Card class="payments-table-card">
      <template #content>
        <DataTable
          :value="payments"
          :loading="loading"
          responsive-layout="scroll"
          class="payments-table"
          :empty-message="emptyMessage"
        >
          <Column field="paymentDate" header="Date" sortable>
            <template #body="{ data }">
              <div class="date-cell">
                <span>{{ formatDate(data.paymentDate) }}</span>
                <Tag
                  v-if="data.isRecent"
                  value="Recent"
                  severity="info"
                  class="recent-tag"
                />
              </div>
            </template>
          </Column>

          <Column field="amount" header="Amount" sortable>
            <template #body="{ data }">
              <span class="amount">${{ formatCurrency(data.amount) }}</span>
            </template>
          </Column>

          <Column field="paymentMethod" header="Method" sortable>
            <template #body="{ data }">
              <div class="method-cell">
                <i :class="getMethodIcon(data.paymentMethod)"></i>
                <span>{{ getMethodLabel(data.paymentMethod) }}</span>
              </div>
            </template>
          </Column>

          <Column field="reference" header="Reference">
            <template #body="{ data }">
              <span class="reference">
                {{ data.reference || data.formattedReference }}
              </span>
            </template>
          </Column>

          <Column field="status" header="Status" sortable>
            <template #body="{ data }">
              <Tag
                :value="getStatusLabel(data.status)"
                :severity="getStatusSeverity(data.status)"
                :icon="getStatusIcon(data.status)"
              />
            </template>
          </Column>

          <Column field="recordedByUser" header="Recorded By">
            <template #body="{ data }">
              <div v-if="data.recordedByUser" class="user-cell">
                <span
                  >{{ data.recordedByUser.firstName }}
                  {{ data.recordedByUser.lastName }}</span
                >
              </div>
            </template>
          </Column>

          <Column field="notes" header="Notes">
            <template #body="{ data }">
              <span v-if="data.notes" class="notes" v-tooltip="data.notes">
                {{ truncateText(data.notes, 30) }}
              </span>
            </template>
          </Column>

          <Column header="Actions" :exportable="false">
            <template #body="{ data }">
              <div class="action-buttons">
                <Button
                  v-if="data.canBeConfirmed"
                  icon="pi pi-check"
                  class="p-button-text p-button-sm p-button-success"
                  @click="confirmPayment(data.id)"
                  v-tooltip="'Confirm Payment'"
                />
                <Button
                  v-if="data.canBeCancelled"
                  icon="pi pi-times"
                  class="p-button-text p-button-sm p-button-danger"
                  @click="cancelPayment(data)"
                  v-tooltip="'Cancel Payment'"
                />
                <Button
                  icon="pi pi-eye"
                  class="p-button-text p-button-sm"
                  @click="viewPaymentDetails(data)"
                  v-tooltip="'View Details'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Payment Details Dialog -->
    <Dialog
      v-model:visible="showDetailsDialog"
      header="Payment Details"
      :modal="true"
      :closable="true"
      :style="{ width: '500px' }"
    >
      <div v-if="selectedPayment" class="payment-details">
        <div class="detail-grid">
          <div class="detail-item">
            <label>Payment Date:</label>
            <span>{{ formatDate(selectedPayment.paymentDate) }}</span>
          </div>
          <div class="detail-item">
            <label>Amount:</label>
            <span class="amount">${{ formatCurrency(selectedPayment.amount) }}</span>
          </div>
          <div class="detail-item">
            <label>Payment Method:</label>
            <span>{{ getMethodLabel(selectedPayment.paymentMethod) }}</span>
          </div>
          <div class="detail-item">
            <label>Reference:</label>
            <span>{{
              selectedPayment.reference || selectedPayment.formattedReference
            }}</span>
          </div>
          <div class="detail-item">
            <label>Status:</label>
            <Tag
              :value="getStatusLabel(selectedPayment.status)"
              :severity="getStatusSeverity(selectedPayment.status)"
            />
          </div>
          <div class="detail-item">
            <label>Recorded By:</label>
            <span v-if="selectedPayment.recordedByUser">
              {{ selectedPayment.recordedByUser.firstName }}
              {{ selectedPayment.recordedByUser.lastName }}
            </span>
          </div>
          <div class="detail-item">
            <label>Recorded At:</label>
            <span>{{ formatDateTime(selectedPayment.createdAt) }}</span>
          </div>
        </div>

        <div v-if="selectedPayment.notes" class="notes-section">
          <label>Notes:</label>
          <p class="notes-content">{{ selectedPayment.notes }}</p>
        </div>
      </div>

      <template #footer>
        <Button
          label="Close"
          icon="pi pi-times"
          class="p-button-text"
          @click="showDetailsDialog = false"
        />
      </template>
    </Dialog>

    <!-- Cancel Payment Dialog -->
    <Dialog
      v-model:visible="showCancelDialog"
      header="Cancel Payment"
      :modal="true"
      :closable="true"
      :style="{ width: '400px' }"
    >
      <div class="cancel-form">
        <p>Are you sure you want to cancel this payment?</p>

        <div class="field">
          <label for="cancel-reason">Reason for cancellation:</label>
          <Textarea
            id="cancel-reason"
            v-model="cancelReason"
            placeholder="Enter reason for cancellation"
            rows="3"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="showCancelDialog = false"
        />
        <Button
          label="Confirm Cancellation"
          icon="pi pi-check"
          class="p-button-danger"
          @click="confirmCancelPayment"
          :loading="cancelling"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { invoicesApi } from "@/services/api"
import type { Invoice, Payment, PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref, watch } from "vue"

interface Props {
  invoice?: Invoice | null
  canRecordPayments?: boolean
}

interface Emits {
  (e: "record-payment"): void
  (e: "payment-updated"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const toast = useToast()

// Data
const payments = ref<Payment[]>([])
const loading = ref(false)
const showDetailsDialog = ref(false)
const showCancelDialog = ref(false)
const selectedPayment = ref<Payment | null>(null)
const cancelReason = ref("")
const cancelling = ref(false)

// Filters
const filters = ref({
  status: null as PaymentStatus | null,
  paymentMethod: null as PaymentMethod | null,
  dateFrom: null as Date | null,
  dateTo: null as Date | null,
})

// Options
const statusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
]

const methodOptions = [
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Check", value: "check" },
  { label: "Cash", value: "cash" },
  { label: "Credit Card", value: "credit_card" },
  { label: "Other", value: "other" },
]

// Computed
const paymentPercentage = computed(() => {
  if (!props.invoice || props.invoice.total === 0) return 0
  return (props.invoice.totalPaid / props.invoice.total) * 100
})

const emptyMessage = computed(() => {
  return props.invoice ? "No payments recorded for this invoice" : "No payments found"
})

// Methods
const loadPayments = async () => {
  if (!props.invoice) return

  try {
    loading.value = true

    const filterParams = {
      invoiceId: props.invoice.id,
      ...filters.value,
    }

    const response = await invoicesApi.payments.getAll(props.invoice.id)

    if (response.success) {
      payments.value = response.data
    }
  } catch (error) {
    console.error("Error loading payments:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load payments",
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

const confirmPayment = async (paymentId: string) => {
  try {
    const response = await invoicesApi.payments.confirm(paymentId)

    if (response.success) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Payment confirmed successfully",
        life: 3000,
      })
      loadPayments()
      emit("payment-updated")
    }
  } catch (error) {
    console.error("Error confirming payment:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to confirm payment",
      life: 3000,
    })
  }
}

const cancelPayment = (payment: Payment) => {
  selectedPayment.value = payment
  cancelReason.value = ""
  showCancelDialog.value = true
}

const confirmCancelPayment = async () => {
  if (!selectedPayment.value) return

  try {
    cancelling.value = true

    const response = await invoicesApi.payments.cancel(
      selectedPayment.value.id,
      cancelReason.value
    )

    if (response.success) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Payment cancelled successfully",
        life: 3000,
      })
      showCancelDialog.value = false
      loadPayments()
      emit("payment-updated")
    }
  } catch (error) {
    console.error("Error cancelling payment:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to cancel payment",
      life: 3000,
    })
  } finally {
    cancelling.value = false
  }
}

const viewPaymentDetails = (payment: Payment) => {
  selectedPayment.value = payment
  showDetailsDialog.value = true
}

const getProgressClass = () => {
  const percentage = paymentPercentage.value
  if (percentage >= 100) return "progress-complete"
  if (percentage >= 50) return "progress-partial"
  return "progress-minimal"
}

const getMethodIcon = (method: PaymentMethod) => {
  const iconMap = {
    bank_transfer: "pi-building",
    check: "pi-file-edit",
    cash: "pi-money-bill",
    credit_card: "pi-credit-card",
    other: "pi-ellipsis-h",
  }
  return iconMap[method] || "pi-ellipsis-h"
}

const getMethodLabel = (method: PaymentMethod) => {
  const labelMap = {
    bank_transfer: "Bank Transfer",
    check: "Check",
    cash: "Cash",
    credit_card: "Credit Card",
    other: "Other",
  }
  return labelMap[method] || method
}

const getStatusLabel = (status: PaymentStatus) => {
  const labelMap = {
    pending: "Pending",
    confirmed: "Confirmed",
    failed: "Failed",
    cancelled: "Cancelled",
  }
  return labelMap[status] || status
}

const getStatusSeverity = (status: PaymentStatus) => {
  const severityMap = {
    pending: "warning",
    confirmed: "success",
    failed: "danger",
    cancelled: "secondary",
  }
  return severityMap[status] || "secondary"
}

const getStatusIcon = (status: PaymentStatus) => {
  const iconMap = {
    pending: "pi-clock",
    confirmed: "pi-check-circle",
    failed: "pi-times-circle",
    cancelled: "pi-ban",
  }
  return iconMap[status] || "pi-circle"
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (date: string | Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

const formatDateTime = (date: string | Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

// Watch for invoice changes
watch(
  () => props.invoice,
  (invoice) => {
    if (invoice) {
      loadPayments()
    } else {
      payments.value = []
    }
  },
  { immediate: true }
)

// Lifecycle
onMounted(() => {
  if (props.invoice) {
    loadPayments()
  }
})
</script>

<style scoped>
.payment-history {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header h3 {
  margin: 0;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.payment-summary {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.summary-card {
  background: var(--surface-card);
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.summary-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
}

.summary-icon.total {
  background: var(--blue-500);
}

.summary-icon.paid {
  background: var(--green-500);
}

.summary-icon.remaining {
  background: var(--orange-500);
}

.summary-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color);
}

.summary-details p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.payment-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-progress label {
  font-weight: 600;
  color: var(--text-color);
}

.progress-text {
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1rem;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.875rem;
}

.payments-table-card {
  background: var(--surface-card);
}

.date-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.recent-tag {
  font-size: 0.75rem;
}

.amount {
  font-family: "Courier New", monospace;
  font-weight: 600;
  color: var(--text-color);
}

.method-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reference {
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.user-cell span {
  color: var(--text-color);
}

.notes {
  color: var(--text-color-secondary);
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.payment-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  font-weight: 600;
  color: var(--text-color-secondary);
}

.detail-item span {
  color: var(--text-color);
}

.notes-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notes-section label {
  font-weight: 600;
  color: var(--text-color);
}

.notes-content {
  margin: 0;
  padding: 0.75rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 4px;
  color: var(--text-color);
  font-style: italic;
}

.cancel-form {
  display: flex;
  flex-direction: column;
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

/* Progress bar styling */
:deep(.progress-complete .p-progressbar-value) {
  background: var(--green-500);
}

:deep(.progress-partial .p-progressbar-value) {
  background: var(--orange-500);
}

:deep(.progress-minimal .p-progressbar-value) {
  background: var(--red-500);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .filters {
    grid-template-columns: 1fr;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }
}
</style>
