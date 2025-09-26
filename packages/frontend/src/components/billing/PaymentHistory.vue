<template>
  <div class="payment-history">
    <div class="header">
      <h3>Payment History</h3>
      <div class="header-actions">
        <v-btn
          v-if="canRecordPayments"
          prepend-icon="mdi-plus"
          color="primary"
          size="small"
          @click="$emit('record-payment')"
        >
          Record Payment
        </v-btn>
        <v-btn
          icon="mdi-refresh"
          variant="outlined"
          size="small"
          @click="loadPayments"
          :loading="loading"
        >
          <v-icon>mdi-refresh</v-icon>
          <v-tooltip activator="parent" location="top">Refresh</v-tooltip>
        </v-btn>
      </div>
    </div>

    <!-- Payment Summary -->
    <div v-if="invoice" class="payment-summary">
      <div class="summary-cards">
        <v-card class="summary-card">
          <v-card-text>
            <div class="summary-content">
              <v-avatar color="blue" size="40">
                <v-icon color="white">mdi-file-document-outline</v-icon>
              </v-avatar>
              <div class="summary-details">
                <h4>{{ formatCurrency(invoice.total) }}</h4>
                <p>Invoice Total</p>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="summary-card">
          <v-card-text>
            <div class="summary-content">
              <v-avatar color="green" size="40">
                <v-icon color="white">mdi-check-circle</v-icon>
              </v-avatar>
              <div class="summary-details">
                <h4>{{ formatCurrency(invoice.totalPaid) }}</h4>
                <p>Total Paid</p>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card class="summary-card">
          <v-card-text>
            <div class="summary-content">
              <v-avatar color="orange" size="40">
                <v-icon color="white">mdi-clock-outline</v-icon>
              </v-avatar>
              <div class="summary-details">
                <h4>{{ formatCurrency(invoice.remainingAmount) }}</h4>
                <p>Remaining</p>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Payment Progress -->
      <div class="payment-progress">
        <label>Payment Progress</label>
        <v-progress-linear
          :model-value="paymentPercentage"
          :color="getProgressColor()"
          height="10"
          rounded
        />
        <small class="progress-text">
          {{ formatCurrency(invoice.totalPaid) }} of
          {{ formatCurrency(invoice.total) }} paid ({{ paymentPercentage.toFixed(1) }}%)
        </small>
      </div>
    </div>

    <!-- Filters -->
    <v-card class="filters">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              item-title="label"
              item-value="value"
              label="Status"
              variant="outlined"
              clearable
              @update:model-value="loadPayments"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="filters.paymentMethod"
              :items="methodOptions"
              item-title="label"
              item-value="value"
              label="Payment Method"
              variant="outlined"
              clearable
              @update:model-value="loadPayments"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateFrom"
              label="Date From"
              type="date"
              variant="outlined"
              clearable
              @update:model-value="loadPayments"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateTo"
              label="Date To"
              type="date"
              variant="outlined"
              clearable
              @update:model-value="loadPayments"
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Payments Table -->
    <v-card class="payments-table-card">
      <v-card-title>Payments</v-card-title>
      <v-card-text>
        <div v-if="loading" class="text-center py-4">
          <v-progress-circular indeterminate></v-progress-circular>
        </div>
        <div v-else-if="payments.length === 0" class="text-center py-4 text-medium-emphasis">
          {{ emptyMessage }}
        </div>
        <v-data-table
          v-else
          :headers="paymentHeaders"
          :items="payments"
          item-value="id"
          class="elevation-0"
        >
          <template #item.paymentDate="{ item }">
            <div class="date-cell">
              <v-icon size="small" color="grey">mdi-calendar</v-icon>
              <span>{{ formatDate(item.paymentDate) }}</span>
            </div>
          </template>

          <template #item.amount="{ item }">
            <span class="amount">{{ formatCurrency(item.amount) }}</span>
          </template>

          <template #item.paymentMethod="{ item }">
            <div class="method-cell">
              <v-icon size="small" :icon="getMethodVuetifyIcon(item.paymentMethod)"></v-icon>
              <span>{{ getMethodLabel(item.paymentMethod) }}</span>
            </div>
          </template>

          <template #item.reference="{ item }">
            <span class="reference">
              {{ item.reference || '-' }}
            </span>
          </template>

          <template #item.status="{ item }">
            <v-chip
              :color="getStatusColor(item.status)"
              size="small"
              variant="tonal"
            >
              {{ getStatusLabel(item.status) }}
            </v-chip>
          </template>

          <template #item.recordedBy="{ item }">
            <div v-if="item.recordedBy || item.recordedByUser" class="user-cell">
              <span>
                {{ item.recordedByUser ? `${item.recordedByUser.firstName} ${item.recordedByUser.lastName}` : item.recordedBy }}
              </span>
            </div>
          </template>

          <template #item.notes="{ item }">
            <span v-if="item.notes" class="notes">
              <v-tooltip :text="item.notes" location="top">
                <template #activator="{ props }">
                  <span v-bind="props">{{ truncateText(item.notes, 30) }}</span>
                </template>
              </v-tooltip>
            </span>
          </template>

          <template #item.actions="{ item }">
            <div class="action-buttons">
              <v-btn
                v-if="item.status === 'pending'"
                icon="mdi-check"
                variant="text"
                size="small"
                color="success"
                @click="confirmPayment(item.id)"
              >
                <v-icon>mdi-check</v-icon>
                <v-tooltip activator="parent" location="top">Confirm Payment</v-tooltip>
              </v-btn>
              <v-btn
                v-if="item.status === 'pending'"
                icon="mdi-close"
                variant="text"
                size="small"
                color="error"
                @click="cancelPayment(item)"
              >
                <v-icon>mdi-close</v-icon>
                <v-tooltip activator="parent" location="top">Cancel Pending Payment</v-tooltip>
              </v-btn>
              <v-btn
                icon="mdi-eye"
                variant="text"
                size="small"
                @click="viewPaymentDetails(item)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent" location="top">View Details</v-tooltip>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
    <!-- Payment Details Dialog -->
    <v-dialog
      v-model="showDetailsDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title>Payment Details</v-card-title>
        <v-card-text>
          <div v-if="selectedPayment" class="payment-details">
            <div class="detail-grid">
              <div class="detail-item">
                <label>Payment Date:</label>
                <span>{{ formatDate(selectedPayment.paymentDate) }}</span>
              </div>
              <div class="detail-item">
                <label>Amount:</label>
                <span class="amount">{{ formatCurrency(selectedPayment.amount) }}</span>
              </div>
              <div class="detail-item">
                <label>Payment Method:</label>
                <span>{{ getMethodLabel(selectedPayment.paymentMethod) }}</span>
              </div>
              <div class="detail-item">
                <label>Reference:</label>
                <span>{{
                  selectedPayment.reference || '-'
                }}</span>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <v-chip
                  :color="getStatusColor(selectedPayment.status)"
                  size="small"
                  variant="tonal"
                >
                  {{ getStatusLabel(selectedPayment.status) }}
                </v-chip>
              </div>
              <div class="detail-item">
                <label>Recorded By:</label>
                <span v-if="selectedPayment.recordedBy || selectedPayment.recordedByUser">
                  {{ selectedPayment.recordedByUser ? `${selectedPayment.recordedByUser.firstName} ${selectedPayment.recordedByUser.lastName}` : selectedPayment.recordedBy }}
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
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text="Close"
            variant="text"
            @click="showDetailsDialog = false"
          />
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Cancel Payment Dialog -->
    <v-dialog
      v-model="showCancelDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>Cancel Payment</v-card-title>
        <v-card-text>
          <div class="cancel-form">
            <p>Are you sure you want to cancel this payment?</p>

            <v-textarea
              v-model="cancelReason"
              label="Reason for cancellation"
              placeholder="Enter reason for cancellation"
              rows="3"
              variant="outlined"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text="Cancel"
            variant="text"
            @click="showCancelDialog = false"
          />
          <v-btn
            text="Confirm Cancellation"
            color="error"
            @click="confirmCancelPayment"
            :loading="cancelling"
          />
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { invoicesApi } from "@/services/api"
import type { Invoice, Payment, PaymentMethod, PaymentStatus } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"

