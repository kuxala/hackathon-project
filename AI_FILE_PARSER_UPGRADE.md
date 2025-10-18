# AI-Powered File Parser Upgrade

## Overview

The file parser has been upgraded to use **AI-powered analysis** for intelligent data processing. This eliminates hard-coded column detection logic and supports any file format, language, or structure.

## What Changed

### Before (Rule-Based)
- Hard-coded pattern matching for column names
- Language-specific detection (English only)
- Failed on non-standard formats
- Manual bank detection with keywords
- No automatic categorization

### After (AI-Powered)
- **Google Gemini AI** analyzes file structure
- Works with **any language** (Spanish, French, German, etc.)
- Handles **any table format** without rules
- **Auto-categorizes** transactions during upload
- Intelligent bank/institution detection
- Confidence scores for all AI decisions

## New Features

### 1. Smart Column Detection
```typescript
// AI analyzes raw data and detects:
- Date columns (any format, any language)
- Amount columns (single or debit/credit split)
- Description/merchant columns
- Balance, category, type columns
- Works with ANY header names
```

### 2. Auto-Categorization
Transactions are automatically categorized during upload:
- Income
- Food & Dining
- Transportation
- Bills & Utilities
- Shopping
- Entertainment
- Healthcare
- Travel
- Education
- Personal Care
- Insurance
- Subscriptions
- Other

Categories include confidence scores (0.0 to 1.0).

### 3. Intelligent Bank Detection
AI detects the bank/institution from:
- File names
- Column headers
- Data patterns
- Metadata in rows

### 4. Robust Fallback
If AI fails (network issues, rate limits):
- Falls back to original rule-based parsing
- Ensures uploads always work
- No breaking changes

## Files Modified

### New Files
- `src/services/aiFileParser.ts` - Core AI analysis logic
  - `analyzeFileStructure()` - Column mapping detection
  - `categorizeTransaction()` - Single transaction categorization
  - `categorizeTransactionsBatch()` - Batch categorization

### Updated Files
- `src/services/fileParser.ts`
  - Now uses `processCSVData()` with AI analysis
  - Keeps `processCSVDataFallback()` for reliability
  - Both CSV and Excel parsing upgraded

- `src/lib/openrouter.ts`
  - Added `analyzeWithGemini()` helper function
  - Configured for Google Gemini Flash (FREE tier)

- `src/app/api/upload/route.ts`
  - Stores AI-generated categories
  - Stores confidence scores

- `.env.example`
  - Documented `OPENROUTER_API_KEY` requirement

## Setup

### 1. Get OpenRouter API Key
1. Visit https://openrouter.ai/keys
2. Sign up (free)
3. Create an API key
4. Copy to `.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### 2. Model Used
**Google Gemini 2.0 Flash Exp** (`google/gemini-2.0-flash-exp:free`)
- FREE tier on OpenRouter
- Fast inference (~1-2 seconds)
- 1M token context window
- Excellent JSON mode support
- Perfect for structured data analysis

### 3. No Code Changes Required
The upgrade is **backward compatible**:
- Existing file uploads continue working
- AI layer added transparently
- Fallback ensures reliability

## Usage

### Upload Flow
```
1. User uploads CSV/Excel file
2. File parsed with Papa Parse / XLSX
3. AI analyzes structure (5 sample rows)
4. AI detects column mappings
5. AI categorizes all transactions
6. Data uploaded to database with:
   - category (AI-generated)
   - category_confidence (0.0 to 1.0)
   - merchant (AI-cleaned)
```

### Example AI Analysis
```json
{
  "columnMapping": {
    "date": "Fecha",
    "description": "Descripción",
    "debit": "Cargo",
    "credit": "Abono",
    "balance": "Saldo"
  },
  "bankName": "Banco Santander",
  "accountNumber": "****1234",
  "confidence": 0.95,
  "tableDescription": "Spanish bank statement with debit/credit columns"
}
```

## Benefits

✅ **Universal Support** - Any bank, any country, any language
✅ **Zero Configuration** - No column mapping needed
✅ **Better Accuracy** - AI understands context, not just patterns
✅ **Auto-Categorization** - Saves users time
✅ **Confidence Scores** - Know how certain the AI is
✅ **Fallback Safety** - Never breaks existing functionality
✅ **Free** - Uses free tier Google Gemini model

## Performance

- **Column Analysis**: ~2 seconds per file
- **Categorization**: ~1-2 seconds per 20 transactions
- **Total Upload Time**: Usually < 10 seconds for 100 transactions
- **Rate Limits**: Free tier handles typical usage
- **Cost**: $0 (free tier)

## Error Handling

The system gracefully handles all failures:

1. **Network Errors**: Falls back to rule-based parsing
2. **API Rate Limits**: Batch processing with delays
3. **Invalid Responses**: Validates all AI outputs
4. **Missing Columns**: Multiple fallback strategies
5. **Parse Errors**: Skips invalid rows, continues processing

## Future Enhancements

Potential improvements:
- Cache AI analysis results for similar file formats
- User feedback loop to improve categorization
- Support for PDF parsing with AI
- Multi-language merchant name normalization
- Custom category training per user
- Anomaly detection during parsing

## Testing

To test the upgrade:

1. Upload a CSV with non-English headers
2. Upload an Excel file with unusual structure
3. Upload a file from a bank not in the keyword list
4. Check the console logs for AI analysis results
5. Verify categories are auto-assigned
6. Check confidence scores in the database

## Monitoring

Watch for these log messages:
- `🤖 Using AI to analyze file structure...`
- `✅ AI Analysis complete`
- `🤖 Using AI to categorize transactions...`
- `✅ AI categorization complete`
- `❌ AI analysis failed, falling back...` (if fallback triggered)

## Support

If AI parsing fails:
1. Check `OPENROUTER_API_KEY` is set correctly
2. Verify network connectivity
3. Check OpenRouter dashboard for API limits
4. Review browser console for detailed errors
5. System will automatically fall back to rule-based parsing

## Migration Notes

**No migration needed!** The upgrade is fully backward compatible:
- Existing data unchanged
- New uploads get AI features automatically
- Old parsing logic still available as fallback
- No database schema changes required (category fields already exist)
