<template>
  <div class="base-bar-chart">
    <!-- Loading State -->
    <div v-if="loading" class="chart-loading">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasData" class="chart-empty">
      <v-icon size="48" color="grey-lighten-1">mdi-chart-bar</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">
        {{ t('charts.noData') }}
      </p>
    </div>

    <!-- Chart -->
    <apexchart
      v-else
      type="bar"
      :height="computedHeight"
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
import { getResponsiveOptions, getHorizontalBarResponsiveOptions, getDynamicHeight } from '../utils/responsive'
import { formatNumber, truncateLabel } from '../utils/formatters'
import type { BarChartProps } from '../types'

const apexchart = VueApexCharts

const props = withDefaults(defineProps<BarChartProps>(), {
  height: 350,
  loading: false,
  showLegend: false,
  horizontal: false,
  stacked: false,
  showDataLabels: false,
  borderRadius: 4,
})

const { t } = useI18n()
const colors = useChartColors()
const baseOptions = getBaseChartOptions(colors)

// Check if we have valid data
const hasData = computed(() =>
  props.series && props.series.length > 0 && props.series.some(s => s.data.some(d => d > 0))
)

// Compute dynamic height for horizontal bars
const computedHeight = computed(() => {
  if (props.horizontal) {
    return getDynamicHeight(props.categories.length, props.height as number)
  }
  return props.height
})

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
    type: 'bar',
    stacked: props.stacked,
  },
  plotOptions: {
    bar: {
      horizontal: props.horizontal,
      borderRadius: props.borderRadius,
      borderRadiusApplication: 'end' as const,
      columnWidth: props.horizontal ? undefined : '60%',
      barHeight: props.horizontal ? '60%' : undefined,
      distributed: props.series.length === 1,
      dataLabels: {
        position: props.horizontal ? 'center' : 'top',
      },
    },
  },
  colors: props.colors || props.series.map(s => s.color).filter(Boolean) || colors.defaultPalette.value,
  xaxis: {
    ...baseOptions.value.xaxis,
    categories: props.horizontal
      ? props.categories.map(c => truncateLabel(c, 20))
      : props.categories,
    labels: {
      ...baseOptions.value.xaxis?.labels,
      style: {
        fontSize: '12px',
        colors: colors.textMutedColor.value,
      },
      formatter: props.horizontal
        ? (val: string | number) => formatNumber(Number(val))
        : undefined,
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
      formatter: props.horizontal
        ? undefined
        : (val: number) => formatNumber(val),
      maxWidth: props.horizontal ? 150 : undefined,
    },
  },
  dataLabels: {
    enabled: props.showDataLabels,
    formatter: (val: number) => formatNumber(val),
    style: {
      fontSize: '11px',
      fontWeight: 600,
      colors: props.horizontal ? ['#fff'] : [colors.textColor.value],
    },
    offsetY: props.horizontal ? 0 : -20,
  },
  legend: {
    ...baseOptions.value.legend,
    show: props.showLegend && props.series.length > 1,
    position: 'bottom' as const,
    fontSize: '13px',
  },
  tooltip: {
    ...baseOptions.value.tooltip,
    y: {
      formatter: (val: number) => formatNumber(val),
    },
  },
  grid: {
    ...baseOptions.value.grid,
    padding: {
      left: props.horizontal ? 10 : 0,
      right: 10,
    },
  },
  responsive: props.horizontal
    ? getHorizontalBarResponsiveOptions(props.height as number)
    : getResponsiveOptions(props.height as number),
}))
</script>

<style scoped>
.base-bar-chart {
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

:deep(.apexcharts-xaxis-label),
:deep(.apexcharts-yaxis-label) {
  fill: currentColor;
}

/* Mobile optimizations */
@media (max-width: 600px) {
  .base-bar-chart {
    min-height: 180px;
  }

  .chart-loading,
  .chart-empty {
    min-height: 180px;
    padding: 1rem;
  }
}
</style>
