<template>
  <v-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    max-width="900"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-3">mdi-file-document-edit</v-icon>
        {{ isEditing ? "Edit Template" : "Create New Template" }}
      </v-card-title>

      <v-card-text>
        <v-form @submit.prevent="handleSubmit" ref="formRef">
          <!-- Basic Information -->
          <div class="form-section mb-6">
            <h4 class="section-title mb-4">Basic Information</h4>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="formData.name"
                  label="Template Name"
                  placeholder="Enter template name"
                  variant="outlined"
                  density="compact"
                  :error-messages="errors.name"
                  required
                />
              </v-col>

              <v-col cols="12" md="6">
                <v-select
                  v-model="formData.type"
                  :items="templateTypeOptions"
                  item-title="label"
                  item-value="value"
                  label="Template Type"
                  placeholder="Select template type"
                  variant="outlined"
                  density="compact"
                  :error-messages="errors.type"
                  required
                />
              </v-col>
            </v-row>
          </div>

      <!-- Company Information -->
      <div class="form-section">
        <h4 class="section-title">Company Information</h4>

        <v-row>
          <v-col cols="12">
            <v-text-field
              id="company-name"
              v-model="formData.companyName"
              label="Company Name"
              placeholder="Enter company name"
              :error-messages="errors.companyName"
              required
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              id="company-email"
              v-model="formData.companyEmail"
              type="email"
              label="Email"
              placeholder="company@example.com"
              :error-messages="errors.companyEmail"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              id="company-phone"
              v-model="formData.companyPhone"
              label="Phone"
              placeholder="+1 (555) 123-4567"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-text-field
              id="company-website"
              v-model="formData.companyWebsite"
              label="Website"
              placeholder="https://www.company.com"
              :error-messages="errors.companyWebsite"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <!-- Address -->
        <div class="address-section">
          <h5>Company Address *</h5>
          <v-row>
            <v-col cols="12">
              <v-text-field
                id="address-street"
                v-model="formData.companyAddress.street"
                label="Street Address"
                placeholder="123 Business Street"
                :error-messages="errors['companyAddress.street']"
                required
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                id="address-city"
                v-model="formData.companyAddress.city"
                label="City"
                placeholder="Business City"
                :error-messages="errors['companyAddress.city']"
                required
                variant="outlined"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                id="address-state"
                v-model="formData.companyAddress.state"
                label="State/Province"
                placeholder="State"
                :error-messages="errors['companyAddress.state']"
                required
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                id="address-zip"
                v-model="formData.companyAddress.zipCode"
                label="ZIP/Postal Code"
                placeholder="12345"
                :error-messages="errors['companyAddress.zipCode']"
                required
                variant="outlined"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                id="address-country"
                v-model="formData.companyAddress.country"
                label="Country"
                placeholder="United States"
                :error-messages="errors['companyAddress.country']"
                required
                variant="outlined"
                density="compact"
              />
            </v-col>
          </v-row>
        </div>
      </div>

      <!-- Legal Information -->
      <div class="form-section">
        <h4 class="section-title">Legal Information</h4>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              id="tax-number"
              v-model="formData.taxNumber"
              label="Tax Number"
              placeholder="Tax ID"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              id="vat-number"
              v-model="formData.vatNumber"
              label="VAT Number"
              placeholder="VAT ID"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              id="siret-number"
              v-model="formData.siretNumber"
              label="SIRET Number"
              placeholder="SIRET"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              id="registration-number"
              v-model="formData.registrationNumber"
              label="Registration Number"
              placeholder="Business Registration"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Logo and Branding -->
      <div class="form-section">
        <h4 class="section-title">Logo and Branding</h4>

        <LogoUploader v-model:logo-url="formData.logoUrl" @upload="handleLogoUpload" />

        <v-row>
          <v-col cols="12" md="6">
            <v-select
              id="logo-position"
              v-model="formData.logoPosition"
              :items="logoPositionOptions"
              item-title="label"
              item-value="value"
              label="Logo Position"
              placeholder="Select logo position"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <label for="primary-color">Primary Color</label>
            <ColorPicker
              v-model="formData.primaryColor"
              format="hex"
              :class="{ 'p-invalid': errors.primaryColor }"
            />
            <small v-if="errors.primaryColor" class="p-error">{{
              errors.primaryColor
            }}</small>
          </v-col>

          <v-col cols="12" md="6">
            <label for="secondary-color">Secondary Color</label>
            <ColorPicker
              v-model="formData.secondaryColor"
              format="hex"
              :class="{ 'p-invalid': errors.secondaryColor }"
            />
            <small v-if="errors.secondaryColor" class="p-error">{{
              errors.secondaryColor
            }}</small>
          </v-col>
        </v-row>
      </div>

      <!-- Layout Settings -->
      <div class="form-section">
        <h4 class="section-title">Layout Settings</h4>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              id="header-height"
              v-model.number="formData.headerHeight"
              type="number"
              label="Header Height (px)"
              min="0"
              max="200"
              suffix="px"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              id="footer-height"
              v-model.number="formData.footerHeight"
              type="number"
              label="Footer Height (px)"
              min="0"
              max="200"
              suffix="px"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              id="margin-top"
              v-model.number="formData.marginTop"
              type="number"
              label="Top Margin (px)"
              min="0"
              max="100"
              suffix="px"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              id="margin-bottom"
              v-model.number="formData.marginBottom"
              type="number"
              label="Bottom Margin (px)"
              min="0"
              max="100"
              suffix="px"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              id="margin-left"
              v-model.number="formData.marginLeft"
              type="number"
              label="Left Margin (px)"
              min="0"
              max="100"
              suffix="px"
              variant="outlined"
              density="compact"
            />
          </v-col>

          <v-col cols="12" md="6">
            <v-text-field
              id="margin-right"
              v-model.number="formData.marginRight"
              type="number"
              label="Right Margin (px)"
              min="0"
              max="100"
              suffix="px"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Custom Content -->
      <div class="form-section">
        <h4 class="section-title">Custom Content</h4>

        <v-row>
          <v-col cols="12">
            <v-textarea
              id="custom-header"
              v-model="formData.customHeader"
              label="Custom Header Text"
              placeholder="Custom header content..."
              rows="3"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-textarea
              id="custom-footer"
              v-model="formData.customFooter"
              label="Custom Footer Text"
              placeholder="Custom footer content..."
              rows="3"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-textarea
              id="terms-conditions"
              v-model="formData.termsAndConditions"
              label="Terms and Conditions"
              placeholder="Terms and conditions..."
              rows="4"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-textarea
              id="payment-instructions"
              v-model="formData.paymentInstructions"
              label="Payment Instructions"
              placeholder="Payment instructions..."
              rows="3"
              variant="outlined"
              density="compact"
            />
          </v-col>
        </v-row>
      </div>
        </v-form>
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <div class="dialog-footer">
        <v-btn
          variant="outlined"
          @click="handleCancel"
        >
          Cancel
        </v-btn>
        <v-btn
          variant="outlined"
          color="info"
          @click="handlePreview"
          :disabled="!isFormValid"
        >
          Preview
        </v-btn>
        <v-btn
          color="primary"
          @click="handleSubmit"
          :loading="saving"
          :disabled="!isFormValid"
        >
          {{ isEditing ? 'Update Template' : 'Create Template' }}
        </v-btn>
      </div>
    </v-card-actions>
  </v-card>
