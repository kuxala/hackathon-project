-- =====================================================
-- Migration: Fix Chart Calculations and Data Structure
-- =====================================================
-- This script updates the ai_insights table to use the new
-- corrected budget data structure with monthly averages
-- instead of meaningless lifetime totals.
--
-- Run this in Supabase SQL Editor
-- =====================================================

-- OPTION 1: Delete all existing insights (simplest - they'll regenerate on next upload)
-- Uncomment the following line to clear all old insights:
-- DELETE FROM ai_insights WHERE insight_type = 'spending_pattern';

-- OPTION 2: Update existing insights to use new data structure
-- This is more complex but preserves insight history

-- First, let's see what we have
SELECT
  id,
  user_id,
  insight_type,
  title,
  jsonb_pretty(data) as current_data,
  generated_at
FROM ai_insights
WHERE insight_type = 'spending_pattern'
LIMIT 5;

-- =====================================================
-- UPDATE EXISTING INSIGHTS WITH CORRECTED CALCULATIONS
-- =====================================================

-- Update spending_pattern insights to recalculate budget data
-- This uses PostgreSQL's JSONB functions to transform the data

UPDATE ai_insights
SET
  data = jsonb_set(
    data,
    '{budget}',
    jsonb_build_object(
      'averageMonthlySpending',
      COALESCE(
        (SELECT AVG(debits)
         FROM jsonb_to_recordset(data->'monthlyTrend'->'spending') AS x(debits numeric)),
        COALESCE((data->'budget'->>'totalSpent')::numeric, 0)
      ),
      'averageMonthlyIncome',
      COALESCE(
        (SELECT AVG(income)
         FROM jsonb_to_recordset(data->'monthlyTrend'->'income') AS x(income numeric)),
        COALESCE((data->'budget'->>'totalBudget')::numeric / 0.8, 0)
      ),
      'savingsRate',
      CASE
        WHEN COALESCE(
          (SELECT AVG(income)
           FROM jsonb_to_recordset(data->'monthlyTrend'->'income') AS x(income numeric)),
          0
        ) > 0 THEN
          (
            (
              COALESCE(
                (SELECT AVG(income)
                 FROM jsonb_to_recordset(data->'monthlyTrend'->'income') AS x(income numeric)),
                0
              ) -
              COALESCE(
                (SELECT AVG(debits)
                 FROM jsonb_to_recordset(data->'monthlyTrend'->'spending') AS x(debits numeric)),
                0
              )
            ) /
            COALESCE(
              (SELECT AVG(income)
               FROM jsonb_to_recordset(data->'monthlyTrend'->'income') AS x(income numeric)),
              1
            ) * 100
          )
        ELSE 0
      END,
      'lastMonthSpending',
      COALESCE(
        (data->'monthlyTrend'->'spending'->-1)::numeric,
        0
      ),
      'trendPercentage',
      CASE
        WHEN jsonb_array_length(data->'monthlyTrend'->'spending') >= 2
        AND (data->'monthlyTrend'->'spending'->-2)::numeric > 0 THEN
          (
            (
              (data->'monthlyTrend'->'spending'->-1)::numeric -
              (data->'monthlyTrend'->'spending'->-2)::numeric
            ) /
            (data->'monthlyTrend'->'spending'->-2)::numeric * 100
          )
        ELSE 0
      END,
      -- Keep legacy fields for backward compatibility
      'totalBudget', data->'budget'->'totalBudget',
      'totalSpent', data->'budget'->'totalSpent',
      'utilizationPercentage', data->'budget'->'utilizationPercentage',
      'forecastEndOfMonth', data->'budget'->'forecastEndOfMonth'
    )
  )
WHERE
  insight_type = 'spending_pattern'
  AND data ? 'monthlyTrend'
  AND data ? 'budget';

-- =====================================================
-- VERIFY THE UPDATE
-- =====================================================

-- Check the updated data
SELECT
  id,
  user_id,
  title,
  data->'budget'->>'averageMonthlySpending' as avg_spending,
  data->'budget'->>'averageMonthlyIncome' as avg_income,
  data->'budget'->>'savingsRate' as savings_rate,
  data->'budget'->>'trendPercentage' as trend,
  generated_at
FROM ai_insights
WHERE insight_type = 'spending_pattern'
AND data->'budget' ? 'averageMonthlySpending'
ORDER BY generated_at DESC
LIMIT 10;

-- =====================================================
-- ALTERNATIVE: Simple approach - Delete and regenerate
-- =====================================================

-- If the update above is too complex or doesn't work properly,
-- you can simply delete all existing insights and let the system
-- regenerate them with the correct calculations on next data upload:

/*
-- Delete all spending_pattern insights
DELETE FROM ai_insights WHERE insight_type = 'spending_pattern';

-- Or delete all insights for a specific user
DELETE FROM ai_insights WHERE user_id = 'YOUR_USER_ID_HERE';

-- The new insights will be generated automatically when:
-- 1. User uploads a new bank statement
-- 2. You call POST /api/insights programmatically
*/

-- =====================================================
-- CLEANUP: Remove insights with invalid data
-- =====================================================

-- Delete insights that don't have the monthlyTrend structure
-- (These are likely corrupted or from old system)
DELETE FROM ai_insights
WHERE insight_type = 'spending_pattern'
AND (
  data->'monthlyTrend' IS NULL
  OR jsonb_array_length(data->'monthlyTrend'->'months') = 0
);

-- =====================================================
-- SUCCESS!
-- =====================================================
-- Your insights should now show:
-- ✅ Average monthly spending (not lifetime totals)
-- ✅ Savings rate percentage
-- ✅ Month-over-month trend
-- ✅ Meaningful financial metrics
-- =====================================================
