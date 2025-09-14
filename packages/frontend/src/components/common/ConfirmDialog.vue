<template>
  <v-dialog v-model="model" max-width="520px">
    <v-card>
      <v-card-title class="d-flex align-center dialog-title" :class="typeClass">
        <v-icon left>{{ icon }}</v-icon>
        <span class="title-text">{{ title }}</span>
        <v-spacer />
        <v-btn icon variant="text" @click="onCancel">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-card-text>
        <div class="text-body-1" v-if="message">{{ message }}</div>
        <slot />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="onCancel">{{ cancelText }}</v-btn>
        <v-btn :color="confirmColor" @click="onConfirm">{{ confirmText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'error' | 'success'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  title: 'Confirmation',
  message: '',
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  type: 'warning'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const model = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

const icon = computed(() => {
  switch (props.type) {
    case 'warning': return 'mdi-alert'
    case 'error': return 'mdi-alert-octagon'
    case 'success': return 'mdi-check-circle'
    default: return 'mdi-information'
  }
})

const typeClass = computed(() => `type-${props.type || 'warning'}`)
const confirmColor = computed(() => {
  switch (props.type) {
    case 'error': return 'error'
    case 'warning': return 'warning'
    case 'success': return 'success'
    default: return 'primary'
  }
})

const onCancel = () => {
  emit('cancel')
  model.value = false
}

const onConfirm = () => {
  emit('confirm')
  model.value = false
}
</script>

<style scoped>
.dialog-title { padding: 12px 16px; font-weight: 600; }
.dialog-title .title-text { margin-left: 8px; }
.type-warning { background: rgba(255, 193, 7, 0.08); }
.type-error { background: rgba(244, 67, 54, 0.08); }
.type-success { background: rgba(76, 175, 80, 0.08); }
.type-info { background: rgba(33, 150, 243, 0.08); }
</style>
