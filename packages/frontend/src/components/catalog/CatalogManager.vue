<template>
  <div class="catalog-manager">
    <v-container fluid>
      <!-- Header -->
      <div class="d-flex justify-space-between align-center mb-6">
        <div>
          <h1 class="text-h4 mb-2">{{ $t('catalog.title') }}</h1>
          <p class="text-subtitle-1" style="color: rgb(var(--v-theme-on-surface)); opacity: 0.7;">
            {{ $t('catalog.subtitle') }}
          </p>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          @click="openCreateDialog"
        >
          {{ $t('catalog.addItem') }}
        </v-btn>
      </div>

      <!-- Filters -->
      <v-card class="mb-6">
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filters.search"
                :label="$t('catalog.search')"
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                clearable
                @input="debouncedSearch"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="filters.category"
                :items="categoryOptions"
                :label="$t('catalog.category')"
                variant="outlined"
                clearable
                @update:model-value="applyFilters"
              />
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="filters.isActive"
                :items="statusOptions"
                :label="$t('catalog.status')"
                variant="outlined"
                @update:model-value="applyFilters"
              />
            </v-col>
            <v-col cols="12" md="2">
              <v-select
                v-model="filters.sortBy"
                :items="sortOptions"
                :label="$t('catalog.sortBy')"
                variant="outlined"
                @update:model-value="applyFilters"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Items Grid -->
      <div v-if="catalogStore.loading" class="text-center py-8">
        <v-progress-circular indeterminate size="64" />
      </div>

      <div v-else-if="catalogStore.error" class="text-center py-8">
        <v-alert type="error" class="mb-4">
          {{ catalogStore.error }}
        </v-alert>
        <v-btn @click="loadItems">{{ $t('common.retry') }}</v-btn>
      </div>

      <div v-else>
        <v-row v-if="catalogStore.items.length > 0">
          <v-col
            v-for="item in catalogStore.items"
            :key="item.id"
            cols="12"
            sm="6"
            lg="4"
            xl="3"
          >
            <CatalogItemCard
              :item="item"
              @edit="openEditDialog"
              @toggle="toggleItemStatus"
              @delete="confirmDelete"
            />
          </v-col>
        </v-row>

        <div v-else class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">
            mdi-package-variant
          </v-icon>
          <h3 class="text-h6 mb-2">{{ $t('catalog.noItems') }}</h3>
          <p class="text-body-2 mb-4">{{ $t('catalog.noItemsSubtitle') }}</p>
          <v-btn color="primary" @click="openCreateDialog">
            {{ $t('catalog.addFirstItem') }}
          </v-btn>
        </div>

        <!-- Pagination -->
        <div v-if="catalogStore.pagination.totalPages > 1" class="d-flex justify-center mt-6">
          <v-pagination
            v-model="currentPage"
            :length="catalogStore.pagination.totalPages"
            @update:model-value="changePage"
          />
        </div>
      </div>
    </v-container>

    <!-- Create/Edit Dialog -->
    <v-dialog v-model="showDialog" max-width="800px" persistent>
      <CatalogItemForm
        :item="selectedItem"
        :categories="catalogStore.categories"
        @save="handleSave"
        @cancel="closeDialog"
      />
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">
          {{ $t('catalog.confirmDelete') }}
        </v-card-title>
        <v-card-text>
          {{ $t('catalog.confirmDeleteMessage', { name: itemToDelete?.name }) }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDeleteDialog = false">
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn color="error" @click="deleteItem">
            {{ $t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCatalogStore, type CatalogItem, type CatalogFilters } from '@/stores/catalog'
import CatalogItemCard from './CatalogItemCard.vue'
import CatalogItemForm from './CatalogItemForm.vue'

const { t } = useI18n()
const catalogStore = useCatalogStore()

const filters = ref<CatalogFilters>({
  search: '',
  category: '',
  isActive: 'true',
  sortBy: 'name',
  sortOrder: 'ASC',
  page: 1,
  limit: 20
})

const currentPage = ref(1)
const showDialog = ref(false)
const showDeleteDialog = ref(false)
const selectedItem = ref<CatalogItem | null>(null)
const itemToDelete = ref<CatalogItem | null>(null)

const categoryOptions = computed(() => [
  { title: t('catalog.allCategories'), value: '' },
  ...catalogStore.categories.map(cat => ({ title: cat, value: cat }))
])

const statusOptions = computed(() => [
  { title: t('catalog.allStatuses'), value: '' },
  { title: t('catalog.active'), value: 'true' },
  { title: t('catalog.inactive'), value: 'false' }
])

const sortOptions = computed(() => [
  { title: t('catalog.sortByName'), value: 'name' },
  { title: t('catalog.sortByCategory'), value: 'category' },
  { title: t('catalog.sortByPrice'), value: 'unitPrice' },
  { title: t('catalog.sortByCreated'), value: 'createdAt' }
])

const debounce = (func: Function, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

const debouncedSearch = debounce(() => {
  applyFilters()
}, 300)

const loadItems = async () => {
  try {
    await catalogStore.fetchItems(filters.value)
  } catch (error) {
    console.error('Failed to load catalog items:', error)
  }
}

const loadCategories = async () => {
  try {
    await catalogStore.fetchCategories()
  } catch (error) {
    console.error('Failed to load categories:', error)
  }
}

const applyFilters = () => {
  filters.value.page = 1
  currentPage.value = 1
  loadItems()
}

const changePage = (page: number) => {
  filters.value.page = page
  loadItems()
}

const openCreateDialog = () => {
  selectedItem.value = null
  showDialog.value = true
}

const openEditDialog = (item: CatalogItem) => {
  selectedItem.value = item
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  selectedItem.value = null
}

const handleSave = async () => {
  closeDialog()
  await loadItems()
}

const toggleItemStatus = async (item: CatalogItem) => {
  try {
    await catalogStore.toggleItemStatus(item.id)
  } catch (error) {
    console.error('Failed to toggle item status:', error)
  }
}

const confirmDelete = (item: CatalogItem) => {
  itemToDelete.value = item
  showDeleteDialog.value = true
}

const deleteItem = async () => {
  if (!itemToDelete.value) return

  try {
    await catalogStore.deleteItem(itemToDelete.value.id)
    showDeleteDialog.value = false
    itemToDelete.value = null
  } catch (error) {
    console.error('Failed to delete item:', error)
  }
}

watch(currentPage, (newPage) => {
  filters.value.page = newPage
  loadItems()
})

onMounted(() => {
  loadItems()
  loadCategories()
})
</script>

<style scoped>
.catalog-manager {
  min-height: 100vh;
}
</style>