interface Props {
  invoice?: Invoice | null
  canRecordPayments?: boolean
}

interface Emits {
  (e: "record-payment"): void
  (e: "payment-updated"): void
  (e: "notify", payload: { message: string, color: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
// const toast = useToast() // Replaced with emit notifications

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

const paymentHeaders = [
  { title: "Date", value: "paymentDate", sortable: true },
  { title: "Amount", value: "amount", sortable: true, align: "end" },
  { title: "Method", value: "paymentMethod", sortable: true },
  { title: "Reference", value: "reference" },
  { title: "Status", value: "status", sortable: true },
  { title: "Recorded By", value: "recordedBy" },
  { title: "Notes", value: "notes" },
  { title: "Actions", value: "actions", sortable: false },
] as const

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

    const response = await invoicesApi.payments.getAll(props.invoice.id) as any

    if (response.success) {
      payments.value = response.data
    }
  } catch (error) {
    console.error("Error loading payments:", error)
    emit("notify", { message: "Failed to load payments", color: "error" })
  } finally {
    loading.value = false
  }
}

const confirmPayment = async (paymentId: string) => {
  try {
    const response = await invoicesApi.payments.confirm(paymentId) as any

    if (response.success) {
      emit("notify", { message: "Payment confirmed successfully", color: "success" })
      loadPayments()
      emit("payment-updated")
    }
  } catch (error) {
    console.error("Error confirming payment:", error)
    emit("notify", { message: "Failed to confirm payment", color: "error" })
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
    ) as any

    if (response.success) {
      emit("notify", { message: "Payment cancelled successfully", color: "success" })
      showCancelDialog.value = false
      loadPayments()
      emit("payment-updated")
    }
  } catch (error) {
    console.error("Error cancelling payment:", error)
    emit("notify", { message: "Failed to cancel payment", color: "error" })
  } finally {
    cancelling.value = false
  }
}

