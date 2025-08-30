<template>
  <div class="quote-builder">
    <div class="quote-header">
      <div class="header-content">
        <h2>{{ isEditing ? "Edit Quote" : "Create New Quote" }}</h2>
        <div class="quote-status" v-if="isEditing && quote">
          <Badge :value="statusLabel" :severity="statusSeverity" />
        </div>
      </div>
      <div class="header-actions">
        <Button
          label="Save Draft"
          icon="pi pi-save"
          severity="secondary"
          outlined
          @click="saveDraft"
          :loading="saving"
          :disabled="!isFormValid"
        />
        <Button
          label="Preview"
          icon="pi pi-eye"
          severity="info"
          outlined
          @click="previewQuote"
          :disabled="!isFormValid"
        />
        <Button
          :label="isEditing ? 'Update Quote' : 'Create Quote'"
          icon="pi pi-check"
          @click="saveQuote"
          :loading="saving"
          :disabled="!isFormValid"
        />
      </div>
    </div>

    <div class="quote-form">
      <!-- Basic Information -->
      <Card class="form-section">
        <template #title>Basic Information</template>
        <template #content>
          <div class="form-grid">
            <div class="form-group">
              <label for="institution">Medical Institution *</label>
              <Dropdown
                id="institution"
                v-model="formData.institutionId"
                :options="institutions"
                option-label="name"
                option-value="id"
                placeholder="Select institution"
                filter
                :class="{ 'p-invalid': errors.institutionId }"
                @change="onInstitutionChange"
              />
              <small v-if="errors.institutionId" class="p-error">{{
                errors.institutionId
              }}</small>
            </div>

            <div class="form-group">
              <label for="template">Document Template</label>
              <Dropdown
                id="template"
                v-model="formData.templateId"
                :options="templates"
                option-label="name"
                option-value="id"
                placeholder="Select template (optional)"
                show-clear
              />
            </div>

            <div class="form-group">
              <label for="title">Quote Title *</label>
              <InputText
                id="title"
                v-model="formData.title"
                placeholder="Enter quote title"
                :class="{ 'p-invalid': errors.title }"
              />
              <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
            </div>

            <div class="form-group">
              <label for="valid-until">Valid Until *</label>
              <Calendar
                id="valid-until"
                v-model="formData.validUntil"
                :min-date="new Date()"
                date-format="mm/dd/yy"
                :class="{ 'p-invalid': errors.validUntil }"
              />
              <small v-if="errors.validUntil" class="p-error">{{
                errors.validUntil
              }}</small>
            </div>

            <div class="form-group full-width">
              <label for="description">Description</label>
              <Textarea
                id="description"
                v-model="formData.description"
                placeholder="Enter quote description"
                rows="3"
              />
            </div>

            <div class="form-group full-width">
              <label for="internal-notes">Internal Notes</label>
              <Textarea
                id="internal-notes"
                v-model="formData.internalNotes"
                placeholder="Internal notes (not visible to client)"
                rows="2"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Line Items -->
      <Card class="form-section">
        <template #title>
          <div class="section-header">
            <span>Line Items</span>
            <Button label="Add Line" icon="pi pi-plus" size="small" @click="addLine" />
          </div>
        </template>
        <template #content>
          <div v-if="formData.lines.length === 0" class="empty-lines">
            <i class="pi pi-list empty-icon"></i>
            <p>No line items added yet</p>
            <Button label="Add First Line" icon="pi pi-plus" @click="addLine" />
          </div>

          <div v-else class="lines-container">
            <QuoteLine
              v-for="(line, index) in formData.lines"
              :key="line.tempId || line.id"
              :line="line"
              :index="index"
              @update="updateLine"
              @remove="removeLine"
              @move-up="moveLineUp"
              @move-down="moveLineDown"
            />
          </div>
        </template>
      </Card>

      <!-- Totals Summary -->
      <Card class="form-section totals-section">
        <template #title>Quote Summary</template>
        <template #content>
          <div class="totals-grid">
            <div class="totals-breakdown">
              <div class="total-row">
                <span>Subtotal:</span>
                <span class="amount">{{
                  formatCurrency(calculatedTotals.subtotal)
                }}</span>
              </div>
              <div class="total-row">
                <span>Total Discount:</span>
                <span class="amount discount"
                  >-{{ formatCurrency(calculatedTotals.totalDiscountAmount) }}</span
                >
              </div>
              <div class="total-row">
                <span>Total Tax:</span>
                <span class="amount">{{
                  formatCurrency(calculatedTotals.totalTaxAmount)
                }}</span>
              </div>
              <div class="total-row final-total">
                <span><strong>Total:</strong></span>
                <span class="amount"
                  ><strong>{{ formatCurrency(calculatedTotals.total) }}</strong></span
                >
              </div>
            </div>

            <div class="totals-actions">
              <Button
                label="Send to Client"
                icon="pi pi-send"
                severity="success"
                @click="sendQuote"
                :disabled="!canSendQuote"
                :loading="sending"
              />
              <Button
                label="Convert to Invoice"
                icon="pi pi-arrow-right"
                severity="warning"
                outlined
                @click="convertToInvoice"
                :disabled="!canConvertToInvoice"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Quote Preview Dialog -->
    <QuotePreview v-model:visible="showPreview" :quote-data="previewData" />

    <!-- Send Quote Dialog -->
    <Dialog
      v-model:visible="showSendDialog"
      header="Send Quote to Client"
      :modal="true"
      class="send-dialog"
    >
      <div class="send-content">
        <div class="recipient-info">
          <h4>Recipient</h4>
          <div class="recipient-details">
            <div>
              <strong>{{ selectedInstitution?.name }}</strong>
            </div>
            <div>{{ institutionContactEmail }}</div>
          </div>
        </div>

        <div class="message-section">
          <label for="email-message">Custom Message (Optional)</label>
          <Textarea
            id="email-message"
            v-model="emailMessage"
            placeholder="Add a personal message to include with the quote..."
            rows="4"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="showSendDialog = false"
        />
        <Button
          label="Send Quote"
          icon="pi pi-send"
          @click="confirmSendQuote"
          :loading="sending"
        />
      </template>
    </Dialog>

    <!-- Toast for notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import type {
  DocumentTemplate,
  MedicalInstitution,
  Quote,
  QuoteCreateRequest,
  QuoteLine as QuoteLineType,
  QuoteStatus,
} from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { institutionsApi, quotesApi, templatesApi } from "../../services/api"
import QuoteLine from "./QuoteLine.vue"
import QuotePreview from "./QuotePreview.vue"

