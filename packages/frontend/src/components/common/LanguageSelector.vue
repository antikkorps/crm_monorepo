<template>
  <v-menu offset-y>
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :variant="variant"
        :size="size"
        :icon="iconOnly"
        :loading="isChangingLocale"
        class="language-selector"
      >
        <v-icon v-if="iconOnly" icon="mdi-translate" />
        <template v-else>
          <span class="flag me-2">{{ currentLocale.flag }}</span>
          <span class="locale-name">{{ currentLocale.name }}</span>
          <v-icon icon="mdi-chevron-down" size="small" class="ms-1" />
        </template>
      </v-btn>
    </template>

    <v-list density="compact" class="language-menu">
      <v-list-item
        v-for="localeOption in availableLocales"
        :key="localeOption.code"
        :active="localeOption.code === currentLocale.code"
        @click="handleLocaleChange(localeOption.code)"
      >
        <template #prepend>
          <span class="flag me-3">{{ localeOption.flag }}</span>
        </template>

        <v-list-item-title>{{ localeOption.name }}</v-list-item-title>

        <template #append>
          <v-icon
            v-if="localeOption.code === currentLocale.code"
            icon="mdi-check"
            color="primary"
            size="small"
          />
        </template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import { useLocale } from "@/composables/useLocale"
import type { SupportedLocale } from "@/plugins/i18n"

interface Props {
  variant?: "text" | "outlined" | "elevated" | "tonal" | "plain"
  size?: "x-small" | "small" | "default" | "large" | "x-large"
  iconOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: "text",
  size: "default",
  iconOnly: false,
})

const emit = defineEmits<{
  "locale-changed": [locale: SupportedLocale]
}>()

const { currentLocale, availableLocales, isChangingLocale, changeLocale } = useLocale()

const handleLocaleChange = async (locale: SupportedLocale) => {
  try {
    await changeLocale(locale)
    emit("locale-changed", locale)
  } catch (error) {
    console.error("Failed to change locale:", error)
    // You might want to show a toast notification here
  }
}
</script>

<style scoped>
.language-selector {
  min-width: auto;
}

.flag {
  font-size: 1.2em;
  line-height: 1;
}

.locale-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.language-menu {
  min-width: 160px;
}

:deep(.v-list-item__prepend) {
  width: auto;
  min-width: auto;
}

:deep(.v-list-item__append) {
  width: auto;
  min-width: auto;
}
</style>
