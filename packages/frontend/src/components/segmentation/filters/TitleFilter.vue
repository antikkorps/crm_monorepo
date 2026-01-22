<template>
  <div class="title-filter">
    <v-autocomplete
      v-model="selectedTitles"
      :items="titleOptions"
      :label="$t('segmentation.filters.title.label')"
      item-title="label"
      item-value="value"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="loading"
      :no-data-text="$t('segmentation.filters.title.noData')"
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="selectedTitles.length === 0"
      class="mt-2"
    >
      <v-icon start>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { filterOptionsApi } from '@/services/api'

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
const titleOptions = ref<Array<{ value: string; label: string }>>([])
const loading = ref(false)

// Load titles from API
onMounted(async () => {
  try {
    loading.value = true
    const response = await filterOptionsApi.getContactTitles()
    titleOptions.value = (response.data || []).map((title: string) => ({
      value: title,
      label: title
    }))
  } catch (error) {
    console.error('Error loading titles:', error)
    titleOptions.value = []
  } finally {
    loading.value = false
  }
})

// Methods
const addFilter = () => {
  if (selectedTitles.value.length === 0) return

  const titleLabels = selectedTitles.value.map(title =>
    titleOptions.value.find(opt => opt.value === title)?.label || title
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
