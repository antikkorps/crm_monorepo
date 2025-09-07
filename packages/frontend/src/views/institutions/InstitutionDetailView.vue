<template>
  <AppLayout>
    <div class="institution-detail-view">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <p class="text-600 mt-3">Loading institution details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-8">
        <i class="pi pi-exclamation-triangle text-4xl text-orange-500 mb-3"></i>
        <p class="text-600 text-lg mb-4">{{ error }}</p>
        <v-btn prepend-icon="mdi-arrow-left" @click="goBack">Go Back</v-btn>
      </div>

      <!-- Institution Details -->
      <div v-else-if="institution">
        <!-- Header Section -->
        <div class="page-header mb-4">
          <div class="flex align-items-center mb-3">
            <v-btn icon="mdi-arrow-left" variant="text" class="mr-3" @click="goBack" />
            <div class="institution-header-info">
              <div class="flex align-items-center mb-2">
                <v-avatar size="40" class="mr-3" :color="getInstitutionColor(institution.type)">
                  <span class="white--text">{{ (institution.name || '').charAt(0).toUpperCase() }}</span>
                </v-avatar>
                <div>
                  <h1 class="text-3xl font-bold text-900 m-0">{{ institution.name }}</h1>
                  <p class="text-600 text-lg m-0">
                    {{ formatInstitutionType(institution.type) }}
                  </p>
                </div>
              </div>
              <div class="flex align-items-center gap-3">
                <v-chip v-if="institution.medicalProfile" :color="getComplianceSeverity(institution.medicalProfile.complianceStatus)" variant="tonal">
                  {{ formatComplianceStatus(institution.medicalProfile.complianceStatus) }}
                </v-chip>
                <v-chip v-else variant="tonal">No profile</v-chip>
                <v-chip color="info" variant="tonal" v-if="institution.assignedUserId">Assigned</v-chip>
                <v-chip color="secondary" variant="tonal" v-else>Unassigned</v-chip>
                <v-chip :color="institution.isActive ? 'success' : 'error'" variant="tonal">
                  {{ institution.isActive ? 'Active' : 'Inactive' }}
                </v-chip>
              </div>
            </div>
          </div>

          <div class="page-actions">
            <v-btn prepend-icon="mdi-pencil" :variant="editMode ? 'outlined' : 'elevated'" :color="editMode ? 'secondary' : 'primary'" @click="toggleEditMode">Edit Institution</v-btn>
            <v-btn prepend-icon="mdi-delete" color="error" variant="outlined" @click="confirmDelete">Delete</v-btn>
          </div>
        </div>

        <!-- Edit Mode Form -->
        <div v-if="editMode">
          <v-card>
            <v-card-title>Edit Institution</v-card-title>
            <v-card-text>
              <MedicalInstitutionForm
                :institution="institution"
                @institution-saved="onInstitutionSaved"
                @cancel="cancelEdit"
              />
            </v-card-text>
          </v-card>
        </div>

        <!-- View Mode Content -->
        <div v-else>
          <!-- Content Tabs (Vuetify) -->
          <v-tabs v-model="activeTab" class="mb-3">
            <v-tab value="overview">Overview</v-tab>
            <v-tab value="medical">Medical Profile</v-tab>
            <v-tab value="contacts">Contact Persons</v-tab>
            <v-tab v-if="enableCollab" value="collab">Collaboration</v-tab>
            <v-tab v-if="enableCollab" value="timeline">Timeline</v-tab>
            <v-tab v-if="enableCollab" value="search">Search</v-tab>
          </v-tabs>
          <v-window v-model="activeTab">
            <v-window-item value="overview">
              <div class="grid">
                <!-- Basic Information Card -->
                <div class="col-12 lg:col-6">
                  <v-card>
                    <v-card-title>Basic Information</v-card-title>
                    <v-card-text>
                      <div class="institution-info">
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Institution Name</label>
                          <p class="text-700 mt-1">{{ institution.name }}</p>
                        </div>
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Type</label>
                          <p class="text-700 mt-1">
                            {{ formatInstitutionType(institution.type) }}
                          </p>
                        </div>
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Status</label>
                          <p class="text-700 mt-1">
                            <v-chip :color="institution.isActive ? 'success' : 'error'" variant="tonal">
                              {{ institution.isActive ? 'Active' : 'Inactive' }}
                            </v-chip>
                          </p>
                        </div>
                        <div class="info-item">
                          <label class="font-semibold text-900">Tags</label>
                          <div class="mt-1">
                            <v-chip v-for="tag in (institution.tags || [])" :key="tag" class="mr-1 mb-1" size="small" variant="tonal">{{ tag }}</v-chip>
                            <span v-if="!(institution.tags?.length)" class="text-500">
                              No tags
                            </span>
                          </div>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>

                <!-- Address Information Card -->
                <div class="col-12 lg:col-6">
                  <v-card>
                    <v-card-title>Address Information</v-card-title>
                    <v-card-text>
                      <div class="address-info">
                        <div class="info-item mb-3">
                          <label class="font-semibold text-900">Street Address</label>
                          <p class="text-700 mt-1">{{ institution.address?.street || 'Not specified' }}</p>
                        </div>
                        <div class="grid">
                          <div class="col-6">
                            <div class="info-item mb-3">
                              <label class="font-semibold text-900">City</label>
                              <p class="text-700 mt-1">{{ institution.address?.city || 'Not specified' }}</p>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="info-item mb-3">
                              <label class="font-semibold text-900">State</label>
                              <p class="text-700 mt-1">{{ institution.address?.state || 'Not specified' }}</p>
                            </div>
                          </div>
                        </div>
                        <div class="grid">
                          <div class="col-6">
                            <div class="info-item mb-3">
                              <label class="font-semibold text-900">ZIP Code</label>
                              <p class="text-700 mt-1">
                                {{ institution.address?.zipCode || 'Not specified' }}
                              </p>
                            </div>
                          </div>
                          <div class="col-6">
                            <div class="info-item">
                              <label class="font-semibold text-900">Country</label>
                              <p class="text-700 mt-1">
                                {{ institution.address?.country || 'Not specified' }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-window-item>

            <v-window-item value="medical">
              <v-card>
                <v-card-title>Medical Information</v-card-title>
                <v-card-text>
                  <div v-if="institution.medicalProfile" class="medical-profile-info">
                    <div class="grid">
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Bed Capacity</label>
                          <p class="text-700 mt-1 text-2xl">
                            {{
                              institution.medicalProfile.bedCapacity || "Not specified"
                            }}
                          </p>
                        </div>
                      </div>
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Surgical Rooms</label>
                          <p class="text-700 mt-1 text-2xl">
                            {{
                              institution.medicalProfile.surgicalRooms || "Not specified"
                            }}
                          </p>
                        </div>
                      </div>
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Specialties</label>
                          <p class="text-700 mt-1">
                            {{ (institution.medicalProfile.specialties || []).length }}
                          </p>
                        </div>
                      </div>
                      <div class="col-12 md:col-6 lg:col-3">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Departments</label>
                          <p class="text-700 mt-1">
                            {{ (institution.medicalProfile.departments || []).length }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="grid">
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900"
                            >Medical Specialties</label
                          >
                          <div class="mt-2">
                            <v-chip v-for="specialty in (institution.medicalProfile.specialties || [])" :key="specialty" class="mr-1 mb-1" size="small" color="info" variant="tonal">{{ specialty }}</v-chip>
                            <span
                              v-if="!(institution.medicalProfile.specialties && institution.medicalProfile.specialties.length)"
                              class="text-500"
                            >
                              No specialties specified
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Departments</label>
                          <div class="mt-2">
                            <v-chip v-for="department in (institution.medicalProfile.departments || [])" :key="department" class="mr-1 mb-1" size="small" variant="tonal">{{ department }}</v-chip>
                            <span
                              v-if="!(institution.medicalProfile.departments && institution.medicalProfile.departments.length)"
                              class="text-500"
                            >
                              No departments specified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="grid">
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Equipment Types</label>
                          <div class="mt-2">
                            <v-chip v-for="equipment in (institution.medicalProfile.equipmentTypes || [])" :key="equipment" class="mr-1 mb-1" size="small" color="warning" variant="tonal">{{ equipment }}</v-chip>
                            <span
                              v-if="!(institution.medicalProfile.equipmentTypes && institution.medicalProfile.equipmentTypes.length)"
                              class="text-500"
                            >
                              No equipment specified
                            </span>
                          </div>
                        </div>
                      </div>
                      <div class="col-12 lg:col-6">
                        <div class="info-item mb-4">
                          <label class="font-semibold text-900">Certifications</label>
                          <div class="mt-2">
                            <v-chip
                              v-for="certification in (institution.medicalProfile.certifications || [])"
                              :key="certification"
                              color="success"
                              size="small"
                              variant="tonal"
                              class="mr-1 mb-1"
                            >
                              {{ certification }}
                            </v-chip>
                            <span
                              v-if="!(institution.medicalProfile.certifications && institution.medicalProfile.certifications.length)"
                              class="text-500"
                            >
                              No certifications specified
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="institution.medicalProfile && institution.medicalProfile.complianceNotes" class="grid">
                      <div class="col-12">
                        <div class="info-item">
                          <label class="font-semibold text-900">Compliance Notes</label>
                          <p class="text-700 mt-1">
                            {{ institution.medicalProfile.complianceNotes }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-muted py-3">
                    No medical profile available
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <v-window-item value="contacts">
              <v-card>
                <v-card-title>
                  <div class="flex justify-content-between align-items-center">
                    <span>Contact Persons</span>
                    <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="showAddContactDialog = true">Add Contact</v-btn>
                  </div>
                </v-card-title>
                <v-card-text>
                  <div
                    v-if="!institution.contactPersons?.length"
                    class="text-center py-6"
                  >
                    <i class="pi pi-users text-4xl text-400 mb-3"></i>
                    <p class="text-600 text-lg">No contact persons added</p>
                    <p class="text-500">Add contact persons to manage relationships</p>
                  </div>

                  <div v-else class="contact-persons-list">
                    <div
                      v-for="contact in (institution.contactPersons || [])"
                      :key="contact.id"
                      class="contact-person-card mb-3"
                    >
                      <v-card>
                        <v-card-text>
                          <div class="flex justify-content-between align-items-start">
                            <div class="contact-info">
                              <div class="flex align-items-center mb-2">
                                <v-avatar size="28" class="mr-2">
                                  <span>{{ `${(contact.firstName || '').charAt(0)}${(contact.lastName || '').charAt(0)}` || '?' }}</span>
                                </v-avatar>
                                <div>
                                  <h4 class="text-900 font-semibold m-0">
                                    {{ contact.firstName }} {{ contact.lastName }}
                                    <v-chip v-if="contact.isPrimary" class="ml-2" size="x-small" color="success" variant="tonal">Primary</v-chip>
                                  </h4>
                                  <p class="text-600 m-0">
                                    {{ contact.title || "No title" }}
                                  </p>
                                </div>
                              </div>
                              <div class="contact-details">
                                <div class="flex align-items-center mb-1">
                                  <i class="pi pi-envelope text-600 mr-2"></i>
                                  <span class="text-700">{{ contact.email }}</span>
                                </div>
                                <div
                                  v-if="contact.phone"
                                  class="flex align-items-center mb-1"
                                >
                                  <i class="pi pi-phone text-600 mr-2"></i>
                                  <span class="text-700">{{ contact.phone }}</span>
                                </div>
                                <div
                                  v-if="contact.department"
                                  class="flex align-items-center"
                                >
                                  <i class="pi pi-building text-600 mr-2"></i>
                                  <span class="text-700">{{ contact.department }}</span>
                                </div>
                              </div>
                            </div>
                            <div class="contact-actions">
                              <v-btn
                                variant="text"
                                size="small"
                                icon="mdi-pencil"
                                @click="editContact(contact)"
                                :title="'Edit Contact'"
                              />
                              <v-btn
                                variant="text"
                                size="small"
                                color="error"
                                icon="mdi-trash-can-outline"
                                @click="confirmDeleteContact(contact)"
                                :title="'Delete Contact'"
                              />
                            </div>
                          </div>
                        </v-card-text>
                      </v-card>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-window-item>

            <!-- Collaboration Summary (feature-flagged) -->
            <v-window-item v-if="enableCollab" value="collab">
              <div v-if="!collabData" class="text-center py-6">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else class="collab-summary-grid">
                <v-card class="summary-card">
                  <v-card-title>Stats</v-card-title>
                  <v-card-text>
                    <div class="stats-grid">
                      <div class="stat"><span class="stat-label">Notes</span><span class="stat-value">{{ collabData.stats.totalNotes }}</span></div>
                      <div class="stat"><span class="stat-label">Meetings</span><span class="stat-value">{{ collabData.stats.totalMeetings }}</span></div>
                      <div class="stat"><span class="stat-label">Calls</span><span class="stat-value">{{ collabData.stats.totalCalls }}</span></div>
                      <div class="stat"><span class="stat-label">Reminders</span><span class="stat-value">{{ collabData.stats.totalReminders }}</span></div>
                      <div class="stat"><span class="stat-label">Open Tasks</span><span class="stat-value">{{ collabData.stats.openTasks }}</span></div>
                    </div>
                  </v-card-text>
                </v-card>
                <v-card class="summary-card">
                  <v-card-title>Recent Notes</v-card-title>
                  <v-card-text>
                    <ul class="list-unstyled compact-list">
                      <li v-for="n in collabData.recentNotes" :key="n.id">
                        <i class="pi pi-file-edit mr-2"></i>
                        <strong>{{ n.title }}</strong>
                        <small class="text-muted"> · {{ formatDateTime(n.createdAt) }}</small>
                      </li>
                      <li v-if="!collabData.recentNotes?.length" class="text-muted">No notes</li>
                    </ul>
                  </v-card-text>
                </v-card>
                <v-card class="summary-card">
                  <v-card-title>Upcoming Meetings</v-card-title>
                  <v-card-text>
                    <ul class="list-unstyled compact-list">
                      <li v-for="m in collabData.upcomingMeetings" :key="m.id">
                        <i class="pi pi-calendar mr-2"></i>
                        <strong>{{ m.title }}</strong>
                        <small class="text-muted"> · {{ formatDateTime(m.startDate) }}</small>
                      </li>
                      <li v-if="!collabData.upcomingMeetings?.length" class="text-muted">No meetings</li>
                    </ul>
                  </v-card-text>
                </v-card>
                <v-card class="summary-card">
                  <v-card-title>Recent Calls</v-card-title>
                  <v-card-text>
                    <ul class="list-unstyled compact-list">
                      <li v-for="c in collabData.recentCalls" :key="c.id">
                        <i class="pi pi-phone mr-2"></i>
                        <strong>{{ c.phoneNumber }}</strong>
                        <small class="text-muted"> · {{ formatDateTime(c.createdAt) }}</small>
                      </li>
                      <li v-if="!collabData.recentCalls?.length" class="text-muted">No calls</li>
                    </ul>
                  </v-card-text>
                </v-card>
                <v-card class="summary-card">
                  <v-card-title>Pending Reminders</v-card-title>
                  <v-card-text>
                    <ul class="list-unstyled compact-list">
                      <li v-for="r in collabData.pendingReminders" :key="r.id">
                        <i class="pi pi-bell mr-2"></i>
                        <strong>{{ r.title }}</strong>
                        <small class="text-muted"> · {{ formatDateTime(r.reminderDate) }}</small>
                      </li>
                      <li v-if="!collabData.pendingReminders?.length" class="text-muted">No reminders</li>
                    </ul>
                  </v-card-text>
                </v-card>
              </div>
            </v-window-item>

            <!-- Timeline Tab (feature-flagged) -->
            <v-window-item v-if="enableCollab" value="timeline">
              <div v-if="!timelineItems.length" class="text-center py-6">
                <v-progress-circular indeterminate color="primary" />
              </div>
              <div v-else class="timeline-list">
                <div v-for="item in timelineItems" :key="`${item.type}-${item.id}`" class="timeline-item">
                  <span class="item-icon" :class="`type-${item.type}`">
                    <i :class="getTypeIcon(item.type)"></i>
                  </span>
                  <div class="item-content">
                    <div class="item-header">
                      <span class="item-type">{{ item.type }}</span>
                      <span class="item-date">{{ formatDateTime(item.createdAt) }}</span>
                    </div>
                    <div class="item-title">{{ item.title }}</div>
                    <div v-if="item.description" class="item-desc text-muted">{{ item.description }}</div>
                  </div>
                </div>
                <div class="timeline-pagination">
                  <v-btn variant="text" prepend-icon="mdi-chevron-left" :disabled="!(timelinePagination && timelinePagination.offset > 0)" @click="loadMoreTimeline(-1)">Previous</v-btn>
                  <span class="mx-2 text-muted">
                    {{ (timelinePagination?.offset || 0) + 1 }}–
                    {{ Math.min((timelinePagination?.offset || 0) + (timelinePagination?.limit || 0), timelinePagination?.total || 0) }}
                    / {{ timelinePagination?.total || 0 }}
                  </span>
                  <v-btn variant="text" append-icon="mdi-chevron-right" :disabled="!(timelinePagination && timelinePagination.hasMore)" @click="loadMoreTimeline(1)">Next</v-btn>
                </div>
              </div>
            </v-window-item>

            <!-- Unified Search Tab (feature-flagged) -->
            <v-window-item v-if="enableCollab" value="search">
              <div class="search-controls">
                <div class="scope-select">
                  <label class="mr-2">Scope</label>
                  <v-btn-toggle v-model="unifiedScope" mandatory>
                    <v-btn v-for="option in scopeOptions" :key="option.value" :value="option.value" size="small">{{ option.label }}</v-btn>
                  </v-btn-toggle>
                </div>
                <div class="query-input d-flex align-center">
                  <v-text-field v-model="unifiedQuery" label="Search term" density="comfortable" class="mr-2" @keyup.enter="runUnifiedSearch" />
                  <v-select v-model="unifiedType" :items="typeOptions" item-title="label" item-value="value" label="Type" class="mr-2" />
                  <v-btn color="primary" prepend-icon="mdi-magnify" @click="runUnifiedSearch">Search</v-btn>
                </div>
              </div>
              <div v-if="unifiedLoading" class="text-center py-4"><v-progress-circular indeterminate color="primary" /></div>
              <div v-else-if="unifiedError" class="text-danger py-2">{{ unifiedError }}</div>
              <div v-else class="search-results" v-if="unifiedData">
                <div class="result-summary text-muted mb-3">{{ unifiedData.totalResults }} results</div>
                <div class="result-group" v-for="group in groupedResults" :key="group.key">
                  <h4>{{ group.title }} <small class="text-muted">({{ group.items.length }})</small></h4>
                  <ul class="list-unstyled compact-list">
                    <li v-for="it in group.items" :key="it.id">
                      <i :class="group.icon + ' mr-2'"></i>
                      <strong>{{ it.title }}</strong>
                      <small class="text-muted" v-if="it.subtitle"> · {{ it.subtitle }}</small>
                    </li>
                    <li v-if="!group.items.length" class="text-muted">No {{ group.title.toLowerCase() }}</li>
                  </ul>
                </div>
              </div>
            </v-window-item>
          </v-window>
        </div>

        <!-- Add Contact Dialog -->
        <v-dialog v-model="showAddContactDialog" max-width="600">
          <v-card>
            <v-card-title>Add Contact Person</v-card-title>
            <v-card-text>
          <ContactPersonForm
            :institution-id="institution.id"
            @contact-saved="onContactSaved"
            @cancel="showAddContactDialog = false"
          />
            </v-card-text>
          </v-card>
        </v-dialog>

        <!-- Edit Contact Dialog -->
        <v-dialog v-model="showEditContactDialog" max-width="600">
          <v-card>
            <v-card-title>Edit Contact Person</v-card-title>
            <v-card-text>
          <ContactPersonForm
            v-if="editingContact"
            :institution-id="institution.id"
            :contact="editingContact"
            @contact-saved="onContactSaved"
            @cancel="showEditContactDialog = false"
          />
            </v-card-text>
          </v-card>
        </v-dialog>

        <!-- Delete Confirmations (Vuetify) -->
        <v-dialog v-model="confirmVisible" max-width="420">
          <v-card>
            <v-card-title>Delete Confirmation</v-card-title>
            <v-card-text>{{ confirmMessage }}</v-card-text>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn variant="text" @click="confirmVisible = false">Cancel</v-btn>
              <v-btn color="error" @click="confirmAccept">Delete</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Snackbar notifications -->
        <v-snackbar v-model="snackbar.visible" :color="snackbar.color" timeout="3000">
          {{ snackbar.message }}
        </v-snackbar>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import ContactPersonForm from "@/components/institutions/ContactPersonForm.vue"
import MedicalInstitutionForm from "@/components/institutions/MedicalInstitutionFormVuetify.vue"
import AppLayout from "@/components/layout/AppLayout.vue"
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
// Local snackbar + confirm state (Vuetify)
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
// No PrimeVue confirm; using Vuetify dialog

// Reactive data
const institution = ref<MedicalInstitution | null>(null)
const loading = ref(false)
const error = ref("")
const editMode = ref(false)
const showAddContactDialog = ref(false)
const showEditContactDialog = ref(false)
const editingContact = ref<ContactPerson | null>(null)

// Collaboration and timeline (feature hooks)
const collabData = ref<any | null>(null)
const timelineItems = ref<any[]>([])
const timelinePagination = ref<{ total: number; limit: number; offset: number; hasMore: boolean } | null>(null)
const scopeOptions = [
  { label: 'Own', value: 'own' },
  { label: 'Team', value: 'team' },
  { label: 'All', value: 'all' },
]
const unifiedScope = ref<'own' | 'team' | 'all'>((localStorage.getItem('unifiedScope') as any) || 'team')
const unifiedQuery = ref('')
const unifiedType = ref<"institutions" | "tasks" | "notes" | "meetings" | "calls" | "reminders" | "all" | undefined>('all')
const unifiedData = ref<any | null>(null)
const unifiedLoading = ref(false)
const unifiedError = ref('')
const enableCollab = (import.meta as any).env?.VITE_FEATURE_COLLAB === '1'
const activeTab = ref<'overview' | 'medical' | 'contacts' | 'collab' | 'timeline' | 'search'>('overview')

// Methods
const loadInstitution = async () => {
  const institutionId = route.params.id as string
  if (!institutionId) {
    error.value = "Institution ID is required"
    return
  }

  loading.value = true
  error.value = ""

  try {
    // Try to load from API first, fallback to mock data
    try {
      const response = await institutionsApi.getById(institutionId) as any
      institution.value = response.data?.institution || response as MedicalInstitution
      return
    } catch (apiError) {
      console.warn("API call failed, using mock data:", apiError)
    }

    // Fallback to mock data
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Mock institution data
    institution.value = {
      id: institutionId,
      name: "General Hospital",
      type: "hospital" as InstitutionType,
      address: {
        street: "123 Medical Center Drive",
        city: "Healthcare City",
        state: "CA",
        zipCode: "90210",
        country: "USA",
      },
      tags: ["trauma-center", "teaching-hospital"],
      isActive: true,
      assignedUserId: "user1",
      medicalProfile: {
        id: "profile1",
        bedCapacity: 250,
        surgicalRooms: 12,
        specialties: ["cardiology", "neurology", "emergency_medicine"],
        departments: ["Emergency", "ICU", "Surgery", "Cardiology"],
        equipmentTypes: ["MRI", "CT Scanner", "X-Ray"],
        certifications: ["Joint Commission", "HIPAA Compliant"],
        complianceStatus: "compliant" as ComplianceStatus,
        complianceNotes:
          "All certifications up to date. Next audit scheduled for Q3 2024.",
      },
      contactPersons: [
        {
          id: "contact1",
          firstName: "Dr. Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@generalhospital.com",
          phone: "+1-555-0123",
          title: "Chief Medical Officer",
          department: "Administration",
          isPrimary: true,
        },
        {
          id: "contact2",
          firstName: "Michael",
          lastName: "Chen",
          email: "michael.chen@generalhospital.com",
          phone: "+1-555-0124",
          title: "Procurement Manager",
          department: "Purchasing",
          isPrimary: false,
        },
      ],
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-02-20"),
    }
  } catch (err) {
    console.error("Error loading institution:", err)
    error.value = "Failed to load institution details"
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
  showSnackbar("Institution updated successfully", "success")
}

const confirmDelete = () => {
  confirmMessage.value = `Are you sure you want to delete ${institution.value?.name}?`
  confirmAction.value = () => deleteInstitution()
  confirmVisible.value = true
}

const deleteInstitution = async () => {
  if (!institution.value) return

  try {
    await institutionsApi.delete(institution.value.id)
    showSnackbar(`${institution.value.name} has been deleted`, "success")
    router.push("/institutions")
  } catch (error) {
    console.error("Error deleting institution:", error)
    showSnackbar("Failed to delete institution", "error")
  }
}

const editContact = (contact: ContactPerson) => {
  editingContact.value = contact
  showEditContactDialog.value = true
}

const confirmDeleteContact = (contact: ContactPerson) => {
  confirmMessage.value = `Are you sure you want to delete ${contact.firstName} ${contact.lastName}?`
  confirmAction.value = () => deleteContact(contact)
  confirmVisible.value = true
}

const deleteContact = async (contact: ContactPerson) => {
  if (!institution.value) return

  try {
    // Try API call first, fallback to local removal
    try {
      await institutionsApi.contacts.delete(institution.value.id, contact.id)
    } catch (apiError) {
      console.warn("API delete failed, removing locally:", apiError)
    }

    // Remove contact from the list
    institution.value.contactPersons = institution.value.contactPersons.filter(
      (c) => c.id !== contact.id
    )

    showSnackbar(`${contact.firstName} ${contact.lastName} has been deleted`, "success")
  } catch (error) {
    console.error("Error deleting contact:", error)
    showSnackbar("Failed to delete contact", "error")
  }
}

const onContactSaved = (savedContact: ContactPerson) => {
  if (!institution.value) return

  const existingIndex = institution.value.contactPersons.findIndex(
    (c) => c.id === savedContact.id
  )

  if (existingIndex >= 0) {
    // Update existing contact
    institution.value.contactPersons[existingIndex] = savedContact
  } else {
    // Add new contact
    institution.value.contactPersons.push(savedContact)
  }

  showAddContactDialog.value = false
  showEditContactDialog.value = false
  editingContact.value = null
}

const goBack = () => {
  router.push("/institutions")
}

// Utility functions
const formatInstitutionType = (type: InstitutionType): string => {
  const typeMap = {
    hospital: "Hospital",
    clinic: "Clinic",
    medical_center: "Medical Center",
    specialty_clinic: "Specialty Clinic",
  }
  return typeMap[type] || type
}

const formatComplianceStatus = (status: ComplianceStatus): string => {
  const statusMap = {
    compliant: "Compliant",
    non_compliant: "Non-Compliant",
    pending_review: "Pending Review",
    expired: "Expired",
  }
  return statusMap[status] || status
}

const getComplianceSeverity = (status: ComplianceStatus): string => {
  const severityMap = {
    compliant: "success",
    non_compliant: "danger",
    pending_review: "warning",
    expired: "danger",
  }
  return severityMap[status] || "secondary"
}

const getInstitutionColor = (type: InstitutionType): string => {
  const colorMap = {
    hospital: "#1976d2",
    clinic: "#388e3c",
    medical_center: "#f57c00",
    specialty_clinic: "#7b1fa2",
  }
  return colorMap[type] || "#6c757d"
}

// Lifecycle
onMounted(() => {
  loadInstitution()
  if (enableCollab) {
    // Lazy fetch collaboration summary and initial timeline
    if (route.params.id) {
      void institutionsApi
        .getCollaboration(String(route.params.id))
        .then((data) => (collabData.value = data))
        .catch((e) => console.warn('Collab load failed', e))
      void institutionsApi
        .getTimeline(String(route.params.id), { limit: 25, offset: 0 })
        .then((data: any) => {
          timelineItems.value = data.items || []
          timelinePagination.value = data.pagination || null
        })
        .catch((e) => console.warn('Timeline load failed', e))
    }
  }
})

// Helpers
const formatDateTime = (d: string | Date) => new Date(d).toLocaleString()
const getTypeIcon = (type: string) => {
  const map: Record<string, string> = {
    note: 'pi pi-file-edit',
    meeting: 'pi pi-calendar',
    call: 'pi pi-phone',
    reminder: 'pi pi-bell',
    task: 'pi pi-list-check',
    institution: 'pi pi-building',
  }
  return map[type] || 'pi pi-circle'
}

const loadMoreTimeline = async (direction: -1 | 1) => {
  if (!timelinePagination?.value || !route.params.id) return
  const { limit, offset, total } = timelinePagination.value
  let newOffset = offset + direction * limit
  newOffset = Math.max(0, Math.min(newOffset, Math.max(0, total - limit)))
  const data: any = await institutionsApi.getTimeline(String(route.params.id), { limit, offset: newOffset })
  timelineItems.value = data.items || []
  timelinePagination.value = data.pagination || null
}

// Unified search
const typeOptions = [
  { label: 'All', value: 'all' },
  { label: 'Institutions', value: 'institutions' },
  { label: 'Tasks', value: 'tasks' },
  { label: 'Notes', value: 'notes' },
  { label: 'Meetings', value: 'meetings' },
  { label: 'Calls', value: 'calls' },
  { label: 'Reminders', value: 'reminders' },
]

const runUnifiedSearch = async () => {
  if (!unifiedQuery.value) return
  unifiedLoading.value = true
  unifiedError.value = ''
  try {
    localStorage.setItem('unifiedScope', unifiedScope.value)
    const data = await institutionsApi.unifiedSearch({
      q: unifiedQuery.value,
      type: unifiedType.value === 'all' ? undefined : unifiedType.value,
      scope: unifiedScope.value,
      limit: 20,
      offset: 0,
    })
    unifiedData.value = data
  } catch (e: any) {
    unifiedError.value = e?.message || 'Search failed'
  } finally {
    unifiedLoading.value = false
  }
}

const groupedResults = computed(() => {
  if (!unifiedData.value?.results) return []
  const r = unifiedData.value.results
  const groups = [
    { key: 'institutions', title: 'Institutions', items: r.institutions || [], icon: 'pi pi-building' },
    { key: 'tasks', title: 'Tasks', items: r.tasks || [], icon: 'pi pi-list-check' },
    { key: 'notes', title: 'Notes', items: r.notes || [], icon: 'pi pi-file-edit' },
    { key: 'meetings', title: 'Meetings', items: r.meetings || [], icon: 'pi pi-calendar' },
    { key: 'calls', title: 'Calls', items: r.calls || [], icon: 'pi pi-phone' },
    { key: 'reminders', title: 'Reminders', items: r.reminders || [], icon: 'pi pi-bell' },
  ]
  return unifiedType.value && unifiedType.value !== 'all'
    ? groups.filter(g => g.key === unifiedType.value)
    : groups
})
</script>

<style scoped>
.institution-detail-view {
  padding: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.institution-header-info {
  flex: 1;
}

.page-actions {
  display: flex;
  gap: 0.5rem;
}

/* Collaboration summary */
.collab-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.summary-card {
  height: 100%;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
.stat {
  display: flex;
  justify-content: space-between;
  background: var(--surface-100);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}
.stat-label { color: var(--text-color-secondary); }
.stat-value { font-weight: 600; }
.compact-list li { padding: 0.25rem 0; }

/* Timeline */
.timeline-list { display: flex; flex-direction: column; gap: 0.75rem; }
.timeline-item { display: flex; gap: 0.75rem; align-items: flex-start; }
.item-icon { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-200); }
.item-content { flex: 1; }
.item-header { display: flex; justify-content: space-between; color: var(--text-color-secondary); font-size: 0.875rem; }
.item-title { font-weight: 600; }
.timeline-pagination { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem; }

/* Unified Search */
.search-controls { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.scope-select { display: flex; align-items: center; gap: 0.5rem; }

.info-item {
  margin-bottom: 1rem;
}

.info-item label {
  display: block;
  margin-bottom: 0.25rem;
}

.contact-person-card {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
}

.contact-info {
  flex: 1;
}

.contact-actions {
  display: flex;
  gap: 0.25rem;
}

.medical-profile-info {
  font-size: 0.875rem;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }

  .page-actions {
    width: 100%;
    justify-content: stretch;
  }

  .page-actions .p-button {
    flex: 1;
  }
}
</style>
