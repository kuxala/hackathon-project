'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface CategoryPrediction {
  category: string
  amount: number
  confidence: 'high' | 'medium' | 'low'
}

interface CategoryTrendChartProps {
  predictions: CategoryPrediction[]
  historicalData: Array<{
    month: string
    categories: { category: string; amount: number }[]
  }>
  isInView?: boolean
}

export function CategoryTrendChart({
  predictions,
  historicalData,
  isInView = true
}: CategoryTrendChartProps) {
  const categoryTrends = useMemo(() => {
    // Get unique categories
    const categories = new Set<string>()
    predictions.forEach(p => categories.add(p.category))

    return Array.from(categories).map(category => {
      // Get historical amounts for this category
      const historicalAmounts = historicalData.map(month => {
        const categoryData = month.categories.find(c => c.category === category)
        return {
          month: month.month,
          amount: categoryData?.amount || 0
        }
      })

      // Get predicted amount
      const predicted = predictions.find(p => p.category === category)

      // Calculate trend
      const recentMonths = historicalAmounts.slice(-3)
      const avgRecent = recentMonths.reduce((sum, d) => sum + d.amount, 0) / recentMonths.length
      const trend = predicted ? ((predicted.amount - avgRecent) / avgRecent) * 100 : 0

      return {
        category,
        historicalAmounts,
        predictedAmount: predicted?.amount || 0,
        confidence: predicted?.confidence || 'low',
        trend
      }
    }).sort((a, b) => b.predictedAmount - a.predictedAmount)
  }, [predictions, historicalData])

  const maxAmount = useMemo(() => {
    let max = 0
    categoryTrends.forEach(cat => {
      const historicalMax = Math.max(...cat.historicalAmounts.map(h => h.amount))
      max = Math.max(max, historicalMax, cat.predictedAmount)
    })
    return max
  }, [categoryTrends])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 5) {
      return (
        <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      )
    } else if (trend < -5) {
      return (
        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    }
    return (
      <svg className="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-50 mb-6">Category Trends</h3>

      <div className="space-y-6">
        {categoryTrends.slice(0, 6).map((category, index) => (
          <motion.div
            key={category.category}
            className="space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            {/* Category header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-100">{category.category}</h4>
                <div className={`w-2 h-2 rounded-full ${getConfidenceColor(category.confidence)}`} />
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(category.trend)}
                <span className={`text-sm font-medium ${
                  category.trend > 5 ? 'text-red-600' :
                  category.trend < -5 ? 'text-green-600' :
                  'text-gray-600'
                }`}>
                  {category.trend > 0 ? '+' : ''}{category.trend.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Mini sparkline chart */}
            <div className="relative h-12">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 400 48"
                preserveAspectRatio="none"
                className="overflow-visible"
              >
                <defs>
                  <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Generate path for historical data */}
                {(() => {
                  const points = category.historicalAmounts.map((h, i) => {
                    const x = (i / (category.historicalAmounts.length - 1)) * 320
                    const y = 48 - (h.amount / maxAmount) * 40
                    return { x, y, amount: h.amount }
                  })

                  // Add predicted point
                  const predictedX = 370
                  const predictedY = 48 - (category.predictedAmount / maxAmount) * 40
                  const allPoints = [...points, { x: predictedX, y: predictedY, amount: category.predictedAmount }]

                  // Create path
                  const pathD = allPoints.map((p, i) =>
                    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
                  ).join(' ')

                  // Create area path
                  const areaD = `${pathD} L ${allPoints[allPoints.length - 1].x} 48 L ${allPoints[0].x} 48 Z`

                  return (
                    <>
                      {/* Area fill */}
                      <motion.path
                        d={areaD}
                        fill={`url(#gradient-${index})`}
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                      />

                      {/* Line */}
                      <motion.path
                        d={pathD}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                        transition={{ delay: index * 0.1 + 0.2, duration: 0.8, ease: 'easeInOut' }}
                      />

                      {/* Predicted point marker */}
                      <motion.circle
                        cx={predictedX}
                        cy={predictedY}
                        r="4"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="2"
                        initial={{ scale: 0 }}
                        animate={isInView ? { scale: 1 } : { scale: 0 }}
                        transition={{ delay: index * 0.1 + 0.9, duration: 0.3, type: 'spring' }}
                      />

                      {/* Dashed line from last historical to predicted */}
                      <motion.line
                        x1={points[points.length - 1].x}
                        y1={points[points.length - 1].y}
                        x2={predictedX}
                        y2={predictedY}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        opacity="0.5"
                        initial={{ pathLength: 0 }}
                        animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
                        transition={{ delay: index * 0.1 + 1, duration: 0.4 }}
                      />
                    </>
                  )
                })()}
              </svg>
            </div>

            {/* Amount display */}
            <div className="flex justify-between items-baseline text-sm">
              <span className="text-gray-400">Predicted:</span>
              <span className="font-bold text-gray-100">{formatCurrency(category.predictedAmount)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
