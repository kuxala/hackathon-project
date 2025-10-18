-- Migration: Clean up bad data and add date constraints
-- Run this in Supabase SQL Editor

-- STEP 1: Identify bad data (run this first to see what will be deleted)
SELECT
  COUNT(*) as total_bad_transactions,
  COUNT(CASE WHEN transaction_date > CURRENT_DATE THEN 1 END) as future_dates,
  COUNT(CASE WHEN transaction_date < CURRENT_DATE - INTERVAL '10 years' THEN 1 END) as very_old_dates
FROM transactions
WHERE transaction_date > CURRENT_DATE
   OR transaction_date < CURRENT_DATE - INTERVAL '10 years';

-- STEP 2: Show sample of bad data
SELECT
  id,
  user_id,
  transaction_date,
  description,
  amount,
  CASE
    WHEN transaction_date > CURRENT_DATE THEN 'FUTURE DATE'
    WHEN transaction_date < CURRENT_DATE - INTERVAL '10 years' THEN 'TOO OLD'
  END as issue
FROM transactions
WHERE transaction_date > CURRENT_DATE
   OR transaction_date < CURRENT_DATE - INTERVAL '10 years'
ORDER BY transaction_date DESC
LIMIT 20;

-- STEP 3: Delete bad data
-- This will DELETE all transactions with future dates or dates older than 10 years
DELETE FROM transactions
WHERE transaction_date > CURRENT_DATE
   OR transaction_date < CURRENT_DATE - INTERVAL '10 years';

-- Show how many were deleted
SELECT
  'Cleanup complete' as status,
  COUNT(*) as remaining_transactions
FROM transactions;

-- STEP 4: Now add the constraints (this should work now)
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

-- STEP 5: Add tracking columns
DO $$
BEGIN
  -- Add file_upload_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'file_upload_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN file_upload_id UUID;
    RAISE NOTICE 'Added column: file_upload_id';
  ELSE
    RAISE NOTICE 'Column already exists: file_upload_id';
  END IF;

  -- Add original_date_value column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'original_date_value'
  ) THEN
    ALTER TABLE transactions ADD COLUMN original_date_value TEXT;
    RAISE NOTICE 'Added column: original_date_value';
  ELSE
    RAISE NOTICE 'Column already exists: original_date_value';
  END IF;

  -- Add import_errors column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'import_errors'
  ) THEN
    ALTER TABLE transactions ADD COLUMN import_errors JSONB;
    RAISE NOTICE 'Added column: import_errors';
  ELSE
    RAISE NOTICE 'Column already exists: import_errors';
  END IF;
END $$;

-- STEP 6: Add unique index to prevent duplicate transactions
DROP INDEX IF EXISTS idx_transactions_unique;
CREATE UNIQUE INDEX idx_transactions_unique ON transactions(
  user_id,
  transaction_date,
  description,
  amount,
  transaction_type
);

-- STEP 7: Add index for file_upload_id
CREATE INDEX IF NOT EXISTS idx_transactions_upload_id ON transactions(file_upload_id);

-- STEP 8: Verify everything
SELECT
  'Constraints Added' as status,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND conname LIKE 'check_transaction%';

-- Show index info
SELECT
  'Indexes Created' as status,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
  AND (indexname LIKE '%unique%' OR indexname LIKE '%upload%');

-- Final stats
SELECT
  'Final Statistics' as status,
  COUNT(*) as total_transactions,
  MIN(transaction_date) as oldest_date,
  MAX(transaction_date) as newest_date,
  COUNT(DISTINCT user_id) as total_users
FROM transactions;

COMMIT;
