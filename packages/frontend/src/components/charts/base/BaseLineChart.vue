<template>
  <div class="base-line-chart">
    <!-- Loading State -->
    <div v-if="loading" class="chart-loading">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasData" class="chart-empty">
      <v-icon size="48" color="grey-lighten-1">mdi-chart-line</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">
        {{ t('charts.noData') }}
      </p>
    </div>

    <!-- Chart -->
    <apexchart
      v-else
      type="line"
      :height="height"
      :options="chartOptions"
      :series="chartSeries"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VueApexCharts from 'vue3-apexcharts'
import { useChartColors, getBaseChartOptions } from '../utils/chartTheme'
import { getResponsiveOptions } from '../utils/responsive'
import { formatNumber } from '../utils/formatters'
import type { LineChartProps } from '../types'

const apexchart = VueApexCharts

const props = withDefaults(defineProps<LineChartProps>(), {
  height: 350,
  loading: false,
  showLegend: true,
  curved: true,
  showArea: false,
  showDataLabels: false,
  showMarkers: true,
  strokeWidth: 3,
})

const { t } = useI18n()
const colors = useChartColors()
const baseOptions = getBaseChartOptions(colors)

// Check if we have valid data
const hasData = computed(() =>
  props.series && props.series.length > 0 && props.series.some(s => s.data.some(d => d > 0))
)

// Prepare series with colors
const chartSeries = computed(() =>
  props.series.map((s, index) => ({
    name: s.name,
    data: s.data,
    color: s.color || props.colors?.[index] || colors.defaultPalette.value[index],
  }))
)

// Build chart options
const chartOptions = computed(() => ({
  ...baseOptions.value,
  chart: {
    ...baseOptions.value.chart,
    type: 'line',
    zoom: {
      enabled: false,
    },
  },
  stroke: {
    curve: props.curved ? 'smooth' as const : 'straight' as const,
    width: props.strokeWidth,
  },
  fill: {
    type: props.showArea ? 'gradient' : 'solid',
    gradient: props.showArea ? {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.1,
      stops: [0, 90, 100],
    } : undefined,
  },
  colors: props.colors || props.series.map(s => s.color).filter(Boolean) || colors.defaultPalette.value,
  xaxis: {
    ...baseOptions.value.xaxis,
    categories: props.categories,
    labels: {
      ...baseOptions.value.xaxis?.labels,
      style: {
        fontSize: '12px',
        colors: colors.textMutedColor.value,
      },
    },
  },
  yaxis: {
    ...baseOptions.value.yaxis,
    labels: {
      ...baseOptions.value.yaxis?.labels,
      style: {
        fontSize: '12px',
        colors: colors.textMutedColor.value,
      },
      formatter: (val: number) => formatNumber(val),
    },
  },
  dataLabels: {
    enabled: props.showDataLabels,
    formatter: (val: number) => formatNumber(val),
    style: {
      fontSize: '11px',
      fontWeight: 600,
      colors: [colors.textColor.value],
    },
    offsetY: -10,
  },
  markers: {
    size: props.showMarkers ? 4 : 0,
    strokeWidth: 2,
    strokeColors: colors.surfaceColor.value,
    hover: {
      size: 6,
    },
  },
  legend: {
    ...baseOptions.value.legend,
    show: props.showLegend && props.series.length > 1,
    position: 'bottom' as const,
    fontSize: '13px',
  },
  tooltip: {
    ...baseOptions.value.tooltip,
    shared: true,
    intersect: false,
    y: {
      formatter: (val: number) => formatNumber(val),
    },
  },
  grid: {
    ...baseOptions.value.grid,
    padding: {
      left: 10,
      right: 10,
    },
  },
  responsive: getResponsiveOptions(props.height as number),
}))
</script>

<style scoped>
.base-line-chart {
  width: 100%;
  min-height: 200px;
}

.chart-loading,
.chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 250px;
  padding: 2rem;
}

.chart-empty {
  color: rgba(0, 0, 0, 0.6);
}

/* Dark mode support */
:deep(.apexcharts-legend-text) {
  color: inherit !important;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .base-line-chart {
    min-height: 180px;
  }

  .chart-loading,
  .chart-empty {
    min-height: 180px;
    padding: 1rem;
  }
}
</style>
