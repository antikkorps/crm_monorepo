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
            <v-btn :disabled="!canModifyInvoice(invoice)" :class="!canModifyInvoice(invoice) ? 'invisible-placeholder' : ''" prepend-icon="mdi-pencil" variant="outlined" @click="editInvoice">Modifier</v-btn>
            <v-btn
              v-if="['draft','sent','overdue','partially_paid','paid'].includes(invoice.status)"
              prepend-icon="mdi-send"
              color="primary"
              @click="openSendDialog"
            >{{ invoice.status === 'draft' ? 'Envoyer' : 'Renvoyer' }}</v-btn>
            <v-btn :disabled="!canReceivePayment(invoice)" prepend-icon="mdi-currency-usd" color="success" @click="showPaymentDialog = true">Encaisser</v-btn>
            <v-btn v-if="!(invoice as any).archived" prepend-icon="mdi-archive-outline" variant="outlined" color="secondary" @click="handleArchive">Archiver</v-btn>
            <v-btn v-else prepend-icon="mdi-archive-arrow-up-outline" variant="outlined" color="secondary" @click="handleUnarchive">Désarchiver</v-btn>
            <v-btn prepend-icon="mdi-swap-horizontal" variant="outlined" @click="statusDialog.visible = true">Changer Statut</v-btn>
            <v-menu>
              <template v-slot:activator="{ props }">
                <v-btn v-bind="props" icon="mdi-dots-vertical" variant="text"></v-btn>
              </template>
              <v-list>
                <v-list-item @click="downloadPdf" prepend-icon="mdi-download">Télécharger PDF</v-list-item>
                <v-list-item @click="printInvoice" prepend-icon="mdi-printer">Imprimer</v-list-item>
                <v-divider />
                <v-list-item @click="duplicateInvoice" prepend-icon="mdi-content-copy">Dupliquer</v-list-item>
                <v-list-item @click="cancelInvoice" :disabled="!canModifyInvoice(invoice)" prepend-icon="mdi-cancel">Annuler</v-list-item>
                <v-list-item @click="deleteInvoice" :disabled="!canModifyInvoice(invoice)" class="text-error" prepend-icon="mdi-delete">Supprimer</v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>

        <!-- Send/Rsend Dialog -->
        <v-dialog v-model="sendDialog.visible" max-width="560">
          <v-card>
            <v-card-title class="text-h6">{{ invoice?.status === 'draft' ? 'Envoyer la facture' : 'Renvoyer la facture' }}</v-card-title>
            <v-card-text>
              <div class="d-flex flex-column gap-4">
                <div>
                  <div class="text-subtitle-2 mb-1">Destinataires</div>
                  <v-combobox
                    v-model="sendDialog.recipients"
                    :items="contactOptions"
                    item-title="label"
                    item-value="value"
                    chips
                    multiple
                    closable-chips
                    :disabled="sendDialog.loading"
                    variant="outlined"
                    density="comfortable"
                    placeholder="Sélectionnez un ou plusieurs contacts"
                  />
                </div>
                <div>
                  <div class="text-subtitle-2 mb-1">Message (optionnel)</div>
                  <v-textarea v-model="sendDialog.message" :disabled="sendDialog.loading" variant="outlined" rows="4" placeholder="Ajoutez un message personnalisé" />
                </div>
                <div class="d-flex align-center mt-2">
                  <v-checkbox v-model="sendDialog.sendCopyToSelf" :disabled="sendDialog.loading" density="compact" hide-details class="mr-2" />
                  <span>M'envoyer une copie ({{ authStore.user?.email || '—' }})</span>
                </div>
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="sendDialog.visible = false" :disabled="sendDialog.loading">Annuler</v-btn>
              <v-btn color="primary" @click="confirmSend" :loading="sendDialog.loading" :disabled="!sendDialog.recipients.length">Envoyer</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Status Change Dialog -->
        <v-dialog v-model="statusDialog.visible" max-width="500">
          <v-card>
            <v-card-title class="text-h6">Modifier le statut de la facture</v-card-title>
            <v-card-text>
              <div class="mb-4">
                <div class="text-subtitle-2 mb-2">Statut actuel :</div>
                <v-chip :color="getStatusColor(invoice?.status)" variant="tonal" size="small">{{ getStatusLabel(invoice?.status) }}</v-chip>
              </div>
              <v-select
                v-model="statusDialog.newStatus"
                :items="availableStatuses"
                item-title="label"
                item-value="value"
                label="Nouveau statut"
                variant="outlined"
                :disabled="statusDialog.loading"
              />
              <div v-if="statusDialog.newStatus" class="mt-3">
                <div class="text-subtitle-2 mb-1">Raison du changement (optionnel)</div>
                <v-textarea
                  v-model="statusDialog.reason"
                  variant="outlined"
                  rows="3"
                  :disabled="statusDialog.loading"
                  placeholder="Expliquez pourquoi vous changez le statut..."
                />
              </div>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn variant="text" @click="statusDialog.visible = false" :disabled="statusDialog.loading">Annuler</v-btn>
              <v-btn color="primary" @click="() => { console.log('Status change button clicked'); confirmStatusChange(); }" :loading="statusDialog.loading" :disabled="!statusDialog.newStatus || statusDialog.newStatus === invoice?.status">Modifier</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

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
                <div v-if="(invoice as any)?.daysOverdue" class="text-error d-flex align-center gap-2"><v-icon>mdi-alert-circle-outline</v-icon><span>{{ (invoice as any).daysOverdue }} jours de retard</span></div>
                <div v-else-if="(invoice as any)?.daysUntilDue !== null && (invoice as any)?.daysUntilDue <= 7" class="text-warning d-flex align-center gap-2"><v-icon>mdi-clock-alert-outline</v-icon><span>Échéance dans {{ (invoice as any).daysUntilDue }} jours</span></div>
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

        <PaymentHistory :invoice="invoice" class="mt-6" @record-payment="showPaymentDialog = true" @payment-updated="refreshInvoice" @notify="({ message, color }) => showSnackbar(message, color)" />
      </div>

      <PaymentForm v-model:visible="showPaymentDialog" :invoice="invoice" @payment-recorded="onPaymentRecorded" @notify="({ message, color }) => showSnackbar(message, color)" />
      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">{{ snackbar.message }}</v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { PaymentForm, PaymentHistory } from "@/components/billing"
