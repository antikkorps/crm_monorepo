<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="isEditing ? 'Edit Invoice' : 'Create Invoice'"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="invoice-form-dialog"
    :style="{ width: '90vw', maxWidth: '1200px' }"
  >
    <form @submit.prevent="handleSubmit" class="invoice-form">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Basic Information</h3>
        <div class="form-grid">
          <div class="field">
            <label for="institution">Institution *</label>
            <Dropdown
              id="institution"
              v-model="form.institutionId"
              :options="institutions"
              option-label="name"
              option-value="id"
              placeholder="Select Institution"
              filter
              :class="{ 'p-invalid': errors.institutionId }"
              :disabled="isEditing"
            />
            <small v-if="errors.institutionId" class="p-error">{{
              errors.institutionId
            }}</small>
          </div>

          <div class="field">
            <label for="template">Document Template</label>
            <Dropdown
              id="template"
              v-model="form.templateId"
              :options="templates"
              option-label="name"
              option-value="id"
              placeholder="Select Template (Optional)"
              show-clear
            />
          </div>

          <div class="field">
            <label for="title">Title *</label>
            <InputText
              id="title"
              v-model="form.title"
              placeholder="Enter invoice title"
              :class="{ 'p-invalid': errors.title }"
            />
            <small v-if="errors.title" class="p-error">{{ errors.title }}</small>
          </div>

          <div class="field">
            <label for="due-date">Due Date *</label>
            <Calendar
              id="due-date"
              v-model="form.dueDate"
              placeholder="Select due date"
              :min-date="new Date()"
              :class="{ 'p-invalid': errors.dueDate }"
            />
            <small v-if="errors.dueDate" class="p-error">{{ errors.dueDate }}</small>
          </div>
        </div>

        <div class="field">
          <label for="description">Description</label>
          <Textarea
            id="description"
            v-model="form.description"
            placeholder="Enter invoice description"
            rows="3"
          />
        </div>
      </div>

      <!-- Invoice Lines -->
      <div class="form-section">
        <div class="section-header">
          <h3>Invoice Lines</h3>
          <Button
            type="button"
            icon="pi pi-plus"
            label="Add Line"
            class="p-button-outlined p-button-sm"
            @click="addLine"
          />
        </div>

        <div v-if="form.lines.length === 0" class="empty-lines">
          <p>No lines added yet. Click "Add Line" to get started.</p>
        </div>

        <div v-else class="lines-container">
          <div v-for="(line, index) in form.lines" :key="line.tempId" class="line-item">
            <div class="line-header">
              <span class="line-number">Line {{ index + 1 }}</span>
              <Button
                type="button"
                icon="pi pi-trash"
                class="p-button-text p-button-sm p-button-danger"
                @click="removeLine(index)"
                v-tooltip="'Remove Line'"
              />
            </div>

            <div class="line-form">
              <div class="line-grid">
                <div class="field">
                  <label>Description *</label>
                  <InputText
                    v-model="line.description"
                    placeholder="Enter description"
                    :class="{ 'p-invalid': lineErrors[index]?.description }"
                  />
                  <small v-if="lineErrors[index]?.description" class="p-error">
                    {{ lineErrors[index].description }}
                  </small>
                </div>

                <div class="field">
                  <label>Quantity *</label>
                  <InputNumber
                    v-model="line.quantity"
                    :min="0.01"
                    :max-fraction-digits="2"
                    placeholder="0.00"
                    :class="{ 'p-invalid': lineErrors[index]?.quantity }"
                    @input="calculateLineTotal(line)"
                  />
                  <small v-if="lineErrors[index]?.quantity" class="p-error">
                    {{ lineErrors[index].quantity }}
                  </small>
                </div>

                <div class="field">
                  <label>Unit Price *</label>
                  <InputNumber
                    v-model="line.unitPrice"
                    mode="currency"
                    currency="USD"
                    :min="0"
                    :max-fraction-digits="2"
                    placeholder="$0.00"
                    :class="{ 'p-invalid': lineErrors[index]?.unitPrice }"
                    @input="calculateLineTotal(line)"
                  />
                  <small v-if="lineErrors[index]?.unitPrice" class="p-error">
                    {{ lineErrors[index].unitPrice }}
                  </small>
                </div>

                <div class="field">
                  <label>Discount Type</label>
                  <Dropdown
                    v-model="line.discountType"
                    :options="discountTypes"
                    option-label="label"
                    option-value="value"
                    placeholder="No Discount"
                    show-clear
                    @change="calculateLineTotal(line)"
                  />
                </div>

                <div class="field">
                  <label>Discount Value</label>
                  <InputNumber
                    v-model="line.discountValue"
                    :mode="line.discountType === 'percentage' ? 'decimal' : 'currency'"
                    :currency="line.discountType === 'fixed_amount' ? 'USD' : undefined"
                    :suffix="line.discountType === 'percentage' ? '%' : undefined"
                    :min="0"
                    :max="line.discountType === 'percentage' ? 100 : undefined"
                    :max-fraction-digits="2"
                    placeholder="0.00"
                    :disabled="!line.discountType"
                    @input="calculateLineTotal(line)"
                  />
                </div>

                <div class="field">
                  <label>Tax Rate (%)</label>
                  <InputNumber
                    v-model="line.taxRate"
                    :min="0"
                    :max="100"
                    :max-fraction-digits="2"
                    suffix="%"
                    placeholder="0.00%"
                    @input="calculateLineTotal(line)"
                  />
                </div>
              </div>

              <div class="line-totals">
                <div class="total-item">
                  <span>Subtotal:</span>
                  <span>${{ formatCurrency(line.subtotal || 0) }}</span>
                </div>
                <div v-if="line.discountAmount > 0" class="total-item">
                  <span>Discount:</span>
                  <span class="discount"
                    >-${{ formatCurrency(line.discountAmount || 0) }}</span
                  >
                </div>
                <div v-if="line.taxAmount > 0" class="total-item">
                  <span>Tax:</span>
                  <span>${{ formatCurrency(line.taxAmount || 0) }}</span>
                </div>
                <div class="total-item line-total">
                  <span>Line Total:</span>
                  <span>${{ formatCurrency(line.total || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Invoice Totals -->
      <div v-if="form.lines.length > 0" class="form-section">
        <h3>Invoice Totals</h3>
        <div class="invoice-totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${{ formatCurrency(invoiceTotals.subtotal) }}</span>
          </div>
          <div v-if="invoiceTotals.totalDiscountAmount > 0" class="total-row">
            <span>Total Discount:</span>
            <span class="discount"
              >-${{ formatCurrency(invoiceTotals.totalDiscountAmount) }}</span
            >
          </div>
          <div v-if="invoiceTotals.totalTaxAmount > 0" class="total-row">
            <span>Total Tax:</span>
            <span>${{ formatCurrency(invoiceTotals.totalTaxAmount) }}</span>
          </div>
          <div class="total-row final-total">
            <span>Total Amount:</span>
            <span>${{ formatCurrency(invoiceTotals.total) }}</span>
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="Cancel"
          icon="pi pi-times"
          class="p-button-text"
          @click="closeDialog"
        />
        <Button
          :label="isEditing ? 'Update Invoice' : 'Create Invoice'"
          icon="pi pi-check"
          class="p-button-primary"
          @click="handleSubmit"
          :loading="submitting"
          :disabled="!isFormValid"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { institutionsApi, invoicesApi, templatesApi } from "@/services/api"
import type {
  Invoice,
  InvoiceCreateRequest,
  InvoiceLineCreateRequest,
} from "@medical-crm/shared"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref, watch } from "vue"

interface Props {
  visible: boolean
  invoice?: Invoice | null
}

interface Emits {
  (e: "update:visible", value: boolean): void
  (e: "invoice-created", invoice: Invoice): void
  (e: "invoice-updated", invoice: Invoice): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const toast = useToast()

// Dialog visibility
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit("update:visible", value),
})

// Form state
const isEditing = computed(() => !!props.invoice)
const submitting = ref(false)

// Form data
const form = ref<InvoiceCreateRequest>({
  institutionId: "",
  templateId: undefined,
  title: "",
  description: "",
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  lines: [],
})

// Line interface with temporary ID for tracking
interface InvoiceLineForm extends InvoiceLineCreateRequest {
  tempId: string
  subtotal?: number
  discountAmount?: number
  taxAmount?: number
  total?: number
}

// Options
const institutions = ref<any[]>([])
const templates = ref<any[]>([])

const discountTypes = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed Amount", value: "fixed_amount" },
]

