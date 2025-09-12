<template>
  <AppLayout>
    <div class="invoice-detail-view">
      <div v-if="loading" class="text-center py-12">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Chargement de la facture...</p>
      </div>

      <div v-else-if="!invoice" class="text-center py-12">
        <v-icon size="64" color="warning">mdi-alert-circle-outline</v-icon>
        <p class="mt-4 text-h6">Facture non trouvée</p>
        <v-btn class="mt-4" @click="goBack">Retour</v-btn>
      </div>

      <div v-else class="invoice-content">
        <!-- Header -->
        <div class="d-flex flex-wrap justify-space-between align-center gap-4 mb-6">
          <div class="d-flex align-center gap-4">
            <v-btn icon="mdi-arrow-left" variant="text" @click="goBack" />
            <div>
              <h1 class="text-h4 font-weight-bold">{{ invoice.invoiceNumber }}</h1>
              <v-chip :color="getStatusColor(invoice.status)" variant="tonal" size="small">{{ getStatusLabel(invoice.status) }}</v-chip>
            </div>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <v-btn v-if="invoice.canBeModified" prepend-icon="mdi-pencil" variant="outlined" @click="editInvoice">Modifier</v-btn>
            <v-btn v-if="invoice.status === 'draft'" prepend-icon="mdi-send" color="primary" @click="sendInvoice">Envoyer</v-btn>
            <v-btn v-if="invoice.canReceivePayments" prepend-icon="mdi-currency-usd" color="success" @click="showPaymentDialog = true">Encaisser</v-btn>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="downloadPdf" prepend-icon="mdi-download">Télécharger PDF</v-list-item>
                <v-list-item @click="printInvoice" prepend-icon="mdi-printer">Imprimer</v-list-item>
                <v-divider />
                <v-list-item @click="duplicateInvoice" prepend-icon="mdi-content-copy">Dupliquer</v-list-item>
                <v-list-item @click="cancelInvoice" :disabled="!invoice.canBeModified" prepend-icon="mdi-cancel">Annuler</v-list-item>
                <v-list-item @click="deleteInvoice" :disabled="!invoice.canBeDeleted" class="text-error" prepend-icon="mdi-delete">Supprimer</v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>

        <!-- Content Grid -->
        <v-row>
          <v-col cols="12" md="8">
            <v-card class="mb-6">
              <v-card-title>Détails de la facture</v-card-title>
              <v-card-text>
                <v-list lines="two">
                  <v-list-item title="Numéro" :subtitle="invoice.invoiceNumber"></v-list-item>
                  <v-list-item title="Titre" :subtitle="invoice.title"></v-list-item>
                  <v-list-item title="Date d'échéance">
                    <template v-slot:subtitle>
                      <span :class="getDueDateClass()">{{ formatDate(invoice.dueDate) }}</span>
                    </template>
                  </v-list-item>
                  <v-list-item v-if="invoice.description" title="Description" :subtitle="invoice.description"></v-list-item>
                </v-list>
              </v-card-text>
            </v-card>

            <v-card>
              <v-card-title>Lignes de facturation</v-card-title>
              <v-data-table :headers="lineHeaders" :items="invoice.lines" hide-default-footer>
                <template #item.total="{ item }">{{ formatCurrency(item.total) }}</template>
              </v-data-table>
              <div class="d-flex justify-end pa-4">
                <div class="totals-summary">
                  <div class="d-flex justify-space-between py-1"><span class="text-medium-emphasis">Sous-total</span><span>{{ formatCurrency(invoice.subtotal) }}</span></div>
                  <div v-if="invoice.totalDiscountAmount > 0" class="d-flex justify-space-between py-1"><span class="text-medium-emphasis">Remise</span><span class="text-error">-{{ formatCurrency(invoice.totalDiscountAmount) }}</span></div>
                  <div v-if="invoice.totalTaxAmount > 0" class="d-flex justify-space-between py-1"><span class="text-medium-emphasis">Taxe</span><span>{{ formatCurrency(invoice.totalTaxAmount) }}</span></div>
                  <v-divider class="my-2"></v-divider>
                  <div class="d-flex justify-space-between font-weight-bold text-h6"><span class="">Total</span><span>{{ formatCurrency(invoice.total) }}</span></div>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card class="mb-6">
              <v-card-title>Statut du paiement</v-card-title>
              <v-card-text>
                <div class="d-flex justify-space-between text-h6">
                  <span>Payé:</span>
                  <span class="text-success">{{ formatCurrency(invoice.totalPaid) }}</span>
                </div>
                <div class="d-flex justify-space-between text-h6">
                  <span>Restant:</span>
                  <span class="font-weight-bold">{{ formatCurrency(invoice.remainingAmount) }}</span>
                </div>
                <v-progress-linear :model-value="paymentPercentage" :color="getProgressColor()" height="10" rounded class="my-4"></v-progress-linear>
                <div v-if="invoice.daysOverdue" class="text-error d-flex align-center gap-2"><v-icon>mdi-alert-circle-outline</v-icon><span>{{ invoice.daysOverdue }} jours de retard</span></div>
                <div v-else-if="invoice.daysUntilDue !== null && invoice.daysUntilDue <= 7" class="text-warning d-flex align-center gap-2"><v-icon>mdi-clock-alert-outline</v-icon><span>Échéance dans {{ invoice.daysUntilDue }} jours</span></div>
              </v-card-text>
            </v-card>
            <v-card>
              <v-list lines="one">
                <v-list-subheader>Institution</v-list-subheader>
                <v-list-item :title="invoice.institution?.name" :subtitle="invoice.institution?.type" @click="router.push(`/institutions/${invoice.institution?.id}`)"></v-list-item>
                <v-list-subheader>Assigné à</v-list-subheader>
                <v-list-item :title="`${invoice.assignedUser?.firstName} ${invoice.assignedUser?.lastName}`"></v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>

        <PaymentHistory :invoice="invoice" class="mt-6" @record-payment="showPaymentDialog = true" @payment-updated="refreshInvoice" />
      </div>

      <PaymentForm v-model:visible="showPaymentDialog" :invoice="invoice" @payment-recorded="onPaymentRecorded" @notify="({ message, color }) => showSnackbar(message, color)" />
      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">{{ snackbar.message }}</v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { PaymentForm, PaymentHistory } from "@/components/billing"
