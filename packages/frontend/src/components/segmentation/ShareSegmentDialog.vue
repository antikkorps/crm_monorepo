<template>
  <v-dialog v-model="model" max-width="560px">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon left>mdi-share-variant</v-icon>
        {{ $t('segmentation.saved.bulkActions.title') }}
        <v-spacer />
        <v-btn icon @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <v-alert type="info" outlined class="mb-4">
          Fonctionnalité de partage à venir. Tout le monde a accès aux segments publics.
        </v-alert>
        <div class="text-body-2 text-medium-emphasis">
          Sélection(s): {{ count }} segment(s)
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="close">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  count: 1
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const close = () => { model.value = false }
</script>

<style scoped>
</style>

