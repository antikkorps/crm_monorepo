<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="isMobile"
    :max-width="isMobile ? '100%' : 720"
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="py-3 d-flex align-center">
        {{ t("institutions.importInstitutions") }}
        <v-spacer />
        <v-btn
          icon
          variant="text"
          aria-label="Close dialog"
          @click="$emit('update:modelValue', false)"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div class="mb-4">
          <p class="text-600 mb-2">{{ t("institutions.importFromCSV") }}</p>
          <v-row class="align-center" :class="isMobile ? 'gap-2' : ''">
            <v-col cols="12" sm="8">
              <v-file-input
                v-model="file"
                :label="t('institutions.chooseCsvFile')"
                accept=".csv,text/csv"
                prepend-icon="mdi-file-delimited"
                density="comfortable"
                variant="outlined"
                show-size
              />
            </v-col>
            <v-col
              cols="12"
              sm="4"
              class="d-flex"
              :class="isMobile ? 'justify-start' : 'justify-end'"
            >
              <v-btn
                :block="isMobile"
                variant="text"
                :loading="downloading"
                @click="downloadTemplate"
              >
                <v-icon start>mdi-download</v-icon
                >{{ t("institutions.downloadTemplate") }}
              </v-btn>
            </v-col>
          </v-row>
          <p class="text-caption mt-2">
            {{ t("institutions.importCsvHintMultipleContacts") }}
          </p>
        </div>

        <div class="mb-2">
          <div class="text-subtitle-2 mb-1">
            {{ t("institutions.duplicateHandling") }}
          </div>
          <v-radio-group v-model="duplicateMode" density="comfortable">
            <v-radio :label="t('institutions.duplicateModes.ignore')" value="ignore" />
            <v-radio :label="t('institutions.duplicateModes.merge')" value="merge" />
            <v-radio :label="t('institutions.duplicateModes.allow')" value="allow" />
          </v-radio-group>
          <div class="text-caption text-medium-emphasis">
            {{ t("institutions.duplicateHint") }}
          </div>
        </div>

        <!-- Preview Table -->
        <div v-if="preview" class="mb-4">
          <v-alert
            :type="preview.invalidRows === 0 ? 'success' : 'warning'"
            variant="tonal"
            class="mb-2"
          >
            <div class="d-flex justify-space-between align-center">
              <span>
                {{
                  t("institutions.validationSummary", {
                    total: preview.totalRows,
                    errors: preview.invalidRows,
                    duplicates: 0,
                  })
                }}
              </span>
              <v-btn
                v-if="preview.preview.length > 0"
                size="small"
                variant="text"
                @click="showPreview = !showPreview"
              >
                <v-icon start>mdi-table</v-icon
                >{{
                  showPreview
                    ? t("institutions.hideErrors")
                    : t("institutions.showErrors")
                }}
                {{ t("institutions.preview") }}
              </v-btn>
            </div>
          </v-alert>

          <div
            v-if="showPreview && preview.preview.length"
            class="preview-table mb-2"
            style="max-height: 400px; overflow: auto"
          >
            <v-table density="compact">
              <thead>
                <tr>
                  <th class="text-left">#</th>
                  <th class="text-left">
                    {{ t("institutions.tableHeaders.institution") }}
                  </th>
                  <th class="text-left">{{ t("institutions.city") }}</th>
                  <th class="text-center">{{ t("institutions.matching") }}</th>
                  <th class="text-center">{{ t("institutions.sage") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in preview.preview"
                  :key="row.rowNumber"
                  :class="{ 'bg-error-lighten-5': row.hasErrors }"
                >
                  <td>{{ row.rowNumber }}</td>
                  <td>
                    <div>{{ row.name }}</div>
                    <div
                      v-if="row.existingInstitutionName"
                      class="text-caption text-medium-emphasis"
                    >
                      → Existe: {{ row.existingInstitutionName }}
                    </div>
                  </td>
                  <td>{{ row.city }}</td>
                  <td class="text-center">
                    <v-chip
                      v-if="row.matchStatus === 'exact'"
                      size="small"
                      color="success"
                      variant="flat"
                    >
                      {{ t("institutions.exact") }}
                      <v-tooltip activator="parent" location="top">
                        {{
                          row.matchType === "accountingNumber"
                            ? t("institutions.byAccountingNumber")
                            : t("institutions.byNameAndAddress")
                        }}
                      </v-tooltip>
                    </v-chip>
                    <v-chip
                      v-else-if="row.matchStatus === 'fuzzy'"
                      size="small"
                      color="warning"
                      variant="flat"
                    >
                      {{ t("institutions.fuzzy") }} {{ row.matchConfidence }}%
                      <v-tooltip activator="parent" location="top">
                        {{ t("institutions.fuzzyMatchHint") }}
                      </v-tooltip>
                    </v-chip>
                    <v-chip v-else size="small" color="info" variant="flat">
                      {{ t("institutions.new") }}
                    </v-chip>
                  </td>
                  <td class="text-center">
                    <v-chip
                      v-if="row.sageStatus === 'linked'"
                      size="small"
                      color="success"
                      variant="tonal"
                    >
                      <v-icon start size="16">mdi-link</v-icon>{{ row.accountingNumber }}
                    </v-chip>
                    <v-chip v-else size="small" color="grey" variant="tonal">
                      <v-icon start size="16">mdi-link-off</v-icon>-
                    </v-chip>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div v-if="showErrors && preview.errors.length" class="error-list">
            <div v-for="(e, idx) in preview.errors" :key="idx" class="error-item">
              <v-icon color="warning" size="18" class="mr-1">mdi-alert</v-icon>
              <span
                >#{{ e.row }} - {{ e.field ? e.field + ": " : "" }}{{ e.message }}</span
              >
            </div>
          </div>
        </div>

        <!-- Sage Alert -->
        <v-alert
          v-if="hasAccountingNumbers"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          {{ t("institutions.sageAlert") }}
        </v-alert>

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-2">{{
          errorMessage
        }}</v-alert>

        <div v-if="result" class="mb-2">
          <v-alert :type="result.success ? 'success' : 'warning'" variant="tonal">
            <div class="text-subtitle-2 mb-2">
              {{ t("institutions.importResultTitle") }}
            </div>
            <div class="d-flex flex-column gap-1">
              <div>
                <v-icon size="small" class="mr-1">mdi-check-circle</v-icon>
                <strong>{{ result.successfulImports || 0 }}</strong>
                {{ t("institutions.imported") }} /
                <strong>{{ result.totalRows || 0 }}</strong> {{ t("common.total") }}
              </div>
              <div v-if="result.failedImports > 0" class="text-error">
                <v-icon size="small" class="mr-1">mdi-alert-circle</v-icon>
                <strong>{{ result.failedImports }}</strong> {{ t("institutions.errors") }}
              </div>
              <div v-if="result.duplicatesFound > 0">
                <v-icon size="small" class="mr-1">mdi-content-copy</v-icon>
                <strong>{{ result.duplicatesFound }}</strong>
                {{ t("institutions.duplicatesFound") }}
              </div>
              <div v-if="result.duplicatesMerged > 0">
                <v-icon size="small" class="mr-1">mdi-merge</v-icon>
                <strong>{{ result.duplicatesMerged }}</strong>
                {{ t("institutions.duplicatesMerged") }}
              </div>
            </div>
          </v-alert>
        </div>
      </v-card-text>
      <v-card-actions>
        <template v-if="isMobile">
          <div class="d-flex flex-column w-100 gap-2">
            <v-btn
              class="w-100"
              variant="text"
              @click="$emit('update:modelValue', false)"
              >{{ t("common.cancel") }}</v-btn
            >
            <v-btn
              class="w-100"
              :disabled="!file"
              variant="tonal"
              :loading="validating"
              @click="validate"
            >
              <v-icon start>mdi-spellcheck</v-icon>{{ t("institutions.validate") }}
            </v-btn>
            <v-btn
              class="w-100"
              color="primary"
              :disabled="!file"
              :loading="importing"
              @click="doImport"
            >
              <v-icon start>mdi-upload</v-icon>{{ t("institutions.startImport") }}
            </v-btn>
          </div>
        </template>
        <template v-else>
          <v-spacer />
          <v-btn variant="text" @click="$emit('update:modelValue', false)">{{
            t("common.cancel")
          }}</v-btn>
          <v-btn :disabled="!file" variant="text" :loading="validating" @click="validate">
            <v-icon start>mdi-spellcheck</v-icon>{{ t("institutions.validate") }}
          </v-btn>
          <v-btn color="primary" :disabled="!file" :loading="importing" @click="doImport">
            <v-icon start>mdi-upload</v-icon>{{ t("institutions.startImport") }}
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { institutionsApi } from "@/services/api"
import { useDisplay } from "vuetify"

