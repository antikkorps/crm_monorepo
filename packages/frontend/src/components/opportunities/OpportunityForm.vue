<template>
  <v-form ref="formRef" @submit.prevent="handleSubmit">
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="form.name"
          :label="t('opportunities.titleField') + ' *'"
          :rules="[rules.required]"
          variant="outlined"
          density="comfortable"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="form.institutionId"
          :items="institutions"
          item-title="name"
          item-value="id"
          :label="t('opportunities.institutionField') + ' *'"
          :rules="[rules.required]"
          variant="outlined"
          density="comfortable"
          :loading="loadingInstitutions"
          :search="institutionSearch"
          @update:search="handleInstitutionSearch"
          @update:modelValue="loadContacts"
        ></v-autocomplete>
      </v-col>

      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="form.contactPersonId"
          :items="contacts"
          item-title="fullName"
          item-value="id"
          :label="t('opportunities.contactPersonField')"
          variant="outlined"
          density="comfortable"
          :loading="loadingContacts"
          :disabled="!form.institutionId"
          clearable
        ></v-autocomplete>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model.number="form.value"
          :label="t('opportunities.valueField') + ' *'"
          type="number"
          :rules="[rules.required, rules.positive]"
          variant="outlined"
          density="comfortable"
          prefix="€"
        ></v-text-field>
      </v-col>

      <v-col cols="12" md="6">
        <v-slider
          v-model="form.probability"
          :label="t('opportunities.probabilityField')"
          :min="0"
          :max="100"
          :step="5"
          thumb-label
          variant="outlined"
        >
          <template #append>
            <v-text-field
              v-model.number="form.probability"
              type="number"
              :min="0"
              :max="100"
              hide-details
              single-line
              density="compact"
              style="width: 70px"
            ></v-text-field>
          </template>
        </v-slider>
      </v-col>

      <v-col cols="12" md="6">
        <v-select
          v-model="form.stage"
          :items="stageOptions"
          :label="t('opportunities.stageField') + ' *'"
          :rules="[rules.required]"
          variant="outlined"
          density="comfortable"
        ></v-select>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.expectedCloseDate"
          :label="t('opportunities.expectedCloseDateField') + ' *'"
          type="date"
          :rules="[rules.required]"
          variant="outlined"
          density="comfortable"
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-textarea
          v-model="form.description"
          label="Description"
          variant="outlined"
          density="comfortable"
          rows="3"
        ></v-textarea>
      </v-col>

      <v-col cols="12">
        <v-combobox
          v-model="form.tags"
          label="Tags"
          variant="outlined"
          density="comfortable"
          multiple
          chips
          closable-chips
        ></v-combobox>
      </v-col>

      <v-col cols="12">
        <v-combobox
          v-model="form.competitors"
          :label="t('opportunities.competitorsField')"
          variant="outlined"
          density="comfortable"
          multiple
          chips
          closable-chips
        ></v-combobox>
      </v-col>

      <v-col cols="12">
        <v-text-field
          v-model="form.source"
          :label="t('opportunities.sourceField')"
          variant="outlined"
          density="comfortable"
          :placeholder="t('opportunities.sourcePlaceholder')"
        ></v-text-field>
      </v-col>

      <v-col cols="12">
        <v-textarea
          v-model="form.notes"
          label="Notes"
          variant="outlined"
          density="comfortable"
          rows="3"
        ></v-textarea>
      </v-col>
    </v-row>

    <v-divider class="my-4"></v-divider>

    <div class="d-flex justify-end ga-2">
      <v-btn variant="text" @click="handleCancel">{{ $t('opportunities.cancel') }}</v-btn>
      <v-btn
        type="submit"
        color="primary"
        :loading="loading"
        :disabled="loading"
      >
        {{ opportunity ? $t('opportunities.update') : $t('opportunities.create') }}
      </v-btn>
    </div>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue"
import type { Opportunity, OpportunityStage } from "@medical-crm/shared"
import { useOpportunitiesStore } from "@/stores/opportunities"
import { institutionsApi } from "@/services/api"
import { useAuthStore } from "@/stores/auth"
import { useI18n } from "vue-i18n"

