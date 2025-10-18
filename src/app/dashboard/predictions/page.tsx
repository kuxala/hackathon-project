'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { DashboardHeader } from '../components/DashboardHeader'
import { PredictionComparisonChart } from './components/PredictionComparisonChart'
import { CategoryTrendChart } from './components/CategoryTrendChart'
import { ConfidenceMeter } from './components/ConfidenceMeter'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface CategoryPrediction {
  category: string
  amount: number
  confidence: 'high' | 'medium' | 'low'
}

interface PredictionData {
  nextMonth: string
  predictedExpenses: {
    total: number
    byCategory: CategoryPrediction[]
  }
  insights: string[]
  warnings: string[]
  confidence: number
  basedOnMonths: number
}

interface HistoricalMonth {
  month: string
  totalSpending: number
  totalIncome: number
  categories: { category: string; amount: number }[]
  transactionCount: number
}

export default function PredictionsPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [prediction, setPrediction] = useState<PredictionData | null>(null)
  const [historicalData, setHistoricalData] = useState<HistoricalMonth[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monthsToUse, setMonthsToUse] = useState(6)
  const [availableMonths, setAvailableMonths] = useState(0)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check available data and load last prediction on mount
  useEffect(() => {
    checkAvailableData()
    loadLastPrediction()
  }, [])

  const checkAvailableData = async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setError('Please log in to view predictions')
      return
    }

    try {
      const response = await fetch('/api/predictions/available', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableMonths(data.availableMonths || 0)
      }
    } catch (err) {
      console.error('Failed to check available data:', err)
    }
  }

  const loadLastPrediction = async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return
    }

    try {
      const response = await fetch('/api/predictions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()

      if (data.success && data.data) {
        setPrediction(data.data)
        setHistoricalData(data.historicalData || [])
        setLastGeneratedAt(data.generatedAt || null)
      }
      // If no prediction found, just silently continue (no error shown)
    } catch (err) {
      console.error('Failed to load last prediction:', err)
      // Don't show error to user, just log it
    }
  }

  const generatePrediction = async () => {
    setLoading(true)
    setError(null)
    setPrediction(null)

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      setError('Please log in to generate predictions')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ monthsToUse })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || data.error || 'Failed to generate prediction')
        setLoading(false)
        return
      }

      setPrediction(data.data)
      setHistoricalData(data.historicalData || [])
      setLastGeneratedAt(new Date().toISOString())
    } catch (err) {
      setError('An error occurred while generating predictions')
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'low':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[rgb(10,10,10)]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[rgb(10,10,10)]">
      <DashboardHeader user={user} onSignOut={signOut} />

      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-50 mb-1">Expense Predictions</h1>
                <p className="text-gray-400 text-sm">AI-powered predictions for your next month expenses</p>
              </div>

              {/* Inline Settings */}
              <div className="flex items-center gap-3">
                <select
                  value={monthsToUse}
                  onChange={(e) => setMonthsToUse(Number(e.target.value))}
                  className="px-3 py-2 bg-[rgb(20,20,20)] border border-[rgb(35,35,35)] text-gray-200 text-sm rounded-lg focus:ring-2 focus:ring-primary/60 focus:border-transparent"
                  disabled={loading}
                >
                  <option value={3}>3 months</option>
                  <option value={6}>6 months</option>
                  <option value={9}>9 months</option>
                  <option value={12}>12 months</option>
                </select>

                <button
                  onClick={generatePrediction}
                  disabled={loading}
                  className="px-5 py-2 bg-primary text-white text-sm rounded-lg font-medium hover:bg-primary/90 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Prediction
                    </>
                  )}
                </button>
              </div>
            </div>

            {availableMonths > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {availableMonths} months of transaction data available
              </p>
            )}
          </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-300">Error</h3>
                <p className="text-sm text-red-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-gradient-to-br from-primary/90 to-purple-600/90 rounded-lg p-8 border border-primary/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Predicted Expenses</h2>
                  <p className="text-white/80">For {formatMonth(prediction.nextMonth)}</p>
                  {lastGeneratedAt && (
                    <p className="text-white/60 text-xs mt-1">
                      Generated {new Date(lastGeneratedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-white/80 mb-1">Confidence</div>
                  <div className="text-3xl font-bold text-white">{prediction.confidence}%</div>
                </div>
              </div>
              <div className="text-5xl font-bold text-white mb-2">
                {formatCurrency(prediction.predictedExpenses.total)}
              </div>
              <p className="text-white/80 text-sm">
                Based on {prediction.basedOnMonths} months of transaction data
              </p>
            </div>

            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Confidence Meter */}
              <div className="lg:col-span-1">
                <ConfidenceMeter
                  confidence={prediction.confidence}
                  basedOnMonths={prediction.basedOnMonths}
                  isInView={true}
                />
              </div>

              {/* Comparison Chart */}
              <div className="lg:col-span-2">
                <PredictionComparisonChart
                  historicalData={historicalData}
                  predictedAmount={prediction.predictedExpenses.total}
                  nextMonth={prediction.nextMonth}
                  isInView={true}
                />
              </div>
            </div>

            {/* Category Trend Chart */}
            <CategoryTrendChart
              predictions={prediction.predictedExpenses.byCategory}
              historicalData={historicalData}
              isInView={true}
            />

            {/* Category Breakdown */}
            <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-50 mb-4">Category Breakdown</h3>
              <div className="space-y-4">
                {prediction.predictedExpenses.byCategory.map((category, index) => {
                  const percentage = (category.amount / prediction.predictedExpenses.total) * 100
                  return (
                    <div key={index} className="border border-[rgb(30,30,30)] rounded-lg p-4 bg-[rgb(20,20,20)]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-100">{category.category}</h4>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getConfidenceColor(category.confidence)}`}>
                            {category.confidence} confidence
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-100">
                            {formatCurrency(category.amount)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {percentage.toFixed(1)}% of total
                          </div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="w-full bg-[rgb(30,30,30)] rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Insights */}
            {prediction.insights.length > 0 && (
              <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-50 mb-4">Insights</h3>
                <ul className="space-y-3">
                  {prediction.insights.map((insight, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {prediction.warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-yellow-400 mb-4 flex items-center">
                  <svg className="h-6 w-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Warnings
                </h3>
                <ul className="space-y-2">
                  {prediction.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-yellow-300">{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Historical Data */}
            {historicalData.length > 0 && (
              <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-6">
                <h3 className="text-xl font-semibold text-gray-50 mb-4">Historical Data Used</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[rgb(30,30,30)]">
                    <thead className="bg-[rgb(20,20,20)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Month</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Spending</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Income</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgb(30,30,30)]">
                      {historicalData.map((month, index) => (
                        <tr key={index} className="hover:bg-[rgb(20,20,20)]">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                            {formatMonth(month.month)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatCurrency(month.totalSpending)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {formatCurrency(month.totalIncome)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {month.transactionCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Empty State */}
          {!prediction && !loading && !error && (
            <div className="bg-[rgb(15,15,15)] border border-[rgb(30,30,30)] rounded-lg p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-100 mb-2">No Prediction Yet</h3>
              <p className="text-gray-400">Click the generate button above to get AI-powered expense predictions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