interface PreviewRow {
  rowNumber: number
  name: string
  accountingNumber?: string
  city?: string
  matchStatus: "exact" | "fuzzy" | "none"
  matchConfidence?: number
  matchType?: string
  existingInstitutionId?: string
  existingInstitutionName?: string
  sageStatus: "linked" | "not_linked"
  hasErrors: boolean
  errors: Array<{ field?: string; message: string }>
}

interface PreviewData {
  totalRows: number
  validRows: number
  invalidRows: number
  preview: PreviewRow[]
  errors: Array<{ row: number; field?: string; message: string }>
}

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(["update:modelValue", "completed"])
const { t } = useI18n()

const file = ref<File | null>(null)
const validating = ref(false)
const importing = ref(false)
const downloading = ref(false)
const showErrors = ref(false)
const showPreview = ref(false)
const errorMessage = ref("")

const validation = ref<null | {
  isValid: boolean
  totalRows: number
  errors: Array<{ row: number; field?: string; message: string }>
  duplicatesFound: number
}>(null)
const preview = ref<PreviewData | null>(null)
const result = ref<any>(null)

const options = ref({ skipDuplicates: true, mergeDuplicates: false })
const duplicateMode = ref<"ignore" | "merge" | "allow">("ignore")

const { smAndDown } = useDisplay()
const isMobile = smAndDown