interface Props {
  opportunity?: Opportunity | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const { t } = useI18n()
const opportunitiesStore = useOpportunitiesStore()
const authStore = useAuthStore()
const formRef = ref<any>(null)
const loading = ref(false)
const loadingInstitutions = ref(false)
const loadingContacts = ref(false)
const institutions = ref<any[]>([])
const contacts = ref<any[]>([])
const institutionSearch = ref("")
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const form = ref({
  institutionId: "",
  contactPersonId: null as string | null,
  assignedUserId: authStore.user?.id || "",
  name: "",
  description: "",
  stage: "prospecting" as OpportunityStage,
  value: 0,
  probability: 50,
  expectedCloseDate: "",
  tags: [] as string[],
  competitors: [] as string[],
  source: "",
  notes: "",
})

const stageOptions = computed(() => [
  { title: t('opportunities.stage.prospecting'), value: "prospecting" },
  { title: t('opportunities.stage.qualification'), value: "qualification" },
  { title: t('opportunities.stage.proposal'), value: "proposal" },
  { title: t('opportunities.stage.negotiation'), value: "negotiation" },
])

const rules = computed(() => ({
  required: (value: any) => !!value || t('validation.required', { field: 'Field' }),
  positive: (value: number) => value >= 0 || "Value must be positive",
}))

const searchInstitutions = async (query: string) => {
  if (!query || query.length < 2) {
    institutions.value = []
    return
  }

  loadingInstitutions.value = true
  try {
    const response = await institutionsApi.search(query, { limit: 50 })
    const data = response.data?.data || response.data || response
    institutions.value = data.institutions || data || []
  } catch (err) {
    console.error("Failed to search institutions:", err)
    institutions.value = []
  } finally {
    loadingInstitutions.value = false
  }
}

const handleInstitutionSearch = (query: string | null) => {
  institutionSearch.value = query || ""

  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  // Debounce search with 300ms delay
  searchTimeout = setTimeout(() => {
    searchInstitutions(institutionSearch.value)
  }, 300)
}

const loadContacts = async () => {
  if (!form.value.institutionId) {
    contacts.value = []
    return
  }

  loadingContacts.value = true
  try {
    const response = await institutionsApi.getById(form.value.institutionId)
    const data = response.data?.data?.institution || response.data?.institution || response.data
    const contactPersons = data.contactPersons || []

    contacts.value = contactPersons.map((contact: any) => ({
      ...contact,
      fullName: `${contact.firstName} ${contact.lastName}`,
    }))

    // Reset contact if institution changed
    if (
      form.value.contactPersonId &&
      !contacts.value.find((c) => c.id === form.value.contactPersonId)
    ) {
      form.value.contactPersonId = null
    }
  } catch (err) {
    console.error("Failed to load contacts:", err)
    contacts.value = []
  } finally {
    loadingContacts.value = false
  }
}

const handleSubmit = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid) return

  // Validate that contact belongs to the selected institution (if both are set)
  if (form.value.contactPersonId && form.value.institutionId) {
    const contactBelongsToInstitution = contacts.value.find(
      (c) => c.id === form.value.contactPersonId
    )
    if (!contactBelongsToInstitution) {
      console.error("Contact person does not belong to the selected institution")
      // Reset contact if institution has changed
      form.value.contactPersonId = null
    }
  }

  loading.value = true

  try {
    if (props.opportunity) {
      await opportunitiesStore.updateOpportunity(props.opportunity.id, form.value)
    } else {
      await opportunitiesStore.createOpportunity(form.value)
    }
    emit("submit")
  } catch (err) {
    console.error("Failed to save opportunity:", err)
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  emit("cancel")
}

onMounted(async () => {
  if (props.opportunity) {
    form.value = {
      institutionId: props.opportunity.institutionId,
      contactPersonId: props.opportunity.contactPersonId || null,
      assignedUserId: props.opportunity.assignedUserId,
      name: props.opportunity.name,
      description: props.opportunity.description || "",
      stage: props.opportunity.stage,
      value: parseFloat(props.opportunity.value.toString()),
      probability: props.opportunity.probability,
      expectedCloseDate: new Date(props.opportunity.expectedCloseDate)
        .toISOString()
        .split("T")[0],
      tags: props.opportunity.tags || [],
      competitors: props.opportunity.competitors || [],
      source: props.opportunity.source || "",
      notes: props.opportunity.notes || "",
    }
    // Load the selected institution to display in autocomplete
    if (props.opportunity.institution) {
      institutions.value = [props.opportunity.institution]
    }
    await loadContacts()
  } else {
    // Set default expected close date to 30 days from now
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 30)
    form.value.expectedCloseDate = defaultDate.toISOString().split("T")[0]
  }
})

onUnmounted(() => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
})
</script>
