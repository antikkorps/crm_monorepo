<template>
  <v-dialog v-model="dialogVisible" max-width="600px">
    <v-card>
      <v-card-title class="text-h5">{{ t('billing.paymentForm.title') }}</v-card-title>
      <v-card-text v-if="invoice">
        <div class="mb-4 pa-4 border rounded">
          <h4 class="text-subtitle-1 font-weight-medium">{{ t('billing.paymentForm.invoiceDetails') }}</h4>
          <v-row dense class="mt-2 text-body-2">
            <v-col cols="12" sm="6"><strong>{{ t('billing.paymentForm.invoiceNumber') }}</strong> {{ invoice.invoiceNumber }}</v-col>
            <v-col cols="12" sm="6"><strong>{{ t('billing.paymentForm.institution') }}</strong> {{ invoice.institution?.name }}</v-col>
            <v-col cols="12" sm="6"><strong>{{ t('billing.paymentForm.totalAmount') }}</strong> {{ formatCurrency(invoice.total) }}</v-col>
            <v-col cols="12" sm="6"><strong>{{ t('billing.paymentForm.remainingAmount') }}</strong> <span class="font-weight-bold text-warning">{{ formatCurrency(invoice.remainingAmount) }}</span></v-col>
          </v-row>
        </div>

        <v-form @submit.prevent="handleSubmit">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="form.amount"
                :label="t('billing.paymentForm.amount') + ' *'"
                type="number"
                :max="invoice.remainingAmount"
                :error-messages="errors.amount"
                prefix="€"
                :hint="t('billing.paymentForm.amountHint', { amount: formatCurrency(invoice.remainingAmount) })"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.paymentDate"
                :label="t('billing.paymentForm.paymentDate') + ' *'"
                type="date"
                :error-messages="errors.paymentDate"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.paymentMethod"
                :items="paymentMethods"
                :label="t('billing.paymentForm.paymentMethod') + ' *'"
                :error-messages="errors.paymentMethod"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.reference"
                :label="t('billing.paymentForm.reference')"
                :hint="t('billing.paymentForm.referenceHint')"
                persistent-hint
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                :label="t('billing.paymentForm.notes')"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialog">{{ t('billing.paymentForm.cancel') }}</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!isFormValid" @click="handleSubmit">{{ t('billing.paymentForm.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { invoicesApi } from "@/services/api"
import type { Invoice, PaymentCreateRequest } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const props = defineProps<{ visible: boolean, invoice?: Invoice | null }>()
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void
  (e: "payment-recorded", payment: any): void
  (e: "notify", payload: { message: string, color: string }): void
}>()

const dialogVisible = computed({ get: () => props.visible, set: (value) => emit("update:visible", value) })

const submitting = ref(false)
const form = ref<Omit<PaymentCreateRequest, "invoiceId">>({ amount: 0, paymentDate: new Date().toISOString().split('T')[0] as any, paymentMethod: "bank_transfer" as any, reference: "", notes: "" })
const errors = ref<Record<string, string>>({})

const paymentMethods = computed(() => [
  { title: t("billing.paymentForm.methods.bankTransfer"), value: "bank_transfer" },
  { title: t("billing.paymentForm.methods.check"), value: "check" },
  { title: t("billing.paymentForm.methods.cash"), value: "cash" },
  { title: t("billing.paymentForm.methods.creditCard"), value: "credit_card" },
  { title: t("billing.paymentForm.methods.other"), value: "other" },
])

const isFormValid = computed(() => form.value.amount > 0 && form.value.paymentDate && form.value.paymentMethod && Object.keys(errors.value).length === 0)

const validateForm = () => {
  errors.value = {}
  if (!form.value.amount || form.value.amount <= 0) errors.value.amount = t('billing.paymentForm.amountRequired')
  else if (props.invoice && form.value.amount > props.invoice.remainingAmount) errors.value.amount = t('billing.paymentForm.amountExceedsRemaining')
  if (!form.value.paymentDate) errors.value.paymentDate = t('billing.paymentForm.paymentDateRequired')
  if (!form.value.paymentMethod) errors.value.paymentMethod = t('billing.paymentForm.paymentMethodRequired')
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm() || !props.invoice) return
  submitting.value = true
  try {
    const paymentData: PaymentCreateRequest = { ...form.value, invoiceId: props.invoice.id }
    const response = await invoicesApi.payments.create(props.invoice.id, paymentData)
    emit("payment-recorded", (response as any).data)
    emit("notify", { message: t('billing.paymentForm.messages.success'), color: "success" })
    closeDialog()
  } catch (error: any) {
    console.error("Payment creation error:", error)
    const errorMessage = error?.message || error?.response?.data?.error?.message || t('billing.paymentForm.messages.error')
    emit("notify", { message: errorMessage, color: "error" })
  } finally {
    submitting.value = false
  }
}

const closeDialog = () => { dialogVisible.value = false }

const resetForm = () => {
  form.value = {
    amount: 0, // Ne pas pré-remplir le montant pour permettre les paiements partiels
    paymentDate: new Date().toISOString().split('T')[0] as any,
    paymentMethod: "bank_transfer" as any,
    reference: "",
    notes: "",
  }
  errors.value = {}
}

const formatCurrency = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount || 0)

watch(() => props.visible, (visible) => { if (visible) resetForm() })
watch(form, () => { if (Object.keys(errors.value).length > 0) validateForm() }, { deep: true })
</script>