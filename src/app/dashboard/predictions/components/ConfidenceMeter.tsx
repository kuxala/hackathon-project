'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

interface ConfidenceMeterProps {
  confidence: number // 0-100
  basedOnMonths: number
  isInView?: boolean
}

export function ConfidenceMeter({
  confidence,
  basedOnMonths,
  isInView = true
}: ConfidenceMeterProps) {
  const confidenceLevel = useMemo(() => {
    if (confidence >= 75) return { text: 'High Confidence', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' }
    if (confidence >= 50) return { text: 'Medium Confidence', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' }
    return { text: 'Low Confidence', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
  }, [confidence])

  const getColorFromPercentage = (percentage: number) => {
    if (percentage >= 75) return '#10b981' // green
    if (percentage >= 50) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const radius = 80
  const strokeWidth = 12
  const normalizedRadius = radius - strokeWidth / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (confidence / 100) * circumference

  return (
    <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-6">
      <h3 className="text-xl font-semibold text-gray-50 mb-6">Prediction Confidence</h3>

      <div className="flex flex-col items-center">
        {/* Circular progress meter */}
        <div className="relative">
          <svg
            height={radius * 2}
            width={radius * 2}
            className="transform -rotate-90"
          >
            <defs>
              <linearGradient id="confidence-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={getColorFromPercentage(confidence)} stopOpacity="0.3" />
                <stop offset="100%" stopColor={getColorFromPercentage(confidence)} stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Background circle */}
            <circle
              stroke="#e5e7eb"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />

            {/* Progress circle */}
            <motion.circle
              stroke="url(#confidence-gradient)"
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeLinecap="round"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              initial={{ strokeDashoffset: circumference }}
              animate={isInView ? { strokeDashoffset } : { strokeDashoffset: circumference }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
            />
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="text-5xl font-bold"
              style={{ color: getColorFromPercentage(confidence) }}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ duration: 0.5, delay: 0.8, type: 'spring', stiffness: 200 }}
            >
              {confidence}%
            </motion.div>
            <motion.div
              className="text-sm text-gray-400 mt-1"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
            >
              Confidence
            </motion.div>
          </div>
        </div>

        {/* Confidence level badge */}
        <motion.div
          className={`mt-6 px-4 py-2 rounded-full ${confidenceLevel.bg} border ${confidenceLevel.border}`}
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4, delay: 1.2 }}
        >
          <span className={`text-sm font-semibold ${confidenceLevel.color}`}>
            {confidenceLevel.text}
          </span>
        </motion.div>

        {/* Data quality indicators */}
        <motion.div
          className="mt-6 w-full space-y-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 1.4 }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Data Quality</span>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2 h-6 rounded ${
                    i < Math.floor(basedOnMonths / 3) ? 'bg-primary' : 'bg-[rgb(30,30,30)]'
                  }`}
                  initial={{ scaleY: 0 }}
                  animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
                  transition={{ duration: 0.3, delay: 1.6 + i * 0.05 }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Months Analyzed</span>
            <span className="font-semibold text-gray-100">{basedOnMonths}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-300">Accuracy Range</span>
            <span className="font-semibold text-gray-100">±{100 - confidence}%</span>
          </div>
        </motion.div>

        {/* Info message */}
        <motion.div
          className="mt-6 p-4 bg-[rgb(20,20,20)] rounded-lg border border-[rgb(35,35,35)] w-full"
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.4, delay: 1.8 }}
        >
          <p className="text-xs text-gray-400 text-center">
            {confidence >= 75 ? (
              <>The AI model has high confidence in this prediction based on consistent spending patterns.</>
            ) : confidence >= 50 ? (
              <>The prediction is moderately confident. Consider reviewing category-specific insights for more accuracy.</>
            ) : (
              <>Limited historical data may affect accuracy. Upload more statements for better predictions.</>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  )
}
