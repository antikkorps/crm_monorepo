<template>
  <Card class="template-card" :class="{ 'default-template': template.isDefault }">
    <template #header>
      <div class="template-header">
        <div class="template-logo">
          <img
            v-if="template.logoUrl"
            :src="template.logoUrl"
            :alt="`${template.companyName} logo`"
            class="logo-image"
          />
          <div v-else class="logo-placeholder">
            <i class="pi pi-image"></i>
          </div>
        </div>
        <div class="template-badges">
          <Badge
            v-if="template.isDefault"
            value="Default"
            severity="success"
            class="default-badge"
          />
          <Badge
            :value="templateTypeLabel"
            :severity="templateTypeSeverity"
            class="type-badge"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div class="template-content">
        <div class="template-info">
          <h3 class="template-name">{{ template.name }}</h3>
          <p class="company-name">{{ template.companyName }}</p>
          <div class="template-details">
            <div class="detail-item">
              <i class="pi pi-calendar"></i>
              <span>Version {{ template.version }}</span>
            </div>
            <div class="detail-item">
              <i class="pi pi-user"></i>
              <span>{{ creatorName }}</span>
            </div>
            <div class="detail-item">
              <i class="pi pi-clock"></i>
              <span>{{ formatDate(template.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <div
          class="template-colors"
          v-if="template.primaryColor || template.secondaryColor"
        >
          <div class="color-preview">
            <div
              v-if="template.primaryColor"
              class="color-swatch primary"
              :style="{ backgroundColor: template.primaryColor }"
              :title="`Primary: ${template.primaryColor}`"
            ></div>
            <div
              v-if="template.secondaryColor"
              class="color-swatch secondary"
              :style="{ backgroundColor: template.secondaryColor }"
              :title="`Secondary: ${template.secondaryColor}`"
            ></div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="template-actions">
        <div class="primary-actions">
          <Button
            icon="pi pi-eye"
            text
            rounded
            severity="info"
            @click="$emit('preview', template)"
            v-tooltip.top="'Preview'"
          />
          <Button
            icon="pi pi-pencil"
            text
            rounded
            severity="secondary"
            @click="$emit('edit', template)"
            v-tooltip.top="'Edit'"
          />
          <Button
            icon="pi pi-copy"
            text
            rounded
            severity="secondary"
            @click="$emit('duplicate', template)"
            v-tooltip.top="'Duplicate'"
          />
        </div>

        <div class="secondary-actions">
          <Button
            v-if="!template.isDefault"
            icon="pi pi-star"
            text
            rounded
            severity="warning"
            @click="$emit('set-default', template)"
            v-tooltip.top="'Set as Default'"
          />
          <Button
            v-if="!template.isDefault"
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            @click="$emit('delete', template)"
            v-tooltip.top="'Delete'"
          />
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { DocumentTemplate } from "@medical-crm/shared"
import { computed } from "vue"

interface Props {
  template: DocumentTemplate
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  edit: [template: DocumentTemplate]
  delete: [template: DocumentTemplate]
  duplicate: [template: DocumentTemplate]
  "set-default": [template: DocumentTemplate]
  preview: [template: DocumentTemplate]
}>()

// Computed properties
const templateTypeLabel = computed(() => {
  switch (props.template.type) {
    case "quote":
      return "Quote"
    case "invoice":
      return "Invoice"
    case "both":
      return "Quote & Invoice"
    default:
      return "Unknown"
  }
})

const templateTypeSeverity = computed(() => {
  switch (props.template.type) {
    case "quote":
      return "info"
    case "invoice":
      return "warning"
    case "both":
      return "success"
    default:
      return "secondary"
  }
})

const creatorName = computed(() => {
  if (props.template.creator) {
    return `${props.template.creator.firstName} ${props.template.creator.lastName}`
  }
  return "Unknown"
})

// Format date helper
const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}
</script>

<style scoped>
.template-card {
  height: 100%;
  transition: all 0.2s ease;
  border: 1px solid var(--surface-border);
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.default-template {
  border-color: var(--green-500);
  box-shadow: 0 0 0 1px var(--green-500);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  background: var(--surface-50);
  border-bottom: 1px solid var(--surface-border);
}

.template-logo {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface-0);
  border: 1px solid var(--surface-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-placeholder {
  color: var(--text-color-secondary);
  font-size: 1.5rem;
}

.template-badges {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-end;
}

.default-badge {
  font-size: 0.75rem;
}

.type-badge {
  font-size: 0.75rem;
}

.template-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.template-info {
  flex: 1;
}

.template-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color);
  line-height: 1.3;
}

.company-name {
  margin: 0 0 1rem 0;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.template-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--text-color-secondary);
}

.detail-item i {
  width: 12px;
  font-size: 0.75rem;
}

.template-colors {
  margin-top: auto;
}

.color-preview {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid var(--surface-border);
  cursor: help;
}

.template-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-50);
}

.primary-actions,
.secondary-actions {
  display: flex;
  gap: 0.25rem;
}

.primary-actions {
  flex: 1;
}

.secondary-actions {
  justify-content: flex-end;
}

/* Responsive design */
@media (max-width: 480px) {
  .template-header {
    padding: 0.75rem;
  }

  .template-logo {
    width: 50px;
    height: 50px;
  }

  .template-content {
    padding: 0.75rem;
  }

  .template-name {
    font-size: 1rem;
  }

  .template-actions {
    padding: 0.5rem 0.75rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .primary-actions,
  .secondary-actions {
    gap: 0.125rem;
  }
}
</style>
