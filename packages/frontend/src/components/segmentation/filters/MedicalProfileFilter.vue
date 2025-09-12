<template>
  <div class="medical-profile-filter">
    <v-radio-group
      v-model="filterValue"
      :label="$t('segmentation.filters.medicalProfile.label')"
      row
    >
      <v-radio
        :label="$t('segmentation.filters.medicalProfile.hasProfile')"
        :value="true"
      />
      <v-radio
        :label="$t('segmentation.filters.medicalProfile.noProfile')"
        :value="false"
      />
    </v-radio-group>
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="filterValue === null"
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
const filterValue = ref<boolean | null>(null)

// Methods
const addFilter = () => {
  if (filterValue.value === null) return

  emit('add-filter', {
    type: 'combined',
    field: 'hasMedicalProfile',
    operator: 'equals',
    value: filterValue.value,
    label: t('segmentation.filters.medicalProfile.label'),
    group: 'combined'
  })

  filterValue.value = null
}
</script>