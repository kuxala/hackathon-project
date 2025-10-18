'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { convertToSmoothPath, createAreaPath } from '@/utils/chartHelpers'
import type { MonthlyTrendData } from '@/types/database'

interface SpendingIncomeChartProps {
  value: number
  percentageChange: number
  isInView: boolean
  data?: MonthlyTrendData
}

export function SpendingIncomeChart({ value, percentageChange, isInView, data }: SpendingIncomeChartProps) {
  const [showIncome, setShowIncome] = useState(true)
  const [showSpending, setShowSpending] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; income: number; spending: number } | null>(null)

  const displayValue = useCountUp({
    end: isInView ? value : 0,
    start: 0,
    duration: 1000,
    decimals: 0,
    prefix: '$',
    suffix: ''
  })

  // Generate SVG paths from real data
  const { incomePath, spendingPath, surplusPath } = useMemo(() => {
    if (!data || !data.income || !data.spending) {
      // Fallback to hardcoded paths
      return {
        incomePath: "M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25",
        spendingPath: "M0 130 C 18.1538 130 18.1538 80 36.3077 80 C 54.4615 80 54.4615 100 72.6154 100 C 90.7692 100 90.7692 60 108.923 60 C 127.077 60 127.077 90 145.231 90 C 163.385 90 163.385 50 181.538 50 C 199.692 50 199.692 80 217.846 80 C 236 80 236 110 254.154 110 C 272.308 110 272.308 70 290.462 70 C 308.615 70 308.615 95 326.769 95 C 344.923 95 344.923 65 363.077 65 C 381.231 65 381.231 105 399.385 105 C 417.538 105 417.538 75 435.692 75 C 453.846 75 453.846 115 472 115",
        surplusPath: "M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25 L 472 115 C 453.846 115 453.846 75 435.692 75 C 417.538 75 417.538 105 399.385 105 C 381.231 105 381.231 65 363.077 65 C 344.923 65 344.923 95 326.769 95 C 308.615 95 308.615 70 290.462 70 C 272.308 70 272.308 110 254.154 110 C 236 110 236 80 217.846 80 C 199.692 80 199.692 50 181.538 50 C 163.385 50 163.385 90 145.231 90 C 127.077 90 127.077 60 108.923 60 C 90.7692 60 90.7692 100 72.6154 100 C 54.4615 100 54.4615 80 36.3077 80 C 18.1538 80 18.1538 130 0 130 Z"
      }
    }

    const incomePath = convertToSmoothPath(data.income, 472, 150)
    const spendingPath = convertToSmoothPath(data.spending, 472, 150)
    const surplusPath = createAreaPath(incomePath, 472, 150)

    return { incomePath, spendingPath, surplusPath }
  }, [data])

  // SVG path length for animation
  const pathVariants: any = {
    hidden: {
      pathLength: 0,
      opacity: 0
    },
    visible: (custom: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          delay: custom * 0.2,
          duration: 1.2,
          ease: [0.12, 0, 0.39, 0]
        },
        opacity: {
          delay: custom * 0.2,
          duration: 0.3
        }
      }
    })
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()

    // Get mouse position relative to SVG element
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top

    // Map to SVG viewBox coordinates (viewBox="0 0 472 150")
    const x = (clientX / rect.width) * 472
    const y = (clientY / rect.height) * 150

    // Calculate approximate values based on position
    const income = Math.round(5000 + (x / 472) * 7500)
    const spending = Math.round(4000 + (x / 472) * 6000)

    setHoveredPoint({ x, y, income, spending })
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] p-6 shadow-sm lg:col-span-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-gray-200">Spending vs. Income</p>
          <motion.p
            className="text-3xl font-bold tracking-tight text-gray-50"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {displayValue}
          </motion.p>
          <div className="mt-1 flex items-center gap-1.5">
            <motion.p
              className="text-sm text-gray-400"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              Last 12 Months
            </motion.p>
            <motion.p
              className="text-sm font-medium text-green-500"
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ delay: 1.2, duration: 0.4, type: 'spring', stiffness: 200 }}
            >
              {percentageChange > 0 ? '+' : ''}{percentageChange}%
            </motion.p>
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={() => setShowIncome(!showIncome)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showIncome
                ? 'bg-[#12a159]/20 text-[#12a159] border border-[#12a159]/30'
                : 'bg-[rgb(30,30,30)] text-gray-500 hover:bg-[rgb(35,35,35)] border border-transparent'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={`w-2 h-2 rounded-full ${showIncome ? 'bg-[#12a159]' : 'bg-gray-600'}`} />
            Income
          </motion.button>
          <motion.button
            onClick={() => setShowSpending(!showSpending)}
            className={`rounded px-3 py-1 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showSpending
                ? 'bg-[#a78bfa]/20 text-[#a78bfa] border border-[#a78bfa]/30'
                : 'bg-[rgb(30,30,30)] text-gray-500 hover:bg-[rgb(35,35,35)] border border-transparent'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className={`w-2 h-2 rounded-full ${showSpending ? 'bg-[#a78bfa]' : 'bg-gray-600'}`} />
            Spending
          </motion.button>
        </div>
      </div>

      <div className="relative h-[240px] w-full">
        <motion.svg
          fill="none"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 472 150"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          className="cursor-crosshair"
        >
          <defs>
            {/* Gradient for surplus area (Income > Spending) */}
            <linearGradient id="surplus-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#12a159" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#12a159" stopOpacity="0.05" />
            </linearGradient>
            {/* Gradient for deficit area (Spending > Income) */}
            <linearGradient id="deficit-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Area fill between income and spending - shows surplus/deficit */}
          {showIncome && showSpending && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              {/* This creates a filled area between the two lines */}
              <path
                d={surplusPath}
                fill="url(#surplus-gradient)"
                opacity="0.6"
              />
            </motion.g>
          )}

          {/* Income Line */}
          <AnimatePresence>
            {showIncome && (
              <motion.path
                d={incomePath}
                stroke="#12a159"
                strokeLinecap="round"
                strokeWidth="3"
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                exit={{ pathLength: 0, opacity: 0 }}
                custom={0}
                variants={pathVariants}
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(18, 161, 89, 0.5))',
                }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>

          {/* Spending Line */}
          <AnimatePresence>
            {showSpending && (
              <motion.path
                d={spendingPath}
                stroke="#a78bfa"
                strokeLinecap="round"
                strokeWidth="3"
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                exit={{ pathLength: 0, opacity: 0 }}
                custom={1}
                variants={pathVariants}
                style={{
                  filter: 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.5))',
                }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>

          {/* Hover indicator */}
          {hoveredPoint && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <line
                x1={hoveredPoint.x}
                y1="0"
                x2={hoveredPoint.x}
                y2="150"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            </motion.g>
          )}
        </motion.svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <motion.div
            className="absolute pointer-events-none bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded-lg px-3 py-2 text-xs"
            style={{
              left: hoveredPoint.x,
              top: hoveredPoint.y - 80
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col gap-1 whitespace-nowrap">
              {showIncome && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#12a159]" />
                  <span className="text-gray-400">Income:</span>
                  <span className="text-gray-100 font-medium">${hoveredPoint.income.toLocaleString()}</span>
                </div>
              )}
              {showSpending && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#a78bfa]" />
                  <span className="text-gray-400">Spending:</span>
                  <span className="text-gray-100 font-medium">${hoveredPoint.spending.toLocaleString()}</span>
                </div>
              )}
              {showIncome && showSpending && (
                <div className="flex items-center gap-2 pt-1 border-t border-gray-700 mt-1">
                  <span className="text-gray-400">Difference:</span>
                  <span className={`font-medium ${hoveredPoint.income > hoveredPoint.spending ? 'text-green-500' : 'text-red-500'}`}>
                    {hoveredPoint.income > hoveredPoint.spending ? '+' : '-'}${Math.abs(hoveredPoint.income - hoveredPoint.spending).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
              <div className="w-2 h-2 rotate-45 bg-[rgb(25,25,25)] border-r border-b border-[rgb(40,40,40)]" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