// Validation
const errors = ref<Record<string, string>>({})
const lineErrors = ref<Record<number, Record<string, string>>>({})

// Computed
const invoiceTotals = computed(() => {
  const lines = form.value.lines as InvoiceLineForm[]
  return {
    subtotal: lines.reduce((sum, line) => sum + (line.subtotal || 0), 0),
    totalDiscountAmount: lines.reduce((sum, line) => sum + (line.discountAmount || 0), 0),
    totalTaxAmount: lines.reduce((sum, line) => sum + (line.taxAmount || 0), 0),
    total: lines.reduce((sum, line) => sum + (line.total || 0), 0),
  }
})

const isFormValid = computed(() => {
  return (
    form.value.institutionId &&
    form.value.title &&
    form.value.dueDate &&
    form.value.lines.length > 0 &&
    Object.keys(errors.value).length === 0 &&
    Object.keys(lineErrors.value).length === 0
  )
})

// Methods
const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll()
    if (response.success) {
      institutions.value = response.data
    }
  } catch (error) {
    console.error("Error loading institutions:", error)
  }
}

const loadTemplates = async () => {
  try {
    const response = await templatesApi.getAll({ type: "invoice" })
    if (response.success) {
      templates.value = response.data
    }
  } catch (error) {
    console.error("Error loading templates:", error)
  }
}

