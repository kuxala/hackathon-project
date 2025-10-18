-- Migration: Add date constraints and duplicate prevention
-- Run this in Supabase SQL Editor

-- 1. Add constraint to prevent future dates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_transaction_date_not_future'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT check_transaction_date_not_future
    CHECK (transaction_date <= CURRENT_DATE);
  END IF;
END $$;

-- 2. Add constraint to prevent dates older than 10 years
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_transaction_date_reasonable'
  ) THEN
    ALTER TABLE transactions
    ADD CONSTRAINT check_transaction_date_reasonable
    CHECK (transaction_date >= CURRENT_DATE - INTERVAL '10 years');
  END IF;
END $$;

-- 3. Add columns for better tracking
DO $$
BEGIN
  -- Add file_upload_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'file_upload_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN file_upload_id UUID;
  END IF;

  -- Add original_date_value column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'original_date_value'
  ) THEN
    ALTER TABLE transactions ADD COLUMN original_date_value TEXT;
  END IF;

  -- Add import_errors column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'import_errors'
  ) THEN
    ALTER TABLE transactions ADD COLUMN import_errors JSONB;
  END IF;
END $$;

-- 4. Add unique index to prevent duplicate transactions
-- This allows the same transaction to exist for different users
DROP INDEX IF EXISTS idx_transactions_unique;
CREATE UNIQUE INDEX idx_transactions_unique ON transactions(
  user_id,
  transaction_date,
  description,
  amount,
  transaction_type
);

-- 5. Add index for file_upload_id
CREATE INDEX IF NOT EXISTS idx_transactions_upload_id ON transactions(file_upload_id);

-- 6. Clean up existing invalid data (optional - comment out if you want to keep existing data)
-- This will DELETE transactions with future dates or dates older than 10 years
-- UNCOMMENT ONLY IF YOU WANT TO CLEAN EXISTING DATA:

-- DELETE FROM transactions
-- WHERE transaction_date > CURRENT_DATE
--    OR transaction_date < CURRENT_DATE - INTERVAL '10 years';

-- 7. Verify constraints
SELECT
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'transactions'::regclass
  AND conname LIKE 'check_transaction%';

-- 8. Verify indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'transactions'
  AND indexname LIKE '%unique%';

COMMIT;
