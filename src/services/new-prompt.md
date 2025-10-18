# AI Insights Prompt - Simplified for Existing Charts

## Current State Analysis

You have **3 beautiful, working charts** in your dashboard:

### 1. SpendingIncomeChart (Line Chart)
- **Location**: `src/app/dashboard/components/SpendingIncomeChart.tsx`
- **Current Data**: Hardcoded SVG paths for income and spending lines
- **What It Needs**: Monthly time-series data showing income vs spending over time
- **Displays**: Dual-line chart with toggleable lines, hover tooltips, surplus/deficit area fill

### 2. LoanDebtChart (Bar Chart)
- **Location**: `src/app/dashboard/components/LoanDebtChart.tsx`
- **Current Data**: Hardcoded 4 debt items (Mortgage, Car Loan, Credit Card, Student Loan)
- **What It Needs**: Top spending categories with amounts
- **Displays**: Vertical bar chart with hover tooltips, animated bars

### 3. BudgetForecastChart (Area Chart)
- **Location**: `src/app/dashboard/components/BudgetForecastChart.tsx`
- **Current Data**: Hardcoded SVG path
- **What It Needs**: Forecast projection data or budget utilization data
- **Displays**: Area chart with gradient fill, shimmer effects

---

## Simplified Data Schema

Instead of complex schemas, we need just 3 simple data structures:

```typescript
// For SpendingIncomeChart
interface MonthlyTrendData {
  months: string[]                    // ["2024-10", "2024-11", "2024-12", ...]
  income: number[]                    // [5200, 5400, 5300, ...]
  spending: number[]                  // [4100, 4500, 4300, ...]
}

// For LoanDebtChart (rename to CategoryChart)
interface CategoryBreakdown {
  categories: Array<{
    name: string                      // "Groceries"
    amount: number                    // 654.21
    percentage: number                // 22.0
    color: 'emerald' | 'green' | 'rose' | 'amber' | 'blue' | 'purple'
  }>
}

// For BudgetForecastChart
interface BudgetData {
  totalBudget: number                 // 5000
  totalSpent: number                  // 3847
  utilizationPercentage: number       // 76.9
  forecastEndOfMonth: number          // 4200 (projected total by end of month)
}
```

---

## The New AI Prompt for `analyzeSpendingPatterns()`

Replace the current prompt in `insightsGenerator.ts` line 134-158 with:

```javascript
const prompt = `You are a financial analyst AI. Analyze spending data and generate insights with chart-ready data.

TRANSACTION DATA:
Total Transactions: ${stats.transactionCount}
Total Spending (Debits): $${stats.totalDebits.toFixed(2)}
Total Income (Credits): $${stats.totalCredits.toFixed(2)}
Net Balance: $${stats.netIncome.toFixed(2)}
Average Monthly Spending: $${stats.averageMonthlySpending.toFixed(2)}

TOP SPENDING CATEGORIES:
${topCategories.map(([cat, data]) =>
  `- ${cat}: $${data.total.toFixed(2)} (${data.percentage.toFixed(1)}%, ${data.count} transactions)`
).join('\n')}

