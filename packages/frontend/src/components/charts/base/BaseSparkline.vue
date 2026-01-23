<template>
  <div class="base-sparkline" :style="{ width: computedWidth, height: `${height}px` }">
    <apexchart
      v-if="hasData"
      :type="type"
      :height="height"
      :width="'100%'"
      :options="chartOptions"
      :series="chartSeries"
    />
    <div v-else class="sparkline-empty">
      <span class="sparkline-dash">—</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { useChartColors } from '../utils/chartTheme'
import type { SparklineProps } from '../types'

const apexchart = VueApexCharts

const props = withDefaults(defineProps<SparklineProps>(), {
  height: 50,
  width: '100%',
  type: 'line',
  showTooltip: true,
})

const colors = useChartColors()

// Check if we have valid data
const hasData = computed(() =>
  props.data && props.data.length > 0 && props.data.some(d => d !== 0)
)

// Compute width
const computedWidth = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width
)

// Prepare series
const chartSeries = computed(() => [{
  name: 'Value',
  data: props.data,
}])

// Sparkline specific options
const chartOptions = computed(() => ({
  chart: {
    type: props.type === 'area' ? 'area' : props.type,
    sparkline: {
      enabled: true,
    },
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 300,
    },
  },
  stroke: {
    curve: 'smooth' as const,
    width: props.type === 'bar' ? 0 : 2,
  },
  fill: {
    type: props.type === 'area' ? 'gradient' : 'solid',
    opacity: props.type === 'area' ? 0.3 : 1,
    gradient: props.type === 'area' ? {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.1,
      stops: [0, 90, 100],
    } : undefined,
  },
  colors: [props.color || colors.chartColors.value.primary],
  tooltip: {
    enabled: props.showTooltip,
    theme: colors.isDark.value ? 'dark' : 'light',
    fixed: {
      enabled: false,
    },
    x: {
      show: false,
    },
    y: {
      title: {
        formatter: () => '',
      },
    },
    marker: {
      show: false,
    },
  },
  plotOptions: {
    bar: {
      columnWidth: '60%',
      borderRadius: 2,
    },
  },
}))
</script>

<style scoped>
.base-sparkline {
  display: flex;
  align-items: center;
  justify-content: center;
}

.sparkline-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.sparkline-dash {
  color: rgba(0, 0, 0, 0.3);
  font-size: 1.5rem;
}

/* Ensure chart fills container */
.base-sparkline :deep(.apexcharts-canvas) {
  width: 100% !important;
}
</style>
