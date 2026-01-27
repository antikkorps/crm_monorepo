<template>
  <AppLayout>
    <div class="engagement-letters-view">
      <div v-if="!showBuilder">
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <h1 class="text-h4 font-weight-bold">{{ t("engagementLetters.title") }}</h1>
            <p class="text-medium-emphasis">{{ t("engagementLetters.subtitle") }}</p>
          </div>
          <v-btn color="primary" prepend-icon="mdi-plus" @click="createNewLetter">{{
            t("engagementLetters.createNew")
          }}</v-btn>
        </div>

        <v-card class="mb-6" variant="outlined">
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="4" sm="6">
                <v-text-field
                  v-model="filters.search"
                  :label="t('common.search')"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  @input="debouncedSearch"
                />
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <v-select
                  v-model="filters.status"
                  :items="statusOptions"
                  item-title="label"
                  item-value="value"
                  :label="t('engagementLetters.filters.status')"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                  @update:model-value="loadLetters"
                />
              </v-col>
              <v-col cols="12" md="3" sm="6">
                <v-select
                  v-model="filters.missionType"
                  :items="missionTypeOptions"
                  item-title="label"
                  item-value="value"
                  :label="t('engagementLetters.filters.missionType')"
                  variant="outlined"
                  density="compact"
                  clearable
                  hide-details
                  @update:model-value="loadLetters"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-card v-if="loading && letters.length === 0">
          <TableSkeleton :rows="10" :columns="6" toolbar pagination />
        </v-card>

        <div v-else-if="!loading && letters.length === 0" class="text-center py-12">
          <v-icon size="64" color="grey-lighten-2">mdi-file-document-edit-outline</v-icon>
          <h3 class="text-h6 mt-4">{{ t("engagementLetters.noLettersFound") }}</h3>
          <p class="text-medium-emphasis">{{ t("engagementLetters.noLettersMessage") }}</p>
          <v-btn color="primary" @click="createNewLetter">{{
            t("engagementLetters.createNew")
          }}</v-btn>
        </div>

        <v-card v-else>
          <v-data-table
            :headers="tableHeaders"
            :items="letters"
            :loading="loading && letters.length > 0"
            :items-per-page="10"
            class="elevation-0"
          >
            <template #item.letterNumber="{ item }">
              <span class="font-weight-bold">{{ item.letterNumber }}</span>
            </template>
            <template #item.title="{ item }">
              <div>
                <div class="font-weight-medium">{{ item.title }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.institution?.name }}
                </div>
              </div>
            </template>
            <template #item.missionType="{ item }">
              <v-chip :color="getMissionTypeColor(item.missionType)" size="small" variant="tonal">
                {{ getMissionTypeLabel(item.missionType) }}
              </v-chip>
            </template>
            <template #item.estimatedTotal="{ item }">
              {{ formatCurrency(item.estimatedTotal) }}
            </template>
            <template #item.status="{ item }">
              <v-chip :color="getStatusColor(item.status)" size="small">
                {{ getStatusLabel(item.status) }}
              </v-chip>
            </template>
            <template #item.validUntil="{ item }">
              <span :class="{ 'text-error': isExpired(item) }">
                {{ formatDate(item.validUntil) }}
              </span>
            </template>
            <template #item.actions="{ item }">
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-eye"
                  variant="text"
                  size="small"
                  :title="t('common.view')"
                  @click="viewLetter(item)"
                />
                <v-btn
                  v-if="canModify(item)"
                  icon="mdi-pencil"
                  variant="text"
                  size="small"
                  :title="t('common.edit')"
                  @click="editLetter(item)"
                />
                <v-btn
                  icon="mdi-download"
                  variant="text"
                  size="small"
                  :title="t('engagementLetters.downloadPdf')"
                  @click="downloadPdf(item)"
                />
                <v-btn
                  v-if="canDelete(item)"
                  icon="mdi-delete"
                  variant="text"
                  color="error"
                  size="small"
                  :title="t('common.delete')"
                  @click="confirmDeleteLetter(item)"
                />
              </div>
            </template>
          </v-data-table>
        </v-card>
      </div>

      <div v-else>
        <EngagementLetterBuilder
          :letter="selectedLetter"
          @saved="handleLetterSaved"
          @cancelled="handleBuilderCancelled"
        />
      </div>

      <!-- Delete confirmation dialog -->
      <v-dialog v-model="deleteDialog.visible" max-width="400">
        <v-card>
          <v-card-title>{{ t("engagementLetters.confirmDelete.title") }}</v-card-title>
          <v-card-text>
            {{ t("engagementLetters.confirmDelete.message", { number: deleteDialog.letter?.letterNumber }) }}
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn @click="deleteDialog.visible = false">{{ t("common.cancel") }}</v-btn>
            <v-btn color="error" @click="deleteLetter">{{ t("common.delete") }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
        {{ snackbar.message }}
      </v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import EngagementLetterBuilder from "@/components/billing/engagement-letters/EngagementLetterBuilder.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { TableSkeleton } from "@/components/skeletons"
import { engagementLettersApi } from "@/services/api"
import type {
  EngagementLetter,
  EngagementLetterStatus,
  MissionType,
} from "@medical-crm/shared"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"

const { t } = useI18n()

const letters = ref<EngagementLetter[]>([])
const loading = ref(false)
const showBuilder = ref(false)
const selectedLetter = ref<EngagementLetter | null>(null)
const filters = ref({
  status: null as EngagementLetterStatus | null,
  missionType: null as MissionType | null,
  search: "",
})
const snackbar = ref({ visible: false, message: "", color: "info" })
const deleteDialog = ref({
  visible: false,
  letter: null as EngagementLetter | null,
})

const statusOptions = computed(() => [
  { label: t("engagementLetters.status.draft"), value: "draft" },
  { label: t("engagementLetters.status.sent"), value: "sent" },
  { label: t("engagementLetters.status.accepted"), value: "accepted" },
  { label: t("engagementLetters.status.rejected"), value: "rejected" },
  { label: t("engagementLetters.status.cancelled"), value: "cancelled" },
  { label: t("engagementLetters.status.completed"), value: "completed" },
])

const missionTypeOptions = computed(() => [
  { label: t("engagementLetters.missionType.audit"), value: "audit" },
  { label: t("engagementLetters.missionType.conseil"), value: "conseil" },
  { label: t("engagementLetters.missionType.formation"), value: "formation" },
  { label: t("engagementLetters.missionType.autre"), value: "autre" },
])

const tableHeaders = computed(() => [
  { title: t("engagementLetters.table.letterNumber"), value: "letterNumber" },
  { title: t("engagementLetters.table.title"), value: "title" },
  { title: t("engagementLetters.table.missionType"), value: "missionType" },
  { title: t("engagementLetters.table.amount"), value: "estimatedTotal", align: "end" as const },
  { title: t("engagementLetters.table.status"), value: "status" },
  { title: t("engagementLetters.table.validUntil"), value: "validUntil" },
  { title: t("engagementLetters.table.actions"), value: "actions", align: "end" as const, sortable: false },
])

let searchTimeout: ReturnType<typeof setTimeout>
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(loadLetters, 300)
}

