<template>
  <div class="invoice-detail-view">
    <div v-if="loading" class="loading-container">
      <ProgressSpinner />
    </div>

    <div v-else-if="invoice" class="invoice-content">
      <!-- Header -->
      <div class="header">
        <div class="header-info">
          <Button
            icon="pi pi-arrow-left"
            class="p-button-text p-button-sm"
            @click="goBack"
            v-tooltip="'Back to Invoices'"
          />
          <div class="title-section">
            <h1>{{ invoice.invoiceNumber }}</h1>
            <Tag
              :value="getStatusLabel(invoice.status)"
              :severity="getStatusSeverity(invoice.status)"
              :icon="getStatusIcon(invoice.status)"
              class="status-tag"
            />
          </div>
        </div>

        <div class="header-actions">
          <Button
            v-if="invoice.canBeModified"
            icon="pi pi-pencil"
            label="Edit"
            class="p-button-outlined p-button-sm"
            @click="editInvoice"
          />
          <Button
            v-if="invoice.status === 'draft'"
            icon="pi pi-send"
            label="Send"
            class="p-button-sm"
            @click="sendInvoice"
          />
          <Button
            v-if="invoice.canReceivePayments"
            icon="pi pi-dollar"
            label="Record Payment"
            class="p-button-success p-button-sm"
            @click="showPaymentDialog = true"
          />
          <Button
            icon="pi pi-download"
            label="Download PDF"
            class="p-button-outlined p-button-sm"
            @click="downloadPdf"
          />
          <Button
            icon="pi pi-print"
            label="Print"
            class="p-button-outlined p-button-sm"
            @click="printInvoice"
          />
          <Button
            icon="pi pi-ellipsis-v"
            class="p-button-text p-button-sm"
            @click="toggleMenu"
            aria-haspopup="true"
            aria-controls="overlay_menu"
          />
          <Menu id="overlay_menu" ref="menu" :model="menuItems" :popup="true" />
        </div>
      </div>

      <!-- Invoice Information -->
      <div class="content-grid">
        <div class="main-content">
          <!-- Basic Information -->
          <Card class="info-card">
            <template #title>Invoice Information</template>
            <template #content>
              <div class="info-grid">
                <div class="info-section">
                  <h4>Invoice Details</h4>
                  <div class="info-items">
                    <div class="info-item">
                      <label>Invoice Number:</label>
                      <span>{{ invoice.invoiceNumber }}</span>
                    </div>
                    <div class="info-item">
                      <label>Title:</label>
                      <span>{{ invoice.title }}</span>
                    </div>
                    <div class="info-item">
                      <label>Due Date:</label>
                      <span :class="getDueDateClass()">
                        {{ formatDate(invoice.dueDate) }}
                      </span>
                    </div>
                    <div v-if="invoice.description" class="info-item">
                      <label>Description:</label>
                      <span>{{ invoice.description }}</span>
                    </div>
                    <div v-if="invoice.quoteId" class="info-item">
                      <label>Created From Quote:</label>
                      <router-link :to="`/quotes/${invoice.quoteId}`" class="quote-link">
                        View Original Quote
                      </router-link>
                    </div>
                  </div>
                </div>

                <div class="info-section">
                  <h4>Institution</h4>
                  <div class="info-items">
                    <div class="info-item">
                      <label>Name:</label>
                      <router-link
                        :to="`/institutions/${invoice.institution?.id}`"
                        class="institution-link"
                      >
                        {{ invoice.institution?.name }}
                      </router-link>
                    </div>
                    <div class="info-item">
                      <label>Type:</label>
                      <span class="institution-type">{{
                        invoice.institution?.type
                      }}</span>
                    </div>
                  </div>
                </div>

                <div class="info-section">
                  <h4>Assignment</h4>
                  <div class="info-items">
                    <div class="info-item">
                      <label>Assigned To:</label>
                      <span
                        >{{ invoice.assignedUser?.firstName }}
                        {{ invoice.assignedUser?.lastName }}</span
                      >
                    </div>
                    <div class="info-item">
                      <label>Created:</label>
                      <span>{{ formatDateTime(invoice.createdAt) }}</span>
                    </div>
                    <div v-if="invoice.sentAt" class="info-item">
                      <label>Sent:</label>
                      <span>{{ formatDateTime(invoice.sentAt) }}</span>
                    </div>
                    <div v-if="invoice.paidAt" class="info-item">
                      <label>Paid:</label>
                      <span>{{ formatDateTime(invoice.paidAt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </Card>

          <!-- Invoice Lines -->
          <Card class="lines-card">
            <template #title>
              <div class="card-header">
                <span>Invoice Lines</span>
                <Button
                  v-if="invoice.canBeModified"
                  icon="pi pi-plus"
                  label="Add Line"
                  class="p-button-outlined p-button-sm"
                  @click="addLine"
                />
              </div>
            </template>
            <template #content>
              <DataTable
                :value="invoice.lines"
                responsive-layout="scroll"
                class="lines-table"
              >
                <Column field="description" header="Description">
                  <template #body="{ data }">
                    <span class="line-description">{{ data.description }}</span>
                  </template>
                </Column>

                <Column field="quantity" header="Qty" class="quantity-column">
                  <template #body="{ data }">
                    <span class="quantity">{{ formatNumber(data.quantity) }}</span>
                  </template>
                </Column>

                <Column field="unitPrice" header="Unit Price" class="price-column">
                  <template #body="{ data }">
                    <span class="price">${{ formatCurrency(data.unitPrice) }}</span>
                  </template>
                </Column>

                <Column field="discountAmount" header="Discount" class="discount-column">
                  <template #body="{ data }">
                    <span v-if="data.discountAmount > 0" class="discount">
                      -${{ formatCurrency(data.discountAmount) }}
                    </span>
                    <span v-else class="no-discount">-</span>
                  </template>
                </Column>

                <Column field="taxAmount" header="Tax" class="tax-column">
                  <template #body="{ data }">
                    <span v-if="data.taxAmount > 0" class="tax">
                      ${{ formatCurrency(data.taxAmount) }}
                    </span>
                    <span v-else class="no-tax">-</span>
                  </template>
                </Column>

                <Column field="total" header="Total" class="total-column">
                  <template #body="{ data }">
                    <span class="line-total">${{ formatCurrency(data.total) }}</span>
                  </template>
                </Column>

                <Column
                  v-if="invoice.canBeModified"
                  header="Actions"
                  class="actions-column"
                >
                  <template #body="{ data }">
                    <div class="line-actions">
                      <Button
                        icon="pi pi-pencil"
                        class="p-button-text p-button-sm"
                        @click="editLine(data)"
                        v-tooltip="'Edit Line'"
                      />
                      <Button
                        icon="pi pi-trash"
                        class="p-button-text p-button-sm p-button-danger"
                        @click="deleteLine(data.id)"
                        v-tooltip="'Delete Line'"
                      />
                    </div>
                  </template>
                </Column>
              </DataTable>

              <!-- Invoice Totals -->
              <div class="invoice-totals">
                <div class="totals-grid">
                  <div class="total-row">
                    <span>Subtotal:</span>
                    <span>${{ formatCurrency(invoice.subtotal) }}</span>
                  </div>
                  <div v-if="invoice.totalDiscountAmount > 0" class="total-row">
                    <span>Total Discount:</span>
                    <span class="discount"
                      >-${{ formatCurrency(invoice.totalDiscountAmount) }}</span
                    >
                  </div>
                  <div v-if="invoice.totalTaxAmount > 0" class="total-row">
                    <span>Total Tax:</span>
                    <span>${{ formatCurrency(invoice.totalTaxAmount) }}</span>
                  </div>
                  <div class="total-row final-total">
                    <span>Total Amount:</span>
                    <span>${{ formatCurrency(invoice.total) }}</span>
                  </div>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <!-- Sidebar -->
        <div class="sidebar">
          <!-- Payment Status -->
          <Card class="payment-status-card">
            <template #title>Payment Status</template>
            <template #content>
              <div class="payment-overview">
                <div class="payment-amounts">
                  <div class="amount-item">
                    <label>Total Amount:</label>
                    <span class="amount total">${{ formatCurrency(invoice.total) }}</span>
                  </div>
                  <div class="amount-item">
                    <label>Amount Paid:</label>
                    <span class="amount paid"
                      >${{ formatCurrency(invoice.totalPaid) }}</span
                    >
                  </div>
                  <div class="amount-item">
                    <label>Remaining:</label>
                    <span class="amount remaining"
                      >${{ formatCurrency(invoice.remainingAmount) }}</span
                    >
                  </div>
                </div>

                <div class="payment-progress">
                  <label>Payment Progress</label>
                  <ProgressBar
                    :value="paymentPercentage"
                    :show-value="true"
                    :class="getProgressClass()"
                  />
                  <small class="progress-text">
                    {{ paymentPercentage.toFixed(1) }}% paid
                  </small>
                </div>

                <div v-if="invoice.lastPaymentDate" class="last-payment">
                  <label>Last Payment:</label>
                  <span>{{ formatDate(invoice.lastPaymentDate) }}</span>
                </div>

                <div v-if="invoice.daysOverdue" class="overdue-alert">
                  <i class="pi pi-exclamation-triangle"></i>
                  <span>{{ invoice.daysOverdue }} days overdue</span>
                </div>

                <div
                  v-else-if="invoice.daysUntilDue !== null && invoice.daysUntilDue <= 7"
                  class="due-soon-alert"
                >
                  <i class="pi pi-clock"></i>
                  <span>Due in {{ invoice.daysUntilDue }} days</span>
                </div>
              </div>
            </template>
          </Card>

          <!-- Document Actions -->
          <Card class="document-actions-card">
            <template #title>Document Actions</template>
            <template #content>
              <DocumentActions
                :document-id="invoice.id"
                document-type="invoice"
                :document-number="invoice.invoiceNumber"
                :document="invoice"
                :suggested-email="getInstitutionEmail()"
                @document-generated="onDocumentGenerated"
                @document-emailed="onDocumentEmailed"
              />
            </template>
          </Card>

          <!-- Document History -->
          <Card class="document-history-card">
            <template #title>Document History</template>
            <template #content>
              <DocumentHistory :document-id="invoice.id" document-type="invoice" />
            </template>
          </Card>

          <!-- Quick Actions -->
          <Card class="actions-card">
            <template #title>Quick Actions</template>
            <template #content>
              <div class="quick-actions">
                <Button
                  v-if="invoice.canReceivePayments"
                  icon="pi pi-dollar"
                  label="Record Payment"
                  class="p-button-success action-button"
                  @click="showPaymentDialog = true"
                />
                <Button
                  v-if="invoice.status === 'draft'"
                  icon="pi pi-send"
                  label="Send Invoice"
                  class="p-button-primary action-button"
                  @click="sendInvoice"
                />
                <Button
                  icon="pi pi-refresh"
                  label="Reconcile Payments"
                  class="p-button-outlined action-button"
                  @click="reconcilePayments"
                />
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Payment History -->
      <PaymentHistory
        :invoice="invoice"
        :can-record-payments="invoice.canReceivePayments"
        @record-payment="showPaymentDialog = true"
        @payment-updated="refreshInvoice"
      />
    </div>

    <div v-else class="error-container">
      <Message severity="error" :closable="false">
        Invoice not found or you don't have permission to view it.
      </Message>
    </div>

    <!-- Record Payment Dialog -->
    <PaymentForm
      v-model:visible="showPaymentDialog"
      :invoice="invoice"
      @payment-recorded="onPaymentRecorded"
    />
  </div>
</template>

<script setup lang="ts">
import {
  DocumentActions,
  DocumentHistory,
  PaymentForm,
  PaymentHistory,
} from "@/components/billing"
import { invoicesApi } from "@/services/api"
import type { Invoice, InvoiceStatus } from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const toast = useToast()

// Data
const invoice = ref<Invoice | null>(null)
const loading = ref(false)
const showPaymentDialog = ref(false)
const menu = ref()

// Menu items
const menuItems = computed(() => [
  {
    label: "Actions",
    items: [
      {
        label: "Duplicate Invoice",
        icon: "pi pi-copy",
        command: () => duplicateInvoice(),
      },
      {
        label: "Convert to Quote",
        icon: "pi pi-refresh",
        command: () => convertToQuote(),
      },
      {
        separator: true,
      },
      {
        label: "Cancel Invoice",
        icon: "pi pi-times",
        command: () => cancelInvoice(),
        disabled: !invoice.value?.canBeModified,
      },
      {
        label: "Delete Invoice",
        icon: "pi pi-trash",
        command: () => deleteInvoice(),
        disabled: !invoice.value?.canBeDeleted,
        class: "text-red-500",
      },
    ],
  },
])

// Computed
const paymentPercentage = computed(() => {
  if (!invoice.value || invoice.value.total === 0) return 0
  return (invoice.value.totalPaid / invoice.value.total) * 100
})

// Methods
const loadInvoice = async () => {
  try {
    loading.value = true
    const response = await invoicesApi.getById(route.params.id as string)

    if (response.success) {
      invoice.value = response.data
    }
  } catch (error) {
    console.error("Error loading invoice:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load invoice",
      life: 3000,
    })
  } finally {
    loading.value = false
  }
}

const refreshInvoice = () => {
  loadInvoice()
}

const goBack = () => {
  router.push("/invoices")
}

const editInvoice = () => {
  router.push(`/invoices/${invoice.value?.id}/edit`)
}

const sendInvoice = async () => {
  if (!invoice.value) return

  try {
    const response = await invoicesApi.send(invoice.value.id)
    if (response.success) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Invoice sent successfully",
        life: 3000,
      })
      refreshInvoice()
    }
  } catch (error) {
    console.error("Error sending invoice:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to send invoice",
      life: 3000,
    })
  }
}