const addLine = () => {
  const newLine: InvoiceLineForm = {
    tempId: `temp_${Date.now()}_${Math.random()}`,
    description: "",
    quantity: 1,
    unitPrice: 0,
    discountType: undefined,
    discountValue: 0,
    taxRate: 0,
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    total: 0,
  }

  form.value.lines.push(newLine)
}

const removeLine = (index: number) => {
  form.value.lines.splice(index, 1)
  // Clean up line errors for this index
  delete lineErrors.value[index]
  // Reindex remaining line errors
  const newLineErrors: Record<number, Record<string, string>> = {}
  Object.entries(lineErrors.value).forEach(([key, value]) => {
    const keyNum = parseInt(key)
    if (keyNum > index) {
      newLineErrors[keyNum - 1] = value
    } else if (keyNum < index) {
      newLineErrors[keyNum] = value
    }
  })
  lineErrors.value = newLineErrors
}

const calculateLineTotal = (line: InvoiceLineForm) => {
  if (!line.quantity || !line.unitPrice) {
    line.subtotal = 0
    line.discountAmount = 0
    line.taxAmount = 0
    line.total = 0
    return
  }

  // Calculate subtotal
  line.subtotal = line.quantity * line.unitPrice

  // Calculate discount
  line.discountAmount = 0
  if (line.discountType && line.discountValue) {
    if (line.discountType === "percentage") {
      line.discountAmount = line.subtotal * (line.discountValue / 100)
    } else if (line.discountType === "fixed_amount") {
      line.discountAmount = Math.min(line.discountValue, line.subtotal)
    }
  }

  // Calculate tax on discounted amount
  const taxableAmount = line.subtotal - line.discountAmount
  line.taxAmount = line.taxRate ? taxableAmount * (line.taxRate / 100) : 0

  // Calculate total
  line.total = taxableAmount + line.taxAmount
}

