<template>
  <div class="primary-contact-filter">
    <v-radio-group
      v-model="isPrimary"
      :label="$t('segmentation.filters.primary.label')"
      row
      class="mb-3"
    >
      <v-radio
        :label="$t('segmentation.filters.primary.primaryOnly')"
        :value="true"
      />
      <v-radio
        :label="$t('segmentation.filters.primary.nonPrimaryOnly')"
        :value="false"
      />
    </v-radio-group>
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="isPrimary === null"
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
const isPrimary = ref<boolean | null>(null)

// Methods
const addFilter = () => {
  if (isPrimary.value === null) return

  const label = isPrimary.value 
    ? t('segmentation.filters.primary.primaryOnly')
    : t('segmentation.filters.primary.nonPrimaryOnly')

  emit('add-filter', {
    type: 'contact',
    field: 'isPrimary',
    operator: 'equals',
    value: isPrimary.value,
    label: `${t('segmentation.filters.primary.label')}: ${label}`,
    group: 'contact'
  })

  isPrimary.value = null
}
</script>