-- Check if there are transactions in the database
-- Run this in Supabase SQL Editor

-- 1. Count total transactions by user
SELECT
  user_id,
  COUNT(*) as transaction_count,
  MIN(transaction_date) as earliest_transaction,
  MAX(transaction_date) as latest_transaction,
  SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END) as total_debits,
  SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END) as total_credits
FROM transactions
GROUP BY user_id
ORDER BY transaction_count DESC;

-- 2. Sample transactions
SELECT
  user_id,
  transaction_date,
  description,
  amount,
  transaction_type,
  category,
  created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if insights exist for users with transactions
SELECT
  t.user_id,
  COUNT(DISTINCT t.id) as transaction_count,
  COUNT(DISTINCT ai.id) as insight_count,
  COUNT(DISTINCT CASE WHEN ai.insight_type = 'spending_pattern' THEN ai.id END) as spending_pattern_count
FROM transactions t
LEFT JOIN ai_insights ai ON t.user_id = ai.user_id
GROUP BY t.user_id;
