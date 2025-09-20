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
            {{ isEditing ? t('templates.editTemplate') : t('templates.createNewTemplate') }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ t('templates.configureSettings') }}
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
            <span class="d-none d-sm-inline">{{ t('templates.tabs.templateForm') }}</span><span class="d-sm-none">{{ t('templates.tabs.form') }}</span>
          </v-tab>
          <v-tab value="preview" :disabled="!canPreview" class="flex-grow-1">
            <v-icon start>mdi-eye</v-icon>
            <span class="d-none d-sm-inline">{{ t('templates.tabs.livePreview') }}</span><span class="d-sm-none">{{ t('templates.tabs.preview') }}</span>
          </v-tab>
        </v-tabs>

        <!-- Tab content -->
        <v-window v-model="activeTab" class="template-form-window">
          <!-- Form tab -->
          <v-window-item value="form" class="form-tab-content">
            <v-form @submit.prevent="handleSubmit" ref="formRef" class="pa-4">
              <div class="text-caption text-medium-emphasis mb-4">
                {{ t('templates.form.fieldsRequired') }} <span class="required-asterisk">*</span> {{ t('templates.form.areRequired') }}
              </div>
              <!-- Basic Information -->
              <div class="form-section mb-6">
                <v-card variant="tonal" class="section-card pa-4">
                  <div class="d-flex align-center mb-4">
                    <v-icon class="mr-3" color="primary">mdi-information</v-icon>
                    <h4 class="section-title">{{ t('templates.sections.basicInformation') }}</h4>
                  </div>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.name"
                        :label="t('templates.form.templateName')"
                        :placeholder="t('templates.form.templateNamePlaceholder')"
                        variant="outlined"
                        density="compact"
                        :error-messages="errors.name"
                        :hint="t('templates.form.templateNameHint')"
                        persistent-hint
                        :rules="[
                          (v) =>
                            !!(v && v.toString().trim()) || t('templates.form.templateNameRequired'),
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
                        :label="t('templates.form.templateType')"
                        :placeholder="t('templates.form.templateTypePlaceholder')"
                        variant="outlined"
                        density="compact"
                        :error-messages="errors.type"
                        :hint="t('templates.form.templateTypeHint')"
                        persistent-hint
                        :rules="[(v) => !!v || t('templates.form.templateTypeRequired')]"
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
                    <h4 class="section-title">{{ t('templates.sections.companyInformation') }}</h4>
                  </div>

                  <v-row>
                    <v-col cols="12">
                      <v-text-field
                        id="company-name"
                        v-model="formData.companyName"
                        :label="t('templates.form.companyName')"
                        :placeholder="t('templates.form.companyNamePlaceholder')"
                        :error-messages="errors.companyName"
                        :hint="t('templates.form.companyNameHint')"
                        persistent-hint
                        :rules="[
                          (v) =>
                            !!(v && v.toString().trim()) || t('templates.form.companyNameRequired'),
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
                        :label="t('templates.form.email')"
                        :placeholder="t('templates.form.emailPlaceholder')"
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
                        :label="t('templates.form.phone')"
                        :placeholder="t('templates.form.phonePlaceholder')"
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
                        :label="t('templates.form.website')"
                        :placeholder="t('templates.form.websitePlaceholder')"
                        :error-messages="errors.companyWebsite"
                        :hint="t('templates.form.websiteHint')"
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
                      <h5>{{ t('templates.sections.companyAddress') }}</h5>
                    </div>
                    <v-row>
                      <v-col cols="12">
                        <v-text-field
                          id="address-street"
                          v-model="formData.companyAddress.street"
                          :label="t('templates.form.streetAddress')"
                          :placeholder="t('templates.form.streetAddressPlaceholder')"
                          :error-messages="errors['companyAddress.street']"
                          :rules="[
                            (v) =>
                              !!(v && v.toString().trim()) ||
                              t('templates.form.streetAddressRequired'),
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
                          :label="t('templates.form.city')"
                          :placeholder="t('templates.form.cityPlaceholder')"
                          :error-messages="errors['companyAddress.city']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || t('templates.form.cityRequired'),
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
                          :label="t('templates.form.state')"
                          :placeholder="t('templates.form.statePlaceholder')"
                          :error-messages="errors['companyAddress.state']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || t('templates.form.stateRequired'),
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
                          :label="t('templates.form.zipCode')"
                          :placeholder="t('templates.form.zipCodePlaceholder')"
                          :error-messages="errors['companyAddress.zipCode']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || t('templates.form.zipCodeRequired'),
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
                          :label="t('templates.form.country')"
                          :placeholder="t('templates.form.countryPlaceholder')"
                          :error-messages="errors['companyAddress.country']"
                          :rules="[
                            (v) => !!(v && v.toString().trim()) || t('templates.form.countryRequired'),
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
                    <h4 class="section-title">{{ t('templates.sections.legalInformation') }}</h4>
                  </div>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        id="tax-number"
                        v-model="formData.taxNumber"
                        :label="t('templates.form.taxNumber')"
                        :placeholder="t('templates.form.taxNumberPlaceholder')"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-text-field
                        id="vat-number"
                        v-model="formData.vatNumber"
                        :label="t('templates.form.vatNumber')"
                        :placeholder="t('templates.form.vatNumberPlaceholder')"
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
                        :label="t('templates.form.siretNumber')"
                        :placeholder="t('templates.form.siretPlaceholder')"
                        variant="outlined"
                        density="compact"
                      />
                    </v-col>

                    <v-col cols="12" md="6">
                      <v-text-field
                        id="registration-number"
                        v-model="formData.registrationNumber"
                        :label="t('templates.form.registrationNumber')"
                        :placeholder="t('templates.form.registrationPlaceholder')"
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
                    <h4 class="section-title">{{ t('templates.sections.logoAndBranding') }}</h4>
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
                        :label="t('templates.form.logoPosition')"
                        :placeholder="t('templates.form.logoPositionPlaceholder')"
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
                        :label="t('templates.form.logoSize')"
                        :placeholder="t('templates.form.logoSizePlaceholder')"
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
                        :label="t('templates.form.primaryColor')"
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
                        :label="t('templates.form.secondaryColor')"
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
                    <h4 class="section-title">{{ t('templates.sections.layoutSettings') }}</h4>
                  </div>

                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        id="header-height"
                        v-model.number="formData.headerHeight"
                        type="number"
                        :label="t('templates.form.headerHeight')"
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
                        :label="t('templates.form.footerHeight')"
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
                        :label="t('templates.form.topMargin')"
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
                        :label="t('templates.form.bottomMargin')"
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
                        :label="t('templates.form.leftMargin')"
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
                        :label="t('templates.form.rightMargin')"
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
                    <h4 class="section-title">{{ t('templates.sections.customContent') }}</h4>
                  </div>

                  <v-row>
                    <v-col cols="12">
                      <v-textarea
                        id="custom-header"
                        v-model="formData.customHeader"
                        :label="t('templates.form.customHeader')"
                        :placeholder="t('templates.form.customHeaderPlaceholder')"
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
                        :label="t('templates.form.customFooter')"
                        :placeholder="t('templates.form.customFooterPlaceholder')"
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
                        :label="t('templates.form.termsAndConditions')"
                        :placeholder="t('templates.form.termsAndConditionsPlaceholder')"
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
                        :label="t('templates.form.paymentInstructions')"
                        :placeholder="t('templates.form.paymentInstructionsPlaceholder')"
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
                    <h4 class="section-title mb-1">{{ t('templates.preview.livePreview') }}</h4>
                    <div class="text-caption text-medium-emphasis">
                      {{ t('templates.preview.seeHowLooks') }}
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
                  <h4 class="mb-2">{{ t('templates.preview.noPreviewAvailable') }}</h4>
                  <p class="mb-4">{{ t('templates.preview.fillFormToPreview') }}</p>
                </div>
              </div>
            </div>
          </v-window-item>
        </v-window>

        <!-- Removed floating quick-save to avoid overlap with footer actions -->
      </v-card-text>

      <v-card-actions>
        <div class="dialog-footer">
          <v-btn variant="text" @click="handleCancel"> {{ t('common.cancel') }} </v-btn>

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
              {{ t('templates.actions.preview') }}
            </v-btn>

            <v-btn
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-content-save"
              @click="handleSaveDraft"
              :loading="saving"
              :disabled="!canPreview"
            >
              <span class="d-none d-sm-inline">{{ t('templates.actions.save') }} </span>{{ t('templates.actions.saveDraft') }}
            </v-btn>

            <v-btn
              color="primary"
              prepend-icon="mdi-check"
              @click="handleSubmit"
              :loading="saving"
              :disabled="!isFormValid"
            >
              {{ isEditing ? t('templates.actions.update') : t('templates.actions.create') }}
              <span class="d-none d-sm-inline"> {{ t('common.template') }}</span>
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
import { useI18n } from "vue-i18n"
import { templatesApi } from "../../services/api"
import { useSnackbar } from "../../composables/useSnackbar"
import LogoUploader from "./LogoUploader.vue"
import TemplatePreviewRenderer from "./TemplatePreviewRenderer.vue"