const loadLetters = async () => {
  loading.value = true
  try {
    const response = await engagementLettersApi.getAll(filters.value as any)
    letters.value = response.data || []
  } catch (error) {
    showSnackbar(t("engagementLetters.messages.loadError"), "error")
  } finally {
    loading.value = false
  }
}

const createNewLetter = () => {
  selectedLetter.value = null
  showBuilder.value = true
}

const viewLetter = async (letter: EngagementLetter) => {
  try {
    const response = await engagementLettersApi.getById(letter.id)
    selectedLetter.value = response.data
    showBuilder.value = true
  } catch (error) {
    showSnackbar(t("engagementLetters.messages.loadError"), "error")
  }
}

const editLetter = async (letter: EngagementLetter) => {
  await viewLetter(letter)
}

const handleLetterSaved = () => {
  showBuilder.value = false
  selectedLetter.value = null
  loadLetters()
  showSnackbar(t("engagementLetters.messages.saved"), "success")
}

const handleBuilderCancelled = () => {
  showBuilder.value = false
  selectedLetter.value = null
}

const confirmDeleteLetter = (letter: EngagementLetter) => {
  deleteDialog.value = { visible: true, letter }
}

const deleteLetter = async () => {
  if (!deleteDialog.value.letter) return
  try {
    await engagementLettersApi.delete(deleteDialog.value.letter.id)
    deleteDialog.value.visible = false
    deleteDialog.value.letter = null
    loadLetters()
    showSnackbar(t("engagementLetters.messages.deleted"), "success")
  } catch (error) {
    showSnackbar(t("engagementLetters.messages.deleteError"), "error")
  }
}

const downloadPdf = async (letter: EngagementLetter) => {
  try {
    const response = await engagementLettersApi.generatePdf(letter.id)
    if (!response.ok) throw new Error("PDF generation failed")
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${letter.letterNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    showSnackbar(t("engagementLetters.messages.pdfError"), "error")
  }
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: "grey",
    sent: "blue",
    accepted: "success",
    rejected: "error",
    cancelled: "grey-darken-1",
    completed: "purple",
  }
  return colors[status] || "grey"
}

const getStatusLabel = (status: string) => {
  return t(`engagementLetters.status.${status}`)
}

const getMissionTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    audit: "indigo",
    conseil: "teal",
    formation: "orange",
    autre: "grey",
  }
  return colors[type] || "grey"
}

const getMissionTypeLabel = (type: string) => {
  return t(`engagementLetters.missionType.${type}`)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0)
}

const formatDate = (date: string | Date) => {
  if (!date) return "-"
  return new Intl.DateTimeFormat("fr-FR").format(new Date(date))
}

const isExpired = (letter: EngagementLetter) => {
  if (!letter.validUntil) return false
  if (["accepted", "completed", "rejected", "cancelled"].includes(letter.status)) return false
  return new Date(letter.validUntil) < new Date()
}

const canModify = (letter: EngagementLetter) => {
  return ["draft", "sent"].includes(letter.status)
}

const canDelete = (letter: EngagementLetter) => {
  return letter.status === "draft"
}

const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, message, color }
}

onMounted(() => {
  loadLetters()
})
</script>

<style scoped>
.engagement-letters-view {
  padding: 24px;
}
</style>