</v-dialog>
</template>

<script setup lang="ts">
import type { DocumentTemplate, DocumentTemplateCreateRequest } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { templatesApi } from "../../services/api"
import { useSnackbar } from "../../composables/useSnackbar"
import LogoUploader from "./LogoUploader.vue"
import ColorPicker from "primevue/colorpicker"

interface Props {
  visible: boolean
  template?: DocumentTemplate | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  "update:visible": [visible: boolean]
  saved: []
}>()

// Reactive state
const formRef = ref()
const saving = ref(false)
const errors = ref<Record<string, string>>({})

// Form data
const formData = ref<DocumentTemplateCreateRequest>({
  name: "",
  type: "quote",
  companyName: "",
  companyAddress: {
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  },
  companyEmail: "",
  companyPhone: "",
  companyWebsite: "",
  taxNumber: "",
  vatNumber: "",
  siretNumber: "",
  registrationNumber: "",
  logoPosition: "top_left",
  primaryColor: "",
  secondaryColor: "",
  headerHeight: 80,
  footerHeight: 60,
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 15,
  marginRight: 15,
  customHeader: "",
  customFooter: "",
  termsAndConditions: "",
  paymentInstructions: "",
  htmlTemplate: "",
  styles: "",
})

// Options
const templateTypeOptions = [
  { label: "Quote Template", value: "quote" },
  { label: "Invoice Template", value: "invoice" },
  { label: "Both Quote & Invoice", value: "both" },
]