const { t } = useI18n()

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
const templateTypeOptions = computed(() => [
  { label: t("templates.types.quoteTemplate"), value: "quote" },
  { label: t("templates.types.invoiceTemplate"), value: "invoice" },
  { label: t("templates.types.bothQuoteInvoice"), value: "both" },
])

const logoPositionOptions = computed(() => [
  { label: t("templates.logoPositions.topLeft"), value: LogoPosition.TOP_LEFT },
  { label: t("templates.logoPositions.topCenter"), value: LogoPosition.TOP_CENTER },
  { label: t("templates.logoPositions.topRight"), value: LogoPosition.TOP_RIGHT },
  { label: t("templates.logoPositions.headerLeft"), value: LogoPosition.HEADER_LEFT },
  { label: t("templates.logoPositions.headerRight"), value: LogoPosition.HEADER_RIGHT },
])

const logoSizeOptions = computed(() => [
  { label: t("templates.logoSizes.small"), value: "small" },
  { label: t("templates.logoSizes.medium"), value: "medium" },
  { label: t("templates.logoSizes.large"), value: "large" },
])

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
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || t("templates.form.invalidEmailFormat")
const urlRule = (v: string) =>
  !v || /^https?:\/\/.+/.test(v) || t("templates.form.websiteValidation")

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
    newErrors.name = t("templates.validation.templateNameRequired")
  }

  if (!formData.value.type) {
    newErrors.type = t("templates.validation.templateTypeRequired")
  }

  if (!formData.value.companyName.trim()) {
    newErrors.companyName = t("templates.validation.companyNameRequired")
  }

  if (
    formData.value.companyEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.companyEmail)
  ) {
    newErrors.companyEmail = t("templates.validation.invalidEmailFormat")
  }

  if (
    formData.value.companyWebsite &&
    !/^https?:\/\/.+/.test(formData.value.companyWebsite)
  ) {
    newErrors.companyWebsite = t("templates.validation.websiteMustStartWithHttp")
  }

  if (!formData.value.companyAddress.street.trim()) {
    newErrors["companyAddress.street"] = t("templates.validation.streetAddressRequired")
  }

  if (!formData.value.companyAddress.city.trim()) {
    newErrors["companyAddress.city"] = t("templates.validation.cityRequired")
  }

  if (!formData.value.companyAddress.state.trim()) {
    newErrors["companyAddress.state"] = t("templates.validation.stateRequired")
  }

  if (!formData.value.companyAddress.zipCode.trim()) {
    newErrors["companyAddress.zipCode"] = t("templates.validation.zipCodeRequired")
  }

  if (!formData.value.companyAddress.country.trim()) {
    newErrors["companyAddress.country"] = t("templates.validation.countryRequired")
  }

  if (
    formData.value.primaryColor &&
    !/^#[0-9A-F]{6}$/i.test(formData.value.primaryColor)
  ) {
    newErrors.primaryColor = t("templates.validation.invalidColorFormat")
  }

  if (
    formData.value.secondaryColor &&
    !/^#[0-9A-F]{6}$/i.test(formData.value.secondaryColor)
  ) {
    newErrors.secondaryColor = t("templates.validation.invalidColorFormat")
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
    showSnackbar(t("templates.validation.fillNameAndCompanyBeforeSaving"), "warning")
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
      showSnackbar(t("templates.templateUpdated"), "success")
    } else {
      await templatesApi.create(draftData)
      showSnackbar(t("templates.templateCreated"), "success")
    }

    emit("saved")
  } catch (error) {
    console.error("Failed to save draft:", error)
    showSnackbar(t("templates.failedToSaveTemplate"), "error")
  } finally {
    saving.value = false
  }
}

// Handle form submission
const handleSubmit = async () => {
  if (!validateForm()) {
    showSnackbar(t("templates.validation.correctErrorsBeforeSaving"), "warning")
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
      showSnackbar(t("templates.templateUpdated"), "success")
    } else {
      await templatesApi.create(templateData)
      showSnackbar(t("templates.templateCreated"), "success")
    }

    emit("saved")
  } catch (error) {
    console.error("Failed to save template:", error)
    showSnackbar(t("templates.failedToSaveTemplate"), "error")
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
