<template>
  <v-card variant="outlined" class="catalog-selection">
    <v-card-title class="text-subtitle-1 pa-3">
      <v-icon class="mr-2">mdi-package-variant</v-icon>
      Sélection d'article
    </v-card-title>
    <v-card-text class="pt-0">
      <v-row>
        <v-col cols="12" md="8">
          <v-autocomplete
            v-model="selectedItem"
            :items="catalogItems"
            :loading="catalogLoading"
            :search="catalogSearch"
            @update:search="onCatalogSearch"
            @update:model-value="onItemSelect"
            item-title="name"
            item-value="id"
            label="Rechercher un article du catalogue"
            variant="outlined"
            clearable
            persistent-hint
            hint="Tapez pour rechercher ou laissez vide pour une ligne personnalisée"
            density="compact"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-avatar size="32" color="primary">
                    <v-icon>mdi-package-variant</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ item.raw.description || 'Aucune description' }} •
                  <span class="font-weight-bold">{{ formatCurrency(item.raw.unitPrice) }}</span>
                  <span v-if="item.raw.category"> • {{ item.raw.category }}</span>
                </v-list-item-subtitle>
              </v-list-item>
            </template>
            <template #no-data>
              <div class="text-center pa-4">
                <div v-if="catalogSearch && catalogSearch.length > 0">
                  Aucun article trouvé pour "{{ catalogSearch }}"
                </div>
                <div v-else>
                  Tapez pour rechercher dans le catalogue
                </div>
              </div>
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="12" md="4">
          <v-switch
            v-model="isCustomLine"
            label="Ligne personnalisée"
            @update:model-value="onCustomLineToggle"
            color="primary"
            density="compact"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCatalogStore, type CatalogItem } from '@/stores/catalog'

interface Props {
  modelValue?: string | null
  customLine?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  customLine: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'update:customLine': [value: boolean]
  'item-selected': [item: CatalogItem | null]
}>()

// Catalog integration
const catalogStore = useCatalogStore()
const selectedItem = ref<string | null>(props.modelValue)
const catalogItems = ref<CatalogItem[]>([])
const catalogLoading = ref(false)
const catalogSearch = ref('')
const isCustomLine = ref(props.customLine)

// Catalog methods
const onCatalogSearch = async (search: string) => {
  catalogSearch.value = search
  if (!search || search.length < 2) {
    catalogItems.value = []
    return
  }

  try {
    catalogLoading.value = true
    catalogItems.value = await catalogStore.searchItems(search)
  } catch (error) {
    console.error('Error searching catalog:', error)
    catalogItems.value = []
  } finally {
    catalogLoading.value = false
  }
}

const onItemSelect = async (itemId: string | null) => {
  selectedItem.value = itemId
  emit('update:modelValue', itemId)

  if (!itemId) {
    emit('item-selected', null)
    isCustomLine.value = true
    emit('update:customLine', true)
    return
  }

  try {
    const item = await catalogStore.getItemById(itemId)
    if (item) {
      emit('item-selected', item)
      isCustomLine.value = false
      emit('update:customLine', false)
    }
  } catch (error) {
    console.error('Error fetching catalog item:', error)
    emit('item-selected', null)
  }
}

const onCustomLineToggle = () => {
  emit('update:customLine', isCustomLine.value)
  if (isCustomLine.value) {
    selectedItem.value = null
    emit('update:modelValue', null)
    emit('item-selected', null)
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount || 0)
}

// Load active catalog items on mount
onMounted(async () => {
  try {
    await catalogStore.fetchItems({ isActive: 'true', limit: 100 })
  } catch (error) {
    console.error('Error loading catalog items:', error)
  }
})
</script>

<style scoped>
.catalog-selection {
  background-color: rgb(var(--v-theme-surface-variant));
  border: 1px solid rgb(var(--v-theme-outline-variant));
}

.catalog-selection .v-card-title {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  margin: -1px -1px 0 -1px;
  border-radius: 4px 4px 0 0;
}
</style>