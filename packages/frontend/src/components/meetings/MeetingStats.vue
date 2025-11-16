<template>
  <div class="meeting-stats">
    <div class="stats-grid">
      <v-card class="stat-card stat-total" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-calendar-multiple</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">Total</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="stat-card stat-scheduled" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-calendar-clock</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.scheduled }}</div>
              <div class="stat-label">Planifiées</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="stat-card stat-in-progress" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-play-circle</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.inProgress }}</div>
              <div class="stat-label">En cours</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="stat-card stat-completed" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-check-circle</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.completed }}</div>
              <div class="stat-label">Terminées</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="stat-card stat-today" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-calendar-today</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.today }}</div>
              <div class="stat-label">Aujourd'hui</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="stat-card stat-upcoming" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-calendar-arrow-right</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.upcoming }}</div>
              <div class="stat-label">À venir</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
interface MeetingStats {
  total: number
  scheduled: number
  inProgress: number
  completed: number
  upcoming: number
  today: number
}

interface Props {
  stats: MeetingStats
}

const props = defineProps<Props>()
</script>

<style scoped>
.meeting-stats {
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border-radius: 12px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Stat card color themes */
.stat-total .stat-icon {
  background-color: #f3f4f6;
  color: #374151;
}

.stat-total .stat-value {
  color: #374151;
}

.stat-scheduled .stat-icon {
  background-color: #dbeafe;
  color: #2563eb;
}

.stat-scheduled .stat-value {
  color: #2563eb;
}

.stat-in-progress .stat-icon {
  background-color: #ede9fe;
  color: #7c3aed;
}

.stat-in-progress .stat-value {
  color: #7c3aed;
}

.stat-completed .stat-icon {
  background-color: #dcfce7;
  color: #16a34a;
}

.stat-completed .stat-value {
  color: #16a34a;
}

.stat-today .stat-icon {
  background-color: #fef3c7;
  color: #d97706;
}

.stat-today .stat-value {
  color: #d97706;
}

.stat-upcoming .stat-icon {
  background-color: #ddd6fe;
  color: #7c3aed;
}

.stat-upcoming .stat-value {
  color: #7c3aed;
}

/* Responsive design */
@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
  }

  .stat-icon {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .stat-content {
    padding: 0.5rem;
  }

  .stat-icon {
    width: 2rem;
    height: 2rem;
    font-size: 0.875rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .stat-label {
    font-size: 0.7rem;
  }
}
</style>
