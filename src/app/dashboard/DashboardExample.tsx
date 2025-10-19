'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Modal } from '@/components/shared/Modal'
import { useInView } from '@/hooks/useInView'
import dynamic from 'next/dynamic'
import { DashboardHeader } from './components/DashboardHeader'
import { SpendingIncomeChart } from './components/SpendingIncomeChart'
import { LoanDebtChart } from './components/LoanDebtChart'
import { BudgetForecastChart } from './components/BudgetForecastChart'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

// Lazy load heavy components
const ChatWidget = dynamic(() => import('./components/ChatWidget').then(mod => ({ default: mod.ChatWidget })), { ssr: false })
const FileUploadWidget = dynamic(() => import('@/components/dashboard/FileUploadWidget').then(mod => ({ default: mod.FileUploadWidget })), { ssr: false })
import { supabase } from '@/lib/supabase'
import { normalizeAmount } from '@/utils/chartHelpers'
import type { ChartData } from '@/types/database'

interface DashboardExampleProps {
  user?: {
    id?: string
    email?: string
  }
  onSignOut?: () => void
  loading?: boolean
}

interface StoredFileData {
  name: string
  type: string
  size: number
  content: string
  uploadedAt: string
}

export default function DashboardExample({ user, onSignOut, loading }: DashboardExampleProps) {
  const router = useRouter()
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFileFromLanding, setUploadedFileFromLanding] = useState<StoredFileData | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoadingCharts, setIsLoadingCharts] = useState(false)
  const [hasTransactions, setHasTransactions] = useState<boolean | null>(null)
  const { ref: chartsRef, isInView } = useInView({ threshold: 0.1, triggerOnce: true })

  // Check for pending file from landing page
  useEffect(() => {
    const pendingFile = localStorage.getItem('pendingFinancialFile')
    if (pendingFile) {
      try {
        const fileData: StoredFileData = JSON.parse(pendingFile)
        setUploadedFileFromLanding(fileData)
        // Remove from localStorage after retrieval
        localStorage.removeItem('pendingFinancialFile')

        // TODO: Here you would trigger the analysis function when it's ready
      } catch {
        localStorage.removeItem('pendingFinancialFile')
      }
    }
  }, [])

  useEffect(() => {
    if (!uploadedFileFromLanding) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setUploadedFileFromLanding(null)
    }, 5000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [uploadedFileFromLanding])

  const handleCloseModal = useCallback(() => {
    setIsImportModalOpen(false)
  }, [])

  // Fetch chart data from insights
  const fetchChartData = useCallback(async () => {

    if (!user?.id || loading) {
      return
    }

    setIsLoadingCharts(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setIsLoadingCharts(false)
        return
      }

      // Fetch existing insights only (no auto-generation)
      const response = await fetch('/api/insights?limit=20', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      // Check if we got insights or if the user has no transactions
      if (result.success && result.insights && result.insights.length > 0) {
        const noDataInsight = result.insights.find((i: any) => i.id === 'no-data')

        if (noDataInsight) {
          setHasTransactions(false)
          setChartData(null)
          setIsLoadingCharts(false)
          return
        }

        setHasTransactions(true)

        // Find the spending_pattern insight which has the chartData
        const spendingInsight = result.insights.find(
          (insight: any) => insight.insight_type === 'spending_pattern'
        )

        if (spendingInsight) {
          // Check if it has the new chartData structure
          if (spendingInsight.data && (
            spendingInsight.data.monthlyTrend ||
            spendingInsight.data.categoryBreakdown ||
            spendingInsight.data.budget
          )) {
            setChartData(spendingInsight.data as ChartData)
          } else {
            // The AI didn't return the proper format, so use fallback from old stats
            const oldStats = spendingInsight.data
            if (oldStats && oldStats.monthlyData) {
              // Calculate meaningful monthly metrics
              const avgMonthlyIncome = oldStats.monthlyData.length > 0
                ? oldStats.monthlyData.reduce((sum: number, m: any) => sum + m.credits, 0) / oldStats.monthlyData.length
                : 0
              const avgMonthlySpending = oldStats.monthlyData.length > 0
                ? oldStats.monthlyData.reduce((sum: number, m: any) => sum + m.debits, 0) / oldStats.monthlyData.length
                : 0
              const lastMonthSpending = oldStats.monthlyData.length > 0
                ? oldStats.monthlyData[oldStats.monthlyData.length - 1].debits
                : 0
              const savingsRate = avgMonthlyIncome > 0
                ? ((avgMonthlyIncome - avgMonthlySpending) / avgMonthlyIncome) * 100
                : 0
              const trendPercentage = oldStats.monthlyData.length >= 2
                ? ((oldStats.monthlyData[oldStats.monthlyData.length - 1].debits - oldStats.monthlyData[oldStats.monthlyData.length - 2].debits)
                   / oldStats.monthlyData[oldStats.monthlyData.length - 2].debits) * 100
                : 0

              const fallbackData = {
                monthlyTrend: {
                  months: oldStats.monthlyData.map((m: any) => m.month),
                  income: oldStats.monthlyData.map((m: any) => m.credits),
                  spending: oldStats.monthlyData.map((m: any) => m.debits)
                },
                categoryBreakdown: {
                  categories: Object.entries(oldStats.byCategory || {})
                    .slice(0, 4)
                    .map(([name, data]: [string, any]) => ({
                      name,
                      amount: data.total,
                      percentage: data.percentage,
                      color: (data.percentage > 25 ? 'rose' : data.percentage > 15 ? 'amber' : 'green') as any
                    }))
                },
                budget: {
                  averageMonthlySpending: avgMonthlySpending,
                  averageMonthlyIncome: avgMonthlyIncome,
                  savingsRate: savingsRate,
                  lastMonthSpending: lastMonthSpending,
                  trendPercentage: trendPercentage
                }
              }
              setChartData(fallbackData)
            }
          }
        } else {
          setChartData(null)
        }
      } else {
        setHasTransactions(false)
        setChartData(null)
      }
    } catch (error) {
      console.error('❌ Error fetching chart data:', error)
      setHasTransactions(false)
      setChartData(null)
    } finally {
      setIsLoadingCharts(false)
    }
  }, [user?.id, loading])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  // Log when component renders
  return (
    <div className="flex min-h-screen w-full flex-col relative bg-[rgb(10,10,10)]">
      <DashboardHeader user={user} onSignOut={onSignOut} />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
          {uploadedFileFromLanding && (
            <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-500">File uploaded successfully!</p>
                  <p className="text-xs text-green-400/80 mt-0.5">
                    {uploadedFileFromLanding.name} ({(uploadedFileFromLanding.size / 1024).toFixed(1)} KB) - Ready for analysis
                  </p>
                </div>
                <button
                  onClick={() => setUploadedFileFromLanding(null)}
                  className="text-green-400/60 hover:text-green-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-gray-50">
                Financial Overview
              </h1>
              <p className="mt-1 text-base text-gray-400">
                Your financial health at a glance
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center md:justify-end">
              <button
                onClick={() => router.push('/dashboard/insights')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-medium text-purple-300 transition-all shadow-lg shadow-purple-900/20 hover:border-purple-500/50 hover:bg-purple-500/20 hover:scale-105 md:w-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                AI Insights
              </button>
              <button
                onClick={() => router.push('/dashboard/voice')}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition-all shadow-lg shadow-emerald-900/20 hover:border-emerald-500/50 hover:bg-emerald-500/20 hover:scale-105 md:w-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                Voice Assistant
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-green-700 hover:scale-105 md:w-auto"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Import
              </button>
            </div>
          </div>
          {/* Show empty state if no transactions */}
          {hasTransactions === false && !isLoadingCharts && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-2xl border border-[rgb(30,30,30)] bg-[rgb(15,15,15)] p-12 text-center"
            >
              <div className="mx-auto max-w-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-20 w-20 mx-auto text-gray-600 mb-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-100 mb-3">No Financial Data Yet</h3>
                <p className="text-base text-gray-400 mb-6">
                  Upload your bank statements or transaction files to start tracking your finances and get AI-powered insights.
                </p>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Upload Your First Statement
                </button>
              </div>
            </motion.div>
          )}


          {/* Only show charts if user has transactions */}
          {hasTransactions !== false && (
          <>
            {/* Sample Data Warning Banner - Only show when not loading and no data */}
            {!isLoadingCharts && !chartData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 rounded-lg border-2 border-blue-500/30 bg-blue-500/10 p-4"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-400">📊 Sample Data Preview</p>
                    <p className="text-xs text-blue-300/80 mt-0.5">
                      The charts below show example data for demonstration. Your insights are being generated automatically.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={chartsRef} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-3 relative">
                {isLoadingCharts ? (
                  <div className="rounded-xl border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-6 flex items-center justify-center min-h-[300px]">
                    <LoadingSpinner size="md" text="Loading chart data..." />
                  </div>
                ) : !chartData ? (
                  <div className="relative">
                    <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm">
                      <span className="text-xs font-medium text-blue-400">Sample Data</span>
                    </div>
                    <SpendingIncomeChart
                      value={12500}
                      percentageChange={5}
                      isInView={isInView}
                      data={undefined}
                    />
                  </div>
                ) : (
                  <SpendingIncomeChart
                    value={chartData.monthlyTrend ? Math.max(...chartData.monthlyTrend.income) : 12500}
                    percentageChange={5}
                    isInView={isInView}
                    data={chartData.monthlyTrend}
                  />
                )}
              </div>

            {/* Category Spending Breakdown */}
            <div className="lg:col-span-2 relative">
              {isLoadingCharts ? (
                <div className="rounded-xl border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-6 flex items-center justify-center min-h-[300px]">
                  <LoadingSpinner size="md" text="Loading chart data..." />
                </div>
              ) : (
                <LoanDebtChart
                  value={chartData?.categoryBreakdown ? chartData.categoryBreakdown.categories.reduce((sum, c) => sum + normalizeAmount(c.amount), 0) : 25000}
                  percentageChange={-2}
                  isInView={isInView}
                  data={chartData?.categoryBreakdown}
                />
              )}
            </div>

            <div className="lg:col-span-1 relative">
              {isLoadingCharts ? (
                <div className="rounded-xl border border-[rgb(40,40,40)] bg-[rgb(18,18,18)] p-6 flex items-center justify-center min-h-[300px]">
                  <LoadingSpinner size="md" text="Loading chart data..." />
                </div>
              ) : !chartData ? (
                <div className="relative">
                  <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm">
                    <span className="text-xs font-medium text-blue-400">Sample Data</span>
                  </div>
                  <BudgetForecastChart
                    value={5000}
                    percentageChange={10}
                    isInView={isInView}
                    data={undefined}
                  />
                </div>
              ) : (
                <BudgetForecastChart
                  value={chartData.budget?.averageMonthlySpending || 5000}
                  percentageChange={chartData.budget?.trendPercentage || 10}
                  isInView={isInView}
                  data={chartData.budget}
                />
              )}
            </div>
          </div>
          </>
          )}
{/*
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8"
          >
            <h2 className="text-2xl font-bold text-gray-50 mb-4">AI Insights</h2>
            <InsightsPanel onGenerateInsights={fetchChartData} />
          </motion.div> */}

          {/* Transactions Section */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-8"
          >
            <h2 className="text-2xl font-bold text-gray-50 mb-4">Recent Transactions</h2>
            <TransactionTable />
          </motion.div> */}
        </div>
      </main>

      <ChatWidget userId={user?.id} />

      <Modal isOpen={isImportModalOpen} onClose={handleCloseModal}>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-50">Upload Bank Statement</h2>
            <p className="mt-1 text-sm text-gray-400">Upload CSV or Excel files. We&apos;ll auto-detect your bank and merge transactions.</p>
          </div>
          <button
            onClick={handleCloseModal}
            className="rounded-full p-2 text-gray-400 hover:text-gray-100 hover:bg-[rgb(25,25,25)]"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <FileUploadWidget onUploadComplete={() => {
          handleCloseModal()
          fetchChartData() // Refresh charts after upload
        }} />
      </Modal>
    </div>
  );
}
