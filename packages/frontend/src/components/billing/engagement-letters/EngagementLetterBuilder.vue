<template>
  <div class="engagement-letter-builder">
    <div class="letter-header">
      <div class="header-content">
        <h2>{{
          isEditing
            ? t("engagementLetters.builder.editTitle")
            : t("engagementLetters.builder.createTitle")
        }}</h2>
        <div v-if="isEditing && letter" class="letter-status">
          <v-chip :color="getStatusColor(letter.status)" size="small">
            {{ getStatusLabel(letter.status) }}
          </v-chip>
        </div>
      </div>
      <div class="header-actions">
        <v-btn variant="text" prepend-icon="mdi-arrow-left" @click="emit('cancelled')">
          {{ t("engagementLetters.builder.backToList") }}
        </v-btn>
      </div>
    </div>

    <BackToInstitutionBanner
      :institution-id="fromInstitution"
      :show-back-to-list="false"
    />

    <div class="letter-form">
      <!-- Basic Information -->
      <v-card class="form-section mb-6">
        <v-card-title>{{ t("engagementLetters.builder.basicInfo") }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="formData.institutionId"
                :items="institutionOptions"
                item-title="name"
                item-value="id"
                :label="t('engagementLetters.builder.institution') + ' *'"
                variant="outlined"
                :error-messages="errors.institutionId"
                :loading="loadingInstitutions"
                @update:model-value="onInstitutionChange"
                @update:search="onInstitutionSearch"
                no-filter
                clearable
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.templateId"
                :items="templates"
                item-title="name"
                item-value="id"
                :label="t('engagementLetters.builder.template')"
                variant="outlined"
                clearable
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.title"
                :label="t('engagementLetters.builder.title') + ' *'"
                variant="outlined"
                :error-messages="errors.title"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.missionType"
                :items="missionTypeOptions"
                item-title="label"
                item-value="value"
                :label="t('engagementLetters.builder.missionType') + ' *'"
                variant="outlined"
                :error-messages="errors.missionType"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.validUntil"
                :label="t('engagementLetters.builder.validUntil') + ' *'"
                type="date"
                variant="outlined"
                :error-messages="errors.validUntil"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.assignedUserId"
                :items="users"
                item-title="fullName"
                item-value="id"
                :label="t('engagementLetters.builder.assignedUser')"
                variant="outlined"
                clearable
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Mission Details -->
      <v-card class="form-section mb-6">
        <v-card-title>{{ t("engagementLetters.builder.missionDetails") }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <label class="text-body-2 mb-2 d-block">
                {{ t("engagementLetters.builder.scope") }}
              </label>
              <RichTextEditor
                v-model="formData.scope"
                :placeholder="t('engagementLetters.builder.scopePlaceholder')"
              />
            </v-col>

            <v-col cols="12">
              <label class="text-body-2 mb-2 d-block">
                {{ t("engagementLetters.builder.objectives") }}
              </label>
              <div class="objectives-list">
                <div
                  v-for="(objective, index) in formData.objectives"
                  :key="index"
                  class="objective-item d-flex align-center gap-2 mb-2"
                >
                  <v-text-field
                    v-model="formData.objectives[index]"
                    variant="outlined"
                    density="compact"
                    hide-details
                    :placeholder="t('engagementLetters.builder.objectivePlaceholder')"
                  />
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    size="small"
                    @click="removeObjective(index)"
                  />
                </div>
                <v-btn
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="addObjective"
                >
                  {{ t("engagementLetters.builder.addObjective") }}
                </v-btn>
              </div>
            </v-col>

            <v-col cols="12">
              <label class="text-body-2 mb-2 d-block">
                {{ t("engagementLetters.builder.deliverables") }}
              </label>
              <div class="deliverables-list">
                <v-card
                  v-for="(deliverable, index) in formData.deliverables"
                  :key="index"
                  variant="outlined"
                  class="mb-2 pa-3"
                >
                  <v-row dense>
                    <v-col cols="12" md="5">
                      <v-text-field
                        v-model="deliverable.name"
                        :label="t('engagementLetters.builder.deliverableName')"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" md="4">
                      <v-text-field
                        v-model="deliverable.description"
                        :label="t('engagementLetters.builder.deliverableDescription')"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" md="2">
                      <v-text-field
                        v-model="deliverable.dueDate"
                        :label="t('engagementLetters.builder.deliverableDueDate')"
                        type="date"
                        variant="outlined"
                        density="compact"
                        hide-details
                      />
                    </v-col>
                    <v-col cols="12" md="1" class="d-flex align-center justify-center">
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        color="error"
                        size="small"
                        @click="removeDeliverable(index)"
                      />
                    </v-col>
                  </v-row>
                </v-card>
                <v-btn
                  variant="outlined"
                  size="small"
                  prepend-icon="mdi-plus"
                  @click="addDeliverable"
                >
                  {{ t("engagementLetters.builder.addDeliverable") }}
                </v-btn>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Team Members -->
      <v-card class="form-section mb-6">
        <v-card-title class="d-flex justify-space-between align-center">
          <span>{{ t("engagementLetters.builder.teamMembers") }}</span>
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            size="small"
            @click="addMember"
          >
            {{ t("engagementLetters.builder.addMember") }}
          </v-btn>
        </v-card-title>
        <v-card-text>
          <div v-if="formData.members.length === 0" class="empty-members text-center py-8">
            <v-icon size="64" color="grey-lighten-2">mdi-account-group-outline</v-icon>
            <p class="text-h6 mt-4">{{ t("engagementLetters.builder.noMembers") }}</p>
            <v-btn color="primary" prepend-icon="mdi-plus" @click="addMember">
              {{ t("engagementLetters.builder.addFirstMember") }}
            </v-btn>
          </div>

          <div v-else class="members-container">
            <v-card
              v-for="(member, index) in formData.members"
              :key="member.tempId || member.id"
              variant="outlined"
              class="mb-3 pa-4"
            >
              <v-row align="center">
                <v-col cols="12" md="4">
                  <v-combobox
                    v-model="member.name"
                    :items="userNameOptions"
                    :label="t('engagementLetters.builder.memberName') + ' *'"
                    variant="outlined"
                    density="compact"
                    hide-details
                    @update:model-value="(val) => onMemberNameChange(index, val)"
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="member.role"
                    :label="t('engagementLetters.builder.memberRole') + ' *'"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="member.qualification"
                    :label="t('engagementLetters.builder.memberQualification')"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </v-col>
                <v-col cols="12" md="2" class="d-flex align-center justify-end gap-1">
                  <v-tooltip :text="t('engagementLetters.builder.isLead')" location="top">
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        :icon="member.isLead ? 'mdi-star' : 'mdi-star-outline'"
                        :color="member.isLead ? 'warning' : 'grey'"
                        variant="text"
                        size="small"
                        @click="member.isLead = !member.isLead"
                      />
                    </template>
                  </v-tooltip>
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    size="small"
                    @click="removeMember(index)"
                  />
                </v-col>
              </v-row>
            </v-card>
          </div>
        </v-card-text>
      </v-card>

      <!-- Timeline -->
      <v-card class="form-section mb-6">
        <v-card-title>{{ t("engagementLetters.builder.timeline") }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.startDate"
                :label="t('engagementLetters.builder.startDate')"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.endDate"
                :label="t('engagementLetters.builder.endDate')"
                type="date"
                variant="outlined"
              />
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model.number="formData.estimatedHours"
                :label="t('engagementLetters.builder.estimatedHours')"
                type="number"
                variant="outlined"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Financial -->
      <v-card class="form-section mb-6">
        <v-card-title>{{ t("engagementLetters.builder.financial") }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="6" md="3">
              <v-text-field
                v-model.number="formData.rate"
                :label="t('engagementLetters.builder.dailyRate') + ' HT *'"
                type="number"
                variant="outlined"
                suffix="€"
              />
            </v-col>
            <v-col cols="6" md="2">
              <v-text-field
                v-model.number="formData.totalDays"
                :label="t('engagementLetters.builder.totalDays') + ' *'"
                type="number"
                variant="outlined"
                min="0"
                step="0.5"
              />
            </v-col>
            <v-col cols="6" md="3">
              <v-text-field
                v-model.number="formData.travelExpenses"
                :label="t('engagementLetters.builder.travelExpenses')"
                type="number"
                variant="outlined"
                suffix="€"
                min="0"
              />
            </v-col>
            <v-col cols="6" md="4">
              <v-text-field
                :model-value="formatCurrency(calculatedTotal)"
                :label="t('engagementLetters.builder.estimatedTotal') + ' HT'"
                variant="outlined"
                readonly
                bg-color="grey-lighten-4"
              />
            </v-col>
          </v-row>

          <!-- TVA Section -->
          <v-divider class="my-4" />
          <v-row align="center">
            <v-col cols="12" md="3">
              <v-switch
                v-model="formData.showVat"
                :label="t('engagementLetters.builder.showVat')"
                color="primary"
                hide-details
              />
            </v-col>
            <v-col v-if="formData.showVat" cols="6" md="2">
              <v-text-field
                v-model.number="formData.vatRate"
                :label="t('engagementLetters.builder.vatRate')"
                type="number"
                variant="outlined"
                suffix="%"
                min="0"
                max="100"
                step="0.1"
                density="compact"
              />
            </v-col>
            <v-col v-if="formData.showVat" cols="6" md="3">
              <v-text-field
                :model-value="formatCurrency(calculatedVat)"
                :label="t('engagementLetters.builder.vatAmount')"
                variant="outlined"
                readonly
                bg-color="grey-lighten-4"
                density="compact"
              />
            </v-col>
            <v-col v-if="formData.showVat" cols="12" md="4">
              <v-text-field
                :model-value="formatCurrency(calculatedTotalWithVat)"
                :label="t('engagementLetters.builder.totalWithVat')"
                variant="outlined"
                readonly
                bg-color="primary-lighten-4"
                density="compact"
              />
            </v-col>
          </v-row>

          <div class="text-caption text-medium-emphasis mt-2">
            {{ t('engagementLetters.builder.totalFormula') }}
          </div>
        </v-card-text>
      </v-card>

      <!-- Terms and Conditions -->
      <v-card class="form-section mb-6">
        <v-card-title>{{ t("engagementLetters.builder.termsAndConditions") }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12" md="4">
              <v-select
                v-model="selectedCgvTemplate"
                :items="cgvTemplates"
                :label="t('engagementLetters.builder.cgvTemplate')"
                item-title="name"
                item-value="id"
                variant="outlined"
                density="comfortable"
                clearable
                :loading="loadingCgvTemplates"
                :hint="t('engagementLetters.builder.cgvTemplateHint')"
                persistent-hint
                @update:model-value="applyCgvTemplate"
              />
            </v-col>
            <v-col cols="12">
              <div class="text-body-2 text-medium-emphasis mb-2">
                {{ t("engagementLetters.builder.termsAndConditionsContent") }}
              </div>
              <RichTextEditor
                v-model="formData.termsAndConditions"
                :placeholder="t('engagementLetters.builder.termsAndConditionsPlaceholder')"
                min-height="200px"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Internal Notes -->
      <v-card class="form-section mb-6">
        <v-card-title>{{ t("engagementLetters.builder.notes") }}</v-card-title>
        <v-card-text>
          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="formData.internalNotes"
                :label="t('engagementLetters.builder.internalNotes')"
                variant="outlined"
                rows="2"
                :hint="t('engagementLetters.builder.internalNotesHint')"
                persistent-hint
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Form Actions -->
      <v-card class="form-section form-actions-section">
        <v-card-text>
          <div class="actions-container">
            <!-- Primary action: Save/Update -->
            <v-btn
              color="primary"
              prepend-icon="mdi-check"
              @click="saveLetter"
              :loading="saving"
              :disabled="!isFormValid"
            >
              {{
                isEditing
                  ? t("engagementLetters.builder.actions.update")
                  : t("engagementLetters.builder.actions.create")
              }}
            </v-btn>

            <!-- Save draft (creation only) -->
            <v-btn
              v-if="!isEditing"
              variant="outlined"
              color="secondary"
              prepend-icon="mdi-content-save"
              @click="saveDraft"
              :loading="saving"
              :disabled="!isFormValid"
            >
              {{ t("engagementLetters.builder.actions.saveDraft") }}
            </v-btn>

            <!-- PDF Download (editing only) -->
            <v-btn
              v-if="isEditing"
              variant="outlined"
              color="info"
              prepend-icon="mdi-download"
              @click="openDownloadDialog"
              :loading="downloading"
            >
              {{ t("engagementLetters.builder.actions.downloadPdf") }}
            </v-btn>

            <!-- Send (editing + can send) -->
            <v-btn
              v-if="canSend"
              color="success"
              prepend-icon="mdi-send"
              @click="openSendDialog"
              :loading="sending"
            >
              {{ t("engagementLetters.builder.actions.send") }}
            </v-btn>

            <!-- Workflow actions -->
            <v-btn
              v-if="canAccept"
              color="success"
              prepend-icon="mdi-check"
              @click="acceptLetter"
              :loading="saving"
            >
              {{ t("engagementLetters.builder.actions.accept") }}
            </v-btn>
            <v-btn
              v-if="canReject"
              color="error"
              variant="outlined"
              prepend-icon="mdi-close"
              @click="rejectLetter"
              :loading="saving"
            >
              {{ t("engagementLetters.builder.actions.reject") }}
            </v-btn>
            <v-btn
              v-if="canComplete"
              color="purple"
              prepend-icon="mdi-flag-checkered"
              @click="completeLetter"
              :loading="saving"
            >
              {{ t("engagementLetters.builder.actions.complete") }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <!-- Send Confirmation Dialog -->
    <v-dialog v-model="sendDialog.visible" max-width="500">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-send</v-icon>
          {{ t("engagementLetters.sendDialog.title") }}
        </v-card-title>
        <v-card-text>
          <p class="mb-4">{{ t("engagementLetters.sendDialog.description") }}</p>

          <v-text-field
            v-model="sendDialog.recipientEmail"
            :label="t('engagementLetters.sendDialog.recipientEmail')"
            type="email"
            variant="outlined"
            prepend-inner-icon="mdi-email"
            :hint="t('engagementLetters.sendDialog.recipientHint')"
            persistent-hint
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="sendDialog.visible = false">
            {{ t("common.cancel") }}
          </v-btn>
          <v-btn
            color="success"
            prepend-icon="mdi-send"
            @click="confirmSend"
            :loading="sending"
          >
            {{ t("engagementLetters.sendDialog.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Download Dialog -->
    <v-dialog v-model="downloadDialog.visible" max-width="450">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-download</v-icon>
          {{ t("engagementLetters.downloadDialog.title") }}
        </v-card-title>
        <v-card-text>
          <v-checkbox
            v-if="letter?.status === 'draft'"
            v-model="downloadDialog.markAsSent"
            :label="t('engagementLetters.downloadDialog.markAsSent')"
            :hint="t('engagementLetters.downloadDialog.markAsSentHint')"
            persistent-hint
            color="primary"
          />
          <p v-else class="text-body-2 text-medium-emphasis">
            {{ t("engagementLetters.downloadDialog.readyToDownload") }}
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="downloadDialog.visible = false">
            {{ t("common.cancel") }}
          </v-btn>
          <v-btn
            color="info"
            prepend-icon="mdi-download"
            @click="confirmDownload"
            :loading="downloading"
          >
            {{ t("engagementLetters.downloadDialog.confirm") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import RichTextEditor from "@/components/common/RichTextEditor.vue"
import { cgvTemplatesApi, type CgvTemplate } from "@/services/api/cgv-templates"
import { engagementLettersApi, institutionsApi, templatesApi, usersApi } from "@/services/api"
import { useInstitutionsStore } from "@/stores/institutions"
import type {
  BillingType,
  Deliverable,
  DocumentTemplate,
  EngagementLetter,
  EngagementLetterMember,
  MissionType,
} from "@medical-crm/shared"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"
import BackToInstitutionBanner from "@/components/common/BackToInstitutionBanner.vue"

const { t } = useI18n()

interface Props {
  letter?: EngagementLetter | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  saved: []
  cancelled: []
}>()

// Router state
const route = useRoute()
const fromInstitution = computed(() => route.query.fromInstitution as string | undefined)

// Reactive state
const institutionsStore = useInstitutionsStore()
const saving = ref(false)
const sending = ref(false)
const downloading = ref(false)
const snackbar = ref({ visible: false, message: "", color: "info" })

// Dialog states
const sendDialog = ref({
  visible: false,
  recipientEmail: "",
})

const downloadDialog = ref({
  visible: false,
  markAsSent: false,
})

interface MemberFormData extends Omit<EngagementLetterMember, "id" | "engagementLetterId"> {
  id?: string
  tempId?: string
  userId?: string
}

interface FormData {
  institutionId: string
  templateId?: string
  assignedUserId?: string
  title: string
  missionType: MissionType
  scope: string
  objectives: string[]
  deliverables: (Deliverable & { dueDate?: string })[]
  startDate: string
  endDate: string
  estimatedHours: number
  billingType: BillingType
  rate: number
  totalDays: number
  travelExpenses: number
  vatRate: number
  showVat: boolean
  validUntil: string
  termsAndConditions: string
  internalNotes: string
  members: MemberFormData[]
}

const formData = ref<FormData>({
  institutionId: "",
  templateId: "",
  assignedUserId: "",
  title: "",
  missionType: "audit" as MissionType,
  scope: "",
  objectives: [],
  deliverables: [],
  startDate: "",
  endDate: "",
  estimatedHours: 0,
  billingType: "daily" as BillingType,
  rate: 0,
  totalDays: 0,
  travelExpenses: 0,
  vatRate: 20,
  showVat: true,
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  termsAndConditions: "",
  internalNotes: "",
  members: [],
})

// Data sources
const templates = ref<DocumentTemplate[]>([])
const users = ref<{ id: string; fullName: string; email: string }[]>([])
const errors = ref<Record<string, string>>({})
const institutionOptions = ref<any[]>([])
const loadingInstitutions = ref(false)

// Options
const missionTypeOptions = computed(() => [
  { label: t("engagementLetters.missionType.audit"), value: "audit" },
  { label: t("engagementLetters.missionType.conseil"), value: "conseil" },
  { label: t("engagementLetters.missionType.formation"), value: "formation" },
  { label: t("engagementLetters.missionType.autre"), value: "autre" },
])

const billingTypeOptions = computed(() => [
  { label: t("engagementLetters.billingType.fixed"), value: "fixed" },
  { label: t("engagementLetters.billingType.hourly"), value: "hourly" },
  { label: t("engagementLetters.billingType.daily"), value: "daily" },
])

const userNameOptions = computed(() => users.value.map((u) => u.fullName))

// CGV Templates - predefined terms and conditions
const selectedCgvTemplate = ref<string | null>(null)

// CGV Templates - loaded from API
const cgvTemplates = ref<CgvTemplate[]>([])
const loadingCgvTemplates = ref(false)

/**
 * Load CGV templates from the API
 */
async function loadCgvTemplates() {
  try {
    loadingCgvTemplates.value = true
    cgvTemplates.value = await cgvTemplatesApi.getAll()
  } catch (error) {
    console.error("Failed to load CGV templates:", error)
    // Silent fail - user can still type their own CGV
  } finally {
    loadingCgvTemplates.value = false
  }
}

/**
 * Apply selected CGV template to the form
 */
function applyCgvTemplate(templateId: string | null) {
  if (!templateId) {
    return
  }

  const template = cgvTemplates.value.find((t) => t.id === templateId)
  if (template) {
    formData.value.termsAndConditions = template.content
  }
}

// Computed
const isEditing = computed(() => !!props.letter)

const isFormValid = computed(() => {
  return (
    formData.value.institutionId &&
    formData.value.title.trim() &&
    formData.value.missionType &&
    formData.value.validUntil
  )
})

const calculatedTotal = computed(() => {
  // Simple formula: (rate × totalDays) + travelExpenses
  // Ensure all values are numbers (API might return strings)
  const rate = Number(formData.value.rate) || 0
  const days = Number(formData.value.totalDays) || 0
  const travel = Number(formData.value.travelExpenses) || 0
  return rate * days + travel
})

const calculatedVat = computed(() => {
  if (!formData.value.showVat) return 0
  const vatRate = Number(formData.value.vatRate) || 0
  return calculatedTotal.value * (vatRate / 100)
})

const calculatedTotalWithVat = computed(() => {
  return calculatedTotal.value + calculatedVat.value
})

// Workflow permissions
const canSend = computed(() => {
  return isEditing.value && props.letter?.status === "draft"
})

const canAccept = computed(() => {
  return isEditing.value && props.letter?.status === "sent"
})

const canReject = computed(() => {
  return isEditing.value && props.letter?.status === "sent"
})

const canComplete = computed(() => {
  return isEditing.value && props.letter?.status === "accepted"
})

// Methods
const loadTemplates = async () => {
  try {
    const response = await templatesApi.getAll({ type: "engagement_letter" })
    templates.value = ((response as any)?.data || []) as DocumentTemplate[]
  } catch (error) {
    console.error("Failed to load templates:", error)
  }
}

const loadUsers = async () => {
  try {
    const response = await usersApi.getAll()
    const usersData = (response as any)?.data || response || []
    users.value = usersData.map((u: any) => ({
      id: u.id,
      fullName: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
      email: u.email,
    }))
  } catch (error) {
    console.error("Failed to load users:", error)
  }
}

const loadInstitutions = async () => {
  try {
    await institutionsStore.fetchInstitutions()
    const storeInstitutions = institutionsStore.institutions || []
    // Deduplicate by ID to prevent duplicate key warnings
    const seenIds = new Set<string>()
    institutionOptions.value = storeInstitutions.filter((inst: any) => {
      if (seenIds.has(inst.id)) return false
      seenIds.add(inst.id)
      return true
    })
  } catch (error) {
    console.error("Error loading institutions:", error)
    institutionOptions.value = []
  }
}

const loadInstitutionById = async (institutionId: string) => {
  if (!institutionId) return

  const existingInstitution = institutionOptions.value.find((i: any) => i.id === institutionId)
  if (existingInstitution) return

  try {
    const response = await institutionsApi.getById(institutionId)
    const institution = (response as any)?.data || response
    if (institution) {
      // Re-check to handle race conditions
      if (!institutionOptions.value.some((i: any) => i.id === institution.id)) {
        institutionOptions.value = [...institutionOptions.value, institution]
      }
    }
  } catch (error) {
    console.error("Failed to load institution:", error)
  }
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const onInstitutionSearch = async (search: string | null) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  if (!search || search.length < 2) {
    loadingInstitutions.value = true
    await loadInstitutions()
    loadingInstitutions.value = false
    return
  }

  searchDebounceTimer = setTimeout(async () => {
    try {
      loadingInstitutions.value = true
      const response = await institutionsApi.search(search, { limit: 50 })
      const data = (response as any).data || response

      let institutionsArray: any[] = []
      if (Array.isArray(data)) {
        institutionsArray = data
      } else if (data && Array.isArray(data.institutions)) {
        institutionsArray = data.institutions
      }

      // Deduplicate by ID to prevent duplicate key warnings
      const seenIds = new Set<string>()
      institutionOptions.value = institutionsArray.filter((inst: any) => {
        if (seenIds.has(inst.id)) return false
        seenIds.add(inst.id)
        return true
      })
    } catch (error) {
      console.error("Error searching institutions:", error)
      institutionOptions.value = []
    } finally {
      loadingInstitutions.value = false
    }
  }, 300)
}

const onInstitutionChange = () => {
  delete errors.value.institutionId
}

// Objectives management
const addObjective = () => {
  formData.value.objectives.push("")
}

const removeObjective = (index: number) => {
  formData.value.objectives.splice(index, 1)
}

// Deliverables management
const addDeliverable = () => {
  formData.value.deliverables.push({
    name: "",
    description: "",
    dueDate: "",
  })
}

const removeDeliverable = (index: number) => {
  formData.value.deliverables.splice(index, 1)
}

// Members management
const addMember = () => {
  formData.value.members.push({
    tempId: `temp-${Date.now()}`,
    name: "",
    role: "",
    qualification: "",
    dailyRate: 0,
    estimatedDays: 0,
    isLead: formData.value.members.length === 0, // First member is lead by default
    orderIndex: formData.value.members.length,
  })
}

const removeMember = (index: number) => {
  formData.value.members.splice(index, 1)
  // Update order indexes
  formData.value.members.forEach((member, idx) => {
    member.orderIndex = idx
  })
}

const onMemberNameChange = (index: number, value: string) => {
  // Check if the selected value matches a user
  const matchedUser = users.value.find((u) => u.fullName === value)
  if (matchedUser) {
    formData.value.members[index].userId = matchedUser.id
    formData.value.members[index].name = matchedUser.fullName
  } else {
    formData.value.members[index].userId = undefined
    formData.value.members[index].name = value
  }
}

// Form actions
const validateForm = () => {
  const newErrors: Record<string, string> = {}

  if (!formData.value.institutionId) {
    newErrors.institutionId = t("engagementLetters.builder.institutionRequired")
  }

  if (!formData.value.title.trim()) {
    newErrors.title = t("engagementLetters.builder.titleRequired")
  }

  if (!formData.value.missionType) {
    newErrors.missionType = t("engagementLetters.builder.missionTypeRequired")
  }

  if (!formData.value.validUntil) {
    newErrors.validUntil = t("engagementLetters.builder.validUntilRequired")
  }

  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

const prepareDataForSubmission = () => {
  // Filter out empty objectives
  const objectives = formData.value.objectives.filter((o) => o.trim())

  // Filter out incomplete deliverables and convert dates
  const deliverables = formData.value.deliverables
    .filter((d) => d.name.trim())
    .map((d) => ({
      name: d.name,
      description: d.description,
      dueDate: d.dueDate ? new Date(d.dueDate) : undefined,
    }))

  // Prepare members
  const members = formData.value.members.map((m, index) => ({
    userId: m.userId,
    name: m.name,
    role: m.role,
    qualification: m.qualification,
    dailyRate: m.dailyRate || 0,
    estimatedDays: m.estimatedDays || 0,
    isLead: m.isLead,
    orderIndex: index,
  }))

  return {
    institutionId: formData.value.institutionId,
    templateId: formData.value.templateId || undefined,
    assignedUserId: formData.value.assignedUserId || undefined,
    title: formData.value.title,
    missionType: formData.value.missionType,
    scope: formData.value.scope || undefined,
    objectives: objectives.length > 0 ? objectives : undefined,
    deliverables: deliverables.length > 0 ? deliverables : undefined,
    startDate: formData.value.startDate ? new Date(formData.value.startDate) : undefined,
    endDate: formData.value.endDate ? new Date(formData.value.endDate) : undefined,
    estimatedHours: formData.value.estimatedHours || undefined,
    billingType: formData.value.billingType,
    rate: formData.value.rate || 0,
    totalDays: formData.value.totalDays || 0,
    travelExpenses: formData.value.travelExpenses || 0,
    vatRate: formData.value.vatRate ?? 20,
    showVat: formData.value.showVat ?? true,
    estimatedTotal: calculatedTotal.value,
    validUntil: new Date(formData.value.validUntil),
    termsAndConditions: formData.value.termsAndConditions || undefined,
    internalNotes: formData.value.internalNotes || undefined,
    members: members.length > 0 ? members : undefined,
  }
}

const saveDraft = async () => {
  if (!validateForm()) return
  await saveLetter()
}

const saveLetter = async () => {
  if (!validateForm()) return

  try {
    saving.value = true
    const data = prepareDataForSubmission()

    if (isEditing.value && props.letter) {
      await engagementLettersApi.update(props.letter.id, data)
    } else {
      await engagementLettersApi.create(data)
    }

    showSnackbar(t("engagementLetters.messages.saved"), "success")
    emit("saved")
  } catch (error) {
    console.error("Failed to save engagement letter:", error)
    showSnackbar(t("engagementLetters.messages.saveError"), "error")
  } finally {
    saving.value = false
  }
}

const openSendDialog = () => {
  // Pre-fill with institution email if available
  const institution = institutionOptions.value.find(
    (inst: any) => inst.id === formData.value.institutionId
  )
  sendDialog.value.recipientEmail = institution?.email || ""
  sendDialog.value.visible = true
}

const confirmSend = async () => {
  if (!props.letter) return

  try {
    sending.value = true
    await engagementLettersApi.send(props.letter.id, sendDialog.value.recipientEmail || undefined)
    sendDialog.value.visible = false
    showSnackbar(t("engagementLetters.messages.sent"), "success")
    emit("saved")
  } catch (error) {
    console.error("Failed to send engagement letter:", error)
    showSnackbar(t("engagementLetters.messages.sendError"), "error")
  } finally {
    sending.value = false
  }
}

const acceptLetter = async () => {
  if (!props.letter) return

  try {
    saving.value = true
    await engagementLettersApi.accept(props.letter.id)
    showSnackbar(t("engagementLetters.messages.accepted"), "success")
    emit("saved")
  } catch (error) {
    console.error("Failed to accept engagement letter:", error)
    showSnackbar(t("engagementLetters.messages.acceptError"), "error")
  } finally {
    saving.value = false
  }
}

const rejectLetter = async () => {
  if (!props.letter) return

  try {
    saving.value = true
    await engagementLettersApi.reject(props.letter.id)
    showSnackbar(t("engagementLetters.messages.rejected"), "success")
    emit("saved")
  } catch (error) {
    console.error("Failed to reject engagement letter:", error)
    showSnackbar(t("engagementLetters.messages.rejectError"), "error")
  } finally {
    saving.value = false
  }
}

const completeLetter = async () => {
  if (!props.letter) return

  try {
    saving.value = true
    await engagementLettersApi.complete(props.letter.id)
    showSnackbar(t("engagementLetters.messages.completed"), "success")
    emit("saved")
  } catch (error) {
    console.error("Failed to complete engagement letter:", error)
    showSnackbar(t("engagementLetters.messages.completeError"), "error")
  } finally {
    saving.value = false
  }
}

const openDownloadDialog = () => {
  // Show mark as sent option only if letter is in draft status
  downloadDialog.value.markAsSent = false
  downloadDialog.value.visible = true
}

const confirmDownload = async () => {
  if (!props.letter) return

  try {
    downloading.value = true

    // If markAsSent is checked and letter is draft, send it first
    if (downloadDialog.value.markAsSent && props.letter.status === "draft") {
      await engagementLettersApi.send(props.letter.id)
    }

    const response = await engagementLettersApi.generatePdf(props.letter.id)

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${props.letter.letterNumber}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    downloadDialog.value.visible = false

    if (downloadDialog.value.markAsSent) {
      showSnackbar(t("engagementLetters.messages.pdfDownloadedAndSent"), "success")
      emit("saved") // Refresh to show new status
    } else {
      showSnackbar(t("engagementLetters.messages.pdfDownloaded"), "success")
    }
  } catch (error) {
    console.error("Failed to download PDF:", error)
    showSnackbar(t("engagementLetters.messages.pdfError"), "error")
  } finally {
    downloading.value = false
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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount || 0)
}

const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, message, color }
}

// Load letter data for editing
const loadLetterData = async () => {
  if (props.letter) {
    // Convert all numeric values to numbers (API might return strings from DECIMAL columns)
    let totalDays = Number(props.letter.totalDays) || 0
    let travelExpenses = Number(props.letter.travelExpenses) || 0
    const rate = Number(props.letter.rate) || 0
    const storedTotal = Number(props.letter.estimatedTotal) || 0

    // Handle backwards compatibility: if totalDays is 0 but estimatedTotal > 0 and rate > 0,
    // back-calculate totalDays from the stored estimatedTotal
    if (totalDays === 0 && storedTotal > 0 && rate > 0) {
      // Old letter with member-based calculation - back-calculate totalDays
      // Assume no travel expenses for old letters
      totalDays = Math.round((storedTotal / rate) * 100) / 100 // Round to 2 decimals
    }

    formData.value = {
      institutionId: props.letter.institutionId,
      templateId: props.letter.templateId || "",
      assignedUserId: props.letter.assignedUserId || "",
      title: props.letter.title,
      missionType: props.letter.missionType,
      scope: props.letter.scope || "",
      objectives: props.letter.objectives || [],
      deliverables: (props.letter.deliverables || []).map((d) => ({
        name: d.name,
        description: d.description || "",
        dueDate: d.dueDate ? new Date(d.dueDate).toISOString().split("T")[0] : "",
      })),
      startDate: props.letter.startDate
        ? new Date(props.letter.startDate).toISOString().split("T")[0]
        : "",
      endDate: props.letter.endDate
        ? new Date(props.letter.endDate).toISOString().split("T")[0]
        : "",
      estimatedHours: Number(props.letter.estimatedHours) || 0,
      billingType: props.letter.billingType,
      rate: rate,
      totalDays: totalDays,
      travelExpenses: travelExpenses,
      vatRate: Number(props.letter.vatRate) ?? 20,
      showVat: props.letter.showVat ?? true,
      validUntil: new Date(props.letter.validUntil).toISOString().split("T")[0],
      termsAndConditions: props.letter.termsAndConditions || "",
      internalNotes: props.letter.internalNotes || "",
      members: (props.letter.members || []).map((m) => ({
        id: m.id,
        tempId: `existing-${m.id}`,
        userId: m.userId,
        name: m.name,
        role: m.role,
        qualification: m.qualification || "",
        dailyRate: Number(m.dailyRate) || 0,
        estimatedDays: Number(m.estimatedDays) || 0,
        isLead: m.isLead,
        orderIndex: m.orderIndex,
      })),
    }

    // Load the specific institution to ensure it appears in the dropdown
    await loadInstitutionById(props.letter.institutionId)
  }
}

// Watch for letter changes
watch(() => props.letter, loadLetterData, { immediate: true })

// Initialize component
onMounted(async () => {
  await Promise.all([loadInstitutions(), loadTemplates(), loadUsers(), loadCgvTemplates()])
})
</script>

<style scoped>
.engagement-letter-builder {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.letter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-content h2 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.letter-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.objectives-list,
.deliverables-list {
  margin-top: 0.5rem;
}

.empty-members {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.members-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-actions-section {
  margin-top: 1rem;
}

.actions-container {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

/* Responsive design */
@media (max-width: 960px) {
  .engagement-letter-builder {
    padding: 0.75rem;
  }

  .letter-header {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 1rem;
  }

  .header-content h2 {
    font-size: 1.25rem;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    gap: 0.5rem;
  }

  .actions-container {
    flex-direction: column;
  }

  .actions-container .v-btn {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .engagement-letter-builder {
    padding: 0.5rem;
  }

  .header-content h2 {
    font-size: 1.1rem;
  }

  .header-content {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}
</style>
