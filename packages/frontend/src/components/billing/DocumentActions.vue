<template>
  <div class="document-actions">
    <div class="actions-header">
      <h4>Document Actions</h4>
      <div class="template-selector" v-if="templates.length > 0">
        <label for="template-select">Template:</label>
        <Dropdown
          id="template-select"
          v-model="selectedTemplateId"
          :options="templateOptions"
          option-label="label"
          option-value="value"
          placeholder="Default Template"
          show-clear
          size="small"
        />
      </div>
    </div>

    <div class="action-buttons">
      <Button
        label="Preview PDF"
        icon="pi pi-eye"
        severity="info"
        outlined
        @click="previewPDF"
        :loading="previewing"
        :disabled="!canGenerateDocument"
      />

      <Button
        label="Download PDF"
        icon="pi pi-download"
        severity="secondary"
        @click="downloadPDF"
        :loading="downloading"
        :disabled="!canGenerateDocument"
      />

      <Button
        label="Email Document"
        icon="pi pi-send"
        severity="success"
        @click="emailDocument"
        :loading="emailing"
        :disabled="!canEmailDocument"
      />

      <Button
        v-if="documentType === 'invoice' && canSendReminder"
        label="Payment Reminder"
        icon="pi pi-bell"
        severity="warning"
        outlined
        @click="sendPaymentReminder"
        :loading="sendingReminder"
      />
    </div>

    <!-- Email Dialog -->
    <Dialog
      v-model:visible="showEmailDialog"
      header="Email Document"
      :modal="true"
      class="email-dialog"
    >
      <div class="email-content">
        <div class="document-info">
          <h5>Document Details</h5>
          <div class="info-row">
            <span
              ><strong>Type:</strong>
              {{ documentType.charAt(0).toUpperCase() + documentType.slice(1) }}</span
            >
          </div>
          <div class="info-row">
            <span><strong>Number:</strong> {{ documentNumber }}</span>
          </div>
          <div v-if="selectedTemplate" class="info-row">
            <span><strong>Template:</strong> {{ selectedTemplate.name }}</span>
          </div>
        </div>

        <div class="recipient-section">
          <label for="email-recipients">Recipients *</label>
          <Chips
            id="email-recipients"
            v-model="emailRecipients"
            placeholder="Enter email addresses"
            :class="{ 'p-invalid': emailErrors.recipients }"
          />
          <small v-if="emailErrors.recipients" class="p-error">{{
            emailErrors.recipients
          }}</small>
          <small v-if="suggestedEmail" class="suggested-email">
            Suggested:
            <Button
              :label="suggestedEmail"
              link
              size="small"
              @click="addSuggestedEmail"
            />
          </small>
        </div>

        <div class="message-section">
          <label for="email-message">Custom Message (Optional)</label>
          <Textarea
            id="email-message"
            v-model="emailMessage"
            :placeholder="defaultEmailMessage"
            rows="4"
          />
        </div>

        <div class="email-options">
          <div class="option-row">
            <Checkbox id="attach-pdf" v-model="attachPDF" binary />
            <label for="attach-pdf">Attach PDF document</label>
          </div>
          <div class="option-row">
            <Checkbox id="send-copy" v-model="sendCopyToSelf" binary />
            <label for="send-copy">Send copy to myself</label>
          </div>
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" outlined @click="closeEmailDialog" />
        <Button
          label="Send Email"
          icon="pi pi-send"
          @click="confirmEmailDocument"
          :loading="emailing"
          :disabled="!isEmailFormValid"
        />
      </template>
    </Dialog>

    <!-- Payment Reminder Dialog -->
    <Dialog
      v-model:visible="showReminderDialog"
      header="Send Payment Reminder"
      :modal="true"
      class="reminder-dialog"
    >
      <div class="reminder-content">
        <div class="reminder-info">
          <div class="info-row">
            <i class="pi pi-exclamation-triangle warning-icon"></i>
            <div>
              <strong>Overdue Invoice</strong>
              <p>This invoice is {{ daysOverdue }} days overdue.</p>
            </div>
          </div>
          <div class="amount-info">
            <span
              ><strong>Outstanding Amount:</strong>
              {{ formatCurrency(outstandingAmount) }}</span
            >
          </div>
        </div>

        <div class="message-section">
          <label for="reminder-message">Custom Message (Optional)</label>
          <Textarea
            id="reminder-message"
            v-model="reminderMessage"
            placeholder="Add a personal message for the payment reminder..."
            rows="4"
          />
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="showReminderDialog = false"
        />
        <Button
          label="Send Reminder"
          icon="pi pi-send"
          severity="warning"
          @click="confirmSendReminder"
          :loading="sendingReminder"
        />
      </template>
    </Dialog>

    <!-- Toast for notifications -->
    <Toast />
  </div>
