<template>
  <AppLayout>
    <div class="institution-detail-view">
      <DetailSkeleton v-if="loading" tabs :tabs-count="6" />

      <div v-else-if="error" class="text-center py-12">
        <v-icon size="64" color="error">mdi-alert-circle-outline</v-icon>
        <p class="text-h6 mt-4">{{ error }}</p>
        <v-btn prepend-icon="mdi-arrow-left" @click="goBack" class="mt-4">Retour</v-btn>
      </div>

      <div v-else-if="institution">
        <div class="page-header mb-6">
          <div class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between">
            <div class="d-flex align-center mb-4 mb-md-0">
              <v-btn icon="mdi-arrow-left" variant="text" class="mr-3" @click="goBack" />
              <v-avatar size="56" class="mr-4" :color="getInstitutionColor(institution.type)" variant="tonal">
                <v-icon size="28">{{ getInstitutionIcon(institution.type) }}</v-icon>
              </v-avatar>
              <div>
                <h1 class="text-h4 font-weight-bold">{{ institution.name }}</h1>
                <p class="text-body-1 text-medium-emphasis">
                  {{ formatInstitutionType(institution.type) }}
                </p>
              </div>
            </div>
            <div class="page-actions">
              <v-btn prepend-icon="mdi-pencil" :variant="editMode ? 'outlined' : 'elevated'" :color="editMode ? 'secondary' : 'primary'" @click="toggleEditMode">Modifier</v-btn>
              <v-btn prepend-icon="mdi-delete" color="error" variant="outlined" @click="confirmDelete">Supprimer</v-btn>
            </div>
          </div>
          <div class="mt-4 d-flex flex-wrap gap-2">
            <v-chip v-if="institution.medicalProfile" :color="getComplianceSeverity(institution.medicalProfile.complianceStatus)" variant="tonal" prepend-icon="mdi-shield-check-outline">
              {{ formatComplianceStatus(institution.medicalProfile.complianceStatus) }}
            </v-chip>
            <v-chip v-else variant="tonal" prepend-icon="mdi-help-circle-outline">Pas de profil</v-chip>
            <v-chip color="info" variant="tonal" v-if="institution.assignedUserId" prepend-icon="mdi-account-check-outline">Assigné</v-chip>
            <v-chip color="secondary" variant="tonal" v-else prepend-icon="mdi-account-off-outline">Non assigné</v-chip>
            <v-chip :color="institution.isActive ? 'success' : 'error'" variant="tonal" :prepend-icon="institution.isActive ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'">
              {{ institution.isActive ? 'Actif' : 'Inactif' }}
            </v-chip>
          </div>
        </div>

        <div v-if="editMode" class="mb-6">
          <v-card>
            <v-card-title class="text-h6">Modifier l'institution</v-card-title>
            <v-card-text>
              <MedicalInstitutionForm
                :institution="institution"
                @institution-saved="onInstitutionSaved"
                @cancel="cancelEdit"
              />
            </v-card-text>
          </v-card>
        </div>

        <div v-else>
          <v-tabs v-model="activeTab" class="mb-6">
            <v-tab value="overview">Aperçu</v-tab>
            <v-tab value="activity">Activité</v-tab>
            <v-tab value="medical">Profil Médical</v-tab>
            <v-tab value="contacts">Contacts</v-tab>
            <v-tab value="revenue">Revenus</v-tab>
            <v-tab value="digiforma">Digiforma</v-tab>
          </v-tabs>
          <v-window v-model="activeTab">
            <v-window-item value="overview">
              <v-row>
                <v-col cols="12" md="6">
                  <v-card>
                    <v-list lines="two">
                      <v-list-subheader>Informations de base</v-list-subheader>
                      <v-list-item title="Nom de l'institution" :subtitle="institution.name"></v-list-item>
                      <v-list-item title="Type" :subtitle="formatInstitutionType(institution.type)"></v-list-item>
                      <v-list-item title="Statut">
                        <template v-slot:subtitle>
                          <v-chip :color="institution.isActive ? 'success' : 'error'" size="small" variant="tonal">
                            {{ institution.isActive ? 'Actif' : 'Inactif' }}
                          </v-chip>
                        </template>
                      </v-list-item>
                      <v-list-item title="Tags">
                        <template v-slot:subtitle>
                          <div class="d-flex flex-wrap gap-1 mt-1">
                            <v-chip v-for="tag in (institution.tags || [])" :key="tag" size="small" variant="tonal">{{ tag }}</v-chip>
                            <span v-if="!(institution.tags?.length)" class="text-medium-emphasis">Aucun tag</span>
                          </div>
                        </template>
                      </v-list-item>
                      <v-list-item
                        title="Numéro Comptable"
                        :subtitle="institution.accountingNumber || 'Non renseigné'"
                        prepend-icon="mdi-calculator"
                      >
                        <template v-if="institution.accountingNumber" v-slot:append>
                          <v-chip size="small" color="info" variant="tonal">{{ institution.accountingNumber }}</v-chip>
                        </template>
                      </v-list-item>
                      <v-list-item
                        v-if="institution.digiformaId"
                        title="ID Digiforma"
                        :subtitle="institution.digiformaId"
                        prepend-icon="mdi-cloud-sync"
                      >
                        <template v-slot:append>
                          <v-chip size="small" color="primary" variant="tonal">Synchronisé</v-chip>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card>
                </v-col>
                <v-col cols="12" md="6">
                  <v-card>
                    <v-list lines="two">
                      <v-list-subheader>Adresse</v-list-subheader>
                      <v-list-item title="Rue" :subtitle="institution.address?.street || 'Non spécifié'"></v-list-item>
                      <v-list-item title="Ville" :subtitle="institution.address?.city || 'Non spécifié'"></v-list-item>
                      <v-list-item title="État/Région" :subtitle="institution.address?.state || 'Non spécifié'"></v-list-item>
                      <v-list-item title="Code Postal" :subtitle="institution.address?.zipCode || 'Non spécifié'"></v-list-item>
                      <v-list-item title="Pays" :subtitle="institution.address?.country || 'Non spécifié'"></v-list-item>
                    </v-list>
                  </v-card>
                </v-col>
              </v-row>
            </v-window-item>

            <v-window-item value="activity">
              <CollaborationTab :institution-id="institution.id" />
            </v-window-item>

            <v-window-item value="medical">
              <v-card>
                <v-card-text v-if="institution.medicalProfile">
                  <v-row>
                    <v-col cols="12" sm="6" md="3" v-for="stat in medicalStats" :key="stat.label">
                      <v-card variant="tonal" class="text-center fill-height">
                        <v-card-text>
                          <div class="text-h4 font-weight-bold">{{ stat.value }}</div>
                          <div class="text-body-2 text-medium-emphasis">{{ stat.label }}</div>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                  <v-divider class="my-6"></v-divider>
                  <v-row>
                    <v-col cols="12" md="6">
                      <h3 class="text-h6 mb-2">Spécialités Médicales</h3>
                      <div class="d-flex flex-wrap gap-2">
                        <v-chip v-for="specialty in (institution.medicalProfile.specialties || [])" :key="specialty" color="info" variant="tonal">{{ specialty }}</v-chip>
                        <span v-if="!institution.medicalProfile.specialties?.length" class="text-medium-emphasis">Aucune spécialité</span>
                      </div>
                    </v-col>
                    <v-col cols="12" md="6">
                      <h3 class="text-h6 mb-2">Départements</h3>
                      <div class="d-flex flex-wrap gap-2">
                        <v-chip v-for="department in (institution.medicalProfile.departments || [])" :key="department" variant="tonal">{{ department }}</v-chip>
                        <span v-if="!institution.medicalProfile.departments?.length" class="text-medium-emphasis">Aucun département</span>
                      </div>
                    </v-col>
                  </v-row>
                </v-card-text>
                <v-card-text v-else class="text-center py-8">
                  <v-icon size="48" color="grey-lighten-1">mdi-information-outline</v-icon>
                  <p class="mt-4 text-body-1 text-medium-emphasis">Aucun profil médical disponible</p>
                </v-card-text>
              </v-card>
            </v-window-item>

            <v-window-item value="contacts">
              <v-card>
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>Contacts</span>
                  <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="showAddContactDialog = true">Ajouter</v-btn>
                </v-card-title>
                <div v-if="!institution.contactPersons?.length" class="text-center py-12">
                  <v-icon size="64" color="grey-lighten-2">mdi-account-group-outline</v-icon>
                  <p class="mt-4 text-h6">Aucun contact</p>
                  <p class="text-medium-emphasis">Ajoutez des contacts pour gérer les relations.</p>
                </div>
                <v-list v-else lines="three">
                  <v-list-item v-for="contact in (institution.contactPersons || [])" :key="contact.id">
                    <template v-slot:prepend>
                      <v-avatar color="primary" variant="tonal">
                        <span>{{ `${(contact.firstName || '').charAt(0)}${(contact.lastName || '').charAt(0)}` || '?' }}</span>
                      </v-avatar>
                    </template>
                    <v-list-item-title class="font-weight-bold">
                      {{ contact.firstName }} {{ contact.lastName }}
                      <v-chip v-if="contact.isPrimary" class="ml-2" size="x-small" color="success" variant="tonal">Principal</v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle>{{ contact.title || "Pas de titre" }}</v-list-item-subtitle>
                    <v-list-item-subtitle class="mt-1">
                      <div class="d-flex align-center text-body-2"><v-icon size="sm" class="mr-2">mdi-email-outline</v-icon>{{ contact.email }}</div>
                      <div v-if="contact.phone" class="d-flex align-center text-body-2"><v-icon size="sm" class="mr-2">mdi-phone-outline</v-icon>{{ contact.phone }}</div>
                    </v-list-item-subtitle>
                    <template v-slot:append>
                      <v-btn variant="text" size="small" icon="mdi-pencil" @click="editContact(contact)" title="Modifier"></v-btn>
                      <v-btn variant="text" size="small" color="error" icon="mdi-trash-can-outline" @click="confirmDeleteContact(contact)" title="Supprimer"></v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-window-item>

            <v-window-item value="revenue">
              <RevenueTab :institution-id="institution.id" />
            </v-window-item>

            <v-window-item value="digiforma">
              <DigiformaTab :institution-id="institution.id" />
            </v-window-item>
          </v-window>
        </div>

        <v-dialog v-model="showAddContactDialog" max-width="600">
          <v-card>
            <v-card-title>Ajouter un contact</v-card-title>
            <v-card-text>
              <ContactPersonForm :institution-id="institution.id" @contact-saved="onContactSaved" @cancel="showAddContactDialog = false" />
            </v-card-text>
          </v-card>
        </v-dialog>

        <v-dialog v-model="showEditContactDialog" max-width="600">
          <v-card>
            <v-card-title>Modifier le contact</v-card-title>
            <v-card-text>
              <ContactPersonForm v-if="editingContact" :institution-id="institution.id" :contact="editingContact" @contact-saved="onContactSaved" @cancel="showEditContactDialog = false" />
            </v-card-text>
          </v-card>
        </v-dialog>

        <v-dialog v-model="confirmVisible" max-width="420">
          <v-card>
            <v-card-title>Confirmation</v-card-title>
            <v-card-text>{{ confirmMessage }}</v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn variant="text" @click="confirmVisible = false">Annuler</v-btn>
              <v-btn color="error" @click="confirmAccept">Supprimer</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
          {{ snackbar.message }}
        </v-snackbar>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import ContactPersonForm from "@/components/institutions/ContactPersonForm.vue"
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionForm.vue"
import DigiformaTab from "@/components/institutions/DigiformaTab.vue"
import RevenueTab from "@/components/institutions/RevenueTab.vue"
import CollaborationTab from "@/components/institutions/CollaborationTab.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
import { DetailSkeleton } from "@/components/skeletons"
import { institutionsApi } from "@/services/api"
import type {
  ComplianceStatus,
  ContactPerson,
  InstitutionType,
  MedicalInstitution,
} from "@medical-crm/shared"
import { onMounted, ref, computed } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const snackbar = ref<{ visible: boolean; color: string; message: string }>({ visible: false, color: "info", message: "" })
const showSnackbar = (message: string, color: string = "info") => {
  snackbar.value = { visible: true, color, message }
}
const confirmVisible = ref(false)
const confirmMessage = ref("")
const confirmAction = ref<null | (() => void)>(null)
const confirmAccept = () => {
  confirmVisible.value = false
  if (confirmAction.value) confirmAction.value()
}

