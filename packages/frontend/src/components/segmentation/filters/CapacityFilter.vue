<template>
  <div class="capacity-filter">
    <v-row>
      <v-col cols="6">
        <v-text-field
          v-model.number="minCapacity"
          :label="$t('segmentation.filters.capacity.minCapacity')"
          type="number"
          variant="outlined"
          density="compact"
          class="mb-3"
          :min="0"
        />
      </v-col>
      <v-col cols="6">
        <v-text-field
          v-model.number="maxCapacity"
          :label="$t('segmentation.filters.capacity.maxCapacity')"
          type="number"
          variant="outlined"
          density="compact"
          class="mb-3"
          :min="minCapacity || 0"
        />
      </v-col>
    </v-row>
    <v-select
      v-model="capacityType"
      :items="capacityTypeOptions"
      :label="$t('segmentation.filters.capacity.type')"
      item-title="label"
      item-value="value"
      variant="outlined"
      density="compact"
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!minCapacity && !maxCapacity"
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
const minCapacity = ref<number | null>(null)
const maxCapacity = ref<number | null>(null)
const capacityType = ref<string>('beds')

const capacityTypeOptions = [
  { value: 'beds', label: t('segmentation.filters.capacity.types.beds') },
  { value: 'rooms', label: t('segmentation.filters.capacity.types.rooms') },
  { value: 'staff', label: t('segmentation.filters.capacity.types.staff') },
  { value: 'patients', label: t('segmentation.filters.capacity.types.patients') }
]

// Methods
const addFilter = () => {
  if (!minCapacity.value && !maxCapacity.value) return

  let operator = 'between'
  let value: any = {}

  if (minCapacity.value && maxCapacity.value) {
    value = { min: minCapacity.value, max: maxCapacity.value }
    operator = 'between'
  } else if (minCapacity.value) {
    value = minCapacity.value
    operator = 'greater_than_or_equal'
  } else if (maxCapacity.value) {
    value = maxCapacity.value
    operator = 'less_than_or_equal'
  }

  const typeLabel = capacityTypeOptions.find(opt => opt.value === capacityType.value)?.label || capacityType.value
  let rangeLabel = ''

  if (minCapacity.value && maxCapacity.value) {
    rangeLabel = `${minCapacity.value} - ${maxCapacity.value}`
  } else if (minCapacity.value) {
    rangeLabel = `≥ ${minCapacity.value}`
  } else if (maxCapacity.value) {
    rangeLabel = `≤ ${maxCapacity.value}`
  }

  emit('add-filter', {
    type: 'institution',
    field: `capacity_${capacityType.value}`,
    operator,
    value,
    label: `${t('segmentation.filters.capacity.label')} (${typeLabel}): ${rangeLabel}`,
    group: 'institution'
  })

  minCapacity.value = null
  maxCapacity.value = null
}
</script>
