<template>
  <AppLayout>
    <div class="team-detail-view">
      <!-- Loading state -->
      <div v-if="loading" class="loading-container">
        <v-progress-circular indeterminate color="primary" />
        <p>{{ t('common.loading') }}</p>
      </div>

      <!-- Error state -->
      <v-alert v-else-if="error" type="error" class="ma-4">
        {{ error }}
      </v-alert>

      <!-- Team Detail -->
      <div v-else-if="team" class="team-content">
        <!-- Header with back button -->
        <div class="team-detail-header">
          <v-btn
            icon="mdi-arrow-left"
            variant="text"
            @click="goBack"
            class="back-btn"
          />
          <div class="header-content">
            <h1 class="page-title">
              <v-icon>mdi-account-group</v-icon>
              {{ team.name }}
            </h1>
            <p v-if="team.description" class="page-description">
              {{ team.description }}
            </p>
          </div>
          <div class="header-actions">
            <v-btn
              color="secondary"
              variant="outlined"
              prepend-icon="mdi-pencil"
              @click="editTeam"
            >
              {{ t('common.edit') }}
            </v-btn>
          </div>
        </div>

        <!-- Team Statistics -->
        <div class="team-stats-grid">
          <v-card class="stat-card">
            <v-card-text>
              <div class="stat-content">
                <div class="stat-icon total-members">
                  <v-icon>mdi-account-group</v-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ members.length }}</div>
                  <div class="stat-label">{{ t('teams.totalMembers') }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <v-card class="stat-card">
            <v-card-text>
              <div class="stat-content">
                <div class="stat-icon active-members">
                  <v-icon>mdi-check-circle</v-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ activeMembers }}</div>
                  <div class="stat-label">{{ t('teams.activeMembers') }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Team Members Section -->
        <v-card class="members-section">
          <v-card-title class="members-header">
            <span>{{ t('teams.teamMembers') }}</span>
            <v-spacer />
            <v-btn
              color="primary"
              prepend-icon="mdi-account-plus"
              @click="showAddMemberDialog = true"
            >
              {{ t('teams.addMember') }}
            </v-btn>
          </v-card-title>

          <v-card-text>
            <!-- No members -->
            <div v-if="members.length === 0" class="no-members-message">
              <v-icon icon="mdi-account-plus" size="large" color="grey" />
              <p>{{ t('teams.noMembers') }}</p>
              <v-btn
                color="primary"
                variant="outlined"
                prepend-icon="mdi-account-plus"
                @click="showAddMemberDialog = true"
              >
                {{ t('teams.addFirstMember') }}
              </v-btn>
            </div>

            <!-- Members list -->
            <div v-else class="members-grid">
              <TeamMemberCard
                v-for="member in members"
                :key="member.id"
                :member="member"
                :team-id="team.id"
                @remove="handleRemoveMember"
              />
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <!-- Add Member Dialog -->
    <AddTeamMemberDialog
      v-model="showAddMemberDialog"
      :team="team"
      @member-added="loadTeamMembers"
    />

    <!-- Edit Team Dialog -->
    <EditTeamDialog
      v-model="showEditTeamDialog"
      :team="team"
      @team-updated="loadTeamData"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSnackbar } from '@/composables/useSnackbar'
import { teamsApi } from '@/services/api'
import type { Team, User } from '@medical-crm/shared'
import AppLayout from '@/components/layout/AppLayout.vue'
import TeamMemberCard from '@/components/team/TeamMemberCard.vue'
import AddTeamMemberDialog from '@/components/team/AddTeamMemberDialog.vue'
import EditTeamDialog from '@/components/team/EditTeamDialog.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { showSnackbar } = useSnackbar()

// State
const team = ref<Team | null>(null)
const members = ref<User[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const showAddMemberDialog = ref(false)
const showEditTeamDialog = ref(false)

// Computed
const activeMembers = computed(() => {
  return members.value.filter(m => m.isActive).length
})

// Methods
const loadTeamData = async () => {
  try {
    loading.value = true
    error.value = null

    const teamId = route.params.id as string
    const response = await teamsApi.getTeam(teamId)

    if (response.success && response.data) {
      team.value = response.data
      // The getTeam endpoint already returns members
      members.value = response.data.members || []
    } else {
      throw new Error('Failed to load team')
    }
  } catch (err) {
    console.error('Error loading team:', err)
    error.value = t('teams.errorLoadingTeam')
    showSnackbar(t('teams.errorLoadingTeam'), 'error')
  } finally {
    loading.value = false
  }
}

const loadTeamMembers = async () => {
  try {
    const teamId = route.params.id as string
    const response = await teamsApi.getTeamMembers(teamId)

    if (response.success && response.data) {
      members.value = response.data
    }
  } catch (err) {
    console.error('Error loading team members:', err)
    showSnackbar(t('teams.errorLoadingMembers'), 'error')
  }
}

const handleRemoveMember = async () => {
  // Reload team members after removal
  await loadTeamMembers()
  showSnackbar(t('teams.memberRemovedSuccess'), 'success')
}

const editTeam = () => {
  showEditTeamDialog.value = true
}

const goBack = () => {
  router.push('/team')
}

// Lifecycle
onMounted(() => {
  loadTeamData()
})
</script>

<style scoped>
.team-detail-view {
  height: 100%;
  overflow-y: auto;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 1rem;
}

.team-content {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.team-detail-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 2rem;
}

.team-detail-header .back-btn {
  margin-top: 0.5rem;
}

.team-detail-header .header-content {
  flex: 1;
}

.team-detail-header .header-content .page-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 2rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin: 0;
}

.team-detail-header .header-content .page-title .v-icon {
  color: rgb(var(--v-theme-primary));
}

.team-detail-header .header-content .page-description {
  margin-top: 0.5rem;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 1rem;
}

.team-detail-header .header-actions {
  display: flex;
  gap: 0.75rem;
}

.team-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.team-stats-grid .stat-card .stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.team-stats-grid .stat-card .stat-content .stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.team-stats-grid .stat-card .stat-content .stat-icon .v-icon {
  font-size: 24px;
  color: white;
}

.team-stats-grid .stat-card .stat-content .stat-icon.total-members {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.team-stats-grid .stat-card .stat-content .stat-icon.active-members {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.team-stats-grid .stat-card .stat-content .stat-info .stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.team-stats-grid .stat-card .stat-content .stat-info .stat-label {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
  margin-top: 0.25rem;
}

.members-section .members-header {
  display: flex;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.members-section .no-members-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  gap: 1rem;
}

.members-section .no-members-message p {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 1rem;
  margin: 0;
}

.members-section .members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
}

@media (max-width: 768px) {
  .team-detail-header {
    flex-direction: column;
  }

  .team-detail-header .header-actions {
    width: 100%;
  }

  .team-detail-header .header-actions button {
    flex: 1;
  }

  .team-stats-grid {
    grid-template-columns: 1fr;
  }

  .members-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
