'use client'

import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import { calculateBarPercentages } from '@/utils/chartHelpers'
import type { MonthlyTrendData } from '@/types/database'

interface MonthlySpendingChartProps {
  value: number
  percentageChange: number
  isInView: boolean
  data?: MonthlyTrendData
}

interface MonthData {
  name: string
  height: string
  color: string
  amount: number
}

const defaultData: MonthData[] = [
  { name: 'Jan', height: '60%', color: 'bg-blue-500', amount: 2500 },
  { name: 'Feb', height: '45%', color: 'bg-blue-500', amount: 1875 },
  { name: 'Mar', height: '70%', color: 'bg-blue-500', amount: 2917 },
  { name: 'Apr', height: '55%', color: 'bg-blue-500', amount: 2292 }
]

export function MonthlySpendingChart({ value, percentageChange, isInView, data }: MonthlySpendingChartProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)

  const displayValue = useCountUp({
    end: isInView ? value : 0,
    start: 0,
    duration: 1000,
    decimals: 0,
    prefix: '$',
    suffix: ''
  })

  // Convert data to chart format - show last 6 months
  const chartData = useMemo(() => {
    if (!data || !data.months || data.months.length === 0) {
      return defaultData
    }

    // Get last 6 months
    const lastSixMonths = data.months.slice(-6)
    const lastSixSpending = data.spending.slice(-6)

    const heights = calculateBarPercentages(lastSixSpending)

    return lastSixMonths.map((month, idx) => {
      const monthName = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' })
      const amount = lastSixSpending[idx]

      // Color based on amount
      let color = 'bg-blue-500'
      if (amount > value * 0.15) color = 'bg-rose-500'
      else if (amount > value * 0.08) color = 'bg-amber-500'
      else color = 'bg-emerald-500'

      return {
        name: monthName,
        amount,
        height: heights[idx],
        color
      }
    })
  }, [data, value])

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
        <p className="text-base font-medium text-gray-200">Monthly Spending</p>
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
            Last 6 Months
          </motion.p>
          <motion.p
            className={`text-sm font-medium ${percentageChange > 0 ? 'text-red-500' : 'text-green-500'}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: 1.2, duration: 0.4, type: 'spring', stiffness: 200 }}
          >
            {percentageChange > 0 ? '+' : ''}{percentageChange}%
          </motion.p>
        </div>
      </div>

      <div className="relative grid items-end gap-4 px-2 pt-4" style={{ gridTemplateColumns: `repeat(${chartData.length}, 1fr)`, height: '240px' }}>
        {chartData.map((month, index) => (
          <div
            key={month.name}
            className="flex h-full flex-col items-center justify-end gap-2"
            onMouseEnter={() => setHoveredBar(index)}
            onMouseLeave={() => setHoveredBar(null)}
          >
            <div className="relative flex h-full w-full items-end justify-center">
              <motion.div
                className={`w-full rounded-t ${month.color} cursor-pointer relative`}
                initial={{ height: '0%', opacity: 0.3 }}
                animate={isInView ? {
                  height: month.height,
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
                    <span className="text-gray-100 font-medium">${month.amount.toLocaleString()}</span>
                    <span className="text-gray-400">Spent in {month.name}</span>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
                    <div className="w-2 h-2 rotate-45 bg-[rgb(25,25,25)] border-r border-b border-[rgb(40,40,40)]" />
                  </div>
                </motion.div>
              )}
            </div>

            <motion.p
              className="text-xs font-medium text-gray-400 text-center"
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              variants={labelVariants}
              custom={index}
            >
              {month.name}
            </motion.p>
          </div>
        ))}
      </div>
    </div>
  )
}
