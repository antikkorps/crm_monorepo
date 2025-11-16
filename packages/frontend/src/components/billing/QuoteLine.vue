<template>
  <v-card class="quote-line" :class="{ 'has-error': hasErrors }" variant="outlined">
    <v-card-text>
      <div class="line-content">
        <!-- Line Header -->
        <div class="line-header">
          <div class="line-number">
            <v-chip color="grey" size="small">{{ index + 1 }}</v-chip>
          </div>
          <div class="line-actions">
            <v-btn
              icon="mdi-arrow-up"
              variant="text"
              size="small"
              @click="$emit('move-up', index)"
              :disabled="index === 0"
            >
              <v-icon>mdi-arrow-up</v-icon>
              <v-tooltip activator="parent" location="top">{{ t('billing.quoteBuilder.moveUp') }}</v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-arrow-down"
              variant="text"
              size="small"
              @click="$emit('move-down', index)"
              :disabled="isLast"
            >
              <v-icon>mdi-arrow-down</v-icon>
              <v-tooltip activator="parent" location="top">{{ t('billing.quoteBuilder.moveDown') }}</v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="$emit('remove', index)"
            >
              <v-icon>mdi-delete</v-icon>
              <v-tooltip activator="parent" location="top">{{ t('billing.quoteBuilder.removeLine') }}</v-tooltip>
            </v-btn>
          </div>
        </div>

        <!-- Line Form -->
        <div class="line-form">
          <!-- Catalog Item Selection -->
          <v-row class="mb-3">
            <v-col cols="12">
              <CatalogItemSelector
                v-model="selectedCatalogItem"
                v-model:custom-line="isCustomLine"
                @item-selected="onCatalogItemSelect"
              />
            </v-col>
          </v-row>

          <!-- Description -->
          <v-row class="mb-3">
            <v-col cols="12">
              <v-text-field
                v-model="localLine.description"
                label="Description *"
                variant="outlined"
                :error-messages="errors.description"
                @input="updateLine"
                :readonly="!isCustomLine && !!selectedCatalogItem"
              />
            </v-col>
          </v-row>

          <!-- Quantity and Unit Price -->
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="localLine.quantity"
                label="Quantité *"
                type="number"
                variant="outlined"
                :min="0"
                step="0.01"
                :error-messages="errors.quantity"
                @input="updateLine"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model="localLine.unitPrice"
                label="Prix unitaire *"
                type="number"
                variant="outlined"
                :min="0"
                step="0.01"
                :error-messages="errors.unitPrice"
                @input="updateLine"
              >
                <template #append-inner>
                  <v-tooltip v-if="originalCatalogPrice && originalCatalogPrice !== localLine.unitPrice" location="top">
                    <template #activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon="mdi-restore"
                        size="x-small"
                        variant="text"
                        @click="resetToOriginalPrice"
                        color="primary"
                      />
                    </template>
                    <span>Prix catalogue: {{ formatCurrency(originalCatalogPrice) }}</span>
                  </v-tooltip>
                </template>
              </v-text-field>
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                :model-value="formatCurrency(calculatedValues.subtotal)"
                label="Sous-total"
                variant="outlined"
                readonly
                class="calculated-field"
              />
            </v-col>
          </v-row>

          <!-- Discount Section -->
          <v-card class="discount-section mt-4" variant="outlined">
            <v-card-title class="d-flex justify-space-between align-center">
              <span>{{ t('billing.catalogSelector.discount') }}</span>
              <div class="discount-toggle">
                <v-switch
                  :model-value="hasDiscount"
                  @update:model-value="toggleDiscount"
                  :label="t('billing.quoteBuilder.applyDiscount')"
                  hide-details
                />
              </div>
            </v-card-title>

            <v-card-text v-if="hasDiscount">
              <v-row>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="localLine.discountType"
                    :items="discountTypeOptions"
                    item-title="label"
                    item-value="value"
                    :label="t('billing.quoteBuilder.discountType')"
                    variant="outlined"
                    @update:model-value="updateLine"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="localLine.discountValue"
                    :label="discountValueLabel"
                    type="number"
                    variant="outlined"
                    :min="0"
                    :max="localLine.discountType === DiscountType.PERCENTAGE ? 100 : undefined"
                    step="0.01"
                    :suffix="localLine.discountType === DiscountType.PERCENTAGE ? '%' : '€'"
                    @input="updateLine"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="`-${formatCurrency(calculatedValues.discountAmount)}`"
                    :label="t('billing.quoteBuilder.discountAmount')"
                    variant="outlined"
                    readonly
                    class="calculated-field discount-amount"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Tax Section -->
          <v-card class="tax-section mt-4" variant="outlined">
            <v-card-title>{{ t('billing.quoteBuilder.taxesAndTotal') }}</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="localLine.taxRate"
                    label="Taux de taxe (%)"
                    type="number"
                    variant="outlined"
                    :min="0"
                    :max="100"
                    step="0.01"
                    suffix="%"
                    @input="updateLine"
                  >
                    <template #append-inner>
                      <v-tooltip v-if="originalCatalogTaxRate && originalCatalogTaxRate !== localLine.taxRate" location="top">
                        <template #activator="{ props }">
                          <v-btn
                            v-bind="props"
                            icon="mdi-restore"
                            size="x-small"
                            variant="text"
                            @click="resetToOriginalTaxRate"
                            color="primary"
                          />
                        </template>
                        <span>Taux catalogue: {{ originalCatalogTaxRate }}%</span>
                      </v-tooltip>
                    </template>
                  </v-text-field>
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="formatCurrency(calculatedValues.taxAmount)"
                    label="Montant de taxe"
                    variant="outlined"
                    readonly
                    class="calculated-field"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="formatCurrency(calculatedValues.total)"
                    label="Total de la ligne"
                    variant="outlined"
                    readonly
                    class="calculated-field line-total"
                  />
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { QuoteLine as QuoteLineType } from "@medical-crm/shared"
import { DiscountType } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { type CatalogItem } from "@/stores/catalog"
import CatalogItemSelector from "./CatalogItemSelector.vue"