</template>

<script setup lang="ts">
import type { DocumentTemplate, Invoice, Quote } from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref, watch } from "vue"
import { documentsApi, templatesApi } from "../../services/api"

interface Props {
  documentId: string
  documentType: "quote" | "invoice"
  documentNumber: string
  document?: Quote | Invoice
  canGenerateDocument?: boolean
  canEmailDocument?: boolean
  suggestedEmail?: string
}

const props = withDefaults(defineProps<Props>(), {
  canGenerateDocument: true,
  canEmailDocument: true,
})

// Emits
const emit = defineEmits<{
  documentGenerated: [type: string]
  documentEmailed: [type: string]
}>()

// Reactive state
const templates = ref<DocumentTemplate[]>([])
const selectedTemplateId = ref<string>("")
const previewing = ref(false)
const downloading = ref(false)
const emailing = ref(false)
const sendingReminder = ref(false)

// Email dialog state
const showEmailDialog = ref(false)
const emailRecipients = ref<string[]>([])
const emailMessage = ref("")
const attachPDF = ref(true)
const sendCopyToSelf = ref(false)
const emailErrors = ref<Record<string, string>>({})

// Payment reminder dialog state
const showReminderDialog = ref(false)
const reminderMessage = ref("")

// Toast for notifications
const toast = useToast()

// Computed properties
const templateOptions = computed(() => [
  { label: "Default Template", value: "" },
  ...templates.value.map((t) => ({ label: t.name, value: t.id })),
])

const selectedTemplate = computed(() => {
  return templates.value.find((t) => t.id === selectedTemplateId.value)
})

const canSendReminder = computed(() => {
  return (
    props.documentType === "invoice" &&
    props.document &&
    "status" in props.document &&
    (props.document.status === "sent" || props.document.status === "overdue") &&
    "remainingAmount" in props.document &&
    props.document.remainingAmount > 0
  )
})

const daysOverdue = computed(() => {
  if (
    props.documentType !== "invoice" ||
    !props.document ||
    !("dueDate" in props.document)
  ) {
    return 0
  }
  const dueDate = new Date(props.document.dueDate)
  const today = new Date()
  const diffTime = today.getTime() - dueDate.getTime()
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
})

const outstandingAmount = computed(() => {
  if (
    props.documentType !== "invoice" ||
    !props.document ||
    !("remainingAmount" in props.document)
  ) {
    return 0
  }
  return props.document.remainingAmount
})

const isEmailFormValid = computed(() => {
  return (
    emailRecipients.value.length > 0 &&
    emailRecipients.value.every((email) => isValidEmail(email))
  )
})

const defaultEmailMessage = computed(() => {
  if (props.documentType === "quote") {
    return "Please find attached our quote for your review. We look forward to hearing from you."
  } else {
    return "Please find attached your invoice. Payment is due within the terms specified."
  }
})

// Methods
const loadTemplates = async () => {
  try {
    const response = await templatesApi.getAll({
      type: props.documentType === "quote" ? "quote" : "invoice",
    })
    templates.value = response.data || []
  } catch (error) {
    console.error("Failed to load templates:", error)
  }
}

const previewPDF = async () => {
  try {
    previewing.value = true

    let blob: Blob
    if (props.documentType === "quote") {
      blob = (await documentsApi.generateQuotePdf(props.documentId, {
        templateId: selectedTemplateId.value || undefined,
      })) as Blob
    } else {
      blob = (await documentsApi.generateInvoicePdf(props.documentId, {
        templateId: selectedTemplateId.value || undefined,
      })) as Blob
    }

    documentsApi.openBlobInNewTab(blob)
    emit("documentGenerated", "preview")
  } catch (error) {
    console.error("Failed to preview document:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to preview document",
      life: 3000,
    })
  } finally {
    previewing.value = false
  }
}

const downloadPDF = async () => {
  try {
    downloading.value = true

    let blob: Blob
    if (props.documentType === "quote") {
      blob = (await documentsApi.generateQuotePdf(props.documentId, {
        templateId: selectedTemplateId.value || undefined,
      })) as Blob
    } else {
      blob = (await documentsApi.generateInvoicePdf(props.documentId, {
        templateId: selectedTemplateId.value || undefined,
      })) as Blob
    }

    const filename = `${props.documentType}-${props.documentNumber}.pdf`
    documentsApi.downloadBlob(blob, filename)

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Document downloaded successfully",
      life: 3000,
    })

    emit("documentGenerated", "download")
  } catch (error) {
    console.error("Failed to download document:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to download document",
      life: 3000,
    })
  } finally {
    downloading.value = false
  }
}

