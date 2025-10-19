import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface PsychologicalInsight {
  type: 'opportunity_cost' | 'behavioral_pattern' | 'invisible_leak' | 'work_hours_spent' | 'future_self' | 'lifestyle_inflation' | 'memory_vs_money'
  headline: string
  data: any
}

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
      .limit(1000)

    if (txError || !transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        summary: null,
        insights: []
      })
    }

    // Calculate summary
    const summary = calculateSummary(transactions)

    // Generate psychological insights
    const insights = generatePsychologicalInsights(transactions, summary)

    return NextResponse.json({
      success: true,
      summary,
      insights
    })

  } catch (error) {
    console.error('POST /api/insights-psychology error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateSummary(transactions: any[]) {
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

  return {
    income: totalIncome,
    spending: totalSpending,
    savings: totalIncome - totalSpending,
    savingsRate: totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0,
    topCategory: topCategory[0],
    topCategoryAmount: topCategory[1],
    categoryTotals
  }
}

function generatePsychologicalInsights(transactions: any[], summary: any): PsychologicalInsight[] {
  const insights: PsychologicalInsight[] = []

  // 1. Opportunity Cost Analysis
  const opportunityCost = analyzeOpportunityCost(transactions, summary)
  if (opportunityCost) insights.push(opportunityCost)

  // 2. Behavioral Patterns (Time-based spending)
  const behavioralPattern = analyzeBehavioralPatterns(transactions)
  if (behavioralPattern) insights.push(behavioralPattern)

  // 3. Invisible Leaks (Subscriptions)
  const invisibleLeaks = analyzeInvisibleLeaks(transactions)
  if (invisibleLeaks) insights.push(invisibleLeaks)

  // 4. Work Hours Spent
  const workHours = analyzeWorkHours(transactions, summary)
  if (workHours) insights.push(workHours)

  // 5. Future Self
  const futureSelf = analyzeFutureSelf(transactions, summary)
  if (futureSelf) insights.push(futureSelf)

  // 6. Lifestyle Inflation
  const lifestyleInflation = analyzeLifestyleInflation(transactions, summary)
  if (lifestyleInflation) insights.push(lifestyleInflation)

  // 7. Memory vs Money
  const memoryVsMoney = analyzeMemoryVsMoney(transactions)
  if (memoryVsMoney) insights.push(memoryVsMoney)

  return insights
}

function analyzeOpportunityCost(transactions: any[], summary: any): PsychologicalInsight | null {
  // Find the most frequent small expense category
  const categoryData: Record<string, { count: number, total: number }> = {}

  transactions.forEach(t => {
    if (t.transaction_type === 'debit' && t.amount < 50) {
      const category = t.category || 'Uncategorized'
      if (!categoryData[category]) categoryData[category] = { count: 0, total: 0 }
      categoryData[category].count++
      categoryData[category].total += t.amount
    }
  })

  const topSmallExpense = Object.entries(categoryData)
    .sort((a, b) => b[1].total - a[1].total)[0]

  if (!topSmallExpense || topSmallExpense[1].total < 50) return null

  const [category, data] = topSmallExpense
  const monthlySpending = data.total
  const yearlySpending = monthlySpending * 12
  const avgPerPurchase = data.total / data.count

  // Calculate what this could buy instead
  const comparisons = []
  if (yearlySpending >= 500) comparisons.push(`${Math.floor(yearlySpending / 500)} weekend trips`)
  if (yearlySpending >= 60) comparisons.push(`${Math.floor(yearlySpending / 60)} months of gym membership`)
  if (yearlySpending >= 100) comparisons.push(`${Math.floor(yearlySpending / 100)} nice dinners`)

  return {
    type: 'opportunity_cost',
    headline: `Your ${category} Habit`,
    data: {
      spending: monthlySpending,
      breakdown: `${data.count} purchases × $${avgPerPurchase.toFixed(2)} average`,
      timeProjection: {
        yearly: yearlySpending.toFixed(0),
        comparison: comparisons.length > 0 ? `That's ${comparisons.join(', or ')}` : `That's $${yearlySpending.toFixed(0)} per year`
      },
      question: `Is this habit bringing you $${monthlySpending.toFixed(0)} worth of joy each month?`
    }
  }
}

function analyzeBehavioralPatterns(transactions: any[]): PsychologicalInsight | null {
  const dayOfWeekSpending: Record<number, number> = {}
  const hourOfDaySpending: Record<number, number> = {}

  transactions.forEach(t => {
    if (t.transaction_type === 'debit' && t.transaction_date) {
      const date = new Date(t.transaction_date)
      const dayOfWeek = date.getDay()
      const hour = date.getHours()

      dayOfWeekSpending[dayOfWeek] = (dayOfWeekSpending[dayOfWeek] || 0) + t.amount
      hourOfDaySpending[hour] = (hourOfDaySpending[hour] || 0) + t.amount
    }
  })

  // Check for Friday spending spike
  const fridaySpending = dayOfWeekSpending[5] || 0
  const avgWeekdaySpending = ([1, 2, 3, 4].reduce((sum, day) => sum + (dayOfWeekSpending[day] || 0), 0)) / 4
  const fridayIncrease = avgWeekdaySpending > 0 ? ((fridaySpending / avgWeekdaySpending - 1) * 100) : 0

  if (fridayIncrease > 50) {
    return {
      type: 'behavioral_pattern',
      headline: 'Friday Night Spending Spike',
      data: {
        insight: `Every Friday, your spending increases by ${fridayIncrease.toFixed(0)}%`,
        trigger: 'Weekend stress relief & celebration',
        totalImpact: `$${fridaySpending.toFixed(0)}/month on impulse purchases`,
        alternative: 'Plan one meaningful Friday activity instead of shopping'
      }
    }
  }

  // Check for late night spending
  const lateNightSpending = [20, 21, 22, 23].reduce((sum, hour) => sum + (hourOfDaySpending[hour] || 0), 0)
  const totalSpending = Object.values(hourOfDaySpending).reduce((sum, val) => sum + val, 0)
  const lateNightPercent = totalSpending > 0 ? (lateNightSpending / totalSpending) * 100 : 0

  if (lateNightPercent > 25) {
    return {
      type: 'behavioral_pattern',
      headline: 'Late Night Shopping Pattern',
      data: {
        insight: `${lateNightPercent.toFixed(0)}% of your spending happens between 8pm-11pm`,
        trigger: 'Evening decision fatigue',
        totalImpact: `$${lateNightSpending.toFixed(0)}/month`,
        alternative: 'Use the "sleep on it" rule: wait until morning before buying'
      }
    }
  }

  return null
}

function analyzeInvisibleLeaks(transactions: any[]): PsychologicalInsight | null {
  // Detect recurring small charges (likely subscriptions)
  const merchantFrequency: Record<string, { count: number, avgAmount: number, total: number }> = {}

  transactions.forEach(t => {
    if (t.transaction_type === 'debit' && t.merchant) {
      const merchant = t.merchant.toLowerCase()
      if (!merchantFrequency[merchant]) {
        merchantFrequency[merchant] = { count: 0, avgAmount: 0, total: 0 }
      }
      merchantFrequency[merchant].count++
      merchantFrequency[merchant].total += t.amount
    }
  })

  // Calculate average for each
  Object.keys(merchantFrequency).forEach(merchant => {
    const data = merchantFrequency[merchant]
    data.avgAmount = data.total / data.count
  })

  // Find likely subscriptions (recurring small amounts)
  const likelySubscriptions = Object.entries(merchantFrequency)
    .filter(([_, data]) => data.count >= 2 && data.avgAmount < 100 && data.avgAmount > 5)
    .sort((a, b) => b[1].total - a[1].total)

  if (likelySubscriptions.length >= 3) {
    const totalSubscriptionCost = likelySubscriptions.reduce((sum, [_, data]) => sum + data.avgAmount, 0)

    return {
      type: 'invisible_leak',
      headline: 'Subscriptions You Forgot About',
      data: {
        count: likelySubscriptions.length,
        monthlyCost: totalSubscriptionCost.toFixed(0),
        items: likelySubscriptions.slice(0, 5).map(([merchant]) => merchant),
        awareness: `You're paying $${(totalSubscriptionCost * 12).toFixed(0)}/year for services you might not fully use`
      }
    }
  }

  return null
}

function analyzeWorkHours(transactions: any[], summary: any): PsychologicalInsight | null {
  // Estimate hourly rate based on income
  const monthlyIncome = summary.income
  const estimatedHourlyRate = monthlyIncome / 160 // ~40 hours/week * 4 weeks

  if (estimatedHourlyRate === 0) return null

  // Find the category with highest spending (excluding essentials)
  const nonEssentialCategories = ['Entertainment', 'Dining', 'Shopping', 'Travel', 'Leisure']
  let topNonEssential: [string, number] | null = null

  Object.entries(summary.categoryTotals).forEach(([category, amount]) => {
    if (nonEssentialCategories.some(ne => category.includes(ne))) {
      if (!topNonEssential || amount > topNonEssential[1]) {
        topNonEssential = [category, amount as number]
      }
    }
  })

  if (!topNonEssential || topNonEssential[1] < 100) return null

  const [category, spent] = topNonEssential
  const hoursWorked = spent / estimatedHourlyRate

  return {
    type: 'work_hours_spent',
    headline: 'How Many Hours Did You Work For This?',
    data: {
      category,
      spent: spent.toFixed(0),
      hourlyRate: estimatedHourlyRate.toFixed(0),
      hoursWorked: hoursWorked.toFixed(1),
      message: hoursWorked > 20
        ? `You worked ${Math.floor(hoursWorked / 8)} full days just to pay for last month's ${category.toLowerCase()}`
        : `That's ${hoursWorked.toFixed(0)} hours of your life`
    }
  }
}

function analyzeFutureSelf(transactions: any[], summary: any): PsychologicalInsight | null {
  const currentSavingsRate = summary.savingsRate

  // Find a category we could cut
  const categoryToReduce = Object.entries(summary.categoryTotals)
    .filter(([cat]) => cat.includes('Dining') || cat.includes('Entertainment') || cat.includes('Shopping'))
    .sort((a, b) => (b[1] as number) - (a[1] as number))[0]

  if (!categoryToReduce) return null

  const [category, amount] = categoryToReduce
  const reductionPercent = 30
  const monthlySavings = (amount as number) * (reductionPercent / 100)
  const yearlySavings = monthlySavings * 12
  const fiveYearSavings = yearlySavings * 5 * 1.05 // With modest interest

  return {
    type: 'future_self',
    headline: 'Who Are You Saving For?',
    data: {
      currentSavingsRate: currentSavingsRate.toFixed(0),
      ifYouCut: `${category} by ${reductionPercent}%`,
      youWouldSave: `$${monthlySavings.toFixed(0)}/month = $${yearlySavings.toFixed(0)}/year`,
      inFiveYears: `$${fiveYearSavings.toFixed(0)} + interest`,
      couldBuy: fiveYearSavings > 10000
        ? 'A down payment on a car, or 6 months of freedom'
        : 'An emergency fund that gives you options'
    }
  }
}

function analyzeLifestyleInflation(transactions: any[], summary: any): PsychologicalInsight | null {
  // Group transactions by month
  const monthlyData: Record<string, { spending: number, income: number }> = {}

  transactions.forEach(t => {
    const month = t.transaction_date?.substring(0, 7)
    if (!month) return

    if (!monthlyData[month]) {
      monthlyData[month] = { spending: 0, income: 0 }
    }

    if (t.transaction_type === 'debit') {
      monthlyData[month].spending += t.amount
    } else {
      monthlyData[month].income += t.amount
    }
  })

  const months = Object.entries(monthlyData).sort()
  if (months.length < 3) return null

  // Compare last month to 3 months ago
  const currentMonth = months[months.length - 1][1]
  const threeMonthsAgo = months[Math.max(0, months.length - 4)][1]

  const spendingIncrease = threeMonthsAgo.spending > 0
    ? ((currentMonth.spending / threeMonthsAgo.spending - 1) * 100)
    : 0
  const incomeIncrease = threeMonthsAgo.income > 0
    ? ((currentMonth.income / threeMonthsAgo.income - 1) * 100)
    : 0

  if (spendingIncrease > incomeIncrease + 10 && spendingIncrease > 15) {
    const projectedMonthlySpending = currentMonth.spending * (1 + (spendingIncrease / 100))

    return {
      type: 'lifestyle_inflation',
      headline: 'Your Standard of Living is Eating Your Future',
      data: {
        spendingIncrease: `${spendingIncrease.toFixed(0)}% more than 3 months ago`,
        butIncomeIncreased: incomeIncrease > 0 ? `only ${incomeIncrease.toFixed(0)}%` : 'stayed the same',
        projection: `At this rate, you'll need $${projectedMonthlySpending.toFixed(0)}/month to maintain this lifestyle in a year`
      }
    }
  }

  return null
}

function analyzeMemoryVsMoney(transactions: any[]): PsychologicalInsight | null {
  // Categorize spending into memorable vs forgettable
  const memorableCategories = ['Travel', 'Events', 'Experiences', 'Education', 'Hobbies']
  const forgettableCategories = ['Shopping', 'Impulse', 'Online Shopping', 'Convenience']

  let memorableSpending = 0
  let forgettableSpending = 0
  let totalSpending = 0

  transactions.forEach(t => {
    if (t.transaction_type === 'debit') {
      const category = t.category || ''
      totalSpending += t.amount

      if (memorableCategories.some(mc => category.includes(mc))) {
        memorableSpending += t.amount
      } else if (forgettableCategories.some(fc => category.includes(fc)) || t.amount < 20) {
        forgettableSpending += t.amount
      }
    }
  })

  if (totalSpending === 0) return null

  const forgettablePercent = (forgettableSpending / totalSpending) * 100
  const memorablePercent = (memorableSpending / totalSpending) * 100

  if (forgettablePercent > 20 || (memorablePercent > 0 && forgettablePercent / memorablePercent > 3)) {
    return {
      type: 'memory_vs_money',
      headline: 'Forgotten vs Remembered',
      data: {
        forgottenSpending: {
          amount: forgettableSpending.toFixed(0),
          percent: forgettablePercent.toFixed(0),
          description: "Spent on things you won't remember next month"
        },
        memorableSpending: {
          amount: memorableSpending.toFixed(0),
          percent: memorablePercent.toFixed(0),
          description: 'Invested in experiences worth remembering'
        }
      }
    }
  }

  return null
}
