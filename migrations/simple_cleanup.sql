-- =====================================================
-- SIMPLE CLEANUP: Delete old insights to force regeneration
-- =====================================================
-- Run this in Supabase SQL Editor to clear old insights
-- with incorrect calculations. New insights with correct
-- calculations will be generated automatically.
-- =====================================================

-- Option 1: Delete ALL old insights (recommended)
DELETE FROM ai_insights WHERE insight_type = 'spending_pattern';

-- Option 2: Delete insights for a specific user only
-- DELETE FROM ai_insights
-- WHERE user_id = 'YOUR_USER_ID_HERE'
-- AND insight_type = 'spending_pattern';

-- Verify deletion
SELECT COUNT(*) as remaining_insights
FROM ai_insights
WHERE insight_type = 'spending_pattern';

-- =====================================================
-- After running this script:
-- =====================================================
-- 1. New insights will be generated when you upload a bank statement
-- 2. Or you can trigger generation via POST /api/insights
-- 3. The new insights will have correct monthly averages
-- =====================================================
