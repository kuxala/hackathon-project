import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Chat Data Service
 * Provides database access functions for the chatbot
 */

/**
 * Get user's transaction summary
 */
export async function getUserTransactionSummary(userId: string, authToken: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching transactions:', error)
    return null
  }

  if (!transactions || transactions.length === 0) {
    return {
      hasData: false,
      message: 'No transactions found. Upload a bank statement to get started.'
    }
  }

  // Calculate summary statistics
  const totalDebits = transactions
    .filter(t => t.transaction_type === 'debit')
    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0)

  const totalCredits = transactions
    .filter(t => t.transaction_type === 'credit')
    .reduce((sum, t) => sum + parseFloat(String(t.amount)), 0)

  // Group by category
  const byCategory = transactions.reduce((acc: Record<string, { total: number; count: number }>, t) => {
    if (t.transaction_type === 'debit') {
      const category = t.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = { total: 0, count: 0 }
      }
      acc[category].total += parseFloat(String(t.amount))
      acc[category].count++
    }
    return acc
  }, {})

  // Get date range
  const dates = transactions.map(t => new Date(t.transaction_date))
  const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const latestDate = new Date(Math.max(...dates.map(d => d.getTime())))

  return {
    hasData: true,
    transactionCount: transactions.length,
    totalSpending: totalDebits,
    totalIncome: totalCredits,
    netBalance: totalCredits - totalDebits,
    categoryBreakdown: Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5),
    dateRange: {
      from: earliestDate.toISOString().split('T')[0],
      to: latestDate.toISOString().split('T')[0]
    },
    recentTransactions: transactions.slice(0, 5).map(t => ({
      date: t.transaction_date,
      description: t.description,
      merchant: t.merchant,
      amount: parseFloat(String(t.amount)),
      type: t.transaction_type,
      category: t.category
    }))
  }
}

/**
 * Search transactions by query
 */
export async function searchTransactions(
  userId: string,
  authToken: string,
  query: {
    searchText?: string
    category?: string
    minAmount?: number
    maxAmount?: number
    startDate?: string
    endDate?: string
    limit?: number
  }
) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  let queryBuilder = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })

  // Apply filters
  if (query.searchText) {
    queryBuilder = queryBuilder.or(`description.ilike.%${query.searchText}%,merchant.ilike.%${query.searchText}%`)
  }

  if (query.category) {
    queryBuilder = queryBuilder.eq('category', query.category)
  }

  if (query.minAmount !== undefined) {
    queryBuilder = queryBuilder.gte('amount', query.minAmount)
  }

  if (query.maxAmount !== undefined) {
    queryBuilder = queryBuilder.lte('amount', query.maxAmount)
  }

  if (query.startDate) {
    queryBuilder = queryBuilder.gte('transaction_date', query.startDate)
  }

  if (query.endDate) {
    queryBuilder = queryBuilder.lte('transaction_date', query.endDate)
  }

  queryBuilder = queryBuilder.limit(query.limit || 20)

  const { data: transactions, error } = await queryBuilder

  if (error) {
    console.error('Error searching transactions:', error)
    return null
  }

  return {
    count: transactions?.length || 0,
    transactions: transactions?.map(t => ({
      date: t.transaction_date,
      description: t.description,
      merchant: t.merchant,
      amount: parseFloat(String(t.amount)),
      type: t.transaction_type,
      category: t.category,
      balance: t.balance ? parseFloat(String(t.balance)) : undefined
    })) || []
  }
}

/**
 * Get spending by category for a date range
 */
export async function getSpendingByCategory(
  userId: string,
  authToken: string,
  startDate?: string,
  endDate?: string
) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  let queryBuilder = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('transaction_type', 'debit')

  if (startDate) {
    queryBuilder = queryBuilder.gte('transaction_date', startDate)
  }

  if (endDate) {
    queryBuilder = queryBuilder.lte('transaction_date', endDate)
  }

  const { data: transactions, error } = await queryBuilder

  if (error) {
    console.error('Error fetching category spending:', error)
    return null
  }

  if (!transactions || transactions.length === 0) {
    return { categories: [], total: 0 }
  }

  const byCategory = transactions.reduce((acc: Record<string, number>, t) => {
    const category = t.category || 'Uncategorized'
    acc[category] = (acc[category] || 0) + parseFloat(String(t.amount))
    return acc
  }, {})

  const total = Object.values(byCategory).reduce((sum, amount) => sum + amount, 0)

  return {
    categories: Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount),
    total
  }
}

/**
 * Get monthly spending trend
 */
export async function getMonthlyTrend(
  userId: string,
  authToken: string,
  months: number = 12
) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  const now = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  // Format dates as YYYY-MM-DD
  const startDateStr = startDate.toISOString().split('T')[0]
  const todayStr = now.toISOString().split('T')[0]

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('transaction_date', startDateStr)
    .lte('transaction_date', todayStr)  // Don't include future dates
    .order('transaction_date', { ascending: true })

  if (error) {
    console.error('Error fetching monthly trend:', error)
    return null
  }

  if (!transactions || transactions.length === 0) {
    return { months: [], income: [], spending: [] }
  }

  // Group by month, filtering out future dates
  const byMonth = transactions.reduce((acc: Record<string, { income: number; spending: number }>, t) => {
    const transactionDate = new Date(t.transaction_date)

    // Skip future transactions
    if (transactionDate > now) {
      return acc
    }

    const month = t.transaction_date.substring(0, 7) // YYYY-MM
    if (!acc[month]) {
      acc[month] = { income: 0, spending: 0 }
    }

    const amount = parseFloat(String(t.amount))
    if (t.transaction_type === 'credit') {
      acc[month].income += amount
    } else {
      acc[month].spending += amount
    }

    return acc
  }, {})

  const sortedMonths = Object.keys(byMonth).sort()

  return {
    months: sortedMonths,
    income: sortedMonths.map(m => byMonth[m].income),
    spending: sortedMonths.map(m => byMonth[m].spending)
  }
}

/**
 * Get user's insights
 */
export async function getUserInsights(userId: string, authToken: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } }
  })

  const { data: insights, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .order('generated_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching insights:', error)
    return null
  }

  return insights?.map(i => ({
    type: i.insight_type,
    title: i.title,
    description: i.description,
    severity: i.severity,
    generatedAt: i.generated_at
  })) || []
}
