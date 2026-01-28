<template>
  <v-alert v-if="institutionId" type="info" variant="tonal" class="mb-4" closable>
    <div class="d-flex align-center justify-space-between flex-wrap ga-2">
      <span>{{ message || t("common.viewingFromInstitution") }}</span>
      <div class="d-flex ga-2">
        <v-btn
          v-if="showBackToList"
          variant="text"
          size="small"
          prepend-icon="mdi-format-list-bulleted"
          @click="$emit('back-to-list')"
        >
          {{ backToListLabel || t("common.backToList") }}
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          prepend-icon="mdi-arrow-left"
          @click="goBackToInstitution"
        >
          {{ t("common.backToInstitution") }}
        </v-btn>
      </div>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

interface Props {
  institutionId?: string
  message?: string
  showBackToList?: boolean
  backToListLabel?: string
}

interface Emits {
  (e: "back-to-list"): void
}

const props = withDefaults(defineProps<Props>(), {
  showBackToList: true,
})

defineEmits<Emits>()

const { t } = useI18n()
const router = useRouter()

const goBackToInstitution = () => {
  if (props.institutionId) {
    router.push(`/institutions/${props.institutionId}`)
  }
}
</script>
