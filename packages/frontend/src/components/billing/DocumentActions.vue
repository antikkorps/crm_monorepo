<template>
  <v-card elevation="2" class="document-actions-card">
    <v-card-title class="d-flex align-center justify-space-between">
      <span>Document Actions</span>
      <v-select
        v-if="templates.length > 0"
        v-model="selectedTemplateId"
        :items="templateOptions"
        item-title="label"
        item-value="value"
        label="Template"
        density="compact"
        variant="outlined"
        clearable
        hide-details
        style="max-width: 250px"
      />
    </v-card-title>

    <v-card-text class="pa-4">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-btn
            block
            variant="outlined"
            color="info"
            prepend-icon="mdi-eye"
            @click="previewPDF"
            :loading="previewing"
            :disabled="!canGenerateDocument"
          >
            Preview PDF
          </v-btn>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-btn
            block
            variant="outlined"
            prepend-icon="mdi-download"
            @click="downloadPDF"
            :loading="downloading"
            :disabled="!canGenerateDocument"
          >
            Download PDF
          </v-btn>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-btn
            block
            variant="outlined"
            color="success"
            prepend-icon="mdi-email"
            @click="emailDocument"
            :loading="emailing"
            :disabled="!canEmailDocument"
          >
            Email Document
          </v-btn>
        </v-col>

        <v-col v-if="documentType === 'invoice' && canSendReminder" cols="12" sm="6" md="3">
          <v-btn
            block
            variant="outlined"
            color="warning"
            prepend-icon="mdi-bell-alert"
            @click="sendPaymentReminder"
            :loading="sendingReminder"
          >
            Payment Reminder
          </v-btn>
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Email Dialog -->
    <v-dialog v-model="showEmailDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Email Document</span>
          <v-btn icon="mdi-close" variant="text" @click="closeEmailDialog" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-sheet color="grey-lighten-5" rounded class="pa-3 mb-4">
            <div class="text-subtitle-2 mb-2">Document Details</div>
            <div class="text-body-2">
              <strong>Type:</strong> {{ documentType.charAt(0).toUpperCase() + documentType.slice(1) }}
            </div>
            <div class="text-body-2">
              <strong>Number:</strong> {{ documentNumber }}
            </div>
            <div v-if="selectedTemplate" class="text-body-2">
              <strong>Template:</strong> {{ selectedTemplate.name }}
            </div>
          </v-sheet>

          <v-combobox
            v-model="emailRecipients"
            label="Recipients *"
            placeholder="Enter email addresses"
            multiple
            chips
            closable-chips
            :error-messages="emailErrors.recipients"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-alert v-if="suggestedEmail" type="info" density="compact" class="mb-3">
            <span class="text-caption">Suggested: </span>
            <v-btn
              :text="suggestedEmail"
              variant="text"
              size="x-small"
              @click="addSuggestedEmail"
            />
          </v-alert>

          <v-textarea
            v-model="emailMessage"
            label="Custom Message (Optional)"
            :placeholder="defaultEmailMessage"
            rows="4"
            variant="outlined"
            density="compact"
            class="mb-3"
          />

          <v-checkbox
            v-model="attachPDF"
            label="Attach PDF document"
            density="compact"
            hide-details
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="closeEmailDialog">Cancel</v-btn>
          <v-btn
            variant="elevated"
            color="success"
            prepend-icon="mdi-send"
            @click="confirmEmailDocument"
            :loading="emailing"
          >
            Send Email
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Payment Reminder Dialog -->
    <v-dialog v-model="showReminderDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Send Payment Reminder</span>
          <v-btn icon="mdi-close" variant="text" @click="showReminderDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-4">
          <v-alert type="warning" variant="tonal" class="mb-4">
            <div class="d-flex align-center">
              <v-icon start>mdi-alert</v-icon>
              <div>
                <div class="font-weight-bold">Overdue Invoice</div>
                <div class="text-body-2">This invoice is {{ daysOverdue }} days overdue.</div>
              </div>
            </div>
            <div class="mt-2">
              <strong>Outstanding Amount:</strong> {{ formatCurrency(outstandingAmount) }}
            </div>
          </v-alert>

          <v-textarea
            v-model="reminderMessage"
            label="Custom Message (Optional)"
            placeholder="Add a personal message for the payment reminder..."
            rows="4"
            variant="outlined"
            density="compact"
          />
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showReminderDialog = false">Cancel</v-btn>
          <v-btn
            variant="elevated"
            color="warning"
            prepend-icon="mdi-send"
            @click="confirmSendReminder"
            :loading="sendingReminder"
          >
            Send Reminder
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar.visible"
      :color="snackbar.color"
      :timeout="3000"
      location="top"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-card>
</template>

<script setup lang="ts">
import type { DocumentTemplate, Invoice, Quote } from "@medical-crm/shared"
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

// Reminder dialog state
const showReminderDialog = ref(false)
const reminderMessage = ref("")

// Snackbar state
const snackbar = ref({
  visible: false,
  message: "",
  color: "info"
})

// Computed
const selectedTemplate = computed(() => {
  return templates.value.find((t) => t.id === selectedTemplateId.value)
})

const templateOptions = computed(() => {
  return templates.value.map((t) => ({
    label: t.name,
    value: t.id,
  }))
})

const canSendReminder = computed(() => {
  if (props.documentType !== "invoice" || !props.document) return false
  const invoice = props.document as Invoice
  return invoice.status === "sent" && invoice.remainingAmount > 0
})

const daysOverdue = computed(() => {
  if (!props.document || props.documentType !== "invoice") return 0
  const invoice = props.document as Invoice
  return invoice.daysOverdue || 0
})

const outstandingAmount = computed(() => {
  if (!props.document || props.documentType !== "invoice") return 0
  const invoice = props.document as Invoice
  return invoice.remainingAmount || 0
})

const defaultEmailMessage = computed(() => {
  if (props.documentType === "quote") {
    return "Please find attached our quote for your review. We look forward to hearing from you."
  } else {
    return "Please find attached your invoice. Payment is due within the terms specified."
  }
})

// Methods
const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, message, color }
}

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
    showSnackbar("Failed to preview document", "error")
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

    showSnackbar("Document downloaded successfully", "success")
    emit("documentGenerated", "download")
  } catch (error) {
    console.error("Failed to download document:", error)
    showSnackbar("Failed to download document", "error")
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
      showSnackbar("Document emailed successfully", "success")
      closeEmailDialog()
      emit("documentEmailed", "email")
    } else {
      showSnackbar(result.data?.emailError || "Failed to send email", "error")
    }
  } catch (error) {
    console.error("Failed to email document:", error)
    showSnackbar("Failed to email document", "error")
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

    showSnackbar("Payment reminder sent successfully", "success")
    showReminderDialog.value = false
    reminderMessage.value = ""
  } catch (error) {
    console.error("Failed to send payment reminder:", error)
    showSnackbar("Failed to send payment reminder", "error")
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
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
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
.document-actions-card {
  width: 100%;
}
</style>
