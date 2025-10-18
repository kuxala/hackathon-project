import { createChatCompletion } from '@/lib/openrouter'

export interface RawDataRow {
  [key: string]: string | number
}

export interface ColumnMapping {
  date?: string
  description?: string
  amount?: string
  debit?: string
  credit?: string
  balance?: string
  type?: string
  merchant?: string
  category?: string
}

export interface AIAnalysisResult {
  columnMapping: ColumnMapping
  bankName?: string
  accountNumber?: string
  confidence: number
  suggestions?: string
  tableDescription?: string
}

export interface AICategorizationResult {
  category: string
  confidence: number
  merchant?: string
}

/**
 * Analyze file structure using AI to detect column mappings
 * Uses free Google Gemini model for intelligent column detection
 */
export async function analyzeFileStructure(
  sampleRows: RawDataRow[],
  fileName?: string
): Promise<AIAnalysisResult> {

  if (sampleRows.length === 0) {
    throw new Error('No data rows provided for analysis')
  }

  // Take first 5 rows as sample (reduce token usage)
  const sample = sampleRows.slice(0, 5)
  const headers = Object.keys(sample[0])


  const prompt = `You are an expert at analyzing financial transaction data from bank statements and CSV/Excel files.

Analyze this data sample and identify the column mappings:

HEADERS: ${headers.join(', ')}

SAMPLE DATA (first ${sample.length} rows):
${JSON.stringify(sample, null, 2)}

${fileName ? `FILE NAME: ${fileName}` : ''}

Your task:
1. Identify which column represents (look at BOTH column names AND actual data values):
   - date (transaction date - could be in ANY format: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY, etc.)
   - description (transaction description/details - text describing the transaction)
   - amount (single amount column) OR debit/credit (separate columns for money in/out)
   - balance (account balance, if present)
   - type (transaction type like 'debit'/'credit', if present)
   - merchant (merchant name, if separate from description)
   - category (transaction category, if already categorized)

HINT: Look carefully at the ACTUAL DATA VALUES to identify what each column contains, not just the header names!

2. Detect the bank/financial institution name from:
   - File name
   - Column headers
   - Data patterns
   - Any metadata in the rows

3. Extract account number if visible (return last 4 digits only)

4. Provide confidence score (0.0 to 1.0) for your analysis

IMPORTANT RULES:
- DO YOUR BEST to identify columns even if the structure is unusual
- Column names can be in ANY language (Spanish, French, German, Georgian, etc.)
- Some files have merged cells or metadata rows - identify actual data columns
- Amount might be in one column OR split into debit/credit
- Return EXACT column names from the headers, not translated versions
- If a field is not clearly identifiable, set it to null (but try your best first!)
- Look for context clues in the data values themselves
- Even if you're not 100% confident, provide your best guess for date and amount fields

Respond ONLY with valid JSON in this format:
{
  "columnMapping": {
    "date": "exact_column_name_or_null",
    "description": "exact_column_name_or_null",
    "amount": "exact_column_name_or_null",
    "debit": "exact_column_name_or_null",
    "credit": "exact_column_name_or_null",
    "balance": "exact_column_name_or_null",
    "type": "exact_column_name_or_null",
    "merchant": "exact_column_name_or_null",
    "category": "exact_column_name_or_null"
  },
  "bankName": "detected_bank_name_or_null",
  "accountNumber": "last_4_digits_or_null",
  "confidence": 0.95,
  "tableDescription": "brief description of what this data represents"
}`

  try {
    // Use GPT-4o Mini for accurate file structure analysis
    const response = await createChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial data analysis expert. Analyze ANY file structure and do your best to identify columns. Always respond with valid JSON only, no markdown, no explanations. Make your best guess even if uncertain.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent analysis
      max_tokens: 1500 // Reduced tokens for faster response
    })


    const responseText = response.choices[0].message.content

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('AI did not return valid JSON structure')
    }

    const analysis: AIAnalysisResult = JSON.parse(jsonMatch[0])

    // Clean up null values and remove empty mappings
    const cleanMapping: ColumnMapping = {}
    Object.entries(analysis.columnMapping).forEach(([key, value]) => {
      if (value && value !== 'null' && headers.includes(value as string)) {
        cleanMapping[key as keyof ColumnMapping] = value as string
      }
    })
    analysis.columnMapping = cleanMapping

    // Return analysis without strict validation - let the parser handle missing fields
    return analysis

  } catch (error) {
    console.error('AI file structure analysis failed:', error)
    // Return empty analysis instead of throwing - fallback parser will handle it
    return {
      columnMapping: {},
      confidence: 0,
      suggestions: 'AI analysis failed, using fallback detection'
    }
  }
}

