<template>
  <v-card>
    <v-card-title class="text-h6 pa-6">
      {{ isEdit ? $t('catalog.editItem') : $t('catalog.createItem') }}
    </v-card-title>

    <v-divider />

    <v-form ref="formRef" @submit.prevent="handleSubmit">
      <v-card-text class="pa-6">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.name"
              :label="$t('catalog.form.name')"
              :rules="nameRules"
              variant="outlined"
              required
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.sku"
              :label="$t('catalog.form.sku')"
              :rules="skuRules"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-textarea
              v-model="form.description"
              :label="$t('catalog.form.description')"
              variant="outlined"
              rows="3"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-combobox
              v-model="form.category"
              :items="categories"
              :label="$t('catalog.form.category')"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.unit"
              :label="$t('catalog.form.unit')"
              :placeholder="$t('catalog.form.unitPlaceholder')"
              variant="outlined"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.unitPrice"
              :label="$t('catalog.form.unitPrice')"
              :rules="priceRules"
              variant="outlined"
              type="number"
              step="0.01"
              min="0"
              suffix="€"
              required
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.taxRate"
              :label="$t('catalog.form.taxRate')"
              :rules="taxRateRules"
              variant="outlined"
              type="number"
              step="0.01"
              min="0"
              max="100"
              suffix="%"
            />
          </v-col>
        </v-row>

        <v-row v-if="isEdit">
          <v-col cols="12">
            <v-switch
              v-model="form.isActive"
              :label="$t('catalog.form.isActive')"
              color="primary"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-6">
        <v-spacer />
        <v-btn @click="$emit('cancel')">
          {{ $t('common.cancel') }}
        </v-btn>
        <v-btn
          type="submit"
          color="primary"
          :loading="loading"
          :disabled="!isFormValid"
        >
          {{ isEdit ? $t('common.save') : $t('common.create') }}
        </v-btn>
      </v-card-actions>
    </v-form>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCatalogStore, type CatalogItem } from '@/stores/catalog'

interface Props {
  item?: CatalogItem | null
  categories: string[]
}

interface Emits {
  (e: 'save'): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const catalogStore = useCatalogStore()

const formRef = ref()
const loading = ref(false)

const form = ref({
  name: '',
  description: '',
  category: '',
  unitPrice: 0,
  taxRate: 0,
  sku: '',
  unit: '',
  isActive: true
})

const isEdit = computed(() => !!props.item)

const nameRules = computed(() => [
  (v: string) => !!v || t('catalog.form.validation.nameRequired'),
  (v: string) => (v && v.length <= 255) || t('catalog.form.validation.nameTooLong')
])

const skuRules = computed(() => [
  (v: string) => !v || v.length <= 50 || t('catalog.form.validation.skuTooLong')
])

const priceRules = computed(() => [
  (v: number) => v >= 0 || t('catalog.form.validation.pricePositive'),
  (v: number) => !!v || t('catalog.form.validation.priceRequired')
])

const taxRateRules = computed(() => [
  (v: number) => v >= 0 || t('catalog.form.validation.taxRateMin'),
  (v: number) => v <= 100 || t('catalog.form.validation.taxRateMax')
])

const isFormValid = computed(() => {
  return form.value.name &&
         form.value.unitPrice >= 0 &&
         form.value.taxRate >= 0 &&
         form.value.taxRate <= 100
})

const resetForm = () => {
  if (props.item) {
    form.value = {
      name: props.item.name,
      description: props.item.description || '',
      category: props.item.category || '',
      unitPrice: props.item.unitPrice,
      taxRate: props.item.taxRate,
      sku: props.item.sku || '',
      unit: props.item.unit || '',
      isActive: props.item.isActive
    }
  } else {
    form.value = {
      name: '',
      description: '',
      category: '',
      unitPrice: 0,
      taxRate: 0,
      sku: '',
      unit: '',
      isActive: true
    }
  }
}

const handleSubmit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  loading.value = true
  try {
    const itemData = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      category: form.value.category.trim() || undefined,
      unitPrice: Number(form.value.unitPrice),
      taxRate: Number(form.value.taxRate),
      sku: form.value.sku.trim() || undefined,
      unit: form.value.unit.trim() || undefined,
      isActive: form.value.isActive
    }

    if (isEdit.value && props.item) {
      await catalogStore.updateItem(props.item.id, itemData)
    } else {
      await catalogStore.createItem(itemData)
    }

    emit('save')
  } catch (error) {
    console.error('Failed to save item:', error)
  } finally {
    loading.value = false
  }
}

watch(() => props.item, resetForm, { immediate: true })

onMounted(() => {
  resetForm()
})
</script>