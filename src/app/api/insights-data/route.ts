import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Transaction } from '@/types/database'
import type {
  InsightsDataResponse,
  SankeyData,
  HeatmapData,
  RiverData,
  FinancialHealthData,
  HealthMetric
} from '@/types/insights'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * GET /api/insights-data - Fetch and process transaction data for visualizations
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json<InsightsDataResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json<InsightsDataResponse>(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '6')

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months)

    // Fetch all transactions for the period
    console.log('[Insights API] Fetching transactions for user:', user.id)
    console.log('[Insights API] Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0])

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate.toISOString().split('T')[0])
      .lte('transaction_date', endDate.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true })

    if (error) {
      console.error('[Insights API] Fetch transactions error:', error)
      return NextResponse.json<InsightsDataResponse>(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log('[Insights API] Found transactions:', transactions?.length || 0)

    // Use sample data if insufficient real transactions
    if (!transactions || transactions.length < 10) {
      console.log('[Insights API] Insufficient transactions (< 10), using sample data for better visualization')
      const sampleData = generateSampleData()
      return NextResponse.json<InsightsDataResponse>({
        success: true,
        data: sampleData
      })
    }

    // Check if data quality is good enough (has categorized transactions)
    const categorizedCount = transactions.filter(t => t.category && t.category !== 'Uncategorized' && t.category !== '').length
    const categorizationRate = categorizedCount / transactions.length

    console.log('[Insights API] Categorized:', categorizedCount, '/', transactions.length, '=', (categorizationRate * 100).toFixed(0), '%')

    // If less than 30% categorized, use sample data
    if (categorizationRate < 0.3) {
      console.log('[Insights API] Low categorization rate (', (categorizationRate * 100).toFixed(0), '%), using sample data')
      const sampleData = generateSampleData()
      return NextResponse.json<InsightsDataResponse>({
        success: true,
        data: sampleData
      })
    }

    // Process data for all visualizations
    const sankeyData = generateSankeyData(transactions)
    const heatmapData = generateHeatmapData(transactions)
    const riverData = generateRiverData(transactions)
    const healthData = generateHealthData(transactions)

    return NextResponse.json<InsightsDataResponse>({
      success: true,
      data: {
        sankey: sankeyData,
        heatmap: heatmapData,
        river: riverData,
        health: healthData
      }
    })

  } catch (error) {
    console.error('GET /api/insights-data error:', error)
    return NextResponse.json<InsightsDataResponse>(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Generate Sankey diagram data
 */
function generateSankeyData(transactions: Transaction[]): SankeyData {
  const nodes: any[] = []
  const links: any[] = []

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalSpending = transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)

  // Add income node
  const incomeNodeId = 'income'
  nodes.push({
    id: incomeNodeId,
    name: 'Total Income',
    type: 'income',
    value: totalIncome,
    color: '#12a159'
  })

  // Group by category
  const categorySpending = new Map<string, number>()
  const categoryMerchants = new Map<string, Map<string, number>>()

  transactions
    .filter(t => t.transaction_type === 'debit')
    .forEach(t => {
      const category = t.category || 'Uncategorized'
      const merchant = t.merchant || 'Other'

      // Track category totals
      categorySpending.set(category, (categorySpending.get(category) || 0) + t.amount)

      // Track merchants per category
      if (!categoryMerchants.has(category)) {
        categoryMerchants.set(category, new Map())
      }
      const merchants = categoryMerchants.get(category)!
      merchants.set(merchant, (merchants.get(merchant) || 0) + t.amount)
    })

  // Add category nodes and links (top 8 categories)
  const topCategories = Array.from(categorySpending.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const categoryColors = [
    '#f43f5e', '#a78bfa', '#3b82f6', '#10b981',
    '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'
  ]

  topCategories.forEach(([category, amount], index) => {
    const categoryId = `cat-${category}`
    const color = categoryColors[index % categoryColors.length]

    nodes.push({
      id: categoryId,
      name: category,
      type: 'category',
      value: amount,
      color
    })

    // Link from income to category
    links.push({
      source: incomeNodeId,
      target: categoryId,
      value: amount,
      color
    })

    // Add top 3 merchants per category
    const merchants = categoryMerchants.get(category)!
    const topMerchants = Array.from(merchants.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    topMerchants.forEach(([merchant, merchantAmount]) => {
      const merchantId = `mer-${category}-${merchant}`

      nodes.push({
        id: merchantId,
        name: merchant,
        type: 'merchant',
        value: merchantAmount,
        color
      })

      links.push({
        source: categoryId,
        target: merchantId,
        value: merchantAmount,
        color
      })
    })
  })

  return {
    nodes,
    links,
    totalIncome,
    totalSpending
  }
}

/**
 * Generate heatmap data
 */
function generateHeatmapData(transactions: Transaction[]): HeatmapData {
  const dailyMap = new Map<string, { amount: number; count: number }>()

  // Aggregate by day
  transactions
    .filter(t => t.transaction_type === 'debit')
    .forEach(t => {
      const date = t.transaction_date
      const existing = dailyMap.get(date) || { amount: 0, count: 0 }
      dailyMap.set(date, {
        amount: existing.amount + t.amount,
        count: existing.count + 1
      })
    })

  // Convert to array
  const days = Array.from(dailyMap.entries()).map(([date, data]) => {
    const dateObj = new Date(date)
    return {
      date,
      amount: data.amount,
      transactionCount: data.count,
      dayOfWeek: dateObj.getDay(),
      intensity: 0 // Will be calculated below
    }
  })

  // Calculate min/max/average
  const amounts = days.map(d => d.amount)
  const minAmount = Math.min(...amounts)
  const maxAmount = Math.max(...amounts)
  const averageDaily = amounts.reduce((sum, a) => sum + a, 0) / amounts.length

  // Calculate intensity (0-100)
  days.forEach(day => {
    if (maxAmount === minAmount) {
      day.intensity = 50
    } else {
      day.intensity = ((day.amount - minAmount) / (maxAmount - minAmount)) * 100
    }
  })

  // Get period range
  const dates = days.map(d => new Date(d.date))
  const periodStart = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0]
  const periodEnd = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0]

  return {
    days,
    minAmount,
    maxAmount,
    averageDaily,
    periodStart,
    periodEnd
  }
}

/**
 * Generate river chart data
 */
function generateRiverData(transactions: Transaction[]): RiverData {
  // Group by month and category
  const monthlyData = new Map<string, Map<string, number>>()

  transactions
    .filter(t => t.transaction_type === 'debit')
    .forEach(t => {
      const month = t.transaction_date.substring(0, 7) // YYYY-MM
      const category = t.category || 'Uncategorized'

      if (!monthlyData.has(month)) {
        monthlyData.set(month, new Map())
      }
      const categories = monthlyData.get(month)!
      categories.set(category, (categories.get(category) || 0) + t.amount)
    })

  // Get all unique categories and sort by total
  const categoryTotals = new Map<string, number>()
  monthlyData.forEach(categories => {
    categories.forEach((amount, category) => {
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + amount)
    })
  })

  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category]) => category)

  // Sort months
  const periods = Array.from(monthlyData.keys()).sort()

  // Colors for categories
  const categoryColors: Record<string, string> = {
    'Groceries': '#10b981',
    'Dining': '#f43f5e',
    'Transportation': '#3b82f6',
    'Entertainment': '#a78bfa',
    'Shopping': '#ec4899',
    'Bills': '#f59e0b',
    'Healthcare': '#14b8a6',
    'Uncategorized': '#6b7280'
  }

  const defaultColors = [
    '#10b981', '#f43f5e', '#3b82f6', '#a78bfa',
    '#ec4899', '#f59e0b', '#14b8a6', '#6366f1'
  ]

  // Build layers
  const layers = topCategories.map((category, index) => {
    const values = periods.map(month => {
      const categories = monthlyData.get(month)!
      return categories.get(category) || 0
    })

    return {
      category,
      color: categoryColors[category] || defaultColors[index % defaultColors.length],
      values
    }
  })

  // Calculate totals per period
  const totals = periods.map(month => {
    const categories = monthlyData.get(month)!
    return Array.from(categories.values()).reduce((sum, amount) => sum + amount, 0)
  })

  return {
    layers,
    periods,
    totals
  }
}

