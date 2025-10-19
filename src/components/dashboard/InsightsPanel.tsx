'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import type { AIInsight } from '@/types/database'

interface InsightsPanelProps {
  onGenerateInsights?: () => void
}

export function InsightsPanel({ onGenerateInsights }: InsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchInsights()
  }, [filter])

  const fetchInsights = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view insights')
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (filter !== 'all') params.append('insight_type', filter)
      params.append('limit', '20')

      const response = await fetch(`/api/insights?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch insights')
      }

      setInsights(result.insights || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = async () => {
    setGenerating(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to generate insights')
        setGenerating(false)
        return
      }

      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          time_period: '90d'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate insights')
      }

      setInsights(result.insights || [])
      onGenerateInsights?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights')
    } finally {
      setGenerating(false)
    }
  }

  const dismissInsight = async (id: string) => {
    // Optimistically update UI
    setInsights(prev => prev.filter(i => i.id !== id))

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await supabase
        .from('ai_insights')
        .update({ is_dismissed: true })
        .eq('id', id)
    } catch (err) {
      console.error('Failed to dismiss insight:', err)
      // Reload insights on error
      fetchInsights()
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      case 'warning':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500/30 bg-red-500/10'
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/10'
      default:
        return 'border-blue-500/30 bg-blue-500/10'
    }
  }

  const insightTypes = [
    { value: 'all', label: 'All Insights' },
    { value: 'spending_pattern', label: 'Spending Patterns' },
    { value: 'budget_recommendation', label: 'Budget Tips' },
    { value: 'anomaly', label: 'Anomalies' },
    { value: 'saving_opportunity', label: 'Savings' },
    { value: 'trend_analysis', label: 'Trends' }
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {insightTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setFilter(type.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === type.value
                  ? 'bg-green-600 text-white'
                  : 'bg-[rgb(30,30,30)] text-gray-400 hover:text-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <button
          onClick={generateInsights}
          disabled={generating}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              Generate
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-xl border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-12 flex items-center justify-center">
          <LoadingSpinner size="md" text="Loading insights..." />
        </div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4"
        >
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      {/* Insights List */}
      {!loading && !error && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {insights.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-12 text-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-gray-400 mb-4">No insights yet</p>
                <button
                  onClick={generateInsights}
                  disabled={generating}
                  className="px-6 py-3 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {generating ? 'Generating...' : 'Generate Your First Insights'}
                </button>
              </motion.div>
            ) : (
              insights.map((insight, index) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-lg border p-4 ${getSeverityColor(insight.severity || 'info')}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(insight.severity || 'info')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-200 mb-1">
                        {insight.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {insight.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(insight.generated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => dismissInsight(insight.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
                      title="Dismiss"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
