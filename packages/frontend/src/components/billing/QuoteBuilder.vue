<template>
  <div class="quote-builder">
    <div class="quote-header">
      <div class="header-content">
        <h2>{{ isEditing ? t('billing.quoteBuilder.editTitle') : t('billing.quoteBuilder.createTitle') }}</h2>
        <div class="quote-status" v-if="isEditing && quote">
          <v-chip :color="statusSeverity" size="small">{{ statusLabel }}</v-chip>
        </div>
      </div>
      <div class="header-actions">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="emit('cancelled')">
          {{ t('billing.quoteBuilder.backToList') }}
        </v-btn>
      </div>
    </div>

    <div class="quote-form">
      <!-- Basic Information -->
      <v-card class="form-section mb-6">
        <v-card-title>{{ t('billing.quoteBuilder.basicInfo') }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="formData.institutionId"
                :items="institutionOptions"
                item-title="name"
                item-value="id"
                :label="t('billing.quoteBuilder.institution') + ' *'"
                variant="outlined"
                :error-messages="errors.institutionId"
                :loading="loadingInstitutions"
                @update:model-value="onInstitutionChange"
                @update:search="onInstitutionSearch"
                no-filter
                clearable
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.templateId"
                :items="templates"
                item-title="name"
                item-value="id"
                :label="t('billing.quoteBuilder.template')"
                variant="outlined"
                clearable
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.title"
                :label="t('billing.quoteBuilder.title') + ' *'"
                variant="outlined"
                :error-messages="errors.title"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.validUntil"
                :label="t('billing.quoteBuilder.validUntil') + ' *'"
                type="date"
                variant="outlined"
                :error-messages="errors.validUntil"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                :label="t('billing.quoteBuilder.description')"
                variant="outlined"
                rows="3"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.internalNotes"
                :label="t('billing.quoteBuilder.internalNotes')"
                variant="outlined"
                rows="2"
                :hint="t('billing.quoteBuilder.internalNotesHint')"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Line Items -->
      <v-card class="form-section mb-6">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ t('billing.quoteBuilder.quoteLines') }}</span>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            size="small"
            @click="addLine"
          >
            {{ t('billing.quoteBuilder.addLine') }}
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="formData.lines.length === 0" class="empty-lines">
            <v-icon size="64" color="grey-lighten-2">mdi-format-list-bulleted</v-icon>
            <p class="text-h6 mt-4">{{ t('billing.quoteBuilder.noLines') }}</p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="addLine">
              {{ t('billing.quoteBuilder.addFirstLine') }}
            </v-btn>
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
        </v-card-text>
      </v-card>

      <!-- Totals Summary -->
      <v-card class="form-section totals-section">
        <v-card-title>{{ t('billing.quoteBuilder.summary') }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="8">
              <div class="totals-breakdown">
                <v-row class="total-row">
                  <v-col cols="6">{{ t('billing.quoteBuilder.subtotal') }}</v-col>
                  <v-col cols="6" class="text-right">
                    <span class="amount">{{
                      formatCurrency(calculatedTotals.subtotal)
                    }}</span>
                  </v-col>
                </v-row>
                <v-row class="total-row">
                  <v-col cols="6">{{ t('billing.quoteBuilder.totalDiscount') }}</v-col>
                  <v-col cols="6" class="text-right">
                    <span class="amount discount"
                      >-{{ formatCurrency(calculatedTotals.totalDiscountAmount) }}</span
                    >
                  </v-col>
                </v-row>
                <v-row class="total-row">
                  <v-col cols="6">{{ t('billing.quoteBuilder.totalTax') }}</v-col>
                  <v-col cols="6" class="text-right">
                    <span class="amount">{{
                      formatCurrency(calculatedTotals.totalTaxAmount)
                    }}</span>
                  </v-col>
                </v-row>
                <v-divider class="my-3" />
                <v-row class="total-row final-total">
                  <v-col cols="6"><strong>{{ t('billing.quoteBuilder.total') }}</strong></v-col>
                  <v-col cols="6" class="text-right">
                    <span class="amount"
                      ><strong>{{ formatCurrency(calculatedTotals.total) }}</strong></span
                    >
                  </v-col>
                </v-row>
              </div>
            </v-col>

            <v-col cols="12" md="4">
              <div class="totals-actions">
                <!-- PDF Download -->
                <v-btn
                  v-if="isEditing"
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-download"
                  block
                  class="mb-2"
                  @click="downloadQuotePdf"
                  :loading="downloading"
                >
                  {{ t('billing.quoteBuilder.actions.downloadPdf') }}
                </v-btn>

                <!-- Send to client -->
                <v-btn
                  color="success"
                  prepend-icon="mdi-send"
                  block
                  class="mb-2"
                  @click="sendQuote"
                  :disabled="!canSendQuote"
                  :loading="sending"
                >
                  {{ t('billing.quoteBuilder.actions.sendToClient') }}
                </v-btn>

                <!-- Bon de commande - only show when editing -->
                <v-tooltip
                  v-if="isEditing"
                  :text="orderButtonTooltip"
                  :disabled="canConfirmOrder"
                  location="top"
                >
                  <template #activator="{ props }">
                    <div v-bind="props">
                      <v-btn
                        color="secondary"
                        variant="tonal"
                        prepend-icon="mdi-clipboard-check"
                        block
                        class="mb-2"
                        @click="confirmOrder"
                        :disabled="!canConfirmOrder"
                        :loading="saving"
                      >
                        {{ t('billing.quoteBuilder.actions.confirmOrder') }}
                      </v-btn>
                    </div>
                  </template>
                </v-tooltip>

                <!-- Convert to Invoice - only show when editing -->
                <v-tooltip
                  v-if="isEditing"
                  :text="invoiceButtonTooltip"
                  :disabled="canConvertToInvoice"
                  location="top"
                >
                  <template #activator="{ props }">
                    <div v-bind="props">
                      <v-btn
                        color="warning"
                        prepend-icon="mdi-receipt"
                        block
                        @click="convertToInvoice"
                        :disabled="!canConvertToInvoice"
                        :loading="saving"
                      >
                        {{ t('billing.quoteBuilder.actions.convertToInvoice') }}
                      </v-btn>
                    </div>
                  </template>
                </v-tooltip>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Form Actions -->
      <v-card class="form-section form-actions-section">
        <v-card-text>
          <div class="form-actions">
            <v-btn
              variant="outlined"
              color="secondary"
              prepend-icon="mdi-content-save"
              @click="saveDraft"
              :loading="saving"
              :disabled="!isFormValid"
              size="large"
            >
              {{ t('billing.quoteBuilder.actions.saveDraft') }}
            </v-btn>
            <v-btn
              variant="outlined"
              color="info"
              prepend-icon="mdi-eye"
              @click="previewQuote"
              :disabled="!isFormValid"
              size="large"
            >
              {{ t('billing.quoteBuilder.actions.preview') }}
            </v-btn>
            <v-btn
              color="primary"
              prepend-icon="mdi-check"
              @click="saveQuote"
              :loading="saving"
              :disabled="!isFormValid"
              size="large"
            >
              {{ isEditing ? t('billing.quoteBuilder.actions.update') : t('billing.quoteBuilder.actions.create') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Quote Preview Dialog -->
    <QuotePreview v-model:visible="showPreview" :quote-data="previewData" />

    <!-- Send Quote Dialog -->
    <v-dialog v-model="showSendDialog" max-width="500">
      <v-card>
        <v-card-title>{{ t('billing.quoteBuilder.sendDialog.title') }}</v-card-title>
        <v-card-text>
          <div class="send-content">
            <div class="recipient-info mb-4">
              <h4 class="text-h6 mb-2">{{ t('billing.quoteBuilder.sendDialog.recipient') }}</h4>
              <v-card variant="outlined" class="pa-3">
                <div class="font-weight-bold">{{ selectedInstitution?.name }}</div>
                <div class="text-medium-emphasis">{{ institutionContactEmail }}</div>
              </v-card>
            </div>

            <v-textarea
              v-model="emailMessage"
              :label="t('billing.quoteBuilder.sendDialog.message')"
              :placeholder="t('billing.quoteBuilder.sendDialog.messagePlaceholder')"
              rows="4"
              variant="outlined"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showSendDialog = false">{{ t('billing.quoteBuilder.sendDialog.cancel') }}</v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-send"
            @click="confirmSendQuote"
            :loading="sending"
          >
            {{ t('billing.quoteBuilder.sendDialog.send') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { institutionsApi } from "@/services/api"
import { useInstitutionsStore } from "@/stores/institutions"
import {
  calculateTotals,
  cleanLineForSubmission,
  createQuoteLineDefaults,
} from "@/utils/billing"
import type {
  DocumentTemplate,
  Quote,
  QuoteLine as QuoteLineType,
  QuoteStatus,
} from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { quotesApi, templatesApi } from "../../services/api"
import QuoteLine from "./QuoteLine.vue"
import QuotePreview from "./QuotePreview.vue"

const { t } = useI18n()

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
const institutionsStore = useInstitutionsStore()
const saving = ref(false)
const sending = ref(false)
const downloading = ref(false)
const showPreview = ref(false)
const showSendDialog = ref(false)
const emailMessage = ref("")
const snackbar = ref({ visible: false, message: "", color: "info" })

// Form data interface for the UI (validUntil as string for HTML date input)
interface QuoteFormData {
  institutionId: string
  templateId?: string
  title: string
  description?: string
  validUntil: string
  internalNotes?: string
  lines: (QuoteLineType & {
    tempId?: string
    catalogItemId?: string | null
    isCustomLine?: boolean
    originalCatalogPrice?: number | null
    originalCatalogTaxRate?: number | null
  })[]
}

const formData = ref<QuoteFormData>({
  institutionId: "",
  templateId: "",
  title: "",
  description: "",
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days from now
  internalNotes: "",
  lines: [],
})

// Data sources
const templates = ref<DocumentTemplate[]>([])
const errors = ref<Record<string, string>>({})
const institutionOptions = ref<any[]>([])
const loadingInstitutions = ref(false)

// Computed properties
const isEditing = computed(() => !!props.quote)

const isFormValid = computed(() => {
  return (
    formData.value.institutionId &&
    formData.value.title.trim() &&
    formData.value.validUntil &&
    formData.value.lines.length > 0 &&
    formData.value.lines.every(
      (line: any) =>
        line.description &&
        line.description.trim() &&
        line.quantity > 0 &&
        line.unitPrice >= 0
    )
  )
})

const selectedInstitution = computed(() => {
  return institutionsStore.institutions.find(
    (inst) => inst.id === formData.value.institutionId
  )
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

  const statusLabels: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    ordered: "Ordered",
    accepted: "Accepted",
    rejected: "Rejected",
    expired: "Expired",
    cancelled: "Cancelled",
  }

  return statusLabels[props.quote.status] || "Unknown"
})

const statusSeverity = computed(() => {
  if (!props.quote) return "secondary"

  const severities: Record<string, string> = {
    draft: "secondary",
    sent: "info",
    ordered: "purple",
    accepted: "success",
    rejected: "danger",
    expired: "warning",
    cancelled: "secondary",
  }

  return severities[props.quote.status] || "secondary"
})

const calculatedTotals = computed(() => {
  return calculateTotals(formData.value.lines as any[])
})

const canSendQuote = computed(() => {
  return isFormValid.value && institutionContactEmail.value !== "No contact email"
})

// Bon de commande: backend allows from draft or sent status
const canConfirmOrder = computed(() => {
  const status = String(props.quote?.status || '')
  return isEditing.value && ["draft", "sent"].includes(status)
})

// Convert to Invoice: backend allows from accepted OR ordered status
const canConvertToInvoice = computed(() => {
  const status = String(props.quote?.status || '')
  return isEditing.value && ["accepted", "ordered"].includes(status)
})

// Tooltip for disabled order button
const orderButtonTooltip = computed(() => {
  const status = String(props.quote?.status || '')
  if (status === "ordered") {
    return t('billing.quoteBuilder.workflow.alreadyOrdered')
  }
  if (["accepted", "rejected", "expired", "cancelled"].includes(status)) {
    return t('billing.quoteBuilder.workflow.cannotOrder')
  }
  return ""
})

// Tooltip for disabled invoice button
const invoiceButtonTooltip = computed(() => {
  const status = String(props.quote?.status || '')
  if (!["accepted", "ordered"].includes(status)) {
    return t('billing.quoteBuilder.workflow.needAcceptedOrOrdered')
  }
  return ""
})

const previewData = computed(() => {
  return {
    ...formData.value,
    validUntil: new Date(formData.value.validUntil),
    lines: formData.value.lines as any,
    ...calculatedTotals.value,
    institution: selectedInstitution.value,
    status: "draft" as QuoteStatus,
    quoteNumber: props.quote?.quoteNumber || "PREVIEW",
    createdAt: new Date(),
    id: props.quote?.id || "preview",
  }
})

// Methods

const loadTemplates = async () => {
  try {
    // Load templates that support quotes (both 'quote' and 'both' types)
    const [quoteResponse, bothResponse] = await Promise.all([
      templatesApi.getAll({ type: "quote" }),
      templatesApi.getAll({ type: "both" }),
    ])
    const quoteTemplates = (quoteResponse as any)?.data || []
    const bothTemplates = (bothResponse as any)?.data || []
    templates.value = [...quoteTemplates, ...bothTemplates]
  } catch (error) {
    console.error("Failed to load templates:", error)
  }
}

// Load a specific template by ID (for editing existing quotes)
const loadTemplateById = async (templateId: string) => {
  if (!templateId) return

  // Check if template is already in the list
  const existingTemplate = templates.value.find(t => t.id === templateId)
  if (existingTemplate) return

  try {
    const template = await templatesApi.getById(templateId)
    if (template) {
      templates.value = [...templates.value, template as DocumentTemplate]
    }
  } catch (error) {
    console.error("Failed to load template:", error)
  }
}

const loadInstitutions = async () => {
  try {
    await institutionsStore.fetchInstitutions()
    institutionOptions.value = institutionsStore.institutions || []
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  }
}

// Load a specific institution by ID (for editing existing quotes)
const loadInstitutionById = async (institutionId: string) => {
  if (!institutionId) return

  // Check if institution is already in the list
  const existingInstitution = institutionOptions.value.find((i: any) => i.id === institutionId)
  if (existingInstitution) return

  try {
    const response = await institutionsApi.getById(institutionId)
    const institution = (response as any)?.data || response
    if (institution) {
      institutionOptions.value = [...institutionOptions.value, institution]
    }
  } catch (error) {
    console.error("Failed to load institution:", error)
  }
}

// Debounce timer for institution search
let searchDebounceTimer: NodeJS.Timeout | null = null

const onInstitutionSearch = async (search: string | null) => {
  // Clear previous timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // If search is empty or too short, load all institutions
  if (!search || search.length < 2) {
    loadingInstitutions.value = true
    await loadInstitutions()
    loadingInstitutions.value = false
    return
  }

  // Debounce search
  searchDebounceTimer = setTimeout(async () => {
    try {
      loadingInstitutions.value = true
      const response = await institutionsApi.search(search, { limit: 50 })
      const data = (response as any).data || response

      let institutionsArray: any[] = []
      if (Array.isArray(data)) {
        institutionsArray = data
      } else if (data && Array.isArray(data.institutions)) {
        institutionsArray = data.institutions
      }

      institutionOptions.value = institutionsArray
    } catch (error) {
      console.error("Error searching institutions:", error)
      institutionOptions.value = []
    } finally {
      loadingInstitutions.value = false
    }
  }, 300) // 300ms debounce
}

const onInstitutionChange = () => {
  // Clear any institution-related errors
  delete errors.value.institutionId
}

const addLine = () => {
  const newLine = createQuoteLineDefaults({
    quoteId: props.quote?.id || "",
    orderIndex: formData.value.lines.length,
  })

  formData.value.lines.push(newLine)
}

const updateLine = (index: number, updatedLine: QuoteLineType & { tempId?: string }) => {
  formData.value.lines[index] = updatedLine as any
}

const removeLine = (index: number) => {
  formData.value.lines.splice(index, 1)
  // Update order indexes
  formData.value.lines.forEach((line, idx) => {
    ;(line as any).orderIndex = idx
  })
}

const moveLineUp = (index: number) => {
  if (index > 0) {
    const lines = [...formData.value.lines]
    ;[lines[index - 1], lines[index]] = [lines[index], lines[index - 1]]

    // Update order indexes
    lines.forEach((line, idx) => {
      ;(line as any).orderIndex = idx
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
      ;(line as any).orderIndex = idx
    })

    formData.value.lines = lines
  }
}

const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.value.institutionId) {
    newErrors.institutionId = t('billing.quoteBuilder.institutionRequired')
  }

  if (!formData.value.title.trim()) {
    newErrors.title = t('billing.quoteBuilder.titleRequired')
  }

  if (!formData.value.validUntil) {
    newErrors.validUntil = t('billing.quoteBuilder.validUntilRequired')
  } else if (new Date(formData.value.validUntil) <= new Date()) {
    newErrors.validUntil = t('billing.quoteBuilder.validUntilFuture')
  }

  if (formData.value.lines.length === 0) {
    newErrors.lines = t('billing.quoteBuilder.atLeastOneLine')
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const saveDraft = async () => {
  if (!validateForm()) return

  try {
    saving.value = true

    // Clean line data for API submission
    const cleanedLines = formData.value.lines.map((line) => {
      return cleanLineForSubmission(line as any)
    })

    const quoteData = {
      institutionId: formData.value.institutionId,
      templateId: formData.value.templateId,
      title: formData.value.title,
      description: formData.value.description,
      validUntil: new Date(formData.value.validUntil),
      internalNotes: formData.value.internalNotes,
      lines: cleanedLines,
      ...calculatedTotals.value,
    }

    let savedQuote: Quote
    if (isEditing.value && props.quote) {
      savedQuote = (await quotesApi.update(props.quote.id, quoteData)) as Quote
    } else {
      savedQuote = (await quotesApi.create(quoteData)) as Quote
    }

    showSnackbar(t("billing.quoteBuilder.messages.draftSaved"), "success")

    emit("saved", savedQuote)
  } catch (error) {
    console.error("Failed to save quote:", error)
    showSnackbar(t("billing.quoteBuilder.messages.saveError"), "error")
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

const downloadQuotePdf = async () => {
  if (!isEditing.value || !props.quote) return
  try {
    downloading.value = true
    const response = await quotesApi.generatePdf(props.quote.id)

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `devis-${props.quote.quoteNumber || props.quote.id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    showSnackbar(t("billing.quoteBuilder.messages.pdfDownloaded"), "success")
  } catch (error) {
    console.error("Failed to download PDF:", error)
    showSnackbar(t("billing.quoteBuilder.messages.pdfDownloadError"), "error")
  } finally {
    downloading.value = false
  }
}

const confirmSendQuote = async () => {
  try {
    sending.value = true

    // First save the quote if it's new or has changes
    await saveQuote()

    // Then send it (this would be implemented in the API)
    // await quotesApi.send(props.quote.id, { emailMessage: emailMessage.value })

    showSnackbar(t("billing.quoteBuilder.messages.sent"), "success")

    showSendDialog.value = false
    emailMessage.value = ""
  } catch (error) {
    console.error("Failed to send quote:", error)
    showSnackbar(t("billing.quoteBuilder.messages.sendError"), "error")
  } finally {
    sending.value = false
  }
}

const convertToInvoice = async () => {
  if (!canConvertToInvoice.value || !props.quote) return

  try {
    saving.value = true
    const result = await quotesApi.convertToInvoice(props.quote.id)
    const invoice = (result as any)?.data || result
    showSnackbar(t("billing.quoteBuilder.messages.convertedToInvoice"), "success")

    // Navigate to the newly created invoice
    if (invoice?.id) {
      router.push({ name: "InvoiceDetail", params: { id: invoice.id } })
    } else {
      router.push({ name: "Invoices" })
    }
  } catch (error) {
    console.error("Failed to convert to invoice:", error)
    showSnackbar(t("billing.quoteBuilder.messages.convertToInvoiceError"), "error")
  } finally {
    saving.value = false
  }
}

const confirmOrder = async () => {
  if (!canConfirmOrder.value || !props.quote) return
  try {
    saving.value = true
    const updated = await quotesApi.order(props.quote.id)
    showSnackbar(t("billing.quoteBuilder.messages.orderConfirmed"), "success")
    emit("saved", updated as any)
  } catch (e) {
    console.error("Confirm order failed:", e)
    showSnackbar(t("billing.quoteBuilder.messages.orderConfirmError"), "error")
  } finally {
    saving.value = false
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0)
}

const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, message, color }
}

// Load quote data for editing
const loadQuoteData = async () => {
  if (props.quote) {
    console.log("Loading quote data:", props.quote)
    console.log("Quote lines:", props.quote.lines)

    formData.value = {
      institutionId: props.quote.institutionId,
      templateId: props.quote.templateId || "",
      title: props.quote.title,
      description: props.quote.description || "",
      validUntil: new Date(props.quote.validUntil).toISOString().split("T")[0],
      internalNotes: props.quote.internalNotes || "",
      lines: (props.quote.lines || []).map((line) => ({
        ...line,
        tempId: `existing-${line.id}`,
        catalogItemId: line.catalogItemId || null,
        isCustomLine: !line.catalogItemId,
        originalCatalogPrice: null,
        originalCatalogTaxRate: null,
      })),
    }

    console.log("Loaded lines:", formData.value.lines)

    // Load the specific institution and template to ensure they appear in dropdowns
    await Promise.all([
      loadInstitutionById(props.quote.institutionId),
      props.quote.templateId ? loadTemplateById(props.quote.templateId) : Promise.resolve(),
    ])
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
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-content h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.quote-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.empty-lines {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.lines-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.totals-breakdown {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.total-row {
  padding: 0.5rem 0;
}

.final-total {
  margin-top: 0.5rem;
  padding-top: 1rem;
  font-size: 1.125rem;
}

.amount {
  font-family: "Courier New", monospace;
  font-weight: 500;
}

.amount.discount {
  color: rgb(var(--v-theme-error));
}

.totals-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.totals-actions .v-btn {
  white-space: normal;
  height: auto !important;
  min-height: 40px;
  padding: 8px 16px;
}

.totals-actions .v-btn .v-btn__content {
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.2;
}

.form-actions-section {
  margin-top: 2rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Responsive design - Mobile First */
@media (max-width: 960px) {
  .quote-builder {
    padding: 0.75rem;
  }

  .quote-header {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 1rem;
  }

  .header-content h2 {
    font-size: 1.25rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    gap: 0.5rem;
  }

  /* Stack the summary section on mobile - actions first */
  .totals-section :deep(.v-row) {
    flex-direction: column-reverse;
  }

  .totals-section :deep(.v-col) {
    max-width: 100% !important;
    flex: 0 0 100% !important;
  }

  .totals-actions {
    margin-bottom: 1.5rem;
  }

  .form-actions {
    flex-direction: column;
    width: 100%;
  }

  .form-actions .v-btn {
    width: 100%;
  }

  .totals-actions .v-btn {
    font-size: 0.875rem;
    min-height: 40px;
  }

  /* Make totals more compact on mobile */
  .totals-breakdown {
    gap: 0.25rem;
  }

  .total-row {
    padding: 0.25rem 0;
  }

  .final-total {
    font-size: 1rem;
  }
}

@media (max-width: 600px) {
  .quote-builder {
    padding: 0.5rem;
  }

  .header-content h2 {
    font-size: 1.1rem;
  }

  .header-content {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
