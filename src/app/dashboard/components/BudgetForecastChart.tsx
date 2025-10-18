'use client'

import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { useCountUp } from '@/hooks/useCountUp'
import type { BudgetData } from '@/types/database'

interface BudgetForecastChartProps {
  value: number
  percentageChange: number
  isInView: boolean
  data?: BudgetData
}

export function BudgetForecastChart({ value, percentageChange, isInView, data }: BudgetForecastChartProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Calculate budget utilization color
  const budgetColor = useMemo(() => {
    if (!data) return '#f472b6' // default pink

    const utilization = data.utilizationPercentage
    if (utilization > 90) return '#ef4444' // red
    if (utilization > 75) return '#f59e0b' // amber
    return '#10b981' // green
  }, [data])

  const displayValue = useCountUp({
    end: isInView ? (data?.forecastEndOfMonth || value) : 0,
    start: 0,
    duration: 1000,
    decimals: 0,
    prefix: '$',
    suffix: ''
  })

  // Path animation variants
  const pathVariants: any = {
    hidden: {
      pathLength: 0,
      opacity: 0
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          delay: 0.3,
          duration: 1.4,
          ease: 'easeInOut'
        },
        opacity: {
          delay: 0.3,
          duration: 0.3
        }
      }
    }
  }

  // Area fill animation
  const areaVariants: any = {
    hidden: {
      clipPath: 'inset(0 100% 0 0)'
    },
    visible: {
      clipPath: 'inset(0 0% 0 0)',
      transition: {
        delay: 1.0,
        duration: 1.4,
        ease: 'easeInOut'
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-primary/20 bg-[rgb(15,15,15)] p-6 shadow-sm lg:col-span-1">
      <div>
        <p className="text-base font-medium text-gray-200">Budget &amp; Forecast</p>
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
            {data ? `${data.utilizationPercentage.toFixed(1)}% of budget used` : 'Next 6 Months'}
          </motion.p>
          <motion.p
            className={`text-sm font-medium ${data && data.utilizationPercentage > 90 ? 'text-red-500' : data && data.utilizationPercentage > 75 ? 'text-amber-500' : 'text-green-500'}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: 1.2, duration: 0.4, type: 'spring', stiffness: 200 }}
          >
            {percentageChange > 0 ? '+' : ''}{percentageChange}%
          </motion.p>
        </div>
      </div>

      <motion.div
        className="h-[200px] w-full relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <svg
          fill="none"
          height="100%"
          preserveAspectRatio="none"
          viewBox="0 0 472 150"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient gradientUnits="userSpaceOnUse" id="paint0_linear_budget" x1="236" x2="236" y1="1" y2="150">
              <stop stopColor={budgetColor} stopOpacity={isHovered ? "0.5" : "0.3"} />
              <stop offset="1" stopColor={budgetColor} stopOpacity="0" />
            </linearGradient>

            {/* Shimmer gradient */}
            <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(244, 114, 182, 0.3)" />
              <stop offset="100%" stopColor="transparent" />
              <animate
                attributeName="x1"
                values="-100%;100%"
                dur="3s"
                repeatCount="1"
                begin={isInView ? "2.5s" : "indefinite"}
              />
              <animate
                attributeName="x2"
                values="0%;200%"
                dur="3s"
                repeatCount="1"
                begin={isInView ? "2.5s" : "indefinite"}
              />
            </linearGradient>
          </defs>

          {/* Area fill with clip-path animation */}
          <motion.path
            d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25 V 150 H 0 Z"
            fill="url(#paint0_linear_budget)"
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={areaVariants}
            style={{
              transition: 'fill 0.3s ease'
            }}
          />

          {/* Shimmer overlay */}
          {isInView && (
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#shimmer)"
              style={{ mixBlendMode: 'overlay' }}
            />
          )}

          {/* Stroke line */}
          <motion.path
            d="M0 109 C 18.1538 109 18.1538 21 36.3077 21 C 54.4615 21 54.4615 41 72.6154 41 C 90.7692 41 90.7692 93 108.923 93 C 127.077 93 127.077 33 145.231 33 C 163.385 33 163.385 101 181.538 101 C 199.692 101 199.692 61 217.846 61 C 236 61 236 45 254.154 45 C 272.308 45 272.308 121 290.462 121 C 308.615 121 308.615 149 326.769 149 C 344.923 149 344.923 1 363.077 1 C 381.231 1 381.231 81 399.385 81 C 417.538 81 417.538 129 435.692 129 C 453.846 129 453.846 25 472 25"
            stroke={budgetColor}
            strokeLinecap="round"
            strokeWidth={isHovered ? "3.5" : "2.5"}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={pathVariants}
            style={{
              transition: 'stroke-width 0.3s ease, stroke 0.3s ease',
              filter: isHovered ? `drop-shadow(0 0 6px ${budgetColor}99)` : 'none'
            }}
          />

          {/* Peak and valley markers on hover */}
          {isHovered && isInView && (
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
            >
              {/* Peak point */}
              <circle cx="363.077" cy="1" r="5" fill={budgetColor} stroke="white" strokeWidth="2" />
              {/* Valley point */}
              <circle cx="36.3077" cy="21" r="5" fill={budgetColor} stroke="white" strokeWidth="2" />
            </motion.g>
          )}
        </svg>

        {/* Trend arrow animation */}
        {isInView && (
          <motion.div
            className="absolute top-2 right-2 text-pink-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [10, 0, -5, -10]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: 'easeInOut'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