const hasAccountingNumbers = computed(
  () => preview.value?.preview.some((row) => !!row.accountingNumber) || false,
)

const downloadTemplate = async () => {
  try {
    downloading.value = true
    const blob = await institutionsApi.downloadImportTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "medical_institutions_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    errorMessage.value = e?.message || "Failed to download template"
  } finally {
    downloading.value = false
  }
}

const validate = async () => {
  if (!file.value) return
  errorMessage.value = ""
  result.value = null
  preview.value = null
  try {
    validating.value = true
    const res: any = await institutionsApi.previewCsv(file.value)
    const data = res?.data || res

    preview.value = {
      totalRows: Number(data?.totalRows || 0),
      validRows: Number(data?.validRows || 0),
      invalidRows: Number(data?.invalidRows || 0),
      preview: Array.isArray(data?.preview) ? data.preview : [],
      errors: Array.isArray(data?.errors) ? data.errors : [],
    }

    showPreview.value = true
    showErrors.value = preview.value.invalidRows > 0
  } catch (e: any) {
    errorMessage.value = e?.message || "Preview failed"
  } finally {
    validating.value = false
  }
}

const doImport = async () => {
  if (!file.value) return
  errorMessage.value = ""
  validation.value = null
  try {
    importing.value = true
    // Map selected mode to API options
    const mode = duplicateMode.value
    const res: any = await institutionsApi.importCsv(file.value, {
      skipDuplicates: mode === "ignore",
      mergeDuplicates: mode === "merge",
    })
    result.value = res?.data || res
    if (result.value?.success) {
      emit("completed")
    }
  } catch (e: any) {
    errorMessage.value = e?.message || "Import failed"
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.error-list {
  max-height: 200px;
  overflow: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 8px;
}
.error-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
</style>
