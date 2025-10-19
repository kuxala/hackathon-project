'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '../components/DashboardHeader'

interface PsychologicalInsight {
  type: string
  headline: string
  data: any
}

export default function InsightsPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [insights, setInsights] = useState<PsychologicalInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentSlide, setCurrentSlide] = useState(0)

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

      const response = await fetch('/api/insights-psychology', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Failed to load insights')
        setIsLoading(false)
        return
      }

      setInsights(result.insights || [])
    } catch (err) {
      console.error('Failed to fetch insights:', err)
      setError('Failed to load insights. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchInsights()
    }
  }, [user, fetchInsights])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (insights.length === 0) return

      if (e.key === 'ArrowRight') {
        setCurrentSlide((prev) => Math.min(prev + 1, insights.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlide((prev) => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [insights.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, insights.length - 1))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <DashboardHeader user={user} onSignOut={signOut} />
        <div className="flex items-center justify-center h-96">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
          />
        </div>
      </div>
    )
  }

  if (!user) return null

  const renderInsightContent = (insight: PsychologicalInsight) => {
    switch (insight.type) {
      case 'opportunity_cost':
        return (
          <>
            <p className="text-white/60 text-base mb-6 leading-relaxed">
              {insight.data.breakdown}
            </p>
            <div className="mb-6 p-6 bg-white/5 rounded-xl border-l-2 border-red-500/50">
              <p className="text-white/40 text-sm uppercase tracking-wider mb-2">Yearly Cost</p>
              <p className="text-3xl font-light text-white mb-3">${insight.data.timeProjection.yearly}</p>
              <p className="text-white/50 text-sm">{insight.data.timeProjection.comparison}</p>
            </div>
            <p className="text-white/70 italic text-base leading-relaxed">
              {insight.data.question}
            </p>
          </>
        )

      case 'behavioral_pattern':
        return (
          <>
            <p className="text-white/60 text-lg mb-6 leading-relaxed">
              {insight.data.insight}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Trigger</p>
                <p className="text-white/80 text-sm">{insight.data.trigger}</p>
              </div>
              <div className="p-4 bg-white/5 rounded-xl">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Impact</p>
                <p className="text-white/80 text-sm">{insight.data.totalImpact}</p>
              </div>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Try This</p>
              <p className="text-white/80 text-sm">{insight.data.alternative}</p>
            </div>
          </>
        )

      case 'invisible_leak':
        return (
          <>
            <div className="flex items-baseline gap-6 mb-6">
              <div>
                <p className="text-6xl font-light text-red-400">{insight.data.count}</p>
                <p className="text-white/40 text-sm mt-1">subscriptions</p>
              </div>
              <div>
                <p className="text-4xl font-light text-white">${insight.data.monthlyCost}</p>
                <p className="text-white/40 text-sm mt-1">per month</p>
              </div>
            </div>
            <div className="mb-6 space-y-2">
              {insight.data.items.slice(0, 5).map((item: string, i: number) => (
                <div key={i} className="flex items-center gap-3 text-white/50 text-sm">
                  <div className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="capitalize">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-white/60 text-base leading-relaxed">
              {insight.data.awareness}
            </p>
          </>
        )

      case 'work_hours_spent':
        return (
          <>
            <div className="mb-6 p-8 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-end gap-8 mb-4">
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Category</p>
                  <p className="text-2xl font-light text-white">{insight.data.category}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Spent</p>
                  <p className="text-3xl font-light text-red-400">${insight.data.spent}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Hours Worked</p>
                <p className="text-5xl font-light text-amber-400">{insight.data.hoursWorked}</p>
              </div>
            </div>
            <p className="text-white/70 text-lg leading-relaxed">
              {insight.data.message}
            </p>
          </>
        )

      case 'future_self':
        return (
          <>
            <div className="mb-6">
              <p className="text-white/40 text-sm uppercase tracking-wider mb-3">Current Savings Rate</p>
              <p className="text-4xl font-light text-white mb-6">{insight.data.currentSavingsRate}%</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/20 mb-6">
              <p className="text-white/60 text-sm mb-4">If you cut <span className="text-white font-medium">{insight.data.ifYouCut}</span></p>
              <p className="text-white/90 text-lg mb-2">You would save {insight.data.youWouldSave}</p>
              <p className="text-emerald-400 text-2xl font-light mb-4">{insight.data.inFiveYears}</p>
              <p className="text-white/50 text-sm italic">{insight.data.couldBuy}</p>
            </div>
          </>
        )

      case 'lifestyle_inflation':
        return (
          <>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/20">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Spending</p>
                <p className="text-red-400 text-xl font-light mb-1">↑ {insight.data.spendingIncrease}</p>
              </div>
              <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Income</p>
                <p className="text-white/60 text-xl font-light mb-1">↑ {insight.data.butIncomeIncreased}</p>
              </div>
            </div>
            <div className="p-6 bg-amber-500/10 rounded-xl border-l-4 border-amber-500">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Projection</p>
              <p className="text-white/80 text-base leading-relaxed">{insight.data.projection}</p>
            </div>
          </>
        )

      case 'memory_vs_money':
        return (
          <>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/20">
                <p className="text-red-400 text-3xl font-light mb-2">${insight.data.forgottenSpending.amount}</p>
                <p className="text-white/60 text-sm mb-1">{insight.data.forgottenSpending.percent}% of spending</p>
                <p className="text-white/40 text-xs mt-3">{insight.data.forgottenSpending.description}</p>
              </div>
              <div className="p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <p className="text-emerald-400 text-3xl font-light mb-2">${insight.data.memorableSpending.amount}</p>
                <p className="text-white/60 text-sm mb-1">{insight.data.memorableSpending.percent}% of spending</p>
                <p className="text-white/40 text-xs mt-3">{insight.data.memorableSpending.description}</p>
              </div>
            </div>
            <p className="text-white/70 text-base leading-relaxed italic">
              Will you remember what you bought, or just that you spent the money?
            </p>
          </>
        )

      default:
        return null
    }
  }

  const currentInsight = insights[currentSlide]

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <DashboardHeader user={user} onSignOut={signOut} />

      <main className="relative flex min-h-[calc(100vh-80px)] flex-col items-stretch justify-start gap-8 px-4 py-8 md:h-[calc(100vh-80px)] md:items-center md:justify-center md:gap-0 md:px-6 md:py-0">
        {error && (
          <div className="absolute top-4 left-1/2 w-full max-w-sm -translate-x-1/2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 md:top-8 md:max-w-md">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {insights.length === 0 ? (
          <div className="text-center">
            <p className="text-5xl mb-6">💭</p>
            <h2 className="text-2xl font-light text-white mb-3">No insights yet</h2>
            <p className="text-white/30 text-sm max-w-sm mx-auto mb-8">
              Upload statements to see psychological insights
            </p>
            <button
              onClick={() => router.push('/statements')}
              className="px-6 py-3 bg-white text-black rounded-xl text-sm font-medium hover:bg-white/90 transition-all"
            >
              Upload Statements
            </button>
          </div>
        ) : (
          <>
            {/* Main Slide Content */}
            <div className="w-full max-w-4xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-3xl border border-white/5 bg-white/[0.03] px-6 py-8 backdrop-blur md:border-0 md:bg-transparent md:px-16 md:py-12 md:backdrop-blur-0"
                >
                  {/* Headline */}
                  <h1 className="mb-8 text-3xl font-light leading-snug text-white md:mb-16 md:text-5xl md:leading-tight">
                    {currentInsight.headline}
                  </h1>

                  {/* Content */}
                  <div className="text-sm md:text-base">
                    {renderInsightContent(currentInsight)}
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/70 backdrop-blur md:hidden">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-40 disabled:hover:border-white/10"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-xs uppercase tracking-wide">Prev</span>
                </button>

                <span className="text-xs uppercase tracking-[0.3em] text-white/60">
                  {currentSlide + 1} / {insights.length}
                </span>

                <button
                  onClick={nextSlide}
                  disabled={currentSlide === insights.length - 1}
                  className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-40 disabled:hover:border-white/10"
                >
                  <span className="text-xs uppercase tracking-wide">Next</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="absolute bottom-12 left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
              {/* Previous Button */}
              <button
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/10"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Progress Dots */}
              <div className="flex gap-2">
                {insights.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`transition-all ${
                      index === currentSlide
                        ? 'w-8 h-2 bg-white rounded-full'
                        : 'w-2 h-2 bg-white/30 rounded-full hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>

              {/* Next Button */}
              <button
                onClick={nextSlide}
                disabled={currentSlide === insights.length - 1}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-white/10"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Slide Counter */}
            <div className="absolute top-8 right-8 hidden text-sm text-white/30 md:block">
              {currentSlide + 1} / {insights.length}
            </div>

            {/* Keyboard Hint */}
            <div className="absolute top-8 left-8 hidden text-xs text-white/20 md:block">
              Use arrow keys to navigate
            </div>
          </>
        )}
      </main>
    </div>
  )
}