const downloadPdf = async () => {
  if (!invoice.value) return

  try {
    const blob = (await documentsApi.generateInvoicePdf(invoice.value.id)) as Blob
    const filename = `Invoice-${invoice.value.invoiceNumber}.pdf`
    documentsApi.downloadBlob(blob, filename)

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Invoice PDF downloaded successfully",
      life: 3000,
    })
  } catch (error) {
    console.error("Error downloading PDF:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to download PDF",
      life: 3000,
    })
  }
}

const printInvoice = async () => {
  if (!invoice.value) return

  try {
    const blob = (await documentsApi.generateInvoicePdf(invoice.value.id)) as Blob
    documentsApi.openBlobInNewTab(blob)
  } catch (error) {
    console.error("Error printing invoice:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to open invoice for printing",
      life: 3000,
    })
  }
}

const reconcilePayments = async () => {
  if (!invoice.value) return

  try {
    const response = await invoicesApi.reconcile(invoice.value.id)
    if (response.success) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Payments reconciled successfully",
        life: 3000,
      })
      refreshInvoice()
    }
  } catch (error) {
    console.error("Error reconciling payments:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to reconcile payments",
      life: 3000,
    })
  }
}

const cancelInvoice = async () => {
  if (!invoice.value) return

  try {
    const response = await invoicesApi.cancel(invoice.value.id)
    if (response.success) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Invoice cancelled successfully",
        life: 3000,
      })
      refreshInvoice()
    }
  } catch (error) {
    console.error("Error cancelling invoice:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to cancel invoice",
      life: 3000,
    })
  }
}

