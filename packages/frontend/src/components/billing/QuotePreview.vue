<template>
  <v-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    max-width="900px"
    max-height="90vh"
    scrollable
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Aperçu du devis</span>
        <div class="preview-actions">
          <v-btn
            icon="mdi-download"
            variant="text"
            @click="downloadPDF"
            :loading="downloading"
          >
            <v-icon>mdi-download</v-icon>
            <v-tooltip activator="parent" location="top">Télécharger PDF</v-tooltip>
          </v-btn>
          <v-btn
            v-if="String(quoteData?.status || '') === 'ordered'"
            icon="mdi-clipboard-text"
            variant="text"
            @click="downloadOrderPDF"
            :loading="downloading"
          >
            <v-icon>mdi-clipboard-text</v-icon>
            <v-tooltip activator="parent" location="top">Télécharger Bon de commande</v-tooltip>
          </v-btn>
          <v-btn
            icon="mdi-open-in-new"
            variant="text"
            @click="openInNewTab"
          >
            <v-icon>mdi-open-in-new</v-icon>
            <v-tooltip activator="parent" location="top">Ouvrir dans un nouvel onglet</v-tooltip>
          </v-btn>
        </div>
      </v-card-title>

    <v-card-text class="preview-content">
      <div v-if="!quoteData" class="no-data">
        <v-icon size="64" color="grey-lighten-2">mdi-file-document-outline</v-icon>
        <p>Aucune donnée de devis à prévisualiser</p>
      </div>

      <div v-else class="quote-document">
        <!-- Quote Header -->
        <div class="document-header">
          <div class="company-info">
            <h1>Your Company Name</h1>
            <div class="company-address">
              <div>123 Business Street</div>
              <div>Business City, BC 12345</div>
              <div>United States</div>
            </div>
          </div>
          <div class="quote-info">
            <h2>QUOTE</h2>
            <div class="quote-details">
              <div><strong>Quote #:</strong> {{ quoteData.quoteNumber }}</div>
              <div><strong>Date:</strong> {{ formatDate(quoteData.createdAt) }}</div>
              <div>
                <strong>Valid Until:</strong> {{ formatDate(quoteData.validUntil) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Client Information -->
        <div class="client-section">
          <h3>Quote For:</h3>
          <div class="client-info">
            <div class="client-name">
              {{ quoteData.institution?.name || "Selected Institution" }}
            </div>
            <div v-if="quoteData.institution?.address" class="client-address">
              <div>{{ quoteData.institution.address.street }}</div>
              <div>
                {{ quoteData.institution.address.city }},
                {{ quoteData.institution.address.state }}
                {{ quoteData.institution.address.zipCode }}
              </div>
              <div>{{ quoteData.institution.address.country }}</div>
            </div>
          </div>
        </div>

        <!-- Quote Details -->
        <div class="quote-details-section">
          <div class="quote-title">
            <h3>{{ quoteData.title }}</h3>
          </div>
          <div v-if="quoteData.description" class="quote-description">
            <p>{{ quoteData.description }}</p>
          </div>
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
              <tr v-for="(line, index) in quoteData.lines" :key="index">
                <td class="description-cell" v-html="renderDescription(line.description)"></td>
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
              <span>{{ formatCurrency(quoteData.subtotal) }}</span>
            </div>
            <div class="total-row" v-if="quoteData.totalDiscountAmount > 0">
              <span>Total Discount:</span>
              <span class="discount-amount"
                >-{{ formatCurrency(quoteData.totalDiscountAmount) }}</span
              >
            </div>
            <div class="total-row" v-if="quoteData.totalTaxAmount > 0">
              <span>Total Tax:</span>
              <span>{{ formatCurrency(quoteData.totalTaxAmount) }}</span>
            </div>
            <div class="total-row final-total">
              <span><strong>Total:</strong></span>
              <span
                ><strong>{{ formatCurrency(quoteData.total) }}</strong></span
              >
            </div>
          </div>
        </div>

        <!-- Terms and Conditions -->
        <div class="terms-section">
          <h4>Terms and Conditions</h4>
          <div class="terms-content">
            <p>This quote is valid until {{ formatDate(quoteData.validUntil) }}.</p>
            <p>Payment terms: Net 30 days from invoice date.</p>
            <p>
              All prices are in USD and exclude applicable taxes unless otherwise stated.
            </p>
            <p>This quote is subject to our standard terms and conditions of sale.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="document-footer">
          <p>
            Thank you for considering our services. We look forward to working with you.
          </p>
        </div>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        variant="outlined"
        @click="$emit('update:visible', false)"
      >
        Fermer
      </v-btn>
      <v-btn
        color="primary"
        prepend-icon="mdi-download"
        @click="downloadPDF"
        :loading="downloading"
      >
        Télécharger PDF
      </v-btn>
    </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { Quote } from "@medical-crm/shared"
import { ref } from "vue"

interface Props {
  visible: boolean
  quoteData?: Partial<Quote> | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  "update:visible": [visible: boolean]
}>()

// Reactive state
const downloading = ref(false)

// Methods

/**
 * Convert TipTap JSON to HTML for display
 */
const renderDescription = (content: string | undefined | null): string => {
  if (!content) return ''

  // If it's not JSON, return as-is (plain text or HTML)
  if (typeof content !== 'string' || !content.trim().startsWith('{')) {
    return content
  }

  try {
    const json = JSON.parse(content)
    return convertTipTapToHtml(json)
  } catch {
    return content
  }
}

/**
 * Recursively convert TipTap JSON node to HTML
 */
const convertTipTapToHtml = (node: any): string => {
  if (!node) return ''

  // Text node
  if (node.type === 'text') {
    let text = node.text || ''
    // Apply marks
    if (node.marks) {
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'bold':
            text = `<strong>${text}</strong>`
            break
          case 'italic':
            text = `<em>${text}</em>`
            break
          case 'underline':
            text = `<u>${text}</u>`
            break
          case 'strike':
            text = `<s>${text}</s>`
            break
        }
      }
    }
    return text
  }

  // Container nodes
  const children = (node.content || []).map(convertTipTapToHtml).join('')

  switch (node.type) {
    case 'doc':
      return children
    case 'paragraph':
      return children ? `<p>${children}</p>` : '<p></p>'
    case 'bulletList':
      return `<ul>${children}</ul>`
    case 'orderedList':
      return `<ol>${children}</ol>`
    case 'listItem':
      return `<li>${children}</li>`
    case 'heading':
      const level = node.attrs?.level || 1
      return `<h${level}>${children}</h${level}>`
    case 'hardBreak':
      return '<br>'
    default:
      return children
  }
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
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0)
}

