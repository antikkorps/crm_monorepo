<template>
  <div class="team-assignment-filter">
    <v-select
      v-model="selectedTeam"
      :items="teamOptions"
      :label="$t('segmentation.filters.teamAssignment.label')"
      item-title="label"
      item-value="value"
      outlined
      dense
      class="mb-3"
    />
    <v-select
      v-model="selectedMembers"
      :items="memberOptions"
      :label="$t('segmentation.filters.teamAssignment.members')"
      item-title="label"
      item-value="value"
      multiple
      chips
      outlined
      dense
      :disabled="!selectedTeam"
      class="mb-3"
    />
    <v-btn
      color="primary"
      @click="addFilter"
      :disabled="!selectedTeam || selectedMembers.length === 0"
      class="mt-2"
    >
      <v-icon left>mdi-plus</v-icon>
      {{ $t('segmentation.filters.addFilter') }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

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

// Mock team data - in real implementation, this would come from API
const teamOptions = computed(() => [
  { value: 'sales_team', label: t('segmentation.filters.teamAssignment.teams.sales') },
  { value: 'support_team', label: t('segmentation.filters.teamAssignment.teams.support') },
  { value: 'medical_team', label: t('segmentation.filters.teamAssignment.teams.medical') }
])

const memberOptions = computed(() => {
  if (!selectedTeam.value) return []
  
  // Mock member data based on selected team
  const members: Record<string, Array<{ value: string; label: string }>> = {
    sales_team: [
      { value: 'john_doe', label: 'John Doe' },
      { value: 'jane_smith', label: 'Jane Smith' }
    ],
    support_team: [
      { value: 'bob_wilson', label: 'Bob Wilson' },
      { value: 'alice_brown', label: 'Alice Brown' }
    ],
    medical_team: [
      { value: 'dr_johnson', label: 'Dr. Johnson' },
      { value: 'dr_williams', label: 'Dr. Williams' }
    ]
  }
  
  return members[selectedTeam.value] || []
})

// Methods
const addFilter = () => {
  if (!selectedTeam.value || selectedMembers.value.length === 0) return

  emit('add-filter', {
    type: 'combined',
    field: 'teamAssignment',
    operator: 'in',
    value: {
      team: selectedTeam.value,
      members: selectedMembers.value
    },
    label: `${t('segmentation.filters.teamAssignment.label')}: ${teamOptions.value.find(t => t.value === selectedTeam.value)?.label}`,
    group: 'combined'
  })

  selectedTeam.value = ''
  selectedMembers.value = []
}
</script>