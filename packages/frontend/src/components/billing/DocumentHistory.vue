<template>
  <div class="document-history">
    <div class="history-header">
      <h4>Document History</h4>
      <Button
        icon="pi pi-refresh"
        text
        rounded
        @click="loadVersions"
        :loading="loading"
        v-tooltip.top="'Refresh'"
      />
    </div>

    <div v-if="loading && versions.length === 0" class="loading-state">
      <ProgressSpinner size="small" />
      <span>Loading document history...</span>
    </div>

    <div v-else-if="versions.length === 0" class="empty-state">
      <i class="pi pi-file-o empty-icon"></i>
      <p>No documents generated yet</p>
      <small>Generate a PDF to see document history</small>
    </div>

    <div v-else class="versions-list">
      <div
        v-for="version in versions"
        :key="version.id"
        class="version-item"
        :class="{ latest: version.isLatest }"
      >
        <div class="version-info">
          <div class="version-header">
            <span class="version-number">Version {{ version.version }}</span>
            <Badge
              v-if="version.isLatest"
              value="Latest"
              severity="success"
              size="small"
            />
          </div>

          <div class="version-details">
            <div class="detail-row">
              <i class="pi pi-calendar"></i>
              <span>{{ formatDate(version.generatedAt) }}</span>
            </div>

            <div class="detail-row">
              <i class="pi pi-user"></i>
              <span
                >{{ version.generatedBy?.firstName }}
                {{ version.generatedBy?.lastName }}</span
              >
            </div>

            <div v-if="version.template" class="detail-row">
              <i class="pi pi-file-edit"></i>
              <span>{{ version.template.name }}</span>
            </div>

            <div class="detail-row">
              <i class="pi pi-download"></i>
              <span>{{ formatFileSize(version.fileSize) }}</span>
            </div>
          </div>

          <div v-if="version.emailedAt" class="email-info">
            <div class="email-status">
              <i class="pi pi-send"></i>
              <span>Emailed {{ formatDate(version.emailedAt) }}</span>
            </div>
            <div v-if="version.emailRecipients?.length" class="email-recipients">
              <small>To: {{ version.emailRecipients.join(", ") }}</small>
            </div>
          </div>
        </div>

        <div class="version-actions">
          <Button
            icon="pi pi-download"
            text
            rounded
            size="small"
            @click="downloadVersion(version)"
            v-tooltip.top="'Download'"
            :loading="downloadingVersions.has(version.id)"
          />
          <Button
            icon="pi pi-eye"
            text
            rounded
            size="small"
            @click="previewVersion(version)"
            v-tooltip.top="'Preview'"
          />
          <Button
            icon="pi pi-send"
            text
            rounded
            size="small"
            @click="emailVersion(version)"
            v-tooltip.top="'Email'"
            :disabled="!canEmail"
          />
        </div>
      </div>
    </div>

    <!-- Email Dialog -->
    <Dialog
      v-model:visible="showEmailDialog"
      header="Email Document"
      :modal="true"
      class="email-dialog"
    >
      <div class="email-content">
        <div class="document-info">
          <h5>Document Details</h5>
          <div class="info-grid">
            <div><strong>Type:</strong> {{ documentType }}</div>
            <div><strong>Version:</strong> {{ selectedVersion?.version }}</div>
            <div>
              <strong>Generated:</strong>
              {{ selectedVersion ? formatDate(selectedVersion.generatedAt) : "" }}
            </div>
          </div>
        </div>

        <div class="recipient-section">
          <label for="email-recipients">Recipients *</label>
          <Chips
            id="email-recipients"
            v-model="emailRecipients"
            placeholder="Enter email addresses"
            :class="{ 'p-invalid': emailErrors.recipients }"
          />
          <small v-if="emailErrors.recipients" class="p-error">{{
            emailErrors.recipients
          }}</small>
        </div>

        <div class="message-section">
          <label for="email-message">Custom Message (Optional)</label>
          <Textarea
            id="email-message"
            v-model="emailMessage"
            placeholder="Add a personal message to include with the document..."
            rows="4"
          />
        </div>
      </div>

      <template #footer>
        <Button label="Cancel" severity="secondary" outlined @click="closeEmailDialog" />
        <Button
          label="Send Email"
          icon="pi pi-send"
          @click="confirmEmailVersion"
          :loading="emailing"
          :disabled="!isEmailFormValid"
        />
      </template>
    </Dialog>

    <!-- Toast for notifications -->
  </div>
</template>

<script setup lang="ts">
import type { DocumentVersion } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { documentsApi } from "../../services/api"
import { useNotificationStore } from "@/stores/notification"

interface Props {
  documentId: string
  documentType: "quote" | "invoice"
  canEmail?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canEmail: true,
})

// Reactive state
const versions = ref<DocumentVersion[]>([])
const loading = ref(false)
const downloadingVersions = ref(new Set<string>())
const showEmailDialog = ref(false)
const selectedVersion = ref<DocumentVersion | null>(null)
const emailRecipients = ref<string[]>([])
const emailMessage = ref("")
const emailing = ref(false)
const emailErrors = ref<Record<string, string>>({})

// Toast for notifications
const notificationStore = useNotificationStore()

// Computed properties
const isEmailFormValid = computed(() => {
  return (
    emailRecipients.value.length > 0 &&
    emailRecipients.value.every((email) => isValidEmail(email))
  )
})

