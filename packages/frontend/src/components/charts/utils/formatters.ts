/**
 * Chart Formatters
 * Utility functions for formatting chart values, tooltips, and labels
 */

/**
 * Format number as currency (EUR)
 */
export function formatCurrency(value: number, compact = false): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(safeValue)
}

/**
 * Format number as percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return `${safeValue.toFixed(decimals)}%`
}

/**
 * Format large numbers with K, M suffixes
 */
export function formatCompactNumber(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(safeValue)
}

/**
 * Format number with French locale
 */
export function formatNumber(value: number, decimals = 0): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeValue)
}

/**
 * Create currency tooltip formatter for ApexCharts
 */
export function currencyTooltipFormatter(value: number): string {
  return formatCurrency(value)
}

/**
 * Create percentage tooltip formatter for ApexCharts
 */
export function percentageTooltipFormatter(value: number): string {
  return formatPercentage(value)
}

/**
 * Create a custom tooltip formatter with label
 */
export function labeledTooltipFormatter(value: number, label: string): string {
  return `${label}: ${formatNumber(value)}`
}

/**
 * ApexCharts Y-axis currency formatter
 */
export function yAxisCurrencyFormatter(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  if (safeValue >= 1000000) {
    return `${(safeValue / 1000000).toFixed(1)}M €`
  }
  if (safeValue >= 1000) {
    return `${(safeValue / 1000).toFixed(0)}K €`
  }
  return `${safeValue} €`
}

/**
 * ApexCharts data label formatter for percentages in donut charts
 */
export function donutPercentageFormatter(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return `${safeValue.toFixed(0)}%`
}

/**
 * Create tooltip content for donut chart
 */
export function createDonutTooltip(
  seriesName: string,
  value: number,
  total: number,
  formatValue: (v: number) => string = formatNumber
): string {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
  return `
    <div class="apexcharts-tooltip-custom">
      <strong>${seriesName}</strong><br/>
      ${formatValue(value)} (${percentage}%)
    </div>
  `
}

/**
 * Truncate long labels for chart display
 */
export function truncateLabel(label: string, maxLength = 15): string {
  if (label.length <= maxLength) return label
  return `${label.substring(0, maxLength - 1)}…`
}
