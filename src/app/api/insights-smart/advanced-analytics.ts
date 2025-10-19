interface Insight {
  id: string
  type: 'success' | 'warning' | 'info' | 'tip'
  title: string
  description: string
  action?: string
  icon: string
}

/**
 * PAYDAY EFFECT ANALYZER
 * Detects if user spends more right after getting paid
 */
export function analyzePaydayEffect(transactions: any[]): Insight | null {
  try {
    const incomeTransactions = transactions.filter(t => t.transaction_type === 'credit')
    if (incomeTransactions.length === 0) return null

    const spendingAfterIncome: number[] = []

    incomeTransactions.forEach(income => {
      const incomeDate = new Date(income.transaction_date)
      const threeDaysLater = new Date(incomeDate)
      threeDaysLater.setDate(threeDaysLater.getDate() + 3)

      const spendingIn3Days = transactions
        .filter(t => {
          const tDate = new Date(t.transaction_date)
          return t.transaction_type === 'debit' &&
                 tDate > incomeDate &&
                 tDate <= threeDaysLater
        })
        .reduce((sum, t) => sum + t.amount, 0)

      spendingAfterIncome.push(spendingIn3Days)
    })

    const avgSpendingAfterPayday = spendingAfterIncome.reduce((a, b) => a + b, 0) / spendingAfterIncome.length

    // Compare to average daily spending
    const allDebits = transactions.filter(t => t.transaction_type === 'debit')
    const totalSpending = allDebits.reduce((sum, t) => sum + t.amount, 0)
    const avgDailySpending = totalSpending / 30

    const paydayMultiplier = (avgSpendingAfterPayday / 3) / avgDailySpending

    if (paydayMultiplier > 2) {
      return {
        id: 'payday-effect',
        type: 'warning',
        title: '💸 Payday Splurge Alert',
        description: `You spend ${(paydayMultiplier * 100).toFixed(0)}% more in the 3 days after getting paid ($${avgSpendingAfterPayday.toFixed(0)} vs $${(avgDailySpending * 3).toFixed(0)} normally).`,
        action: `Wait 48 hours before major purchases after payday. This "cooling off" period could save you $${((avgSpendingAfterPayday - avgDailySpending * 3) * incomeTransactions.length).toFixed(0)}/year.`,
        icon: '💸'
      }
    }

    return null
  } catch (error) {
    console.error('Payday effect analysis error:', error)
    return null
  }
}

/**
 * MERCHANT LOYALTY ANALYZER
 * Finds where you shop most and calculates potential rewards
 */
export function analyzeMerchantPatterns(transactions: any[]): Insight | null {
  try {
    const merchantData: Record<string, { count: number, total: number, dates: string[] }> = {}

    transactions
      .filter(t => t.transaction_type === 'debit' && t.merchant)
      .forEach(t => {
        const merchant = t.merchant
        if (!merchantData[merchant]) {
          merchantData[merchant] = { count: 0, total: 0, dates: [] }
        }
        merchantData[merchant].count++
        merchantData[merchant].total += t.amount
        merchantData[merchant].dates.push(t.transaction_date)
      })

    const topMerchant = Object.entries(merchantData)
      .sort((a, b) => b[1].count - a[1].count)[0]

    if (topMerchant && topMerchant[1].count >= 5) {
      const [merchant, data] = topMerchant
      const potentialCashback = data.total * 0.02 // 2% cashback assumption
      const frequency = data.count / (data.dates.length > 0 ?
        (new Date(data.dates[data.dates.length - 1]).getTime() - new Date(data.dates[0]).getTime()) / (1000 * 60 * 60 * 24 * 30)
        : 1)

      return {
        id: 'merchant-loyalty',
        type: 'tip',
        title: `🏪 ${merchant} is Your Go-To`,
        description: `You've visited ${merchant} ${data.count} times, spending $${data.total.toFixed(2)}. That's ${frequency.toFixed(1)} visits/month!`,
        action: `Get a rewards card for ${merchant}. Potential savings: $${potentialCashback.toFixed(0)} in cashback this period.`,
        icon: '🏪'
      }
    }

    return null
  } catch (error) {
    console.error('Merchant pattern analysis error:', error)
    return null
  }
}

/**
 * ANOMALY DETECTOR
 * Finds unusual spending spikes
 */
export function detectAnomalies(transactions: any[]): Insight | null {
  try {
    const dailySpending: Record<string, number> = {}

    transactions
      .filter(t => t.transaction_type === 'debit')
      .forEach(t => {
        const date = t.transaction_date
        dailySpending[date] = (dailySpending[date] || 0) + t.amount
      })

    const amounts = Object.values(dailySpending)
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)

    // Find days with spending > 2 std deviations above mean
    const anomalies = Object.entries(dailySpending)
      .filter(([, amount]) => amount > avg + (2 * stdDev))
      .sort((a, b) => b[1] - a[1])

    if (anomalies.length > 0) {
      const [date, amount] = anomalies[0]
      const percentAbove = ((amount - avg) / avg) * 100

      // Get transactions on that day
      const dayTransactions = transactions
        .filter(t => t.transaction_date === date && t.transaction_type === 'debit')
        .sort((a, b) => b.amount - a.amount)

      const biggestPurchase = dayTransactions[0]

      return {
        id: 'spending-anomaly',
        type: 'info',
        title: `📊 Unusual Spending Spike`,
        description: `On ${new Date(date).toLocaleDateString()}, you spent $${amount.toFixed(2)} - that's ${percentAbove.toFixed(0)}% more than your typical $${avg.toFixed(2)}/day.`,
        action: biggestPurchase ? `Biggest purchase: ${biggestPurchase.description} ($${biggestPurchase.amount.toFixed(2)}). Was this planned or impulse?` : 'Review this day to understand what drove the spike.',
        icon: '📊'
      }
    }

    return null
  } catch (error) {
    console.error('Anomaly detection error:', error)
    return null
  }
}