const institution = ref<MedicalInstitution | null>(null)
const loading = ref(false)
const error = ref("")
const editMode = ref(false)
const showAddContactDialog = ref(false)
const showEditContactDialog = ref(false)
const editingContact = ref<ContactPerson | null>(null)
const activeTab = ref('overview')

const medicalStats = computed(() => {
  if (!institution.value?.medicalProfile) return []
  const profile = institution.value.medicalProfile
  return [
    { label: 'Capacité (lits)', value: profile.bedCapacity || 'N/A' },
    { label: 'Salles d\'opération', value: profile.surgicalRooms || 'N/A' },
    { label: 'Spécialités', value: (profile.specialties || []).length },
    { label: 'Départements', value: (profile.departments || []).length },
  ]
})

const loadInstitution = async () => {
  const institutionId = route.params.id as string
  if (!institutionId) {
    error.value = "ID d'institution manquant"
    return
  }

  loading.value = true
  error.value = ""

  try {
    const response = await institutionsApi.getById(institutionId) as any
    institution.value = response.data?.institution || response as MedicalInstitution
  } catch (err) {
    console.error("Erreur chargement institution:", err)
    error.value = "Impossible de charger les détails de l'institution"
  } finally {
    loading.value = false
  }
}

const toggleEditMode = () => {
  editMode.value = !editMode.value
}

