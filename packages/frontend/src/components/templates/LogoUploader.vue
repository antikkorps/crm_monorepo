<template>
  <div class="logo-uploader">
    <div class="upload-section">
      <div class="current-logo" v-if="logoUrl">
        <img :src="logoUrl" alt="Current logo" class="logo-preview" />
        <div class="logo-actions">
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            @click="removeLogo"
            v-tooltip.top="'Remove logo'"
          />
        </div>
      </div>

      <div
        class="upload-area"
        :class="{ 'drag-over': isDragOver }"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/svg+xml"
          @change="handleFileSelect"
          style="display: none"
        />

        <div
          class="drop-zone"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <div v-if="!uploading" class="upload-content">
            <i class="pi pi-cloud-upload upload-icon"></i>
            <h4>{{ logoUrl ? "Change Logo" : "Upload Logo" }}</h4>
            <p>Drag and drop your logo here, or click to browse</p>
            <small>Supported formats: JPEG, PNG, GIF, SVG (Max 5MB)</small>
          </div>

          <div v-else class="uploading-content">
            <ProgressSpinner size="2rem" />
            <p>Uploading logo...</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="uploadError" class="upload-error">
      <Message severity="error" :closable="false">
        {{ uploadError }}
      </Message>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useToast } from "primevue/usetoast"
import { ref, watch } from "vue"
import { templatesApi } from "../../services/api"

interface Props {
  logoUrl?: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  "update:logoUrl": [logoUrl: string]
  upload: [logoUrl: string]
}>()

// Reactive state
const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const uploadError = ref("")
const isDragOver = ref(false)

// Toast for notifications
const toast = useToast()

// Watch for logo URL changes
watch(
  () => props.logoUrl,
  (newUrl) => {
    if (newUrl) {
      uploadError.value = ""
    }
  }
)

// Trigger file input
const triggerFileInput = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

// Handle file selection
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadFile(file)
  }
}

// Handle drag over
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

// Handle drag leave
const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
}

// Handle drop
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile(files[0])
  }
}

// Validate file
const validateFile = (file: File): string | null => {
  // Check file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/svg+xml"]
  if (!allowedTypes.includes(file.type)) {
    return "Invalid file type. Only JPEG, PNG, GIF, and SVG files are allowed."
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return "File size too large. Maximum size is 5MB."
  }

  return null
}

// Upload file
const uploadFile = async (file: File) => {
  // Validate file
  const validationError = validateFile(file)
  if (validationError) {
    uploadError.value = validationError
    return
  }

  try {
    uploading.value = true
    uploadError.value = ""

    const response = await templatesApi.uploadLogo(file)

    if (response.success) {
      const logoUrl = response.data.logoUrl
      emit("update:logoUrl", logoUrl)
      emit("upload", logoUrl)

      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Logo uploaded successfully",
        life: 3000,
      })
    } else {
      throw new Error(response.error || "Upload failed")
    }
  } catch (error) {
    console.error("Failed to upload logo:", error)
    uploadError.value = error instanceof Error ? error.message : "Failed to upload logo"

    toast.add({
      severity: "error",
      summary: "Upload Error",
      detail: uploadError.value,
      life: 5000,
    })
  } finally {
    uploading.value = false

    // Clear file input
    if (fileInput.value) {
      fileInput.value.value = ""
    }
  }
}

// Remove logo
const removeLogo = () => {
  emit("update:logoUrl", "")
  uploadError.value = ""

  toast.add({
    severity: "info",
    summary: "Logo Removed",
    detail: "Logo has been removed from the template",
    life: 3000,
  })
}
</script>

<style scoped>
.logo-uploader {
  margin-bottom: 1rem;
}

.upload-section {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.current-logo {
  position: relative;
  flex-shrink: 0;
}

.logo-preview {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-0);
  padding: 0.5rem;
}

.logo-actions {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--surface-0);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.upload-area {
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-area.drag-over .drop-zone {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.drop-zone {
  border: 2px dashed var(--surface-border);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background: var(--surface-50);
  transition: all 0.2s ease;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone:hover {
  border-color: var(--primary-color);
  background: var(--primary-50);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  font-size: 2rem;
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.upload-content h4 {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 600;
}

.upload-content p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.upload-content small {
  color: var(--text-color-secondary);
  font-size: 0.75rem;
}

.uploading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.uploading-content p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
}

.upload-error {
  margin-top: 1rem;
}

/* Responsive design */
@media (max-width: 480px) {
  .upload-section {
    flex-direction: column;
  }

  .current-logo {
    align-self: center;
  }

  .drop-zone {
    padding: 1.5rem 1rem;
  }

  .upload-icon {
    font-size: 1.5rem;
  }

  .upload-content h4 {
    font-size: 0.875rem;
  }

  .upload-content p {
    font-size: 0.8125rem;
  }
}
</style>
