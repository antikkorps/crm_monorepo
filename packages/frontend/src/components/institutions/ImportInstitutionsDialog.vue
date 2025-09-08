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
        {{ t('institutions.importInstitutions') }}
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
          <p class="text-600 mb-2">{{ t('institutions.importFromCSV') }}</p>
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
            <v-col cols="12" sm="4" class="d-flex" :class="isMobile ? 'justify-start' : 'justify-end'">
              <v-btn :block="isMobile" variant="text" :loading="downloading" @click="downloadTemplate">
                <v-icon start>mdi-download</v-icon>{{ t('institutions.downloadTemplate') }}
              </v-btn>
            </v-col>
          </v-row>
          <p class="text-caption mt-2">
            {{ t('institutions.importCsvHintMultipleContacts') }}
          </p>
        </div>

        <div class="mb-2">
          <div class="text-subtitle-2 mb-1">{{ t('institutions.duplicateHandling') }}</div>
          <v-radio-group v-model="duplicateMode" density="comfortable">
            <v-radio :label="t('institutions.duplicateModes.ignore')" value="ignore" />
            <v-radio :label="t('institutions.duplicateModes.merge')" value="merge" />
            <v-radio :label="t('institutions.duplicateModes.allow')" value="allow" />
          </v-radio-group>
          <div class="text-caption text-medium-emphasis">{{ t('institutions.duplicateHint') }}</div>
        </div>

        <div v-if="validation" class="mb-4">
          <v-alert :type="validation.isValid ? 'success' : 'warning'" variant="tonal" class="mb-2">
            <div class="d-flex justify-space-between align-center">
              <span>
                {{ t('institutions.validationSummary', { total: validation.totalRows, errors: validation.errors.length, duplicates: validation.duplicatesFound }) }}
              </span>
              <v-btn v-if="!validation.isValid" size="small" variant="text" @click="showErrors = !showErrors">
                <v-icon start>mdi-alert-circle</v-icon>{{ showErrors ? t('institutions.hideErrors') : t('institutions.showErrors') }}
              </v-btn>
            </div>
          </v-alert>

          <div v-if="showErrors && validation.errors.length" class="error-list">
            <div v-for="(e, idx) in validation.errors" :key="idx" class="error-item">
              <v-icon color="warning" size="18" class="mr-1">mdi-alert</v-icon>
              <span>#{{ e.row }} - {{ e.field ? e.field + ': ' : '' }}{{ e.message }}</span>
            </div>
          </div>
        </div>

        <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-2">{{ errorMessage }}</v-alert>

        <div v-if="result" class="mb-2">
          <v-alert :type="result.success ? 'success' : 'warning'" variant="tonal">
            {{ t('institutions.importResultSummary', {
              total: result.totalRows,
              ok: result.successfulImports,
              ko: result.failedImports,
              duplicates: result.duplicatesFound
            }) }}
          </v-alert>
        </div>
      </v-card-text>
      <v-card-actions>
        <template v-if="isMobile">
          <div class="d-flex flex-column w-100 gap-2">
            <v-btn class="w-100" variant="text" @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
            <v-btn class="w-100" :disabled="!file" variant="tonal" :loading="validating" @click="validate">
              <v-icon start>mdi-spellcheck</v-icon>{{ t('institutions.validate') }}
            </v-btn>
            <v-btn class="w-100" color="primary" :disabled="!file" :loading="importing" @click="doImport">
              <v-icon start>mdi-upload</v-icon>{{ t('institutions.startImport') }}
            </v-btn>
          </div>
        </template>
        <template v-else>
          <v-spacer />
          <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
          <v-btn :disabled="!file" variant="text" :loading="validating" @click="validate">
            <v-icon start>mdi-spellcheck</v-icon>{{ t('institutions.validate') }}
          </v-btn>
          <v-btn color="primary" :disabled="!file" :loading="importing" @click="doImport">
            <v-icon start>mdi-upload</v-icon>{{ t('institutions.startImport') }}
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { institutionsApi } from '@/services/api'
import { useDisplay } from 'vuetify'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'completed'])
const { t } = useI18n()

const file = ref<File | null>(null)
const validating = ref(false)
const importing = ref(false)
const downloading = ref(false)
const showErrors = ref(false)
const errorMessage = ref('')

const validation = ref<null | { isValid: boolean; totalRows: number; errors: Array<{ row: number; field?: string; message: string }>; duplicatesFound: number }>(null)
const result = ref<any>(null)

const options = ref({ skipDuplicates: true, mergeDuplicates: false })
const duplicateMode = ref<'ignore' | 'merge' | 'allow'>('ignore')

const { smAndDown } = useDisplay()
const isMobile = smAndDown

const downloadTemplate = async () => {
  try {
    downloading.value = true
    const blob = await institutionsApi.downloadImportTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'medical_institutions_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    errorMessage.value = e?.message || 'Failed to download template'
  } finally {
    downloading.value = false
  }
}

const validate = async () => {
  if (!file.value) return
  errorMessage.value = ''
  result.value = null
  try {
    validating.value = true
    const res: any = await institutionsApi.validateCsv(file.value)
    const data = res?.data || res
    validation.value = {
      isValid: Boolean(data?.isValid),
      totalRows: Number(data?.totalRows || 0),
      errors: Array.isArray(data?.errors) ? data.errors : [],
      duplicatesFound: Number(data?.duplicatesFound || 0),
    }
    showErrors.value = !validation.value.isValid
  } catch (e: any) {
    errorMessage.value = e?.message || 'Validation failed'
  } finally {
    validating.value = false
  }
}

const doImport = async () => {
  if (!file.value) return
  errorMessage.value = ''
  validation.value = null
  try {
    importing.value = true
    // Map selected mode to API options
    const mode = duplicateMode.value
    const res: any = await institutionsApi.importCsv(file.value, {
      skipDuplicates: mode === 'ignore',
      mergeDuplicates: mode === 'merge',
    })
    result.value = res?.data || res
    if (result.value?.success) {
      emit('completed')
    }
  } catch (e: any) {
    errorMessage.value = e?.message || 'Import failed'
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.error-list {
  max-height: 200px;
  overflow: auto;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  padding: 8px;
}
.error-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
</style>