import AppLayout from "@/components/layout/AppLayout.vue"
import { invoicesApi, documentsApi } from "@/services/api"
import type { Invoice, InvoiceStatus } from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const invoice = ref<Invoice | null>(null)
const loading = ref(false)
const showPaymentDialog = ref(false)
const snackbar = ref({ visible: false, message: '', color: 'info' })

const lineHeaders = [
  { title: 'Description', value: 'description' },
  { title: 'Qté', value: 'quantity', align: 'end' },
  { title: 'Prix Unitaire', value: 'unitPrice', align: 'end' },
  { title: 'Total', value: 'total', align: 'end' },
]

const paymentPercentage = computed(() => invoice.value && invoice.value.total > 0 ? (invoice.value.totalPaid / invoice.value.total) * 100 : 0)

const loadInvoice = async () => {
  loading.value = true
  try {
    const response = await invoicesApi.getById(route.params.id as string)
    invoice.value = response.data
  } catch (error) {
    console.error("Failed to load invoice:", error)
    showSnackbar("Failed to load invoice", "error")
  } finally {
    loading.value = false
  }
}

const refreshInvoice = () => loadInvoice()
const goBack = () => router.push("/invoices")
const editInvoice = () => router.push(`/invoices/${invoice.value?.id}/edit`)

const sendInvoice = async () => {
  if (!invoice.value) return
  try {
    await invoicesApi.send(invoice.value.id)
    showSnackbar("Invoice sent successfully", "success")
    refreshInvoice()
  } catch (error) {
    showSnackbar("Failed to send invoice", "error")
  }
}

const downloadPdf = async () => {
  if (!invoice.value) return
  try {
    const blob = await documentsApi.generateInvoicePdf(invoice.value.id) as Blob
    documentsApi.downloadBlob(blob, `Invoice-${invoice.value.invoiceNumber}.pdf`)
  } catch (error) {
    showSnackbar("Failed to download PDF", "error")
  }
}

const printInvoice = async () => {
  if (!invoice.value) return
  try {
    const blob = await documentsApi.generateInvoicePdf(invoice.value.id) as Blob
    documentsApi.openBlobInNewTab(blob)
  } catch (error) {
    showSnackbar("Failed to open invoice for printing", "error")
  }
}

const onPaymentRecorded = () => {
  showPaymentDialog.value = false
  refreshInvoice()
}

const getStatusLabel = (status: InvoiceStatus) => ({ draft: "Brouillon", sent: "Envoyé", partially_paid: "Partiellement Payé", paid: "Payé", overdue: "En Retard", cancelled: "Annulé" }[status] || status)
const getStatusColor = (status: InvoiceStatus) => ({ draft: "grey", sent: "info", partially_paid: "warning", paid: "success", overdue: "error", cancelled: "secondary" }[status] || "secondary")
const getDueDateClass = () => {
  if (!invoice.value) return ''
  if (invoice.value.status === "paid") return 'text-success'
  if (invoice.value.daysOverdue && invoice.value.daysOverdue > 0) return 'text-error font-weight-bold'
  if (invoice.value.daysUntilDue !== null && invoice.value.daysUntilDue <= 7) return 'text-warning'
  return ''
}
const getProgressColor = () => {
  const percentage = paymentPercentage.value
  if (percentage >= 100) return "success"
  if (percentage >= 50) return "warning"
  return "error"
}

const formatCurrency = (amount: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount || 0)
const formatDate = (date: string | Date) => new Date(date).toLocaleDateString('fr-FR')

const showSnackbar = (message: string, color: string) => {
  snackbar.value = { visible: true, message, color }
}

// Placeholder for actions not yet implemented
const duplicateInvoice = () => showSnackbar("Fonctionnalité à venir", "info")
const cancelInvoice = () => showSnackbar("Fonctionnalité à venir", "info")
const deleteInvoice = () => showSnackbar("Fonctionnalité à venir", "info")

onMounted(loadInvoice)
</script>

<style scoped>
.invoice-detail-view {
  padding: 1.5rem;
}
.totals-summary {
  width: 100%;
  max-width: 350px;
}
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
</style>