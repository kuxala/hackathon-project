# Database Migration: Fix Chart Calculations

## What Was Fixed

The chart calculations were using **lifetime totals** instead of **monthly averages**, making them meaningless.

**Before (WRONG):**
- Budget: $48,000 (12 months × $5000 × 0.8)
- Spent: $48,000 (sum of all months)
- Meaningless percentages

**After (CORRECT):**
- Average Monthly Spending: $4,200
- Savings Rate: 16% of income
- Month-over-month trend: +3.5%

---

## How to Run the SQL Migration

### Option 1: Simple Cleanup (Recommended)

**Best for:** Quick fix, let the system regenerate insights automatically

1. Go to Supabase SQL Editor
2. Open `simple_cleanup.sql`
3. Run the script:
```sql
DELETE FROM ai_insights WHERE insight_type = 'spending_pattern';
```

**Result:** Old insights deleted. New ones will generate automatically on next:
- Bank statement upload
- POST request to `/api/insights`

---

### Option 2: In-Place Update (Advanced)

**Best for:** Preserving insight history

1. Go to Supabase SQL Editor
2. Open `fix_chart_calculations.sql`
3. Run the full script

**What it does:**
- Updates existing insights with correct calculations
- Converts old `totalBudget/totalSpent` to monthly averages
- Calculates `savingsRate` and `trendPercentage`
- Keeps legacy fields for backward compatibility

---

## Verification

After running either option, verify the fix:

```sql
SELECT
  id,
  user_id,
  title,
  data->'budget'->>'averageMonthlySpending' as avg_spending,
  data->'budget'->>'averageMonthlyIncome' as avg_income,
  data->'budget'->>'savingsRate' as savings_rate,
  data->'budget'->>'trendPercentage' as trend
FROM ai_insights
WHERE insight_type = 'spending_pattern'
ORDER BY generated_at DESC
LIMIT 5;
```

You should see:
- `avg_spending`: Realistic monthly amount (e.g., 4200)
- `avg_income`: Realistic monthly amount (e.g., 5000)
- `savings_rate`: Percentage (e.g., 16.0)
- `trend`: Month-over-month change (e.g., 3.5)

---

## Frontend Changes

The following charts now display correctly:

1. **"Category Spending Breakdown"** (renamed from "Loan & Debt Overview")
   - Shows actual spending categories

2. **"Monthly Savings Rate"** (renamed from "Budget & Forecast")
   - Main value: Average monthly spending
   - Subtitle: Savings rate percentage
   - Trend: Month-over-month change
   - Color: Green (>20%), Amber (10-20%), Red (<10%)

---

## Troubleshooting

### Old data still showing?

Clear your browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

### Charts not updating?

Run the simple cleanup script, then:
1. Upload a new bank statement, OR
2. Make a POST request to `/api/insights` to regenerate

### SQL errors?

Make sure you're running the queries in Supabase SQL Editor with proper permissions.

---

## Files

- `simple_cleanup.sql` - Quick cleanup script (recommended)
- `fix_chart_calculations.sql` - Advanced in-place update
- `README.md` - This file

---

**All fixed!** ✅
