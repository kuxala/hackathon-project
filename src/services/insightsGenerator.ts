import type { Transaction, AIInsight } from '@/types/database'

interface SpendingByCategory {
  [category: string]: {
    total: number
    count: number
    percentage: number
  }
}

interface MonthlySpending {
  month: string
  total: number
  credits: number
  debits: number
}

/**
 * Analyze spending patterns and generate insights
 */
export async function generateInsights(
  transactions: Transaction[],
  userId: string
): Promise<Partial<AIInsight>[]> {
  if (transactions.length === 0) {
    return []
  }

  const insights: Partial<AIInsight>[] = []

  // Calculate basic statistics
  const stats = calculateStatistics(transactions)

  // 1. Spending Pattern Analysis
  const spendingPatterns = await analyzeSpendingPatterns(stats, userId)
  insights.push(...spendingPatterns)

  // 2. Budget Recommendations
  const budgetRecs = generateBudgetRecommendations(stats, userId)
  insights.push(...budgetRecs)

  // 3. Anomaly Detection
  const anomalies = detectAnomalies(transactions, userId)
  insights.push(...anomalies)

  // 4. Saving Opportunities
  const savings = identifySavingOpportunities(stats, userId)
  insights.push(...savings)

  // 5. Trend Analysis
  const trends = analyzeTrends(stats, userId)
  insights.push(...trends)

  return insights
}

/**
 * Calculate comprehensive statistics
 */
function calculateStatistics(transactions: Transaction[]) {
  const byCategory: SpendingByCategory = {}
  const byMonth: { [key: string]: MonthlySpending } = {}
  let totalDebits = 0
  let totalCredits = 0
  const now = new Date()

  transactions.forEach(t => {
    // Skip future transactions
    const transactionDate = new Date(t.transaction_date)
    if (transactionDate > now) {
      return
    }

    // By category
    const category = t.category || 'Uncategorized'
    if (!byCategory[category]) {
      byCategory[category] = { total: 0, count: 0, percentage: 0 }
    }

    if (t.transaction_type === 'debit') {
      byCategory[category].total += t.amount
      byCategory[category].count++
      totalDebits += t.amount
    } else {
      totalCredits += t.amount
    }

    // By month
    const month = t.transaction_date.substring(0, 7) // YYYY-MM
    if (!byMonth[month]) {
      byMonth[month] = { month, total: 0, credits: 0, debits: 0 }
    }

    if (t.transaction_type === 'debit') {
      byMonth[month].debits += t.amount
      byMonth[month].total += t.amount
    } else {
      byMonth[month].credits += t.amount
    }
  })

  // Calculate percentages
  Object.keys(byCategory).forEach(cat => {
    byCategory[cat].percentage = (byCategory[cat].total / totalDebits) * 100
  })

  const monthlyData = Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))

  return {
    byCategory,
    monthlyData,
    totalDebits,
    totalCredits,
    netIncome: totalCredits - totalDebits,
    averageMonthlySpending: monthlyData.length > 0
      ? monthlyData.reduce((sum, m) => sum + m.debits, 0) / monthlyData.length
      : 0,
    transactionCount: transactions.length
  }
}

/**
 * Analyze spending patterns using AI
 */