const deleteInvoice = async () => {
  if (!invoice.value) return

  try {
    const response = await invoicesApi.delete(invoice.value.id)
    if (response.success) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Invoice deleted successfully",
        life: 3000,
      })
      router.push("/invoices")
    }
  } catch (error) {
    console.error("Error deleting invoice:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to delete invoice",
      life: 3000,
    })
  }
}

const duplicateInvoice = () => {
  // TODO: Implement duplicate functionality
  toast.add({
    severity: "info",
    summary: "Info",
    detail: "Duplicate functionality coming soon",
    life: 3000,
  })
}

const convertToQuote = () => {
  // TODO: Implement convert to quote functionality
  toast.add({
    severity: "info",
    summary: "Info",
    detail: "Convert to quote functionality coming soon",
    life: 3000,
  })
}

const addLine = () => {
  // TODO: Implement add line functionality
  toast.add({
    severity: "info",
    summary: "Info",
    detail: "Add line functionality coming soon",
    life: 3000,
  })
}

const editLine = (line: any) => {
  // TODO: Implement edit line functionality
  toast.add({
    severity: "info",
    summary: "Info",
    detail: "Edit line functionality coming soon",
    life: 3000,
  })
}

const deleteLine = (lineId: string) => {
  // TODO: Implement delete line functionality
  toast.add({
    severity: "info",
    summary: "Info",
    detail: "Delete line functionality coming soon",
    life: 3000,
  })
}

