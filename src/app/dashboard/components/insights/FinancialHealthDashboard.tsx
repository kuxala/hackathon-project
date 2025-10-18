'use client'

import { motion } from 'framer-motion'
import { useCountUp } from '@/hooks/useCountUp'
import type { FinancialHealthData } from '@/types/insights'

interface FinancialHealthDashboardProps {
  data: FinancialHealthData
  isInView?: boolean
}

export function FinancialHealthDashboard({ data, isInView = true }: FinancialHealthDashboardProps) {
  console.log('[FinancialHealthDashboard] Received data:', data)
  console.log('[FinancialHealthDashboard] Metrics:', data?.metrics?.length)
  console.log('[FinancialHealthDashboard] Overall score:', data?.overallScore)

  // Validation
  if (!data || !data.metrics || data.metrics.length === 0) {
    console.log('[FinancialHealthDashboard] Data validation failed!')
    return (
      <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <span className="text-emerald-400">💚</span> Financial Health
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
          <span className="text-emerald-400">💚</span> Financial Health
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Overall wellness score</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Overall Score - Larger */}
        <div className="col-span-2 flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-[rgb(20,20,20)] to-[rgb(15,15,15)] border border-[rgb(35,35,35)]">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="rgb(30, 30, 30)"
                strokeWidth="12"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={
                  data.overallScore >= 80 ? '#10b981' :
                  data.overallScore >= 60 ? '#3b82f6' :
                  data.overallScore >= 40 ? '#f59e0b' : '#ef4444'
                }
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                animate={isInView ? {
                  strokeDashoffset: 2 * Math.PI * 50 * (1 - data.overallScore / 100)
                } : {
                  strokeDashoffset: 2 * Math.PI * 50
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                className="text-3xl font-bold"
                initial={{ opacity: 0, scale: 0 }}
                animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                style={{
                  color:
                    data.overallScore >= 80 ? '#10b981' :
                    data.overallScore >= 60 ? '#3b82f6' :
                    data.overallScore >= 40 ? '#f59e0b' : '#ef4444'
                }}
              >
                <CountUpValue value={data.overallScore} isInView={isInView} />
              </motion.div>
              <motion.div
                className="text-[9px] text-gray-500 uppercase tracking-wider"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.5 }}
              >
                Score
              </motion.div>
            </div>
          </div>
          <div className="mt-2 text-center">
            <div className={`text-xs font-semibold ${
              data.overallScore >= 80 ? 'text-green-400' :
              data.overallScore >= 60 ? 'text-blue-400' :
              data.overallScore >= 40 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {data.overallScore >= 80 ? 'Excellent' :
               data.overallScore >= 60 ? 'Good' :
               data.overallScore >= 40 ? 'Fair' : 'Poor'}
            </div>
          </div>
        </div>

        {/* Individual Metrics - Compact */}
        {data.metrics.slice(0, 5).map((metric, index) => (
          <motion.div
            key={metric.id}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-gradient-to-br from-[rgb(20,20,20)] to-[rgb(15,15,15)] border border-[rgb(35,35,35)]"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ delay: index * 0.08, duration: 0.4 }}
          >
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgb(30, 30, 30)" strokeWidth="6" />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke={metric.color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 26 }}
                  animate={isInView ? {
                    strokeDashoffset: 2 * Math.PI * 26 * (1 - metric.value / 100)
                  } : {
                    strokeDashoffset: 2 * Math.PI * 26
                  }}
                  transition={{ duration: 1, delay: index * 0.08 + 0.3, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-200">
                  {Math.round(metric.value)}
                </span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="text-[10px] font-medium text-gray-400">{metric.name}</div>
              <div className="text-xs font-semibold text-gray-200 mt-0.5">
                {metric.unit === '%' && `${metric.score.toFixed(1)}%`}
                {metric.unit === '$' && `$${(metric.score / 1000).toFixed(1)}k`}
                {metric.unit === 'months' && `${metric.score.toFixed(1)}mo`}
                {metric.unit === 'days' && `${metric.score.toFixed(0)}d`}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trend indicator */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/50 text-[10px] text-gray-500">
        <span>
          Trend: <span className={`font-medium ${
            data.trend === 'improving' ? 'text-green-400' :
            data.trend === 'stable' ? 'text-blue-400' : 'text-red-400'
          }`}>
            {data.trend === 'improving' && '↗ Improving'}
            {data.trend === 'stable' && '→ Stable'}
            {data.trend === 'declining' && '↘ Declining'}
          </span>
        </span>
        <span>Updated {new Date(data.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}

function CountUpValue({
  value,
  isInView,
  decimals = 0,
  suffix = ''
}: {
  value: number
  isInView: boolean
  decimals?: number
  suffix?: string
}) {
  const displayValue = useCountUp({
    end: isInView ? value : 0,
    start: 0,
    duration: 1500,
    decimals,
    prefix: '',
    suffix
  })

  return <>{displayValue}</>
}
