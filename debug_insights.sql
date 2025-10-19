-- Debug: Check what insights exist in the database
-- Run this in Supabase SQL Editor

-- 1. Count total insights
SELECT
  insight_type,
  COUNT(*) as count
FROM ai_insights
GROUP BY insight_type
ORDER BY count DESC;

-- 2. Check spending_pattern insights
SELECT
  id,
  user_id,
  title,
  insight_type,
  data ? 'monthlyTrend' as has_monthly_trend,
  data ? 'categoryBreakdown' as has_category_breakdown,
  data ? 'budget' as has_budget,
  data->'budget' ? 'averageMonthlySpending' as has_new_budget_structure,
  jsonb_pretty(data->'budget') as budget_data,
  generated_at
FROM ai_insights
WHERE insight_type = 'spending_pattern'
ORDER BY generated_at DESC
LIMIT 5;

-- 3. Check the actual data structure
SELECT
  jsonb_pretty(data) as full_data
FROM ai_insights
WHERE insight_type = 'spending_pattern'
ORDER BY generated_at DESC
LIMIT 1;
