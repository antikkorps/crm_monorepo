<template>
  <div class="contact-method-filter">
    <v-select
      v-model="selectedMethods"
      :items="contactMethodOptions"
      :label="$t('segmentation.filters.contactMethod.label')"
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
      :disabled="selectedMethods.length === 0"
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
const selectedMethods = ref<string[]>([])

const contactMethodOptions = [
  { value: 'email', label: t('segmentation.filters.contactMethod.methods.email') },
  { value: 'phone', label: t('segmentation.filters.contactMethod.methods.phone') },
  { value: 'mobile', label: t('segmentation.filters.contactMethod.methods.mobile') },
  { value: 'video', label: t('segmentation.filters.contactMethod.methods.video') },
  { value: 'in_person', label: t('segmentation.filters.contactMethod.methods.inPerson') },
  { value: 'mail', label: t('segmentation.filters.contactMethod.methods.mail') }
]

// Methods
const addFilter = () => {
  if (selectedMethods.value.length === 0) return

  const methodLabels = selectedMethods.value.map(method => 
    contactMethodOptions.find(opt => opt.value === method)?.label || method
  ).join(', ')

  emit('add-filter', {
    type: 'contact',
    field: 'preferredContactMethod',
    operator: 'in',
    value: selectedMethods.value,
    label: `${t('segmentation.filters.contactMethod.label')}: ${methodLabels}`,
    group: 'contact'
  })

  selectedMethods.value = []
}
</script>