const logoPositionOptions = [
  { label: "Top Left", value: "top_left" },
  { label: "Top Center", value: "top_center" },
  { label: "Top Right", value: "top_right" },
  { label: "Header Left", value: "header_left" },
  { label: "Header Right", value: "header_right" },
]

// Notification system
const { showSnackbar } = useSnackbar()

// Computed properties
const isEditing = computed(() => !!props.template)

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() !== "" &&
    formData.value.type !== "" &&
    formData.value.companyName.trim() !== "" &&
    formData.value.companyAddress.street.trim() !== "" &&
    formData.value.companyAddress.city.trim() !== "" &&
    formData.value.companyAddress.state.trim() !== "" &&
    formData.value.companyAddress.zipCode.trim() !== "" &&
    formData.value.companyAddress.country.trim() !== ""
  )
})

// Reset form
const resetForm = () => {
  formData.value = {
    name: "",
    type: "quote",
    companyName: "",
    companyAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    companyEmail: "",
    companyPhone: "",
    companyWebsite: "",
    taxNumber: "",
    vatNumber: "",
    siretNumber: "",
    registrationNumber: "",
    logoPosition: "top_left",
    primaryColor: "",
    secondaryColor: "",
    headerHeight: 80,
    footerHeight: 60,
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 15,
    marginRight: 15,
    customHeader: "",
    customFooter: "",
    termsAndConditions: "",
    paymentInstructions: "",
    htmlTemplate: "",
    styles: "",
  }
  errors.value = {}
}