const emailDocument = () => {
  emailRecipients.value = props.suggestedEmail ? [props.suggestedEmail] : []
  emailMessage.value = ""
  attachPDF.value = true
  sendCopyToSelf.value = false
  emailErrors.value = {}
  showEmailDialog.value = true
}

const confirmEmailDocument = async () => {
  if (!validateEmailForm()) return

  try {
    emailing.value = true

    let result: any
    if (props.documentType === "quote") {
      result = await documentsApi.generateQuotePdf(props.documentId, {
        templateId: selectedTemplateId.value || undefined,
        email: true,
        customMessage: emailMessage.value,
        recipients: emailRecipients.value,
      })
    } else {
      result = await documentsApi.generateInvoicePdf(props.documentId, {
        templateId: selectedTemplateId.value || undefined,
        email: true,
        customMessage: emailMessage.value,
        recipients: emailRecipients.value,
      })
    }

    if (result.data?.emailSent) {
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Document emailed successfully",
        life: 3000,
      })
      closeEmailDialog()
      emit("documentEmailed", "email")
    } else {
      toast.add({
        severity: "error",
        summary: "Email Failed",
        detail: result.data?.emailError || "Failed to send email",
        life: 5000,
      })
    }
  } catch (error) {
    console.error("Failed to email document:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to email document",
      life: 3000,
    })
  } finally {
    emailing.value = false
  }
}

const sendPaymentReminder = () => {
  reminderMessage.value = ""
  showReminderDialog.value = true
}

const confirmSendReminder = async () => {
  try {
    sendingReminder.value = true

    await documentsApi.sendPaymentReminder(props.documentId, reminderMessage.value)

    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Payment reminder sent successfully",
      life: 3000,
    })

    showReminderDialog.value = false
    reminderMessage.value = ""
  } catch (error) {
    console.error("Failed to send payment reminder:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to send payment reminder",
      life: 3000,
    })
  } finally {
    sendingReminder.value = false
  }
}

const addSuggestedEmail = () => {
  if (props.suggestedEmail && !emailRecipients.value.includes(props.suggestedEmail)) {
    emailRecipients.value.push(props.suggestedEmail)
  }
}

const validateEmailForm = () => {
  const errors: Record<string, string> = {}

  if (emailRecipients.value.length === 0) {
    errors.recipients = "At least one recipient is required"
  } else if (!emailRecipients.value.every((email) => isValidEmail(email))) {
    errors.recipients = "All email addresses must be valid"
  }

  emailErrors.value = errors
  return Object.keys(errors).length === 0
}

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const closeEmailDialog = () => {
  showEmailDialog.value = false
  emailRecipients.value = []
  emailMessage.value = ""
  attachPDF.value = true
  sendCopyToSelf.value = false
  emailErrors.value = {}
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0)
}

// Watch for document changes
watch(() => props.documentType, loadTemplates, { immediate: true })

// Load templates on mount
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.document-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.actions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.actions-header h4 {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 600;
}

.template-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.template-selector label {
  color: var(--text-color-secondary);
  white-space: nowrap;
}

.action-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
}

.email-dialog,
.reminder-dialog {
  max-width: 500px;
}

.email-content,
.reminder-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.document-info h5 {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
  font-size: 0.875rem;
}

.info-row {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.recipient-section,
.message-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recipient-section label,
.message-section label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.suggested-email {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
}

.email-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.option-row label {
  font-size: 0.875rem;
  color: var(--text-color);
  cursor: pointer;
}

.reminder-info {
  padding: 1rem;
  background: var(--orange-50);
  border: 1px solid var(--orange-200);
  border-radius: 6px;
}

.reminder-info .info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.warning-icon {
  color: var(--orange-500);
  font-size: 1.25rem;
  margin-top: 0.125rem;
}

.reminder-info strong {
  color: var(--orange-700);
}

.reminder-info p {
  margin: 0.25rem 0 0 0;
  color: var(--orange-600);
  font-size: 0.875rem;
}

.amount-info {
  font-size: 0.875rem;
  color: var(--orange-700);
}

.p-error {
  color: var(--red-500);
  font-size: 0.75rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .actions-header {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    grid-template-columns: 1fr;
  }

  .template-selector {
    justify-content: space-between;
  }
}
</style>
