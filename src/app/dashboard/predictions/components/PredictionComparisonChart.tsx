'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface PredictionComparisonChartProps {
  historicalData: Array<{
    month: string
    totalSpending: number
  }>
  predictedAmount: number
  nextMonth: string
  isInView?: boolean
}

export function PredictionComparisonChart({
  historicalData,
  predictedAmount,
  nextMonth,
  isInView = true
}: PredictionComparisonChartProps) {
  const chartData = useMemo(() => {
    const historical = historicalData.map(d => ({
      month: d.month,
      spending: d.totalSpending,
      type: 'historical' as const
    }))

    const predicted = {
      month: nextMonth,
      spending: predictedAmount,
      type: 'predicted' as const
    }

    return [...historical, predicted]
  }, [historicalData, predictedAmount, nextMonth])

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map(d => d.spending))
  }, [chartData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }

  return (
    <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-50 mb-6">Historical vs Predicted Spending</h3>

      <div className="space-y-2">
        {chartData.map((item, index) => {
          const percentage = (item.spending / maxValue) * 100
          const isPredicted = item.type === 'predicted'

          return (
            <motion.div
              key={item.month}
              className="space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <div className="flex justify-between items-baseline">
                <span className={`text-sm font-medium ${isPredicted ? 'text-primary' : 'text-gray-300'}`}>
                  {formatMonth(item.month)}
                  {isPredicted && (
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                      Predicted
                    </span>
                  )}
                </span>
                <span className={`text-sm font-semibold ${isPredicted ? 'text-primary' : 'text-gray-100'}`}>
                  {formatCurrency(item.spending)}
                </span>
              </div>

              <div className="relative h-8 bg-[rgb(25,25,25)] rounded-lg overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 ${
                    isPredicted
                      ? 'bg-gradient-to-r from-primary to-purple-600'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700'
                  } rounded-lg`}
                  initial={{ width: 0 }}
                  animate={isInView ? { width: `${percentage}%` } : { width: 0 }}
                  transition={{ delay: index * 0.05 + 0.2, duration: 0.8, ease: 'easeOut' }}
                >
                  {isPredicted && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{
                        repeat: Infinity,
                        duration: 2,
                        ease: 'linear',
                        delay: index * 0.05 + 1
                      }}
                    />
                  )}
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Trend indicator */}
      <motion.div
        className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20"
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ delay: chartData.length * 0.05 + 0.5, duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-gray-300">
            {historicalData.length > 0 && (
              (() => {
                const avgHistorical = historicalData.reduce((sum, d) => sum + d.totalSpending, 0) / historicalData.length
                const diff = ((predictedAmount - avgHistorical) / avgHistorical) * 100

                return diff > 0 ? (
                  <span>Predicted spending is <strong>{diff.toFixed(1)}% higher</strong> than your average</span>
                ) : (
                  <span>Predicted spending is <strong>{Math.abs(diff).toFixed(1)}% lower</strong> than your average</span>
                )
              })()
            )}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