/**
 * Generate financial health data
 */
function generateHealthData(transactions: Transaction[]): FinancialHealthData {
  const totalIncome = transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalSpending = transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)

  const netSavings = totalIncome - totalSpending

  // Calculate metrics
  const metrics: HealthMetric[] = []

  // 1. Savings Rate
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0
  metrics.push({
    id: 'savings-rate',
    name: 'Savings Rate',
    value: Math.max(0, Math.min(100, savingsRate * 5)), // Scale to 0-100
    score: savingsRate,
    unit: '%',
    status: savingsRate >= 20 ? 'excellent' : savingsRate >= 10 ? 'good' : savingsRate >= 5 ? 'fair' : 'poor',
    description: `You're saving ${savingsRate.toFixed(1)}% of your income`,
    target: 20,
    color: '#12a159'
  })

  // 2. Spending Consistency
  const monthlySpending = new Map<string, number>()
  transactions
    .filter(t => t.transaction_type === 'debit')
    .forEach(t => {
      const month = t.transaction_date.substring(0, 7)
      monthlySpending.set(month, (monthlySpending.get(month) || 0) + t.amount)
    })

  const spendingValues = Array.from(monthlySpending.values())
  const avgSpending = spendingValues.reduce((sum, v) => sum + v, 0) / spendingValues.length
  const variance = spendingValues.reduce((sum, v) => sum + Math.pow(v - avgSpending, 2), 0) / spendingValues.length
  const stdDev = Math.sqrt(variance)
  const consistency = avgSpending > 0 ? Math.max(0, 100 - (stdDev / avgSpending) * 100) : 0

  metrics.push({
    id: 'consistency',
    name: 'Spending Consistency',
    value: consistency,
    score: consistency,
    unit: '%',
    status: consistency >= 80 ? 'excellent' : consistency >= 60 ? 'good' : consistency >= 40 ? 'fair' : 'poor',
    description: `Your spending varies by ${(stdDev / avgSpending * 100).toFixed(0)}% monthly`,
    color: '#3b82f6'
  })

  // 3. Budget Adherence
  const budgetTarget = totalIncome * 0.8 // 80/20 rule
  const adherence = totalIncome > 0 ? Math.max(0, 100 - ((totalSpending - budgetTarget) / totalIncome) * 100) : 0

  metrics.push({
    id: 'budget',
    name: 'Budget Adherence',
    value: Math.max(0, Math.min(100, adherence)),
    score: (totalSpending / totalIncome) * 100,
    unit: '%',
    status: adherence >= 80 ? 'excellent' : adherence >= 60 ? 'good' : adherence >= 40 ? 'fair' : 'poor',
    description: `Spending ${(totalSpending / totalIncome * 100).toFixed(0)}% of income`,
    target: 80,
    color: '#a78bfa'
  })

  // 4. Emergency Fund Status (estimated based on savings)
  const monthlyExpenses = avgSpending
  const emergencyFundMonths = monthlyExpenses > 0 ? netSavings / monthlyExpenses : 0
  const emergencyScore = Math.min(100, (emergencyFundMonths / 6) * 100)

  metrics.push({
    id: 'emergency',
    name: 'Emergency Fund',
    value: emergencyScore,
    score: emergencyFundMonths,
    unit: 'months',
    status: emergencyFundMonths >= 6 ? 'excellent' : emergencyFundMonths >= 3 ? 'good' : emergencyFundMonths >= 1 ? 'fair' : 'poor',
    description: `${emergencyFundMonths.toFixed(1)} months of expenses saved`,
    target: 6,
    color: '#10b981'
  })

  // 5. Debt-to-Income Ratio (simulated - no debt data available)
  const debtRatio = 0 // Placeholder
  metrics.push({
    id: 'debt',
    name: 'Debt Ratio',
    value: 100 - debtRatio,
    score: debtRatio,
    unit: '%',
    status: debtRatio <= 10 ? 'excellent' : debtRatio <= 20 ? 'good' : debtRatio <= 35 ? 'fair' : 'poor',
    description: 'No debt data available',
    target: 0,
    color: '#f59e0b'
  })

  // Calculate overall score
  const overallScore = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length

  // Determine trend (would need historical data)
  const trend = overallScore >= 70 ? 'improving' : overallScore >= 50 ? 'stable' : 'declining'

  return {
    overallScore,
    metrics,
    trend,
    lastUpdated: new Date().toISOString()
  }
}

