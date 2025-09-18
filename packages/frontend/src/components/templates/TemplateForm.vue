<template>
  <v-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    max-width="1400"
    persistent
    fullscreen-mobile
  >
    <v-card class="template-form-card">
      <v-card-title class="d-flex align-center pa-4">
        <v-icon class="mr-3" color="primary">mdi-file-document-edit</v-icon>
        <div class="flex-grow-1">
          <div class="text-h6">
            {{ isEditing ? "Edit Template" : "Create New Template" }}
          </div>
          <div class="text-caption text-medium-emphasis">
            Configure your document template settings
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Navigation tabs -->
        <v-tabs
          v-model="activeTab"
          show-arrows
          class="border-b"
          @update:model-value="handleTabChange"
        >
          <v-tab value="form" class="flex-grow-1">
            <v-icon start>mdi-form-select</v-icon>
            <span class="d-none d-sm-inline">Template </span>Form
          </v-tab>
          <v-tab value="preview" :disabled="!canPreview" class="flex-grow-1">
            <v-icon start>mdi-eye</v-icon>
            <span class="d-none d-sm-inline">Live </span>Preview
          </v-tab>
        </v-tabs>

        <!-- Tab content -->
        <v-window v-model="activeTab" class="template-form-window">
          <!-- Form tab -->
          <v-window-item value="form" class="form-tab-content">
            <v-form @submit.prevent="handleSubmit" ref="formRef" class="pa-4">
              <div class="text-caption text-medium-emphasis mb-4">
                Fields marked with <span class="required-asterisk">*</span> are required.
              </div>
              <!-- Basic Information -->
              <div class="form-section mb-6">
                <v-card variant="tonal" class="section-card pa-4">
                  <div class="d-flex align-center mb-4">
                    <v-icon class="mr-3" color="primary">mdi-information</v-icon>
                    <h4 class="section-title">Basic Information</h4>
                  </div>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.name"
                        label="Template Name *"
                        placeholder="Enter template name"
                        variant="outlined"
                        density="compact"
                        :error-messages="errors.name"
                        hint="Used to identify this template"
                        persistent-hint
                        :rules="[
                          (v) =>
                            !!(v && v.toString().trim()) || 'Template Name is required',
                        ]"
                        required
                      />
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-select
                        v-model="formData.type"
                        :items="templateTypeOptions"
                        item-title="label"
                        item-value="value"
                        label="Template Type *"
                        placeholder="Select template type"
                        variant="outlined"
                        density="compact"
                        :error-messages="errors.type"
                        hint="Quote, invoice, or both"
                        persistent-hint
                        :rules="[(v) => !!v || 'Template Type is required']"
                        required
                      />
                    </v-col>
                  </v-row>
                </v-card>
              </div>

              <!-- Company Information -->
              <div class="form-section">
                <v-card variant="tonal" class="section-card pa-4">
                  <div class="d-flex align-center mb-4">
                    <v-icon class="mr-3" color="primary">mdi-domain</v-icon>
                    <h4 class="section-title">Company Information</h4>
                  </div>

                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        id="company-name"
                        v-model="formData.companyName"
                        label="Company Name *"
                        placeholder="Enter company name"
                        :error-messages="errors.companyName"
                        hint="Shown in the document header"
                        persistent-hint
                        :rules="[
                          (v) =>
                            !!(v && v.toString().trim()) || 'Company Name is required',
                        ]"
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
                        :rules="[emailRule]"
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
                        hint="Must start with http(s)"
                        persistent-hint
                        :rules="[urlRule]"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>
                  </v-row>

                  <!-- Address -->
                  <div class="address-section">
                    <div class="d-flex align-center mb-3">
                      <v-icon class="mr-2" size="small">mdi-map-marker</v-icon>
                      <h5>Company Address</h5>
                    </div>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          id="address-street"
                          v-model="formData.companyAddress.street"
                          label="Street Address *"
                          placeholder="123 Business Street"
                          :error-messages="errors['companyAddress.street']"
                          :rules="[
                            (v) =>
                              !!(v && v.toString().trim()) ||
                              'Street Address is required',
                          ]"
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
                          label="City *"
                          placeholder="Business City"
                          :error-messages="errors['companyAddress.city']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || 'City is required',
                          ]"
                          required
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          id="address-state"
                          v-model="formData.companyAddress.state"
                          label="State/Province *"
                          placeholder="State"
                          :error-messages="errors['companyAddress.state']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || 'State is required',
                          ]"
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
                          label="ZIP/Postal Code *"
                          placeholder="12345"
                          :error-messages="errors['companyAddress.zipCode']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || 'ZIP code is required',
                          ]"
                          required
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>

                      <v-col cols="12" md="6">
                        <v-text-field
                          id="address-country"
                          v-model="formData.companyAddress.country"
                          label="Country *"
                          placeholder="United States"
                          :error-messages="errors['companyAddress.country']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || 'Country is required',
                          ]"
                          required
                          variant="outlined"
                          density="compact"
                        />
                      </v-col>
                    </v-row>
                  </div>
                </v-card>
              </div>

              <!-- Legal Information -->
              <div class="form-section">
                <v-card variant="tonal" class="section-card pa-4">
                  <div class="d-flex align-center mb-4">
                    <v-icon class="mr-3" color="primary">mdi-file-document</v-icon>
                    <h4 class="section-title">Legal Information</h4>
                  </div>

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
                </v-card>
              </div>

              <!-- Logo and Branding -->
              <div class="form-section">
                <v-card variant="tonal" class="section-card pa-4">
                  <div class="d-flex align-center mb-4">
                    <v-icon class="mr-3" color="primary">mdi-palette</v-icon>
                    <h4 class="section-title">Logo and Branding</h4>
                  </div>

                  <LogoUploader
                    v-model:logo-url="formData.logoUrl"
                    @upload="handleLogoUpload"
                  />

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
                        :disabled="!formData.logoUrl"
                      />
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-select
                        id="logo-size"
                        v-model="formData.logoSize"
                        :items="logoSizeOptions"
                        item-title="label"
                        item-value="value"
                        label="Logo Size"
                        placeholder="Select logo size"
                        variant="outlined"
                        density="compact"
                        :disabled="!formData.logoUrl"
                      />
                    </v-col>
                  </v-row>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        :model-value="formData.primaryColor || '#000000'"
                        @update:model-value="(value) => (formData.primaryColor = value)"
                        label="Primary Color"
                        variant="outlined"
                        density="compact"
                        :error-messages="errors.primaryColor"
                        type="color"
                      />
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-text-field
                        :model-value="formData.secondaryColor || '#000000'"
                        @update:model-value="(value) => (formData.secondaryColor = value)"
                        label="Secondary Color"
                        variant="outlined"
                        density="compact"
                        :error-messages="errors.secondaryColor"
                        type="color"
                      />
                    </v-col>
                  </v-row>
                </v-card>
              </div>

              <!-- Layout Settings -->
              <div class="form-section">
                <v-card variant="tonal" class="section-card pa-4">
                  <div class="d-flex align-center mb-4">
                    <v-icon class="mr-3" color="primary">mdi-view-dashboard</v-icon>
                    <h4 class="section-title">Layout Settings</h4>
                  </div>

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
                </v-card>
              </div>

              <!-- Custom Content -->
              <div class="form-section">
                <v-card variant="tonal" class="section-card pa-4">
                  <div class="d-flex align-center mb-4">
                    <v-icon class="mr-3" color="primary">mdi-text-box</v-icon>
                    <h4 class="section-title">Custom Content</h4>
                  </div>

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
                </v-card>
              </div>

              <!-- Sticky quick-actions bar removed for a cleaner UI -->
            </v-form>
          </v-window-item>

          <!-- Preview tab -->
          <v-window-item value="preview" class="preview-tab-content">
            <div class="preview-header pa-4 border-b">
              <div class="d-flex align-center justify-space-between">
                <div class="d-flex align-center">
                  <v-icon class="mr-3" color="primary">mdi-eye</v-icon>
                  <div>
                    <h4 class="section-title mb-1">Live Preview</h4>
                    <div class="text-caption text-medium-emphasis">
                      See how your template will look
                    </div>
                  </div>
                </div>
                <div class="d-flex align-center gap-2">
                  <v-btn-toggle
                    v-model="previewDevice"
                    variant="outlined"
                    size="small"
                    density="compact"
                  >
                    <v-btn value="mobile" icon="mdi-cellphone" />
                    <v-btn value="desktop" icon="mdi-monitor" />
                  </v-btn-toggle>
                </div>
              </div>
            </div>

            <div class="preview-viewport pa-4">
              <div
                class="preview-frame"
                :class="{
                  'mobile-frame': previewDevice === 'mobile',
                  'desktop-frame': previewDevice === 'desktop',
                }"
              >
                <div v-if="canPreview" class="preview-document" :class="{ 'force-mobile': previewDevice === 'mobile' }">
                  <TemplatePreviewRenderer :template-data="formData" />
                </div>

                <div v-else class="preview-placeholder">
                  <v-icon size="64" color="grey-lighten-1" class="mb-4"
                    >mdi-file-document-outline</v-icon
                  >
                  <h4 class="mb-2">No Preview Available</h4>
                  <p class="mb-4">Fill out the form to see a preview</p>
                </div>
              </div>
            </div>
          </v-window-item>
        </v-window>

        <!-- Removed floating quick-save to avoid overlap with footer actions -->
      </v-card-text>

      <v-card-actions>
        <div class="dialog-footer">
          <v-btn variant="text" @click="handleCancel"> Cancel </v-btn>

          <v-spacer />

          <div class="action-buttons">
            <v-btn
              variant="outlined"
              color="info"
              prepend-icon="mdi-eye"
              @click="handlePreview"
              :disabled="!canPreview"
              class="d-none d-sm-flex"
            >
              Preview
            </v-btn>

            <v-btn
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-content-save"
              @click="handleSaveDraft"
              :loading="saving"
              :disabled="!canPreview"
            >
              <span class="d-none d-sm-inline">Save </span>Draft
            </v-btn>

            <v-btn
              color="primary"
              prepend-icon="mdi-check"
              @click="handleSubmit"
              :loading="saving"
              :disabled="!isFormValid"
            >
              {{ isEditing ? "Update" : "Create" }}
              <span class="d-none d-sm-inline"> Template</span>
            </v-btn>
          </div>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { DocumentTemplate, DocumentTemplateCreateRequest } from "@medical-crm/shared"
