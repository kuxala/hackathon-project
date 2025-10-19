import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chat } from '@/lib/openrouter'
import {
  analyzePaydayEffect,
  analyzeMerchantPatterns,
  detectAnomalies,
  detectSubscriptions,
  analyzeCategoryTrends
} from './advanced-analytics'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface Insight {
  id: string
  type: 'success' | 'warning' | 'info' | 'tip'
  title: string
  description: string
  action?: string
  icon: string
}

interface SpendingSummary {
  totalIncome: number
  totalSpending: number
  netSavings: number
  topCategory: string
  topCategoryAmount: number
  transactionCount: number
  averageTransaction: number
  categorizedPercent: number
}

/**
 * GET /api/insights-smart - Get existing insights and summary
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(1000)

    if (txError) {
      console.error('Fetch transactions error:', txError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        insights: [],
        summary: null
      })
    }

    // Calculate summary
    const summary = calculateSummary(transactions)

    // Generate basic rule-based insights
    const insights = generateBasicInsights(transactions, summary)

    return NextResponse.json({
      success: true,
      insights,
      summary
    })

  } catch (error) {
    console.error('GET /api/insights-smart error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/insights-smart - Generate AI-powered insights
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Fetch transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(500)

    if (txError) {
      console.error('Fetch transactions error:', txError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch transactions' },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        insights: [],
        summary: null
      })
    }

    // Calculate summary
    const summary = calculateSummary(transactions)

    // Generate AI insights
    const insights = await generateAIInsights(transactions, summary)

    return NextResponse.json({
      success: true,
      insights,
      summary
    })

  } catch (error) {
    console.error('POST /api/insights-smart error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateSummary(transactions: any[]): SpendingSummary {
  let totalIncome = 0
  let totalSpending = 0
  const categoryTotals: Record<string, number> = {}

  transactions.forEach(t => {
    if (t.transaction_type === 'credit') {
      totalIncome += t.amount
    } else {
      totalSpending += t.amount

      const category = t.category || 'Uncategorized'
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount
    }
  })

  const topCategory = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0] || ['None', 0]

  const categorized = transactions.filter(t => t.category && t.category !== 'Uncategorized' && t.category !== '').length
  const categorizedPercent = (categorized / transactions.length) * 100

  return {
    totalIncome,
    totalSpending,
    netSavings: totalIncome - totalSpending,
    topCategory: topCategory[0],
    topCategoryAmount: topCategory[1],
    transactionCount: transactions.length,
    averageTransaction: totalSpending / transactions.filter(t => t.transaction_type === 'debit').length || 0,
    categorizedPercent
  }
}

function generateBasicInsights(transactions: any[], summary: SpendingSummary): Insight[] {
  const insights: Insight[] = []

  // Savings insight
  if (summary.netSavings > 0) {
    insights.push({
      id: 'savings-positive',
      type: 'success',
      title: 'Great job saving!',
      description: `You saved $${summary.netSavings.toFixed(2)} from your income. That's ${((summary.netSavings / summary.totalIncome) * 100).toFixed(1)}% of your total income.`,
      icon: '💰',
      action: 'Keep up the good work and consider increasing your savings rate to 20%.'
    })
  } else if (summary.netSavings < 0) {
    insights.push({
      id: 'savings-negative',
      type: 'warning',
      title: 'Spending more than earning',
      description: `You spent $${Math.abs(summary.netSavings).toFixed(2)} more than you earned. This could lead to debt if it continues.`,
      icon: '⚠️',
      action: 'Review your expenses and identify areas where you can cut back.'
    })
  }

  // Top category insight
  if (summary.topCategory !== 'None') {
    const percentage = (summary.topCategoryAmount / summary.totalSpending) * 100
    insights.push({
      id: 'top-category',
      type: 'info',
      title: `${summary.topCategory} is your biggest expense`,
      description: `You spent $${summary.topCategoryAmount.toFixed(2)} on ${summary.topCategory}, which is ${percentage.toFixed(1)}% of your total spending.`,
      icon: '📊'
    })
  }

  // Categorization insight
  if (summary.categorizedPercent < 50) {
    insights.push({
      id: 'categorization-low',
      type: 'tip',
      title: 'Categorize your transactions',
      description: `Only ${summary.categorizedPercent.toFixed(0)}% of your transactions are categorized. Categorizing helps you understand your spending patterns better.`,
      icon: '🏷️',
      action: 'Go to Statements page and use the "Categorize All" button.'
    })
  }

  return insights
}

async function generateAIInsights(transactions: any[], summary: SpendingSummary): Insight[] {
  const insights: Insight[] = []

  try {
    console.log('🔍 Running advanced analytics on', transactions.length, 'transactions')

    // RUN ALL ADVANCED ANALYTICS
    const allAnalytics = [
      analyzeTimeBehavior(transactions),
      analyzeCashFlow(transactions, summary),
      analyzeOpportunityCost(transactions),
      analyzePaydayEffect(transactions),
      analyzeMerchantPatterns(transactions),
      detectAnomalies(transactions),
      detectSubscriptions(transactions),
      analyzeCategoryTrends(transactions)
    ]

    // Add all non-null insights
    allAnalytics.forEach(insight => {
      if (insight) insights.push(insight)
    })

    // Add standard insights
    const additionalInsights = generateAdditionalInsights(transactions, summary)
    insights.push(...additionalInsights)

    console.log('✅ Generated', insights.length, 'insights')

    return insights
  } catch (error) {
    console.error('Error generating AI insights:', error)
    return generateBasicInsights(transactions, summary)
  }
}

function analyzeTimeBehavior(transactions: any[]): Insight | null {
  try {
    const hourlySpending: Record<number, number> = {}
    const weekdaySpending: Record<number, number> = {}

    transactions.forEach(t => {
      if (t.transaction_type === 'debit' && t.transaction_date) {
        const date = new Date(t.transaction_date)
        const hour = date.getHours()
        const day = date.getDay()

        hourlySpending[hour] = (hourlySpending[hour] || 0) + t.amount
        weekdaySpending[day] = (weekdaySpending[day] || 0) + t.amount
      }
    })

    // Find peak spending hours
    const hourlyTotals = Object.entries(hourlySpending).map(([hour, amount]) => ({
      hour: parseInt(hour),
      amount
    })).sort((a, b) => b.amount - a.amount)

    if (hourlyTotals.length > 0) {
      const totalSpending = Object.values(hourlySpending).reduce((sum, val) => sum + val, 0)

      // Check for late-night spending (8 PM - 11 PM)
      const lateNightSpending = [20, 21, 22, 23].reduce((sum, hour) => sum + (hourlySpending[hour] || 0), 0)
      const lateNightPercent = (lateNightSpending / totalSpending) * 100

      if (lateNightPercent > 25) {
        return {
          id: 'time-behavior',
          type: 'warning',
          title: '🌙 Night Owl Spender Detected',
          description: `You spend ${lateNightPercent.toFixed(0)}% of your money between 8-11 PM. That's $${lateNightSpending.toFixed(0)} in late-night purchases this period.`,
          action: 'Try the "wait 24 hours" rule for evening purchases. You might save 30-40% monthly.',
          icon: '🌙'
        }
      }

      // Weekend vs Weekday analysis
      const weekendSpendingTotal = (weekdaySpending[0] || 0) + (weekdaySpending[6] || 0)
      const weekdaySpendingTotal = [1, 2, 3, 4, 5].reduce((sum, day) => sum + (weekdaySpending[day] || 0), 0)
      const avgWeekendDay = weekendSpendingTotal / 2
      const avgWeekday = weekdaySpendingTotal / 5
      const weekendMultiplier = avgWeekendDay / avgWeekday

      if (weekendMultiplier > 1.5) {
        return {
          id: 'time-behavior',
          type: 'info',
          title: '📅 Weekend Warrior',
          description: `You spend ${((weekendMultiplier - 1) * 100).toFixed(0)}% more on weekends ($${avgWeekendDay.toFixed(0)}/day) vs weekdays ($${avgWeekday.toFixed(0)}/day).`,
          action: 'Plan weekend activities in advance to avoid impulse spending. Could save $' + ((avgWeekendDay - avgWeekday) * 8).toFixed(0) + '/month.',
          icon: '📅'
        }
      }
    }

    return null
  } catch (error) {
    console.error('Time behavior analysis error:', error)
    return null
  }
}

function analyzeCashFlow(transactions: any[], summary: SpendingSummary): Insight | null {
  try {
    // Get monthly spending pattern
    const monthlyData: Record<string, { spending: number, income: number, count: number }> = {}

    transactions.forEach(t => {
      const month = t.transaction_date.substring(0, 7)
      if (!monthlyData[month]) {
        monthlyData[month] = { spending: 0, income: 0, count: 0 }
      }

      if (t.transaction_type === 'debit') {
        monthlyData[month].spending += t.amount
        monthlyData[month].count++
      } else {
        monthlyData[month].income += t.amount
      }
    })

    const months = Object.entries(monthlyData).sort()

    if (months.length >= 2) {
      const lastMonth = months[months.length - 1][1]
      const avgMonthlySpending = months.reduce((sum, [_, data]) => sum + data.spending, 0) / months.length
      const avgDailySpending = avgMonthlySpending / 30

      // Predict next month
      const today = new Date()
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      const dayOfMonth = today.getDate()
      const daysRemaining = daysInMonth - dayOfMonth

      const projectedMonthSpending = lastMonth.spending + (avgDailySpending * daysRemaining)
      const projectedMonthIncome = summary.totalIncome
      const projectedShortfall = projectedMonthSpending - projectedMonthIncome

      if (projectedShortfall > 50) {
        const daysUntilShortfall = Math.floor((projectedMonthIncome - lastMonth.spending) / avgDailySpending)
        const shortfallDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysUntilShortfall)

        return {
          id: 'cashflow-prediction',
          type: 'warning',
          title: '⚠️ Cash Crunch Incoming',
          description: `Based on your spending pattern ($${avgDailySpending.toFixed(2)}/day), you'll run short by $${projectedShortfall.toFixed(0)} around ${shortfallDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
          action: `Reduce daily spending by $${(projectedShortfall / daysRemaining).toFixed(2)} to stay balanced.`,
          icon: '⚠️'
        }
      } else if (projectedShortfall < -100) {
        return {
          id: 'cashflow-prediction',
          type: 'success',
          title: '💰 Surplus Ahead',
          description: `You're on track to have $${Math.abs(projectedShortfall).toFixed(0)} left over this month. Great pacing!`,
          action: `Consider moving this to savings or investments automatically.`,
          icon: '💰'
        }
      }

      // Annual projection
      const annualSpending = avgMonthlySpending * 12
      const annualIncome = summary.totalIncome * 12

      return {
        id: 'cashflow-annual',
        type: 'info',
        title: '📈 Annual Projection',
        description: `At current pace: $${annualSpending.toFixed(0)}/year spending vs $${annualIncome.toFixed(0)}/year income. Net: $${(annualIncome - annualSpending).toFixed(0)}.`,
        action: annualSpending > annualIncome ? 'You\'re spending more than you earn annually. Time to adjust!' : 'Solid trajectory! You\'re saving ' + (((annualIncome - annualSpending) / annualIncome) * 100).toFixed(1) + '% annually.',
        icon: '📈'
      }
    }

    return null
  } catch (error) {
    console.error('Cash flow analysis error:', error)
    return null
  }
}

function analyzeOpportunityCost(transactions: any[]): Insight | null {
  try {
    // Find recurring small expenses
    const merchantSpending: Record<string, number> = {}
    const categorySpending: Record<string, number> = {}

    transactions.forEach(t => {
      if (t.transaction_type === 'debit') {
        const merchant = t.merchant || 'Unknown'
        const category = t.category || 'Uncategorized'

        merchantSpending[merchant] = (merchantSpending[merchant] || 0) + t.amount
        categorySpending[category] = (categorySpending[category] || 0) + t.amount
      }
    })

    const topCategory = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])[0]

    if (topCategory && topCategory[1] > 200) {
      const monthlyAmount = topCategory[1]
      const annualAmount = monthlyAmount * 12

      // Special cases
      if (topCategory[0].toLowerCase().includes('dining') || topCategory[0].toLowerCase().includes('food')) {
        const savings = monthlyAmount * 0.5 // Assume 50% could be saved by cooking
        const annualSavings = savings * 12
        const futureValue = annualSavings * ((Math.pow(1.07, 10) - 1) / 0.07) // Future value of annuity

        return {
          id: 'opportunity-cost',
          type: 'tip',
          title: '☕ The Latte Factor',
          description: `Your $${monthlyAmount.toFixed(0)}/month ${topCategory[0]} habit costs $${annualAmount.toFixed(0)}/year. Cut it in half → save $${annualSavings.toFixed(0)}/year.`,
          action: `Invested at 7%, that's $${futureValue.toFixed(0)} in 10 years. That's a new car or amazing vacation!`,
          icon: '☕'
        }
      }

      if (topCategory[0].toLowerCase().includes('shopping') || topCategory[0].toLowerCase().includes('entertainment')) {
        const monthlyCount = transactions.filter(t => t.category === topCategory[0]).length
        const avgTransaction = monthlyAmount / monthlyCount

        return {
          id: 'opportunity-cost',
          type: 'tip',
          title: '💸 Small Leaks Sink Ships',
          description: `${monthlyCount} ${topCategory[0]} purchases/month at $${avgTransaction.toFixed(2)} avg = $${annualAmount.toFixed(0)}/year.`,
          action: `Skip just 25% of these → save $${(annualAmount * 0.25).toFixed(0)}/year. That's ${Math.floor(annualAmount * 0.25 / 50)} nice dinners or ${Math.floor(annualAmount * 0.25 / 150)} concert tickets!`,
          icon: '💸'
        }
      }

      // Generic opportunity cost
      return {
        id: 'opportunity-cost',
        type: 'info',
        title: '🎯 Opportunity Unlocked',
        description: `Your $${monthlyAmount.toFixed(0)}/month ${topCategory[0]} spending = $${annualAmount.toFixed(0)}/year.`,
        action: `If invested instead: $${(annualAmount * ((Math.pow(1.07, 10) - 1) / 0.07)).toFixed(0)} in 10 years at 7% return.`,
        icon: '🎯'
      }
    }

    return null
  } catch (error) {
    console.error('Opportunity cost analysis error:', error)
    return null
  }
}

function generateAdditionalInsights(_transactions: any[], summary: SpendingSummary): Insight[] {
  const insights: Insight[] = []

  // Savings rate insight
  if (summary.totalIncome > 0) {
    const savingsRate = (summary.netSavings / summary.totalIncome) * 100

    if (savingsRate >= 20) {
      insights.push({
        id: 'savings-excellent',
        type: 'success',
        title: '🎉 Excellent Saver',
        description: `You're saving ${savingsRate.toFixed(1)}% of your income. That's above the recommended 20% rate!`,
        icon: '🎉',
        action: 'Consider investing your surplus for long-term growth.'
      })
    } else if (savingsRate < 10 && savingsRate > 0) {
      insights.push({
        id: 'savings-low',
        type: 'warning',
        title: '⚡ Boost Your Savings',
        description: `Your savings rate is ${savingsRate.toFixed(1)}%. Experts recommend aiming for 20%.`,
        icon: '⚡',
        action: `Increase by just $${((summary.totalIncome * 0.2 - summary.netSavings) / 12).toFixed(0)}/month to hit the target.`
      })
    }
  }

  // Categorization reminder
  if (summary.categorizedPercent < 80) {
    insights.push({
      id: 'categorize-reminder',
      type: 'tip',
      title: '🏷️ Categorize for Better Insights',
      description: `${(100 - summary.categorizedPercent).toFixed(0)}% of transactions are uncategorized. Better categorization = better insights!`,
      icon: '🏷️',
      action: 'Visit the Statements page and use "Categorize All" button.'
    })
  }

  return insights
}

/* eslint-disable @typescript-eslint/no-unused-vars */
async function generateAIAdditionalInsights(transactions: any[], summary: SpendingSummary): Promise<Insight[]> {
  try {
    const categoryBreakdown: Record<string, number> = {}
    const monthlySpending: Record<string, number> = {}

    transactions.forEach(t => {
      if (t.transaction_type === 'debit') {
        const category = t.category || 'Uncategorized'
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + t.amount

        const month = t.transaction_date.substring(0, 7)
        monthlySpending[month] = (monthlySpending[month] || 0) + t.amount
      }
    })

    const topCategories = Object.entries(categoryBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const monthlyTrend = Object.entries(monthlySpending).sort()

    const prompt = `Analyze this financial data and provide 1 SHORT, PUNCHY insight (max 2 sentences):

SUMMARY:
- Total Income: $${summary.totalIncome.toFixed(2)}
- Total Spending: $${summary.totalSpending.toFixed(2)}
- Net Savings: $${summary.netSavings.toFixed(2)}
- Transactions: ${summary.transactionCount}

TOP SPENDING CATEGORIES:
${topCategories.map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)} (${((amount / summary.totalSpending) * 100).toFixed(1)}%)`).join('\n')}

MONTHLY SPENDING TREND:
${monthlyTrend.slice(-3).map(([month, amount]) => `- ${month}: $${amount.toFixed(2)}`).join('\n')}

Provide insights in this exact JSON format (array of 3-5 insights):
[
  {
    "type": "success|warning|info|tip",
    "title": "Short title (under 60 chars)",
    "description": "Detailed description (1-2 sentences)",
    "action": "Optional actionable recommendation",
    "icon": "Relevant emoji"
  }
]

Focus on:
1. Spending patterns and trends
2. Savings rate and financial health
3. Unusual or concerning patterns
4. Practical tips for improvement
5. Positive reinforcement for good habits

Respond ONLY with valid JSON array, no other text.`

    const response = await chat(prompt)

    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('AI response did not contain valid JSON array')
      return generateBasicInsights(transactions, summary)
    }

    const aiInsights = JSON.parse(jsonMatch[0])

    // Add IDs and validate
    return aiInsights.map((insight: any, index: number) => ({
      id: `ai-${index}`,
      type: insight.type || 'info',
      title: insight.title,
      description: insight.description,
      action: insight.action,
      icon: insight.icon || '💡'
    }))

  } catch (error) {
    console.error('AI insights generation failed:', error)
    // Fallback to basic insights
    return generateBasicInsights(transactions, summary)
  }
}