/**
 * Categorize a transaction using AI
 */
export async function categorizeTransaction(
  description: string,
  amount: number,
  merchant?: string
): Promise<AICategorizationResult> {
  const CATEGORIES = [
    'Income',
    'Food & Dining',
    'Transportation',
    'Bills & Utilities',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Travel',
    'Education',
    'Personal Care',
    'Insurance',
    'Subscriptions',
    'Other'
  ]

  const prompt = `Categorize this financial transaction:

Description: ${description}
Amount: $${amount}
${merchant ? `Merchant: ${merchant}` : ''}

Available categories:
${CATEGORIES.join(', ')}

Respond with JSON only:
{
  "category": "exact_category_name",
  "confidence": 0.95,
  "merchant": "cleaned_merchant_name_or_null"
}`

  try {
    const response = await createChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a financial categorization expert. Respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 150 // Reduced for faster response
    })

    const responseText = response.choices[0].message.content
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Invalid categorization response')
    }

    const result: AICategorizationResult = JSON.parse(jsonMatch[0])

    // Validate category
    if (!CATEGORIES.includes(result.category)) {
      result.category = 'Other'
      result.confidence = 0.5
    }

    return result

  } catch (error) {
    console.error('AI categorization failed:', error)
    // Fallback to "Other"
    return {
      category: 'Other',
      confidence: 0.3,
      merchant: merchant
    }
  }
}

/**
 * Batch categorize multiple transactions efficiently
 */
export async function categorizeTransactionsBatch(
  transactions: Array<{
    description: string
    amount: number
    merchant?: string
  }>,
  batchSize: number = 20
): Promise<AICategorizationResult[]> {
  const results: AICategorizationResult[] = []

  const CATEGORIES = [
    'Income',
    'Food & Dining',
    'Transportation',
    'Bills & Utilities',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Travel',
    'Education',
    'Personal Care',
    'Insurance',
    'Subscriptions',
    'Other'
  ]

  // Process in batches
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize)

    const prompt = `Categorize these ${batch.length} financial transactions:

Available categories: ${CATEGORIES.join(', ')}

Transactions:
${batch.map((t, idx) => `${idx + 1}. Description: "${t.description}", Amount: $${t.amount}${t.merchant ? `, Merchant: ${t.merchant}` : ''}`).join('\n')}

Respond with a JSON array:
[
  {
    "index": 1,
    "category": "exact_category_name",
    "confidence": 0.95,
    "merchant": "cleaned_merchant_name_or_null"
  },
  ...
]`

    try {
      const response = await createChatCompletion({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial categorization expert. Respond with valid JSON array only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: batch.length * 50 // Reduced for faster response
      })

      const responseText = response.choices[0].message.content
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)

      if (jsonMatch) {
        const batchResults = JSON.parse(jsonMatch[0])

        // Map results back to transactions
        batch.forEach((transaction, idx) => {
          const result = batchResults.find((r: any) => r.index === idx + 1)

          if (result && CATEGORIES.includes(result.category)) {
            results.push({
              category: result.category,
              confidence: Math.min(Math.max(result.confidence, 0), 1),
              merchant: result.merchant || transaction.merchant
            })
          } else {
            // Fallback
            results.push({
              category: 'Other',
              confidence: 0.3,
              merchant: transaction.merchant
            })
          }
        })
      } else {
        // Fallback for entire batch
        batch.forEach(t => {
          results.push({
            category: 'Other',
            confidence: 0.3,
            merchant: t.merchant
          })
        })
      }

      // Rate limiting between batches
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

    } catch (error) {
      console.error(`Batch categorization failed for batch ${i / batchSize + 1}:`, error)
      // Fallback for failed batch
      batch.forEach(t => {
        results.push({
          category: 'Other',
          confidence: 0.3,
          merchant: t.merchant
        })
      })
    }
  }

  return results
}
