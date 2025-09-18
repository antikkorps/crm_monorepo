<template>
  <div class="logo-uploader">
    <v-card class="pa-3" variant="tonal">
      <div class="upload-header d-flex align-center mb-3">
        <v-icon class="mr-2" color="primary">mdi-image</v-icon>
        <div>
          <h4 class="mb-1">Company Logo</h4>
          <div class="text-caption text-medium-emphasis">
            Upload a logo, pick an existing one, or use a URL
          </div>
        </div>
        <v-spacer />
        <v-btn
          v-if="logoUrl"
          size="small"
          variant="text"
          color="error"
          @click="removeLogo"
        >
          <v-icon start>mdi-delete</v-icon>Remove
        </v-btn>
      </div>

      <v-tabs v-model="activeTab" density="comfortable" class="mb-3">
        <v-tab value="upload"><v-icon start>mdi-cloud-upload</v-icon>Upload</v-tab>
        <v-tab value="existing"><v-icon start>mdi-image-multiple</v-icon>Existing</v-tab>
        <v-tab value="url"><v-icon start>mdi-link-variant</v-icon>From URL</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- Upload Tab -->
        <v-window-item value="upload">
          <div class="upload-section">
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
                  <v-icon size="48" class="upload-icon mb-3">mdi-cloud-upload</v-icon>
                  <h4>{{ logoUrl ? "Change Logo" : "Upload Logo" }}</h4>
                  <p>Drag and drop your logo here, or click to browse</p>
                  <small>Supported formats: JPEG, PNG, GIF, SVG (Max 5MB)</small>
                </div>

                <div v-else class="uploading-content">
                  <v-progress-circular indeterminate color="primary" size="32" />
                  <p>Uploading logo...</p>
                </div>
              </div>
            </div>
          </div>
        </v-window-item>

        <!-- Existing Logos Tab -->
        <v-window-item value="existing">
          <div class="existing-logos">
            <div class="d-flex align-center mb-2">
              <v-icon class="mr-2" color="primary">mdi-image-multiple</v-icon>
              <strong>Pick from existing templates</strong>
              <v-spacer />
              <v-btn
                size="small"
                variant="text"
                @click="loadExistingLogos"
                :loading="loadingExisting"
              >
                <v-icon start>mdi-refresh</v-icon>Refresh
              </v-btn>
            </div>
            <div v-if="loadingExisting" class="d-flex align-center justify-center py-6">
              <v-progress-circular indeterminate color="primary" />
            </div>
            <div v-else>
              <div
                v-if="existingLogos.length === 0"
                class="text-medium-emphasis text-caption py-4"
              >
                No logos found in existing templates.
              </div>
              <div v-else class="logo-grid">
                <button
                  v-for="(url, idx) in existingLogos"
                  :key="idx"
                  type="button"
                  class="logo-thumb"
                  @click="selectExisting(url)"
                >
                  <LogoThumb :url="url" />
                </button>
              </div>
            </div>
          </div>
        </v-window-item>

        <!-- URL Tab -->
        <v-window-item value="url">
          <div class="url-section">
            <v-text-field
              v-model="logoUrlInput"
              label="Logo URL"
              placeholder="https://..."
              variant="outlined"
              density="compact"
              :error-messages="urlError"
              @input="validateUrlInput"
              clearable
            />
            <div v-if="logoUrlInput && !urlError" class="url-preview">
              <img :src="logoUrlInput" alt="Logo preview" />
            </div>
            <div class="d-flex mt-2">
              <v-spacer />
              <v-btn
                :disabled="!!urlError || !logoUrlInput"
                color="primary"
                @click="applyUrl"
              >
                Use this logo
              </v-btn>
            </div>
          </div>
        </v-window-item>
      </v-window>

      <div class="text-caption text-medium-emphasis mt-2">
        Uploaded files are stored on the server and referenced by URL (e.g. /logos/...).
        The URL is saved in the template.
      </div>

      <div v-if="uploadError" class="upload-error mt-3">
        <v-alert type="error" variant="tonal">
          {{ uploadError }}
        </v-alert>
      </div>
    </v-card>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { templatesApi } from "../../services/api"
import { useImageLoader } from "../../composables/useImageLoader"
import LogoThumb from "./LogoThumb.vue"

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
const activeTab = ref("upload")

// URL input state
const logoUrlInput = ref("")
const urlError = ref("")

// Existing logos
const existingLogos = ref<string[]>([])
const loadingExisting = ref(false)

