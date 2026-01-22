<template>
  <div class="compliance-filter">
    <v-select
      v-model="complianceType"
      :items="complianceTypeOptions"
      :label="$t('segmentation.filters.compliance.type')"
      item-title="label"
      item-value="value"
      variant="outlined"
      density="compact"
      class="mb-3"
    />
    <v-select
      v-model="complianceStatus"
      :items="complianceStatusOptions"
      :label="$t('segmentation.filters.compliance.status')"
      item-title="label"
      item-value="value"
      variant="outlined"
      density="compact"
      class="mb-3"
      :disabled="!complianceType"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!complianceType || !complianceStatus"
      class="mt-2"
    >
      <v-icon start>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Props
interface Props {
  filterType: string
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'add-filter': [filter: { type: string; field: string; operator: string; value: any; label: string; group: string }]
}>()

// Reactive data
const complianceType = ref<string>('')
const complianceStatus = ref<string>('')

const complianceTypeOptions = [
  { value: 'hipaa', label: t('segmentation.filters.compliance.types.hipaa') },
  { value: 'gdpr', label: t('segmentation.filters.compliance.types.gdpr') },
  { value: 'sox', label: t('segmentation.filters.compliance.types.sox') },
  { value: 'iso27001', label: t('segmentation.filters.compliance.types.iso27001') }
]

const complianceStatusOptions = [
  { value: 'compliant', label: t('segmentation.filters.compliance.statuses.compliant'), color: 'success' },
  { value: 'non_compliant', label: t('segmentation.filters.compliance.statuses.nonCompliant'), color: 'error' },
  { value: 'pending', label: t('segmentation.filters.compliance.statuses.pending'), color: 'warning' },
  { value: 'expired', label: t('segmentation.filters.compliance.statuses.expired'), color: 'error' }
]

// Methods
const addFilter = () => {
  if (!complianceType.value || !complianceStatus.value) return

  const typeLabel = complianceTypeOptions.find(opt => opt.value === complianceType.value)?.label || complianceType.value
  const statusLabel = complianceStatusOptions.find(opt => opt.value === complianceStatus.value)?.label || complianceStatus.value

  emit('add-filter', {
    type: 'institution',
    field: `compliance_${complianceType.value}`,
    operator: 'equals',
    value: complianceStatus.value,
    label: `${t('segmentation.filters.compliance.label')} (${typeLabel}): ${statusLabel}`,
    group: 'institution'
  })

  complianceType.value = ''
  complianceStatus.value = ''
}
</script>