import { LogoPosition } from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { templatesApi } from "../../services/api"
import { useSnackbar } from "../../composables/useSnackbar"
import LogoUploader from "./LogoUploader.vue"
import TemplatePreviewRenderer from "./TemplatePreviewRenderer.vue"

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

// Preview state
const activeTab = ref("form")
const previewDevice = ref("desktop")

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
  logoUrl: "",
  logoPosition: "top_left",
  logoSize: "medium",
  primaryColor: "#3f51b5",
  secondaryColor: "#2196f3",
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
  { label: "Top Left", value: LogoPosition.TOP_LEFT },
  { label: "Top Center", value: LogoPosition.TOP_CENTER },
  { label: "Top Right", value: LogoPosition.TOP_RIGHT },
  { label: "Header Left", value: LogoPosition.HEADER_LEFT },
  { label: "Header Right", value: LogoPosition.HEADER_RIGHT },
]

const logoSizeOptions = [
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
]

// Notification system
const { showSnackbar } = useSnackbar()

// Computed properties
const isEditing = computed(() => !!props.template)

const canPreview = computed(() => {
  return formData.value?.name?.trim() !== "" && formData.value?.companyName?.trim() !== ""
})

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

// Field validation helpers (avoid complex regex in template)
const emailRule = (v: string) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Invalid email format"
const urlRule = (v: string) =>
  !v || /^https?:\/\/.+/.test(v) || "URL must start with http(s)"

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
    logoUrl: "",
    logoPosition: LogoPosition.HEADER_LEFT,
    logoSize: "medium",
    primaryColor: "#3f51b5",
    secondaryColor: "#2196f3",
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
    logoUrl: template.logoUrl || "",
    logoPosition: template.logoPosition,
    logoSize: template.logoSize || "medium",
    primaryColor: template.primaryColor || "#3f51b5",
    secondaryColor: template.secondaryColor || "#2196f3",
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

