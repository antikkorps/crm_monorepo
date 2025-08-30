<template>
  <div class="task-stats">
    <div class="stats-grid">
      <Card class="stat-card stat-total">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon">
              <i class="pi pi-list"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">Total Tasks</div>
            </div>
          </div>
        </template>
      </Card>

      <Card class="stat-card stat-todo">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon">
              <i class="pi pi-circle"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todo }}</div>
              <div class="stat-label">To Do</div>
            </div>
          </div>
        </template>
      </Card>

      <Card class="stat-card stat-progress">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon">
              <i class="pi pi-clock"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.inProgress }}</div>
              <div class="stat-label">In Progress</div>
            </div>
          </div>
        </template>
      </Card>

      <Card class="stat-card stat-completed">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon">
              <i class="pi pi-check-circle"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.completed }}</div>
              <div class="stat-label">Completed</div>
            </div>
          </div>
        </template>
      </Card>

      <Card class="stat-card stat-overdue" v-if="stats.overdue > 0">
        <template #content>
          <div class="stat-content">
            <div class="stat-icon">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.overdue }}</div>
              <div class="stat-label">Overdue</div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Progress Bar -->
    <div class="progress-section" v-if="stats.total > 0">
      <div class="progress-header">
        <span class="progress-label">Completion Progress</span>
        <span class="progress-percentage">{{ completionPercentage }}%</span>
      </div>
      <ProgressBar
        :value="completionPercentage"
        class="completion-progress"
        :showValue="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from "primevue/card"
import ProgressBar from "primevue/progressbar"
import { computed } from "vue"

interface TaskStats {
  total: number
  todo: number
  inProgress: number
  completed: number
  overdue: number
}

interface Props {
  stats: TaskStats
}

const props = defineProps<Props>()

const completionPercentage = computed(() => {
  if (props.stats.total === 0) return 0
  return Math.round((props.stats.completed / props.stats.total) * 100)
})
</script>

<style scoped>
.task-stats {
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
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
}

/* Stat card color themes */
.stat-total .stat-icon {
  background-color: #f3f4f6;
  color: #374151;
}

.stat-total .stat-value {
  color: #374151;
}

.stat-todo .stat-icon {
  background-color: #fef3c7;
  color: #d97706;
}

.stat-todo .stat-value {
  color: #d97706;
}

.stat-progress .stat-icon {
  background-color: #dbeafe;
  color: #2563eb;
}

.stat-progress .stat-value {
  color: #2563eb;
}

.stat-completed .stat-icon {
  background-color: #dcfce7;
  color: #16a34a;
}

.stat-completed .stat-value {
  color: #16a34a;
}

.stat-overdue .stat-icon {
  background-color: #fee2e2;
  color: #dc2626;
}

.stat-overdue .stat-value {
  color: #dc2626;
}

.progress-section {
  background: white;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 600;
  color: #2563eb;
}

.completion-progress {
  height: 8px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-content {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .stat-icon {
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1rem;
  }

  .stat-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
