<template>
  <div class="name-filter">
    <v-text-field
      v-model="filterValue"
      :label="$t('segmentation.filters.name.label')"
      :placeholder="$t('segmentation.filters.name.placeholder')"
      variant="outlined"
      density="compact"
      :rules="valueRules"
      @keyup.enter="addFilter"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!filterValue.trim()"
      class="mt-2"
    >
      <v-icon start>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
const filterValue = ref('')

// Computed
const valueRules = computed(() => [
  (v: string) => !!v.trim() || t('validation.required'),
  (v: string) => v.length >= 2 || t('validation.minLength', { min: 2 })
])

// Methods
const addFilter = () => {
  if (!filterValue.value.trim()) return

  emit('add-filter', {
    type: 'institution',
    field: 'name',
    operator: 'contains',
    value: filterValue.value.trim(),
    label: `${t('segmentation.filters.name.label')}: ${filterValue.value.trim()}`,
    group: 'institution'
  })

  filterValue.value = ''
}
</script>