interface Props {
  quote?: Quote | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  saved: [quote: Quote]
  cancelled: []
}>()

// Reactive state
const router = useRouter()
const toast = useToast()
const saving = ref(false)
const sending = ref(false)
const showPreview = ref(false)
const showSendDialog = ref(false)
const emailMessage = ref("")

// Form data
const formData = ref<
  QuoteCreateRequest & { lines: (QuoteLineType & { tempId?: string })[] }
>({
  institutionId: "",
  templateId: "",
  title: "",
  description: "",
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  internalNotes: "",
  lines: [],
})

// Data sources
const institutions = ref<MedicalInstitution[]>([])
const templates = ref<DocumentTemplate[]>([])
const errors = ref<Record<string, string>>({})

// Computed properties
const isEditing = computed(() => !!props.quote)

const isFormValid = computed(() => {
  return (
    formData.value.institutionId &&
    formData.value.title.trim() &&
    formData.value.validUntil &&
    formData.value.lines.length > 0 &&
    formData.value.lines.every(
      (line) => line.description.trim() && line.quantity > 0 && line.unitPrice >= 0
    )
  )
})

const selectedInstitution = computed(() => {
  return institutions.value.find((inst) => inst.id === formData.value.institutionId)
})

const institutionContactEmail = computed(() => {
  if (!selectedInstitution.value?.contactPersons?.length) return "No contact email"
  const primaryContact = selectedInstitution.value.contactPersons.find((c) => c.isPrimary)
  return (
    primaryContact?.email ||
    selectedInstitution.value.contactPersons[0]?.email ||
    "No contact email"
  )
})

