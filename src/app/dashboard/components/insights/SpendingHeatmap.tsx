'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { HeatmapData } from '@/types/insights'

interface SpendingHeatmapProps {
  data: HeatmapData
  isInView?: boolean
}

export function SpendingHeatmap({ data, isInView = true }: SpendingHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const calendar = useMemo(() => {
    if (!data || !data.days || data.days.length === 0) {
      return null
    }
    const weeks: any[][] = []
    let currentWeek: any[] = []

    const sortedDays = [...data.days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const firstDate = new Date(data.periodStart)
    const lastDate = new Date(data.periodEnd)
    const allDays = new Map(sortedDays.map(d => [d.date, d]))

    const currentDate = new Date(firstDate)
    while (currentDate <= lastDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      if (!allDays.has(dateStr)) {
        allDays.set(dateStr, {
          date: dateStr,
          amount: 0,
          transactionCount: 0,
          dayOfWeek: currentDate.getDay(),
          intensity: 0
        })
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    const completeDays = Array.from(allDays.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    completeDays.forEach(day => {
      if (currentWeek.length === 0 && day.dayOfWeek !== 0) {
        for (let i = 0; i < day.dayOfWeek; i++) {
          currentWeek.push(null)
        }
      }

      currentWeek.push(day)

      if (day.dayOfWeek === 6 || day.date === data.periodEnd) {
        weeks.push([...currentWeek])
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks.slice(0, 26) // Last 6 months ~26 weeks
  }, [data])

  console.log('[SpendingHeatmap] Received data:', data)
  console.log('[SpendingHeatmap] Days:', data?.days?.length)

  // Validation
  if (!calendar) {
    console.log('[SpendingHeatmap] Data validation failed!')
    return (
      <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <span className="text-green-400">📅</span> Spending Calendar
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">No data available</p>
        </div>
      </div>
    )
  }

  const getColor = (intensity: number) => {
    if (intensity === 0) return 'rgb(25, 25, 25)'
    if (intensity < 20) return 'rgb(34, 197, 94)'
    if (intensity < 40) return 'rgb(132, 204, 22)'
    if (intensity < 60) return 'rgb(250, 204, 21)'
    if (intensity < 80) return 'rgb(251, 146, 60)'
    return 'rgb(239, 68, 68)'
  }

  const hoveredDayData = data?.days?.find(d => d.date === hoveredDay)

  return (
    <div className="rounded-xl border border-[rgb(30,30,30)] bg-gradient-to-br from-[rgb(15,15,15)] to-[rgb(18,18,18)] p-5 shadow-xl">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
          <span className="text-green-400">📅</span> Spending Calendar
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Daily spending patterns</p>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Day labels */}
        <div className="flex gap-1 text-[9px] text-gray-600 mb-1 ml-6">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="w-2.5 text-center">{day}</div>
          ))}
        </div>

        {/* Calendar grid - show only recent weeks */}
        <div className="flex flex-col gap-1">
          {calendar.map((week, weekIndex) => (
            <motion.div
              key={weekIndex}
              className="flex gap-1 items-center"
              initial={{ opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
              transition={{ delay: weekIndex * 0.02, duration: 0.3 }}
            >
              {/* Month label */}
              <div className="w-5 text-[8px] text-gray-600 text-right pr-1">
                {weekIndex % 4 === 0 && week[0] ? (
                  new Date(week.find(d => d !== null)?.date || '').toLocaleDateString('en-US', { month: 'short' })
                ) : ''}
              </div>

              {/* Week cells */}
              {week.map((day, dayIndex) => (
                <div key={`${weekIndex}-${dayIndex}`} className="relative group">
                  {day ? (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-sm cursor-pointer transition-all"
                      style={{ backgroundColor: getColor(day.intensity) }}
                      whileHover={{ scale: 1.5, zIndex: 10 }}
                      onMouseEnter={() => setHoveredDay(day.date)}
                      onMouseLeave={() => setHoveredDay(null)}
                    />
                  ) : (
                    <div className="w-2.5 h-2.5" />
                  )}
                </div>
              ))}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && hoveredDayData && (
        <motion.div
          className="fixed pointer-events-none bg-[rgb(20,20,20)] border border-[rgb(40,40,40)] rounded-lg px-2.5 py-2 text-[10px] z-50 shadow-2xl"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <div className="text-gray-300 font-medium text-[11px]">
              {new Date(hoveredDayData.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </div>
            <div className="text-gray-100 font-bold">
              ${hoveredDayData.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-gray-500">
              {hoveredDayData.transactionCount} {hoveredDayData.transactionCount === 1 ? 'transaction' : 'transactions'}
            </div>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/50">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <span>Less</span>
          <div className="flex gap-0.5">
            {[0, 20, 40, 60, 80].map((intensity, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getColor(intensity) }} />
            ))}
          </div>
          <span>More</span>
        </div>
        <div className="text-[10px] text-gray-500">
          Avg ${data.averageDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })}/day
        </div>
      </div>
    </div>
  )
}