// Watch for template changes
watch(
  () => props.template,
  (newTemplate) => {
    if (newTemplate) {
      loadTemplateData(newTemplate)
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Load template data for editing
const loadTemplateData = (template: DocumentTemplate) => {
  formData.value = {
    name: template.name,
    type: template.type,
    companyName: template.companyName,
    companyAddress: { ...template.companyAddress },
    companyEmail: template.companyEmail || "",
    companyPhone: template.companyPhone || "",
    companyWebsite: template.companyWebsite || "",
    taxNumber: template.taxNumber || "",
    vatNumber: template.vatNumber || "",
    siretNumber: template.siretNumber || "",
    registrationNumber: template.registrationNumber || "",
    logoPosition: template.logoPosition,
    primaryColor: template.primaryColor || "",
    secondaryColor: template.secondaryColor || "",
    headerHeight: template.headerHeight,
    footerHeight: template.footerHeight,
    marginTop: template.marginTop,
    marginBottom: template.marginBottom,
    marginLeft: template.marginLeft,
    marginRight: template.marginRight,
    customHeader: template.customHeader || "",
    customFooter: template.customFooter || "",
    termsAndConditions: template.termsAndConditions || "",
    paymentInstructions: template.paymentInstructions || "",
    htmlTemplate: template.htmlTemplate || "",
    styles: template.styles || "",
  }
}

// Validate form
const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.value.name.trim()) {
    newErrors.name = "Template name is required"
  }

  if (!formData.value.type) {
    newErrors.type = "Template type is required"
  }

  if (!formData.value.companyName.trim()) {
    newErrors.companyName = "Company name is required"
  }

  if (
    formData.value.companyEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.companyEmail)
  ) {
    newErrors.companyEmail = "Invalid email format"
  }

  if (
    formData.value.companyWebsite &&
    !/^https?:\/\/.+/.test(formData.value.companyWebsite)
  ) {
    newErrors.companyWebsite = "Website must start with http:// or https://"
  }

  if (!formData.value.companyAddress.street.trim()) {
    newErrors["companyAddress.street"] = "Street address is required"
  }

  if (!formData.value.companyAddress.city.trim()) {
    newErrors["companyAddress.city"] = "City is required"
  }

  if (!formData.value.companyAddress.state.trim()) {
    newErrors["companyAddress.state"] = "State is required"
  }

  if (!formData.value.companyAddress.zipCode.trim()) {
    newErrors["companyAddress.zipCode"] = "ZIP code is required"
  }

  if (!formData.value.companyAddress.country.trim()) {
    newErrors["companyAddress.country"] = "Country is required"
  }

  if (
    formData.value.primaryColor &&
    !/^#[0-9A-F]{6}$/i.test(formData.value.primaryColor)
  ) {
    newErrors.primaryColor = "Invalid color format"
  }

  if (
    formData.value.secondaryColor &&
    !/^#[0-9A-F]{6}$/i.test(formData.value.secondaryColor)
  ) {
    newErrors.secondaryColor = "Invalid color format"
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

// Handle logo upload
const handleLogoUpload = (logoUrl: string) => {
  formData.value.logoUrl = logoUrl
}

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    saving.value = true

    if (isEditing.value && props.template) {
      await templatesApi.update(props.template.id, formData.value)
      showSnackbar("Template updated successfully", "success")
    } else {
      await templatesApi.create(formData.value)
      showSnackbar("Template created successfully", "success")
    }

    emit("saved")
  } catch (error) {
    console.error("Failed to save template:", error)
    showSnackbar("Failed to save template", "error")
  } finally {
    saving.value = false
  }
}

// Handle preview
const handlePreview = async () => {
  if (!validateForm()) {
    return
  }

  try {
    // Create a temporary template for preview
    const previewData = { ...formData.value }
    // Open preview in new window/tab
    // This would be implemented based on the preview functionality
    console.log("Preview template:", previewData)

    showSnackbar("Preview functionality coming soon", "info")
  } catch (error) {
    console.error("Failed to preview template:", error)
    showSnackbar("Failed to preview template", "error")
  }
}

// Handle cancel
const handleCancel = () => {
  emit("update:visible", false)
  resetForm()
}

// Initialize form when component mounts
onMounted(() => {
  if (props.template) {
    loadTemplateData(props.template)
  }
})
</script>

<style scoped>
.template-form-dialog {
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
}

.template-form {
  max-height: 70vh;
  overflow-y: auto;
  padding: 1rem 0;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--surface-border);
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1.125rem;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-row:last-child {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  color: var(--text-color);
  font-size: 0.875rem;
}

.address-section {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--surface-50);
  border-radius: 6px;
  border: 1px solid var(--surface-border);
}

.address-section h5 {
  margin: 0 0 1rem 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 0 0 0;
  border-top: 1px solid var(--surface-border);
}

.p-error {
  color: var(--red-500);
  font-size: 0.75rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .template-form-dialog {
    width: 95vw;
    max-height: 95vh;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .dialog-footer {
    flex-direction: column-reverse;
  }

  .dialog-footer .v-btn {
    width: 100%;
  }
}
</style>