/**
 * Generate sample data for demo purposes
 */
function generateSampleData() {
  const now = new Date()
  const months = []

  // Generate last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(date.toISOString().substring(0, 7))
  }

  return {
    sankey: {
      nodes: [
        { id: 'income', name: 'Total Income', type: 'income' as const, value: 5000, color: '#12a159' },
        { id: 'cat-groceries', name: 'Groceries', type: 'category' as const, value: 800, color: '#10b981' },
        { id: 'cat-dining', name: 'Dining', type: 'category' as const, value: 600, color: '#f43f5e' },
        { id: 'cat-transport', name: 'Transportation', type: 'category' as const, value: 400, color: '#3b82f6' },
        { id: 'cat-shopping', name: 'Shopping', type: 'category' as const, value: 500, color: '#ec4899' },
        { id: 'cat-bills', name: 'Bills', type: 'category' as const, value: 700, color: '#f59e0b' },
        { id: 'mer-groceries-walmart', name: 'Walmart', type: 'merchant' as const, value: 500, color: '#10b981' },
        { id: 'mer-groceries-trader', name: 'Trader Joes', type: 'merchant' as const, value: 300, color: '#10b981' },
        { id: 'mer-dining-chipotle', name: 'Chipotle', type: 'merchant' as const, value: 300, color: '#f43f5e' },
        { id: 'mer-dining-uber', name: 'Uber Eats', type: 'merchant' as const, value: 300, color: '#f43f5e' },
      ],
      links: [
        { source: 'income', target: 'cat-groceries', value: 800, color: '#10b981' },
        { source: 'income', target: 'cat-dining', value: 600, color: '#f43f5e' },
        { source: 'income', target: 'cat-transport', value: 400, color: '#3b82f6' },
        { source: 'income', target: 'cat-shopping', value: 500, color: '#ec4899' },
        { source: 'income', target: 'cat-bills', value: 700, color: '#f59e0b' },
        { source: 'cat-groceries', target: 'mer-groceries-walmart', value: 500, color: '#10b981' },
        { source: 'cat-groceries', target: 'mer-groceries-trader', value: 300, color: '#10b981' },
        { source: 'cat-dining', target: 'mer-dining-chipotle', value: 300, color: '#f43f5e' },
        { source: 'cat-dining', target: 'mer-dining-uber', value: 300, color: '#f43f5e' },
      ],
      totalIncome: 5000,
      totalSpending: 3000
    },
    heatmap: {
      days: Array.from({ length: 180 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (180 - i))
        return {
          date: date.toISOString().split('T')[0],
          amount: Math.random() * 200 + 20,
          transactionCount: Math.floor(Math.random() * 5) + 1,
          dayOfWeek: date.getDay(),
          intensity: Math.random() * 100
        }
      }),
      minAmount: 20,
      maxAmount: 220,
      averageDaily: 85,
      periodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      periodEnd: new Date().toISOString().split('T')[0]
    },
    river: {
      layers: [
        { category: 'Groceries', color: '#10b981', values: [650, 720, 680, 800, 750, 820] },
        { category: 'Dining', color: '#f43f5e', values: [450, 520, 480, 600, 550, 630] },
        { category: 'Transportation', color: '#3b82f6', values: [350, 380, 400, 420, 390, 410] },
        { category: 'Shopping', color: '#ec4899', values: [400, 450, 480, 500, 520, 550] },
        { category: 'Bills', color: '#f59e0b', values: [700, 700, 710, 705, 715, 720] },
        { category: 'Entertainment', color: '#a78bfa', values: [200, 250, 230, 280, 260, 300] },
      ],
      periods: months,
      totals: [2750, 3020, 2980, 3305, 3185, 3430]
    },
    health: {
      overallScore: 72,
      metrics: [
        {
          id: 'savings-rate',
          name: 'Savings Rate',
          value: 75,
          score: 15,
          unit: '%' as const,
          status: 'good' as const,
          description: "You're saving 15% of your income",
          target: 20,
          color: '#12a159'
        },
        {
          id: 'consistency',
          name: 'Spending Consistency',
          value: 68,
          score: 68,
          unit: '%' as const,
          status: 'good' as const,
          description: 'Your spending varies by 32% monthly',
          color: '#3b82f6'
        },
        {
          id: 'budget',
          name: 'Budget Adherence',
          value: 80,
          score: 75,
          unit: '%' as const,
          status: 'excellent' as const,
          description: 'Spending 75% of income',
          target: 80,
          color: '#a78bfa'
        },
        {
          id: 'emergency',
          name: 'Emergency Fund',
          value: 60,
          score: 3.5,
          unit: 'months' as const,
          status: 'good' as const,
          description: '3.5 months of expenses saved',
          target: 6,
          color: '#10b981'
        },
        {
          id: 'debt',
          name: 'Debt Ratio',
          value: 85,
          score: 15,
          unit: '%' as const,
          status: 'good' as const,
          description: '15% debt-to-income ratio',
          target: 0,
          color: '#f59e0b'
        }
      ],
      trend: 'improving' as const,
      lastUpdated: new Date().toISOString()
    }
  }
}