// Image loader
const { useImage } = useImageLoader()

// Computed properties pour convertir l'URL en data URL
const normalizedLogoUrl = computed(() => {
  if (!props.logoUrl) return ""

  // Handle old format /logos/ -> convert to new API format
  if (props.logoUrl.startsWith("/logos/")) {
    const filename = props.logoUrl.replace("/logos/", "")
    return `/api/templates/logos/${filename}`
  }

  return props.logoUrl
})

const { dataUrl: displayLogoUrl, isLoading: imageLoading } = useImage(normalizedLogoUrl)

// Snackbar state
const snackbar = ref<{ visible: boolean; color: string; message: string }>({
  visible: false,
  color: "info",
  message: "",
})

const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, color, message }
}

// Watch for logo URL changes
watch(
  () => props.logoUrl,
  (newUrl) => {
    if (newUrl) {
      uploadError.value = ""
      logoUrlInput.value = newUrl
    }
  }
)

onMounted(() => {
  // Preload existing logos once when opening component
  loadExistingLogos()
})

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

// Load existing logos from storage (fallback to templates if needed)
const loadExistingLogos = async () => {
  try {
    loadingExisting.value = true
    const resp = await templatesApi.listLogos()
    if (resp?.data && Array.isArray(resp.data)) {
      // Garder les URLs relatives, le composable useImageLoader s'en occupera
      existingLogos.value = resp.data.map((i: any) => i.url)
      return
    }
  } catch (e) {
    console.warn("/templates/logos not available, fallback to templates", e)
    try {
      const response = await templatesApi.getAll()
      const templates = response.data || []
      const urls: string[] = templates
        .map((t: any) => t.logoUrl)
        .filter((u: string | undefined) => !!u)
      existingLogos.value = Array.from(new Set(urls)) as string[]
    } catch (err) {
      console.error("Failed to load existing logos", err)
    }
  } finally {
    loadingExisting.value = false
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

      showSnackbar("Logo uploaded successfully", "success")
    } else {
      throw new Error(response.error || "Upload failed")
    }
  } catch (error) {
    console.error("Failed to upload logo:", error)
    uploadError.value = error instanceof Error ? error.message : "Failed to upload logo"

    showSnackbar(`Upload Error: ${uploadError.value}`, "error")
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

  showSnackbar("Logo has been removed from the template", "info")
}

// Select existing logo
const selectExisting = (url: string) => {
  // Les URLs sont déjà relatives depuis loadExistingLogos, on les utilise directement
  emit("update:logoUrl", url)
  logoUrlInput.value = url
  showSnackbar("Logo selected from existing", "success")
}

// Validate user-provided URL
const validateUrl = (value: string) => {
  if (!value) return "URL is required"
  try {
    const u = new URL(value)
    if (u.protocol !== "http:" && u.protocol !== "https:") return "Invalid URL protocol"
    return ""
  } catch {
    return "Invalid URL"
  }
}

const validateUrlInput = () => {
  urlError.value = validateUrl(logoUrlInput.value)
}

const applyUrl = () => {
  validateUrlInput()
  if (urlError.value) return
  emit("update:logoUrl", logoUrlInput.value)
  showSnackbar("Logo URL applied", "success")
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
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  padding: 0.5rem;
}

.logo-preview-loading {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-outline-variant));
}

.upload-area {
  flex: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-area.drag-over .drop-zone {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.drop-zone {
  border: 2px dashed rgb(var(--v-theme-outline-variant));
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  background: rgb(var(--v-theme-surface));
  transition: all 0.2s ease;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drop-zone:hover {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.06);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  color: rgb(var(--v-theme-primary));
}

.upload-content h4 {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
  font-weight: 600;
}

.upload-content p {
  margin: 0;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
}

.upload-content small {
  color: rgb(var(--v-theme-on-surface-variant));
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
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 0.875rem;
}

.upload-error {
  margin-top: 1rem;
}

.existing-logos .logo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 12px;
}

.existing-logos .logo-thumb {
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 8px;
  padding: 8px;
  background: rgb(var(--v-theme-surface));
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  cursor: pointer;
}

.existing-logos .logo-thumb:hover {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.existing-logos img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.url-section .url-preview {
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.url-section .url-preview img {
  max-width: 160px;
  max-height: 80px;
  object-fit: contain;
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

  .upload-content h4 {
    font-size: 0.875rem;
  }

  .upload-content p {
    font-size: 0.8125rem;
  }
}
</style>
