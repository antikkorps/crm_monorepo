<template>
  <v-dialog
    v-model="dialogVisible"
    max-width="1200px"
    @update:model-value="closeDialog"
  >
    <v-card>
      <v-card-title class="text-h5">{{ isEditing ? 'Modifier la facture' : 'Créer une facture' }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleSubmit">
          <v-row dense>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="form.institutionId"
                :items="institutions"
                item-title="name"
                item-value="id"
                label="Institution *"
                :error-messages="errors.institutionId"
                :disabled="isEditing"
                :loading="loadingInstitutions"
                @update:search="onInstitutionSearch"
                no-filter
                clearable
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.title"
                label="Titre *"
                :error-messages="errors.title"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.dueDate"
                label="Date d'échéance *"
                type="date"
                :error-messages="errors.dueDate"
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.description"
                label="Description"
                rows="3"
              />
            </v-col>
          </v-row>

          <v-divider class="my-4"></v-divider>

          <div class="d-flex justify-space-between align-center mb-4">
            <h3 class="text-h6">Lignes de facturation</h3>
            <v-btn size="small" prepend-icon="mdi-plus" @click="addLine">Ajouter une ligne</v-btn>
          </div>

          <div v-if="form.lines.length === 0" class="text-center text-medium-emphasis py-4">Aucune ligne ajoutée.</div>

          <div v-else class="lines-container">
            <QuoteLine
              v-for="(line, index) in form.lines"
              :key="(line as any).tempId || (line as any).id"
              :line="line as any"
              :index="index"
              :is-last="index === form.lines.length - 1"
              @update="updateLine"
              @remove="removeLine"
              @move-up="moveLineUp"
              @move-down="moveLineDown"
            />
          </div>

          <div v-if="form.lines.length > 0" class="d-flex justify-end mt-4">
            <div style="width: 300px">
              <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Sous-total</span><span>{{ formatCurrency(invoiceTotals.subtotal) }}</span></div>
              <div class="d-flex justify-space-between"><span class="text-medium-emphasis">Remise totale</span><span class="text-error">-{{ formatCurrency(invoiceTotals.totalDiscountAmount) }}</span></div>
              <div class="d-flex justify-space-between"><span class="text-medium-emphasis">TVA</span><span>{{ formatCurrency(invoiceTotals.totalTaxAmount) }}</span></div>
              <v-divider class="my-2"></v-divider>
              <div class="d-flex justify-space-between font-weight-bold text-h6"><span>Total</span><span>{{ formatCurrency(invoiceTotals.total) }}</span></div>
            </div>
          </div>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialog">Annuler</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!isFormValid" @click="handleSubmit">{{ isEditing ? 'Mettre à jour' : 'Créer' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { institutionsApi, invoicesApi } from "@/services/api"
import type { Invoice, InvoiceCreateRequest, InvoiceLineCreateRequest } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { createInvoiceLineDefaults, calculateTotals, type LineWithCatalog } from "@/utils/billing"
import QuoteLine from "./QuoteLine.vue"

const props = defineProps<{ visible: boolean, invoice?: Invoice | null }>()
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void
  (e: "invoice-created", invoice: Invoice): void
  (e: "invoice-updated", invoice: Invoice): void
  (e: "notify", payload: { message: string, color: string }): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
})

const isEditing = computed(() => !!props.invoice)
const submitting = ref(false)

const form = ref<InvoiceCreateRequest>({ institutionId: "", title: "", dueDate: new Date().toISOString().split('T')[0] as any, lines: [] })
type InvoiceLineForm = LineWithCatalog<InvoiceLineCreateRequest & {
  id?: string
  invoiceId?: string
  orderIndex?: number
  discountType?: string
  discountValue?: number
  discountAmount?: number
  taxAmount?: number
  subtotal?: number
  totalAfterDiscount?: number
  total?: number
  createdAt?: Date
  updatedAt?: Date
}>

const institutions = ref<any[]>([])
const errors = ref<Record<string, string>>({})
const lineErrors = ref<Record<number, Record<string, string>>>({})
const loadingInstitutions = ref(false)

const invoiceTotals = computed(() => {
  return calculateTotals(form.value.lines)
})

const isFormValid = computed(() => form.value.institutionId && form.value.title && form.value.dueDate && form.value.lines.length > 0 && Object.keys(errors.value).length === 0 && Object.keys(lineErrors.value).length === 0)

const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll()
    const data = (response as any).data
    institutions.value = data?.institutions || data || []
  } catch (error) { console.error("Error loading institutions:", error) }
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

      institutions.value = institutionsArray
    } catch (error) {
      console.error("Error searching institutions:", error)
      institutions.value = []
    } finally {
      loadingInstitutions.value = false
    }
  }, 300) // 300ms debounce
}

