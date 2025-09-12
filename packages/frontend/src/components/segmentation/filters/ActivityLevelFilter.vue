<template>
  <div class="activity-level-filter">
    <v-select
      v-model="activityLevel"
      :items="activityLevelOptions"
      :label="$t('segmentation.filters.activityLevel.label')"
      item-title="label"
      item-value="value"
      outlined
      dense
      class="mb-3"
    />
    <v-select
      v-model="timeframe"
      :items="timeframeOptions"
      :label="$t('segmentation.filters.activityLevel.timeframe')"
      item-title="label"
      item-value="value"
      outlined
      dense
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!activityLevel || !timeframe"
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
const activityLevel = ref<string>('')
const timeframe = ref<string>('')

const activityLevelOptions = [
  { value: 'high', label: t('segmentation.filters.activityLevel.levels.high'), color: 'success' },
  { value: 'medium', label: t('segmentation.filters.activityLevel.levels.medium'), color: 'warning' },
  { value: 'low', label: t('segmentation.filters.activityLevel.levels.low'), color: 'error' },
  { value: 'inactive', label: t('segmentation.filters.activityLevel.levels.inactive'), color: 'grey' }
]

const timeframeOptions = [
  { value: '7d', label: t('segmentation.filters.activityLevel.timeframes.last7Days') },
  { value: '30d', label: t('segmentation.filters.activityLevel.timeframes.last30Days') },
  { value: '90d', label: t('segmentation.filters.activityLevel.timeframes.last90Days') },
  { value: '1y', label: t('segmentation.filters.activityLevel.timeframes.lastYear') }
]

// Methods
const addFilter = () => {
  if (!activityLevel.value || !timeframe.value) return

  const levelLabel = activityLevelOptions.find(opt => opt.value === activityLevel.value)?.label || activityLevel.value
  const timeframeLabel = timeframeOptions.find(opt => opt.value === timeframe.value)?.label || timeframe.value

  emit('add-filter', {
    type: 'contact',
    field: 'activityLevel',
    operator: 'equals',
    value: {
      level: activityLevel.value,
      timeframe: timeframe.value
    },
    label: `${t('segmentation.filters.activityLevel.label')}: ${levelLabel} (${timeframeLabel})`,
    group: 'contact'
  })

  activityLevel.value = ''
  timeframe.value = ''
}
</script>