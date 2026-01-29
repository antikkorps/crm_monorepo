<template>
  <v-card
    class="catalog-item-card"
    :class="{ 'inactive-item': !item.isActive }"
    elevation="2"
    hover
  >
    <v-card-text class="pa-4">
      <!-- Header with status and actions -->
      <div class="d-flex justify-space-between align-start mb-3">
        <div class="flex-grow-1 mr-2">
          <h3 class="text-h6 mb-1">{{ item.name }}</h3>
          <v-chip
            :color="item.isActive ? 'success' : 'warning'"
            size="small"
            variant="flat"
          >
            {{ item.isActive ? $t('catalog.active') : $t('catalog.inactive') }}
          </v-chip>
        </div>

        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn
              icon="mdi-dots-vertical"
              size="small"
              variant="text"
              v-bind="props"
            />
          </template>
          <v-list>
            <v-list-item @click="$emit('edit', item)">
              <template v-slot:prepend>
                <v-icon>mdi-pencil</v-icon>
              </template>
              <v-list-item-title>{{ $t('common.edit') }}</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('toggle', item)">
              <template v-slot:prepend>
                <v-icon>
                  {{ item.isActive ? 'mdi-pause' : 'mdi-play' }}
                </v-icon>
              </template>
              <v-list-item-title>
                {{ item.isActive ? $t('catalog.deactivate') : $t('catalog.activate') }}
              </v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item @click="$emit('delete', item)" class="text-error">
              <template v-slot:prepend>
                <v-icon color="error">mdi-delete</v-icon>
              </template>
              <v-list-item-title>{{ $t('common.delete') }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>

      <!-- Description -->
      <p
        v-if="item.description"
        class="text-body-2 mb-3"
        style="color: rgb(var(--v-theme-on-surface)); opacity: 0.7;"
      >
        {{ truncatedDescription }}
      </p>

      <!-- Details Grid -->
      <div class="details-grid">
        <div v-if="item.category" class="detail-item">
          <div class="detail-label">{{ $t('catalog.category') }}</div>
          <v-chip size="small" variant="outlined">{{ item.category }}</v-chip>
        </div>

        <div v-if="item.sku" class="detail-item">
          <div class="detail-label">{{ $t('catalog.sku') }}</div>
          <div class="detail-value">{{ item.sku }}</div>
        </div>

        <div v-if="item.unit" class="detail-item">
          <div class="detail-label">{{ $t('catalog.unit') }}</div>
          <div class="detail-value">{{ item.unit }}</div>
        </div>
      </div>

      <!-- Price Section -->
      <v-divider class="my-3" />

      <div class="d-flex justify-space-between align-center">
        <div>
          <div class="text-h6 text-primary">{{ formatPrice(item.unitPrice) }}</div>
          <div v-if="item.taxRate > 0" class="text-caption text-medium-emphasis">
            {{ $t('catalog.taxRate') }}: {{ item.taxRate }}%
          </div>
        </div>

        <div v-if="item.creator" class="text-end">
          <div class="text-caption text-medium-emphasis">
            {{ $t('catalog.createdBy') }}
          </div>
          <div class="text-body-2">
            {{ creatorName }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ formatDate(item.createdAt) }}
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CatalogItem } from '@/stores/catalog'
import { getDisplayText } from '@/utils/billing'

interface Props {
  item: CatalogItem
}

interface Emits {
  (e: 'edit', item: CatalogItem): void
  (e: 'toggle', item: CatalogItem): void
  (e: 'delete', item: CatalogItem): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const { t } = useI18n()

const truncatedDescription = computed(() => {
  return getDisplayText(props.item.description, 100)
})

const creatorName = computed(() => {
  if (!props.item.creator) return t('catalog.unknown')
  return `${props.item.creator.firstName} ${props.item.creator.lastName}`
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(price)
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.catalog-item-card {
  height: 100%;
  transition: all 0.2s ease-in-out;
}

.catalog-item-card:hover {
  transform: translateY(-2px);
}

.inactive-item {
  opacity: 0.7;
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 24px;
}

.detail-label {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.6;
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>