async function analyzeSpendingPatterns(
  stats: ReturnType<typeof calculateStatistics>,
  userId: string
): Promise<Partial<AIInsight>[]> {
  // AI disabled for performance - using rule-based insights only
  const topCategories = Object.entries(stats.byCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)

  /* AI DISABLED FOR PERFORMANCE
  const prompt = `You are a financial analyst AI. Analyze spending data and generate insights with chart-ready data.

TRANSACTION DATA:
Total Transactions: ${stats.transactionCount}
Total Spending (Debits): ₾${stats.totalDebits.toFixed(2)}
Total Income (Credits): ₾${stats.totalCredits.toFixed(2)}
Net Balance: ₾${stats.netIncome.toFixed(2)}
Average Monthly Spending: ₾${stats.averageMonthlySpending.toFixed(2)}

TOP SPENDING CATEGORIES:
${topCategories.map(([cat, data]) =>
  `- ${cat}: ₾${data.total.toFixed(2)} (${data.percentage.toFixed(1)}%, ${data.count} transactions)`
).join('\n')}

MONTHLY BREAKDOWN:
${stats.monthlyData.map(m =>
  `- ${m.month}: Income ₾${m.credits.toFixed(2)}, Spent ₾${m.debits.toFixed(2)}`
).join('\n')}

Generate 2-3 financial insights in this EXACT JSON format:
[
  {
    "title": "Brief insight title (e.g., 'Dining Spending Increased')",
    "description": "2-3 sentence detailed explanation of the pattern or issue",
    "severity": "info" | "warning" | "critical",
    "chartData": {
      "monthlyTrend": {
        "months": ["2024-10", "2024-11", ...],
        "income": [5200, 5400, ...],
        "spending": [4100, 4500, ...]
      },
      "categoryBreakdown": {
        "categories": [
          {"name": "Groceries", "amount": 654.21, "percentage": 22.0, "color": "green"},
          {"name": "Dining", "amount": 847.32, "percentage": 28.5, "color": "rose"},
          {"name": "Transportation", "amount": 432.15, "percentage": 14.5, "color": "blue"},
          {"name": "Entertainment", "amount": 298.50, "percentage": 10.0, "color": "purple"}
        ]
      },
      "budget": {
        "totalBudget": ${(stats.totalCredits * 0.8).toFixed(2)},
        "totalSpent": ${stats.totalDebits.toFixed(2)},
        "utilizationPercentage": ${stats.totalCredits > 0 ? ((stats.totalDebits / stats.totalCredits) * 100).toFixed(1) : 0},
        "forecastEndOfMonth": ${(stats.averageMonthlySpending * 1.1).toFixed(2)}
      }
    }
  }
]

IMPORTANT RULES:
1. Use the ACTUAL monthly data provided above to populate "months", "income", and "spending" arrays
2. Ensure array lengths match (same number of months for income and spending)
3. Use top 4-6 categories from the data provided
4. Assign colors: green/emerald for necessities, rose/amber for high spending, blue/purple for discretionary
5. Calculate realistic budget numbers based on the income/spending data
6. Return ONLY valid JSON, no markdown formatting, no code blocks, no explanations
7. Make sure all numbers are rounded to 2 decimal places`

  // AI DISABLED - Skip to fallback
  /*
  try {
    const response = await sendMessage(prompt, 'insights-bot', [])
    const jsonMatch = response.message.match(/\[[\s\S]*\]/)

    if (jsonMatch) {
      const aiInsights = JSON.parse(jsonMatch[0])
      return aiInsights.map((insight: Record<string, unknown>) => ({
        user_id: userId,
        insight_type: 'spending_pattern' as const,
        title: String(insight.title),
        description: String(insight.description),
        severity: (insight.severity as 'info' | 'warning' | 'critical') || 'info',
        data: insight.chartData || { stats, analysis: insight },
        is_read: false,
        is_dismissed: false
      }))
    }
  } catch (error) {
    console.error('AI spending pattern analysis error:', error)
  }
  */

  // Calculate meaningful monthly metrics (not lifetime totals!)
  const avgMonthlyIncome = stats.monthlyData.length > 0
    ? stats.monthlyData.reduce((sum, m) => sum + m.credits, 0) / stats.monthlyData.length
    : 0
  const avgMonthlySpending = stats.monthlyData.length > 0
    ? stats.monthlyData.reduce((sum, m) => sum + m.debits, 0) / stats.monthlyData.length
    : 0
  const lastMonthSpending = stats.monthlyData.length > 0
    ? stats.monthlyData[stats.monthlyData.length - 1].debits
    : 0
  const savingsRate = avgMonthlyIncome > 0
    ? ((avgMonthlyIncome - avgMonthlySpending) / avgMonthlyIncome) * 100
    : 0

  // Calculate month-over-month trend
  const trendPercentage = stats.monthlyData.length >= 2
    ? ((stats.monthlyData[stats.monthlyData.length - 1].debits - stats.monthlyData[stats.monthlyData.length - 2].debits)
       / stats.monthlyData[stats.monthlyData.length - 2].debits) * 100
    : 0

  // Rule-based insight with chart data (no AI for performance)
  const fallbackChartData = {
    monthlyTrend: {
      months: stats.monthlyData.map(m => m.month),
      income: stats.monthlyData.map(m => m.credits),
      spending: stats.monthlyData.map(m => m.debits)
    },
    categoryBreakdown: {
      categories: topCategories.slice(0, 4).map(([name, data]) => ({
        name,
        amount: data.total,
        percentage: data.percentage,
        color: (data.percentage > 25 ? 'rose' : data.percentage > 15 ? 'amber' : 'green') as 'emerald' | 'green' | 'rose' | 'amber' | 'blue' | 'purple'
      }))
    },
    budget: {
      // CORRECTED: Use monthly averages, not lifetime totals
      averageMonthlySpending: avgMonthlySpending,
      averageMonthlyIncome: avgMonthlyIncome,
      savingsRate: savingsRate,
      lastMonthSpending: lastMonthSpending,
      trendPercentage: trendPercentage
    }
  }

  return [{
    user_id: userId,
    insight_type: 'spending_pattern',
    title: 'Spending Analysis Complete',
    description: `You spent ₾${stats.totalDebits.toFixed(2)} across ${stats.transactionCount} transactions.`,
    severity: 'info',
    data: fallbackChartData,
    is_read: false,
    is_dismissed: false
  }]
}