const validateForm = () => {
  errors.value = {}
  lineErrors.value = {}

  // Basic validation
  if (!form.value.institutionId) {
    errors.value.institutionId = "Institution is required"
  }
  if (!form.value.title) {
    errors.value.title = "Title is required"
  }
  if (!form.value.dueDate) {
    errors.value.dueDate = "Due date is required"
  }

  // Line validation
  form.value.lines.forEach((line, index) => {
    const lineError: Record<string, string> = {}

    if (!line.description) {
      lineError.description = "Description is required"
    }
    if (!line.quantity || line.quantity <= 0) {
      lineError.quantity = "Quantity must be greater than 0"
    }
    if (line.unitPrice === undefined || line.unitPrice < 0) {
      lineError.unitPrice = "Unit price must be 0 or greater"
    }

    if (Object.keys(lineError).length > 0) {
      lineErrors.value[index] = lineError
    }
  })

  return (
    Object.keys(errors.value).length === 0 && Object.keys(lineErrors.value).length === 0
  )
}

const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    submitting.value = true

    // Prepare lines data (remove temporary fields)
    const linesData = form.value.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue || 0,
      taxRate: line.taxRate || 0,
    }))

    const invoiceData = {
      ...form.value,
      lines: linesData,
    }

    let response
    if (isEditing.value && props.invoice) {
      response = await invoicesApi.update(props.invoice.id, invoiceData)
      if (response.success) {
        emit("invoice-updated", response.data)
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Invoice updated successfully",
          life: 3000,
        })
      }
    } else {
      response = await invoicesApi.create(invoiceData)
      if (response.success) {
        emit("invoice-created", response.data)
        toast.add({
          severity: "success",
          summary: "Success",
          detail: "Invoice created successfully",
          life: 3000,
        })
      }
    }

    closeDialog()
  } catch (error) {
    console.error("Error saving invoice:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: isEditing.value ? "Failed to update invoice" : "Failed to create invoice",
      life: 3000,
    })
  } finally {
    submitting.value = false
  }
}

const closeDialog = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  form.value = {
    institutionId: "",
    templateId: undefined,
    title: "",
    description: "",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    lines: [],
  }
  errors.value = {}
  lineErrors.value = {}
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Watch for invoice prop changes (editing mode)
watch(
  () => props.invoice,
  (invoice) => {
    if (invoice && props.visible) {
      form.value = {
        institutionId: invoice.institutionId,
        templateId: invoice.templateId,
        title: invoice.title,
        description: invoice.description || "",
        dueDate: new Date(invoice.dueDate),
        lines:
          invoice.lines?.map((line) => ({
            ...line,
            tempId: `existing_${line.id}`,
            subtotal: line.subtotal,
            discountAmount: line.discountAmount,
            taxAmount: line.taxAmount,
            total: line.total,
          })) || [],
      }
    }
  },
  { immediate: true }
)

// Watch for dialog visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible && !isEditing.value) {
      resetForm()
    }
  }
)

// Lifecycle
onMounted(() => {
  loadInstitutions()
  loadTemplates()
})
</script>

<style scoped>
.invoice-form-dialog {
  max-height: 90vh;
}

.invoice-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1.5rem;
  background: var(--surface-ground);
}

.form-section h3 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1.125rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
}

.field label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  margin: 0;
}

.empty-lines {
  text-align: center;
  padding: 2rem;
  color: var(--text-color-secondary);
  background: var(--surface-card);
  border: 2px dashed var(--surface-border);
  border-radius: 6px;
}

.lines-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.line-item {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-card);
  overflow: hidden;
}

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--surface-100);
  border-bottom: 1px solid var(--surface-border);
}

.line-number {
  font-weight: 600;
  color: var(--text-color);
}

.line-form {
  padding: 1rem;
}

.line-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.line-totals {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: var(--surface-50);
  border-radius: 4px;
  border: 1px solid var(--surface-border);
}

.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.total-item.line-total {
  font-weight: 600;
  font-size: 1rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--surface-border);
  margin-top: 0.25rem;
}

.discount {
  color: var(--red-500);
}

.invoice-totals {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .line-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
}
</style>