import AppLayout from "@/components/layout/AppLayout.vue"
import { invoicesApi, documentsApi, institutionsApi } from "@/services/api"
import { useAuthStore } from "@/stores/auth"
import type { Invoice, InvoiceStatus } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const invoice = ref<Invoice | null>(null)
const loading = ref(false)
const showPaymentDialog = ref(false)
const snackbar = ref({ visible: false, message: '', color: 'info' })
const sendDialog = ref({ visible: false, recipients: [] as string[], message: '', loading: false, sendCopyToSelf: true })
const statusDialog = ref({ visible: false, newStatus: '', reason: '', loading: false })
const contacts = ref<{ id: string; firstName: string; lastName: string; email: string; isPrimary: boolean }[]>([])
const contactOptions = computed(() => contacts.value
  .filter(c => !!c.email)
  .map(c => ({ label: `${c.firstName} ${c.lastName} <${c.email}>`, value: c.email }))
)

const availableStatuses = computed(() => {
  if (!invoice.value) return []
  const current = invoice.value.status
  const allStatuses = [
    { label: "Brouillon", value: "draft" },
    { label: "Envoyé", value: "sent" },
    { label: "Partiellement Payé", value: "partially_paid" },
    { label: "Payé", value: "paid" },
    { label: "En Retard", value: "overdue" },
    { label: "Annulé", value: "cancelled" },
  ]
  // Remove current status from available options
  return allStatuses.filter(s => s.value !== current)
})

