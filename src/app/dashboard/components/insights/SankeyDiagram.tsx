'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SankeyData } from '@/types/insights'

interface SankeyDiagramProps {
  data: SankeyData
  isInView?: boolean
}

export function SankeyDiagram({ data, isInView = true }: SankeyDiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  console.log('[SankeyDiagram] Received data:', data)
  console.log('[SankeyDiagram] Nodes:', data?.nodes?.length)
  console.log('[SankeyDiagram] Links:', data?.links?.length)

  // Validation
  if (!data || !data.nodes || !data.links || data.nodes.length === 0) {
    console.log('[SankeyDiagram] Data validation failed!')
    return (
      <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
              <span className="text-purple-400">💸</span> Money Flow
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">No data available</p>
          </div>
        </div>
      </div>
    )
  }

  // Compact layout
  const width = 600
  const height = 350
  const nodeWidth = 12
  const padding = { top: 30, right: 30, bottom: 30, left: 30 }

  const layout = useMemo(() => {
    const nodes = data.nodes
    const links = data.links

    const incomeNodes = nodes.filter(n => n.type === 'income')
    const categoryNodes = nodes.filter(n => n.type === 'category').slice(0, 6) // Top 6
    const merchantNodes = nodes.filter(n => n.type === 'merchant').slice(0, 12) // Top 12

    const columns = [
      padding.left,
      width / 2 - nodeWidth / 2,
      width - padding.right - nodeWidth
    ]

    const totalHeight = height - padding.top - padding.bottom

    const positionNodes = (nodeList: typeof nodes, columnX: number) => {
      const totalValue = nodeList.reduce((sum, n) => sum + n.value, 0)
      let currentY = padding.top

      return nodeList.map(node => {
        const nodeHeight = Math.max((node.value / totalValue) * totalHeight * 0.8, 15)
        const y = currentY
        currentY += nodeHeight + 8

        return { ...node, x: columnX, y, height: nodeHeight }
      })
    }

    const positioned = [
      ...positionNodes(incomeNodes, columns[0]),
      ...positionNodes(categoryNodes, columns[1]),
      ...positionNodes(merchantNodes, columns[2])
    ]

    const linkPaths = links
      .filter(link => {
        const source = positioned.find(n => n.id === link.source)
        const target = positioned.find(n => n.id === link.target)
        return source && target
      })
      .map(link => {
        const source = positioned.find(n => n.id === link.source)!
        const target = positioned.find(n => n.id === link.target)!

        const sourceX = source.x + nodeWidth
        const sourceY = source.y + source.height / 2
        const targetX = target.x
        const targetY = target.y + target.height / 2

        const midX = (sourceX + targetX) / 2
        const path = `M ${sourceX} ${sourceY} C ${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`

        const maxValue = Math.max(...links.map(l => l.value))
        const strokeWidth = Math.max(1, (link.value / maxValue) * 20)

        return { ...link, path, strokeWidth, source, target }
      })

    return { nodes: positioned, links: linkPaths }
  }, [data, width, height])

  const filteredLayout = useMemo(() => {
    if (!selectedCategory) return layout

    const relevantNodeIds = new Set([
      'income',
      selectedCategory,
      ...layout.links
        .filter(l => l?.source?.id === selectedCategory)
        .map(l => l?.target?.id)
        .filter(Boolean)
    ])

    return {
      nodes: layout.nodes.filter(n => relevantNodeIds.has(n.id)),
      links: layout.links.filter(l =>
        l?.source?.id === 'income' && l?.target?.id === selectedCategory ||
        l?.source?.id === selectedCategory
      )
    }
  }, [layout, selectedCategory])

  return (
    <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <span className="text-purple-400">💸</span> Money Flow
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Where your income goes</p>
        </div>
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded border border-purple-500/30 hover:border-purple-500/50"
          >
            Reset
          </button>
        )}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          {filteredLayout.links.map((link, i) => (
            <linearGradient key={`gradient-${i}`} id={`link-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={link?.source?.color || '#666'} stopOpacity="0.4" />
              <stop offset="100%" stopColor={link?.target?.color || '#666'} stopOpacity="0.2" />
            </linearGradient>
          ))}
        </defs>

        <g>
          <AnimatePresence>
            {filteredLayout.links.map((link, i) => (
              <motion.path
                key={`link-${i}`}
                d={link?.path}
                stroke={`url(#link-gradient-${i})`}
                strokeWidth={link?.strokeWidth}
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={isInView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.8, delay: i * 0.03 }}
                style={{
                  opacity: hoveredNode && (link?.source?.id !== hoveredNode && link?.target?.id !== hoveredNode) ? 0.15 : 1
                }}
              />
            ))}
          </AnimatePresence>
        </g>

        <g>
          {filteredLayout.nodes.map((node, i) => (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              onClick={() => node.type === 'category' && setSelectedCategory(selectedCategory === node.id ? null : node.id)}
              className={node.type === 'category' ? 'cursor-pointer' : ''}
            >
              <rect
                x={node.x}
                y={node.y}
                width={nodeWidth}
                height={node.height}
                fill={node.color || '#666'}
                rx="3"
                style={{
                  filter: hoveredNode === node.id ? 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' : 'none'
                }}
              />
              <text
                x={node.type === 'income' ? node.x - 6 : node.x + nodeWidth + 6}
                y={node.y + node.height / 2}
                textAnchor={node.type === 'income' ? 'end' : 'start'}
                alignmentBaseline="middle"
                className="text-[9px] fill-gray-400 font-medium"
                style={{ pointerEvents: 'none' }}
              >
                {node.name.length > 15 ? node.name.substring(0, 13) + '...' : node.name}
              </text>
            </motion.g>
          ))}
        </g>

        <text x={padding.left} y={15} className="text-[9px] fill-gray-500 font-medium" textAnchor="start">Income</text>
        <text x={width / 2} y={15} className="text-[9px] fill-gray-500 font-medium" textAnchor="middle">Categories</text>
        <text x={width - padding.right} y={15} className="text-[9px] fill-gray-500 font-medium" textAnchor="end">Merchants</text>
      </svg>

      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-3 pt-3 border-t border-gray-800/50">
        <span>Click categories to focus</span>
        <span>${data.totalSpending.toLocaleString(undefined, { maximumFractionDigits: 0 })} spent</span>
      </div>
    </div>
  )
}