MONTHLY BREAKDOWN:
${stats.monthlyData.map(m =>
  `- ${m.month}: Income $${m.credits.toFixed(2)}, Spent $${m.debits.toFixed(2)}`
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
        "utilizationPercentage": ${((stats.totalDebits / stats.totalCredits) * 100).toFixed(1)},
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
7. Make sure all numbers are rounded to 2 decimal places
`
```

---

## Example AI Response

This is what the AI should return:

```json
[
  {
    "title": "Strong Savings Trend",
    "description": "You're spending $4,200/month while earning $5,300/month, maintaining a healthy 20% savings rate. Your top expense category is Groceries at 22% of spending.",
    "severity": "info",
    "chartData": {
      "monthlyTrend": {
        "months": ["2024-08", "2024-09", "2024-10", "2024-11", "2024-12", "2025-01"],
        "income": [5100, 5200, 5400, 5300, 5500, 5400],
        "spending": [4200, 4100, 4500, 4300, 4400, 4200]
      },
      "categoryBreakdown": {
        "categories": [
          {"name": "Groceries", "amount": 654.21, "percentage": 22.0, "color": "green"},
          {"name": "Dining & Restaurants", "amount": 847.32, "percentage": 28.5, "color": "rose"},
          {"name": "Transportation", "amount": 432.15, "percentage": 14.5, "color": "blue"},
          {"name": "Utilities", "amount": 298.50, "percentage": 10.0, "color": "emerald"},
          {"name": "Entertainment", "amount": 245.80, "percentage": 8.3, "color": "purple"},
          {"name": "Other", "amount": 495.47, "percentage": 16.7, "color": "amber"}
        ]
      },
      "budget": {
        "totalBudget": 4500.00,
        "totalSpent": 2973.45,
        "utilizationPercentage": 66.1,
        "forecastEndOfMonth": 4200.00
      }
    }
  },
  {
    "title": "Dining Spending Alert",
    "description": "Restaurant and dining expenses have increased 23% compared to last month, now representing 28.5% of your total spending. Consider setting a monthly dining budget.",
    "severity": "warning",
    "chartData": {
      "monthlyTrend": {
        "months": ["2024-08", "2024-09", "2024-10", "2024-11", "2024-12", "2025-01"],
        "income": [5100, 5200, 5400, 5300, 5500, 5400],
        "spending": [4200, 4100, 4500, 4300, 4400, 4200]
      },
      "categoryBreakdown": {
        "categories": [
          {"name": "Dining & Restaurants", "amount": 847.32, "percentage": 28.5, "color": "rose"},
          {"name": "Groceries", "amount": 654.21, "percentage": 22.0, "color": "green"},
          {"name": "Transportation", "amount": 432.15, "percentage": 14.5, "color": "blue"},
          {"name": "Entertainment", "amount": 298.50, "percentage": 10.0, "color": "purple"}
        ]
      },
      "budget": {
        "totalBudget": 4500.00,
        "totalSpent": 2973.45,
        "utilizationPercentage": 66.1,
        "forecastEndOfMonth": 4200.00
      }
    }
  }
]
```

---

## Implementation Checklist

### Step 1: Update insightsGenerator.ts
- [ ] Replace the prompt in `analyzeSpendingPatterns()` function (line 134-158)
- [ ] Update the response parsing to extract `chartData` from each insight
- [ ] Store `chartData` in the `data` field of the insight

### Step 2: Update Chart Components to Accept Real Data
- [ ] Modify `SpendingIncomeChart.tsx` to accept `monthlyTrend` prop
- [ ] Modify `LoanDebtChart.tsx` to accept `categoryBreakdown` prop (rename to CategoryChart)
- [ ] Modify `BudgetForecastChart.tsx` to accept `budget` prop

### Step 3: Create Utility Functions
- [ ] Create `src/utils/chartHelpers.ts` with:
  - `convertMonthlyDataToSVGPath(months[], values[])` - generates SVG path from data arrays
  - `calculateBarPercentages(amounts[])` - converts amounts to percentage heights for bars
  - `formatCurrency(amount)` - consistent currency formatting

### Step 4: Update DashboardExample.tsx
- [ ] Fetch insights from API
- [ ] Extract `chartData` from the first insight
- [ ] Pass real data to chart components instead of hardcoded values
- [ ] Add loading states while fetching

### Step 5: Update Database Types
- [ ] Add `ChartData` interface to `src/types/database.ts` matching the schema above
- [ ] Update `AIInsight.data` type to be `ChartData | unknown`

---

## Benefits of This Approach

✅ **Works with existing code** - No need to rebuild charts from scratch
✅ **Simple data structure** - Easy for AI to generate, easy for frontend to consume
✅ **Keeps beautiful animations** - All existing chart animations stay intact
✅ **Single source of truth** - One insight provides data for all 3 charts
✅ **Backward compatible** - Can still work with mock data during development
✅ **Extensible** - Easy to add more fields later without breaking changes

---

## Next Steps After Implementation

Once the charts are working with real data:
1. Add more sophisticated AI analysis (trend detection, anomaly highlighting)
2. Create chart-specific insights (different insights for different charts)
3. Add user interaction (click categories to filter transactions)
4. Implement chart export/screenshot functionality
5. Add comparison modes (this month vs last month, YoY)