const lineHeaders = [
  { title: 'Description', value: 'description' },
  { title: 'Qté', value: 'quantity', align: 'end' as const },
  { title: 'Prix Unitaire', value: 'unitPrice', align: 'end' as const },
  { title: 'Total', value: 'total', align: 'end' as const },
]

const paymentPercentage = computed(() => invoice.value && invoice.value.total > 0 ? (invoice.value.totalPaid / invoice.value.total) * 100 : 0)

const loadInvoice = async () => {
  loading.value = true
  try {
    const response = await invoicesApi.getById(route.params.id as string)
    invoice.value = (response as any).data
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

const openSendDialog = async () => {
  if (!invoice.value) return
  try {
    const instId = (invoice.value as any).institutionId || (invoice.value.institution as any)?.id
    if (instId) {
      const resp = await institutionsApi.getById(instId)
      const payload = (resp as any).data || resp
      const inst = payload?.institution || payload
      contacts.value = inst?.contactPersons || []
    } else {
      contacts.value = []
    }
  } catch (e) {
    contacts.value = []
  }
  sendDialog.value.visible = true
}

const confirmSend = async () => {
  if (!invoice.value) return
  sendDialog.value.loading = true
  try {
    await invoicesApi.send(invoice.value.id)
    const rawRecipients = [
      ...sendDialog.value.recipients,
      ...(sendDialog.value.sendCopyToSelf && authStore.user?.email ? [authStore.user.email] : []),
    ] as any[]
    const normalizedRecipients = Array.from(new Set(
      rawRecipients
        .map((r: any) => (typeof r === 'string' ? r : r?.value || r?.email || ''))
        .filter((e: string) => !!e)
    ))
    const resp = await documentsApi.generateInvoicePdf(invoice.value.id, {
      email: true,
      recipients: normalizedRecipients,
      customMessage: sendDialog.value.message || undefined,
    }) as any
    const emailSent = resp?.data?.emailSent ?? false
    if (emailSent) {
      showSnackbar("Facture envoyée par email", "success")
    } else {
      const err = resp?.data?.emailError || 'Envoi non confirmé par le serveur'
      showSnackbar(`Envoi email non confirmé: ${err}`, "warning")
    }
    sendDialog.value.visible = false
    sendDialog.value.recipients = []
    sendDialog.value.message = ''
    sendDialog.value.sendCopyToSelf = false
    refreshInvoice()
  } catch (error: any) {
    const msg = error?.message ? `Erreur: ${error.message}` : "Échec de l'envoi de la facture"
    showSnackbar(msg, "error")
  } finally {
    sendDialog.value.loading = false
  }
}

const downloadPdf = async () => {
  if (!invoice.value) return
  try {
    console.log("Downloading PDF for invoice:", invoice.value.id)
    const result = await documentsApi.generateInvoicePdf(invoice.value.id)
    console.log("Raw API result:", result)
    console.log("Result type:", typeof result)
    console.log("Is result a Blob?", result instanceof Blob)

    if (!result) {
      console.error("API returned null/undefined")
      showSnackbar("No PDF data received", "error")
      return
    }

    const blob = result as Blob
    console.log("Received blob:", {
      type: blob.type,
      size: blob.size,
      isBlob: blob instanceof Blob
    })
    documentsApi.downloadBlob(blob, `Invoice-${invoice.value.invoiceNumber}.pdf`)
  } catch (error) {
    console.error("PDF download error:", error)
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
  if ((invoice.value as any)?.daysOverdue && (invoice.value as any).daysOverdue > 0) return 'text-error font-weight-bold'
  if ((invoice.value as any)?.daysUntilDue !== null && (invoice.value as any).daysUntilDue <= 7) return 'text-warning'
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

const canModifyInvoice = (invoice: Invoice | null) => {
  if (!invoice) return false
  // Une facture peut être modifiée si :
  // - elle est en brouillon (modification complète)
  // - elle est envoyée mais pas encore payée (modification limitée)
  // - elle est en retard mais pas encore payée (modification limitée)
  return ['draft', 'sent', 'overdue'].includes(invoice.status) &&
         (invoice.totalPaid === 0 || invoice.totalPaid < invoice.total)
}

const canReceivePayment = (invoice: Invoice | null) => {
  if (!invoice) {
    console.log("canReceivePayment: no invoice")
    return false
  }

  // Convertir les strings en numbers si nécessaire
  const remainingAmount = typeof invoice.remainingAmount === 'string'
    ? parseFloat(invoice.remainingAmount)
    : invoice.remainingAmount

  // Règle alignée backend: uniquement sent / partially_paid / overdue
  const allowedStatus = ['sent', 'partially_paid', 'overdue']
  const archived = (invoice as any).archived === true
  const result = allowedStatus.includes(invoice.status) && remainingAmount > 0 && !archived

  console.log("canReceivePayment:", {
    status: invoice.status,
    remainingAmount: invoice.remainingAmount,
    remainingAmountParsed: remainingAmount,
    total: invoice.total,
    totalPaid: invoice.totalPaid,
    result
  })

  return result
}

const handleArchive = async () => {
  if (!invoice.value) return
  try {
    await invoicesApi.archive(invoice.value.id)
    showSnackbar('Facture archivée', 'info')
    refreshInvoice()
  } catch (e) {
    showSnackbar("Échec de l'archivage", 'error')
  }
}

const handleUnarchive = async () => {
  if (!invoice.value) return
  try {
    await invoicesApi.unarchive(invoice.value.id)
    showSnackbar('Facture désarchivée', 'info')
    refreshInvoice()
  } catch (e) {
    showSnackbar("Échec du désarchivage", 'error')
  }
}

const showSnackbar = (message: string, color: string) => {
  snackbar.value = { visible: true, message, color }
}

const confirmStatusChange = async () => {
  console.log("confirmStatusChange called", {
    hasInvoice: !!invoice.value,
    invoiceId: invoice.value?.id,
    newStatus: statusDialog.value.newStatus,
    reason: statusDialog.value.reason
  })

  if (!invoice.value || !statusDialog.value.newStatus) {
    console.log("Early return: missing invoice or status")
    return
  }

  console.log("Proceeding with status change...")
  statusDialog.value.loading = true
  try {
    console.log("About to call updateStatus API...")

    // Utiliser l'endpoint approprié selon le statut
    let result
    if (statusDialog.value.newStatus === 'sent' && invoice.value.status === 'draft') {
      console.log("Using send API for draft->sent transition")
      result = await invoicesApi.send(invoice.value.id)
    } else if (statusDialog.value.newStatus === 'cancelled') {
      console.log("Using cancel API")
      result = await invoicesApi.cancel(invoice.value.id)
    } else {
      console.log("Using generic updateStatus API")
      result = await invoicesApi.updateStatus(
        invoice.value.id,
        statusDialog.value.newStatus,
        statusDialog.value.reason || undefined
      )
    }

    console.log("Status change result:", result)
    showSnackbar(`Statut mis à jour vers "${getStatusLabel(statusDialog.value.newStatus as InvoiceStatus)}"`, "success")
    statusDialog.value.visible = false
    statusDialog.value.newStatus = ''
    statusDialog.value.reason = ''
    refreshInvoice()
  } catch (error: any) {
    console.error("Status update error:", error)
    const msg = error?.message ? `Erreur: ${error.message}` : "Échec de la mise à jour du statut"
    showSnackbar(msg, "error")
  } finally {
    console.log("Status update finally block")
    statusDialog.value.loading = false
  }
}

// Placeholder for actions not yet implemented
const duplicateInvoice = () => showSnackbar("Fonctionnalité à venir", "info")
const cancelInvoice = () => showSnackbar("Fonctionnalité à venir", "info")
const deleteInvoice = () => showSnackbar("Fonctionnalité à venir", "info")

watch(() => statusDialog.value.visible, (visible: boolean) => {
  if (!visible) {
    statusDialog.value.newStatus = ''
    statusDialog.value.reason = ''
  }
})

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
.invisible-placeholder { visibility: hidden; }
</style>