const downloadPDF = async () => {
  if (!props.quoteData?.id || props.quoteData.id === "preview") {
    alert("Veuillez d'abord sauvegarder le devis avant de télécharger le PDF")
    return
  }

  try {
    downloading.value = true
    if (!props.quoteData?.id) {
      alert("Aucun devis à télécharger")
      return
    }
    // Use selected template if present in form
    const templateId = (props as unknown as { quoteData?: { templateId?: string } })?.quoteData?.templateId
    const response = await (await import("@/services/api")).quotesApi.generatePdf(
      props.quoteData.id,
      templateId
    )
    if (!response.ok) {
      // Try to parse error message from JSON response
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        const errorData = await response.json()
        const errorMessage = errorData?.error?.message || `Erreur HTTP ${response.status}`
        throw new Error(errorMessage)
      }
      throw new Error(`Erreur HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Quote-${props.quoteData?.quoteNumber || "devis"}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Failed to download PDF:", error)
    const message = error instanceof Error ? error.message : "Erreur lors du téléchargement du PDF"
    alert(message)
  } finally {
    downloading.value = false
  }
}

const openInNewTab = () => {
  // Create a new window with the quote preview
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    const content = document.querySelector(".quote-document")?.innerHTML
    if (content) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Quote Preview - ${props.quoteData?.quoteNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .document-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .company-info h1 { margin: 0; color: #2c3e50; }
              .quote-info h2 { margin: 0; color: #2c3e50; }
              .line-items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .line-items-table th, .line-items-table td { padding: 10px; border: 1px solid #ddd; text-align: left; }
              .line-items-table th { background-color: #f8f9fa; }
              .number-cell { text-align: right; }
              .totals-section { margin-top: 30px; }
              .totals-table { max-width: 300px; margin-left: auto; }
              .total-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
              .final-total { border-top: 2px solid #333; font-weight: bold; }
              .discount-amount { color: #e74c3c; }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }
}

const downloadOrderPDF = async () => {
  try {
    downloading.value = true
    if (!props.quoteData?.id) {
      alert("Aucun devis à télécharger")
      return
    }
    const templateId = (props as unknown as { quoteData?: { templateId?: string } })?.quoteData?.templateId
    const response = await (await import("@/services/api")).quotesApi.generateOrderPdf(
      props.quoteData.id,
      templateId
    )
    if (!response.ok) {
      // Try to parse error message from JSON response
      const contentType = response.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        const errorData = await response.json()
        const errorMessage = errorData?.error?.message || `Erreur HTTP ${response.status}`
        throw new Error(errorMessage)
      }
      throw new Error(`Erreur HTTP ${response.status}`)
    }
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Order-${props.quoteData?.orderNumber || props.quoteData?.quoteNumber || 'order'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Failed to download Order PDF:", error)
    const message = error instanceof Error ? error.message : "Erreur lors du téléchargement du bon de commande"
    alert(message)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.quote-preview-dialog {
  width: 90vw;
  max-width: 900px;
  height: 90vh;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.preview-header h3 {
  margin: 0;
  color: var(--text-color);
}

.preview-actions {
  display: flex;
  gap: 0.25rem;
}

.preview-content {
  height: 70vh;
  overflow-y: auto;
  padding: 1rem 0;
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

.quote-document {
  background: white;
  padding: 2rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.document-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.company-info h1 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.75rem;
}

.company-address div {
  margin-bottom: 0.25rem;
  color: #666;
}

.quote-info {
  text-align: right;
}

.quote-info h2 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 2rem;
  font-weight: bold;
}

.quote-details div {
  margin-bottom: 0.5rem;
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
}

.client-address div {
  margin-bottom: 0.25rem;
  color: #666;
}

.quote-details-section {
  margin-bottom: 2rem;
}

.quote-title h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.quote-description p {
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
  padding: 0.75rem;
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

.description-cell {
  vertical-align: top;
}

.description-cell :deep(p) {
  margin: 0 0 0.5em 0;
}

.description-cell :deep(p:last-child) {
  margin-bottom: 0;
}

.description-cell :deep(ul),
.description-cell :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.description-cell :deep(li) {
  margin: 0.25em 0;
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

.discount-amount {
  color: #e74c3c;
}

.terms-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.terms-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.terms-content p {
  margin: 0 0 0.75rem 0;
  color: #666;
  font-size: 0.875rem;
  line-height: 1.5;
}

.terms-content p:last-child {
  margin-bottom: 0;
}

.document-footer {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid #eee;
  color: #666;
  font-style: italic;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 0 0 0;
  border-top: 1px solid var(--surface-border);
}

/* Responsive design */
@media (max-width: 768px) {
  .quote-preview-dialog {
    width: 95vw;
    height: 95vh;
  }

  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .quote-document {
    padding: 1rem;
    font-size: 12px;
  }

  .document-header {
    flex-direction: column;
    gap: 1rem;
  }

  .quote-info {
    text-align: left;
  }

  .line-items-table {
    font-size: 0.75rem;
  }

  .line-items-table th,
  .line-items-table td {
    padding: 0.5rem 0.25rem;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-footer .p-button {
    width: 100%;
  }
}
</style>
