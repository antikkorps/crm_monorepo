<template>
  <v-form ref="formRef" @submit.prevent="handleSubmit">
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="form.name"
          label="Nom de l'opportunité *"
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
          label="Institution *"
          :rules="[rules.required]"
          variant="outlined"
          density="comfortable"
          :loading="loadingInstitutions"
          @update:modelValue="loadContacts"
        ></v-autocomplete>
      </v-col>

      <v-col cols="12" md="6">
        <v-autocomplete
          v-model="form.contactPersonId"
          :items="contacts"
          item-title="fullName"
          item-value="id"
          label="Contact Principal"
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
          label="Valeur (€) *"
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
          label="Probabilité (%)"
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
          label="Étape *"
          :rules="[rules.required]"
          variant="outlined"
          density="comfortable"
        ></v-select>
      </v-col>

      <v-col cols="12" md="6">
        <v-text-field
          v-model="form.expectedCloseDate"
          label="Date de clôture prévue *"
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
          label="Concurrents"
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
          label="Source"
          variant="outlined"
          density="comfortable"
          placeholder="Ex: Recommandation, Site Web, Salon..."
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

    <div class="d-flex justify-end gap-2">
      <v-btn variant="text" @click="handleCancel">Annuler</v-btn>
      <v-btn
        type="submit"
        color="primary"
        :loading="loading"
        :disabled="loading"
      >
        {{ opportunity ? "Mettre à jour" : "Créer" }}
      </v-btn>
    </div>
  </v-form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import type { Opportunity, OpportunityStage } from "@medical-crm/shared"
import { useOpportunitiesStore } from "@/stores/opportunities"
import { institutionsApi } from "@/services/api"
import { useAuthStore } from "@/stores/auth"

interface Props {
  opportunity?: Opportunity | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  submit: []
  cancel: []
}>()

const opportunitiesStore = useOpportunitiesStore()
const authStore = useAuthStore()
const formRef = ref<any>(null)
const loading = ref(false)
const loadingInstitutions = ref(false)
const loadingContacts = ref(false)
const institutions = ref<any[]>([])
const contacts = ref<any[]>([])

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

const stageOptions = [
  { title: "Prospection", value: "prospecting" },
  { title: "Qualification", value: "qualification" },
  { title: "Proposition", value: "proposal" },
  { title: "Négociation", value: "negotiation" },
]

const rules = {
  required: (value: any) => !!value || "Ce champ est requis",
  positive: (value: number) => value >= 0 || "La valeur doit être positive",
}

const loadInstitutions = async () => {
  loadingInstitutions.value = true
  try {
    const response = await institutionsApi.getAll({ limit: 1000 })
    const data = response.data?.data || response.data || response
    institutions.value = data.institutions || data || []
  } catch (err) {
    console.error("Failed to load institutions:", err)
  } finally {
    loadingInstitutions.value = false
  }
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
  await loadInstitutions()

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
    await loadContacts()
  } else {
    // Set default expected close date to 30 days from now
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 30)
    form.value.expectedCloseDate = defaultDate.toISOString().split("T")[0]
  }
})
</script>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}
</style>
