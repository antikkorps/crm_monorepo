<template>
  <v-dialog v-model="dialogVisible" max-width="600px">
    <v-card>
      <v-card-title class="text-h5">{{ isEditing ? 'Modifier le contact' : 'Nouveau contact' }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleSubmit">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.firstName" label="Prénom *" :error-messages="errors.firstName" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.lastName" label="Nom *" :error-messages="errors.lastName" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.email" label="Email *" :error-messages="errors.email" type="email" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.phone" label="Téléphone" :error-messages="errors.phone" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.title" label="Titre" />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="form.institutionId"
                :items="institutions"
                item-title="name"
                item-value="id"
                label="Institution *"
                :error-messages="errors.institutionId"
                :disabled="isEditing"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox v-model="form.isPrimary" label="Contact principal pour cette institution" />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialog">Annuler</v-btn>
        <v-btn color="primary" :loading="submitting" @click="handleSubmit">{{ isEditing ? 'Mettre à jour' : 'Créer' }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { contactsApi, institutionsApi } from '@/services/api';
import type { ContactPerson } from '@medical-crm/shared';

const props = defineProps<{ visible: boolean, contact?: ContactPerson | null }>();
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void
  (e: "contact-saved"): void
  (e: "notify", payload: { message: string, color: string }): void
}>();

const dialogVisible = computed({ get: () => props.visible, set: (value) => emit("update:visible", value) });
const isEditing = computed(() => !!props.contact);

const form = ref<Partial<ContactPerson>>({});
const errors = ref<Record<string, string>>({});
const submitting = ref(false);
const institutions = ref<any[]>([]);

const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll();
    institutions.value = response.data.institutions;
  } catch (error) {
    console.error("Error loading institutions:", error);
  }
};

const validate = () => {
  errors.value = {};
  if (!form.value.firstName) errors.value.firstName = "Prénom requis";
  if (!form.value.lastName) errors.value.lastName = "Nom requis";
  if (!form.value.email) errors.value.email = "Email requis";
  if (!form.value.institutionId) errors.value.institutionId = "Institution requise";
  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  try {
    if (isEditing.value && form.value.id) {
      await contactsApi.update(form.value.id, form.value);
      emit("notify", { message: "Contact mis à jour", color: "success" });
    } else {
      await contactsApi.create(form.value as any);
      emit("notify", { message: "Contact créé", color: "success" });
    }
    emit("contact-saved");
    closeDialog();
  } catch (e) {
    emit("notify", { message: "Erreur lors de la sauvegarde", color: "error" });
  } finally {
    submitting.value = false;
  }
};

const closeDialog = () => {
  dialogVisible.value = false;
};

watch(() => props.contact, (newVal) => {
  if (newVal) {
    form.value = { ...newVal };
  } else {
    form.value = { isPrimary: false };
  }
  errors.value = {};
}, { immediate: true });

onMounted(loadInstitutions);
</script>
