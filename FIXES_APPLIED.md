# File Upload & Date Parsing Fixes Applied

## Summary
Fixed critical bugs in date parsing and file upload logic that were causing transactions to show future dates in the "Spending vs. Income" chart.

## Root Cause
The `normalizeDate()` function in `fileParser.ts` was falling back to **today's date** whenever it failed to parse a date, causing past transactions with ambiguous formats to be assigned incorrect future dates.

## Changes Made

### 1. Fixed Date Parsing (src/services/fileParser.ts:549-633)

#### Before:
```typescript
function normalizeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      // ...attempt MM/DD/YYYY
      throw new Error('Invalid date format')
    }
    return date.toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0] // ❌ FALLBACK TO TODAY
  }
}
```

#### After:
```typescript
function normalizeDate(dateValue: any): string | null {
  // ✅ Handle Excel serial numbers (45230 → 2023-11-01)
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    parsedDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000)
  }

  // ✅ Try multiple date formats
  // ISO: YYYY-MM-DD
  // US: MM/DD/YYYY
  // EU: DD-MM-YYYY, DD.MM.YYYY

  // ✅ Reject future dates
  if (parsedDate > now) return null

  // ✅ Reject dates older than 10 years
  if (parsedDate < tenYearsAgo) return null

  // ✅ Return null instead of fallback
  return parsedDate?.toISOString().split('T')[0] || null
}
```

### 2. Added Transaction Validation

**New Features:**
- Skip transactions with invalid dates instead of using fallback
- Track which rows were skipped and why
- Return detailed parsing statistics

**New Interface:**
```typescript
interface ParseResult {
  success: boolean
  transactions: ParsedTransaction[]
  // ... existing fields ...
  stats?: {
    totalRows: number
    importedRows: number
    skippedRows: number
    skippedReasons?: Array<{
      row: number
      reason: string
      value?: any
    }>
  }
}
```

### 3. Improved Excel Parsing (src/services/fileParser.ts:115-118)

**Before:**
```typescript
const jsonData = XLSX.utils.sheet_to_json(worksheet) as CSVRow[]
```

**After:**
```typescript
const jsonData = XLSX.utils.sheet_to_json(worksheet, {
  raw: false,           // ✅ Convert dates to strings
  dateNF: 'yyyy-mm-dd' // ✅ Use ISO format
}) as CSVRow[]
```

### 4. Database Schema Updates

**New Migration File:** `src/lib/supabase/migration-add-date-constraints.sql`

**Added Constraints:**
```sql
-- Prevent future dates
ALTER TABLE transactions
ADD CONSTRAINT check_transaction_date_not_future
CHECK (transaction_date <= CURRENT_DATE);

-- Prevent very old dates (older than 10 years)
ALTER TABLE transactions
ADD CONSTRAINT check_transaction_date_reasonable
CHECK (transaction_date >= CURRENT_DATE - INTERVAL '10 years');

-- Prevent duplicate transactions
CREATE UNIQUE INDEX idx_transactions_unique ON transactions(
  user_id, transaction_date, description, amount, transaction_type
);
```

**Added Tracking Columns:**
- `file_upload_id UUID` - Group transactions by upload session
- `original_date_value TEXT` - Store original date from file
- `import_errors JSONB` - Store any parsing errors

### 5. Enhanced Upload API (src/app/api/upload/route.ts)

**New Features:**
- Generate unique `file_upload_id` for each batch
- Check for potential duplicates before inserting
- Include parsing statistics in response
- Better error messages

**Response Now Includes:**
```json
{
  "success": true,
  "message": "Successfully imported 150 transactions",
  "preview": {
    "stats": {
      "totalRows": 200,
      "importedRows": 150,
      "skippedRows": 50,
      "skippedReasons": [
        { "row": 5, "reason": "Invalid or future date", "value": "2027-01-01" },
        { "row": 12, "reason": "Invalid or zero amount" }
      ]
    },
    "potentialDuplicates": 10
  }
}
```

### 6. Already Fixed (Previous Changes)

**chatDataService.ts** - Filter future dates when fetching monthly trends:
```typescript
.lte('transaction_date', todayStr)  // Don't include future dates
```

**insightsGenerator.ts** - Skip future transactions in statistics:
```typescript
if (transactionDate > now) return  // Skip future transactions
```

## Expected Behavior with bog-statement-v2.xlsx

Your demo file has this structure:
```
Date        | Description | Type    | Amount | Balance
2024-10-01  | Salary      | Income  | 3000   | 5000.00
2024-10-03  | Rent        | Expense | 1000   | 4000.00
```

**After These Fixes:**
- ✅ All dates parse correctly (YYYY-MM-DD format)
- ✅ "Income" → credit, "Expense" → debit
- ✅ No future dates allowed
- ✅ Charts show correct last 12 months
- ✅ Month labels display properly (Oct '24, Nov '24, Dec '24, Jan '25)
- ✅ Duplicate detection warns user
- ✅ Invalid rows are skipped with detailed reasons

## Next Steps

### 1. Run Database Migration
Execute the migration in Supabase SQL Editor:
```bash
# Open: src/lib/supabase/migration-add-date-constraints.sql
# Copy and run in Supabase Dashboard → SQL Editor
```

### 2. Test Upload
1. Upload `bog-statement-v2.xlsx`
2. Check console for any warnings about skipped rows
3. Verify all transactions appear with correct dates
4. Check chart shows data in correct chronological order

### 3. Clean Existing Bad Data (Optional)
If you have existing transactions with future dates, uncomment this in the migration:
```sql
DELETE FROM transactions
WHERE transaction_date > CURRENT_DATE
   OR transaction_date < CURRENT_DATE - INTERVAL '10 years';
```

## Files Modified

1. ✅ `src/services/fileParser.ts` - Complete date parsing overhaul
2. ✅ `src/app/api/upload/route.ts` - Added validation & duplicate detection
3. ✅ `src/lib/supabase/migration-add-date-constraints.sql` - Database constraints (NEW)
4. ✅ `src/services/chatDataService.ts` - Already fixed
5. ✅ `src/services/insightsGenerator.ts` - Already fixed
6. ✅ `src/app/dashboard/components/SpendingIncomeChart.tsx` - Month labels fixed

## Testing Checklist

- [ ] Run database migration
- [ ] Upload bog-statement-v2.xlsx
- [ ] Verify no future dates in database
- [ ] Check "Spending vs. Income" chart displays correctly
- [ ] Month labels show in correct order
- [ ] Try uploading same file twice (should see duplicate warning)
- [ ] Upload file with intentionally bad dates (should skip those rows)
- [ ] Check console for parsing statistics

## Support for Different Date Formats

The new parser supports:
- ✅ YYYY-MM-DD (ISO format)
- ✅ MM/DD/YYYY (US format)
- ✅ DD-MM-YYYY (EU format)
- ✅ DD.MM.YYYY (EU dot format)
- ✅ Excel serial numbers (45230)
- ✅ Date objects from Excel

All dates are validated to be:
- ✅ Not in the future
- ✅ Not older than 10 years
- ✅ Valid calendar dates
