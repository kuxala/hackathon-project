'use client'

import { useCallback, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Modal } from '@/components/shared/Modal'
import { useInView } from '@/hooks/useInView'
import { ChatWidget } from './components/ChatWidget'
import { DashboardHeader } from './components/DashboardHeader'
import { SpendingIncomeChart } from './components/SpendingIncomeChart'
import { LoanDebtChart } from './components/LoanDebtChart'
import { MonthlySpendingChart } from './components/MonthlySpendingChart'
import { BudgetForecastChart } from './components/BudgetForecastChart'
import { FileUploadWidget } from '@/components/dashboard/FileUploadWidget'
import { TransactionTable } from '@/components/dashboard/TransactionTable'
import { InsightsPanel } from '@/components/dashboard/InsightsPanel'
import { supabase } from '@/lib/supabase'
import type { ChartData } from '@/types/database'

interface DashboardExampleProps {
  user?: {
    id?: string
    email?: string
  }
  onSignOut?: () => void
}

interface StoredFileData {
  name: string
  type: string
  size: number
  content: string
  uploadedAt: string
}

export default function DashboardExample({ user, onSignOut }: DashboardExampleProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [uploadedFileFromLanding, setUploadedFileFromLanding] = useState<StoredFileData | null>(null)
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [isLoadingCharts, setIsLoadingCharts] = useState(false)
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
    if (!user?.id) return

    setIsLoadingCharts(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/insights?limit=20', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (result.success && result.insights && result.insights.length > 0) {
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
                  totalBudget: oldStats.totalCredits * 0.8,
                  totalSpent: oldStats.totalDebits,
                  utilizationPercentage: oldStats.totalCredits > 0 ? (oldStats.totalDebits / oldStats.totalCredits) * 100 : 0,
                  forecastEndOfMonth: oldStats.averageMonthlySpending * 1.1
                }
              }
              setChartData(fallbackData)
            }
          }
        }
      }
    } catch {
    } finally {
      setIsLoadingCharts(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])
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
          <motion.div
            className="mb-8 flex items-start justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <motion.h1
                className="text-3xl font-bold tracking-tight text-gray-50"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                Financial Overview
              </motion.h1>
              <motion.p
                className="mt-1 text-base text-gray-400"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Your financial health at a glance
              </motion.p>
            </div>
            <motion.button
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition-colors flex items-center gap-2"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </motion.svg>
              Import
            </motion.button>
          </motion.div>
          {!chartData && !isLoadingCharts && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
            >
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-500">Charts showing sample data</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    Upload transactions and generate insights to see your real financial data
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={chartsRef} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="lg:col-span-3"
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <SpendingIncomeChart
                value={chartData?.monthlyTrend ? Math.max(...chartData.monthlyTrend.income) : 12500}
                percentageChange={5}
                isInView={isInView}
                data={chartData?.monthlyTrend}
              />
            </motion.div>

            {/* Show category breakdown OR monthly spending chart */}
            {chartData?.categoryBreakdown &&
             chartData.categoryBreakdown.categories.length > 0 &&
             !(chartData.categoryBreakdown.categories.length === 1 &&
               chartData.categoryBreakdown.categories[0].name === 'Uncategorized') ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ delay: 0.25, duration: 0.6 }}
                className="lg:col-span-2"
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <LoanDebtChart
                  value={chartData.categoryBreakdown.categories.reduce((sum, c) => sum + c.amount, 0)}
                  percentageChange={-2}
                  isInView={isInView}
                  data={chartData.categoryBreakdown}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ delay: 0.25, duration: 0.6 }}
                className="lg:col-span-2"
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
                <MonthlySpendingChart
                  value={chartData?.monthlyTrend ? chartData.monthlyTrend.spending.reduce((sum, s) => sum + s, 0) : 12000}
                  percentageChange={-2}
                  isInView={isInView}
                  data={chartData?.monthlyTrend}
                />
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="lg:col-span-1"
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <BudgetForecastChart
                value={chartData?.budget?.forecastEndOfMonth || 5000}
                percentageChange={chartData?.budget ? ((chartData.budget.forecastEndOfMonth - chartData.budget.totalSpent) / chartData.budget.totalSpent * 100) : 10}
                isInView={isInView}
                data={chartData?.budget}
              />
            </motion.div>
          </div>
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

        <FileUploadWidget onUploadComplete={handleCloseModal} />
      </Modal>
    </div>
  );
}