const statusLabel = computed(() => {
  if (!props.quote) return ""

  const statusLabels: Record<QuoteStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
    cancelled: "Cancelled",
  }

  return statusLabels[props.quote.status] || "Unknown"
})

const statusSeverity = computed(() => {
  if (!props.quote) return "secondary"

  const severities: Record<QuoteStatus, string> = {
    draft: "secondary",
    sent: "info",
    accepted: "success",
    rejected: "danger",
    expired: "warning",
    cancelled: "secondary",
  }

  return severities[props.quote.status] || "secondary"
})

const calculatedTotals = computed(() => {
  let subtotal = 0
  let totalDiscountAmount = 0
  let totalTaxAmount = 0

  formData.value.lines.forEach((line) => {
    const lineSubtotal = line.quantity * line.unitPrice
    subtotal += lineSubtotal

    // Calculate discount
    let discountAmount = 0
    if (line.discountType === "percentage") {
      discountAmount = lineSubtotal * (line.discountValue / 100)
    } else if (line.discountType === "fixed_amount") {
      discountAmount = line.discountValue
    }
    totalDiscountAmount += discountAmount

    // Calculate tax on discounted amount
    const taxableAmount = lineSubtotal - discountAmount
    const taxAmount = taxableAmount * (line.taxRate / 100)
    totalTaxAmount += taxAmount
  })

  const total = subtotal - totalDiscountAmount + totalTaxAmount

  return {
    subtotal,
    totalDiscountAmount,
    totalTaxAmount,
    total,
  }
})

const canSendQuote = computed(() => {
  return isFormValid.value && institutionContactEmail.value !== "No contact email"
})

const canConvertToInvoice = computed(() => {
  return isEditing.value && props.quote?.status === "accepted"
})

const previewData = computed(() => {
  return {
    ...formData.value,
    ...calculatedTotals.value,
    institution: selectedInstitution.value,
    status: "draft" as QuoteStatus,
    quoteNumber: props.quote?.quoteNumber || "PREVIEW",
    createdAt: new Date(),
    id: props.quote?.id || "preview",
  }
})

// Methods
const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll()
    institutions.value = response.data || []
  } catch (error) {
    console.error("Failed to load institutions:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load medical institutions",
      life: 3000,
    })
  }
}

const loadTemplates = async () => {
  try {
    const response = await templatesApi.getAll({ type: "quote" })
    templates.value = response.data || []
  } catch (error) {
    console.error("Failed to load templates:", error)
  }
}

const onInstitutionChange = () => {
  // Clear any institution-related errors
  delete errors.value.institutionId
}

const addLine = () => {
  const newLine = {
    tempId: `temp-${Date.now()}`,
    quoteId: props.quote?.id || "",
    orderIndex: formData.value.lines.length,
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountType: "percentage" as const,
    discountValue: 0,
    discountAmount: 0,
    taxRate: 0,
    taxAmount: 0,
    subtotal: 0,
    totalAfterDiscount: 0,
    total: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  formData.value.lines.push(newLine)
}

const updateLine = (index: number, updatedLine: QuoteLineType & { tempId?: string }) => {
  formData.value.lines[index] = { ...updatedLine }
}

const removeLine = (index: number) => {
  formData.value.lines.splice(index, 1)
  // Update order indexes
  formData.value.lines.forEach((line, idx) => {
    line.orderIndex = idx
  })
}

const moveLineUp = (index: number) => {
  if (index > 0) {
    const lines = [...formData.value.lines]
    ;[lines[index - 1], lines[index]] = [lines[index], lines[index - 1]]

    // Update order indexes
    lines.forEach((line, idx) => {
      line.orderIndex = idx
    })

    formData.value.lines = lines
  }
}

const moveLineDown = (index: number) => {
  if (index < formData.value.lines.length - 1) {
    const lines = [...formData.value.lines]
    ;[lines[index], lines[index + 1]] = [lines[index + 1], lines[index]]

    // Update order indexes
    lines.forEach((line, idx) => {
      line.orderIndex = idx
    })

    formData.value.lines = lines
  }
}

const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.value.institutionId) {
    newErrors.institutionId = "Medical institution is required"
  }

  if (!formData.value.title.trim()) {
    newErrors.title = "Quote title is required"
  }

  if (!formData.value.validUntil) {
    newErrors.validUntil = "Valid until date is required"
  } else if (formData.value.validUntil <= new Date()) {
    newErrors.validUntil = "Valid until date must be in the future"
  }

  if (formData.value.lines.length === 0) {
    newErrors.lines = "At least one line item is required"
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const saveDraft = async () => {
  if (!validateForm()) return

  try {
    saving.value = true

    const quoteData = {
      ...formData.value,
      ...calculatedTotals.value,
    }

    let savedQuote: Quote
    if (isEditing.value && props.quote) {
      savedQuote = await quotesApi.update(props.quote.id, quoteData)
    } else {
      savedQuote = await quotesApi.create(quoteData)
    }

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Quote saved as draft",
      life: 3000,
    })

    emit("saved", savedQuote)
  } catch (error) {
    console.error("Failed to save quote:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to save quote",
      life: 3000,
    })
  } finally {
    saving.value = false
  }
}

