<template>
  <div class="title-filter">
    <v-select
      v-model="selectedTitles"
      :items="titleOptions"
      :label="$t('segmentation.filters.title.label')"
      item-title="label"
      item-value="value"
      multiple
      chips
      outlined
      dense
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedTitles.length === 0"
      class="mt-2"
    >
      <v-icon left>mdi-plus</v-icon>
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
const selectedTitles = ref<string[]>([])

// Mock title data - in real implementation, this would come from API
const titleOptions = [
  { value: 'dr', label: t('segmentation.filters.title.titles.dr') },
  { value: 'prof', label: t('segmentation.filters.title.titles.prof') },
  { value: 'mr', label: t('segmentation.filters.title.titles.mr') },
  { value: 'mrs', label: t('segmentation.filters.title.titles.mrs') },
  { value: 'ms', label: t('segmentation.filters.title.titles.ms') },
  { value: 'rn', label: t('segmentation.filters.title.titles.rn') },
  { value: 'lpn', label: t('segmentation.filters.title.titles.lpn') },
  { value: 'pa', label: t('segmentation.filters.title.titles.pa') }
]

// Methods
const addFilter = () => {
  if (selectedTitles.value.length === 0) return

  const titleLabels = selectedTitles.value.map(title => 
    titleOptions.find(opt => opt.value === title)?.label || title
  ).join(', ')

  emit('add-filter', {
    type: 'contact',
    field: 'title',
    operator: 'in',
    value: selectedTitles.value,
    label: `${t('segmentation.filters.title.label')}: ${titleLabels}`,
    group: 'contact'
  })

  selectedTitles.value = []
}
</script>