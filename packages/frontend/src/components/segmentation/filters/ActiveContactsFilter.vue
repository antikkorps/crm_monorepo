<template>
  <div class="active-contacts-filter">
    <v-radio-group
      v-model="filterValue"
      :label="$t('segmentation.filters.activeContacts.label')"
      inline
    >
      <v-radio
        :label="$t('segmentation.filters.activeContacts.hasContacts')"
        :value="true"
      />
      <v-radio
        :label="$t('segmentation.filters.activeContacts.noContacts')"
        :value="false"
      />
    </v-radio-group>
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="filterValue === null"
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
const filterValue = ref<boolean | null>(null)

// Methods
const addFilter = () => {
  if (filterValue.value === null) return

  const valueLabel = filterValue.value
    ? t('segmentation.filters.activeContacts.hasContacts')
    : t('segmentation.filters.activeContacts.noContacts')

  emit('add-filter', {
    type: 'combined',
    field: 'hasActiveContacts',
    operator: 'equals',
    value: filterValue.value,
    label: `${t('segmentation.filters.activeContacts.label')}: ${valueLabel}`,
    group: 'combined'
  })

  filterValue.value = null
}
</script>