const viewPaymentDetails = (payment: Payment) => {
  selectedPayment.value = payment
  showDetailsDialog.value = true
}

const getProgressColor = () => {
  const percentage = paymentPercentage.value
  if (percentage >= 100) return "success"
  if (percentage >= 50) return "warning"
  return "error"
}

const getMethodVuetifyIcon = (method: PaymentMethod) => {
  const iconMap = {
    bank_transfer: "mdi-bank",
    check: "mdi-checkbook",
    cash: "mdi-cash",
    credit_card: "mdi-credit-card",
    other: "mdi-dots-horizontal",
  }
  return iconMap[method] || "mdi-dots-horizontal"
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

const getStatusColor = (status: PaymentStatus) => {
  const colorMap = {
    pending: "warning",
    confirmed: "success",
    failed: "error",
    cancelled: "secondary",
  }
  return colorMap[status] || "secondary"
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0)
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

.summary-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.summary-details h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.summary-details p {
  margin: 0;
  font-size: 0.875rem;
  opacity: 0.7;
}

.payment-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-progress label {
  font-weight: 600;
}

.progress-text {
  font-size: 0.875rem;
  opacity: 0.7;
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
}

.method-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reference {
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
  opacity: 0.7;
}


.notes {
  opacity: 0.7;
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  font-weight: 600;
  opacity: 0.7;
}

.notes-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.notes-section label {
  font-weight: 600;
}

.notes-content {
  margin: 0;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
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
}


@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }
}
</style>