// Methods
const loadVersions = async () => {
  try {
    loading.value = true

    if (props.documentType === "quote") {
      versions.value = await documentsApi.getQuoteVersions(props.documentId)
    } else {
      versions.value = await documentsApi.getInvoiceVersions(props.documentId)
    }

    // Mark the latest version
    if (versions.value.length > 0) {
      const latest = versions.value.reduce((prev, current) =>
        prev.version > current.version ? prev : current
      )
      latest.isLatest = true
    }
  } catch (error) {
    console.error("Failed to load document versions:", error)
    notificationStore.showError("Failed to load document history")
  } finally {
    loading.value = false
  }
}

const downloadVersion = async (version: DocumentVersion) => {
  try {
    downloadingVersions.value.add(version.id)

    // Generate new PDF with the same template
    let blob: Blob
    if (props.documentType === "quote") {
      blob = (await documentsApi.generateQuotePdf(props.documentId, {
        templateId: version.templateId,
      })) as Blob
    } else {
      blob = (await documentsApi.generateInvoicePdf(props.documentId, {
        templateId: version.templateId,
      })) as Blob
    }

    const filename =
      version.fileName ||
      `${props.documentType}-${props.documentId}-v${version.version}.pdf`
    documentsApi.downloadBlob(blob, filename)

    notificationStore.showSuccess("Document downloaded successfully")
  } catch (error) {
    console.error("Failed to download document:", error)
    notificationStore.showError("Failed to download document")
  } finally {
    downloadingVersions.value.delete(version.id)
  }
}

const previewVersion = async (version: DocumentVersion) => {
  try {
    // Generate new PDF with the same template and open in new tab
    let blob: Blob
    if (props.documentType === "quote") {
      blob = (await documentsApi.generateQuotePdf(props.documentId, {
        templateId: version.templateId,
      })) as Blob
    } else {
      blob = (await documentsApi.generateInvoicePdf(props.documentId, {
        templateId: version.templateId,
      })) as Blob
    }

    documentsApi.openBlobInNewTab(blob)
  } catch (error) {
    console.error("Failed to preview document:", error)
    notificationStore.showError("Failed to preview document")
  }
}

const emailVersion = (version: DocumentVersion) => {
  selectedVersion.value = version
  emailRecipients.value = []
  emailMessage.value = ""
  emailErrors.value = {}
  showEmailDialog.value = true
}

const confirmEmailVersion = async () => {
  if (!validateEmailForm() || !selectedVersion.value) return

  try {
    emailing.value = true

    // Generate and email PDF with the same template
    let result: any
    if (props.documentType === "quote") {
      result = await documentsApi.generateQuotePdf(props.documentId, {
        templateId: selectedVersion.value.templateId,
        email: true,
        customMessage: emailMessage.value,
      })
    } else {
      result = await documentsApi.generateInvoicePdf(props.documentId, {
        templateId: selectedVersion.value.templateId,
        email: true,
        customMessage: emailMessage.value,
      })
    }

    if (result.data?.emailSent) {
      notificationStore.showSuccess("Document emailed successfully")
      closeEmailDialog()
      await loadVersions() // Refresh to show updated email status
    } else {
      notificationStore.showError(result.data?.emailError || "Failed to send email")
    }
  } catch (error) {
    console.error("Failed to email document:", error)
    notificationStore.showError("Failed to email document")
  } finally {
    emailing.value = false
  }
}

const validateEmailForm = () => {
  const errors: Record<string, string> = {}

  if (emailRecipients.value.length === 0) {
    errors.recipients = "At least one recipient is required"
  } else if (!emailRecipients.value.every((email) => isValidEmail(email))) {
    errors.recipients = "All email addresses must be valid"
  }

  emailErrors.value = errors
  return Object.keys(errors).length === 0
}

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const closeEmailDialog = () => {
  showEmailDialog.value = false
  selectedVersion.value = null
  emailRecipients.value = []
  emailMessage.value = ""
  emailErrors.value = {}
}

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Watch for document changes
watch(() => props.documentId, loadVersions, { immediate: true })

// Load versions on mount
onMounted(() => {
  if (props.documentId) {
    loadVersions()
  }
})
</script>

<style scoped>
.document-history {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-header h4 {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 600;
}

.loading-state {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--text-color-secondary);
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.empty-state p {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
}

.empty-state small {
  font-size: 0.75rem;
  opacity: 0.8;
}

.versions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.version-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  background: var(--surface-card);
  transition: all 0.2s ease;
}

.version-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.version-item.latest {
  border-color: var(--green-500);
  background: var(--green-50);
}

.version-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.version-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.version-number {
  font-weight: 600;
  color: var(--text-color);
  font-size: 0.875rem;
}

.version-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.detail-row i {
  width: 12px;
  font-size: 0.75rem;
}

.email-info {
  padding: 0.5rem;
  background: var(--blue-50);
  border: 1px solid var(--blue-200);
  border-radius: 4px;
}

.email-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--blue-700);
  font-weight: 500;
}

.email-recipients {
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: var(--blue-600);
}

.version-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.email-dialog {
  max-width: 500px;
}

.email-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.document-info h5 {
  margin: 0 0 0.75rem 0;
  color: var(--text-color);
  font-size: 0.875rem;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.recipient-section,
.message-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recipient-section label,
.message-section label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.p-error {
  color: var(--red-500);
  font-size: 0.75rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .version-item {
    flex-direction: column;
    gap: 1rem;
  }

  .version-actions {
    align-self: stretch;
    justify-content: space-around;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