/**
 * Generate budget recommendations
 */
function generateBudgetRecommendations(
  stats: ReturnType<typeof calculateStatistics>,
  userId: string
): Partial<AIInsight>[] {
  const insights: Partial<AIInsight>[] = []

  // 50/30/20 rule recommendation
  const needs = stats.averageMonthlySpending * 0.5
  const wants = stats.averageMonthlySpending * 0.3
  const savings = stats.averageMonthlySpending * 0.2

  insights.push({
    user_id: userId,
    insight_type: 'budget_recommendation',
    title: '50/30/20 Budget Rule',
    description: `Based on your average monthly spending of ₾${stats.averageMonthlySpending.toFixed(2)}, consider allocating: ₾${needs.toFixed(2)} for needs (50%), ₾${wants.toFixed(2)} for wants (30%), and ₾${savings.toFixed(2)} for savings (20%).`,
    severity: 'info',
    data: { needs, wants, savings, currentSpending: stats.averageMonthlySpending },
    is_read: false,
    is_dismissed: false
  })

  // Category-specific recommendations
  Object.entries(stats.byCategory).forEach(([category, data]) => {
    if (data.percentage > 30 && category !== 'Income') {
      insights.push({
        user_id: userId,
        insight_type: 'budget_recommendation',
        title: `High ${category} Spending`,
        description: `${category} represents ${data.percentage.toFixed(1)}% of your spending (₾${data.total.toFixed(2)}). Consider setting a monthly budget to track this category.`,
        severity: 'warning',
        data: { category, ...data },
        is_read: false,
        is_dismissed: false
      })
    }
  })

  return insights
}

/**
 * Detect spending anomalies
 */