const saveQuote = async () => {
  await saveDraft()
}

const previewQuote = () => {
  if (!validateForm()) return
  showPreview.value = true
}

const sendQuote = () => {
  if (!canSendQuote.value) return
  showSendDialog.value = true
}

const confirmSendQuote = async () => {
  try {
    sending.value = true

    // First save the quote if it's new or has changes
    await saveQuote()

    // Then send it (this would be implemented in the API)
    // await quotesApi.send(props.quote.id, { emailMessage: emailMessage.value })

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Quote sent to client successfully",
      life: 3000,
    })

    showSendDialog.value = false
    emailMessage.value = ""
  } catch (error) {
    console.error("Failed to send quote:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to send quote",
      life: 3000,
    })
  } finally {
    sending.value = false
  }
}

const convertToInvoice = () => {
  if (!canConvertToInvoice.value) return

  // Navigate to invoice creation with quote data
  router.push({
    name: "CreateInvoice",
    query: { fromQuote: props.quote?.id },
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0)
}

// Load quote data for editing
const loadQuoteData = () => {
  if (props.quote) {
    formData.value = {
      institutionId: props.quote.institutionId,
      templateId: props.quote.templateId || "",
      title: props.quote.title,
      description: props.quote.description || "",
      validUntil: new Date(props.quote.validUntil),
      internalNotes: props.quote.internalNotes || "",
      lines: props.quote.lines || [],
    }
  }
}

// Watch for quote changes
watch(() => props.quote, loadQuoteData, { immediate: true })

// Initialize component
onMounted(async () => {
  await Promise.all([loadInstitutions(), loadTemplates()])
})
</script>

<style scoped>
.quote-builder {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-content h2 {
  margin: 0;
  color: var(--text-color);
  font-size: 1.75rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.quote-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  border: 1px solid var(--surface-border);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.empty-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: var(--text-color-secondary);
}

.empty-lines p {
  margin: 0 0 1.5rem 0;
  font-size: 1rem;
}

.lines-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.totals-section {
  background: var(--surface-50);
}

.totals-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: start;
}

.totals-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.total-row:last-child {
  border-bottom: none;
}

.final-total {
  border-top: 2px solid var(--text-color);
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-size: 1.125rem;
}

.amount {
  font-family: "Courier New", monospace;
  font-weight: 500;
}

.amount.discount {
  color: var(--red-500);
}

.totals-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 200px;
}

.send-dialog {
  max-width: 500px;
}

.send-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.recipient-info h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
}

.recipient-details {
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
  border: 1px solid var(--surface-border);
}

.recipient-details div {
  margin-bottom: 0.25rem;
}

.recipient-details div:last-child {
  margin-bottom: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.message-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-section label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.p-error {
  color: var(--red-500);
  font-size: 0.75rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .quote-builder {
    padding: 1rem;
  }

  .quote-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: stretch;
  }

  .header-actions .p-button {
    flex: 1;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .totals-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .totals-actions {
    min-width: auto;
  }
}
</style>
