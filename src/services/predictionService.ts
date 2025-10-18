import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface MonthlyData {
  month: string // YYYY-MM
  totalSpending: number
  totalIncome: number
  categoryBreakdown: {
    category: string
    amount: number
    percentage: number
  }[]
  transactionCount: number
}

/**
 * Get historical monthly data for prediction
 * Returns last N months of transaction data
 */
export async function getHistoricalMonthlyData(
  userId: string,
  authToken: string,
  monthsBack: number = 9
): Promise<MonthlyData[]> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  const now = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - monthsBack)

  const startDateStr = startDate.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startDateStr)
    .lte('transaction_date', todayStr)
    .order('transaction_date', { ascending: true })

  if (error) {
    console.error('Error fetching historical data:', error)
    throw new Error('Failed to fetch historical transaction data')
  }

  if (!transactions || transactions.length === 0) {
    return []
  }

  // Group by month
  const byMonth: Record<string, {
    spending: number
    income: number
    categories: Record<string, number>
    count: number
  }> = {}

  transactions.forEach(t => {
    const transactionDate = new Date(t.transaction_date)

    // Skip future transactions
    if (transactionDate > now) {
      return
    }

    const month = t.transaction_date.substring(0, 7) // YYYY-MM

    if (!byMonth[month]) {
      byMonth[month] = {
        spending: 0,
        income: 0,
        categories: {},
        count: 0
      }
    }

    const amount = parseFloat(String(t.amount))
    byMonth[month].count++

    if (t.transaction_type === 'credit') {
      byMonth[month].income += amount
    } else {
      byMonth[month].spending += amount
      const category = t.category || 'Uncategorized'
      byMonth[month].categories[category] = (byMonth[month].categories[category] || 0) + amount
    }
  })

  // Convert to array format
  return Object.entries(byMonth)
    .map(([month, data]) => {
      const categoryBreakdown = Object.entries(data.categories)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: data.spending > 0 ? (amount / data.spending) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      return {
        month,
        totalSpending: data.spending,
        totalIncome: data.income,
        categoryBreakdown,
        transactionCount: data.count
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}

/**
 * Get prediction parameters for available data
 */
export async function getPredictionParameters(userId: string, authToken: string) {
  const data = await getHistoricalMonthlyData(userId, authToken, 12)

  if (data.length === 0) {
    return {
      hasData: false,
      availableMonths: 0,
      message: 'No transaction data available. Please upload bank statements to get predictions.'
    }
  }

  // Determine optimal months to use for prediction
  let recommendedMonths = 3
  if (data.length >= 9) {
    recommendedMonths = 9
  } else if (data.length >= 6) {
    recommendedMonths = 6
  }

  return {
    hasData: true,
    availableMonths: data.length,
    recommendedMonths,
    dateRange: {
      from: data[0].month,
      to: data[data.length - 1].month
    }
  }
}
