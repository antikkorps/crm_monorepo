<template>
  <v-card variant="outlined" class="catalog-selection">
    <v-card-title class="text-subtitle-1 pa-3">
      <v-icon class="mr-2">mdi-package-variant</v-icon>
      {{ t("billing.catalogSelector.title") }}
    </v-card-title>
    <v-card-text class="pt-4">
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
            :label="t('billing.catalogSelector.search')"
            variant="outlined"
            clearable
            persistent-hint
            :hint="t('billing.catalogSelector.searchHint')"
            density="compact"
          >
            <template #selection="{ item }">
              <span>{{ item.raw?.name || selectedItemName }}</span>
            </template>
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <v-avatar size="32" color="primary">
                    <v-icon>mdi-package-variant</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                <v-list-item-subtitle>
                  {{ getDisplayText(item.raw.description, 50) || t("billing.catalogSelector.noDescription") }}
                  •
                  <span class="font-weight-bold">{{
                    formatCurrency(item.raw.unitPrice)
                  }}</span>
                  <span v-if="item.raw.category"> • {{ item.raw.category }}</span>
                </v-list-item-subtitle>
              </v-list-item>
            </template>
            <template #no-data>
              <div class="text-center pa-4">
                <div v-if="catalogSearch && catalogSearch.length > 0">
                  {{ t("billing.catalogSelector.noResults", { search: catalogSearch }) }}
                </div>
                <div v-else>
                  {{ t("billing.catalogSelector.searchPrompt") }}
                </div>
              </div>
            </template>
          </v-autocomplete>
        </v-col>
        <v-col cols="12" md="4">
          <v-switch
            v-model="isCustomLine"
            :label="t('billing.catalogSelector.customLine')"
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
import { useCatalogStore, type CatalogItem } from "@/stores/catalog"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { getDisplayText } from "@/utils/billing"

const { t } = useI18n()

interface Props {
  modelValue?: string | null
  customLine?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  customLine: true,
})

const emit = defineEmits<{
  "update:modelValue": [value: string | null]
  "update:customLine": [value: boolean]
  "item-selected": [item: CatalogItem | null]
}>()

// Catalog integration
const catalogStore = useCatalogStore()
const selectedItem = ref<string | null>(props.modelValue)
const selectedItemName = ref<string>("")
const catalogItems = ref<CatalogItem[]>([])
const catalogLoading = ref(false)
const catalogSearch = ref("")
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
    console.error("Error searching catalog:", error)
    catalogItems.value = []
  } finally {
    catalogLoading.value = false
  }
}

const onItemSelect = async (itemId: string | null) => {
  selectedItem.value = itemId
  emit("update:modelValue", itemId)

  if (!itemId) {
    selectedItemName.value = ""
    emit("item-selected", null)
    isCustomLine.value = true
    emit("update:customLine", true)
    return
  }

  try {
    const item = await catalogStore.getItemById(itemId)
    if (item) {
      selectedItemName.value = item.name
      emit("item-selected", item)
      isCustomLine.value = false
      emit("update:customLine", false)
    }
  } catch (error) {
    console.error("Error fetching catalog item:", error)
    emit("item-selected", null)
  }
}

const onCustomLineToggle = () => {
  emit("update:customLine", isCustomLine.value)
  if (isCustomLine.value) {
    selectedItem.value = null
    emit("update:modelValue", null)
    emit("item-selected", null)
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0)
}

// Load initial catalog item if there's a pre-selected value
const loadInitialItem = async () => {
  if (props.modelValue) {
    try {
      catalogLoading.value = true
      const item = await catalogStore.getItemById(props.modelValue)
      if (item) {
        // Store the name for display and add item to the list
        selectedItemName.value = item.name
        catalogItems.value = [item]
      }
    } catch (error) {
      console.error("Error loading initial catalog item:", error)
    } finally {
      catalogLoading.value = false
    }
  }
}

// Load active catalog items on mount
onMounted(async () => {
  try {
    await catalogStore.fetchItems({ isActive: "true", limit: 100 })
    // Load initial item if pre-selected (for editing existing quotes)
    await loadInitialItem()
  } catch (error) {
    console.error("Error loading catalog items:", error)
  }
})
</script>

<style scoped>
.catalog-selection {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
}

.catalog-selection .v-card-title {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  margin: -1px -1px 0 -1px;
  border-radius: 4px 4px 0 0;
}
</style>