const addLine = () => {
  const newLine = {
    ...createInvoiceLineDefaults({
      invoiceId: props.invoice?.id || "",
      orderIndex: form.value.lines.length,
      taxRate: 20, // Default tax rate
    }),
    tempId: `temp_${Date.now()}_${Math.random()}`
  } as InvoiceLineForm

  form.value.lines.push(newLine as any)
}

const updateLine = (index: number, updatedLine: InvoiceLineForm) => {
  form.value.lines[index] = { ...updatedLine }
}

const removeLine = (index: number) => {
  form.value.lines.splice(index, 1)
  // Update order indexes
  form.value.lines.forEach((line, idx) => {
    (line as any).orderIndex = idx
  })
}

const moveLineUp = (index: number) => {
  if (index > 0) {
    const lines = [...form.value.lines]
    ;[lines[index - 1], lines[index]] = [lines[index], lines[index - 1]]

    // Update order indexes
    lines.forEach((line, idx) => {
      (line as any).orderIndex = idx
    })

    form.value.lines = lines
  }
}

const moveLineDown = (index: number) => {
  if (index < form.value.lines.length - 1) {
    const lines = [...form.value.lines]
    ;[lines[index], lines[index + 1]] = [lines[index + 1], lines[index]]

    // Update order indexes
    lines.forEach((line, idx) => {
      (line as any).orderIndex = idx
    })

    form.value.lines = lines
  }
}


const validateForm = () => {
  errors.value = {}
  lineErrors.value = {}
  if (!form.value.institutionId) errors.value.institutionId = "Institution requise"
  if (!form.value.title) errors.value.title = "Titre requis"
  if (!form.value.dueDate) errors.value.dueDate = "Date d'échéance requise"
  form.value.lines.forEach((line, index) => {
    const lineError: Record<string, string> = {}
    if (!line.description) lineError.description = "Description requise"
    if (!line.quantity || line.quantity <= 0) lineError.quantity = "Qté > 0"
    if (line.unitPrice === undefined || line.unitPrice < 0) lineError.unitPrice = "Prix ≥ 0"
    if (Object.keys(lineError).length > 0) lineErrors.value[index] = lineError
  })
  return Object.keys(errors.value).length === 0 && Object.keys(lineErrors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return
  submitting.value = true
  try {
    const invoiceData = { ...form.value }
    if (isEditing.value && props.invoice) {
      const response = await invoicesApi.update(props.invoice.id, invoiceData)
      emit("invoice-updated", (response as any).data)
      emit("notify", { message: "Facture mise à jour avec succès", color: "success" })
    } else {
      const response = await invoicesApi.create(invoiceData)
      emit("invoice-created", (response as any).data)
      emit("notify", { message: "Facture créée avec succès", color: "success" })
    }
    closeDialog()
  } catch (error) {
    emit("notify", { message: isEditing.value ? "Erreur lors de la mise à jour" : "Erreur lors de la création", color: "error" })
  } finally {
    submitting.value = false
  }
}

const closeDialog = () => { dialogVisible.value = false }

const resetForm = () => {
  form.value = {
    institutionId: "",
    title: "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as any,
    lines: [],
  }
  errors.value = {}
  lineErrors.value = {}
}

const formatCurrency = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount || 0)

watch(() => props.invoice, (invoice) => {
  if (invoice) {
    form.value = {
      ...invoice,
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0] as any,
      lines: invoice.lines?.map(line => ({ ...line, tempId: `id_${line.id}` })) || [],
    }
  } else {
    resetForm()
  }
}, { immediate: true })

onMounted(loadInstitutions)
</script>

<style scoped>
.lines-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.line-item {
  background-color: #f9f9f9;
}
</style>