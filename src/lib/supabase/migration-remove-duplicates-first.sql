-- Migration: Remove duplicates, clean bad data, then add constraints
-- Run this in Supabase SQL Editor

-- STEP 1: Identify duplicate transactions
SELECT
  user_id,
  transaction_date,
  description,
  amount,
  transaction_type,
  COUNT(*) as duplicate_count
FROM transactions
GROUP BY user_id, transaction_date, description, amount, transaction_type
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;

-- STEP 2: Show total duplicates
SELECT
  COUNT(*) as total_duplicate_groups,
  SUM(cnt - 1) as total_duplicates_to_remove
FROM (
  SELECT COUNT(*) as cnt
  FROM transactions
  GROUP BY user_id, transaction_date, description, amount, transaction_type
  HAVING COUNT(*) > 1
) duplicates;

-- STEP 3: Remove duplicates (keep the oldest one based on created_at)
-- This creates a temporary table with IDs to keep
CREATE TEMP TABLE transactions_to_keep AS
SELECT DISTINCT ON (user_id, transaction_date, description, amount, transaction_type)
  id
FROM transactions
ORDER BY user_id, transaction_date, description, amount, transaction_type, created_at ASC;

-- Delete duplicates (keep only the ones in transactions_to_keep)
DELETE FROM transactions
WHERE id NOT IN (SELECT id FROM transactions_to_keep);

-- Show results
SELECT
  'Duplicates removed' as status,
  COUNT(*) as remaining_transactions
FROM transactions;

-- STEP 4: Delete bad dates (future or too old)
DELETE FROM transactions
WHERE transaction_date > CURRENT_DATE
   OR transaction_date < CURRENT_DATE - INTERVAL '10 years';

-- Show results
SELECT
  'Bad dates removed' as status,
  COUNT(*) as remaining_transactions
FROM transactions;

-- STEP 5: Now add the constraints
DO $$
BEGIN
  -- Add constraint to prevent future dates
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_transaction_date_not_future'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT check_transaction_date_not_future
    CHECK (transaction_date <= CURRENT_DATE);
    RAISE NOTICE 'Added constraint: check_transaction_date_not_future';
  ELSE
    RAISE NOTICE 'Constraint already exists: check_transaction_date_not_future';
  END IF;

  -- Add constraint to prevent dates older than 10 years
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_transaction_date_reasonable'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT check_transaction_date_reasonable
    CHECK (transaction_date >= CURRENT_DATE - INTERVAL '10 years');
    RAISE NOTICE 'Added constraint: check_transaction_date_reasonable';
  ELSE
    RAISE NOTICE 'Constraint already exists: check_transaction_date_reasonable';
  END IF;
END $$;

-- STEP 6: Add tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'file_upload_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN file_upload_id UUID;
    RAISE NOTICE 'Added column: file_upload_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'original_date_value'
  ) THEN
    ALTER TABLE transactions ADD COLUMN original_date_value TEXT;
    RAISE NOTICE 'Added column: original_date_value';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'import_errors'
  ) THEN
    ALTER TABLE transactions ADD COLUMN import_errors JSONB;
    RAISE NOTICE 'Added column: import_errors';
  END IF;
END $$;

-- STEP 7: Create unique index (should work now that duplicates are removed)
DROP INDEX IF EXISTS idx_transactions_unique;
CREATE UNIQUE INDEX idx_transactions_unique ON transactions(
  user_id,
  transaction_date,
  description,
  amount,
  transaction_type
);

-- STEP 8: Add other indexes
CREATE INDEX IF NOT EXISTS idx_transactions_upload_id ON transactions(file_upload_id);

-- STEP 9: Verify everything
SELECT
  'Migration Complete' as status,
  COUNT(*) as total_transactions,
  MIN(transaction_date) as oldest_date,
  MAX(transaction_date) as newest_date,
  COUNT(DISTINCT user_id) as total_users
FROM transactions;

-- Show constraints
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND conname LIKE 'check_transaction%';

-- Show indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
  AND (indexname LIKE '%unique%' OR indexname LIKE '%upload%');

COMMIT;