/**
 * SUBSCRIPTION DETECTOR
 * Finds recurring charges (potential forgotten subscriptions)
 */
export function detectSubscriptions(transactions: any[]): Insight | null {
  try {
    const merchantFrequency: Record<string, { amounts: number[], dates: string[], count: number }> = {}

    transactions
      .filter(t => t.transaction_type === 'debit' && t.merchant)
      .forEach(t => {
        const merchant = t.merchant
        if (!merchantFrequency[merchant]) {
          merchantFrequency[merchant] = { amounts: [], dates: [], count: 0 }
        }
        merchantFrequency[merchant].amounts.push(t.amount)
        merchantFrequency[merchant].dates.push(t.transaction_date)
        merchantFrequency[merchant].count++
      })

    // Find merchants with recurring similar amounts
    const potentialSubscriptions = Object.entries(merchantFrequency)
      .filter(([, data]) => {
        if (data.count < 2) return false

        // Check if amounts are similar (within 10%)
        const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
        const isSimilar = data.amounts.every(amt => Math.abs(amt - avgAmount) / avgAmount < 0.1)

        // Check if dates are roughly monthly
        if (data.dates.length >= 2) {
          const sortedDates = data.dates.sort()
          const daysBetween = (new Date(sortedDates[1]).getTime() - new Date(sortedDates[0]).getTime()) / (1000 * 60 * 60 * 24)
          const isMonthly = daysBetween >= 25 && daysBetween <= 35
          return isSimilar && isMonthly
        }

        return isSimilar
      })
      .map(([merchant, data]) => ({
        merchant,
        avgAmount: data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length,
        count: data.count
      }))
      .sort((a, b) => b.avgAmount - a.avgAmount)

    if (potentialSubscriptions.length > 0) {
      const totalMonthlySubscriptions = potentialSubscriptions.reduce((sum, sub) => sum + sub.avgAmount, 0)
      const annualCost = totalMonthlySubscriptions * 12

      return {
        id: 'subscription-detection',
        type: 'warning',
        title: `🔄 ${potentialSubscriptions.length} Recurring Charges Found`,
        description: `Detected ${potentialSubscriptions.length} potential subscriptions costing $${totalMonthlySubscriptions.toFixed(2)}/month ($${annualCost.toFixed(0)}/year).`,
        action: `Top subscription: ${potentialSubscriptions[0].merchant} at $${potentialSubscriptions[0].avgAmount.toFixed(2)}/month. Review all subscriptions - cancel what you don't use!`,
        icon: '🔄'
      }
    }

    return null
  } catch (error) {
    console.error('Subscription detection error:', error)
    return null
  }
}

/**
 * CATEGORY TREND ANALYZER
 * Detects categories growing month-over-month
 */
export function analyzeCategoryTrends(transactions: any[]): Insight | null {
  try {
    const monthlyCategory: Record<string, Record<string, number>> = {}

    transactions
      .filter(t => t.transaction_type === 'debit' && t.category)
      .forEach(t => {
        const month = t.transaction_date.substring(0, 7)
        const category = t.category

        if (!monthlyCategory[month]) {
          monthlyCategory[month] = {}
        }
        monthlyCategory[month][category] = (monthlyCategory[month][category] || 0) + t.amount
      })

    const months = Object.keys(monthlyCategory).sort()
    if (months.length < 2) return null

    // Find category with biggest growth
    const categories = new Set<string>()
    Object.values(monthlyCategory).forEach(monthData => {
      Object.keys(monthData).forEach(cat => categories.add(cat))
    })

    let maxGrowth = 0
    let fastestGrowingCategory = ''
    let prevAmount = 0
    let currentAmount = 0

    categories.forEach(category => {
      const lastMonth = monthlyCategory[months[months.length - 1]][category] || 0
      const prevMonth = monthlyCategory[months[months.length - 2]][category] || 0

      if (prevMonth > 0) {
        const growthPercent = ((lastMonth - prevMonth) / prevMonth) * 100
        if (growthPercent > maxGrowth && growthPercent > 20) {
          maxGrowth = growthPercent
          fastestGrowingCategory = category
          prevAmount = prevMonth
          currentAmount = lastMonth
        }
      }
    })

    if (maxGrowth > 20) {
      const projectedNextMonth = currentAmount * (1 + maxGrowth / 100)

      return {
        id: 'category-trend',
        type: 'warning',
        title: `📈 ${fastestGrowingCategory} Spending Surging`,
        description: `Your ${fastestGrowingCategory} spending grew ${maxGrowth.toFixed(0)}% month-over-month (from $${prevAmount.toFixed(0)} to $${currentAmount.toFixed(0)}).`,
        action: `At this rate, you'll hit $${projectedNextMonth.toFixed(0)} next month (+$${(projectedNextMonth - currentAmount).toFixed(0)}). Time to review this category!`,
        icon: '📈'
      }
    }

    return null
  } catch (error) {
    console.error('Category trend analysis error:', error)
    return null
  }
}