interface Props {
  line: QuoteLineType & { tempId?: string }
  index: number
  isLast?: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()

// Emits
const emit = defineEmits<{
  update: [index: number, line: QuoteLineType & { tempId?: string }]
  remove: [index: number]
  "move-up": [index: number]
  "move-down": [index: number]
}>()

// Local state
const localLine = ref<QuoteLineType & { tempId?: string }>({ ...props.line })
// Track if discount section is open (independent of value)
const hasDiscount = ref(
  // Consider discount section open if there's an actual discount value > 0 OR if it was explicitly enabled
  (props.line.discountValue !== undefined &&
   props.line.discountValue !== null &&
   props.line.discountValue > 0 &&
   props.line.discountType !== undefined) ||
  // Or if we have the field indicating discount was enabled (for new implementation)
  (props.line as any).hasDiscountEnabled === true
)
const errors = ref<Record<string, string>>({})

// Catalog integration
const selectedCatalogItem = ref<string | null>((props.line as any).catalogItemId || null)
const isCustomLine = ref(!(props.line as any).catalogItemId)
const originalCatalogPrice = ref<number | null>((props.line as any).originalCatalogPrice || null)
const originalCatalogTaxRate = ref<number | null>((props.line as any).originalCatalogTaxRate || null)

// Discount type options
const discountTypeOptions = computed(() => [
  { label: t('billing.quoteBuilder.discountTypePercentage'), value: DiscountType.PERCENTAGE },
  { label: t('billing.quoteBuilder.discountTypeFixed'), value: DiscountType.FIXED_AMOUNT },
])

// Computed properties
const discountValueLabel = computed(() => {
  return localLine.value.discountType === DiscountType.PERCENTAGE
    ? t('billing.quoteBuilder.discountPercentage')
    : t('billing.quoteBuilder.discountAmount')
})

const calculatedValues = computed(() => {
  const quantity = localLine.value.quantity || 0
  const unitPrice = localLine.value.unitPrice || 0
  const subtotal = quantity * unitPrice

  // Calculate discount
  let discountAmount = 0
  if (hasDiscount.value && (localLine.value.discountValue || 0) > 0) {
    if (localLine.value.discountType === DiscountType.PERCENTAGE) {
      discountAmount = subtotal * ((localLine.value.discountValue || 0) / 100)
    } else if (localLine.value.discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = Math.min((localLine.value.discountValue || 0), subtotal) // Can't discount more than subtotal
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

// Catalog methods
const onCatalogItemSelect = (item: CatalogItem | null) => {
  if (!item) {
    // Clear selection
    (localLine.value as any).catalogItemId = null
    originalCatalogPrice.value = null
    originalCatalogTaxRate.value = null
    return
  }

  // Populate line with catalog item data
  ;(localLine.value as any).catalogItemId = item.id
  localLine.value.description = item.name + (item.description ? ` - ${item.description}` : '')
  localLine.value.unitPrice = item.unitPrice
  localLine.value.taxRate = item.taxRate

  // Store original values for reset functionality
  originalCatalogPrice.value = item.unitPrice
  originalCatalogTaxRate.value = item.taxRate

  updateLine()
}

const resetToOriginalPrice = () => {
  if (originalCatalogPrice.value !== null) {
    localLine.value.unitPrice = originalCatalogPrice.value
    updateLine()
  }
}

const resetToOriginalTaxRate = () => {
  if (originalCatalogTaxRate.value !== null) {
    localLine.value.taxRate = originalCatalogTaxRate.value
    updateLine()
  }
}

// Methods
const validateLine = () => {
  const newErrors: Record<string, string> = {}

  if (!localLine.value.description?.trim()) {
    newErrors.description = t('billing.quoteBuilder.validation.descriptionRequired')
  }

  if (!localLine.value.quantity || localLine.value.quantity <= 0) {
    newErrors.quantity = t('billing.quoteBuilder.validation.quantityRequired')
  }

  if (localLine.value.unitPrice < 0) {
    newErrors.unitPrice = t('billing.quoteBuilder.validation.priceNegative')
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

const toggleDiscount = (value: boolean | null) => {
  console.log('toggleDiscount called with:', value)
  const booleanValue = Boolean(value)
  hasDiscount.value = booleanValue

  // Store the enabled state in the line object
  ;(localLine.value as any).hasDiscountEnabled = booleanValue

  if (!booleanValue) {
    // Reset discount values when disabled
    localLine.value.discountType = DiscountType.PERCENTAGE
    localLine.value.discountValue = 0
    localLine.value.discountAmount = 0
  } else {
    // When enabling discount, set a default value if none exists
    if (!localLine.value.discountValue || localLine.value.discountValue === 0) {
      localLine.value.discountValue = 10 // Default 10%
    }
    // Ensure discount type is set
    if (!localLine.value.discountType) {
      localLine.value.discountType = DiscountType.PERCENTAGE
    }
  }
  updateLine()
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0)
}

// Watch for prop changes
watch(
  () => props.line,
  (newLine) => {
    localLine.value = { ...newLine }
    hasDiscount.value =
      // Consider discount section open if there's an actual discount value > 0 OR if it was explicitly enabled
      (newLine.discountValue !== undefined &&
       newLine.discountValue !== null &&
       newLine.discountValue > 0 &&
       newLine.discountType !== undefined) ||
      // Or if we have the field indicating discount was enabled
      (newLine as any).hasDiscountEnabled === true
  },
  { deep: true }
)

// Initial validation
validateLine()
</script>

<style scoped>
.quote-line {
  transition: all 0.2s ease;
}

.quote-line.has-error {
  border-color: rgb(var(--v-theme-error));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-error));
}

.line-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.calculated-field {
  font-family: "Courier New", monospace;
  font-weight: 500;
}

.calculated-field.discount-amount {
  color: rgb(var(--v-theme-error));
}

.calculated-field.line-total {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.discount-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
}
</style>
