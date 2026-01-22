<template>
  <div class="team-assignment-filter">
    <v-autocomplete
      v-model="selectedTeam"
      :items="teams"
      :label="$t('segmentation.filters.teamAssignment.label')"
      item-title="name"
      item-value="id"
      variant="outlined"
      density="compact"
      :loading="loadingTeams"
      clearable
      class="mb-3"
      @update:model-value="onTeamChange"
    >
      <template v-slot:item="{ props, item }">
        <v-list-item v-bind="props">
          <template v-slot:prepend>
            <v-icon size="small" color="primary">mdi-account-group</v-icon>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>

    <v-autocomplete
      v-model="selectedMembers"
      :items="teamMembers"
      :label="$t('segmentation.filters.teamAssignment.members')"
      item-title="fullName"
      item-value="id"
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :disabled="!selectedTeam"
      :loading="loadingMembers"
      class="mb-3"
    >
      <template v-slot:chip="{ props, item }">
        <v-chip v-bind="props" size="small">
          <v-icon start size="small">mdi-account</v-icon>
          {{ item.raw.fullName }}
        </v-chip>
      </template>
    </v-autocomplete>

    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!selectedTeam"
      class="mt-2"
    >
      <v-icon start>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { teamApi } from '@/services/api'

const { t } = useI18n()

// Props
interface Props {
  filterType: string
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'add-filter': [filter: { type: string; field: string; operator: string; value: any; label: string; group: string }]
}>()

// Reactive data
const selectedTeam = ref<string>('')
const selectedMembers = ref<string[]>([])
const teams = ref<Array<{ id: string; name: string }>>([])
const teamMembers = ref<Array<{ id: string; fullName: string; firstName: string; lastName: string }>>([])
const loadingTeams = ref(false)
const loadingMembers = ref(false)

// Load teams on mount
onMounted(async () => {
  await loadTeams()
})

const loadTeams = async () => {
  loadingTeams.value = true
  try {
    const response = await teamApi.getAll()
    // Handle API response: { data: [...] } or { data: { teams: [...] } }
    const data = (response as any).data || response
    let teamsArray: any[] = []

    if (Array.isArray(data)) {
      teamsArray = data
    } else if (data && Array.isArray(data.teams)) {
      teamsArray = data.teams
    }

    teams.value = teamsArray.map((team: any) => ({
      id: team.id,
      name: team.name
    }))
  } catch (error) {
    console.error('Error loading teams:', error)
  } finally {
    loadingTeams.value = false
  }
}

const onTeamChange = async (teamId: string | null) => {
  selectedMembers.value = []
  teamMembers.value = []

  if (!teamId) return

  loadingMembers.value = true
  try {
    const response = await teamApi.getMembers(teamId)
    // Handle API response
    const data = (response as any).data || response
    const membersArray = Array.isArray(data) ? data : (data.members || [])

    teamMembers.value = membersArray.map((member: any) => ({
      id: member.id,
      fullName: `${member.firstName} ${member.lastName}`,
      firstName: member.firstName,
      lastName: member.lastName
    }))
  } catch (error) {
    console.error('Error loading team members:', error)
  } finally {
    loadingMembers.value = false
  }
}

// Methods
const addFilter = () => {
  if (!selectedTeam.value) return

  const team = teams.value.find(t => t.id === selectedTeam.value)
  const memberNames = selectedMembers.value
    .map(id => teamMembers.value.find(m => m.id === id)?.fullName)
    .filter(Boolean)
    .join(', ')

  const label = memberNames
    ? `${team?.name}: ${memberNames}`
    : team?.name || t('segmentation.filters.teamAssignment.label')

  emit('add-filter', {
    type: 'combined',
    field: 'teamAssignment',
    operator: selectedMembers.value.length > 0 ? 'in' : 'equals',
    value: {
      teamId: selectedTeam.value,
      memberIds: selectedMembers.value.length > 0 ? selectedMembers.value : undefined
    },
    label: `${t('segmentation.filters.teamAssignment.label')}: ${label}`,
    group: 'combined'
  })

  selectedTeam.value = ''
  selectedMembers.value = []
  teamMembers.value = []
}
</script>

<style scoped>
.team-assignment-filter {
  min-width: 300px;
}
</style>