const toggleMenu = (event: Event) => {
  menu.value.toggle(event)
}

const onPaymentRecorded = () => {
  showPaymentDialog.value = false
  refreshInvoice()
}

const getInstitutionEmail = () => {
  if (!invoice.value?.institution?.contactPersons?.length) return undefined
  const primaryContact = invoice.value.institution.contactPersons.find((c) => c.isPrimary)
  return primaryContact?.email || invoice.value.institution.contactPersons[0]?.email
}

const onDocumentGenerated = (type: string) => {
  toast.add({
    severity: "success",
    summary: "Success",
    detail: `Document ${type} completed successfully`,
    life: 3000,
  })
}

const onDocumentEmailed = (type: string) => {
  toast.add({
    severity: "success",
    summary: "Success",
    detail: `Document ${type} completed successfully`,
    life: 3000,
  })
  refreshInvoice()
}

// Utility functions
const getStatusLabel = (status: InvoiceStatus) => {
  const statusMap = {
    draft: "Draft",
    sent: "Sent",
    partially_paid: "Partially Paid",
    paid: "Paid",
    overdue: "Overdue",
    cancelled: "Cancelled",
  }
  return statusMap[status] || status
}

const getStatusSeverity = (status: InvoiceStatus) => {
  const severityMap = {
    draft: "secondary",
    sent: "info",
    partially_paid: "warning",
    paid: "success",
    overdue: "danger",
    cancelled: "secondary",
  }
  return severityMap[status] || "secondary"
}

