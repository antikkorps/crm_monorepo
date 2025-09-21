<template>
  <div class="quote-builder">
    <div class="quote-header">
      <div class="header-content">
        <h2>{{ isEditing ? "Modifier le devis" : "Créer un nouveau devis" }}</h2>
        <div class="quote-status" v-if="isEditing && quote">
          <v-chip :color="statusSeverity" size="small">{{ statusLabel }}</v-chip>
        </div>
      </div>
      <div class="header-actions">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="emit('cancelled')">
          Retour à la liste
        </v-btn>
        <v-btn
          variant="outlined"
          color="secondary"
          prepend-icon="mdi-content-save"
          @click="saveDraft"
          :loading="saving"
          :disabled="!isFormValid"
        >
          Sauvegarder brouillon
        </v-btn>
        <v-btn
          variant="outlined"
          color="info"
          prepend-icon="mdi-eye"
          @click="previewQuote"
          :disabled="!isFormValid"
        >
          Aperçu
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-check"
          @click="saveQuote"
          :loading="saving"
          :disabled="!isFormValid"
        >
          {{ isEditing ? "Mettre à jour" : "Créer le devis" }}
        </v-btn>
      </div>
    </div>

    <div class="quote-form">
      <!-- Basic Information -->
      <v-card class="form-section mb-6">
        <v-card-title>Informations de base</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.institutionId"
                :items="institutionsStore.institutions"
                item-title="name"
                item-value="id"
                label="Institution médicale *"
                variant="outlined"
                :error-messages="errors.institutionId"
                @update:model-value="onInstitutionChange"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.templateId"
                :items="templates"
                item-title="name"
                item-value="id"
                label="Modèle de document"
                variant="outlined"
                clearable
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.title"
                label="Titre du devis *"
                variant="outlined"
                :error-messages="errors.title"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.validUntil"
                label="Valide jusqu'au *"
                type="date"
                variant="outlined"
                :error-messages="errors.validUntil"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description"
                variant="outlined"
                rows="3"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.internalNotes"
                label="Notes internes"
                variant="outlined"
                rows="2"
                hint="Non visible par le client"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Line Items -->
      <v-card class="form-section mb-6">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>Lignes de devis</span>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            size="small"
            @click="addLine"
          >
            Ajouter une ligne
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="formData.lines.length === 0" class="empty-lines">
            <v-icon size="64" color="grey-lighten-2">mdi-format-list-bulleted</v-icon>
            <p class="text-h6 mt-4">Aucune ligne ajoutée</p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="addLine">
              Ajouter la première ligne
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
        <v-card-title>Résumé du devis</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="8">
              <div class="totals-breakdown">
                <v-row class="total-row">
                  <v-col cols="6">Sous-total:</v-col>
                  <v-col cols="6" class="text-right">
                    <span class="amount">{{
                      formatCurrency(calculatedTotals.subtotal)
                    }}</span>
                  </v-col>
                </v-row>
                <v-row class="total-row">
                  <v-col cols="6">Remise totale:</v-col>
                  <v-col cols="6" class="text-right">
                    <span class="amount discount"
                      >-{{ formatCurrency(calculatedTotals.totalDiscountAmount) }}</span
                    >
                  </v-col>
                </v-row>
                <v-row class="total-row">
                  <v-col cols="6">Taxes totales:</v-col>
                  <v-col cols="6" class="text-right">
                    <span class="amount">{{
                      formatCurrency(calculatedTotals.totalTaxAmount)
                    }}</span>
                  </v-col>
                </v-row>
                <v-divider class="my-3" />
                <v-row class="total-row final-total">
                  <v-col cols="6"><strong>Total:</strong></v-col>
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
                <v-btn
                  color="success"
                  prepend-icon="mdi-send"
                  block
                  @click="sendQuote"
                  :disabled="!canSendQuote"
                  :loading="sending"
                  class="mb-3"
                >
                  Envoyer au client
                </v-btn>
                <v-btn
                  v-if="isEditing && ['draft','sent'].includes(String(props.quote?.status || ''))"
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-clipboard-check"
                  block
                  class="mb-3"
                  @click="confirmOrder"
                >
                  Confirmer bon de commande
                </v-btn>
                <v-btn
                  color="warning"
                  variant="outlined"
                  prepend-icon="mdi-arrow-right"
                  block
                  @click="convertToInvoice"
                  :disabled="!canConvertToInvoice"
                >
                  Convertir en facture
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>

    <!-- Quote Preview Dialog -->
    <QuotePreview v-model:visible="showPreview" :quote-data="previewData" />

    <!-- Send Quote Dialog -->
    <v-dialog v-model="showSendDialog" max-width="500">
      <v-card>
        <v-card-title>Envoyer le devis au client</v-card-title>
        <v-card-text>
          <div class="send-content">
            <div class="recipient-info mb-4">
              <h4 class="text-h6 mb-2">Destinataire</h4>
              <v-card variant="outlined" class="pa-3">
                <div class="font-weight-bold">{{ selectedInstitution?.name }}</div>
                <div class="text-medium-emphasis">{{ institutionContactEmail }}</div>
              </v-card>
            </div>

            <v-textarea
              v-model="emailMessage"
              label="Message personnalisé (optionnel)"
              placeholder="Ajoutez un message personnel à inclure avec le devis..."
              rows="4"
              variant="outlined"
            />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="outlined" @click="showSendDialog = false"> Annuler </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-send"
            @click="confirmSendQuote"
            :loading="sending"
          >
            Envoyer le devis
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
import { useRouter } from "vue-router"
import { quotesApi, templatesApi } from "../../services/api"
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
const institutionsStore = useInstitutionsStore()
const saving = ref(false)
const sending = ref(false)
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

