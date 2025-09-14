<template>
  <div class="type-filter">
    <v-select
      v-model="selectedTypes"
      :items="institutionTypeOptions"
      :label="$t('segmentation.filters.type.label')"
      :placeholder="$t('segmentation.filters.type.placeholder')"
      item-title="text"
      item-value="value"
      multiple
      outlined
      dense
      chips
      :rules="valueRules"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedTypes.length === 0"
      class="mt-2"
    >
      <v-icon left>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { InstitutionType } from '@medical-crm/shared'

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
const selectedTypes = ref<InstitutionType[]>([])

// Computed
const institutionTypeOptions = computed(() => [
  { text: t('institution.types.hospital'), value: InstitutionType.HOSPITAL },
  { text: t('institution.types.clinic'), value: InstitutionType.CLINIC },
  { text: t('institution.types.medicalCenter'), value: InstitutionType.MEDICAL_CENTER },
  { text: t('institution.types.specialtyClinic'), value: InstitutionType.SPECIALTY_CLINIC }
])

const valueRules = computed(() => [
  (v: InstitutionType[]) => v.length > 0 || t('validation.required')
])

// Methods
const addFilter = () => {
  if (selectedTypes.value.length === 0) return

  emit('add-filter', {
    type: 'institution',
    field: 'type',
    operator: 'in',
    value: selectedTypes.value,
    label: t('segmentation.filters.type.label'),
    group: 'institution'
  })

  selectedTypes.value = []
}
</script>
