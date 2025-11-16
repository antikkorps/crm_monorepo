<template>
  <div class="print-view">
    <div class="print-header">
      <h3>Print Preview</h3>
      <div class="print-actions">
        <v-btn
          @click="printDocument"
          :loading="printing"
          color="primary"
        >
          <v-icon start>mdi-printer</v-icon>
          Print
        </v-btn>
        <v-btn @click="$emit('close')" variant="outlined" color="secondary">
          Close
        </v-btn>
      </div>
    </div>

    <div class="print-content" ref="printContent">
      <div v-if="!documentData" class="no-data">
        <v-icon class="empty-icon">mdi-file-outline</v-icon>
        <p>No document data to display</p>
      </div>

      <div v-else class="document-print" :class="`document-${documentType}`">
        <!-- Document Header -->
        <div class="document-header">
          <div class="company-section">
            <div v-if="template?.logoUrl" class="company-logo">
              <img :src="template.logoUrl" :alt="template.companyName" />
            </div>
            <div class="company-info">
              <h1>{{ template?.companyName || "Your Company Name" }}</h1>
              <div class="company-address">
                <div>{{ template?.companyAddress?.street || "123 Business Street" }}</div>
                <div>
                  {{ template?.companyAddress?.city || "Business City" }},
                  {{ template?.companyAddress?.state || "BC" }}
                  {{ template?.companyAddress?.zipCode || "12345" }}
                </div>
                <div>{{ template?.companyAddress?.country || "United States" }}</div>
              </div>
              <div v-if="template?.companyPhone" class="company-contact">
                <div>Phone: {{ template.companyPhone }}</div>
              </div>
              <div v-if="template?.companyEmail" class="company-contact">
                <div>Email: {{ template.companyEmail }}</div>
              </div>
            </div>
          </div>

          <div class="document-info">
            <h2>{{ documentType.toUpperCase() }}</h2>
            <div class="document-details">
              <div class="detail-row">
                <span class="label"
                  >{{ documentType === "quote" ? "Quote" : "Invoice" }} #:</span
                >
                <span class="value">{{ documentNumber }}</span>
              </div>
              <div class="detail-row">
                <span class="label">Date:</span>
                <span class="value">{{ formatDate(documentData.createdAt) }}</span>
              </div>
              <div v-if="documentType === 'quote'" class="detail-row">
                <span class="label">Valid Until:</span>
                <span class="value">{{ formatDate(documentData.validUntil) }}</span>
              </div>
              <div v-if="documentType === 'invoice'" class="detail-row">
                <span class="label">Due Date:</span>
                <span class="value">{{ formatDate(documentData.dueDate) }}</span>
              </div>
              <div v-if="documentData.quoteId" class="detail-row">
                <span class="label">Quote Ref:</span>
                <span class="value">{{ documentData.quote?.quoteNumber }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Client Information -->
        <div class="client-section">
          <h3>{{ documentType === "quote" ? "Quote For:" : "Bill To:" }}</h3>
          <div class="client-info">
            <div class="client-name">{{ institution?.name || "Client Name" }}</div>
            <div v-if="institution?.address" class="client-address">
              <div>{{ institution.address.street }}</div>
              <div>
                {{ institution.address.city }},
                {{ institution.address.state }}
                {{ institution.address.zipCode }}
              </div>
              <div>{{ institution.address.country }}</div>
            </div>
          </div>
        </div>

        <!-- Document Title and Description -->
        <div
          v-if="documentData.title || documentData.description"
          class="document-details-section"
        >
          <h3 v-if="documentData.title">{{ documentData.title }}</h3>
          <p v-if="documentData.description" class="document-description">
            {{ documentData.description }}
          </p>
        </div>

        <!-- Line Items -->
        <div class="line-items-section">
          <table class="line-items-table">
            <thead>
              <tr>
                <th class="description-col">Description</th>
                <th class="number-col">Qty</th>
                <th class="number-col">Unit Price</th>
                <th class="number-col">Discount</th>
                <th class="number-col">Tax</th>
                <th class="number-col">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="index">
                <td class="description-cell">{{ line.description }}</td>
                <td class="number-cell">{{ line.quantity }}</td>
                <td class="number-cell">{{ formatCurrency(line.unitPrice) }}</td>
                <td class="number-cell discount-cell">
                  {{
                    line.discountAmount > 0
                      ? `-${formatCurrency(line.discountAmount)}`
                      : "-"
                  }}
                </td>
                <td class="number-cell">{{ formatCurrency(line.taxAmount) }}</td>
                <td class="number-cell total-cell">{{ formatCurrency(line.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-table">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>{{ formatCurrency(documentData.subtotal) }}</span>
            </div>
            <div v-if="documentData.totalDiscountAmount > 0" class="total-row">
              <span>Total Discount:</span>
              <span class="discount-amount"
                >-{{ formatCurrency(documentData.totalDiscountAmount) }}</span
              >
            </div>
            <div v-if="documentData.totalTaxAmount > 0" class="total-row">
              <span>Total Tax:</span>
              <span>{{ formatCurrency(documentData.totalTaxAmount) }}</span>
            </div>
            <div class="total-row final-total">
              <span><strong>Total:</strong></span>
              <span
                ><strong>{{ formatCurrency(documentData.total) }}</strong></span
              >
            </div>

            <!-- Invoice-specific payment information -->
            <template v-if="documentType === 'invoice' && documentData.totalPaid > 0">
              <div class="total-row payment-row">
                <span>Amount Paid:</span>
                <span>{{ formatCurrency(documentData.totalPaid) }}</span>
              </div>
              <div class="total-row balance-row">
                <span><strong>Balance Due:</strong></span>
                <span
                  ><strong>{{
                    formatCurrency(documentData.remainingAmount)
                  }}</strong></span
                >
              </div>
            </template>
          </div>
        </div>

        <!-- Payment History (for invoices) -->
        <div
          v-if="documentType === 'invoice' && payments?.length"
          class="payments-section"
        >
          <h4>Payment History</h4>
          <table class="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in payments" :key="payment.id">
                <td>{{ formatDate(payment.paymentDate) }}</td>
                <td>{{ formatPaymentMethod(payment.paymentMethod) }}</td>
                <td>{{ formatCurrency(payment.amount) }}</td>
                <td>
                  <span :class="`status-${payment.status}`">
                    {{ formatPaymentStatus(payment.status) }}
                  </span>
                </td>
                <td>{{ payment.reference || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Payment Instructions -->
        <div v-if="template?.paymentInstructions" class="payment-instructions">
          <h4>Payment Instructions</h4>
          <p>{{ template.paymentInstructions }}</p>
        </div>

        <!-- Terms and Conditions -->
        <div class="terms-section">
          <h4>Terms and Conditions</h4>
          <div class="terms-content">
            <p v-if="template?.termsAndConditions">{{ template.termsAndConditions }}</p>
            <template v-else>
              <p v-if="documentType === 'quote'">
                This quote is valid until {{ formatDate(documentData.validUntil) }}.
              </p>
              <p>Payment terms: Net 30 days from invoice date.</p>
              <p>
                All prices are in USD and exclude applicable taxes unless otherwise
                stated.
              </p>
              <p>
                This {{ documentType }} is subject to our standard terms and conditions of
                sale.
              </p>
            </template>
          </div>
        </div>

        <!-- Footer -->
        <div class="document-footer">
          <p v-if="template?.customFooter">{{ template.customFooter }}</p>
          <p v-else>Thank you for your business. We look forward to working with you.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  DocumentTemplate,
  Invoice,
  InvoiceLine,
  MedicalInstitution,
  Payment,
  Quote,
  QuoteLine,
} from "@medical-crm/shared"
import { useNotificationStore } from "@/stores/notification"
import { ref } from "vue"

interface Props {
  documentType: "quote" | "invoice"
  documentNumber: string
  documentData: Quote | Invoice
  institution?: MedicalInstitution
  lines?: QuoteLine[] | InvoiceLine[]
  payments?: Payment[]
  template?: DocumentTemplate
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// Reactive state
const printing = ref(false)
const printContent = ref<HTMLElement>()

// Notifications
const notificationStore = useNotificationStore()

// Methods
const printDocument = async () => {
  try {
    printing.value = true

    // Create a new window for printing
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      throw new Error("Failed to open print window")
    }

    // Get the content to print
    const content = printContent.value?.innerHTML
    if (!content) {
      throw new Error("No content to print")
    }

    // Write the print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print - ${
            props.documentType.charAt(0).toUpperCase() + props.documentType.slice(1)
          } ${props.documentNumber}</title>
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          <\/script>
        </body>
      </html>
    `)

    printWindow.document.close()

    notificationStore.showSuccess("Print dialog opened")
  } catch (error) {
    console.error("Failed to print document:", error)
    notificationStore.showError("Failed to print document")
  } finally {
    printing.value = false
  }
}

const getPrintStyles = () => {
  return `
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      margin: 0;
      padding: 20px;
      background: white;
    }

    .document-print {
      max-width: none;
      margin: 0;
      padding: 0;
    }

    .document-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #eee;
    }

    .company-section {
      display: flex;
      align-items: flex-start;
      gap: 20px;
    }

    .company-logo img {
      max-height: 80px;
      max-width: 200px;
    }

    .company-info h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
      color: #2c3e50;
    }

    .company-address div,
    .company-contact div {
      margin-bottom: 4px;
      color: #666;
    }

    .document-info {
      text-align: right;
    }

    .document-info h2 {
      margin: 0 0 15px 0;
      font-size: 28px;
      color: #2c3e50;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      min-width: 200px;
    }

    .detail-row .label {
      font-weight: bold;
    }

    .client-section {
      margin-bottom: 30px;
    }

    .client-section h3 {
      margin: 0 0 15px 0;
      color: #2c3e50;
      font-size: 16px;
    }

    .client-name {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 8px;
    }

    .client-address div {
      margin-bottom: 4px;
      color: #666;
    }

    .document-details-section {
      margin-bottom: 30px;
    }

    .document-details-section h3 {
      margin: 0 0 15px 0;
      color: #2c3e50;
      font-size: 18px;
    }

    .document-description {
      margin: 0;
      color: #666;
      line-height: 1.6;
    }

    .line-items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }

    .line-items-table th,
    .line-items-table td {
      padding: 10px 8px;
      border: 1px solid #ddd;
      text-align: left;
    }

    .line-items-table th {
      background-color: #f8f9fa;
      font-weight: bold;
      color: #2c3e50;
    }

    .description-col {
      width: 40%;
    }

    .number-col {
      width: 12%;
      text-align: right;
    }

    .number-cell {
      text-align: right;
      font-family: "Courier New", monospace;
    }

    .discount-cell {
      color: #e74c3c;
    }

    .total-cell {
      font-weight: bold;
    }

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin: 30px 0;
    }

    .totals-table {
      min-width: 300px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .final-total {
      border-top: 2px solid #2c3e50;
      margin-top: 8px;
      padding-top: 12px;
      font-size: 16px;
    }

    .payment-row {
      color: #27ae60;
    }

    .balance-row {
      border-top: 1px solid #e74c3c;
      color: #e74c3c;
      font-weight: bold;
    }

    .discount-amount {
      color: #e74c3c;
    }

    .payments-section {
      margin: 30px 0;
    }

    .payments-section h4 {
      margin: 0 0 15px 0;
      color: #2c3e50;
    }

    .payments-table {
      width: 100%;
      border-collapse: collapse;
    }

    .payments-table th,
    .payments-table td {
      padding: 8px;
      border: 1px solid #ddd;
      text-align: left;
    }

    .payments-table th {
      background-color: #f8f9fa;
      font-weight: bold;
    }

    .status-confirmed {
      color: #27ae60;
      font-weight: bold;
    }

    .status-pending {
      color: #f39c12;
    }

    .status-failed {
      color: #e74c3c;
    }

    .payment-instructions,
    .terms-section {
      margin: 30px 0;
    }

    .payment-instructions h4,
    .terms-section h4 {
      margin: 0 0 15px 0;
      color: #2c3e50;
    }

    .terms-content p {
      margin: 0 0 12px 0;
      color: #666;
      line-height: 1.6;
    }

    .document-footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      color: #666;
      font-style: italic;
    }

    @page {
      margin: 1in;
    }

    @media print {
      body {
        padding: 0;
      }
      
      .print-header {
        display: none;
      }
    }
  `
}

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0)
}

const formatPaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    bank_transfer: "Bank Transfer",
    check: "Check",
    cash: "Cash",
    credit_card: "Credit Card",
    other: "Other",
  }
  return methods[method] || method
}

const formatPaymentStatus = (status: string) => {
  const statuses: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    failed: "Failed",
    cancelled: "Cancelled",
  }
  return statuses[status] || status
}
</script>

<style scoped>
.print-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--surface-ground);
}

.print-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.print-header h3 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.25rem;
}

.print-actions {
  display: flex;
  gap: 0.75rem;
}

.print-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: white;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.document-print {
  max-width: 800px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #eee;
}

.company-section {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
}

.company-logo img {
  max-height: 80px;
  max-width: 200px;
  object-fit: contain;
}

.company-info h1 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.company-address div,
.company-contact div {
  margin-bottom: 0.25rem;
  color: #666;
  font-size: 0.875rem;
}

.document-info {
  text-align: right;
}

.document-info h2 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 2rem;
  font-weight: bold;
}

.document-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  min-width: 200px;
  font-size: 0.875rem;
}

.detail-row .label {
  font-weight: 600;
  color: #2c3e50;
}

.detail-row .value {
  color: #666;
}

.client-section {
  margin-bottom: 2rem;
}

.client-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.125rem;
}

.client-name {
  font-weight: bold;
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.client-address div {
  margin-bottom: 0.25rem;
  color: #666;
}

.document-details-section {
  margin-bottom: 2rem;
}

.document-details-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.document-description {
  margin: 0;
  color: #666;
  line-height: 1.6;
}

.line-items-section {
  margin-bottom: 2rem;
}

.line-items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.line-items-table th,
.line-items-table td {
  padding: 0.75rem 0.5rem;
  border: 1px solid #ddd;
  text-align: left;
}

.line-items-table th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #2c3e50;
}

.description-col {
  width: 40%;
}

.number-col {
  width: 12%;
  text-align: right;
}

.number-cell {
  text-align: right;
  font-family: "Courier New", monospace;
}

.discount-cell {
  color: #e74c3c;
}

.total-cell {
  font-weight: bold;
}

.totals-section {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 2rem;
}

.totals-table {
  min-width: 300px;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.total-row:last-child {
  border-bottom: none;
}

.final-total {
  border-top: 2px solid #2c3e50;
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-size: 1.125rem;
}

.payment-row {
  color: #27ae60;
}

.balance-row {
  border-top: 1px solid #e74c3c;
  color: #e74c3c;
  font-weight: bold;
}

.discount-amount {
  color: #e74c3c;
}

.payments-section {
  margin-bottom: 2rem;
}

.payments-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.payments-table {
  width: 100%;
  border-collapse: collapse;
}

.payments-table th,
.payments-table td {
  padding: 0.5rem;
  border: 1px solid #ddd;
  text-align: left;
  font-size: 0.875rem;
}

.payments-table th {
  background-color: #f8f9fa;
  font-weight: bold;
}

.status-confirmed {
  color: #27ae60;
  font-weight: bold;
}

.status-pending {
  color: #f39c12;
}

.status-failed {
  color: #e74c3c;
}

.payment-instructions,
.terms-section {
  margin-bottom: 2rem;
}

.payment-instructions h4,
.terms-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.terms-content p {
  margin: 0 0 0.75rem 0;
  color: #666;
  line-height: 1.6;
}

.terms-content p:last-child {
  margin-bottom: 0;
}

.document-footer {
  text-align: center;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
  color: #666;
  font-style: italic;
}

/* Responsive design */
@media (max-width: 768px) {
  .print-content {
    padding: 1rem;
  }

  .document-header {
    flex-direction: column;
    gap: 1.5rem;
  }

  .document-info {
    text-align: left;
  }

  .company-section {
    flex-direction: column;
    gap: 1rem;
  }

  .line-items-table {
    font-size: 0.75rem;
  }

  .line-items-table th,
  .line-items-table td {
    padding: 0.5rem 0.25rem;
  }
}
</style>
