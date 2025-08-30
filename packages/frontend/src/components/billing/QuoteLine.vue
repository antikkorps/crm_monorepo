<template>
  <Card class="quote-line" :class="{ 'has-error': hasErrors }">
    <template #content>
      <div class="line-content">
        <!-- Line Header -->
        <div class="line-header">
          <div class="line-number">
            <Badge :value="`${index + 1}`" severity="secondary" />
          </div>
          <div class="line-actions">
            <Button
              icon="pi pi-arrow-up"
              text
              rounded
              size="small"
              @click="$emit('move-up', index)"
              :disabled="index === 0"
              v-tooltip.top="'Move Up'"
            />
            <Button
              icon="pi pi-arrow-down"
              text
              rounded
              size="small"
              @click="$emit('move-down', index)"
              :disabled="isLast"
              v-tooltip.top="'Move Down'"
            />
            <Button
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              @click="$emit('remove', index)"
              v-tooltip.top="'Remove Line'"
            />
          </div>
        </div>

        <!-- Line Form -->
        <div class="line-form">
          <!-- Description -->
          <div class="form-group description-group">
            <label>Description *</label>
            <InputText
              v-model="localLine.description"
              placeholder="Enter item description"
              :class="{ 'p-invalid': errors.description }"
              @input="updateLine"
            />
            <small v-if="errors.description" class="p-error">{{
              errors.description
            }}</small>
          </div>

          <!-- Quantity and Unit Price -->
          <div class="form-row">
            <div class="form-group">
              <label>Quantity *</label>
              <InputNumber
                v-model="localLine.quantity"
                :min="0"
                :max-fraction-digits="2"
                :class="{ 'p-invalid': errors.quantity }"
                @input="updateLine"
              />
              <small v-if="errors.quantity" class="p-error">{{ errors.quantity }}</small>
            </div>

            <div class="form-group">
              <label>Unit Price *</label>
              <InputNumber
                v-model="localLine.unitPrice"
                mode="currency"
                currency="USD"
                :min="0"
                :max-fraction-digits="2"
                :class="{ 'p-invalid': errors.unitPrice }"
                @input="updateLine"
              />
              <small v-if="errors.unitPrice" class="p-error">{{
                errors.unitPrice
              }}</small>
            </div>

            <div class="form-group">
              <label>Subtotal</label>
              <div class="calculated-field">
                {{ formatCurrency(calculatedValues.subtotal) }}
              </div>
            </div>
          </div>

          <!-- Discount Section -->
          <div class="discount-section">
            <div class="discount-header">
              <h4>Discount</h4>
              <div class="discount-toggle">
                <InputSwitch v-model="hasDiscount" @change="toggleDiscount" />
                <label>Apply Discount</label>
              </div>
            </div>

            <div v-if="hasDiscount" class="discount-controls">
              <div class="form-row">
                <div class="form-group">
                  <label>Discount Type</label>
                  <Dropdown
                    v-model="localLine.discountType"
                    :options="discountTypeOptions"
                    option-label="label"
                    option-value="value"
                    @change="updateLine"
                  />
                </div>

                <div class="form-group">
                  <label>{{ discountValueLabel }}</label>
                  <InputNumber
                    v-model="localLine.discountValue"
                    :mode="
                      localLine.discountType === 'fixed_amount' ? 'currency' : 'decimal'
                    "
                    :currency="
                      localLine.discountType === 'fixed_amount' ? 'USD' : undefined
                    "
                    :suffix="localLine.discountType === 'percentage' ? '%' : undefined"
                    :min="0"
                    :max="localLine.discountType === 'percentage' ? 100 : undefined"
                    :max-fraction-digits="2"
                    @input="updateLine"
                  />
                </div>

                <div class="form-group">
                  <label>Discount Amount</label>
                  <div class="calculated-field discount-amount">
                    -{{ formatCurrency(calculatedValues.discountAmount) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Tax Section -->
          <div class="tax-section">
            <div class="form-row">
              <div class="form-group">
                <label>Tax Rate (%)</label>
                <InputNumber
                  v-model="localLine.taxRate"
                  suffix="%"
                  :min="0"
                  :max="100"
                  :max-fraction-digits="2"
                  @input="updateLine"
                />
              </div>

              <div class="form-group">
                <label>Tax Amount</label>
                <div class="calculated-field">
                  {{ formatCurrency(calculatedValues.taxAmount) }}
                </div>
              </div>

              <div class="form-group">
                <label><strong>Line Total</strong></label>
                <div class="calculated-field line-total">
                  <strong>{{ formatCurrency(calculatedValues.total) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { QuoteLine as QuoteLineType } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"

interface Props {
  line: QuoteLineType & { tempId?: string }
  index: number
  isLast?: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  update: [index: number, line: QuoteLineType & { tempId?: string }]
  remove: [index: number]
  "move-up": [index: number]
  "move-down": [index: number]
}>()

// Local state
const localLine = ref<QuoteLineType & { tempId?: string }>({ ...props.line })
const hasDiscount = ref(props.line.discountValue > 0)
const errors = ref<Record<string, string>>({})

// Discount type options
const discountTypeOptions = [
  { label: "Percentage (%)", value: "percentage" },
  { label: "Fixed Amount ($)", value: "fixed_amount" },
]

// Computed properties
const discountValueLabel = computed(() => {
  return localLine.value.discountType === "percentage"
    ? "Discount Percentage"
    : "Discount Amount"
})

const calculatedValues = computed(() => {
  const quantity = localLine.value.quantity || 0
  const unitPrice = localLine.value.unitPrice || 0
  const subtotal = quantity * unitPrice

  // Calculate discount
  let discountAmount = 0
  if (hasDiscount.value && localLine.value.discountValue > 0) {
    if (localLine.value.discountType === "percentage") {
      discountAmount = subtotal * (localLine.value.discountValue / 100)
    } else if (localLine.value.discountType === "fixed_amount") {
      discountAmount = Math.min(localLine.value.discountValue, subtotal) // Can't discount more than subtotal
    }
  }

  // Calculate tax on discounted amount
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * ((localLine.value.taxRate || 0) / 100)

  const total = subtotal - discountAmount + taxAmount

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
    totalAfterDiscount: subtotal - discountAmount,
  }
})

const hasErrors = computed(() => {
  return Object.keys(errors.value).length > 0
})

// Methods
const validateLine = () => {
  const newErrors: Record<string, string> = {}

  if (!localLine.value.description?.trim()) {
    newErrors.description = "Description is required"
  }

  if (!localLine.value.quantity || localLine.value.quantity <= 0) {
    newErrors.quantity = "Quantity must be greater than 0"
  }

  if (localLine.value.unitPrice < 0) {
    newErrors.unitPrice = "Unit price cannot be negative"
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const updateLine = () => {
  // Update calculated values
  localLine.value.subtotal = calculatedValues.value.subtotal
  localLine.value.discountAmount = calculatedValues.value.discountAmount
  localLine.value.taxAmount = calculatedValues.value.taxAmount
  localLine.value.totalAfterDiscount = calculatedValues.value.totalAfterDiscount
  localLine.value.total = calculatedValues.value.total

  // Validate and emit update
  validateLine()
  emit("update", props.index, { ...localLine.value })
}

const toggleDiscount = () => {
  if (!hasDiscount.value) {
    // Reset discount values when disabled
    localLine.value.discountType = "percentage"
    localLine.value.discountValue = 0
    localLine.value.discountAmount = 0
  }
  updateLine()
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount || 0)
}

// Watch for prop changes
watch(
  () => props.line,
  (newLine) => {
    localLine.value = { ...newLine }
    hasDiscount.value = newLine.discountValue > 0
  },
  { deep: true }
)

// Initial validation
validateLine()
</script>

<style scoped>
.quote-line {
  border: 1px solid var(--surface-border);
  transition: all 0.2s ease;
}

.quote-line.has-error {
  border-color: var(--red-500);
  box-shadow: 0 0 0 1px var(--red-500);
}

.line-content {
  padding: 0;
}

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem 0 1rem;
  margin-bottom: 1rem;
}

.line-number {
  display: flex;
  align-items: center;
}

.line-actions {
  display: flex;
  gap: 0.25rem;
}

.line-form {
  padding: 0 1rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.description-group {
  margin-bottom: 0.5rem;
}

.form-group label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.calculated-field {
  padding: 0.75rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  font-family: "Courier New", monospace;
  font-weight: 500;
  color: var(--text-color-secondary);
  text-align: right;
}

.calculated-field.discount-amount {
  color: var(--red-500);
}

.calculated-field.line-total {
  background: var(--primary-50);
  border-color: var(--primary-200);
  color: var(--primary-700);
  font-size: 1.125rem;
}

.discount-section {
  padding: 1rem;
  background: var(--surface-50);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
}

.discount-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.discount-header h4 {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
}

.discount-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.discount-toggle label {
  font-size: 0.875rem;
  color: var(--text-color);
  cursor: pointer;
}

.discount-controls {
  margin-top: 1rem;
}

.tax-section {
  padding: 1rem;
  background: var(--surface-100);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
}

.p-error {
  color: var(--red-500);
  font-size: 0.75rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .line-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .line-actions {
    justify-content: center;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .discount-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .discount-toggle {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .line-form {
    padding: 0 0.5rem 1rem 0.5rem;
  }

  .discount-section,
  .tax-section {
    padding: 0.75rem;
  }
}
</style>
