<template>
  <v-card class="invoice-line" :class="{ 'has-error': hasErrors }" variant="outlined">
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
              <v-tooltip activator="parent" location="top">Déplacer vers le haut</v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-arrow-down"
              variant="text"
              size="small"
              @click="$emit('move-down', index)"
              :disabled="isLast"
            >
              <v-icon>mdi-arrow-down</v-icon>
              <v-tooltip activator="parent" location="top">Déplacer vers le bas</v-tooltip>
            </v-btn>
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="$emit('remove', index)"
            >
              <v-icon>mdi-delete</v-icon>
              <v-tooltip activator="parent" location="top">Supprimer la ligne</v-tooltip>
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
                :readonly="!isCustomLine && selectedCatalogItem"
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
              <span>Remise</span>
              <div class="discount-toggle">
                <v-switch
                  v-model="hasDiscount"
                  @update:model-value="toggleDiscount"
                  label="Appliquer une remise"
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
                    label="Type de remise"
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
                    :max="localLine.discountType === 'percentage' ? 100 : undefined"
                    step="0.01"
                    :suffix="localLine.discountType === 'percentage' ? '%' : '€'"
                    @input="updateLine"
                  />
                </v-col>

                <v-col cols="12" md="4">
                  <v-text-field
                    :model-value="`-${formatCurrency(calculatedValues.discountAmount)}`"
                    label="Montant de remise"
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
            <v-card-title>Taxes et total</v-card-title>
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
import type { InvoiceLine as InvoiceLineType } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { type CatalogItem } from "@/stores/catalog"
import CatalogItemSelector from "./CatalogItemSelector.vue"

interface Props {
  line: InvoiceLineType & { tempId?: string }
  index: number
  isLast?: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  update: [index: number, line: InvoiceLineType & { tempId?: string }]
  remove: [index: number]
  "move-up": [index: number]
  "move-down": [index: number]
}>()

// Local state
const localLine = ref<InvoiceLineType & { tempId?: string }>({ ...props.line })
const hasDiscount = ref((props.line.discountValue || 0) > 0)
const errors = ref<Record<string, string>>({})

// Catalog integration
const selectedCatalogItem = ref<string | null>(null)
const isCustomLine = ref(true)
const originalCatalogPrice = ref<number | null>(null)
const originalCatalogTaxRate = ref<number | null>(null)

// Discount type options
const discountTypeOptions = [
  { label: "Pourcentage (%)", value: "percentage" },
  { label: "Montant fixe (€)", value: "fixed_amount" },
]

// Computed properties
const discountValueLabel = computed(() => {
  return localLine.value.discountType === "percentage"
    ? "Pourcentage de remise"
    : "Montant de remise"
})

const calculatedValues = computed(() => {
  const quantity = localLine.value.quantity || 0
  const unitPrice = localLine.value.unitPrice || 0
  const subtotal = quantity * unitPrice

  // Calculate discount
  let discountAmount = 0
  if (hasDiscount.value && (localLine.value.discountValue || 0) > 0) {
    if (localLine.value.discountType === "percentage") {
      discountAmount = subtotal * ((localLine.value.discountValue || 0) / 100)
    } else if (localLine.value.discountType === "fixed_amount") {
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
    originalCatalogPrice.value = null
    originalCatalogTaxRate.value = null
    return
  }

  // Populate line with catalog item data
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
    newErrors.description = "La description est requise"
  }

  if (!localLine.value.quantity || localLine.value.quantity <= 0) {
    newErrors.quantity = "La quantité doit être supérieure à 0"
  }

  if (localLine.value.unitPrice < 0) {
    newErrors.unitPrice = "Le prix unitaire ne peut pas être négatif"
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
    hasDiscount.value = (newLine.discountValue || 0) > 0
  },
  { deep: true }
)

// Initial validation
validateLine()
</script>

<style scoped>
.invoice-line {
  transition: all 0.2s ease;
}

.invoice-line.has-error {
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