/**
 * Charts Library
 * Centralized, reusable ApexCharts components
 */

// Base components
export { default as BaseDonutChart } from './base/BaseDonutChart.vue'
export { default as BaseBarChart } from './base/BaseBarChart.vue'
export { default as BaseLineChart } from './base/BaseLineChart.vue'
export { default as BaseAreaChart } from './base/BaseAreaChart.vue'
export { default as BaseSparkline } from './base/BaseSparkline.vue'

// Types
export * from './types'

// Utilities
export { useChartColors, getBaseChartOptions } from './utils/chartTheme'
export {
  getResponsiveOptions,
  getDonutResponsiveOptions,
  getHorizontalBarResponsiveOptions,
  getSparklineResponsiveOptions,
  getDynamicHeight,
} from './utils/responsive'
export {
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatNumber,
  currencyTooltipFormatter,
  percentageTooltipFormatter,
  yAxisCurrencyFormatter,
  donutPercentageFormatter,
  truncateLabel,
} from './utils/formatters'