const cancelEdit = () => {
  editMode.value = false
}

const onInstitutionSaved = (savedInstitution: MedicalInstitution) => {
  institution.value = savedInstitution
  editMode.value = false
  showSnackbar("Institution mise à jour avec succès", "success")
}

const confirmDelete = () => {
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer ${institution.value?.name} ?`
  confirmAction.value = () => deleteInstitution()
  confirmVisible.value = true
}

const deleteInstitution = async () => {
  if (!institution.value) return
  try {
    await institutionsApi.delete(institution.value.id)
    showSnackbar(`${institution.value.name} a été supprimé`, "success")
    router.push("/institutions")
  } catch (error) {
    console.error("Erreur suppression institution:", error)
    showSnackbar("La suppression a échoué", "error")
  }
}

const editContact = (contact: ContactPerson) => {
  editingContact.value = { ...contact }
  showEditContactDialog.value = true
}

const confirmDeleteContact = (contact: ContactPerson) => {
  confirmMessage.value = `Êtes-vous sûr de vouloir supprimer ${contact.firstName} ${contact.lastName} ?`
  confirmAction.value = () => deleteContact(contact)
  confirmVisible.value = true
}

const deleteContact = async (contact: ContactPerson) => {
  if (!institution.value?.contactPersons) return
  try {
    await institutionsApi.contacts.delete(institution.value.id, contact.id)
    institution.value.contactPersons = institution.value.contactPersons.filter(c => c.id !== contact.id)
    showSnackbar(`${contact.firstName} ${contact.lastName} a été supprimé`, "success")
  } catch (error) {
    console.error("Erreur suppression contact:", error)
    showSnackbar("La suppression du contact a échoué", "error")
  }
}

const onContactSaved = (savedContact: ContactPerson) => {
  if (!institution.value?.contactPersons) institution.value!.contactPersons = []
  const index = institution.value.contactPersons.findIndex(c => c.id === savedContact.id)
  if (index > -1) {
    institution.value.contactPersons.splice(index, 1, savedContact)
  } else {
    institution.value.contactPersons.push(savedContact)
  }
  showAddContactDialog.value = false
  showEditContactDialog.value = false
}

const goBack = () => {
  router.push("/institutions")
}

const formatInstitutionType = (type: InstitutionType): string => {
  const typeMap: Record<InstitutionType, string> = {
    hospital: "Hôpital",
    clinic: "Clinique",
    medical_center: "Centre Médical",
    specialty_clinic: "Clinique Spécialisée",
  }
  return typeMap[type] || type
}

const formatComplianceStatus = (status: ComplianceStatus): string => {
  const statusMap: Record<ComplianceStatus, string> = {
    compliant: "Conforme",
    non_compliant: "Non-conforme",
    pending_review: "En attente d\'examen",
    expired: "Expiré",
  }
  return statusMap[status] || status
}

const getComplianceSeverity = (status: ComplianceStatus): string => {
  const severityMap: Record<ComplianceStatus, string> = {
    compliant: "success",
    non_compliant: "error",
    pending_review: "warning",
    expired: "error",
  }
  return severityMap[status] || "secondary"
}

const getInstitutionColor = (type: InstitutionType): string => {
  const colorMap: Record<InstitutionType, string> = {
    hospital: "primary",
    clinic: "success",
    medical_center: "warning",
    specialty_clinic: "secondary",
  }
  return colorMap[type] || "grey"
}

const getInstitutionIcon = (type: InstitutionType): string => {
  const iconMap: Record<InstitutionType, string> = {
    hospital: "mdi-hospital-building",
    clinic: "mdi-medical-bag",
    medical_center: "mdi-hospital",
    specialty_clinic: "mdi-stethoscope",
  }
  return iconMap[type] || "mdi-domain"
}

onMounted(loadInstitution)
</script>

<style scoped>
.institution-detail-view {
  padding: 1.5rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-actions {
  display: flex;
  gap: 0.75rem;
}

.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }

@media (max-width: 768px) {
  .institution-detail-view {
    padding: 1rem;
  }
  .page-actions {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>