function detectAnomalies(
  transactions: Transaction[],
  userId: string
): Partial<AIInsight>[] {
  const insights: Partial<AIInsight>[] = []

  // Calculate average transaction amount by category
  const categoryAverages: { [key: string]: { avg: number; stdDev: number } } = {}

  transactions.forEach(t => {
    if (t.transaction_type === 'debit') {
      const cat = t.category || 'Uncategorized'
      if (!categoryAverages[cat]) {
        categoryAverages[cat] = { avg: 0, stdDev: 0 }
      }
    }
  })

  // Calculate averages and standard deviations
  Object.keys(categoryAverages).forEach(cat => {
    const amounts = transactions
      .filter(t => (t.category || 'Uncategorized') === cat && t.transaction_type === 'debit')
      .map(t => t.amount)

    if (amounts.length > 0) {
      const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length
      const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length
      categoryAverages[cat] = { avg, stdDev: Math.sqrt(variance) }
    }
  })

  // Find outliers (> 2 standard deviations)
  transactions.forEach(t => {
    if (t.transaction_type === 'debit') {
      const cat = t.category || 'Uncategorized'
      const stats = categoryAverages[cat]

      if (stats && t.amount > stats.avg + 2 * stats.stdDev) {
        insights.push({
          user_id: userId,
          insight_type: 'anomaly',
          title: `Unusual ${cat} Transaction`,
          description: `A transaction of ₾${t.amount.toFixed(2)} at ${t.merchant || t.description} is significantly higher than your typical ${cat} spending (avg: ₾${stats.avg.toFixed(2)}).`,
          severity: t.amount > stats.avg + 3 * stats.stdDev ? 'critical' : 'warning',
          data: { transaction: t, average: stats.avg, stdDev: stats.stdDev },
          is_read: false,
          is_dismissed: false
        })
      }
    }
  })

  return insights
}

/**
 * Identify saving opportunities
 */
function identifySavingOpportunities(
  stats: ReturnType<typeof calculateStatistics>,
  userId: string
): Partial<AIInsight>[] {
  const insights: Partial<AIInsight>[] = []

  // Check for positive cashflow
  if (stats.netIncome > 0) {
    const savingsRate = (stats.netIncome / stats.totalCredits) * 100

    insights.push({
      user_id: userId,
      insight_type: 'saving_opportunity',
      title: 'Positive Cash Flow',
      description: `You're saving ${savingsRate.toFixed(1)}% of your income (₾${stats.netIncome.toFixed(2)}). ${savingsRate < 20 ? 'Consider increasing to 20% for better financial health.' : 'Great job!'}`,
      severity: savingsRate < 10 ? 'warning' : 'info',
      data: { netIncome: stats.netIncome, savingsRate },
      is_read: false,
      is_dismissed: false
    })
  }

  // Identify high-frequency low-value transactions (potential waste)
  Object.entries(stats.byCategory).forEach(([category, data]) => {
    if (data.count > 20 && data.total / data.count < 10) {
      insights.push({
        user_id: userId,
        insight_type: 'saving_opportunity',
        title: `Frequent Small ${category} Purchases`,
        description: `You made ${data.count} ${category} transactions averaging ₾${(data.total / data.count).toFixed(2)} each, totaling ₾${data.total.toFixed(2)}. These small purchases can add up quickly.`,
        severity: 'info',
        data: { category, ...data },
        is_read: false,
        is_dismissed: false
      })
    }
  })

  return insights
}

/**
 * Analyze spending trends
 */
function analyzeTrends(
  stats: ReturnType<typeof calculateStatistics>,
  userId: string
): Partial<AIInsight>[] {
  const insights: Partial<AIInsight>[] = []

  if (stats.monthlyData.length < 2) {
    return insights
  }

  // Compare last month to previous month
  const lastMonth = stats.monthlyData[stats.monthlyData.length - 1]
  const prevMonth = stats.monthlyData[stats.monthlyData.length - 2]

  const spendingChange = ((lastMonth.debits - prevMonth.debits) / prevMonth.debits) * 100

  if (Math.abs(spendingChange) > 10) {
    insights.push({
      user_id: userId,
      insight_type: 'trend_analysis',
      title: spendingChange > 0 ? 'Spending Increased' : 'Spending Decreased',
      description: `Your spending ${spendingChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(spendingChange).toFixed(1)}% compared to the previous month (from ₾${prevMonth.debits.toFixed(2)} to ₾${lastMonth.debits.toFixed(2)}).`,
      severity: spendingChange > 20 ? 'warning' : 'info',
      data: { lastMonth, prevMonth, change: spendingChange },
      is_read: false,
      is_dismissed: false
    })
  }

  return insights
}
