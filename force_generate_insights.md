# Force Generate Missing Insights

## Problem
The database has no `spending_pattern` insights, which contain the chart data.

## Solution

### Method 1: Via Browser Console

1. Open your dashboard in the browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Run this code:

```javascript
// Get the current session token
const session = await (await fetch('/api/auth/session')).json()

// Force generate insights
const response = await fetch('/api/insights', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    time_period: '1y' // Generate for last year
  })
})

const result = await response.json()
console.log('Generated insights:', result)
```

### Method 2: Via cURL

Replace `YOUR_ACCESS_TOKEN` with your actual token:

```bash
curl -X POST http://localhost:3000/api/insights \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"time_period": "1y"}'
```

### Method 3: Upload Bank Statement

Just upload any CSV/Excel bank statement through the dashboard. This will:
1. Import transactions
2. Automatically generate ALL insights including `spending_pattern`

---

## Verify It Worked

Run this in Supabase SQL Editor:

```sql
SELECT
  insight_type,
  COUNT(*) as count
FROM ai_insights
GROUP BY insight_type
ORDER BY count DESC;
```

You should now see `spending_pattern` in the list!

---

## Why Did This Happen?

The insights were probably deleted or never generated. The `spending_pattern` insight is the master insight that contains all the chart data (`monthlyTrend`, `categoryBreakdown`, `budget`).
