<template>
  <div class="reminder-stats">
    <div class="stats-grid">
      <v-card class="stat-card stat-total" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-bell</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">Total</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="stat-card stat-pending" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-clock-outline</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.pending }}</div>
              <div class="stat-label">En attente</div>
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
              <div class="stat-label">Complétés</div>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="stat-card stat-overdue" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-alert-circle</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.overdue }}</div>
              <div class="stat-label">En retard</div>
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

      <v-card class="stat-card stat-urgent" variant="outlined">
        <v-card-text>
          <div class="stat-content">
            <div class="stat-icon">
              <v-icon>mdi-alert-octagon</v-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.urgent }}</div>
              <div class="stat-label">Urgents</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ReminderStats {
  total: number
  pending: number
  completed: number
  overdue: number
  today: number
  upcoming?: number
  urgent: number
}

interface Props {
  stats: ReminderStats
}

const props = defineProps<Props>()
</script>

<style scoped>
.reminder-stats {
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

.stat-pending .stat-icon {
  background-color: #e0e7ff;
  color: #6366f1;
}

.stat-pending .stat-value {
  color: #6366f1;
}

.stat-completed .stat-icon {
  background-color: #d1fae5;
  color: #10b981;
}

.stat-completed .stat-value {
  color: #10b981;
}

.stat-overdue .stat-icon {
  background-color: #fee2e2;
  color: #ef4444;
}

.stat-overdue .stat-value {
  color: #ef4444;
}

.stat-today .stat-icon {
  background-color: #fef3c7;
  color: #f59e0b;
}

.stat-today .stat-value {
  color: #f59e0b;
}

.stat-urgent .stat-icon {
  background-color: #f3e8ff;
  color: #a855f7;
}

.stat-urgent .stat-value {
  color: #a855f7;
}

/* Responsive design */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
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
