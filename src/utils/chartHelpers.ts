/**
 * Chart Helper Utilities
 * Convert data arrays to SVG paths and calculate chart dimensions
 */

/**
 * Convert array of numbers to SVG path for line/area charts
 * Maps data points to viewBox coordinates
 */

/**
 * Normalize raw amount values (numbers or formatted strings) into a finite number.
 * Falls back to 0 when parsing fails.
 */
export function normalizeAmount(amount: unknown): number {
  if (typeof amount === 'number' && Number.isFinite(amount)) {
    return amount
  }

  if (typeof amount === 'string') {
    const cleaned = amount.replace(/[^0-9.-]/g, '')
    const parsed = Number(cleaned)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  if (typeof amount === 'bigint') {
    return Number(amount)
  }

  return 0
}

export function convertToSVGPath(
  data: number[],
  viewBoxWidth: number = 472,
  viewBoxHeight: number = 150,
  smooth: boolean = true
): string {
  if (data.length === 0) return ''

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  // Calculate points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * viewBoxWidth
    const y = viewBoxHeight - ((value - min) / range) * viewBoxHeight * 0.8 - viewBoxHeight * 0.1
    return { x, y }
  })

  if (!smooth) {
    // Simple line path
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
  }

  // Smooth bezier curve path
  let path = `M${points[0].x} ${points[0].y}`

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i]
    const next = points[i + 1]
    const xMid = (current.x + next.x) / 2
    const yMid = (current.y + next.y) / 2

    if (i === 0) {
      path += ` Q${current.x} ${current.y} ${xMid} ${yMid}`
    } else {
      path += ` Q${current.x} ${current.y} ${xMid} ${yMid}`
    }

    if (i === points.length - 2) {
      path += ` Q${next.x} ${next.y} ${next.x} ${next.y}`
    }
  }

  return path
}

/**
 * Convert array of numbers to smooth cubic bezier SVG path
 * Better for visualizing trends
 * Uses smart scaling to handle wide ranges in data
 */
export interface ChartPoint {
  x: number
  y: number
}

function buildCurveSegments(points: ChartPoint[]): string {
  if (points.length < 2) return ''

  let segments = ''
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]
    const next = points[i + 1]
    const step = (next.x - curr.x) / 3

    const cp1x = curr.x + step
    const cp1y = curr.y
    const cp2x = next.x - step
    const cp2y = next.y

    segments += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next.x} ${next.y}`
  }

  return segments
}

export function generateSmoothPath(
  data: number[],
  viewBoxWidth: number = 472,
  viewBoxHeight: number = 150,
  minValue?: number,
  maxValue?: number
): { path: string; points: ChartPoint[] } {
  if (data.length === 0) return { path: '', points: [] }

  const denominator = Math.max(1, data.length - 1)
  const computedMax = maxValue ?? Math.max(...data)
  const computedMin = minValue ?? Math.min(...data)
  const range = computedMax - computedMin || 1
  const effectiveMin = Number.isFinite(computedMin) ? computedMin : 0
  const effectiveMax = Number.isFinite(computedMax) ? computedMax : 1

  // If the range is very large and min is close to 0, use sqrt scaling
  const useLogScale =
    range > effectiveMax * 0.8 &&
    effectiveMin > 0 &&
    effectiveMin < effectiveMax * 0.1

  const points = data.map((value, index) => {
    const x = (index / denominator) * viewBoxWidth

    let normalizedValue
    if (useLogScale && value > 0) {
      const sqrtMax = Math.sqrt(effectiveMax)
      const sqrtMin = Math.sqrt(effectiveMin)
      normalizedValue = (Math.sqrt(value) - sqrtMin) / (sqrtMax - sqrtMin || 1)
    } else {
      normalizedValue = (value - effectiveMin) / range
    }

    const y = viewBoxHeight - normalizedValue * viewBoxHeight * 0.8 - viewBoxHeight * 0.1
    return { x, y }
  })

  if (points.length === 1) {
    const singlePoint = { x: viewBoxWidth / 2, y: points[0].y }
    return {
      path: `M${singlePoint.x} ${singlePoint.y}`,
      points: [singlePoint]
    }
  }

  const path = `M${points[0].x} ${points[0].y}${buildCurveSegments(points)}`
  return { path, points }
}

export function buildSmoothAreaPath(topPoints: ChartPoint[], bottomPoints: ChartPoint[]): string {
  if (topPoints.length === 0 || bottomPoints.length === 0) return ''
  if (topPoints.length === 1 || bottomPoints.length === 1) return ''

  const reversedBottom = [...bottomPoints].reverse()

  const pathParts = [
    `M${topPoints[0].x} ${topPoints[0].y}`,
    buildCurveSegments(topPoints),
    ` L${reversedBottom[0].x} ${reversedBottom[0].y}`,
    buildCurveSegments(reversedBottom),
    ' Z'
  ]

  return pathParts.join('')
}

/**
 * Calculate bar chart heights as percentages
 * Uses square root scaling for better visual distribution when there's a large range
 */
export function calculateBarPercentages(amounts: Array<number | string>): number[] {
  // Use magnitude so negative spending values still render correctly
  const normalized = amounts.map(amount => normalizeAmount(amount))
  const magnitudes = normalized.map(amount => Math.abs(amount))
  const max = Math.max(...magnitudes)
  if (!isFinite(max) || max === 0) return amounts.map(() => 0)

  // Use square root scaling for better visual distribution
  const sqrtMax = Math.sqrt(max)

  return magnitudes.map(amount => {
    if (amount === 0) return 2 // Show tiny bar for zero

    // Square root scaling makes differences more visible
    const sqrtAmount = Math.sqrt(amount)
    const percentage = (sqrtAmount / sqrtMax) * 100

    return Math.max(percentage, 8) // Minimum 8% for visibility
  })
}

/**
 * Format currency consistently
 */
export function formatCurrency(amount: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Get Tailwind color class based on color name
 */
export function getTailwindColorClass(
  color: 'emerald' | 'green' | 'rose' | 'amber' | 'blue' | 'purple',
  type: 'bg' | 'text' | 'border' = 'bg'
): string {
  const colorMap = {
    emerald: 'emerald-500',
    green: 'green-500',
    rose: 'rose-500',
    amber: 'amber-500',
    blue: 'blue-500',
    purple: 'purple-500'
  }

  return `${type}-${colorMap[color]}`
}

/**
 * Create area fill path from line path
 * Closes the path to create fillable area
 */
export function createAreaPath(
  linePath: string,
  viewBoxWidth: number = 472,
  viewBoxHeight: number = 150
): string {
  if (!linePath) return ''

  return `${linePath} L ${viewBoxWidth} ${viewBoxHeight} L 0 ${viewBoxHeight} Z`
}

/**
 * Calculate domain (min/max) for a dataset with padding
 */
export function calculateDomain(data: number[], paddingPercent: number = 10): [number, number] {
  if (data.length === 0) return [0, 100]

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = range * (paddingPercent / 100)

  return [Math.max(0, min - padding), max + padding]
}
