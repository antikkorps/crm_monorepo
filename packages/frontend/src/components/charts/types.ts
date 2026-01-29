/**
 * Chart Library TypeScript Interfaces
 * Centralized types for all ApexCharts components
 */

// Core data point for simple charts (donut, pie)
export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}

// Series data for multi-series charts (bar, line, area)
export interface ChartSeries {
  name: string
  data: number[]
  color?: string
}

// Base props shared by all chart components
export interface BaseChartProps {
  /** Chart title displayed in card header */
  title?: string
  /** Chart height in pixels or CSS value */
  height?: number | string
  /** Show loading state */
  loading?: boolean
  /** Custom color palette */
  colors?: string[]
  /** Show chart legend */
  showLegend?: boolean
  /** Show chart toolbar (zoom, download, etc.) */
  showToolbar?: boolean
}

// Donut/Pie chart specific props
export interface DonutChartProps extends BaseChartProps {
  /** Data points with label, value, and optional color */
  data: ChartDataPoint[]
  /** Text to display in center of donut */
  centerText?: string
  /** Show percentage labels on slices */
  showLabels?: boolean
  /** Donut hole size (0-100) */
  donutSize?: number
}

// Bar chart specific props
export interface BarChartProps extends BaseChartProps {
  /** X-axis categories */
  categories: string[]
  /** Data series */
  series: ChartSeries[]
  /** Horizontal bars instead of vertical */
  horizontal?: boolean
  /** Stack bars on top of each other */
  stacked?: boolean
  /** Show data labels on bars */
  showDataLabels?: boolean
  /** Bar border radius */
  borderRadius?: number
}

// Line chart specific props
export interface LineChartProps extends BaseChartProps {
  /** X-axis categories */
  categories: string[]
  /** Data series */
  series: ChartSeries[]
  /** Use curved lines instead of straight */
  curved?: boolean
  /** Fill area under line */
  showArea?: boolean
  /** Show data labels on points */
  showDataLabels?: boolean
  /** Show markers on data points */
  showMarkers?: boolean
  /** Line stroke width */
  strokeWidth?: number
}

// Area chart specific props (extends line chart)
export interface AreaChartProps extends LineChartProps {
  /** Use gradient fill */
  gradient?: boolean
  /** Fill opacity (0-1) */
  fillOpacity?: number
}

// Sparkline chart props (minimal inline charts)
export interface SparklineProps {
  /** Data values */
  data: number[]
  /** Chart color */
  color?: string
  /** Chart height in pixels */
  height?: number
  /** Chart width (default: 100%) */
  width?: number | string
  /** Sparkline type */
  type?: 'line' | 'bar' | 'area'
  /** Show tooltip on hover */
  showTooltip?: boolean
}

// Chart theme colors interface
export interface ChartThemeColors {
  primary: string
  secondary: string
  success: string
  warning: string
  error: string
  info: string
  surface: string
  background: string
}

// Responsive breakpoint configuration
export interface ResponsiveBreakpoint {
  breakpoint: number
  options: Record<string, unknown>
}