// Handle tab change
const handleTabChange = (newTab: string) => {
  // Tab change handled automatically by reactive preview
}

// Handle save draft (allow partial form; fill placeholders for required backend fields)
const handleSaveDraft = async () => {
  if (!canPreview.value) {
    showSnackbar("Please fill name and company before saving", "warning")
    return
  }

  try {
    saving.value = true

    const draftData = { ...formData.value }
    draftData.name = draftData.name || `Draft Template ${new Date().toLocaleString()}`
    draftData.type = draftData.type || "quote"
    if (!draftData.companyAddress) {
      draftData.companyAddress = {
        street: "",
        city: "",
        state: "",
        zipCode: "",
        country: "",
      }
    }
    draftData.companyAddress.street = draftData.companyAddress.street?.trim() || "—"
    draftData.companyAddress.city = draftData.companyAddress.city?.trim() || "—"
    draftData.companyAddress.state = draftData.companyAddress.state?.trim() || "—"
    draftData.companyAddress.zipCode = draftData.companyAddress.zipCode?.trim() || "—"
    draftData.companyAddress.country = draftData.companyAddress.country?.trim() || "—"

    // Remove empty optional strings to pass backend validators
    const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined)
    draftData.companyEmail = clean(draftData.companyEmail)
    draftData.companyWebsite = clean(draftData.companyWebsite)
    draftData.taxNumber = clean(draftData.taxNumber)
    draftData.vatNumber = clean(draftData.vatNumber)
    draftData.siretNumber = clean(draftData.siretNumber)
    draftData.registrationNumber = clean(draftData.registrationNumber)
    draftData.customHeader = clean(draftData.customHeader)
    draftData.customFooter = clean(draftData.customFooter)
    draftData.termsAndConditions = clean(draftData.termsAndConditions)
    draftData.paymentInstructions = clean(draftData.paymentInstructions)
    draftData.htmlTemplate = clean(draftData.htmlTemplate)
    draftData.styles = clean(draftData.styles)

    console.log("Saving draft data:", JSON.stringify(draftData, null, 2))

    if (isEditing.value && props.template) {
      await templatesApi.update(props.template.id, draftData)
      showSnackbar("Draft saved successfully", "success")
    } else {
      await templatesApi.create(draftData)
      showSnackbar("Draft saved successfully", "success")
    }

    emit("saved")
  } catch (error) {
    console.error("Failed to save draft:", error)
    showSnackbar("Failed to save draft", "error")
  } finally {
    saving.value = false
  }
}

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    showSnackbar("Please correct the errors before saving", "warning")
    return
  }

  try {
    saving.value = true

    // Clean template data - remove empty optional strings to pass backend validators
    const clean = (v?: string) => (v && v.trim() !== "" && v.trim() !== "—" ? v : undefined)

    // Clean address fields - use placeholders like in preview
    const cleanAddress = (addr: any) => {
      if (!addr) return addr
      return {
        street: addr.street && addr.street.trim() !== "" && addr.street.trim() !== "—" ? addr.street : "123 Main Street",
        city: addr.city && addr.city.trim() !== "" && addr.city.trim() !== "—" ? addr.city : "City",
        state: addr.state && addr.state.trim() !== "" && addr.state.trim() !== "—" ? addr.state : "State",
        zipCode: addr.zipCode && addr.zipCode.trim() !== "" && addr.zipCode.trim() !== "—" ? addr.zipCode : "12345",
        country: addr.country && addr.country.trim() !== "" && addr.country.trim() !== "—" ? addr.country : "Country"
      }
    }

    const templateData = {
      name: formData.value.name,
      type: formData.value.type,
      companyName: formData.value.companyName && formData.value.companyName.trim() !== "" && formData.value.companyName.trim() !== "—" ? formData.value.companyName : "Your Company",
      companyAddress: cleanAddress(formData.value.companyAddress),
      companyEmail: clean(formData.value.companyEmail),
      companyPhone: clean(formData.value.companyPhone),
      companyWebsite: clean(formData.value.companyWebsite),
      taxNumber: clean(formData.value.taxNumber),
      vatNumber: clean(formData.value.vatNumber),
      siretNumber: clean(formData.value.siretNumber),
      registrationNumber: clean(formData.value.registrationNumber),
      logoUrl: clean(formData.value.logoUrl),
      logoPosition: formData.value.logoPosition,
      logoSize: formData.value.logoSize,
      primaryColor: formData.value.primaryColor,
      secondaryColor: formData.value.secondaryColor,
      headerHeight: formData.value.headerHeight,
      footerHeight: formData.value.footerHeight,
      marginTop: formData.value.marginTop,
      marginBottom: formData.value.marginBottom,
      marginLeft: formData.value.marginLeft,
      marginRight: formData.value.marginRight,
      customHeader: clean(formData.value.customHeader),
      customFooter: clean(formData.value.customFooter),
      termsAndConditions: clean(formData.value.termsAndConditions),
      paymentInstructions: clean(formData.value.paymentInstructions),
      htmlTemplate: clean(formData.value.htmlTemplate),
      styles: clean(formData.value.styles),
    }

    console.log("Saving template data:", JSON.stringify(templateData, null, 2))

    if (isEditing.value && props.template) {
      await templatesApi.update(props.template.id, templateData)
      showSnackbar("Template updated successfully", "success")
    } else {
      await templatesApi.create(templateData)
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

// Handle preview (now just opens preview tab)
const handlePreview = () => {
  activeTab.value = "preview"
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

// Auto-refresh preview on changes when on preview tab (debounced)
let previewTimeout: ReturnType<typeof setTimeout> | null = null
watch(
  formData,
  () => {
    if (activeTab.value !== "preview" || !canPreview.value) return
    if (previewTimeout) clearTimeout(previewTimeout)
    previewTimeout = setTimeout(() => {
      updatePreview()
    }, 400)
  },
  { deep: true }
)
</script>

<style scoped>
.template-form-card {
  height: 90vh;
  display: flex;
  flex-direction: column;
}

.template-form-window {
  height: calc(90vh - 120px); /* Adjust for header and tabs */
  overflow: hidden;
}

.form-tab-content {
  height: 100%;
  overflow-y: auto;
}

.preview-tab-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  flex-shrink: 0;
}

.preview-viewport {
  flex: 1;
  overflow-y: auto;
  background: rgb(var(--v-theme-surface-variant));
  padding: 1rem;
}

.preview-frame {
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  transition: all 0.3s ease;
  max-width: 900px;
}

.desktop-frame {
  width: 100%;
  min-height: 700px;
}

.mobile-frame {
  width: 375px;
  max-width: calc(100% - 2rem);
  min-height: 600px;
}

.preview-loading,
.preview-error,
.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
  padding: 2rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.preview-error h4,
.preview-placeholder h4 {
  color: rgb(var(--v-theme-on-surface));
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.section-title {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1.125rem;
  font-weight: 600;
}

.address-section {
  margin-top: 1rem;
  padding: 1rem;
  background: transparent;
  border-radius: 8px;
  border: 1px dashed rgb(var(--v-theme-outline-variant));
}

.address-section h5 {
  margin: 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem;
  border-top: 1px solid rgb(var(--v-theme-outline-variant));
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.form-actions {
  display: none;
}

.form-status {
  min-width: 200px;
}

.status-missing,
.status-draft {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.missing-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  max-width: 300px;
}

.form-status .v-chip {
  font-weight: 600;
  text-transform: none;
}

.quick-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.fab-save {
  position: fixed !important;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
  transition: all 0.3s ease !important;
}

.fab-save:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2) !important;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .template-form-card {
    height: 100vh;
  }

  .template-form-window {
    height: calc(100vh - 120px);
  }

  .preview-viewport {
    padding: 0.5rem;
  }

  .preview-frame {
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .mobile-frame {
    width: 100%;
    max-width: none;
  }

  .preview-iframe {
    height: 500px;
  }

  .dialog-footer {
    flex-direction: column;
    gap: 1rem;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
    gap: 0.5rem;
  }

  .action-buttons .v-btn {
    width: 100%;
  }

  .form-actions .d-flex {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch !important;
  }

  .quick-actions {
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .quick-actions .v-btn {
    width: 100%;
  }

  .fab-save {
    bottom: 100px !important;
    right: 16px !important;
  }
}

/* Enhanced tabs styling */
.v-tab {
  text-transform: none !important;
  font-weight: 500;
}

.v-tab--selected {
  color: rgb(var(--v-theme-primary)) !important;
}

.required-asterisk {
  color: rgb(var(--v-theme-error));
}

.section-card {
  transition: box-shadow 0.2s ease, transform 0.1s ease;
}

.section-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

/* Force mobile styles in preview */
.preview-document.force-mobile :deep(.document) {
  padding: 15px;
}

.preview-document.force-mobile :deep(.top-logo-container) {
  padding: 15px;
  text-align: center !important;
}

.preview-document.force-mobile :deep(.top-logo-container .company-logo) {
  width: 60px !important;
  height: 60px !important;
}

.preview-document.force-mobile :deep(.header) {
  flex-direction: column;
  text-align: center;
  gap: 15px;
  padding: 20px 15px;
}

.preview-document.force-mobile :deep(.company-section) {
  flex-direction: column;
  text-align: center;
  gap: 15px;
}

.preview-document.force-mobile :deep(.company-section .company-logo) {
  width: 70px !important;
  height: 70px !important;
}

.preview-document.force-mobile :deep(.header-logo-right) {
  margin-left: 0;
  align-self: center;
}

.preview-document.force-mobile :deep(.document-info) {
  text-align: center;
}

.preview-document.force-mobile :deep(.header h1) {
  font-size: 1.8rem;
}

.preview-document.force-mobile :deep(.header h2) {
  font-size: 1.3rem;
}

.preview-document.force-mobile :deep(.company-details) {
  grid-template-columns: 1fr;
  gap: 15px;
  padding: 0 10px;
}

.preview-document.force-mobile :deep(.company-info),
.preview-document.force-mobile :deep(.client-info) {
  padding: 20px;
}

.preview-document.force-mobile :deep(.items-table) {
  font-size: 0.85rem;
}

.preview-document.force-mobile :deep(.items-table th),
.preview-document.force-mobile :deep(.items-table td) {
  padding: 10px 8px;
}

.preview-document.force-mobile :deep(.items-table th) {
  font-size: 0.8rem;
}

.preview-document.force-mobile :deep(.content) {
  padding: 0 10px;
}

.preview-document.force-mobile :deep(.total-section) {
  padding: 15px;
  margin: 20px 0;
}

.preview-document.force-mobile :deep(.total-line) {
  font-size: 0.9rem;
}

.preview-document.force-mobile :deep(.total-final) {
  font-size: 1.1rem;
}

.preview-document.force-mobile :deep(.footer-sections) {
  padding: 0 10px;
}

.preview-document.force-mobile :deep(.footer-section) {
  padding: 15px;
}

.preview-document.force-mobile :deep(.footer-section h4) {
  font-size: 1rem;
}

.preview-document.force-mobile :deep(.footer) {
  padding: 15px;
  font-size: 0.85rem;
}
</style>
