'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RiverData } from '@/types/insights'

interface CategoryRiverChartProps {
  data: RiverData
  isInView?: boolean
}

export function CategoryRiverChart({ data, isInView = true }: CategoryRiverChartProps) {
  const [visibleCategories, setVisibleCategories] = useState<Set<string>>(
    new Set(data?.layers?.slice(0, 6).map(l => l.category) || []) // Show top 6 by default
  )
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const width = 600
  const height = 280
  const padding = { top: 30, right: 30, bottom: 40, left: 30 }

  const streamData = useMemo(() => {
    if (!data || !data.layers || !data.periods) return { layers: [], maxTotal: 0 }

    const filteredLayers = data.layers.filter(l => visibleCategories.has(l.category))

    if (filteredLayers.length === 0) return { layers: [], maxTotal: 0 }

    const periods = data.periods.length
    const stackedData: number[][] = []

    for (let i = 0; i < periods; i++) {
      const values = filteredLayers.map(l => l.values[i])
      const total = values.reduce((sum, v) => sum + v, 0)

      let baseline = -total / 2
      const stack: number[] = []

      for (const value of values) {
        stack.push(baseline)
        baseline += value
      }

      stackedData.push(stack)
    }

    const maxTotal = Math.max(...data.periods.map((_, i) =>
      filteredLayers.reduce((sum, l) => sum + l.values[i], 0)
    ))

    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom
    const stepX = chartWidth / (periods - 1)

    const layers = filteredLayers.map((layer, layerIndex) => {
      const points: Array<{ x: number; y0: number; y1: number }> = []

      for (let i = 0; i < periods; i++) {
        const x = padding.left + i * stepX
        const baseline = stackedData[i][layerIndex] || 0
        const value = layer.values[i] || 0

        // Avoid division by zero
        const scale = maxTotal > 0 ? chartHeight * 0.7 / maxTotal : 0
        const y0 = padding.top + chartHeight / 2 + baseline * scale
        const y1 = padding.top + chartHeight / 2 + (baseline + value) * scale

        points.push({ x, y0, y1 })
      }

      // Build top edge (left to right)
      const p0 = points[0]
      if (!p0 || isNaN(p0.x) || isNaN(p0.y1)) {
        return { ...layer, path: '', points: [] }
      }

      let path = `M ${p0.x.toFixed(2)},${p0.y1.toFixed(2)}`

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        if (!curr || isNaN(curr.x) || isNaN(curr.y1) || isNaN(prev.x) || isNaN(prev.y1)) continue

        const cpX = (prev.x + curr.x) / 2
        path += ` C ${cpX.toFixed(2)},${prev.y1.toFixed(2)} ${cpX.toFixed(2)},${curr.y1.toFixed(2)} ${curr.x.toFixed(2)},${curr.y1.toFixed(2)}`
      }

      // Connect to bottom edge
      const pLast = points[points.length - 1]
      if (pLast && !isNaN(pLast.x) && !isNaN(pLast.y0)) {
        path += ` L ${pLast.x.toFixed(2)},${pLast.y0.toFixed(2)}`
      }

      // Build bottom edge (right to left)
      for (let i = points.length - 2; i >= 0; i--) {
        const prev = points[i + 1]
        const curr = points[i]
        if (!curr || !prev || isNaN(curr.x) || isNaN(curr.y0) || isNaN(prev.x) || isNaN(prev.y0)) continue

        const cpX = (prev.x + curr.x) / 2
        path += ` C ${cpX.toFixed(2)},${prev.y0.toFixed(2)} ${cpX.toFixed(2)},${curr.y0.toFixed(2)} ${curr.x.toFixed(2)},${curr.y0.toFixed(2)}`
      }

      // Close path
      const fullPath = `${path} Z`

      return { ...layer, path: fullPath, points }
    })

    return { layers, maxTotal }
  }, [data, visibleCategories, width, height, padding.top, padding.right, padding.bottom, padding.left])

  const toggleCategory = (category: string) => {
    setVisibleCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        if (newSet.size > 1) newSet.delete(category) // Keep at least one visible
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  console.log('[CategoryRiverChart] Received data:', data)
  console.log('[CategoryRiverChart] Layers:', data?.layers?.length)
  console.log('[CategoryRiverChart] Periods:', data?.periods?.length)

  // Validation
  if (!data || !data.layers || data.layers.length === 0 || !data.periods || data.periods.length === 0) {
    console.log('[CategoryRiverChart] Data validation failed!')
    return (
      <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <span className="text-blue-400">🌊</span> Category Flow
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
          <span className="text-blue-400">🌊</span> Category Flow
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Spending trends over time</p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <g>
          <AnimatePresence>
            {streamData.layers.map((layer, index) => (
              <motion.path
                key={layer.category}
                d={layer.path}
                fill={layer.color}
                fillOpacity={hoveredIndex !== null && hoveredIndex !== index ? 0.15 : 0.5}
                stroke={layer.color}
                strokeWidth="1.5"
                strokeOpacity={hoveredIndex === index ? 0.8 : 0}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  filter: hoveredIndex === index ? 'drop-shadow(0 0 4px rgba(255,255,255,0.2))' : 'none'
                }}
              />
            ))}
          </AnimatePresence>
        </g>

        <g>
          {data.periods.map((period, index) => {
            const x = padding.left + ((width - padding.left - padding.right) / (data.periods.length - 1)) * index
            const shouldShow = index % 2 === 0 || index === data.periods.length - 1

            if (!shouldShow) return null

            const date = new Date(period + '-01')
            const label = date.toLocaleDateString('en-US', { month: 'short' })

            return (
              <text
                key={period}
                x={x}
                y={height - 15}
                textAnchor="middle"
                className="text-[9px] fill-gray-600"
              >
                {label}
              </text>
            )
          })}
        </g>
      </svg>

      {/* Category toggles - compact chips */}
      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-gray-800/50">
        {data.layers.slice(0, 8).map(layer => {
          const isVisible = visibleCategories.has(layer.category)
          const total = layer.values.reduce((sum, v) => sum + v, 0)

          return (
            <button
              key={layer.category}
              onClick={() => toggleCategory(layer.category)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                isVisible
                  ? 'border border-white/10 bg-white/5 text-gray-300'
                  : 'border border-gray-800 bg-transparent text-gray-600'
              }`}
            >
              <div
                className="w-2 h-2 rounded-sm"
                style={{
                  backgroundColor: isVisible ? layer.color : 'rgb(75, 85, 99)',
                  opacity: isVisible ? 1 : 0.4
                }}
              />
              <span>{layer.category}</span>
              <span className="text-gray-600 text-[9px]">
                ${total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
