<template>
  <div class="base-donut-chart">
    <!-- Loading State -->
    <div v-if="loading" class="chart-loading">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!hasData" class="chart-empty">
      <v-icon size="48" color="grey-lighten-1">mdi-chart-donut</v-icon>
      <p class="text-body-2 text-medium-emphasis mt-2">
        {{ t('charts.noData') }}
      </p>
    </div>

    <!-- Chart -->
    <apexchart
      v-else
      type="donut"
      :height="height"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VueApexCharts from 'vue3-apexcharts'
import { useChartColors, getBaseChartOptions } from '../utils/chartTheme'
import { getDonutResponsiveOptions } from '../utils/responsive'
import { formatCurrency, formatNumber } from '../utils/formatters'
import type { DonutChartProps } from '../types'

const apexchart = VueApexCharts

const props = withDefaults(defineProps<DonutChartProps>(), {
  height: 350,
  loading: false,
  showLegend: true,
  showLabels: true,
  donutSize: 65,
})

const { t } = useI18n()
const colors = useChartColors()
const baseOptions = getBaseChartOptions(colors)

// Check if we have valid data
const hasData = computed(() =>
  props.data && props.data.length > 0 && props.data.some(d => d.value > 0)
)

// Extract series values
const series = computed(() => props.data.map(d => d.value))

// Extract labels
const labels = computed(() => props.data.map(d => d.label))

// Calculate total for percentage display
const total = computed(() => props.data.reduce((sum, d) => sum + d.value, 0))

// Build chart options
const chartOptions = computed(() => ({
  ...baseOptions.value,
  chart: {
    ...baseOptions.value.chart,
    type: 'donut',
  },
  labels: labels.value,
  colors: props.colors || props.data.map(d => d.color).filter(Boolean) || colors.defaultPalette.value,
  legend: {
    ...baseOptions.value.legend,
    show: props.showLegend,
    position: 'bottom' as const,
    horizontalAlign: 'center' as const,
    fontSize: '13px',
    markers: {
      width: 12,
      height: 12,
      radius: 3,
    },
    itemMargin: {
      horizontal: 12,
      vertical: 6,
    },
  },
  dataLabels: {
    enabled: props.showLabels,
    formatter: (val: number) => `${val.toFixed(0)}%`,
    style: {
      fontSize: '12px',
      fontWeight: 600,
      colors: ['#fff'],
    },
    dropShadow: {
      enabled: true,
      top: 1,
      left: 1,
      blur: 1,
      opacity: 0.45,
    },
  },
  plotOptions: {
    pie: {
      donut: {
        size: `${props.donutSize}%`,
        labels: {
          show: !!props.centerText,
          name: {
            show: true,
            fontSize: '14px',
            color: colors.textMutedColor.value,
            offsetY: -10,
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 700,
            color: colors.textColor.value,
            offsetY: 5,
            formatter: (val: string) => formatNumber(Number(val)),
          },
          total: {
            show: !!props.centerText,
            showAlways: true,
            label: props.centerText || 'Total',
            fontSize: '14px',
            color: colors.textMutedColor.value,
            formatter: () => formatNumber(total.value),
          },
        },
      },
    },
  },
  stroke: {
    show: true,
    width: 2,
    colors: [colors.surfaceColor.value],
  },
  tooltip: {
    ...baseOptions.value.tooltip,
    y: {
      formatter: (val: number) => formatNumber(val),
    },
  },
  responsive: getDonutResponsiveOptions(props.height as number),
}))
</script>

<style scoped>
.base-donut-chart {
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
  .base-donut-chart {
    min-height: 180px;
  }

  .chart-loading,
  .chart-empty {
    min-height: 180px;
    padding: 1rem;
  }
}
</style>
