<template>
  <AppLayout>
    <div class="contacts-view">
      <div class="d-flex justify-space-between align-center mb-4 flex-wrap gap-4">
        <div>
          <h1 class="text-h4 font-weight-bold">Contacts</h1>
          <p class="text-medium-emphasis">Gérez vos contacts professionnels</p>
        </div>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">Nouveau Contact</v-btn>
      </div>

      <!-- Filters -->
      <v-card class="mb-6" variant="outlined">
        <v-card-text>
          <v-row dense>
            <v-col cols="12" md="4" sm="12">
              <v-text-field v-model="filters.search" label="Rechercher..." prepend-inner-icon="mdi-magnify" variant="outlined" density="compact" hide-details @input="debouncedSearch" />
            </v-col>
            <v-col cols="12" md="4" sm="6">
              <v-select v-model="filters.institutionId" :items="institutions" item-title="name" item-value="id" label="Institution" variant="outlined" density="compact" clearable hide-details @update:model-value="loadContacts" />
            </v-col>
            <v-col cols="12" md="4" sm="6" class="d-flex justify-end">
              <v-btn variant="text" @click="clearFilters" :disabled="!hasActiveFilters">Effacer</v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Contacts Table -->
      <v-card>
        <v-data-table
          :headers="tableHeaders"
          :items="contacts"
          :loading="loading"
          :items-per-page="pagination.rowsPerPage"
          :page="pagination.currentPage"
          :items-length="totalRecords"
          @update:options="onTableUpdate"
          class="elevation-0"
        >
          <template #item.name="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" class="mr-3">
                <v-img :src="`https://i.pravatar.cc/40?u=${item.email}`" />
              </v-avatar>
              <div>
                <div class="font-weight-bold">{{ item.firstName }} {{ item.lastName }}</div>
                <div class="text-caption text-medium-emphasis">{{ item.title }}</div>
              </div>
            </div>
          </template>
          <template #item.email="{ item }">
            <a :href="`mailto:${item.email}`">{{ item.email }}</a>
          </template>
          <template #item.institution="{ item }">
            <router-link :to="`/institutions/${item.institution.id}`">{{ item.institution.name }}</router-link>
          </template>
          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <v-btn icon="mdi-pencil" variant="text" size="small" @click="editContact(item)" title="Modifier"></v-btn>
              <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="confirmDelete(item)" title="Supprimer"></v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>

      <!-- Create/Edit Dialog -->
      <ContactForm 
        v-model:visible="showFormDialog" 
        :contact="selectedContact" 
        @contact-saved="onContactSaved"
        @notify="({ message, color }) => showSnackbar(message, color)"
      />

      <!-- Delete Confirmation -->
      <v-dialog v-model="showDeleteDialog" max-width="420">
        <v-card>
          <v-card-title>Supprimer le contact</v-card-title>
          <v-card-text>Êtes-vous sûr de vouloir supprimer ce contact ? Cette action est irréversible.</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="showDeleteDialog = false">Annuler</v-btn>
            <v-btn color="error" @click="deleteContact">Supprimer</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">{{ snackbar.message }}</v-snackbar>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import ContactForm from '@/components/contacts/ContactForm.vue';
import { contactsApi, institutionsApi } from '@/services/api';
import type { ContactPerson } from '@medical-crm/shared';

const contacts = ref<ContactPerson[]>([]);
const institutions = ref<any[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const showFormDialog = ref(false);
const showDeleteDialog = ref(false);
const selectedContact = ref<ContactPerson | null>(null);
const snackbar = ref({ visible: false, message: '', color: 'info' });

const filters = ref({ search: '', institutionId: null });
const pagination = ref({ currentPage: 1, rowsPerPage: 10 });

const tableHeaders = [
  { title: 'Nom', value: 'name' },
  { title: 'Email', value: 'email' },
  { title: 'Téléphone', value: 'phone' },
  { title: 'Institution', value: 'institution' },
  { title: 'Actions', value: 'actions', align: 'end', sortable: false },
];

const hasActiveFilters = computed(() => !!(filters.value.search || filters.value.institutionId));

let searchTimeout: any;
const debouncedSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(loadContacts, 500);
};

const loadContacts = async () => {
  loading.value = true;
  try {
    const params = { ...filters.value, page: pagination.value.currentPage, limit: pagination.value.rowsPerPage };
    const response = await contactsApi.getAll(params);
    contacts.value = response.data;
    totalRecords.value = response.pagination?.total || 0;
  } catch (e) {
    showSnackbar("Erreur lors du chargement des contacts", "error");
  } finally {
    loading.value = false;
  }
};

const loadInstitutions = async () => {
  try {
    const response = await institutionsApi.getAll();
    institutions.value = response.data.institutions;
  } catch (error) {
    console.error("Error loading institutions:", error);
  }
};

const onTableUpdate = (options: any) => {
  pagination.value.currentPage = options.page;
  pagination.value.rowsPerPage = options.itemsPerPage;
  loadContacts();
};

const clearFilters = () => {
  filters.value = { search: '', institutionId: null };
  loadContacts();
};

const editContact = (contact: ContactPerson) => {
  selectedContact.value = { ...contact };
  showFormDialog.value = true;
};

const confirmDelete = (contact: ContactPerson) => {
  selectedContact.value = contact;
  showDeleteDialog.value = true;
};

const deleteContact = async () => {
  if (!selectedContact.value) return;
  try {
    await contactsApi.delete(selectedContact.value.id);
    showSnackbar("Contact supprimé avec succès", "success");
    loadContacts();
  } catch (e) {
    showSnackbar("Erreur lors de la suppression du contact", "error");
  } finally {
    showDeleteDialog.value = false;
    selectedContact.value = null;
  }
};

const onContactSaved = () => {
  showFormDialog.value = false;
  selectedContact.value = null;
  loadContacts();
};

const showSnackbar = (message: string, color: string = 'info') => {
  snackbar.value = { visible: true, message, color };
};

onMounted(() => {
  loadContacts();
  loadInstitutions();
});
</script>

<style scoped>
.contacts-view {
  padding: 1.5rem;
}
</style>
