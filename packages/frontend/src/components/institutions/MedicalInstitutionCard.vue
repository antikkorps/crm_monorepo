<template>
  <Card class="medical-institution-card">
    <template #header>
      <div class="card-header">
        <div class="flex align-items-center">
          <Avatar
            :label="institution.name.charAt(0).toUpperCase()"
            shape="circle"
            size="large"
            :style="{ backgroundColor: getInstitutionColor(institution.type) }"
            class="mr-3"
          />
          <div class="institution-info">
            <h3 class="text-xl font-bold text-900 m-0">{{ institution.name }}</h3>
            <p class="text-600 m-0">{{ formatInstitutionType(institution.type) }}</p>
          </div>
        </div>
        <div class="card-actions">
          <Button
            icon="pi pi-eye"
            severity="secondary"
            text
            rounded
            size="small"
            @click="$emit('view', institution)"
            v-tooltip="'View Details'"
          />
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            text
            rounded
            size="small"
            @click="$emit('edit', institution)"
            v-tooltip="'Edit'"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            @click="$emit('delete', institution)"
            v-tooltip="'Delete'"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div class="card-content">
        <!-- Address -->
        <div class="info-section mb-3">
          <div class="flex align-items-center mb-2">
            <i class="pi pi-map-marker text-600 mr-2"></i>
            <span class="font-semibold text-900">Location</span>
          </div>
          <p class="text-700 ml-4">
            {{ institution.address.city }}, {{ institution.address.state }}
            <br />
            {{ institution.address.country }}
          </p>
        </div>

        <!-- Medical Profile Summary -->
        <div class="info-section mb-3">
          <div class="flex align-items-center mb-2">
            <i class="pi pi-heart text-600 mr-2"></i>
            <span class="font-semibold text-900">Medical Profile</span>
          </div>
          <div class="medical-stats ml-4">
            <div class="flex gap-4 mb-2">
              <div v-if="institution.medicalProfile.bedCapacity" class="stat-item">
                <i class="pi pi-home text-600 mr-1"></i>
                <span class="text-sm"
                  >{{ institution.medicalProfile.bedCapacity }} beds</span
                >
              </div>
              <div v-if="institution.medicalProfile.surgicalRooms" class="stat-item">
                <i class="pi pi-cog text-600 mr-1"></i>
                <span class="text-sm"
                  >{{ institution.medicalProfile.surgicalRooms }} OR</span
                >
              </div>
            </div>
            <div class="specialties-preview">
              <Tag
                v-for="specialty in institution.medicalProfile.specialties.slice(0, 3)"
                :key="specialty"
                :value="specialty"
                severity="info"
                class="mr-1 mb-1"
              />
              <Tag
                v-if="institution.medicalProfile.specialties.length > 3"
                :value="`+${institution.medicalProfile.specialties.length - 3} more`"
                severity="secondary"
                class="mr-1 mb-1"
              />
            </div>
          </div>
        </div>

        <!-- Status and Assignment -->
        <div class="info-section">
          <div class="flex justify-content-between align-items-center">
            <div class="status-tags">
              <Tag
                :value="
                  formatComplianceStatus(institution.medicalProfile.complianceStatus)
                "
                :severity="
                  getComplianceSeverity(institution.medicalProfile.complianceStatus)
                "
                class="mr-2"
              />
              <Tag
                :value="institution.isActive ? 'Active' : 'Inactive'"
                :severity="institution.isActive ? 'success' : 'danger'"
              />
            </div>
            <div v-if="institution.assignedUserId" class="assigned-user">
              <span class="text-600 text-sm">Assigned</span>
            </div>
            <div v-else class="unassigned">
              <span class="text-500 text-sm">Unassigned</span>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="institution.tags.length" class="tags-section mt-3">
          <div class="flex flex-wrap gap-1">
            <Tag
              v-for="tag in institution.tags.slice(0, 4)"
              :key="tag"
              :value="tag"
              severity="secondary"
              class="text-xs"
            />
            <Tag
              v-if="institution.tags.length > 4"
              :value="`+${institution.tags.length - 4}`"
              severity="secondary"
              class="text-xs"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="card-footer">
        <small class="text-500"> Updated {{ formatDate(institution.updatedAt) }} </small>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type {
  ComplianceStatus,
  InstitutionType,
  MedicalInstitution,
} from "@medical-crm/shared"
import Avatar from "primevue/avatar"
import Button from "primevue/button"
import Card from "primevue/card"
import Tag from "primevue/tag"

interface Props {
  institution: MedicalInstitution
}

interface Emits {
  (e: "view", institution: MedicalInstitution): void
  (e: "edit", institution: MedicalInstitution): void
  (e: "delete", institution: MedicalInstitution): void
}

defineProps<Props>()
defineEmits<Emits>()

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

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}
</script>

<style scoped>
.medical-institution-card {
  height: 100%;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.medical-institution-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 1px solid var(--surface-border);
}

.institution-info {
  flex: 1;
}

.card-actions {
  display: flex;
  gap: 0.25rem;
}

.card-content {
  padding: 1rem;
}

.info-section {
  margin-bottom: 1rem;
}

.info-section:last-child {
  margin-bottom: 0;
}

.medical-stats {
  font-size: 0.875rem;
}

.stat-item {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.specialties-preview {
  margin-top: 0.5rem;
}

.status-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tags-section {
  border-top: 1px solid var(--surface-border);
  padding-top: 0.75rem;
}

.card-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--surface-border);
  background: var(--surface-50);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 1rem;
  }

  .card-actions {
    align-self: stretch;
    justify-content: center;
  }

  .medical-stats .flex {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
