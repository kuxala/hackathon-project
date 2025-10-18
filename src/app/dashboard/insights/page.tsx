'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useInView } from '@/hooks/useInView'
import { supabase } from '@/lib/supabase'
import type { InsightsDataResponse } from '@/types/insights'
import { SankeyDiagram } from '../components/insights/SankeyDiagram'
import { SpendingHeatmap } from '../components/insights/SpendingHeatmap'
import { CategoryRiverChart } from '../components/insights/CategoryRiverChart'
import { FinancialHealthDashboard } from '../components/insights/FinancialHealthDashboard'

export default function InsightsPage() {
  const [insightsData, setInsightsData] = useState<InsightsDataResponse['data'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { ref: healthRef, isInView: healthInView } = useInView({ threshold: 0.1, triggerOnce: true })
  const { ref: sankeyRef, isInView: sankeyInView } = useInView({ threshold: 0.1, triggerOnce: true })
  const { ref: heatmapRef, isInView: heatmapInView } = useInView({ threshold: 0.1, triggerOnce: true })
  const { ref: riverRef, isInView: riverInView } = useInView({ threshold: 0.1, triggerOnce: true })

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError('Please sign in to view insights')
        setIsLoading(false)
        return
      }

      const response = await fetch('/api/insights-data?months=6', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result: InsightsDataResponse = await response.json()

      if (!result.success || !result.data) {
        console.error('[Insights Page] API returned error:', result.error)
        setError(result.error || 'Failed to load insights')
        setIsLoading(false)
        return
      }

     
      setInsightsData(result.data)
    } catch (err) {
      console.error('[Insights Page] Failed to fetch insights:', err)
      setError('Failed to load insights. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[rgb(10,10,10)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-gray-400 text-sm">Loading insights...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !insightsData) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-[rgb(10,10,10)]">
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="text-5xl mb-3">📊</div>
            <h2 className="text-xl font-bold text-gray-100 mb-2">No Insights Available</h2>
            <p className="text-sm text-gray-400 mb-5">
              {error || 'Upload bank statements to generate AI-powered insights.'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => fetchInsights()}
                className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
            {error && (
              <div className="mt-4 text-xs text-red-400 font-mono bg-red-950/30 p-3 rounded border border-red-900/50">
                Error: {error}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[rgb(10,10,10)]">
      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 md:px-8">
          {/* Header */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-50 flex items-center gap-2">
                  <span className="text-purple-400">✨</span> AI Insights
                </h1>
                <p className="mt-0.5 text-sm text-gray-400">
                  Deep analysis of your financial patterns
                </p>
              </div>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-gray-100 transition-colors text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back
              </button>
            </div>
          </motion.div>

          {/* Health Score - Full width */}
          {/* <motion.div
            ref={healthRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-5"
          >
            <FinancialHealthDashboard data={insightsData.health} isInView={healthInView} />
          </motion.div> */}

          {/* Two column grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* <motion.div
              ref={sankeyRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SankeyDiagram data={insightsData.sankey} isInView={sankeyInView} />
            </motion.div> */}

            {/* Heatmap */}
            {/* <motion.div
              ref={heatmapRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              <SpendingHeatmap data={insightsData.heatmap} isInView={heatmapInView} />
            </motion.div> */}
          </div>

          {/* River Chart - Full width */}
          <motion.div
            ref={riverRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-5"
          >
            <CategoryRiverChart data={insightsData.river} isInView={riverInView} />
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center text-xs text-gray-600 pb-6"
          >
            Generated from last 6 months of data · Updated {new Date(insightsData.health.lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
