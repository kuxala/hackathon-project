'use client'

import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { calculateBarPercentages, getTailwindColorClass, normalizeAmount } from '@/utils/chartHelpers'
import type { CategoryBreakdown } from '@/types/database'

interface LoanDebtChartProps {
  value: number
  percentageChange: number
  isInView: boolean
  data?: CategoryBreakdown
}

interface CategoryItem {
  name: string
  height: number
  color: string
  amount: number
  percentage: number
}

const defaultData: CategoryItem[] = [
  { name: 'Mortgage', height: 10, color: 'bg-emerald-500', amount: 2500, percentage: 10 },
  { name: 'Car Loan', height: 25, color: 'bg-green-500', amount: 6250, percentage: 25 },
  { name: 'Credit Card', height: 75, color: 'bg-rose-500', amount: 18750, percentage: 45 },
  { name: 'Student Loan', height: 40, color: 'bg-amber-500', amount: 10000, percentage: 20 }
]

export function LoanDebtChart({ value, percentageChange, isInView, data }: LoanDebtChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const totalValue = normalizeAmount(value)

  const displayValue = useCountUp({
    end: isInView ? totalValue : 0,
    start: 0,
    duration: 1000,
    decimals: 0,
    prefix: '₾',
    suffix: ''
  })

  // Convert data to chart format
  const chartData = useMemo(() => {
    if (!data || !data.categories || data.categories.length === 0) {
      return defaultData
    }

    const normalizedAmounts = data.categories.map(cat => normalizeAmount(cat.amount))
    const totalAmount = normalizedAmounts.reduce((sum, value) => sum + value, 0)

    // Calculate visual heights based on amounts
    const barHeights = calculateBarPercentages(normalizedAmounts)

    const result = data.categories.map((cat, idx) => {
      const amount = normalizedAmounts[idx]
      const providedPercentage = typeof cat.percentage === 'number' && Number.isFinite(cat.percentage)
        ? cat.percentage
        : undefined
      const derivedPercentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      const percentage = providedPercentage ?? derivedPercentage

      return {
        name: cat.name,
        amount,
        percentage,
        // Always use calculated bar heights for visual representation
        height: Math.min(Math.max(barHeights[idx], 6), 100),
        color: getTailwindColorClass(cat.color, 'bg')
      }
    })

    console.log('📊 Category Chart Data:', result)
    return result
  }, [data])

  const labelVariants = {
    hidden: {
      opacity: 0,
      y: 10
    },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 1.0 + custom * 0.1,
        duration: 0.4
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] p-6 shadow-sm lg:col-span-2">
      <div>
        <p className="text-base font-medium text-gray-200">Category Spending Breakdown</p>
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
            Current
          </motion.p>
          <motion.p
            className="text-sm font-medium text-red-500"
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: 1.2, duration: 0.4, type: 'spring', stiffness: 200 }}
          >
            {percentageChange}%
          </motion.p>
        </div>
      </div>

      <div className="relative grid h-[200px] items-end gap-4 px-2 pt-4" style={{ gridTemplateColumns: `repeat(${chartData.length}, 1fr)` }}>
        {chartData.map((category, index) => (
          <div
            key={category.name}
            className="flex h-full flex-col items-center justify-end gap-2"
            onMouseEnter={() => setHoveredBar(index)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <div className="relative w-full flex items-end justify-center h-full">
              <motion.div
                className={`w-full rounded-t ${category.color} cursor-pointer relative`}
                initial={{ height: '0%', opacity: 0.3 }}
                animate={isInView ? {
                  height: `${category.height}%`,
                  opacity: 1,
                  transition: {
                    height: {
                      delay: 0.6 + index * 0.1,
                      duration: 0.8,
                      ease: [0.34, 1.56, 0.64, 1]
                    },
                    opacity: {
                      delay: 0.6 + index * 0.1,
                      duration: 0.4
                    }
                  }
                } : { height: '0%', opacity: 0.3 }}
                whileHover={{
                  scaleX: 1.05,
                  scaleY: 1.02,
                  transition: { duration: 0.2 }
                }}
                style={{
                  filter: hoveredBar === index
                    ? 'drop-shadow(0 4px 12px rgba(18, 161, 89, 0.4))'
                    : hoveredBar !== null
                    ? 'brightness(0.6)'
                    : 'none',
                  transformOrigin: 'bottom center',
                  minHeight: '4px'
                }}
              >
                {/* Empty content to ensure visibility */}
                <div className="w-full h-full" />
              </motion.div>

              {/* Tooltip */}
              {hoveredBar === index && (
                <motion.div
                  className="absolute bottom-full mb-2 bg-[rgb(25,25,25)] border border-[rgb(40,40,40)] rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-100 font-medium">₾{category.amount.toLocaleString()}</span>
                    <span className="text-gray-400">
                      {category.percentage.toFixed(1)}% of total
                    </span>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
                    <div className="w-2 h-2 rotate-45 bg-[rgb(25,25,25)] border-r border-b border-[rgb(40,40,40)]" />
                  </div>
                </motion.div>
              )}

              {/* Risk pulse for high spending categories */}
              {category.color.includes('rose') && hoveredBar === null && (
                <motion.div
                  className="absolute inset-0 rounded-t"
                  style={{
                    background: 'radial-gradient(circle, rgba(251, 113, 133, 0.4) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }}
                  animate={{
                    opacity: [0.6, 0, 0.6],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              )}
            </div>

            <motion.p
              className="text-xs font-medium text-gray-400 text-center"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={labelVariants}
              custom={index}
            >
              {category.name}
            </motion.p>
          </div>
        ))}
      </div>
    </div>
  )
}