const getStatusIcon = (status: InvoiceStatus) => {
  const iconMap = {
    draft: "pi-file-edit",
    sent: "pi-send",
    partially_paid: "pi-clock",
    paid: "pi-check-circle",
    overdue: "pi-exclamation-triangle",
    cancelled: "pi-times-circle",
  }
  return iconMap[status] || "pi-file"
}

const getDueDateClass = () => {
  if (!invoice.value) return "due-date-normal"
  if (invoice.value.status === "paid") return "due-date-paid"
  if (invoice.value.daysOverdue && invoice.value.daysOverdue > 0)
    return "due-date-overdue"
  if (invoice.value.daysUntilDue !== null && invoice.value.daysUntilDue <= 7)
    return "due-date-soon"
  return "due-date-normal"
}

const getProgressClass = () => {
  const percentage = paymentPercentage.value
  if (percentage >= 100) return "progress-complete"
  if (percentage >= 50) return "progress-partial"
  return "progress-minimal"
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
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

// Lifecycle
onMounted(() => {
  loadInvoice()
})
</script>

<style scoped>
.invoice-detail-view {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.loading-container,
.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.title-section h1 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.75rem;
}

.status-tag {
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 350px;
  gap: 2rem;
  margin-bottom: 2rem;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card,
.lines-card,
.payment-status-card,
.actions-card {
  background: var(--surface-card);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.info-section h4 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1rem;
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.info-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.info-item label {
  font-weight: 600;
  color: var(--text-color-secondary);
  min-width: 120px;
  font-size: 0.875rem;
}

.info-item span {
  color: var(--text-color);
  text-align: right;
  flex: 1;
}

.institution-link,
.quote-link {
  color: var(--primary-color);
  text-decoration: none;
}

.institution-link:hover,
.quote-link:hover {
  text-decoration: underline;
}

.institution-type {
  text-transform: capitalize;
}

.due-date-normal {
  color: var(--text-color);
}

.due-date-soon {
  color: var(--orange-600);
  font-weight: 600;
}

.due-date-overdue {
  color: var(--red-600);
  font-weight: 600;
}

.due-date-paid {
  color: var(--green-600);
}

.lines-table {
  margin-bottom: 1rem;
}

.line-description {
  color: var(--text-color);
  font-weight: 500;
}

.quantity,
.price,
.line-total {
  font-family: "Courier New", monospace;
  font-weight: 600;
  text-align: right;
}

.discount {
  color: var(--red-500);
  font-family: "Courier New", monospace;
  font-weight: 600;
}

.tax {
  color: var(--text-color);
  font-family: "Courier New", monospace;
  font-weight: 600;
}

.no-discount,
.no-tax {
  color: var(--text-color-secondary);
  text-align: center;
}

.line-actions {
  display: flex;
  gap: 0.25rem;
}

.invoice-totals {
  border-top: 2px solid var(--surface-border);
  padding-top: 1rem;
  margin-top: 1rem;
}

.totals-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 300px;
  margin-left: auto;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.total-row.final-total {
  font-weight: 700;
  font-size: 1.125rem;
  padding-top: 0.75rem;
  border-top: 2px solid var(--surface-border);
  margin-top: 0.5rem;
  color: var(--primary-color);
}

.payment-overview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.payment-amounts {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.amount-item label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.amount {
  font-family: "Courier New", monospace;
  font-weight: 600;
}

.amount.total {
  color: var(--text-color);
}

.amount.paid {
  color: var(--green-600);
}

.amount.remaining {
  color: var(--orange-600);
}

.payment-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-progress label {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.875rem;
}

.progress-text {
  color: var(--text-color-secondary);
  font-size: 0.75rem;
  text-align: center;
}

.last-payment {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--surface-50);
  border-radius: 4px;
}

.last-payment label {
  font-weight: 600;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.overdue-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--red-50);
  border: 1px solid var(--red-200);
  border-radius: 4px;
  color: var(--red-700);
  font-weight: 600;
}

.due-soon-alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: 4px;
  color: var(--orange-700);
  font-weight: 600;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-button {
  width: 100%;
  justify-content: flex-start;
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

/* Column widths */
:deep(.quantity-column) {
  width: 80px;
}

:deep(.price-column),
:deep(.discount-column),
:deep(.tax-column),
:deep(.total-column) {
  width: 120px;
}

:deep(.actions-column) {
  width: 100px;
}

@media (max-width: 1200px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: -1;
  }
}

@media (max-width: 768px) {
  .invoice-detail-view {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .totals-grid {
    max-width: none;
  }
}
</style>
