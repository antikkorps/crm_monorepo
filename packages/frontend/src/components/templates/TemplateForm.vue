<template>
  <Dialog
    :visible="visible"
    :modal="true"
    :closable="true"
    :draggable="false"
    class="template-form-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <h3>{{ isEditing ? "Edit Template" : "Create New Template" }}</h3>
    </template>

    <form @submit.prevent="handleSubmit" class="template-form">
      <!-- Basic Information -->
      <div class="form-section">
        <h4 class="section-title">Basic Information</h4>

        <div class="form-row">
          <div class="form-group">
            <label for="template-name">Template Name *</label>
            <InputText
              id="template-name"
              v-model="formData.name"
              placeholder="Enter template name"
              :class="{ 'p-invalid': errors.name }"
              required
            />
            <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
          </div>

          <div class="form-group">
            <label for="template-type">Template Type *</label>
            <Dropdown
              id="template-type"
              v-model="formData.type"
              :options="templateTypeOptions"
              option-label="label"
              option-value="value"
              placeholder="Select template type"
              :class="{ 'p-invalid': errors.type }"
              required
            />
            <small v-if="errors.type" class="p-error">{{ errors.type }}</small>
          </div>
        </div>
      </div>

      <!-- Company Information -->
      <div class="form-section">
        <h4 class="section-title">Company Information</h4>

        <div class="form-row">
          <div class="form-group full-width">
            <label for="company-name">Company Name *</label>
            <InputText
              id="company-name"
              v-model="formData.companyName"
              placeholder="Enter company name"
              :class="{ 'p-invalid': errors.companyName }"
              required
            />
            <small v-if="errors.companyName" class="p-error">{{
              errors.companyName
            }}</small>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="company-email">Email</label>
            <InputText
              id="company-email"
              v-model="formData.companyEmail"
              type="email"
              placeholder="company@example.com"
              :class="{ 'p-invalid': errors.companyEmail }"
            />
            <small v-if="errors.companyEmail" class="p-error">{{
              errors.companyEmail
            }}</small>
          </div>

          <div class="form-group">
            <label for="company-phone">Phone</label>
            <InputText
              id="company-phone"
              v-model="formData.companyPhone"
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group full-width">
            <label for="company-website">Website</label>
            <InputText
              id="company-website"
              v-model="formData.companyWebsite"
              placeholder="https://www.company.com"
              :class="{ 'p-invalid': errors.companyWebsite }"
            />
            <small v-if="errors.companyWebsite" class="p-error">{{
              errors.companyWebsite
            }}</small>
          </div>
        </div>

        <!-- Address -->
        <div class="address-section">
          <h5>Company Address *</h5>
          <div class="form-row">
            <div class="form-group full-width">
              <label for="address-street">Street Address</label>
              <InputText
                id="address-street"
                v-model="formData.companyAddress.street"
                placeholder="123 Business Street"
                :class="{ 'p-invalid': errors['companyAddress.street'] }"
                required
              />
              <small v-if="errors['companyAddress.street']" class="p-error">
                {{ errors["companyAddress.street"] }}
              </small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="address-city">City</label>
              <InputText
                id="address-city"
                v-model="formData.companyAddress.city"
                placeholder="Business City"
                :class="{ 'p-invalid': errors['companyAddress.city'] }"
                required
              />
              <small v-if="errors['companyAddress.city']" class="p-error">
                {{ errors["companyAddress.city"] }}
              </small>
            </div>

            <div class="form-group">
              <label for="address-state">State/Province</label>
              <InputText
                id="address-state"
                v-model="formData.companyAddress.state"
                placeholder="State"
                :class="{ 'p-invalid': errors['companyAddress.state'] }"
                required
              />
              <small v-if="errors['companyAddress.state']" class="p-error">
                {{ errors["companyAddress.state"] }}
              </small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="address-zip">ZIP/Postal Code</label>
              <InputText
                id="address-zip"
                v-model="formData.companyAddress.zipCode"
                placeholder="12345"
                :class="{ 'p-invalid': errors['companyAddress.zipCode'] }"
                required
              />
              <small v-if="errors['companyAddress.zipCode']" class="p-error">
                {{ errors["companyAddress.zipCode"] }}
              </small>
            </div>

            <div class="form-group">
              <label for="address-country">Country</label>
              <InputText
                id="address-country"
                v-model="formData.companyAddress.country"
                placeholder="United States"
                :class="{ 'p-invalid': errors['companyAddress.country'] }"
                required
              />
              <small v-if="errors['companyAddress.country']" class="p-error">
                {{ errors["companyAddress.country"] }}
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Legal Information -->
      <div class="form-section">
        <h4 class="section-title">Legal Information</h4>

        <div class="form-row">
          <div class="form-group">
            <label for="tax-number">Tax Number</label>
            <InputText
              id="tax-number"
              v-model="formData.taxNumber"
              placeholder="Tax ID"
            />
          </div>

          <div class="form-group">
            <label for="vat-number">VAT Number</label>
            <InputText
              id="vat-number"
              v-model="formData.vatNumber"
              placeholder="VAT ID"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="siret-number">SIRET Number</label>
            <InputText
              id="siret-number"
              v-model="formData.siretNumber"
              placeholder="SIRET"
            />
          </div>

          <div class="form-group">
            <label for="registration-number">Registration Number</label>
            <InputText
              id="registration-number"
              v-model="formData.registrationNumber"
              placeholder="Business Registration"
            />
          </div>
        </div>
      </div>

      <!-- Logo and Branding -->
      <div class="form-section">
        <h4 class="section-title">Logo and Branding</h4>

        <LogoUploader v-model:logo-url="formData.logoUrl" @upload="handleLogoUpload" />

        <div class="form-row">
          <div class="form-group">
            <label for="logo-position">Logo Position</label>
            <Dropdown
              id="logo-position"
              v-model="formData.logoPosition"
              :options="logoPositionOptions"
              option-label="label"
              option-value="value"
              placeholder="Select logo position"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="primary-color">Primary Color</label>
            <ColorPicker
              v-model="formData.primaryColor"
              format="hex"
              :class="{ 'p-invalid': errors.primaryColor }"
            />
            <small v-if="errors.primaryColor" class="p-error">{{
              errors.primaryColor
            }}</small>
          </div>

          <div class="form-group">
            <label for="secondary-color">Secondary Color</label>
            <ColorPicker
              v-model="formData.secondaryColor"
              format="hex"
              :class="{ 'p-invalid': errors.secondaryColor }"
            />
            <small v-if="errors.secondaryColor" class="p-error">{{
              errors.secondaryColor
            }}</small>
          </div>
        </div>
      </div>

      <!-- Layout Settings -->
      <div class="form-section">
        <h4 class="section-title">Layout Settings</h4>

        <div class="form-row">
          <div class="form-group">
            <label for="header-height">Header Height (px)</label>
            <InputNumber
              id="header-height"
              v-model="formData.headerHeight"
              :min="0"
              :max="200"
              suffix=" px"
            />
          </div>

          <div class="form-group">
            <label for="footer-height">Footer Height (px)</label>
            <InputNumber
              id="footer-height"
              v-model="formData.footerHeight"
              :min="0"
              :max="200"
              suffix=" px"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="margin-top">Top Margin (px)</label>
            <InputNumber
              id="margin-top"
              v-model="formData.marginTop"
              :min="0"
              :max="100"
              suffix=" px"
            />
          </div>

          <div class="form-group">
            <label for="margin-bottom">Bottom Margin (px)</label>
            <InputNumber
              id="margin-bottom"
              v-model="formData.marginBottom"
              :min="0"
              :max="100"
              suffix=" px"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="margin-left">Left Margin (px)</label>
            <InputNumber
              id="margin-left"
              v-model="formData.marginLeft"
              :min="0"
              :max="100"
              suffix=" px"
            />
          </div>

          <div class="form-group">
            <label for="margin-right">Right Margin (px)</label>
            <InputNumber
              id="margin-right"
              v-model="formData.marginRight"
              :min="0"
              :max="100"
              suffix=" px"
            />
          </div>
        </div>
      </div>

      <!-- Custom Content -->
      <div class="form-section">
        <h4 class="section-title">Custom Content</h4>

        <div class="form-row">
          <div class="form-group full-width">
            <label for="custom-header">Custom Header Text</label>
            <Textarea
              id="custom-header"
              v-model="formData.customHeader"
              placeholder="Custom header content..."
              rows="3"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group full-width">
            <label for="custom-footer">Custom Footer Text</label>
            <Textarea
              id="custom-footer"
              v-model="formData.customFooter"
              placeholder="Custom footer content..."
              rows="3"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group full-width">
            <label for="terms-conditions">Terms and Conditions</label>
            <Textarea
              id="terms-conditions"
              v-model="formData.termsAndConditions"
              placeholder="Terms and conditions..."
              rows="4"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group full-width">
            <label for="payment-instructions">Payment Instructions</label>
            <Textarea
              id="payment-instructions"
              v-model="formData.paymentInstructions"
              placeholder="Payment instructions..."
              rows="3"
            />
          </div>
        </div>
      </div>
    </form>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Cancel" severity="secondary" outlined @click="handleCancel" />
        <Button
          label="Preview"
          severity="info"
          outlined
          @click="handlePreview"
          :disabled="!isFormValid"
        />
        <Button
          :label="isEditing ? 'Update Template' : 'Create Template'"
          severity="primary"
          @click="handleSubmit"
          :loading="saving"
          :disabled="!isFormValid"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { DocumentTemplate, DocumentTemplateCreateRequest } from "@medical-crm/shared"
import Button from "primevue/button"
import Dialog from "primevue/dialog"
import Dropdown from "primevue/dropdown"
import InputText from "primevue/inputtext"
import Textarea from "primevue/textarea"
import { useToast } from "primevue/usetoast"
import { computed, onMounted, ref, watch } from "vue"
import { templatesApi } from "../../services/api"
import LogoUploader from "./LogoUploader.vue"

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

// Toast for notifications
const toast = useToast()

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
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Template updated successfully",
        life: 3000,
      })
    } else {
      await templatesApi.create(formData.value)
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Template created successfully",
        life: 3000,
      })
    }

    emit("saved")
  } catch (error) {
    console.error("Failed to save template:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to save template",
      life: 3000,
    })
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

    toast.add({
      severity: "info",
      summary: "Preview",
      detail: "Preview functionality coming soon",
      life: 3000,
    })
  } catch (error) {
    console.error("Failed to preview template:", error)
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to preview template",
      life: 3000,
    })
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

  .dialog-footer .p-button {
    width: 100%;
  }
}
</style>