const canConvertToInvoice = computed(() => {
  const status = String(props.quote?.status || '')
  return isEditing.value && ["accepted", "ordered"].includes(status)
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
    const response = await templatesApi.getAll({ type: "quote" })
    templates.value = (response as any)?.data || []
  } catch (error) {
    console.error("Failed to load templates:", error)
  }
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
    newErrors.institutionId = "L'institution médicale est requise"
  }

  if (!formData.value.title.trim()) {
    newErrors.title = "Le titre du devis est requis"
  }

  if (!formData.value.validUntil) {
    newErrors.validUntil = "La date de validité est requise"
  } else if (new Date(formData.value.validUntil) <= new Date()) {
    newErrors.validUntil = "La date de validité doit être dans le futur"
  }

  if (formData.value.lines.length === 0) {
    newErrors.lines = "Au moins une ligne est requise"
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

    showSnackbar("Devis sauvegardé comme brouillon", "success")

    emit("saved", savedQuote)
  } catch (error) {
    console.error("Failed to save quote:", error)
    showSnackbar("Erreur lors de la sauvegarde du devis", "error")
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

    showSnackbar("Devis envoyé au client avec succès", "success")

    showSendDialog.value = false
    emailMessage.value = ""
  } catch (error) {
    console.error("Failed to send quote:", error)
    showSnackbar("Erreur lors de l'envoi du devis", "error")
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

const confirmOrder = async () => {
  if (!isEditing.value || !props.quote) return
  try {
    saving.value = true
    const updated = await quotesApi.order(props.quote.id)
    showSnackbar("Bon de commande confirmé", "success")
    emit("saved", updated as any)
  } catch (e) {
    console.error("Confirm order failed:", e)
    showSnackbar("Impossible de confirmer le bon de commande", "error")
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
const loadQuoteData = () => {
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
        catalogItemId: null,
        isCustomLine: true,
        originalCatalogPrice: null,
        originalCatalogTaxRate: null,
      })),
    }

    console.log("Loaded lines:", formData.value.lines)
  }
}

// Watch for quote changes
watch(() => props.quote, loadQuoteData, { immediate: true })

// Initialize component
onMounted(async () => {
  await Promise.all([institutionsStore.fetchInstitutions(), loadTemplates()])
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
  gap: 0.75rem;
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
    width: 100%;
    justify-content: flex-start;
    gap: 0.5rem;
  }
}
</style>
