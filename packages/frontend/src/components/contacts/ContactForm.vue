<template>
  <v-dialog v-model="dialogVisible" max-width="600px">
    <v-card>
      <v-card-title class="text-h5">{{ isEditing ? t('contacts.edit') : t('contacts.new') }}</v-card-title>
      <v-card-text>
        <v-form @submit.prevent="handleSubmit">
          <v-row dense>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.firstName" :label="t('contacts.firstName') + ' *'" :error-messages="errors.firstName" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.lastName" :label="t('contacts.lastName') + ' *'" :error-messages="errors.lastName" />
            </v-col>
            <v-col cols="12">
              <v-text-field v-model="form.email" :label="t('contacts.email') + ' *'" :error-messages="errors.email" type="email" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.phone" :label="t('contacts.phone')" :error-messages="errors.phone" />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field v-model="form.title" :label="t('contacts.title')" />
            </v-col>
            <v-col cols="12">
              <v-select
                v-model="form.institutionId"
                :items="institutions"
                item-title="name"
                item-value="id"
                :label="t('contacts.institution') + ' *'"
                :error-messages="errors.institutionId"
                :disabled="isEditing"
              />
            </v-col>
            <v-col cols="12">
              <v-checkbox v-model="form.isPrimary" :label="t('contacts.isPrimary')" />
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn text @click="closeDialog">{{ t('actions.cancel') }}</v-btn>
        <v-btn color="primary" :loading="submitting" @click="handleSubmit">{{ isEditing ? t('actions.edit') : t('actions.create') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { contactsApi, institutionsApi } from '@/services/api';
import type { ContactPerson } from '@medical-crm/shared';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ visible: boolean, contact?: ContactPerson | null }>();
const emit = defineEmits<{
  (e: "update:visible", value: boolean): void
  (e: "contact-saved"): void
  (e: "notify", payload: { message: string, color: string }): void
}>();

const dialogVisible = computed({ get: () => props.visible, set: (value) => emit("update:visible", value) });
const isEditing = computed(() => !!props.contact);
const { t } = useI18n();

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
  if (!form.value.firstName) errors.value.firstName = t('contacts.firstNameRequired');
  if (!form.value.lastName) errors.value.lastName = t('contacts.lastNameRequired');
  if (!form.value.email) errors.value.email = t('contacts.emailRequired');
  if (!form.value.institutionId) errors.value.institutionId = t('contacts.institutionRequired');
  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validate()) return;
  submitting.value = true;
  try {
    if (isEditing.value && form.value.id) {
      await contactsApi.update(form.value.id, form.value);
      emit("notify", { message: t('contacts.updated'), color: "success" });
    } else {
      await contactsApi.create(form.value as any);
      emit("notify", { message: t('contacts.created'), color: "success" });
    }
    emit("contact-saved");
    closeDialog();
  } catch (e) {
    emit("notify", { message: t('contacts.saveError'), color: "error" });
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
