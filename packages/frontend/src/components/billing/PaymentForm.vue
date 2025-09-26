<template>
  <v-dialog v-model="dialogVisible" max-width="600px">
    <v-card>
      <v-card-title class="text-h5">Enregistrer un paiement</v-card-title>
      <v-card-text v-if="invoice">
        <div class="mb-4 pa-4 border rounded">
          <h4 class="text-subtitle-1 font-weight-medium">Détails de la facture</h4>
          <v-row dense class="mt-2 text-body-2">
            <v-col cols="12" sm="6"><strong>N° de facture:</strong> {{ invoice.invoiceNumber }}</v-col>
            <v-col cols="12" sm="6"><strong>Institution:</strong> {{ invoice.institution?.name }}</v-col>
            <v-col cols="12" sm="6"><strong>Montant Total:</strong> {{ formatCurrency(invoice.total) }}</v-col>
            <v-col cols="12" sm="6"><strong>Montant Restant:</strong> <span class="font-weight-bold text-warning">{{ formatCurrency(invoice.remainingAmount) }}</span></v-col>
          </v-row>
        </div>

        <v-form @submit.prevent="handleSubmit">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="form.amount"
                label="Montant du paiement *"
                type="number"
                :max="invoice.remainingAmount"
                :error-messages="errors.amount"
                prefix="€"
                :hint="`Montant restant: ${formatCurrency(invoice.remainingAmount)}. Vous pouvez saisir un montant partiel.`"
                persistent-hint
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.paymentDate"
                label="Date du paiement *"
                type="date"
                :error-messages="errors.paymentDate"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model="form.paymentMethod"
                :items="paymentMethods"
                label="Moyen de paiement *"
                :error-messages="errors.paymentMethod"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model="form.reference"
                label="Référence"
                hint="N° de chèque, ID de transaction, etc."
                persistent-hint
              />
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="form.notes"
                label="Notes"
                rows="3"
              />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialog">Annuler</v-btn>
        <v-btn color="primary" :loading="submitting" :disabled="!isFormValid" @click="handleSubmit">Enregistrer</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { invoicesApi } from "@/services/api"
import type { Invoice, PaymentCreateRequest } from "@medical-crm/shared"
import { computed, ref, watch } from "vue"

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

const paymentMethods = [
  { title: "Virement bancaire", value: "bank_transfer" },
  { title: "Chèque", value: "check" },
  { title: "Espèces", value: "cash" },
  { title: "Carte de crédit", value: "credit_card" },
  { title: "Autre", value: "other" },
]

const isFormValid = computed(() => form.value.amount > 0 && form.value.paymentDate && form.value.paymentMethod && Object.keys(errors.value).length === 0)

const validateForm = () => {
  errors.value = {}
  if (!form.value.amount || form.value.amount <= 0) errors.value.amount = "Le montant doit être positif"
  else if (props.invoice && form.value.amount > props.invoice.remainingAmount) errors.value.amount = "Le montant ne peut pas dépasser le solde restant"
  if (!form.value.paymentDate) errors.value.paymentDate = "Date requise"
  if (!form.value.paymentMethod) errors.value.paymentMethod = "Moyen de paiement requis"
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  if (!validateForm() || !props.invoice) return
  submitting.value = true
  try {
    const paymentData: PaymentCreateRequest = { ...form.value, invoiceId: props.invoice.id }
    const response = await invoicesApi.payments.create(props.invoice.id, paymentData)
    emit("payment-recorded", (response as any).data)
    emit("notify", { message: "Paiement enregistré avec succès", color: "success" })
    closeDialog()
  } catch (error: any) {
    console.error("Payment creation error:", error)
    const errorMessage = error?.message || error?.response?.data?.error?.message || "Erreur lors de l'enregistrement du paiement"
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